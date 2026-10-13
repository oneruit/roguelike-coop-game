import { SimVec3 } from '../math/SimVector';

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
  isIceSpike?: boolean;
  isFireball?: boolean;
  bleedDps?: number;
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

export function findClosestSimEnemies(
  enemies: SimEnemyRef[],
  pos: SimVec3,
  count: number,
  maxDistSq: number = Infinity
): SimEnemyRef[] {
  if (count <= 0 || enemies.length === 0) return [];
  if (count === 1) {
    let closest: SimEnemyRef | null = null;
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

  const result: SimEnemyRef[] = [];
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

export abstract class SimWeapon {
  public id: string;
  public name: string;
  public icon: string;
  public iconImage: string;
  public level: number = 1;
  public maxLevel: number = 12;
  public cooldown: number;
  public timer: number = 0;
  public damage: number;
  public cooldownMultiplier: number = 1.0;

  public get effectiveCooldown(): number {
    return Math.max(0.1, this.cooldown * this.cooldownMultiplier);
  }

  constructor(id: string, name: string, icon: string, cooldown: number, damage: number, iconImage?: string) {
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.iconImage = iconImage || `/textures/weapons/weapon_${id}.png`;
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
