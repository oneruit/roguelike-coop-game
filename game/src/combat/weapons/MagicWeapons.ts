import {
  AdditiveBlending,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
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

/**
 * Reaper's Scythe (Коса Жнеца)
 * Rotating scythes circle the hero, cutting through monsters to deal base damage and apply stacking bleed DoT.
 */
export class ReaperScytheWeapon extends Weapon {
  private orbCount: number = 2;
  private orbs: Projectile[] = [];
  private orbitRadius: number = 2.5;
  private orbitSpeed: number = 3.8;
  private bleedDps: number = 8;

  constructor() {
    super('reaper_scythe', 'Коса Жнеца', '🌙', 0, 4, 2);
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('reaper_scythe');
    const baseBleed = cfg?.bleedDps ?? 8;
    const baseRadius = cfg?.orbitRadius ?? 2.5;
    const baseSpeed = cfg?.orbitSpeed ?? 3.8;
    const baseCount = cfg?.count ?? 2;
    this.bleedDps = baseBleed + (this.level - 1) * 3 * this.gradeStatMultiplier;
    this.orbitRadius = Number((baseRadius + (this.level - 1) * 0.25).toFixed(2));
    this.orbitSpeed = Number((baseSpeed + (this.level - 1) * 0.12).toFixed(2));
    const extra = [3, 5, 7, 9, 11, 12].filter(lvl => this.level >= lvl).length;
    this.orbCount = baseCount + extra;
  }

  public getBleedDps(): number {
    return this.bleedDps;
  }

  public update(
    _dt: number,
    playerPos: Vector3,
    _enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void
  ) {
    this.orbs = this.orbs.filter(o => o.isAlive);

    if (this.orbs.length < this.orbCount) {
      const needed = this.orbCount - this.orbs.length;
      for (let i = 0; i < needed; i++) {
        const angle = (this.orbs.length / this.orbCount) * Math.PI * 2;
        const orb = new Projectile({
          position: playerPos.clone(),
          direction: new Vector3(1, 0, 0),
          speed: 0,
          damage: this.damage,
          bleedDps: this.bleedDps,
          pierce: 99999,
          lifetime: 999999,
          radius: Number((0.32 + (this.level - 1) * 0.015).toFixed(3)),
          color: 0xef4444,
          isOrbiting: true,
          orbitRadius: this.orbitRadius,
          orbitSpeed: this.orbitSpeed * (1 / Math.max(0.2, this.cooldownMultiplier))
        });
        orb.orbitAngle = angle;
        this.orbs.push(orb);
        spawnProjectile(orb);
      }
    }

    const effectiveOrbitSpeed = this.orbitSpeed * (1 / Math.max(0.2, this.cooldownMultiplier));
    this.orbs.forEach((orb) => {
      orb.orbitRadius = this.orbitRadius;
      orb.orbitSpeed = effectiveOrbitSpeed;
      orb.damage = this.damage;
      orb.bleedDps = this.bleedDps;
      orb.radius = Number((0.32 + (this.level - 1) * 0.015).toFixed(3));
      orb.mesh.scale.setScalar(orb.radius * 3.4);
    });
  }

  public upgrade(grade: WeaponGrade = 'common') {
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
    const bleedBonus = Math.round(3 * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const perks: string[] = [`+${dmg} к прямому урону`, `+${bleedBonus} к урону кровотечения/с`, '+0.25м радиус'];
    if ([3, 5, 7, 9, 11, 12].includes(nextLvl) || grade === 'rare' || grade === 'legendary') {
      perks.push(`+1 коса (всего ${this.orbCount + 1})`);
    }
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

/**
 * Fire Ring (Огненное Кольцо)
 * Fiery ring of blazing animated flames surrounding the hero, searing all monsters within its perimeter.
 */
export class FireRingWeapon extends Weapon {
  private static vfxOpacity: number = 1.0;
  private static instances = new Set<FireRingWeapon>();

  public static setVfxOpacity(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    FireRingWeapon.vfxOpacity = clamped;
    for (const inst of FireRingWeapon.instances) {
      if (inst.auraMat) {
        inst.auraMat.opacity = 0.95 * clamped;
        inst.auraMat.visible = clamped > 0.005;
      }
    }
  }

  private radius: number = 3.5;
  private auraMesh: Mesh | null = null;
  private auraMat: MeshBasicMaterial | null = null;
  private fireTex: Texture | null = null;
  private animFrameTimer: number = 0;

  constructor() {
    super('fire_ring', 'Огненное Кольцо', '🔥', 0.50, 16, 7);
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('fire_ring');
    const baseRad = cfg?.explosionRadius ?? 3.5;
    this.radius = Number((baseRad + (this.level - 1) * 0.35).toFixed(2));
    this.cooldown = Math.max(0.20, Number((this.baseCooldown * Math.pow(0.93, this.level - 1)).toFixed(3)));
    if (this.auraMesh) {
      this.auraMesh.geometry.dispose();
      this.auraMesh.geometry = new PlaneGeometry(this.radius * 2.3, this.radius * 2.3);
    }
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void
  ) {
    if (this.auraMesh && this.fireTex) {
      this.auraMesh.position.set(playerPos.x, 0.08, playerPos.z);
      this.auraMesh.rotation.z += dt * 0.45;
      this.animFrameTimer += dt * 18;
      const frame = Math.floor(this.animFrameTimer) % 16;
      const col = frame % 4;
      const row = Math.floor(frame / 4);
      this.fireTex.offset.set(col * 0.25, (3 - row) * 0.25);
    }

    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      this.timer = 0;

      const radSq = this.radius * this.radius;
      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.position.x - playerPos.x;
        const dz = enemy.position.z - playerPos.z;
        if (dx * dx + dz * dz <= radSq) {
          if (damageEnemy) {
            damageEnemy(enemy, this.damage, playerPos);
          } else {
            enemy.takeDamage(this.damage, playerPos);
          }
        }
      }
    }
  }

  public initVisual(scene: Scene, playerPos: Vector3) {
    this.fireTex = TextureManager.getFireRingTexture().clone();
    this.fireTex.needsUpdate = true;
    this.fireTex.repeat.set(0.25, 0.25);

    const geom = new PlaneGeometry(this.radius * 2.3, this.radius * 2.3);
    this.auraMat = new MeshBasicMaterial({
      map: this.fireTex,
      side: DoubleSide,
      transparent: true,
      opacity: 0.95 * FireRingWeapon.vfxOpacity,
      blending: AdditiveBlending,
      depthWrite: false,
      visible: FireRingWeapon.vfxOpacity > 0.005
    });
    this.auraMesh = new Mesh(geom, this.auraMat);
    this.auraMesh.rotation.x = -Math.PI / 2;
    this.auraMesh.position.set(playerPos.x, 0.08, playerPos.z);
    scene.add(this.auraMesh);
    FireRingWeapon.instances.add(this);
  }

  public destroy(scene: Scene) {
    FireRingWeapon.instances.delete(this);
    if (this.auraMesh) {
      scene.remove(this.auraMesh);
      this.auraMesh.geometry.dispose();
      if (this.auraMat) {
        this.auraMat.dispose();
        this.auraMat = null;
      }
      this.auraMesh = null;
    }
    if (this.fireTex) {
      this.fireTex.dispose();
      this.fireTex = null;
    }
  }

  public upgrade(grade: WeaponGrade = 'common') {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.applyGradeUpgrade(grade);
    this.recalculateStats();
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const cfg = WEAPON_GRADES[grade];
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const radBonus = grade === 'legendary' ? '+0.45м' : (grade === 'rare' ? '+0.30м' : '+0.20м');
    const perks: string[] = [`${radBonus} радиус кольца`, `+${dmg} урона огнем`];
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

/**
 * Astral Staff (Звёздный Посох) - Hero 4 Sorceress starting weapon
 * Casts high-speed astral energy bolts and starlight orbs that pierce through foes at long range.
 */
export class AstralStaffWeapon extends Weapon {
  private projectileSpeed: number = 16.0;
  private projectileCount: number = 1;
  private pierceCount: number = 2;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('astral_staff', 'Звёздный Посох', '🔮', 0.65, 22, 9);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('astral_staff');
    this.projectileSpeed = cfg?.speed ?? 16.0;
    const baseCount = cfg?.count ?? 1;
    const basePierce = cfg?.pierce ?? 2;
    this.projectileCount = baseCount + [3, 6, 9, 12].filter(lvl => this.level >= lvl).length;
    this.pierceCount = basePierce + [4, 8, 12].filter(lvl => this.level >= lvl).length;
    const cdSteps = [2, 5, 8, 10, 12].filter(lvl => this.level >= lvl).length;
    this.cooldown = Math.max(0.30, Number((this.baseCooldown * Math.pow(0.94, cdSteps)).toFixed(3)));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const targets = findClosestEnemies(enemies, playerPos, 1, 22 * 22);
      if (targets.length === 0) return;

      this.timer = 0;
      if (this.onTriggerAttack) {
        this.onTriggerAttack();
      }

      const baseTarget = targets[0];
      const spawnPos = playerPos.clone().add(new Vector3(0, 0.8, 0));
      const targetPos = baseTarget.position.clone().add(new Vector3(0, 0.4, 0));
      const baseDir = new Vector3().subVectors(targetPos, spawnPos);
      if (baseDir.lengthSq() === 0) baseDir.set(1, 0, 0);
      baseDir.normalize();

      const spreadStep = 0.14; // radians
      const startAngle = -((this.projectileCount - 1) / 2) * spreadStep;

      for (let i = 0; i < this.projectileCount; i++) {
        const angle = startAngle + i * spreadStep;
        const dir = baseDir.clone().applyAxisAngle(new Vector3(0, 1, 0), angle);

        const proj = new Projectile({
          position: spawnPos,
          direction: dir,
          speed: this.projectileSpeed,
          damage: this.damage,
          pierce: this.pierceCount,
          lifetime: 2.2,
          radius: 0.32,
          color: 0xc084fc, // Radiant Astral Purple
          isMagic: true
        });

        spawnProjectile(proj);
      }

      SoundManager.playMagic();
    }
  }

  public upgrade(grade: WeaponGrade = 'common') {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.applyGradeUpgrade(grade);
    this.recalculateStats();
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const cfg = WEAPON_GRADES[grade];
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${dmg} к урону`];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 снаряд веером (всего ${this.projectileCount + 1})`);
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierceCount + 1})`);
    if ([2, 5, 8, 10, 12].includes(nextLvl)) {
      const nextCd = Math.max(0.30, Number((this.cooldown * 0.94).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-6% перезарядки');
    }
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

/**
 * Lightning Strike (Удар Молнии)
 * Calls down devastating bolts of thunder from the sky onto enemies, triggering vertical electric strikes with splash damage.
 */
export class LightningStrikeWeapon extends Weapon {
  private strikeCount: number = 1;
  private strikeRadius: number = 2.4;
  private range: number = 22;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('lightning_strike', 'Удар Молнии', '⚡', 1.20, 45, 8);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('lightning_strike');
    const baseCount = cfg?.count ?? 1;
    const baseRadius = cfg?.splashRadius ?? 2.4;
    this.range = cfg?.range ?? 22;
    const countSteps = [3, 6, 9, 12].filter(lvl => this.level >= lvl).length;
    this.strikeCount = baseCount + countSteps;
    const cdSteps = [2, 5, 8, 11].filter(lvl => this.level >= lvl).length;
    this.cooldown = Math.max(0.40, Number((this.baseCooldown * Math.pow(0.92, cdSteps)).toFixed(3)));
    const radSteps = [4, 8, 12].filter(lvl => this.level >= lvl).length;
    this.strikeRadius = Number((baseRadius + radSteps * 0.30).toFixed(2));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const candidates = findClosestEnemies(enemies, playerPos, this.strikeCount, this.range * this.range);
      if (candidates.length === 0) return;

      this.timer = 0;
      if (this.onTriggerAttack) {
        this.onTriggerAttack();
      }

      const strikeTargets: { x: number; z: number }[] = [];
      for (let i = 0; i < this.strikeCount; i++) {
        const targetCandidate = candidates[i % candidates.length];
        strikeTargets.push({
          x: targetCandidate.position.x,
          z: targetCandidate.position.z
        });
      }

      strikeTargets.forEach((pos, idx) => {
        setTimeout(() => {
          const proj = new Projectile({
            position: new Vector3(pos.x, 0, pos.z),
            direction: new Vector3(0, 0, 1),
            speed: 0,
            damage: this.damage,
            pierce: 999,
            lifetime: 0.24,
            radius: this.strikeRadius,
            color: 0x38bdf8,
            isLightning: true
          });

          spawnProjectile(proj);
          SoundManager.playLightning();
        }, idx * 75);
      });
    }
  }

  public upgrade(grade: WeaponGrade = 'common') {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.applyGradeUpgrade(grade);
    this.recalculateStats();
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const cfg = WEAPON_GRADES[grade];
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${dmg} к урону`];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 разряд молнии (всего ${this.strikeCount + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) {
      const nextCd = Math.max(0.40, Number((this.cooldown * 0.92).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-8% перезарядки');
    }
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+0.30м радиус взрыва (всего ${(this.strikeRadius + 0.30).toFixed(2)}м)`);
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

/**
 * Ice Spike (Ледяной Шип)
 * Piercing glacial spikes erupt from beneath the earth under monsters, impaling them from below.
 */
export class IceSpikeWeapon extends Weapon {
  private spikeCount: number = 1;
  private spikeRadius: number = 2.0;
  private range: number = 18;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('ice_spike', 'Ледяной Шип', '🧊', 1.10, 38, 7);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('ice_spike');
    const baseCount = cfg?.count ?? 1;
    const baseRadius = cfg?.splashRadius ?? 2.0;
    this.range = cfg?.range ?? 18;
    const countSteps = [3, 6, 9, 12].filter(lvl => this.level >= lvl).length;
    this.spikeCount = baseCount + countSteps;
    const cdSteps = [2, 5, 8, 11].filter(lvl => this.level >= lvl).length;
    this.cooldown = Math.max(0.35, Number((this.baseCooldown * Math.pow(0.93, cdSteps)).toFixed(3)));
    const radSteps = [4, 8, 12].filter(lvl => this.level >= lvl).length;
    this.spikeRadius = Number((baseRadius + radSteps * 0.25).toFixed(2));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const candidates = findClosestEnemies(enemies, playerPos, this.spikeCount, this.range * this.range);
      if (candidates.length === 0) return;

      this.timer = 0;
      if (this.onTriggerAttack) {
        this.onTriggerAttack();
      }

      const strikeTargets: { x: number; z: number }[] = [];
      for (let i = 0; i < this.spikeCount; i++) {
        const targetCandidate = candidates[i % candidates.length];
        strikeTargets.push({
          x: targetCandidate.position.x,
          z: targetCandidate.position.z
        });
      }

      strikeTargets.forEach((pos, idx) => {
        setTimeout(() => {
          const proj = new Projectile({
            position: new Vector3(pos.x, -2.9, pos.z),
            direction: new Vector3(0, 1, 0),
            speed: 0,
            damage: this.damage,
            pierce: 999,
            lifetime: 0.38,
            radius: this.spikeRadius,
            color: 0x38bdf8,
            isIceSpike: true
          });

          spawnProjectile(proj);
          SoundManager.playIceSpike();
        }, idx * 60);
      });
    }
  }

  public upgrade(grade: WeaponGrade = 'common') {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.applyGradeUpgrade(grade);
    this.recalculateStats();
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const cfg = WEAPON_GRADES[grade];
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${dmg} к урону`];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 ледяной шип (всего ${this.spikeCount + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) {
      const nextCd = Math.max(0.35, Number((this.cooldown * 0.93).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-7% перезарядки');
    }
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+0.25м радиус поражения (всего ${(this.spikeRadius + 0.25).toFixed(2)}м)`);
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

/**
 * Fireball (Огненный Шар)
 * Calls down flaming meteors from the sky that plummet and detonate on monsters with a fiery explosion.
 */
export class FireballWeapon extends Weapon {
  private fireballCount: number = 1;
  private explosionRadius: number = 2.5;
  private range: number = 22;
  private fallSpeed: number = 28;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('fireball', 'Огненный Шар', '☄️', 1.35, 55, 10);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('fireball');
    const baseCount = cfg?.count ?? 1;
    const baseRadius = cfg?.explosionRadius ?? 2.5;
    this.range = cfg?.range ?? 22;
    this.fallSpeed = cfg?.fallSpeed ?? 28;
    const countSteps = [3, 6, 9, 12].filter(lvl => this.level >= lvl).length;
    this.fireballCount = baseCount + countSteps;
    const cdSteps = [2, 5, 8, 11].filter(lvl => this.level >= lvl).length;
    this.cooldown = Math.max(0.40, Number((this.baseCooldown * Math.pow(0.92, cdSteps)).toFixed(3)));
    const radSteps = [4, 8, 12].filter(lvl => this.level >= lvl).length;
    this.explosionRadius = Number((baseRadius + radSteps * 0.35).toFixed(2));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const candidates = findClosestEnemies(enemies, playerPos, this.fireballCount, this.range * this.range);
      if (candidates.length === 0) return;

      this.timer = 0;
      if (this.onTriggerAttack) {
        this.onTriggerAttack();
      }

      const strikeTargets: { x: number; z: number }[] = [];
      for (let i = 0; i < this.fireballCount; i++) {
        const targetCandidate = candidates[i % candidates.length];
        strikeTargets.push({
          x: targetCandidate.position.x,
          z: targetCandidate.position.z
        });
      }

      strikeTargets.forEach((pos, idx) => {
        setTimeout(() => {
          const startHeight = 15.0;
          const offsetDist = 2.8;
          const startPos = new Vector3(pos.x - offsetDist, startHeight, pos.z - offsetDist);
          const targetPos = new Vector3(pos.x, 0, pos.z);
          const dir = new Vector3().subVectors(targetPos, startPos).normalize();
          const dist = startPos.distanceTo(targetPos);
          const flightTime = dist / this.fallSpeed;

          const proj = new Projectile({
            position: startPos,
            direction: dir,
            speed: this.fallSpeed,
            damage: this.damage,
            pierce: 999,
            lifetime: flightTime + 0.35,
            radius: this.explosionRadius,
            color: 0xf97316,
            isFireball: true
          });

          spawnProjectile(proj);
          SoundManager.playFireballLaunch();
        }, idx * 85);
      });
    }
  }

  public upgrade(grade: WeaponGrade = 'common') {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.applyGradeUpgrade(grade);
    this.recalculateStats();
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const cfg = WEAPON_GRADES[grade];
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${dmg} к урону`];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 огненный шар (всего ${this.fireballCount + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) {
      const nextCd = Math.max(0.40, Number((this.cooldown * 0.92).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-8% перезарядки');
    }
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+0.35м радиус взрыва (всего ${(this.explosionRadius + 0.35).toFixed(2)}м)`);
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

export { ReaperScytheWeapon as OrbitingBarrierWeapon, FireRingWeapon as HolyAuraWeapon };

