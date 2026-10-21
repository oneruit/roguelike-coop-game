import { Vector3 } from 'three';
import { Weapon } from '../WeaponBase';
import { Projectile } from '../Projectile';
import { Enemy } from '../../entities/Enemy';
import { SoundManager } from '../../core/SoundManager';
import { BalanceManager } from '../../balance/BalanceManager';
import { type WeaponGrade, WEAPON_GRADES } from '../WeaponGrades';

/**
 * Helper to calculate bat projectile count across levels 1..12.
 * Levels 1 to 8 previously scaled from 4 up to 24 bats.
 * Now smoothly stretched across levels 1 to 12 reaching 24 bats at max level 12!
 */
export function getBloodBatsCount(level: number, baseCount: number = 4): number {
  const boundedLevel = Math.max(1, Math.min(12, Math.floor(level)));
  return Math.min(24, Math.round(baseCount + ((24 - baseCount) * (boundedLevel - 1)) / 11));
}

/**
 * Blood Bats Weapon (Стая летучих мышей)
 *
 * Summons swarms of ravenous shadowy blood bats with glowing crimson eyes.
 * Unlike other weapons, bats target random living enemies in range (not closest),
 * and fly in erratic, chaotic sinusoidal flutter paths.
 * Deals impact damage and applies stacking bleed; 1% of bleed damage heals the hero.
 * Scales from 4 bats at level 1 up to 24 bats at max level (level 12).
 * Supports Tier 2 (x2 damage & bleed) and Tier 1 (x3 damage & bleed) awakenings.
 */
export class BloodBatsWeapon extends Weapon {
  public projectileCount: number = 4;
  public projectileSpeed: number = 15;
  public bleedDps: number = 14;
  public bleedDuration: number = 3.0;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('blood_bats', 'Стая летучих мышей', '🦇', 1.6, 18, 3.18);
    this.maxLevel = 12;
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('blood_bats');
    const baseCount = cfg?.count ?? 4;

    // Bat count scaling: 4 bats at lvl 1 -> 24 bats at lvl 12
    this.projectileCount = getBloodBatsCount(this.level, baseCount);
    this.projectileSpeed = cfg?.speed ?? 15;

    // Direct impact damage: scales from 18 at lvl 1 to 53 at lvl 12 (equivalent of old lvl 8)
    // Tiers increase damage by x2 (Tier 2) and x3 (Tier 1) respectively via gradeStatMultiplier!
    const baseDmg = cfg?.damage ?? 18;
    const dmgGain = (35 * (this.level - 1)) / 11;
    this.damage = Math.round((baseDmg + dmgGain) * this.gradeStatMultiplier + this.bonusDamage);

    // Bleed DPS: scales from 14 at lvl 1 to 42 at lvl 12 (equivalent of old lvl 8)
    // Tiers also increase bleed damage by x2 (Tier 2) and x3 (Tier 1) respectively!
    const baseBleed = cfg?.bleedDps ?? 14;
    const bleedGain = (28 * (this.level - 1)) / 11;
    this.bleedDps = Math.round((baseBleed + bleedGain) * this.gradeStatMultiplier);
    this.bleedDuration = cfg?.bleedDuration ?? 3.0;

    const cdSteps = [2, 4, 6, 8, 10, 12].filter(lvl => this.level >= lvl).length;
    const levelCd = this.baseCooldown * Math.pow(0.95, cdSteps);
    this.cooldown = Math.max(0.65, Number((levelCd * (1 - this.cooldownBonus)).toFixed(3)));
  }

  public getBleedDps(): number {
    return this.bleedDps;
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

      const livingEnemies = enemies.filter(e => e.isAlive && e.position.distanceTo(playerPos) <= 26);
      if (livingEnemies.length === 0) return;

      this.timer = Math.min(this.effectiveCooldown * 0.5, this.timer - this.effectiveCooldown);

      if (this.onTriggerAttack) {
        this.onTriggerAttack();
      }

      // Stagger bat spawns for a natural chaotic swarm eruption
      const burstDelay = Math.max(18, Math.round(32 * this.cooldownMultiplier));
      const count = this.projectileCount;

      for (let index = 0; index < count; index++) {
        const spawnOneBat = () => {
          const available = livingEnemies.filter(e => e.isAlive);
          let target = available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : null;

          if (!target || !target.isAlive) {
            target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)] || null;
          }

          const spawnPos = playerPos.clone().add(new Vector3(
            (Math.random() - 0.5) * 0.6,
            0.6 + Math.random() * 0.4,
            (Math.random() - 0.5) * 0.6
          ));

          const targetPos = target && target.isAlive
            ? target.position.clone().add(new Vector3(
                (Math.random() - 0.5) * 1.4,
                0.4,
                (Math.random() - 0.5) * 1.4
              ))
            : spawnPos.clone().add(new Vector3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10));

          const dir = new Vector3().subVectors(targetPos, spawnPos);
          if (dir.lengthSq() > 0) dir.normalize();

          const initialJitter = (Math.random() - 0.5) * 0.45;
          dir.applyAxisAngle(new Vector3(0, 1, 0), initialJitter);

          const proj = new Projectile({
            position: spawnPos,
            direction: dir,
            speed: this.projectileSpeed + (Math.random() - 0.5) * 3.0,
            damage: this.damage,
            pierce: 1,
            lifetime: 3.0,
            radius: 0.38,
            color: 0xbe123c,
            isBat: true,
            bleedDps: this.bleedDps,
            sourceWeaponId: 'blood_bats'
          });

          spawnProjectile(proj);
          if (index === 0 || index % 6 === 0) {
            SoundManager.playMagic();
          }
        };

        if (index === 0) {
          spawnOneBat();
        } else {
          setTimeout(spawnOneBat, index * burstDelay);
        }
      }
    }
  }

  public upgrade(grade: WeaponGrade = 'common'): void {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.applyGradeUpgrade(grade);
    this.recalculateStats();
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return `Максимальный уровень (${this.maxLevel})`;
    const nextLvl = this.level + 1;
    const cfg = WEAPON_GRADES[grade];

    const currentBats = getBloodBatsCount(this.level, 4);
    const nextBats = getBloodBatsCount(nextLvl, 4);
    const addedBats = nextBats - currentBats;

    const baseDmg = 18;
    const currentBaseDmg = baseDmg + (35 * (this.level - 1)) / 11;
    const nextBaseDmg = baseDmg + (35 * (nextLvl - 1)) / 11;
    const dmg = Math.round((nextBaseDmg - currentBaseDmg) * cfg.damageMultiplierBonus * this.gradeStatMultiplier);

    const baseBleed = 14;
    const currentBleed = Math.round((baseBleed + (28 * (this.level - 1)) / 11) * this.gradeStatMultiplier);
    const nextBleed = Math.round((baseBleed + (28 * (nextLvl - 1)) / 11) * this.gradeStatMultiplier);
    const addedBleed = Math.max(1, nextBleed - currentBleed);

    const perks: string[] = [
      `+${dmg} к урону`,
      `+${addedBats} мышей (всего ${nextBats})`,
      `+${addedBleed} к урону кровотечения`
    ];
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    return `${this.getGradePrefix()}[${cfg.name.toUpperCase()}] ${perks.join(', ')}`;
  }
}
