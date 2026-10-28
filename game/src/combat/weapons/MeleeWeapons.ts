import { Vector3 } from 'three';
import { Weapon, findClosestEnemies } from '../WeaponBase';
import { Projectile } from '../Projectile';
import { Enemy } from '../../entities/Enemy';
import { SoundManager } from '../../core/SoundManager';
import { BalanceManager } from '../../balance/BalanceManager';
import { type WeaponGrade, WEAPON_GRADES } from '../WeaponGrades';

/**
 * Kukri Knife (Нож Кукри)
 * Rapid throws of spinning curved Gurkha kukri blades
 */
export class KukriWeapon extends Weapon {
  private burstCount: number = 2;
  private projectileSpeed: number = 24;
  private pierce: number = 1;

  constructor() {
    super('kukri', 'Нож Кукри', '🔪', 0.65, 12, 5);
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('kukri');
    const baseCount = cfg?.count ?? 2;
    const basePierce = cfg?.pierce ?? 1;
    this.projectileSpeed = cfg?.speed ?? 24;
    this.burstCount = baseCount + [2, 4, 6, 8, 10, 12].filter(lvl => this.level >= lvl).length;
    this.pierce = basePierce + [6, 12].filter(lvl => this.level >= lvl).length;
    const cdSteps = [3, 5, 7, 9, 11].filter(lvl => this.level >= lvl).length;
    const levelCd = this.baseCooldown * Math.pow(0.94, cdSteps);
    this.cooldown = Math.max(0.08, Number((levelCd * (1 - this.cooldownBonus)).toFixed(3)));
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void,
    _damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void,
    aimPosition?: Vector3
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (!aimPosition && enemies.length === 0) return;

      const sorted = findClosestEnemies(enemies, playerPos, this.burstCount);
      if (!aimPosition && sorted.length === 0) return;

      this.timer = Math.min(this.effectiveCooldown * 0.5, this.timer - this.effectiveCooldown);

      const burstDelay = Math.max(30, Math.round(110 * this.cooldownMultiplier));
      for (let i = 0; i < this.burstCount; i++) {
        setTimeout(() => {
          if (aimPosition) {
            const spawnPos = playerPos.clone().add(new Vector3(0, 0.7, 0));
            const dir = new Vector3(aimPosition.x - playerPos.x, 0, aimPosition.z - playerPos.z);
            if (dir.lengthSq() > 0.001) dir.normalize(); else dir.set(0, 0, -1);
            const spreadAngle = (i % 2 === 0 ? 0.08 : -0.08);
            dir.applyAxisAngle(new Vector3(0, 1, 0), spreadAngle);
            const proj = new Projectile({
              position: spawnPos, direction: dir, speed: this.projectileSpeed,
              damage: this.damage, pierce: this.pierce, lifetime: 1.8, radius: 0.28, color: 0x94a3b8, isKukri: true
            });
            spawnProjectile(proj);
            SoundManager.playSlash();
            return;
          }
          let target = sorted[i % sorted.length];
          if (!target || !target.isAlive) {
            const fallback = findClosestEnemies(enemies, playerPos, 1);
            if (fallback.length > 0) target = fallback[0];
          }

          const spawnPos = playerPos.clone().add(new Vector3(0, 0.7, 0));
          const targetPos = target && target.isAlive
            ? target.position.clone().add(new Vector3(0, 0.4, 0))
            : spawnPos.clone().add(new Vector3(0, 0, -10));
          const dir = new Vector3().subVectors(targetPos, spawnPos);
          if (dir.lengthSq() > 0) {
            dir.normalize();
            // slight spread angle for dual throwing
            const spreadAngle = (i % 2 === 0 ? 0.08 : -0.08);
            dir.applyAxisAngle(new Vector3(0, 1, 0), spreadAngle);
          }

          const proj = new Projectile({
            position: spawnPos,
            direction: dir,
            speed: this.projectileSpeed,
            damage: this.damage,
            pierce: this.pierce,
            lifetime: 1.8,
            radius: 0.28,
            color: 0x94a3b8,
            isKukri: true
          });

          spawnProjectile(proj);
          SoundManager.playSlash();
        }, i * burstDelay);
      }
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
    const nextLvl = this.level + 1;
    const cfg = WEAPON_GRADES[grade];
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const perks: string[] = [`+${dmg} к урону`];
    if ([2, 4, 6, 8, 10, 12].includes(nextLvl) || grade === 'rare' || grade === 'legendary') {
      perks.push(`+1 нож в серии (всего ${this.burstCount + 1})`);
    }
    if ([6, 12].includes(nextLvl) || grade === 'legendary') {
      perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    }
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

// Backwards compatibility alias
export const DualRevolversWeapon = KukriWeapon;
export type DualRevolversWeapon = KukriWeapon;

/**
 * Katana Slash (Рассекающий Клинок)
 * Swift katana slash in an arc hitting all enemies in melee range
 */
export class KatanaSlashWeapon extends Weapon {
  private slashRadius: number = 3.8;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('katana_slash', 'Рассекающий Клинок', '🗡️', 0.60, 25, 10);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('katana_slash');
    const baseRad = cfg?.explosionRadius ?? 3.8;
    this.slashRadius = Number((baseRad + (this.level - 1) * 0.22).toFixed(2));
    const levelCd = this.baseCooldown * Math.pow(0.93, this.level - 1);
    this.cooldown = Math.max(0.08, Number((levelCd * (1 - this.cooldownBonus)).toFixed(3)));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void,
    aimPosition?: Vector3
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (!aimPosition && enemies.length === 0) return;

      const attackAngle = this.getMeleeAttackAngle(playerPos, enemies, aimPosition);
      let hitCount = 0;

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.position.x - playerPos.x;
        const dz = enemy.position.z - playerPos.z;
        const effectiveRadius = this.slashRadius + (enemy.width + enemy.height) * 0.20;
        if (dx * dx + dz * dz <= effectiveRadius * effectiveRadius) {
          if (damageEnemy) {
            damageEnemy(enemy, this.damage, playerPos);
          } else {
            enemy.takeDamage(this.damage, playerPos);
          }
          hitCount++;
        }
      }

      // If enemies are nearby or hit, trigger the swing animation and sound
      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(playerPos) < 45);
      if (hitCount > 0 || nearby || aimPosition) {
        this.timer = Math.min(this.effectiveCooldown * 0.5, this.timer - this.effectiveCooldown);
        this.emitMeleeAttack('katana_slash', playerPos, this.slashRadius, attackAngle);
        if (this.onTriggerAttack) {
          this.onTriggerAttack();
        }
        SoundManager.playSlash();
      }
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
    const radBonus = grade === 'legendary' ? '+0.35м' : (grade === 'rare' ? '+0.22м' : '+0.14м');
    const perks: string[] = [`${radBonus} радиус взмаха`, `+${dmg} урона`];
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

/**
 * Crimson Whirlwind (Багровый Вихрь) - Hero 4 Ronin starting weapon
 * Rapid fury twin-slash storm unleashing crimson blade whirlwinds at extreme attack speed.
 */
export class WhirlwindSlashWeapon extends Weapon {
  private slashRadius: number = 3.6;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('whirlwind_slash', 'Багровый Вихрь', '🌪️', 0.42, 16, 7);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('whirlwind_slash');
    const baseRad = cfg?.explosionRadius ?? 3.6;
    this.slashRadius = Number((baseRad + (this.level - 1) * 0.20).toFixed(2));
    const levelCd = this.baseCooldown * Math.pow(0.93, this.level - 1);
    this.cooldown = Math.max(0.08, Number((levelCd * (1 - this.cooldownBonus)).toFixed(3)));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void,
    aimPosition?: Vector3
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (!aimPosition && enemies.length === 0) return;

      const attackAngle = this.getMeleeAttackAngle(playerPos, enemies, aimPosition);
      let hitCount = 0;

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.position.x - playerPos.x;
        const dz = enemy.position.z - playerPos.z;
        const effectiveRadius = this.slashRadius + (enemy.width + enemy.height) * 0.20;
        if (dx * dx + dz * dz <= effectiveRadius * effectiveRadius) {
          if (damageEnemy) {
            damageEnemy(enemy, this.damage, playerPos);
          } else {
            enemy.takeDamage(this.damage, playerPos);
          }
          hitCount++;
        }
      }

      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(playerPos) < 40);
      if (hitCount > 0 || nearby || aimPosition) {
        this.timer = Math.min(this.effectiveCooldown * 0.5, this.timer - this.effectiveCooldown);
        this.emitMeleeAttack('whirlwind_slash', playerPos, this.slashRadius, attackAngle);
        if (this.onTriggerAttack) {
          this.onTriggerAttack();
        }
        SoundManager.playSlash();
      }
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
    const radBonus = grade === 'legendary' ? '+0.30м' : (grade === 'rare' ? '+0.20м' : '+0.12м');
    const perks: string[] = [`${radBonus} радиус вихря`, `+${dmg} урона`];
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

/**
 * Greatsword (Двуручный Меч) - Hero 2 Valkyrie starting weapon
 * Massive sweeping two-handed cleave delivering high devastation over a wide radius.
 */
export class GreatswordWeapon extends Weapon {
  private slashRadius: number = 4.2;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('greatsword', 'Двуручный Меч', '⚔️', 0.70, 32, 12);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('greatsword');
    const baseRad = cfg?.explosionRadius ?? 4.2;
    this.slashRadius = Number((baseRad + (this.level - 1) * 0.25).toFixed(2));
    const levelCd = this.baseCooldown * Math.pow(0.93, this.level - 1);
    this.cooldown = Math.max(0.08, Number((levelCd * (1 - this.cooldownBonus)).toFixed(3)));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void,
    aimPosition?: Vector3
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (!aimPosition && enemies.length === 0) return;

      const attackAngle = this.getMeleeAttackAngle(playerPos, enemies, aimPosition);
      let hitCount = 0;

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.position.x - playerPos.x;
        const dz = enemy.position.z - playerPos.z;
        const effectiveRadius = this.slashRadius + (enemy.width + enemy.height) * 0.20;
        if (dx * dx + dz * dz <= effectiveRadius * effectiveRadius) {
          if (damageEnemy) {
            damageEnemy(enemy, this.damage, playerPos);
          } else {
            enemy.takeDamage(this.damage, playerPos);
          }
          hitCount++;
        }
      }

      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(playerPos) < 48);
      if (hitCount > 0 || nearby || aimPosition) {
        this.timer = Math.min(this.effectiveCooldown * 0.5, this.timer - this.effectiveCooldown);
        this.emitMeleeAttack('greatsword', playerPos, this.slashRadius, attackAngle);
        if (this.onTriggerAttack) {
          this.onTriggerAttack();
        }
        SoundManager.playSlash();
      }
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
    const radBonus = grade === 'legendary' ? '+0.35м' : (grade === 'rare' ? '+0.25м' : '+0.15м');
    const perks: string[] = [`${radBonus} радиус взмаха`, `+${dmg} урона`];
    const nextCd = Math.max(0.30, Number((this.cooldown * 0.93).toFixed(3)));
    if (nextCd < this.cooldown) perks.push('-7% перезарядки');
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

/**
 * Steel Flail (Боевой Цеп) - Hero 3 Brigitta starting weapon
 * Whirls a heavy barbed flail in sweeping arcs, crushing foes with staggering impact and medium-wide sweep.
 */
export class FlailWeapon extends Weapon {
  private flailRadius: number = 3.9;
  private knockback: number = 0.35;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('flail', 'Боевой Цеп', '⛓️', 0.52, 20, 8);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('flail');
    const baseRad = cfg?.explosionRadius ?? 3.9;
    const baseKb = cfg?.knockback ?? 0.35;
    this.flailRadius = Number((baseRad + (this.level - 1) * 0.22).toFixed(2));
    this.knockback = Number((baseKb + (this.level - 1) * 0.04).toFixed(2));
    const levelCd = this.baseCooldown * Math.pow(0.93, this.level - 1);
    this.cooldown = Math.max(0.08, Number((levelCd * (1 - this.cooldownBonus)).toFixed(3)));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void,
    aimPosition?: Vector3
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (!aimPosition && enemies.length === 0) return;

      const attackAngle = this.getMeleeAttackAngle(playerPos, enemies, aimPosition);
      let hitCount = 0;

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.position.x - playerPos.x;
        const dz = enemy.position.z - playerPos.z;
        const effectiveRadius = this.flailRadius + (enemy.width + enemy.height) * 0.20;
        if (dx * dx + dz * dz <= effectiveRadius * effectiveRadius) {
          if (damageEnemy) {
            damageEnemy(enemy, this.damage, playerPos);
          } else {
            enemy.takeDamage(this.damage, playerPos);
          }
          // Flail momentum knockback
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > 0.01) {
            enemy.position.x += (dx / dist) * this.knockback;
            enemy.position.z += (dz / dist) * this.knockback;
          }
          hitCount++;
        }
      }

      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(playerPos) < 42);
      if (hitCount > 0 || nearby || aimPosition) {
        this.timer = Math.min(this.effectiveCooldown * 0.5, this.timer - this.effectiveCooldown);
        this.emitMeleeAttack('flail', playerPos, this.flailRadius, attackAngle);
        if (this.onTriggerAttack) {
          this.onTriggerAttack();
        }
        SoundManager.playSlash();
      }
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
    const perks: string[] = ['+0.22м радиус цепа', `+${dmg} урона`, 'сильнее отброс'];
    const nextCd = Math.max(0.25, Number((this.cooldown * 0.93).toFixed(3)));
    if (nextCd < this.cooldown) perks.push('-7% перезарядки');
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}
