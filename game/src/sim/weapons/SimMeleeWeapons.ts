import { SimVec3 } from '../math/SimVector';
import {
  SimWeapon,
  SimProjectileData,
  SimPlayerRef,
  SimEnemyRef
} from './SimWeaponBase';

/**
 * Crimson Whirlwind (Багровый Вихрь) - Ronin
 */
export class SimWhirlwindSlashWeapon extends SimWeapon {
  private slashRadius: number = 3.6;

  constructor() {
    super('whirlwind_slash', 'Багровый Вихрь', '🌪️', 0.42, 16);
  }

  public update(
    dt: number,
    player: SimPlayerRef,
    enemies: SimEnemyRef[],
    _spawnProjectile: (p: SimProjectileData) => void,
    onAreaDamage: (enemyId: string, damage: number, sourcePos: SimVec3, knockbackDist?: number) => void,
    triggerAnim?: (duration: number) => void,
    emitSound?: (sound: 'shoot' | 'slash' | 'magic') => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const radSq = this.slashRadius * this.slashRadius;
      let hitCount = 0;

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.position.x - player.position.x;
        const dz = enemy.position.z - player.position.z;
        if (dx * dx + dz * dz <= radSq) {
          onAreaDamage(enemy.id, this.damage * player.damageMultiplier, player.position, 0.2);
          hitCount++;
        }
      }

      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(player.position) < 45);
      if (hitCount > 0 || nearby) {
        this.timer = 0;
        if (triggerAnim) triggerAnim(0.42);
        if (emitSound) emitSound('slash');
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.slashRadius = Number((this.slashRadius + 0.12).toFixed(2));
    this.damage += 4;
    this.cooldown = Math.max(0.20, Number((this.cooldown * 0.96).toFixed(3)));
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    return `+0.12м радиус вихря, +4 урона, -4% перезарядки`;
  }
}

/**
 * Greatsword (Двуручный Меч) - Valkyrie
 */
export class SimGreatswordWeapon extends SimWeapon {
  private slashRadius: number = 4.2;

  constructor() {
    super('greatsword', 'Двуручный Меч', '⚔️', 0.70, 32);
  }

  public update(
    dt: number,
    player: SimPlayerRef,
    enemies: SimEnemyRef[],
    _spawnProjectile: (p: SimProjectileData) => void,
    onAreaDamage: (enemyId: string, damage: number, sourcePos: SimVec3, knockbackDist?: number) => void,
    triggerAnim?: (duration: number) => void,
    emitSound?: (sound: 'shoot' | 'slash' | 'magic') => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const radSq = this.slashRadius * this.slashRadius;
      let hitCount = 0;

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.position.x - player.position.x;
        const dz = enemy.position.z - player.position.z;
        if (dx * dx + dz * dz <= radSq) {
          onAreaDamage(enemy.id, this.damage * player.damageMultiplier, player.position, 0.35);
          hitCount++;
        }
      }

      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(player.position) < 48);
      if (hitCount > 0 || nearby) {
        this.timer = 0;
        if (triggerAnim) triggerAnim(0.5);
        if (emitSound) emitSound('slash');
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.slashRadius = Number((this.slashRadius + 0.15).toFixed(2));
    this.damage += 7;
    this.cooldown = Math.max(0.35, Number((this.cooldown * 0.96).toFixed(3)));
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    return `+0.15м радиус взмаха, +7 урона, -4% перезарядки`;
  }
}

/**
 * Steel Flail (Боевой Цеп) - Brigitta
 */
export class SimFlailWeapon extends SimWeapon {
  private flailRadius: number = 3.9;

  constructor() {
    super('flail', 'Боевой Цеп', '⛓️', 0.52, 20);
  }

  public update(
    dt: number,
    player: SimPlayerRef,
    enemies: SimEnemyRef[],
    _spawnProjectile: (p: SimProjectileData) => void,
    onAreaDamage: (enemyId: string, damage: number, sourcePos: SimVec3, knockbackDist?: number) => void,
    triggerAnim?: (duration: number) => void,
    emitSound?: (sound: 'shoot' | 'slash' | 'magic') => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const radSq = this.flailRadius * this.flailRadius;
      let hitCount = 0;

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.position.x - player.position.x;
        const dz = enemy.position.z - player.position.z;
        if (dx * dx + dz * dz <= radSq) {
          onAreaDamage(enemy.id, this.damage * player.damageMultiplier, player.position, 0.35);
          hitCount++;
        }
      }

      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(player.position) < 42);
      if (hitCount > 0 || nearby) {
        this.timer = 0;
        if (triggerAnim) triggerAnim(0.45);
        if (emitSound) emitSound('slash');
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.flailRadius = Number((this.flailRadius + 0.14).toFixed(2));
    this.damage += 5;
    this.cooldown = Math.max(0.25, Number((this.cooldown * 0.96).toFixed(3)));
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    return `+0.14м радиус удара, +5 урона, -4% перезарядки`;
  }
}

/**
 * Reaper's Scythe (Коса Жнеца)
 */
export class SimReaperScytheWeapon extends SimWeapon {
  private orbCount: number = 2;
  private orbitRadius: number = 2.5;
  private orbitSpeed: number = 3.8;
  private bleedDps: number = 8;
  private activeOrbIds: string[] = [];

  constructor() {
    super('reaper_scythe', 'Коса Жнеца', '🌙', 0, 4);
  }

  public update(
    _dt: number,
    player: SimPlayerRef,
    _enemies: SimEnemyRef[],
    spawnProjectile: (p: SimProjectileData) => void
  ) {
    if (this.activeOrbIds.length < this.orbCount) {
      const needed = this.orbCount - this.activeOrbIds.length;
      for (let i = 0; i < needed; i++) {
        const id = Math.random().toString(36).substring(2, 9);
        this.activeOrbIds.push(id);
        const angle = (this.activeOrbIds.length / this.orbCount) * Math.PI * 2;

        const orb: SimProjectileData = {
          id,
          ownerId: player.id,
          position: player.position.clone(),
          direction: new SimVec3(1, 0, 0),
          speed: 0,
          damage: this.damage * player.damageMultiplier,
          bleedDps: this.bleedDps * player.damageMultiplier,
          pierce: 99999,
          lifetime: 999999,
          radius: Number((0.32 + (this.level - 1) * 0.012).toFixed(3)),
          color: 0xef4444,
          isOrbiting: true,
          orbitRadius: this.orbitRadius,
          orbitSpeed: this.orbitSpeed,
          orbitAngle: angle
        };

        spawnProjectile(orb);
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage = Number((this.damage + 1).toFixed(2));
    this.bleedDps = Number((this.bleedDps + 2).toFixed(2));
    this.orbitRadius = Number((this.orbitRadius + 0.20).toFixed(2));
    this.orbitSpeed = Number((this.orbitSpeed + 0.08).toFixed(2));
    if ([3, 6, 9, 12].includes(this.level)) this.orbCount++;
    this.activeOrbIds = [];
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+1 к прямому урону', '+2 к урону кровотечения/сек', '+0.20м дальность орбиты'];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 коса (всего ${this.orbCount + 1})`);
    return perks.join(', ');
  }
}

/**
 * Katana Slash (Рассекающий Клинок)
 */
export class SimKatanaSlashWeapon extends SimWeapon {
  private slashRadius: number = 3.8;

  constructor() {
    super('katana_slash', 'Рассекающий Клинок', '🗡️', 0.60, 25);
  }

  public update(
    dt: number,
    player: SimPlayerRef,
    enemies: SimEnemyRef[],
    _spawnProjectile: (p: SimProjectileData) => void,
    onAreaDamage: (enemyId: string, damage: number, sourcePos: SimVec3, knockbackDist?: number) => void,
    triggerAnim?: (duration: number) => void,
    emitSound?: (sound: 'shoot' | 'slash' | 'magic') => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const radSq = this.slashRadius * this.slashRadius;
      let hitCount = 0;

      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.position.x - player.position.x;
        const dz = enemy.position.z - player.position.z;
        if (dx * dx + dz * dz <= radSq) {
          onAreaDamage(enemy.id, this.damage * player.damageMultiplier, player.position, 0.25);
          hitCount++;
        }
      }

      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(player.position) < 45);
      if (hitCount > 0 || nearby) {
        this.timer = 0;
        if (triggerAnim) triggerAnim(0.40);
        if (emitSound) emitSound('slash');
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.slashRadius = Number((this.slashRadius + 0.14).toFixed(2));
    this.damage += 6;
    this.cooldown = Math.max(0.30, Number((this.cooldown * 0.96).toFixed(3)));
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    return `+0.14м радиус взмаха, +6 урона, -4% перезарядки`;
  }
}
