import { SimVec3 } from '../math/SimVector';
import {
  SimWeapon,
  SimProjectileData,
  SimPlayerRef,
  SimEnemyRef,
  findClosestSimEnemies
} from './SimWeaponBase';

/**
 * Hunting Bow (Охотничий Лук)
 */
export class SimBowWeapon extends SimWeapon {
  private projectileCount: number = 1;
  private projectileSpeed: number = 24;
  private pierce: number = 2;

  constructor() {
    super('bow', 'Охотничий Лук', '🏹', 0.85, 26);
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
      this.timer = 0;

      const targets = findClosestSimEnemies(enemies, player.position, this.projectileCount);
      if (targets.length === 0) return;

      if (_triggerAnim) _triggerAnim(0.40);
      if (emitSound) emitSound('shoot');

      for (let i = 0; i < this.projectileCount; i++) {
        const target = targets[i % targets.length];
        if (!target || !target.isAlive) continue;

        const dir = new SimVec3().subVectors(target.position, player.position);
        dir.y = 0;
        dir.normalize();

        if (this.projectileCount > 1 && targets.length < this.projectileCount) {
          const spreadAngle = (i - (this.projectileCount - 1) / 2) * 0.08;
          const cos = Math.cos(spreadAngle);
          const sin = Math.sin(spreadAngle);
          const rx = dir.x * cos - dir.z * sin;
          const rz = dir.x * sin + dir.z * cos;
          dir.x = rx;
          dir.z = rz;
        }

        const proj: SimProjectileData = {
          id: Math.random().toString(36).substring(2, 9),
          ownerId: player.id,
          position: player.position.clone().add({ x: 0, y: 0.7, z: 0 }),
          direction: dir,
          speed: this.projectileSpeed,
          damage: this.damage * player.damageMultiplier,
          pierce: this.pierce,
          lifetime: 2.2,
          radius: 0.32,
          color: 0xf59e0b,
          isArrow: true
        };

        spawnProjectile(proj);
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage += 6;
    if ([3, 6, 9, 12].includes(this.level)) this.projectileCount++;
    if ([4, 8, 12].includes(this.level)) this.pierce++;
    if ([2, 5, 8, 11].includes(this.level)) {
      this.cooldown = Math.max(0.40, Number((this.cooldown * 0.93).toFixed(3)));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+6 к урону'];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 стрела (всего ${this.projectileCount + 1})`);
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) perks.push('-7% перезарядки');
    return perks.join(', ');
  }
}

export const SimHeavyColtWeapon = SimBowWeapon;
export type SimHeavyColtWeapon = SimBowWeapon;

/**
 * Kukri Knife (Нож Кукри)
 */
export class SimKukriWeapon extends SimWeapon {
  private burstCount: number = 2;
  private projectileSpeed: number = 24;
  private pierce: number = 1;

  constructor() {
    super('kukri', 'Нож Кукри', '🔪', 0.65, 12);
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
      this.timer = 0;

      const sorted = findClosestSimEnemies(enemies, player.position, this.burstCount);
      if (sorted.length === 0) return;

      for (let i = 0; i < this.burstCount; i++) {
        const target = sorted[i % sorted.length];
        if (!target || !target.isAlive) continue;

        const dir = new SimVec3().subVectors(target.position, player.position);
        dir.y = 0;
        dir.normalize();

        const spreadAngle = i % 2 === 0 ? 0.08 : -0.08;
        const cos = Math.cos(spreadAngle);
        const sin = Math.sin(spreadAngle);
        const rx = dir.x * cos - dir.z * sin;
        const rz = dir.x * sin + dir.z * cos;
        dir.x = rx;
        dir.z = rz;

        const proj: SimProjectileData = {
          id: Math.random().toString(36).substring(2, 9),
          ownerId: player.id,
          position: player.position.clone().add({ x: 0, y: 0.65, z: 0 }),
          direction: dir,
          speed: this.projectileSpeed,
          damage: this.damage * player.damageMultiplier,
          pierce: this.pierce,
          lifetime: 1.8,
          radius: 0.28,
          color: 0x94a3b8,
          isKukri: true
        };

        spawnProjectile(proj);
        if (emitSound) emitSound('slash');
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage += 3;
    if ([2, 4, 6, 8, 10, 12].includes(this.level)) this.burstCount++;
    if ([6, 12].includes(this.level)) this.pierce++;
    if ([3, 5, 7, 9, 11].includes(this.level)) {
      this.cooldown = Math.max(0.25, Number((this.cooldown * 0.94).toFixed(3)));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+3 к урону'];
    if ([2, 4, 6, 8, 10, 12].includes(nextLvl)) perks.push(`+1 нож в серии (всего ${this.burstCount + 1})`);
    if ([6, 12].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([3, 5, 7, 9, 11].includes(nextLvl)) perks.push('-6% перезарядки');
    return perks.join(', ');
  }
}

export const SimDualRevolversWeapon = SimKukriWeapon;
export type SimDualRevolversWeapon = SimKukriWeapon;

/**
 * Assault Rifle (Штурмовая Винтовка)
 */
export class SimAssaultRifleWeapon extends SimWeapon {
  private projectileCount: number = 1;
  private projectileSpeed: number = 32;
  private pierce: number = 1;

  constructor() {
    super('assault_rifle', 'Штурмовая Винтовка', '🔫', 0.18, 15);
  }

  public update(
    dt: number,
    player: SimPlayerRef,
    enemies: SimEnemyRef[],
    spawnProjectile: (p: SimProjectileData) => void,
    _onAreaDamage: (enemyId: string, damage: number, sourcePos: SimVec3, knockbackDist?: number) => void,
    triggerAnim?: (duration: number) => void,
    emitSound?: (sound: 'shoot' | 'slash' | 'magic') => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;
      this.timer = 0;

      const targets = findClosestSimEnemies(enemies, player.position, this.projectileCount, 18.2 * 18.2);
      if (targets.length === 0) return;

      if (triggerAnim) triggerAnim(0.20);
      if (emitSound) emitSound('shoot');

      for (let i = 0; i < this.projectileCount; i++) {
        const target = targets[i % targets.length];
        if (!target || !target.isAlive) continue;

        const dir = new SimVec3().subVectors(target.position, player.position);
        dir.y = 0;
        dir.normalize();

        if (this.projectileCount > 1) {
          const spreadAngle = (i - (this.projectileCount - 1) / 2) * 0.10 + (Math.random() - 0.5) * 0.04;
          const cos = Math.cos(spreadAngle);
          const sin = Math.sin(spreadAngle);
          const rx = dir.x * cos - dir.z * sin;
          const rz = dir.x * sin + dir.z * cos;
          dir.x = rx;
          dir.z = rz;
        }

        const proj: SimProjectileData = {
          id: Math.random().toString(36).substring(2, 9),
          ownerId: player.id,
          position: player.position.clone().add({ x: 0, y: 0.65, z: 0 }),
          direction: dir,
          speed: this.projectileSpeed,
          damage: this.damage * player.damageMultiplier,
          pierce: this.pierce,
          lifetime: 1.6,
          radius: 0.28,
          color: 0xffaa22
        };

        spawnProjectile(proj);
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage += 6;
    if ([3, 6, 9, 12].includes(this.level)) this.projectileCount++;
    if ([4, 8, 12].includes(this.level)) this.pierce++;
    if ([2, 5, 8, 11].includes(this.level)) {
      this.cooldown = Math.max(0.09, Number((this.cooldown * 0.95).toFixed(3)));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+6 к урону'];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 пуля (всего ${this.projectileCount + 1})`);
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) perks.push('+5% скорострельности');
    return perks.join(', ');
  }
}
