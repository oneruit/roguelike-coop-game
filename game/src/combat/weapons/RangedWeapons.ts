import { Vector3 } from 'three';
import { Weapon, findClosestEnemies } from '../WeaponBase';
import { Projectile } from '../Projectile';
import { Enemy } from '../../entities/Enemy';
import { SoundManager } from '../../core/SoundManager';
import { BalanceManager } from '../../balance/BalanceManager';
import { type WeaponGrade, WEAPON_GRADES } from '../WeaponGrades';

/**
 * Hunting Bow (Охотничий Лук)
 * Long-range sharp piercing arrows cutting through lines of enemies
 */
export class BowWeapon extends Weapon {
  private projectileCount: number = 1;
  private projectileSpeed: number = 24;
  private pierce: number = 2;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('bow', 'Охотничий Лук', '🏹', 0.85, 26, 6);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('bow');
    const baseCount = cfg?.count ?? 1;
    const basePierce = cfg?.pierce ?? 2;
    this.projectileSpeed = cfg?.speed ?? 24;
    this.projectileCount = baseCount + [3, 6, 9, 12].filter(lvl => this.level >= lvl).length;
    this.pierce = basePierce + [4, 8, 12].filter(lvl => this.level >= lvl).length;
    const cdSteps = [2, 4, 6, 8, 10, 12].filter(lvl => this.level >= lvl).length;
    this.cooldown = Math.max(0.40, Number((this.baseCooldown * Math.pow(0.93, cdSteps)).toFixed(3)));
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
      this.timer = 0;

      const candidates = findClosestEnemies(enemies, playerPos, this.projectileCount);
      if (candidates.length === 0) return;

      if (this.onTriggerAttack) {
        this.onTriggerAttack();
      }

      for (let index = 0; index < this.projectileCount; index++) {
        const target = candidates[index % candidates.length];
        setTimeout(() => {
          if (!target || !target.isAlive) return;
          const spawnPos = playerPos.clone().add(new Vector3(0, 0.7, 0));
          const targetPos = target.position.clone().add(new Vector3(0, 0.4, 0));
          const dir = new Vector3().subVectors(targetPos, spawnPos);
          if (dir.lengthSq() > 0) dir.normalize();

          // slight spread if multiple arrows are fired at fewer targets (e.g. against a lone boss)
          if (this.projectileCount > 1 && candidates.length < this.projectileCount) {
            const spreadAngle = (index - (this.projectileCount - 1) / 2) * 0.08;
            dir.applyAxisAngle(new Vector3(0, 1, 0), spreadAngle);
          }

          const proj = new Projectile({
            position: spawnPos,
            direction: dir,
            speed: this.projectileSpeed,
            damage: this.damage,
            pierce: this.pierce,
            lifetime: 2.2,
            radius: 0.32,
            color: 0xf59e0b,
            isArrow: true
          });

          spawnProjectile(proj);
          SoundManager.playBowShoot();
        }, index * 70);
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
    if ([3, 6, 9, 12].includes(nextLvl) || grade === 'legendary') {
      perks.push(`+1 стрела (всего ${this.projectileCount + 1})`);
    }
    if ([4, 8, 12].includes(nextLvl) || grade === 'rare' || grade === 'legendary') {
      perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    }
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

// Backwards compatibility alias
export const HeavyColtWeapon = BowWeapon;
export type HeavyColtWeapon = BowWeapon;

/**
 * Chakram (Танцующий Чакрам)
 * Boomerang spinning blades returning to player
 */
export class ChakramWeapon extends Weapon {
  private flightSpeed: number = 14.5;
  private chakramCount: number = 1;
  private chakramRadius: number = 0.38;
  private alternateSign: number = 1;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('chakram', 'Танцующий Чакрам', '🪃', 0.70, 20, 4);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('chakram');
    const baseCount = cfg?.count ?? 1;
    const baseSpd = cfg?.speed ?? 14.5;
    this.chakramCount = baseCount + [3, 6, 9, 12].filter(lvl => this.level >= lvl).length;
    const spdSteps = [3, 6, 9, 12].filter(lvl => this.level >= lvl).length;
    this.flightSpeed = Number((baseSpd + spdSteps * 1.2).toFixed(2));
    const cdSteps = [2, 5, 8, 11].filter(lvl => this.level >= lvl).length;
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

      const targets = findClosestEnemies(enemies, playerPos, 1, 20 * 20);
      if (targets.length === 0) return;

      this.timer = 0;
      if (this.onTriggerAttack) {
        this.onTriggerAttack();
      }

      const target = targets[0];
      const spawnPos = playerPos.clone().add(new Vector3(0, 0.6, 0));
      const targetPos = target.position.clone().add(new Vector3(0, 0.4, 0));
      const baseDir = new Vector3().subVectors(targetPos, spawnPos);
      if (baseDir.lengthSq() === 0) baseDir.set(1, 0, 0);
      baseDir.normalize();

      this.alternateSign = -this.alternateSign;

      for (let i = 0; i < this.chakramCount; i++) {
        // Mirrored curve signs for twin/multi chakrams
        let sign = this.alternateSign;
        if (this.chakramCount > 1) {
          sign = i % 2 === 0 ? 1 : -1;
        }

        // Slight initial angular offset for multi-chakrams
        const angleOffset = (i - (this.chakramCount - 1) / 2) * 0.16;
        const throwDir = baseDir.clone().applyAxisAngle(new Vector3(0, 1, 0), angleOffset);

        const proj = new Projectile({
          position: spawnPos,
          direction: throwDir,
          speed: this.flightSpeed,
          damage: this.damage,
          pierce: 999, // Pierces all enemies along its path
          lifetime: 1.35,
          radius: this.chakramRadius,
          color: 0xf59e0b,
          isChakram: true,
          curveSign: sign
        });

        spawnProjectile(proj);
      }

      SoundManager.playChakram();
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
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 возвращающийся чакрам (всего ${this.chakramCount + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) {
      const nextCd = Math.max(0.30, Number((this.cooldown * 0.94).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-6% перезарядки');
    }
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push('+1.2 м/с скорость полёта');
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}

/**
 * Assault Rifle (Штурмовая Винтовка)
 * Rapid automatic bursts of bullets
 */
export class AssaultRifleWeapon extends Weapon {
  private projectileSpeed: number = 32;
  private projectileCount: number = 1;
  private pierce: number = 1;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('assault_rifle', 'Штурмовая Винтовка', '🔫', 0.18, 15, 6);
    this.iconImage = '/textures/weapons/weapon_assault_rifle.png';
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('assault_rifle');
    const baseCount = cfg?.count ?? 1;
    const basePierce = cfg?.pierce ?? 1;
    this.projectileSpeed = cfg?.speed ?? 32;
    this.projectileCount = baseCount + [3, 6, 9, 12].filter(lvl => this.level >= lvl).length;
    this.pierce = basePierce + [4, 8, 12].filter(lvl => this.level >= lvl).length;
    const cdSteps = [2, 5, 8, 11].filter(lvl => this.level >= lvl).length;
    this.cooldown = Math.max(0.09, Number((this.baseCooldown * Math.pow(0.95, cdSteps)).toFixed(3)));
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
      this.timer = 0;

      const candidates = findClosestEnemies(enemies, playerPos, this.projectileCount, 18.2 * 18.2);
      if (candidates.length === 0) return;

      if (this.onTriggerAttack) {
        this.onTriggerAttack();
      }

      for (let index = 0; index < this.projectileCount; index++) {
        const target = candidates[index % candidates.length];
        if (!target || !target.isAlive) continue;

        const spawnPos = playerPos.clone().add(new Vector3(0, 0.65, 0));
        const targetPos = target.position.clone().add(new Vector3(0, 0.4, 0));
        const dir = new Vector3().subVectors(targetPos, spawnPos);
        if (dir.lengthSq() > 0) dir.normalize();

        if (this.projectileCount > 1) {
          const spreadAngle = (index - (this.projectileCount - 1) / 2) * 0.10 + (Math.random() - 0.5) * 0.04;
          dir.applyAxisAngle(new Vector3(0, 1, 0), spreadAngle);
        } else {
          const spreadAngle = (Math.random() - 0.5) * 0.04;
          dir.applyAxisAngle(new Vector3(0, 1, 0), spreadAngle);
        }

        const proj = new Projectile({
          position: spawnPos,
          direction: dir,
          speed: this.projectileSpeed,
          damage: this.damage,
          pierce: this.pierce,
          lifetime: 1.12,
          radius: 0.28,
          color: 0xffaa22
        });

        spawnProjectile(proj);
      }
      SoundManager.playMachineGunShoot();
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
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 пуля (всего ${this.projectileCount + 1})`);
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) perks.push(`+5% скорострельности`);
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}
