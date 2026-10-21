import { SimWeapon, SimPlayerRef, SimEnemyRef, SimProjectileData } from './SimWeaponBase';
import { SimVec3 } from '../math/SimVector';

export class SimBloodBatsWeapon extends SimWeapon {
  private projectileCount: number = 4;
  private projectileSpeed: number = 15;
  private bleedDps: number = 14;

  constructor() {
    super('blood_bats', 'Стая летучих мышей', '🦇', 1.6, 18);
    this.recalculateBatStats();
  }

  private recalculateBatStats(): void {
    const extraBatSteps = [2, 3, 4, 5, 6, 7].filter(lvl => this.level >= lvl).length;
    const finalStep = this.level >= 8 ? 2 : 0;
    this.projectileCount = Math.min(24, 4 + extraBatSteps * 3 + finalStep);
    this.bleedDps = 14 + (this.level - 1) * 4;
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
    this.damage += 6;
    this.recalculateBatStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return `Максимальный уровень (${this.maxLevel})`;
    const nextLvl = this.level + 1;
    const addedBats = nextLvl >= 8 ? 2 : 3;
    return `+6 к урону, +${addedBats} мышей, +4 к урону кровотечения`;
  }
}
