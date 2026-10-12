import { Vector3 } from 'three';
import { Projectile } from './Projectile';
import { Enemy } from '../entities/Enemy';
import { TextureManager } from '../core/TextureManager';
import { BalanceManager } from '../balance/BalanceManager';
import { WeaponBalanceConfig } from '../balance/BalanceTypes';
import type { MeleeAttackInfo, MeleeWeaponId } from '../shared/types';
import {
  type WeaponGrade,
  WEAPON_GRADES
} from './WeaponGrades';

export interface WeaponInfo {
  id: string;
  name: string;
  icon: string;
  iconImage?: string;
  level: number;
  maxLevel: number;
  upgradeHistory?: WeaponGrade[];
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
  public maxLevel: number = 12;
  public awakenedGrade: number = 0;
  public gradeStatMultiplier: number = 1.0;
  public bonusDamage: number = 0;
  public cooldownBonus: number = 0;
  public upgradeHistory: WeaponGrade[] = [];
  public cooldownMultiplier: number = 1.0;
  public cooldown: number;
  public baseCooldown: number;
  protected timer: number = 0;
  public damage: number;
  public baseDamage: number;
  public damagePerLevel: number = 5;
  public damageDealt: number = 0;
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
    this.maxLevel = cfg.maxLevel || 12;
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

  public applyGradeUpgrade(grade: WeaponGrade = 'common'): void {
    const cfg = WEAPON_GRADES[grade];
    this.upgradeHistory.push(grade);
    const extraDamage = Math.round(this.damagePerLevel * (cfg.damageMultiplierBonus - 1.0) * this.gradeStatMultiplier);
    this.bonusDamage += extraDamage;
    this.cooldownBonus = Math.min(0.60, this.cooldownBonus + cfg.cooldownReductionBonus);
    if (cfg.cooldownReductionBonus > 0) {
      this.cooldown = Math.max(0.08, Number((this.cooldown * (1 - cfg.cooldownReductionBonus)).toFixed(3)));
    }
  }

  public awakenGrade(): void {
    this.awakenedGrade++;
    this.gradeStatMultiplier = this.awakenedGrade === 1 ? 2.0 : this.awakenedGrade >= 2 ? 3.0 : 1.0;
    this.level = 1;
    this.bonusDamage = 0;
    this.cooldownBonus = 0;
    this.upgradeHistory = [];
    this.recalculateStats();
  }

  public getGradePrefix(): string {
    if (this.awakenedGrade >= 2) return '[ГРЕЙД III • x3] ';
    if (this.awakenedGrade === 1) return '[ГРЕЙД II • x2] ';
    return '';
  }

  public recalculateStats(): void {
    const lvlGain = (this.level - 1) * this.damagePerLevel * this.gradeStatMultiplier;
    this.damage = Math.round(this.baseDamage + lvlGain + this.bonusDamage);
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

  public abstract upgrade(grade?: WeaponGrade): void;
  public abstract getNextUpgradeDescription(grade?: WeaponGrade): string;

  public getInfo(): WeaponInfo {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      iconImage: this.iconImage,
      level: this.level,
      maxLevel: this.maxLevel,
      upgradeHistory: [...this.upgradeHistory],
      description: this.getNextUpgradeDescription()
    };
  }
}
