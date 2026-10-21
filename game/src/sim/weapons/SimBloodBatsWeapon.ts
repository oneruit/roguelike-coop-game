import { SimWeapon, SimPlayerRef, SimEnemyRef, SimProjectileData } from './SimWeaponBase';
import { SimVec3 } from '../math/SimVector';

export class SimBloodBatsWeapon extends SimWeapon {
  public projectileCount: number = 4;
  public projectileSpeed: number = 15;
  public bleedDps: number = 14;
  public awakenedGrade: number = 0;
  public gradeStatMultiplier: number = 1.0;

  constructor() {
    super('blood_bats', 'Стая летучих мышей', '🦇', 1.6, 18);
    this.maxLevel = 12;
    this.recalculateBatStats();
  }

  public awakenGrade(): void {
    this.awakenedGrade++;
    this.gradeStatMultiplier = this.awakenedGrade === 1 ? 2.0 : this.awakenedGrade >= 2 ? 3.0 : 1.0;
    this.level = 1;
    this.recalculateBatStats();
  }

  private recalculateBatStats(): void {
    const baseCount = 4;
    this.projectileCount = Math.min(24, Math.round(baseCount + ((24 - baseCount) * (this.level - 1)) / 11));
    this.bleedDps = Math.round((14 + (28 * (this.level - 1)) / 11) * this.gradeStatMultiplier);
    const baseDmg = 18;
    this.damage = Math.round((baseDmg + (35 * (this.level - 1)) / 11) * this.gradeStatMultiplier);
  }

  public update(
    dt: number,
    player: SimPlayerRef,
    enemies: SimEnemyRef[],
    spawnProjectile: (p: SimProjectileData) => void,
    _onAreaDamage: (enemyId: string, damage: number, sourcePos: SimVec3, knockbackDist?: number) => void,
    _triggerAnim?: (duration: number) => void,
    emitSound?: (sound: 'shoot' | 'slash' | 'magic') => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;
      const living = enemies.filter(e => e.isAlive);
      if (living.length === 0) return;

      this.timer = 0;
      if (_triggerAnim) _triggerAnim(0.44);
      if (emitSound) emitSound('magic');

      for (let i = 0; i < this.projectileCount; i++) {
        const target = living[Math.floor(Math.random() * living.length)];
        const dir = target.position.clone().sub(player.position);
        if (dir.lengthSq() > 0) dir.normalize();

        spawnProjectile({
          id: `sim_bat_${Math.random()}`,
          ownerId: player.id,
          position: player.position.clone(),
          direction: dir,
          speed: this.projectileSpeed,
          damage: this.damage * player.damageMultiplier,
          pierce: 1,
          lifetime: 3.0,
          radius: 0.38,
          color: 0xbe123c,
          bleedDps: this.bleedDps
        });
      }
    }
  }

  public upgrade(): void {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateBatStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return `Максимальный уровень (${this.maxLevel})`;
    const nextLvl = this.level + 1;
    const currentBats = Math.min(24, Math.round(4 + (20 * (this.level - 1)) / 11));
    const nextBats = Math.min(24, Math.round(4 + (20 * (nextLvl - 1)) / 11));
    const addedBats = nextBats - currentBats;
    const currentBleed = Math.round((14 + (28 * (this.level - 1)) / 11) * this.gradeStatMultiplier);
    const nextBleed = Math.round((14 + (28 * (nextLvl - 1)) / 11) * this.gradeStatMultiplier);
    const addedBleed = Math.max(1, nextBleed - currentBleed);
    const currentDmg = Math.round((18 + (35 * (this.level - 1)) / 11) * this.gradeStatMultiplier);
    const nextDmg = Math.round((18 + (35 * (nextLvl - 1)) / 11) * this.gradeStatMultiplier);
    const addedDmg = Math.max(1, nextDmg - currentDmg);
    return `+${addedDmg} к урону, +${addedBats} мышей, +${addedBleed} к урону кровотечения`;
  }
}
