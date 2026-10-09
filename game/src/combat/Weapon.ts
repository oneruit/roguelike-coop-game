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
import { Projectile } from './Projectile';
import { SoundManager } from '../core/SoundManager';
import { Enemy } from '../entities/Enemy';
import { TextureManager } from '../core/TextureManager';
import { BalanceManager } from '../balance/BalanceManager';
import { WeaponBalanceConfig } from '../balance/BalanceTypes';
import type { MeleeAttackInfo, MeleeWeaponId } from '../shared/types';

export interface WeaponInfo {
  id: string;
  name: string;
  icon: string;
  iconImage?: string;
  level: number;
  maxLevel: number;
  description: string;
}

/**
 * Zero-allocation fast O(N) lookup for the top K closest alive enemies.
 * Avoids creating intermediate object wrappers or running O(N log N) Array.prototype.sort.
 */
export function findClosestEnemies(
  enemies: Enemy[],
  pos: Vector3,
  count: number,
  maxDistSq: number = Infinity
): Enemy[] {
  if (count <= 0 || enemies.length === 0) return [];
  if (count === 1) {
    let closest: Enemy | null = null;
    let minDistSq = maxDistSq;
    const px = pos.x;
    const pz = pos.z;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.isAlive) continue;
      const dx = e.position.x - px;
      const dz = e.position.z - pz;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closest = e;
      }
    }
    return closest ? [closest] : [];
  }

  const result: Enemy[] = [];
  const dists: number[] = [];
  const px = pos.x;
  const pz = pos.z;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.isAlive) continue;
    const dx = e.position.x - px;
    const dz = e.position.z - pz;
    const dSq = dx * dx + dz * dz;
    if (dSq > maxDistSq) continue;

    if (result.length < count) {
      result.push(e);
      dists.push(dSq);
      for (let k = result.length - 1; k > 0; k--) {
        if (dists[k] < dists[k - 1]) {
          const td = dists[k]; dists[k] = dists[k - 1]; dists[k - 1] = td;
          const te = result[k]; result[k] = result[k - 1]; result[k - 1] = te;
        } else break;
      }
    } else if (dSq < dists[count - 1]) {
      dists[count - 1] = dSq;
      result[count - 1] = e;
      for (let k = count - 1; k > 0; k--) {
        if (dists[k] < dists[k - 1]) {
          const td = dists[k]; dists[k] = dists[k - 1]; dists[k - 1] = td;
          const te = result[k]; result[k] = result[k - 1]; result[k - 1] = te;
        } else break;
      }
    }
  }

  return result;
}

export abstract class Weapon {
  public id: string;
  public name: string;
  public icon: string;
  private _iconImage: string;
  public get iconImage(): string {
    return TextureManager.getWeaponBlobUrl(this._iconImage);
  }
  public set iconImage(val: string) {
    this._iconImage = val;
  }
  public level: number = 1;
  public maxLevel: number = 20;
  public cooldownMultiplier: number = 1.0;
  public cooldown: number;
  public baseCooldown: number;
  protected timer: number = 0;
  public damage: number;
  public baseDamage: number;
  public damagePerLevel: number = 5;
  public onMeleeAttack?: (attack: MeleeAttackInfo) => void;

  public get effectiveCooldown(): number {
    return Math.max(0.08, this.cooldown * this.cooldownMultiplier);
  }

  constructor(
    id: string,
    name: string,
    icon: string,
    cooldown: number,
    damage: number,
    damagePerLevel: number = 5,
    iconImage?: string
  ) {
    this.id = id;
    const cfg = BalanceManager.getWeaponConfig(id);
    this.name = cfg.name || name;
    this.icon = cfg.icon || icon;
    this._iconImage = iconImage || `/textures/weapons/weapon_${id}.png`;
    this.baseCooldown = cfg.cooldown !== undefined ? cfg.cooldown : cooldown;
    this.cooldown = this.baseCooldown;
    this.baseDamage = cfg.damage !== undefined ? cfg.damage : damage;
    this.damagePerLevel = cfg.damagePerLevel !== undefined ? cfg.damagePerLevel : damagePerLevel;
    this.damage = this.baseDamage;
    this.maxLevel = cfg.maxLevel || 20;
  }

  public applyBalance(cfg: WeaponBalanceConfig): void {
    if (!cfg) return;
    this.baseDamage = cfg.damage;
    this.baseCooldown = cfg.cooldown;
    if (cfg.damagePerLevel !== undefined) this.damagePerLevel = cfg.damagePerLevel;
    if (cfg.maxLevel !== undefined) this.maxLevel = cfg.maxLevel;
    if (cfg.name) this.name = cfg.name;
    if (cfg.icon) this.icon = cfg.icon;
    this.recalculateStats();
  }

  public recalculateStats(): void {
    this.damage = this.baseDamage + (this.level - 1) * this.damagePerLevel;
  }

  public abstract update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void
  ): void;

  protected getMeleeAttackAngle(playerPos: Vector3, enemies: Enemy[]): number {
    let closestDistance = Infinity;
    let angle = 0;
    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      const dx = enemy.position.x - playerPos.x;
      const dz = enemy.position.z - playerPos.z;
      const distance = dx * dx + dz * dz;
      if (distance < closestDistance) {
        closestDistance = distance;
        angle = Math.atan2(-dz, dx);
      }
    }
    return angle;
  }

  protected emitMeleeAttack(weaponId: MeleeWeaponId, position: Vector3, radius: number, angle: number): void {
    this.onMeleeAttack?.({ weaponId, x: position.x, y: position.y, z: position.z, radius, angle });
  }

  public abstract upgrade(): void;
  public abstract getNextUpgradeDescription(): string;

  public getInfo(): WeaponInfo {
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
    this.projectileCount = baseCount + [4, 8, 12, 16, 20].filter(lvl => this.level >= lvl).length;
    this.pierce = basePierce + [3, 6, 9, 13, 17].filter(lvl => this.level >= lvl).length;
    const cdSteps = [2, 5, 7, 10, 14, 18].filter(lvl => this.level >= lvl).length;
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

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${this.damagePerLevel} к урону`];
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 стрела (всего ${this.projectileCount + 1})`);
    if ([3, 6, 9, 13, 17].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([2, 5, 7, 10, 14, 18].includes(nextLvl)) {
      const nextCd = Math.max(0.40, Number((this.cooldown * 0.93).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-7% перезарядки');
    }
    return perks.join(', ');
  }
}

// Backwards compatibility alias
export const HeavyColtWeapon = BowWeapon;
export type HeavyColtWeapon = BowWeapon;

/**
 * Kukri Knife (Нож Кукри)
 * Rapid throws of spinning curved Gurkha kukri blades
 */
export class KukriWeapon extends Weapon {
  private burstCount: number = 2;
  private projectileSpeed: number = 24;
  private pierce: number = 1;

  constructor() {
    super('kukri', 'Нож Кукри', '🔪', 0.65, 12, 3);
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('kukri');
    const baseCount = cfg?.count ?? 2;
    const basePierce = cfg?.pierce ?? 1;
    this.projectileSpeed = cfg?.speed ?? 24;
    this.burstCount = baseCount + [2, 4, 6, 8, 10, 12, 14, 16, 18, 20].filter(lvl => this.level >= lvl).length;
    this.pierce = basePierce + [10, 20].filter(lvl => this.level >= lvl).length;
    const cdSteps = [3, 5, 7, 9, 11, 13, 15, 17, 19].filter(lvl => this.level >= lvl).length;
    this.cooldown = Math.max(0.25, Number((this.baseCooldown * Math.pow(0.94, cdSteps)).toFixed(3)));
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

      const sorted = findClosestEnemies(enemies, playerPos, this.burstCount);
      if (sorted.length === 0) return;

      for (let i = 0; i < this.burstCount; i++) {
        setTimeout(() => {
          if (sorted.length === 0) return;
          const target = sorted[i % sorted.length];
          if (!target || !target.isAlive) return;

          const spawnPos = playerPos.clone().add(new Vector3(0, 0.7, 0));
          const targetPos = target.position.clone().add(new Vector3(0, 0.4, 0));
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
        }, i * 110);
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${this.damagePerLevel} к урону`];
    if ([2, 4, 6, 8, 10, 12, 14, 16, 18, 20].includes(nextLvl)) perks.push(`+1 нож в серии (всего ${this.burstCount + 1})`);
    if ([10, 20].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([3, 5, 7, 9, 11, 13, 15, 17, 19].includes(nextLvl)) {
      const nextCd = Math.max(0.25, Number((this.cooldown * 0.94).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-6% перезарядки');
    }
    return perks.join(', ');
  }
}

// Backwards compatibility alias
export const DualRevolversWeapon = KukriWeapon;
export type DualRevolversWeapon = KukriWeapon;

/**
 * Reaper's Scythe (Коса Жнеца) - previously Orbiting Barrier
 * Rotating scythes circle the hero, cutting through monsters to deal base damage and apply stacking bleed DoT.
 */
export class OrbitingBarrierWeapon extends Weapon {
  private orbCount: number = 2;
  private orbs: Projectile[] = [];
  private orbitRadius: number = 2.5;
  private orbitSpeed: number = 3.8;
  private bleedDps: number = 8;

  constructor() {
    super('orbiting_barrier', 'Коса Жнеца', '🌙', 0, 4, 1);
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('orbiting_barrier');
    const baseBleed = cfg?.bleedDps ?? 8;
    const baseRadius = cfg?.orbitRadius ?? 2.5;
    const baseSpeed = cfg?.orbitSpeed ?? 3.8;
    const baseCount = cfg?.count ?? 2;
    this.bleedDps = baseBleed + (this.level - 1) * 2;
    this.orbitRadius = Number((baseRadius + (this.level - 1) * 0.20).toFixed(2));
    this.orbitSpeed = Number((baseSpeed + (this.level - 1) * 0.08).toFixed(2));
    const extra = [3, 6, 9, 12, 15, 18, 20].filter(lvl => this.level >= lvl).length;
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
          radius: Number((0.32 + (this.level - 1) * 0.012).toFixed(3)),
          color: 0xef4444,
          isOrbiting: true,
          orbitRadius: this.orbitRadius,
          orbitSpeed: this.orbitSpeed
        });
        orb.orbitAngle = angle;
        this.orbs.push(orb);
        spawnProjectile(orb);
      }
    }

    this.orbs.forEach((orb) => {
      orb.orbitRadius = this.orbitRadius;
      orb.orbitSpeed = this.orbitSpeed;
      orb.damage = this.damage;
      orb.bleedDps = this.bleedDps;
      orb.radius = Number((0.32 + (this.level - 1) * 0.012).toFixed(3));
      orb.mesh.scale.setScalar(orb.radius * 3.4);
    });
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${this.damagePerLevel} к прямому урону`, '+2 к урону кровотечения/сек', '+0.20м радиус орбиты'];
    if ([3, 6, 9, 12, 15, 18, 20].includes(nextLvl)) perks.push(`+1 коса (всего ${this.orbCount + 1})`);
    return perks.join(', ');
  }
}

/**
 * Fire Ring (Огненное Кольцо) - previously Holy Aura
 * Fiery ring of blazing animated flames surrounding the hero, searing all monsters within its perimeter.
 */
export class HolyAuraWeapon extends Weapon {
  private static vfxOpacity: number = 1.0;
  private static instances = new Set<HolyAuraWeapon>();

  public static setVfxOpacity(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    HolyAuraWeapon.vfxOpacity = clamped;
    for (const inst of HolyAuraWeapon.instances) {
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
    super('holy_aura', 'Огненное Кольцо', '🔥', 0.50, 16, 4);
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('holy_aura');
    const baseRad = cfg?.explosionRadius ?? 3.5;
    this.radius = Number((baseRad + (this.level - 1) * 0.20).toFixed(2));
    this.cooldown = Math.max(0.22, Number((this.baseCooldown * Math.pow(0.96, this.level - 1)).toFixed(3)));
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
      opacity: 0.95 * HolyAuraWeapon.vfxOpacity,
      blending: AdditiveBlending,
      depthWrite: false,
      visible: HolyAuraWeapon.vfxOpacity > 0.005
    });
    this.auraMesh = new Mesh(geom, this.auraMat);
    this.auraMesh.rotation.x = -Math.PI / 2;
    this.auraMesh.position.set(playerPos.x, 0.08, playerPos.z);
    scene.add(this.auraMesh);
    HolyAuraWeapon.instances.add(this);
  }

  public destroy(scene: Scene) {
    HolyAuraWeapon.instances.delete(this);
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

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const perks: string[] = ['+0.20м радиус кольца', `+${this.damagePerLevel} урона`];
    const nextCd = Math.max(0.22, Number((this.cooldown * 0.96).toFixed(3)));
    if (nextCd < this.cooldown) perks.push('-4% перезарядки');
    return perks.join(', ');
  }
}

/**
 * Cleaving Katana (Рассекающий Клинок) - Hero 3 Swordsman starting weapon
 * Sweeping crescent blade cuts down surrounding enemies with high impact and triggers the attack animation.
 */
export class KatanaSlashWeapon extends Weapon {
  private slashRadius: number = 3.8;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('katana_slash', 'Рассекающий Клинок', '🗡️', 0.60, 25, 6);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('katana_slash');
    const baseRad = cfg?.explosionRadius ?? 3.8;
    this.slashRadius = Number((baseRad + (this.level - 1) * 0.14).toFixed(2));
    this.cooldown = Math.max(0.30, Number((this.baseCooldown * Math.pow(0.96, this.level - 1)).toFixed(3)));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const attackAngle = this.getMeleeAttackAngle(playerPos, enemies);
      const radSq = this.slashRadius * this.slashRadius;
      let hitCount = 0;

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
          hitCount++;
        }
      }

      // If enemies are nearby or hit, trigger the swing animation and sound
      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(playerPos) < 45);
      if (hitCount > 0 || nearby) {
        this.timer = 0;
        this.emitMeleeAttack('katana_slash', playerPos, this.slashRadius, attackAngle);
        if (this.onTriggerAttack) {
          this.onTriggerAttack();
        }
        SoundManager.playSlash();
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const perks: string[] = ['+0.14м радиус взмаха', `+${this.damagePerLevel} урона`];
    const nextCd = Math.max(0.30, Number((this.cooldown * 0.96).toFixed(3)));
    if (nextCd < this.cooldown) perks.push('-4% перезарядки');
    return perks.join(', ');
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
    super('whirlwind_slash', 'Багровый Вихрь', '🌪️', 0.42, 16, 4);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('whirlwind_slash');
    const baseRad = cfg?.explosionRadius ?? 3.6;
    this.slashRadius = Number((baseRad + (this.level - 1) * 0.12).toFixed(2));
    this.cooldown = Math.max(0.20, Number((this.baseCooldown * Math.pow(0.96, this.level - 1)).toFixed(3)));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const attackAngle = this.getMeleeAttackAngle(playerPos, enemies);
      const radSq = this.slashRadius * this.slashRadius;
      let hitCount = 0;

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
          hitCount++;
        }
      }

      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(playerPos) < 40);
      if (hitCount > 0 || nearby) {
        this.timer = 0;
        this.emitMeleeAttack('whirlwind_slash', playerPos, this.slashRadius, attackAngle);
        if (this.onTriggerAttack) {
          this.onTriggerAttack();
        }
        SoundManager.playSlash();
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const perks: string[] = ['+0.12м радиус вихря', `+${this.damagePerLevel} урона`];
    const nextCd = Math.max(0.20, Number((this.cooldown * 0.96).toFixed(3)));
    if (nextCd < this.cooldown) perks.push('-4% перезарядки');
    return perks.join(', ');
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
    super('greatsword', 'Двуручный Меч', '⚔️', 0.70, 32, 7);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('greatsword');
    const baseRad = cfg?.explosionRadius ?? 4.2;
    this.slashRadius = Number((baseRad + (this.level - 1) * 0.15).toFixed(2));
    this.cooldown = Math.max(0.35, Number((this.baseCooldown * Math.pow(0.96, this.level - 1)).toFixed(3)));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const attackAngle = this.getMeleeAttackAngle(playerPos, enemies);
      const radSq = this.slashRadius * this.slashRadius;
      let hitCount = 0;

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
          hitCount++;
        }
      }

      const nearby = enemies.some(e => e.isAlive && e.position.distanceToSquared(playerPos) < 48);
      if (hitCount > 0 || nearby) {
        this.timer = 0;
        this.emitMeleeAttack('greatsword', playerPos, this.slashRadius, attackAngle);
        if (this.onTriggerAttack) {
          this.onTriggerAttack();
        }
        SoundManager.playSlash();
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const perks: string[] = ['+0.15м радиус взмаха', `+${this.damagePerLevel} урона`];
    const nextCd = Math.max(0.35, Number((this.cooldown * 0.96).toFixed(3)));
    if (nextCd < this.cooldown) perks.push('-4% перезарядки');
    return perks.join(', ');
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
    super('flail', 'Боевой Цеп', '⛓️', 0.52, 20, 5);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('flail');
    const baseRad = cfg?.explosionRadius ?? 3.9;
    const baseKb = cfg?.knockback ?? 0.35;
    this.flailRadius = Number((baseRad + (this.level - 1) * 0.14).toFixed(2));
    this.knockback = Number((baseKb + (this.level - 1) * 0.02).toFixed(2));
    this.cooldown = Math.max(0.25, Number((this.baseCooldown * Math.pow(0.96, this.level - 1)).toFixed(3)));
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const attackAngle = this.getMeleeAttackAngle(playerPos, enemies);
      const radSq = this.flailRadius * this.flailRadius;
      let hitCount = 0;

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
      if (hitCount > 0 || nearby) {
        this.timer = 0;
        this.emitMeleeAttack('flail', playerPos, this.flailRadius, attackAngle);
        if (this.onTriggerAttack) {
          this.onTriggerAttack();
        }
        SoundManager.playSlash();
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const perks: string[] = ['+0.14м радиус цепа', `+${this.damagePerLevel} урона`, 'сильнее отброс'];
    const nextCd = Math.max(0.25, Number((this.cooldown * 0.96).toFixed(3)));
    if (nextCd < this.cooldown) perks.push('-4% перезарядки');
    return perks.join(', ');
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
    super('astral_staff', 'Звёздный Посох', '🔮', 0.65, 22, 5);
    this.onTriggerAttack = onTriggerAttack;
    this.recalculateStats();
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const cfg = BalanceManager.getWeaponConfig('astral_staff');
    this.projectileSpeed = cfg?.speed ?? 16.0;
    const baseCount = cfg?.count ?? 1;
    const basePierce = cfg?.pierce ?? 2;
    this.projectileCount = baseCount + [3, 6, 9, 12, 15, 18, 20].filter(lvl => this.level >= lvl).length;
    this.pierceCount = basePierce + [4, 8, 12, 16, 20].filter(lvl => this.level >= lvl).length;
    const cdSteps = [2, 5, 7, 10, 14, 17].filter(lvl => this.level >= lvl).length;
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

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${this.damagePerLevel} к урону`];
    if ([3, 6, 9, 12, 15, 18, 20].includes(nextLvl)) perks.push(`+1 снаряд веером (всего ${this.projectileCount + 1})`);
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierceCount + 1})`);
    if ([2, 5, 7, 10, 14, 17].includes(nextLvl)) {
      const nextCd = Math.max(0.30, Number((this.cooldown * 0.94).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-6% перезарядки');
    }
    return perks.join(', ');
  }
}

/**
 * Boomerang Chakram (Вихревой Чакрам) - Hero 5 Chakram Warrior starting weapon
 * Throws a razor-sharp spinning golden chakram ring along an arc that slices through foes and returns like a boomerang.
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
    this.chakramCount = baseCount + [4, 8, 12, 16, 20].filter(lvl => this.level >= lvl).length;
    const spdSteps = [2, 5, 10, 15].filter(lvl => this.level >= lvl).length;
    this.flightSpeed = Number((baseSpd + spdSteps * 1.2).toFixed(2));
    const cdSteps = [3, 6, 9, 13, 17].filter(lvl => this.level >= lvl).length;
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

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${this.damagePerLevel} к урону`];
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 возвращающийся чакрам (всего ${this.chakramCount + 1})`);
    if ([3, 6, 9, 13, 17].includes(nextLvl)) {
      const nextCd = Math.max(0.30, Number((this.cooldown * 0.94).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-6% перезарядки');
    }
    if ([2, 5, 10, 15].includes(nextLvl)) perks.push('+1.2 м/с скорость полёта');
    return perks.join(', ');
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
    const countSteps = [4, 8, 12, 16, 20].filter(lvl => this.level >= lvl).length;
    this.strikeCount = baseCount + countSteps;
    const cdSteps = [3, 6, 9, 13, 17].filter(lvl => this.level >= lvl).length;
    this.cooldown = Math.max(0.40, Number((this.baseCooldown * Math.pow(0.92, cdSteps)).toFixed(3)));
    const radSteps = [5, 10, 15].filter(lvl => this.level >= lvl).length;
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

      // Pick targets (if fewer enemies than strikes, re-target existing enemies)
      const strikeTargets: { x: number; z: number }[] = [];
      for (let i = 0; i < this.strikeCount; i++) {
        const targetCandidate = candidates[i % candidates.length];
        strikeTargets.push({
          x: targetCandidate.position.x,
          z: targetCandidate.position.z
        });
      }

      // Stagger each thunderbolt slightly for rapid cracking barrage
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

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${this.damagePerLevel} к урону`];
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 разряд молнии (всего ${this.strikeCount + 1})`);
    if ([3, 6, 9, 13, 17].includes(nextLvl)) {
      const nextCd = Math.max(0.40, Number((this.cooldown * 0.92).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-8% перезарядки');
    }
    if ([5, 10, 15].includes(nextLvl)) perks.push(`+0.30м радиус взрыва (всего ${(this.strikeRadius + 0.30).toFixed(2)}м)`);
    return perks.join(', ');
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
    const countSteps = [4, 8, 12, 16, 20].filter(lvl => this.level >= lvl).length;
    this.spikeCount = baseCount + countSteps;
    const cdSteps = [3, 6, 9, 13, 17].filter(lvl => this.level >= lvl).length;
    this.cooldown = Math.max(0.35, Number((this.baseCooldown * Math.pow(0.93, cdSteps)).toFixed(3)));
    const radSteps = [5, 10, 15].filter(lvl => this.level >= lvl).length;
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

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${this.damagePerLevel} к урону`];
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 ледяной шип (всего ${this.spikeCount + 1})`);
    if ([3, 6, 9, 13, 17].includes(nextLvl)) {
      const nextCd = Math.max(0.35, Number((this.cooldown * 0.93).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-7% перезарядки');
    }
    if ([5, 10, 15].includes(nextLvl)) perks.push(`+0.25м радиус поражения (всего ${(this.spikeRadius + 0.25).toFixed(2)}м)`);
    return perks.join(', ');
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
    const countSteps = [4, 8, 12, 16, 20].filter(lvl => this.level >= lvl).length;
    this.fireballCount = baseCount + countSteps;
    const cdSteps = [3, 6, 9, 13, 17].filter(lvl => this.level >= lvl).length;
    this.cooldown = Math.max(0.40, Number((this.baseCooldown * Math.pow(0.92, cdSteps)).toFixed(3)));
    const radSteps = [5, 10, 15].filter(lvl => this.level >= lvl).length;
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

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${this.damagePerLevel} к урону`];
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 огненный шар (всего ${this.fireballCount + 1})`);
    if ([3, 6, 9, 13, 17].includes(nextLvl)) {
      const nextCd = Math.max(0.40, Number((this.cooldown * 0.92).toFixed(3)));
      if (nextCd < this.cooldown) perks.push('-8% перезарядки');
    }
    if ([5, 10, 15].includes(nextLvl)) perks.push(`+0.35м радиус взрыва (всего ${(this.explosionRadius + 0.35).toFixed(2)}м)`);
    return perks.join(', ');
  }
}

/**
 * Assault Rifle (Штурмовая Винтовка)
 * High-speed rapid-fire automatic rifle that shoots streams of bullets at enemies.
 */
export class AssaultRifleWeapon extends Weapon {
  private projectileSpeed: number = 32;
  private projectileCount: number = 1;
  private pierce: number = 1;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('assault_rifle', 'Штурмовая Винтовка', '🔫', 0.18, 18, 3);
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
    // Level scaling:
    // Extra bullets: at levels 5, 10, 15, 20 (+1 projectile)
    this.projectileCount = baseCount + [5, 10, 15, 20].filter(lvl => this.level >= lvl).length;
    // Extra pierce: at levels 4, 8, 12, 16 (+1 pierce)
    this.pierce = basePierce + [4, 8, 12, 16].filter(lvl => this.level >= lvl).length;
    // Fire rate speedup: at levels 2, 6, 9, 13, 17 (-5% cooldown each)
    const cdSteps = [2, 6, 9, 13, 17].filter(lvl => this.level >= lvl).length;
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

      const candidates = findClosestEnemies(enemies, playerPos, this.projectileCount, 26 * 26);
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

        // Slight spread if multiple bullets or recoil spray
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
          lifetime: 1.6,
          radius: 0.28,
          color: 0xffaa22
        });

        spawnProjectile(proj);
      }
      SoundManager.playMachineGunShoot();
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.recalculateStats();
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = [`+${this.damagePerLevel} к урону`];
    if ([5, 10, 15, 20].includes(nextLvl)) perks.push(`+1 пуля (всего ${this.projectileCount + 1})`);
    if ([4, 8, 12, 16].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([2, 6, 9, 13, 17].includes(nextLvl)) perks.push(`+5% скорострельности`);
    return perks.join(', ');
  }
}


