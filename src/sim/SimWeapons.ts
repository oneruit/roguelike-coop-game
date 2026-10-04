import { SimVec3 } from './math/SimVector';
import { CharacterType } from './types';

export interface SimWeaponInfo {
  id: string;
  name: string;
  icon: string;
  iconImage?: string;
  level: number;
  maxLevel: number;
  description: string;
}

export interface SimProjectileData {
  id: string;
  ownerId: string;
  position: SimVec3;
  direction: SimVec3;
  speed: number;
  damage: number;
  pierce: number;
  lifetime: number;
  radius: number;
  color: number;
  isMagic?: boolean;
  isChakram?: boolean;
  curveSign?: number;
  isOrbiting?: boolean;
  orbitRadius?: number;
  orbitSpeed?: number;
  orbitAngle?: number;
  isArrow?: boolean;
  isKukri?: boolean;
  isLightning?: boolean;
}

export interface SimEnemyRef {
  id: string;
  position: SimVec3;
  isAlive: boolean;
  isImmortal?: boolean;
}

export interface SimPlayerRef {
  id: string;
  position: SimVec3;
  isAlive: boolean;
  isDowned: boolean;
  damageMultiplier: number;
}

export abstract class SimWeapon {
  public id: string;
  public name: string;
  public icon: string;
  public iconImage: string;
  public level: number = 1;
  public maxLevel: number = 20;
  public cooldown: number;
  public timer: number = 0;
  public damage: number;

  constructor(id: string, name: string, icon: string, cooldown: number, damage: number, iconImage?: string) {
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.iconImage = iconImage || `/textures/weapon_${id}.png`;
    this.cooldown = cooldown;
    this.damage = damage;
  }

  public abstract update(
    dt: number,
    player: SimPlayerRef,
    enemies: SimEnemyRef[],
    spawnProjectile: (p: SimProjectileData) => void,
    onAreaDamage: (enemyId: string, damage: number, sourcePos: SimVec3, knockbackDist?: number) => void,
    triggerAnim?: (duration: number) => void,
    emitSound?: (sound: 'shoot' | 'slash' | 'magic') => void
  ): void;

  public abstract upgrade(): void;
  public abstract getNextUpgradeDescription(): string;

  public getInfo(): SimWeaponInfo {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      iconImage: this.iconImage,
      level: this.level,
      maxLevel: this.maxLevel,
      description: this.getNextUpgradeDescription()
    };
  }
}

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
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;
      this.timer = 0;

      const candidates = enemies
        .filter(e => e.isAlive)
        .map(e => ({ enemy: e, distSq: e.position.distanceToSquared(player.position) }))
        .sort((a, b) => a.distSq - b.distSq);

      if (candidates.length === 0) return;

      if (_triggerAnim) _triggerAnim(0.40);
      if (emitSound) emitSound('shoot');

      for (let i = 0; i < this.projectileCount; i++) {
        const target = candidates[i % candidates.length].enemy;
        if (!target || !target.isAlive) continue;

        const dir = new SimVec3().subVectors(target.position, player.position);
        dir.y = 0;
        dir.normalize();

        if (this.projectileCount > 1 && candidates.length < this.projectileCount) {
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
    if ([4, 8, 12, 16, 20].includes(this.level)) this.projectileCount++;
    if ([3, 6, 9, 13, 17].includes(this.level)) this.pierce++;
    if ([2, 5, 7, 10, 14, 18].includes(this.level)) {
      this.cooldown = Math.max(0.40, Number((this.cooldown * 0.93).toFixed(3)));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+6 к урону'];
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 стрела (всего ${this.projectileCount + 1})`);
    if ([3, 6, 9, 13, 17].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([2, 5, 7, 10, 14, 18].includes(nextLvl)) perks.push('-7% перезарядки');
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
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;
      this.timer = 0;

      const candidates = enemies
        .filter(e => e.isAlive)
        .map(e => ({ enemy: e, distSq: e.position.distanceToSquared(player.position) }))
        .sort((a, b) => a.distSq - b.distSq);

      if (candidates.length === 0) return;
      const sorted = candidates.map(c => c.enemy);

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
    if ([2, 4, 6, 8, 10, 12, 14, 16, 18, 20].includes(this.level)) this.burstCount++;
    if ([10, 20].includes(this.level)) this.pierce++;
    if ([3, 5, 7, 9, 11, 13, 15, 17, 19].includes(this.level)) {
      this.cooldown = Math.max(0.25, Number((this.cooldown * 0.94).toFixed(3)));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+3 к урону'];
    if ([2, 4, 6, 8, 10, 12, 14, 16, 18, 20].includes(nextLvl)) perks.push(`+1 нож в серии (всего ${this.burstCount + 1})`);
    if ([10, 20].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([3, 5, 7, 9, 11, 13, 15, 17, 19].includes(nextLvl)) perks.push('-6% перезарядки');
    return perks.join(', ');
  }
}

export const SimDualRevolversWeapon = SimKukriWeapon;
export type SimDualRevolversWeapon = SimKukriWeapon;

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
    if (this.timer >= this.cooldown) {
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
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
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
    if (this.timer >= this.cooldown) {
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
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
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
    if (this.timer >= this.cooldown) {
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
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    return `+0.14м радиус удара, +5 урона, -4% перезарядки`;
  }
}

/**
 * Astral Staff (Звездный Посох) - Sorceress
 */
export class SimAstralStaffWeapon extends SimWeapon {
  private projectileCount: number = 1;
  private projectileSpeed: number = 16;
  private pierceCount: number = 2;

  constructor() {
    super('astral_staff', 'Звёздный Посох', '✨', 0.65, 22);
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
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;
      this.timer = 0;

      const candidates = enemies
        .filter(e => e.isAlive)
        .map(e => ({ enemy: e, distSq: e.position.distanceToSquared(player.position) }))
        .sort((a, b) => a.distSq - b.distSq);

      if (candidates.length === 0) return;
      const target = candidates[0].enemy;

      const baseDir = new SimVec3().subVectors(target.position, player.position);
      baseDir.y = 0;
      baseDir.normalize();

      for (let i = 0; i < this.projectileCount; i++) {
        const spreadAngle = (i - (this.projectileCount - 1) / 2) * 0.16;
        const cos = Math.cos(spreadAngle);
        const sin = Math.sin(spreadAngle);
        const dir = new SimVec3(
          baseDir.x * cos - baseDir.z * sin,
          0,
          baseDir.x * sin + baseDir.z * cos
        ).normalize();

        const proj: SimProjectileData = {
          id: Math.random().toString(36).substring(2, 9),
          ownerId: player.id,
          position: player.position.clone().add({ x: 0, y: 0.8, z: 0 }),
          direction: dir,
          speed: this.projectileSpeed,
          damage: this.damage * player.damageMultiplier,
          pierce: this.pierceCount,
          lifetime: 2.2,
          radius: 0.32,
          color: 0xc084fc,
          isMagic: true
        };

        spawnProjectile(proj);
      }

      if (triggerAnim) triggerAnim(0.48);
      if (emitSound) emitSound('magic');
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage = Number((this.damage + 5).toFixed(2));
    if ([3, 6, 9, 12, 15, 18, 20].includes(this.level)) this.projectileCount++;
    if ([4, 8, 12, 16, 20].includes(this.level)) this.pierceCount++;
    if ([2, 5, 7, 10, 14, 17].includes(this.level)) {
      this.cooldown = Math.max(0.30, Number((this.cooldown * 0.94).toFixed(3)));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+5 к урону'];
    if ([3, 6, 9, 12, 15, 18, 20].includes(nextLvl)) perks.push(`+1 снаряд веером (всего ${this.projectileCount + 1})`);
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierceCount + 1})`);
    if ([2, 5, 7, 10, 14, 17].includes(nextLvl)) perks.push('-6% перезарядки');
    return perks.join(', ');
  }
}

/**
 * Orbiting Barrier (Священные Подковы)
 */
export class SimOrbitingBarrierWeapon extends SimWeapon {
  private orbCount: number = 2;
  private orbitRadius: number = 2.5;
  private orbitSpeed: number = 3.8;
  private activeOrbIds: string[] = [];

  constructor() {
    super('orbiting_barrier', 'Священные Подковы', '🧲', 0, 12);
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
          pierce: 99999,
          lifetime: 999999,
          radius: Number((0.32 + (this.level - 1) * 0.012).toFixed(3)),
          color: 0xfbbf24,
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
    this.damage = Number((this.damage + 3).toFixed(2));
    this.orbitRadius = Number((this.orbitRadius + 0.20).toFixed(2));
    this.orbitSpeed = Number((this.orbitSpeed + 0.08).toFixed(2));
    if ([3, 6, 9, 12, 15, 18, 20].includes(this.level)) this.orbCount++;
    this.activeOrbIds = [];
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+3 к урону', '+0.20м дальность орбиты'];
    if ([3, 6, 9, 12, 15, 18, 20].includes(nextLvl)) perks.push(`+1 подкова (всего ${this.orbCount + 1})`);
    return perks.join(', ');
  }
}

/**
 * Holy Aura (Огненный Периметр)
 */
export class SimHolyAuraWeapon extends SimWeapon {
  private radius: number = 3.5;

  constructor() {
    super('holy_aura', 'Огненный Периметр', '🔥', 0.50, 16);
  }

  public update(
    dt: number,
    player: SimPlayerRef,
    enemies: SimEnemyRef[],
    _spawnProjectile: (p: SimProjectileData) => void,
    onAreaDamage: (enemyId: string, damage: number, sourcePos: SimVec3, knockbackDist?: number) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      this.timer = 0;
      const radSq = this.radius * this.radius;
      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.position.x - player.position.x;
        const dz = enemy.position.z - player.position.z;
        if (dx * dx + dz * dz <= radSq) {
          onAreaDamage(enemy.id, this.damage * player.damageMultiplier, player.position, 0.05);
        }
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.radius = Number((this.radius + 0.20).toFixed(2));
    this.damage += 4;
    this.cooldown = Math.max(0.22, Number((this.cooldown * 0.96).toFixed(3)));
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    return `+0.20м радиус, +4 урона, -4% перезарядки`;
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
    if (this.timer >= this.cooldown) {
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
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    return `+0.14м радиус взмаха, +6 урона, -4% перезарядки`;
  }
}

/**
 * Boomerang Chakram simulation weapon
 */
export class SimChakramWeapon extends SimWeapon {
  private flightSpeed: number = 14.5;
  private chakramCount: number = 1;
  private chakramRadius: number = 0.38;
  private alternateSign: number = 1;

  constructor() {
    super('chakram', 'Танцующий Чакрам', '🪃', 0.70, 20);
  }

  public update(
    dt: number,
    player: SimPlayerRef,
    enemies: SimEnemyRef[],
    spawnProjectile: (data: SimProjectileData) => void,
    _damageEnemy: (enemyId: string, damage: number, sourcePos: SimVec3, knockbackDist?: number) => void,
    onTriggerAttack?: (duration: number) => void,
    _emitSound?: (sound: 'shoot' | 'slash' | 'magic') => void
  ) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;

      const candidates = enemies
        .filter(e => e.isAlive)
        .map(e => ({ enemy: e, distSq: e.position.distanceToSquared(player.position) }))
        .sort((a, b) => a.distSq - b.distSq);

      if (candidates.length === 0) return;
      if (candidates[0].distSq > 20 * 20) return;

      this.timer = 0;
      onTriggerAttack?.(0.44);

      const target = candidates[0].enemy;
      const baseDir = new SimVec3(
        target.position.x - player.position.x,
        0,
        target.position.z - player.position.z
      );
      if (baseDir.lengthSq() === 0) baseDir.x = 1;
      baseDir.normalize();

      this.alternateSign = -this.alternateSign;

      for (let i = 0; i < this.chakramCount; i++) {
        let sign = this.alternateSign;
        if (this.chakramCount > 1) {
          sign = i % 2 === 0 ? 1 : -1;
        }

        const angleOffset = (i - (this.chakramCount - 1) / 2) * 0.16;
        const throwDir = baseDir.clone();
        if (angleOffset !== 0) {
          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);
          const nx = throwDir.x * cos - throwDir.z * sin;
          const nz = throwDir.x * sin + throwDir.z * cos;
          throwDir.x = nx;
          throwDir.z = nz;
        }

        spawnProjectile({
          id: `sim_chakram_${Math.random().toString(36).substring(2, 9)}`,
          ownerId: player.id,
          position: new SimVec3(player.position.x, 0.6, player.position.z),
          direction: throwDir,
          speed: this.flightSpeed,
          damage: this.damage * player.damageMultiplier,
          pierce: 999,
          lifetime: 1.35,
          radius: this.chakramRadius,
          color: 0xf59e0b,
          isChakram: true,
          curveSign: sign
        });
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage += 4;
    if ([4, 8, 12, 16, 20].includes(this.level)) {
      this.chakramCount++;
    }
    if ([3, 6, 9, 13, 17].includes(this.level)) {
      this.cooldown = Math.max(0.30, Number((this.cooldown * 0.94).toFixed(3)));
    }
    if ([2, 5, 10, 15].includes(this.level)) {
      this.flightSpeed += 1.2;
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+4 к урону'];
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 возвращающийся чакрам (всего ${this.chakramCount + 1})`);
    if ([3, 6, 9, 13, 17].includes(nextLvl)) perks.push('-6% перезарядки');
    if ([2, 5, 10, 15].includes(nextLvl)) perks.push('+1.2 м/с скорость полёта');
    return perks.join(', ');
  }
}

/**
 * Lightning Strike (Удар Молнии) simulation weapon
 */
export class SimLightningStrikeWeapon extends SimWeapon {
  private strikeCount: number = 1;
  private strikeRadius: number = 2.4;
  private range: number = 22;

  constructor() {
    super('lightning_strike', 'Удар Молнии', '⚡', 1.20, 45);
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
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;

      const candidates = enemies
        .filter(e => e.isAlive)
        .map(e => ({ enemy: e, distSq: e.position.distanceToSquared(player.position) }))
        .filter(c => c.distSq <= this.range * this.range)
        .sort((a, b) => a.distSq - b.distSq);

      if (candidates.length === 0) return;

      this.timer = 0;
      if (triggerAnim) triggerAnim(0.40);
      if (emitSound) emitSound('magic');

      for (let i = 0; i < this.strikeCount; i++) {
        const targetCandidate = candidates[i % candidates.length];
        const proj: SimProjectileData = {
          id: `sim_lightning_${Math.random().toString(36).substring(2, 9)}`,
          ownerId: player.id,
          position: targetCandidate.enemy.position.clone(),
          direction: new SimVec3(0, 0, 1),
          speed: 0,
          damage: this.damage * player.damageMultiplier,
          pierce: 999,
          lifetime: 0.24,
          radius: this.strikeRadius,
          color: 0x38bdf8,
          isLightning: true
        };
        spawnProjectile(proj);
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage += 8;
    if ([4, 8, 12, 16, 20].includes(this.level)) {
      this.strikeCount++;
    }
    if ([3, 6, 9, 13, 17].includes(this.level)) {
      this.cooldown = Math.max(0.40, Number((this.cooldown * 0.92).toFixed(3)));
    }
    if ([5, 10, 15].includes(this.level)) {
      this.strikeRadius = Number((this.strikeRadius + 0.30).toFixed(2));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+8 к урону'];
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 разряд молнии (всего ${this.strikeCount + 1})`);
    if ([3, 6, 9, 13, 17].includes(nextLvl)) perks.push('-8% перезарядки');
    if ([5, 10, 15].includes(nextLvl)) perks.push(`+0.30м радиус взрыва (всего ${(this.strikeRadius + 0.30).toFixed(2)}м)`);
    return perks.join(', ');
  }
}

/**
 * Creates weapon for character selection
 */
export function createSimWeaponForCharacter(charType: CharacterType): SimWeapon {
  switch (charType) {
    case 'valkyrie':
      return new SimGreatswordWeapon();
    case 'flail':
      return new SimFlailWeapon();
    case 'sorceress':
      return new SimAstralStaffWeapon();
    case 'chakram':
      return new SimChakramWeapon();
    case 'archer':
      return new SimBowWeapon();
    case 'ronin':
    default:
      return new SimWhirlwindSlashWeapon();
  }
}

/**
 * Creates weapon by ID
 */
export function createSimWeaponById(id: string): SimWeapon | null {
  switch (id) {
    case 'bow':
    case 'heavy_colt':
      return new SimBowWeapon();
    case 'kukri':
    case 'dual_revolvers':
      return new SimKukriWeapon();
    case 'whirlwind_slash':
      return new SimWhirlwindSlashWeapon();
    case 'greatsword':
      return new SimGreatswordWeapon();
    case 'flail':
      return new SimFlailWeapon();
    case 'astral_staff':
      return new SimAstralStaffWeapon();
    case 'chakram':
      return new SimChakramWeapon();
    case 'lightning_strike':
      return new SimLightningStrikeWeapon();
    case 'orbiting_barrier':
      return new SimOrbitingBarrierWeapon();
    case 'holy_aura':
      return new SimHolyAuraWeapon();
    case 'katana_slash':
      return new SimKatanaSlashWeapon();
    default:
      return null;
  }
}
