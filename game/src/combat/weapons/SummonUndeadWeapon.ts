import {
  AdditiveBlending,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PlaneGeometry,
  type Scene,
  type Texture,
  Vector3
} from 'three';
import { Weapon, findClosestEnemies } from '../WeaponBase';
import { Projectile } from '../Projectile';
import { Enemy } from '../../entities/Enemy';
import { SoundManager } from '../../core/SoundManager';
import { TextureManager } from '../../core/TextureManager';
import { BalanceManager } from '../../balance/BalanceManager';
import { type WeaponGrade, WEAPON_GRADES } from '../WeaponGrades';

interface SkeletonMinion {
  id: string;
  group: Group;
  spriteMesh: Mesh;
  auraMesh: Mesh;
  texture: Texture;
  pos: Vector3;
  dir: Vector3;
  attackCooldown: number;
  attackAnimTimer: number;
  walkFrameTimer: number;
  isAttacking: boolean;
  orbitOffsetAngle: number;
}

/**
 * Summon Undead Weapon (Призыв мёртвых)
 * Exclusive / signature weapon of the Necromancer: summons and commands a horde of skeletal warriors
 * that pursue and slash enemies in melee combat, protecting their master.
 */
export class SummonUndeadWeapon extends Weapon {
  public hasInitVisual: boolean = false;
  private minions: SkeletonMinion[] = [];
  private minionCount: number = 2;
  private minionSpeed: number = 7.5;
  private minionDetectionRange: number = 16.0;
  private minionAttackRange: number = 1.6;
  private onTriggerAttack?: () => void;
  private sharedScene?: Scene;
  private globalAnimTime: number = 0;

  constructor(onTriggerAttack?: () => void) {
    super('summon_undead', 'Призыв мёртвых', '💀', 0.75, 22, 6);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('summon_undead');
    const baseCount = cfg?.count ?? 2;
    const extraMinions = [3, 6, 9, 12].filter(lvl => this.level >= lvl).length;
    this.minionCount = baseCount + extraMinions;
    this.minionSpeed = Number((7.5 + (this.level - 1) * 0.35).toFixed(2));
  }

  private createMinion(index: number, spawnPos: Vector3): SkeletonMinion {
    const id = Math.random().toString(36).substring(2, 9);
    const group = new Group();

    // Load skeleton spritesheet (512x512 with 4x4 frames of 128x128)
    const raw = TextureManager.loadMonsterTextures('monster_skeleton');
    const tex = raw.walk.clone();
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    tex.repeat.set(0.25, 0.25);
    tex.offset.set(0, 0.75); // Front row by default
    tex.needsUpdate = true;

    // Sprite mesh standing upright anchored at feet matching monster_skeleton standards
    const width = 1.5;
    const height = 1.9;
    const spriteGeom = new PlaneGeometry(width, height);
    // Anchor feet cleanly on ground: (88/96 - 0.5) = 5/12 = 0.416667
    spriteGeom.translate(0, height * 0.416667, 0);

    const spriteMat = new MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.08,
      side: DoubleSide
    });
    const spriteMesh = new Mesh(spriteGeom, spriteMat);
    // Standard 2.5D camera tilt (-Math.PI / 4.8) used across all players and enemies
    spriteMesh.rotation.x = -Math.PI / 4.8;
    spriteMesh.renderOrder = 0;
    spriteMesh.castShadow = true;
    group.add(spriteMesh);

    // Friendly glowing necromantic aura disc beneath feet (emerald-purple glow)
    const auraGeom = new CircleGeometry(0.85, 20);
    auraGeom.rotateX(-Math.PI / 2);
    const auraMat = new MeshBasicMaterial({
      color: 0xa855f7, // Necromantic purple
      transparent: true,
      opacity: 0.75,
      blending: AdditiveBlending,
      depthWrite: false
    });
    const auraMesh = new Mesh(auraGeom, auraMat);
    auraMesh.position.y = 0.04;
    group.add(auraMesh);

    const pos = spawnPos.clone().add(new Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2));
    group.position.copy(pos);

    return {
      id,
      group,
      spriteMesh,
      auraMesh,
      texture: tex,
      pos,
      dir: new Vector3(0, 0, 1),
      attackCooldown: Math.random() * 0.4,
      attackAnimTimer: 0,
      walkFrameTimer: Math.random(),
      isAttacking: false,
      orbitOffsetAngle: (index / Math.max(1, this.minionCount)) * Math.PI * 2
    };
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void
  ): void {
    this.globalAnimTime += dt;

    // Manage minion population up to minionCount
    while (this.minions.length < this.minionCount) {
      const minion = this.createMinion(this.minions.length, playerPos);
      this.minions.push(minion);
      if (this.sharedScene) {
        this.sharedScene.add(minion.group);
      }
    }
    while (this.minions.length > this.minionCount) {
      const removed = this.minions.pop();
      if (removed) {
        if (this.sharedScene) {
          this.sharedScene.remove(removed.group);
        }
        (removed.spriteMesh.material as MeshBasicMaterial).dispose();
        (removed.auraMesh.material as MeshBasicMaterial).dispose();
        removed.texture.dispose();
      }
    }

    // Ensure all minions are added to scene once sharedScene is available
    if (this.sharedScene) {
      for (const minion of this.minions) {
        if (!minion.group.parent) {
          this.sharedScene.add(minion.group);
        }
      }
    }

    // Update each minion behavior
    for (let i = 0; i < this.minions.length; i++) {
      const minion = this.minions[i];
      if (minion.attackCooldown > 0) {
        minion.attackCooldown -= dt;
      }
      if (minion.attackAnimTimer > 0) {
        minion.attackAnimTimer -= dt;
        if (minion.attackAnimTimer <= 0) {
          minion.isAttacking = false;
        }
      }

      // Check distance to player; if stranded too far (> 24m), teleport close
      const distToPlayerSq = minion.pos.distanceToSquared(playerPos);
      if (distToPlayerSq > 24 * 24) {
        minion.pos.copy(playerPos).add(new Vector3((Math.random() - 0.5) * 2.5, 0, (Math.random() - 0.5) * 2.5));
        minion.group.position.copy(minion.pos);
      }

      // Target selection: find nearest alive enemy within detection range
      const nearbyEnemies = findClosestEnemies(enemies, minion.pos, 1, this.minionDetectionRange * this.minionDetectionRange);
      const targetEnemy = nearbyEnemies.length > 0 ? nearbyEnemies[0] : null;

      let targetPos: Vector3;
      let isEngaging = false;

      if (targetEnemy && targetEnemy.isAlive) {
        targetPos = targetEnemy.position;
        isEngaging = true;
      } else {
        // Guard player formation
        const guardAngle = this.globalAnimTime * 1.5 + minion.orbitOffsetAngle;
        const guardDist = 2.2 + (i % 2) * 0.8;
        targetPos = new Vector3(
          playerPos.x + Math.cos(guardAngle) * guardDist,
          0,
          playerPos.z + Math.sin(guardAngle) * guardDist
        );
      }

      // Movement steering towards target
      const dx = targetPos.x - minion.pos.x;
      const dz = targetPos.z - minion.pos.z;
      const distToTarget = Math.hypot(dx, dz);

      if (distToTarget > (isEngaging ? this.minionAttackRange * 0.85 : 0.35)) {
        const moveSpeed = isEngaging ? this.minionSpeed : Math.min(this.minionSpeed, 8.5);
        const step = Math.min(distToTarget, moveSpeed * dt);
        minion.pos.x += (dx / distToTarget) * step;
        minion.pos.z += (dz / distToTarget) * step;
        minion.dir.set(dx / distToTarget, 0, dz / distToTarget);

        // Walk animation: bobbing and frame cycling
        minion.walkFrameTimer += dt * 8;
        const frameCol = Math.floor(minion.walkFrameTimer) % 4;
        const row = Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 1 : 2) : (dz < 0 ? 3 : 0);
        minion.texture.offset.set(frameCol * 0.25, (3 - row) * 0.25);

        // Facing flip
        if (Math.abs(dx) > 0.05) {
          minion.spriteMesh.scale.x = dx < 0 ? -1 : 1;
        }
      }

      // Attack execution
      if (isEngaging && targetEnemy && distToTarget <= this.minionAttackRange) {
        if (minion.attackCooldown <= 0) {
          minion.attackCooldown = this.effectiveCooldown;
          minion.attackAnimTimer = 0.32;
          minion.isAttacking = true;

          // Attack slash frame
          minion.texture.offset.set(2 * 0.25, 0.75);

          if (damageEnemy) {
            damageEnemy(targetEnemy, this.damage, minion.pos);
          }
          SoundManager.playSlash?.();
          this.onTriggerAttack?.();
        }
      }

      // Visual position sync and subtle aura pulse
      minion.group.position.copy(minion.pos);
      const pulse = 0.55 + 0.2 * Math.sin(this.globalAnimTime * 4 + i);
      (minion.auraMesh.material as MeshBasicMaterial).opacity = pulse;
    }
  }

  public initVisual(scene: Scene, initialPos?: Vector3) {
    this.sharedScene = scene;
    this.hasInitVisual = true;
    for (const m of this.minions) {
      if (initialPos && m.pos.lengthSq() === 0) {
        m.pos.copy(initialPos);
        m.group.position.copy(m.pos);
      }
      if (!m.group.parent && scene) {
        scene.add(m.group);
      }
    }
  }

  public override upgrade(grade: WeaponGrade = 'common'): void {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.applyGradeUpgrade(grade);
    this.recalculateStats();
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const nextLvl = this.level + 1;
    const cfg = WEAPON_GRADES[grade];
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const perks: string[] = [`+${dmg} к урону скелетов`, '+0.35м/с скорость'];
    if ([3, 6, 9, 12].includes(nextLvl) || grade === 'rare' || grade === 'legendary') {
      perks.push(`+1 скелет-воин (всего ${this.minionCount + 1})`);
    }
    if (cfg.cooldownReductionBonus > 0) {
      perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд атак`);
    }
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }

  public destroy(scene?: Scene): void {
    const sc = scene || this.sharedScene;
    for (const minion of this.minions) {
      if (sc) {
        sc.remove(minion.group);
      }
      (minion.spriteMesh.material as MeshBasicMaterial).dispose();
      (minion.auraMesh.material as MeshBasicMaterial).dispose();
      minion.texture.dispose();
    }
    this.minions = [];
  }
}
