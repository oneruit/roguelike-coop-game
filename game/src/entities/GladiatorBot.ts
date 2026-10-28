import { Scene, Vector3 } from 'three';
import { RemotePlayer } from './RemotePlayer';
import { Player } from './Player';
import { Weapon } from '../combat/WeaponBase';
import { Projectile } from '../combat/Projectile';
import { createWeaponInstanceById } from '../combat/WeaponFactory';
import { LuckyTestBuildState } from '../mechanics/lucky-test/LuckyTestTypes';
import { SoundManager } from '../core/SoundManager';
import { MeleeAttackInfo } from '../shared/types';

export type BotMeleeAttackHandler = (attack: MeleeAttackInfo, damageMultiplier: number, isCrit: boolean) => void;

export class GladiatorBot extends RemotePlayer {
  public botWeapons: Weapon[] = [];
  public aimPosition: Vector3 = new Vector3();
  public strafeAngle: number = 0;
  public strafeDistance: number = 9.5;
  public strafeDir: number = 1;
  public dashCooldown: number = 4.0;
  public dashTimer: number = 0;
  public speed: number = 7.5;

  public damageMultiplier: number = 1.0;
  public critChance: number = 0.05;
  public critDamage: number = 0.50;
  public cooldownMultiplier: number = 1.0;
  public hpRegen: number = 0;
  public passiveDamageReduction: number = 0;

  public onMeleeAttack?: BotMeleeAttackHandler;

  constructor(scene: Scene, build: LuckyTestBuildState) {
    super(scene, 'bot_gladiator', `Гладиатор (${build.heroName})`, build.hero, 0xef4444);

    this.isGladiator = true;
    this.pvpResilience = 0.40;
    this.maxHp = 1500;
    this.hp = 1500;
    this.speed = 7.5;

    // 1. Instantiate all 4 weapons
    const allWeaponIds = [build.startingWeaponId, ...build.draftedWeaponIds];
    for (const wId of allWeaponIds) {
      const wInstance = createWeaponInstanceById(wId);
      if (wInstance) {
        wInstance.onMeleeAttack = (attack: MeleeAttackInfo) => {
          this.triggerAttackAnim();
          const isCrit = Math.random() < this.critChance;
          this.onMeleeAttack?.(attack, this.damageMultiplier, isCrit);
        };
        this.botWeapons.push(wInstance);
      }
    }

    // 2. Apply upgrades (cap at lv. 4)
    for (const up of build.appliedUpgrades) {
      const w = this.botWeapons.find(w => w.id === up.weaponId);
      if (w && w.level < 4) {
        w.level = up.newLevel;
        w.applyGradeUpgrade(up.grade);
        w.recalculateStats();
      }
    }

    // 3. Apply passives
    for (const passive of build.chosenPassives) {
      switch (passive.type) {
        case 'damage':
          this.damageMultiplier += passive.value / 100;
          break;
        case 'max_hp':
          this.maxHp += passive.value;
          this.hp = this.maxHp;
          break;
        case 'speed':
          this.speed *= 1 + passive.value / 100;
          break;
        case 'crit_chance':
          this.critChance = Math.min(1.0, this.critChance + passive.value / 100);
          break;
        case 'crit_damage':
          this.critDamage += passive.value / 100;
          break;
        case 'cooldown_reduction':
          this.cooldownMultiplier = Math.max(0.4, this.cooldownMultiplier * (1 - passive.value / 100));
          break;
        case 'hp_regen':
          this.hpRegen += passive.value;
          break;
        case 'damage_reduction':
          this.passiveDamageReduction = Math.min(0.60, passive.value / 100);
          break;
      }
    }

    // Apply cooldown reduction to all bot weapons
    for (const w of this.botWeapons) {
      w.cooldownMultiplier = this.cooldownMultiplier;
    }

    this.redrawOverhead();
  }

  public override takeDamage(amount: number): boolean {
    const afterPassive = Math.round(amount * (1 - this.passiveDamageReduction));
    return super.takeDamage(afterPassive);
  }

  public updateAI(
    dt: number,
    player: Player,
    spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: any, amount: number, sourcePos?: Vector3) => void
  ): void {
    if (this.hp <= 0 || this.isDowned) return;

    this.dashTimer -= dt;

    // Passive HP Regeneration
    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
      this.redrawOverhead();
    }

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

    // Clamp within arena radius 21m
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
          p.damage = Math.round(p.damage * this.damageMultiplier);
          p.critChance = this.critChance;
          p.critDamage = this.critDamage;
          spawnProjectile(p);
          this.triggerAttackAnim();
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
