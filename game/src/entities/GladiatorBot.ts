import { Scene, Vector3 } from 'three';
import { RemotePlayer } from './RemotePlayer';
import { Player } from './Player';
import { Weapon } from '../combat/WeaponBase';
import { Projectile } from '../combat/Projectile';
import { createWeaponInstanceById } from '../combat/WeaponFactory';
import { LuckyTestBuildState } from '../mechanics/lucky-test/LuckyTestTypes';
import { SoundManager } from '../core/SoundManager';

export class GladiatorBot extends RemotePlayer {
  public botWeapons: Weapon[] = [];
  public aimPosition: Vector3 = new Vector3();
  public strafeAngle: number = 0;
  public strafeDistance: number = 9.5;
  public strafeDir: number = 1;
  public dashCooldown: number = 4.0;
  public dashTimer: number = 0;
  public speed: number = 7.5;

  constructor(scene: Scene, build: LuckyTestBuildState) {
    super(scene, 'bot_gladiator', `Гладиатор (${build.heroName})`, build.hero, 0xef4444);

    this.isGladiator = true;
    this.pvpResilience = 0.40;
    this.maxHp = 1500;
    this.hp = 1500;
    this.speed = 7.5;

    // Instantiate all 4 weapons
    const allWeaponIds = [build.startingWeaponId, ...build.draftedWeaponIds];
    for (const wId of allWeaponIds) {
      const wInstance = createWeaponInstanceById(wId);
      if (wInstance) {
        this.botWeapons.push(wInstance);
      }
    }

    // Apply upgrades
    for (const up of build.appliedUpgrades) {
      const w = this.botWeapons.find(w => w.id === up.weaponId);
      if (w && w.level < 4) {
        w.level = up.newLevel;
        w.applyGradeUpgrade(up.grade);
        w.recalculateStats();
      }
    }

    // Apply passives
    for (const passive of build.chosenPassives) {
      if (passive.type === 'max_hp') {
        this.maxHp += passive.value;
        this.hp = this.maxHp;
      } else if (passive.type === 'speed') {
        this.speed *= 1 + passive.value / 100;
      }
    }

    this.redrawOverhead();
  }

  public updateAI(
    dt: number,
    player: Player,
    spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: any, amount: number, sourcePos?: Vector3) => void
  ): void {
    if (this.hp <= 0 || this.isDowned) return;

    this.dashTimer -= dt;

    // 1. Aim directly towards player
    this.aimPosition.copy(player.position);

    // 2. Tactical Movement: Strafe around player
    const toPlayer = new Vector3().subVectors(player.position, this.position);
    const distToPlayer = toPlayer.length();

    this.strafeAngle += dt * 0.9 * this.strafeDir;
    if (Math.random() < dt * 0.25) {
      this.strafeDir = -this.strafeDir; // Randomly switch direction
    }

    // Ideal combat distance ~8-12m
    const targetOffset = new Vector3(
      Math.cos(this.strafeAngle) * this.strafeDistance,
      0,
      Math.sin(this.strafeAngle) * this.strafeDistance
    );
    const targetPos = player.position.clone().add(targetOffset);

    // Clamp within arena radius 22m
    if (targetPos.length() > 21) {
      targetPos.setLength(20);
    }

    const moveDir = new Vector3().subVectors(targetPos, this.position);
    if (moveDir.lengthSq() > 0.1) {
      moveDir.normalize();
      this.position.x += moveDir.x * this.speed * dt;
      this.position.z += moveDir.z * this.speed * dt;
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    }

    // Facing direction
    if (Math.abs(toPlayer.x) > Math.abs(toPlayer.z)) {
      this.currentDir = toPlayer.x < 0 ? 'left' : 'right';
    } else {
      this.currentDir = toPlayer.z < 0 ? 'back' : 'front';
    }

    // Tactical Dash to evade if player is very close or upon low HP
    if (distToPlayer < 4.5 && this.dashTimer <= 0) {
      this.dashTimer = this.dashCooldown;
      const escapeDir = new Vector3().subVectors(this.position, player.position).normalize();
      this.position.addScaledVector(escapeDir, 4.5);
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);
      SoundManager.playDash?.();
    }

    // 3. Update weapons and fire at player
    for (const weapon of this.botWeapons) {
      weapon.update(
        dt,
        this.position,
        [], // no pve enemies
        p => {
          p.ownerId = this.id;
          spawnProjectile(p);
        },
        damageEnemy,
        this.aimPosition
      );
    }

    // Overhead update
    this.update(dt);
  }

  public triggerAttackAnim(): void {
    this.animFrameTimer = 0;
  }
}
