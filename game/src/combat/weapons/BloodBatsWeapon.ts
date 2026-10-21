import { Vector3 } from 'three';
import { Weapon } from '../WeaponBase';
import { Projectile } from '../Projectile';
import { Enemy } from '../../entities/Enemy';
import { SoundManager } from '../../core/SoundManager';
import { BalanceManager } from '../../balance/BalanceManager';
import { type WeaponGrade, WEAPON_GRADES } from '../WeaponGrades';

/**
 * Blood Bats Weapon (Стая летучих мышей)
 *
 * Summons swarms of ravenous shadowy blood bats with glowing crimson eyes.
 * Unlike other weapons, bats target random living enemies in range (not closest),
 * and fly in erratic, chaotic sinusoidal flutter paths.
 * Deals impact damage and applies stacking bleed; 1% of bleed damage heals the hero.
 * Scales from 4 bats at level 1 up to 24 bats at max level (level 8).
 */
export class BloodBatsWeapon extends Weapon {
  public projectileCount: number = 4;
  public projectileSpeed: number = 15;
  public bleedDps: number = 14;
  public bleedDuration: number = 3.0;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('blood_bats', 'Стая летучих мышей', '🦇', 1.6, 18, 6);
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

    // Bat scaling: +3 bats per level from lvl 2 to 7, +2 bats at lvl 8 -> exactly 24 bats at max level 8!
    // Lvl 1: 4 | Lvl 2: 7 | Lvl 3: 10 | Lvl 4: 13 | Lvl 5: 16 | Lvl 6: 19 | Lvl 7: 22 | Lvl 8: 24
    const extraBatSteps = [2, 3, 4, 5, 6, 7].filter(lvl => this.level >= lvl).length;
    const finalStep = this.level >= 8 ? 2 : 0;
    this.projectileCount = Math.min(24, baseCount + extraBatSteps * 3 + finalStep);

    this.projectileSpeed = cfg?.speed ?? 15;
    const baseBleed = cfg?.bleedDps ?? 14;
    this.bleedDps = Math.round((baseBleed + (this.level - 1) * 4) * this.gradeStatMultiplier);
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
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const addedBats = nextLvl >= 8 ? 2 : 3;
    const perks: string[] = [
      `+${dmg} к урону`,
      `+${addedBats} мышей (всего ${this.projectileCount + addedBats})`,
      `+4 к урону кровотечения`
    ];
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    return perks.join(', ');
  }
}
