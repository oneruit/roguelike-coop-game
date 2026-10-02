import * as THREE from 'three';
import { Projectile } from './Projectile';
import { SoundManager } from '../core/SoundManager';
import { Enemy } from '../entities/Enemy';

export interface WeaponInfo {
  id: string;
  name: string;
  icon: string;
  level: number;
  maxLevel: number;
  description: string;
}

export abstract class Weapon {
  public id: string;
  public name: string;
  public icon: string;
  public level: number = 1;
  public maxLevel: number = 20;
  protected cooldown: number;
  protected timer: number = 0;
  protected damage: number;

  constructor(id: string, name: string, icon: string, cooldown: number, damage: number) {
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.cooldown = cooldown;
    this.damage = damage;
  }

  public abstract update(
    dt: number,
    playerPos: THREE.Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: THREE.Vector3) => void
  ): void;

  public abstract upgrade(): void;
  public abstract getNextUpgradeDescription(): string;

  public getInfo(): WeaponInfo {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
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

  constructor() {
    super('bow', 'Охотничий Лук', '🏹', 1.0, 24);
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;
      this.timer = 0;

      const candidates = enemies
        .filter(e => e.isAlive)
        .map(e => ({ enemy: e, distSq: e.position.distanceToSquared(playerPos) }))
        .sort((a, b) => a.distSq - b.distSq);

      const targets = candidates.slice(0, this.projectileCount).map(c => c.enemy);
      targets.forEach((target, index) => {
        setTimeout(() => {
          if (!target || !target.isAlive) return;
          const dir = new THREE.Vector3().subVectors(target.position, playerPos);
          dir.y = 0;
          if (dir.lengthSq() > 0) dir.normalize();

          const proj = new Projectile({
            position: playerPos.clone().add(new THREE.Vector3(0, 0.7, 0)),
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
        }, index * 90);
      });
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage += 8;
    if ([4, 8, 12, 16, 20].includes(this.level)) {
      this.projectileCount++;
    }
    if ([3, 6, 9, 13, 17].includes(this.level)) {
      this.pierce++;
    }
    if ([2, 5, 7, 10, 14, 18].includes(this.level)) {
      this.cooldown = Math.max(0.4, Number((this.cooldown * 0.93).toFixed(3)));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+8 к урону'];
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 стрела (всего ${this.projectileCount + 1})`);
    if ([3, 6, 9, 13, 17].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([2, 5, 7, 10, 14, 18].includes(nextLvl)) perks.push('-7% перезарядки');
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
    super('kukri', 'Нож Кукри', '🔪', 0.65, 14);
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;
      this.timer = 0;

      const candidates = enemies
        .filter(e => e.isAlive)
        .map(e => ({ enemy: e, distSq: e.position.distanceToSquared(playerPos) }))
        .sort((a, b) => a.distSq - b.distSq);

      if (candidates.length === 0) return;
      const sorted = candidates.map(c => c.enemy);

      for (let i = 0; i < this.burstCount; i++) {
        setTimeout(() => {
          if (sorted.length === 0) return;
          const target = sorted[i % sorted.length];
          if (!target || !target.isAlive) return;

          const dir = new THREE.Vector3().subVectors(target.position, playerPos);
          dir.y = 0;
          if (dir.lengthSq() > 0) {
            dir.normalize();
            // slight spread angle for dual throwing
            const spreadAngle = (i % 2 === 0 ? 0.08 : -0.08);
            dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
          }

          const proj = new Projectile({
            position: playerPos.clone().add(new THREE.Vector3(0, 0.7, 0)),
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
    this.damage += 4;
    if ([2, 4, 6, 8, 10, 12, 14, 16, 18, 20].includes(this.level)) {
      this.burstCount++;
    }
    if ([10, 20].includes(this.level)) {
      this.pierce++;
    }
    if ([3, 5, 7, 9, 11, 13, 15, 17, 19].includes(this.level)) {
      this.cooldown = Math.max(0.25, Number((this.cooldown * 0.94).toFixed(3)));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+4 к урону'];
    if ([2, 4, 6, 8, 10, 12, 14, 16, 18, 20].includes(nextLvl)) perks.push(`+1 нож в серии (всего ${this.burstCount + 1})`);
    if ([10, 20].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierce + 1})`);
    if ([3, 5, 7, 9, 11, 13, 15, 17, 19].includes(nextLvl)) perks.push('-6% перезарядки');
    return perks.join(', ');
  }
}

// Backwards compatibility alias
export const DualRevolversWeapon = KukriWeapon;
export type DualRevolversWeapon = KukriWeapon;

/**
 * Orbiting Shields / Holy Horseshoe Barrier
 */
export class OrbitingBarrierWeapon extends Weapon {
  private orbCount: number = 2;
  private orbs: Projectile[] = [];
  private orbitRadius: number = 2.5;
  private orbitSpeed: number = 3.8;

  constructor() {
    super('orbiting_barrier', 'Священные Подковы', '🧲', 0, 12);
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
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
          direction: new THREE.Vector3(1, 0, 0),
          speed: 0,
          damage: this.damage,
          pierce: 99999,
          lifetime: 999999,
          radius: Number((0.32 + (this.level - 1) * 0.012).toFixed(3)),
          color: 0xfbbf24,
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
      orb.radius = Number((0.32 + (this.level - 1) * 0.012).toFixed(3));
      orb.mesh.scale.setScalar(orb.radius);
      if (Math.abs(orb.orbitSpeed) > 0) {
        orb.update(dt, playerPos);
      }
    });
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage += 4;
    this.orbitRadius = Number((this.orbitRadius + 0.35).toFixed(2));
    this.orbitSpeed = Number((this.orbitSpeed + 0.12).toFixed(2));
    if ([3, 6, 9, 12, 15, 18, 20].includes(this.level)) {
      this.orbCount++;
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+4 к урону', '+0.35м дальность орбиты'];
    if ([3, 6, 9, 12, 15, 18, 20].includes(nextLvl)) perks.push(`+1 подкова (всего ${this.orbCount + 1})`);
    return perks.join(', ');
  }
}

/**
 * Holy Aura / Dynamite Aura
 */
export class HolyAuraWeapon extends Weapon {
  private radius: number = 3.5;
  private auraMesh: THREE.Mesh | null = null;

  constructor() {
    super('holy_aura', 'Огненный Периметр', '🔥', 0.55, 10);
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: THREE.Vector3) => void
  ) {
    if (this.auraMesh) {
      this.auraMesh.position.set(playerPos.x, 0.08, playerPos.z);
      this.auraMesh.rotation.z += dt * 0.8;
    }

    this.timer += dt;
    if (this.timer >= this.cooldown) {
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

  public initVisual(scene: THREE.Scene, playerPos: THREE.Vector3) {
    const geom = new THREE.RingGeometry(this.radius * 0.85, this.radius, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    this.auraMesh = new THREE.Mesh(geom, mat);
    this.auraMesh.rotation.x = -Math.PI / 2;
    this.auraMesh.position.set(playerPos.x, 0.08, playerPos.z);
    scene.add(this.auraMesh);
  }

  public destroy(scene: THREE.Scene) {
    if (this.auraMesh) {
      scene.remove(this.auraMesh);
      this.auraMesh.geometry.dispose();
      (this.auraMesh.material as THREE.Material).dispose();
      this.auraMesh = null;
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.radius = Number((this.radius + 0.35).toFixed(2));
    this.damage += 4;
    this.cooldown = Math.max(0.22, Number((this.cooldown * 0.96).toFixed(3)));
    if (this.auraMesh) {
      this.auraMesh.geometry.dispose();
      this.auraMesh.geometry = new THREE.RingGeometry(this.radius * 0.85, this.radius, 32);
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    return `+0.35м радиус, +4 урона, -4% перезарядки`;
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
    super('katana_slash', 'Рассекающий Клинок', '🗡️', 0.72, 36);
    this.onTriggerAttack = onTriggerAttack;
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: THREE.Vector3) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;

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
    this.slashRadius = Number((this.slashRadius + 0.25).toFixed(2));
    this.damage += 12;
    this.cooldown = Math.max(0.30, Number((this.cooldown * 0.96).toFixed(3)));
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    return `+0.25м радиус взмаха, +12 урона, -4% перезарядки`;
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
    super('whirlwind_slash', 'Багровый Вихрь', '🌪️', 0.48, 30);
    this.onTriggerAttack = onTriggerAttack;
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: THREE.Vector3) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;

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
    this.slashRadius = Number((this.slashRadius + 0.22).toFixed(2));
    this.damage += 10;
    this.cooldown = Math.max(0.20, Number((this.cooldown * 0.96).toFixed(3)));
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    return `+0.22м радиус вихря, +10 урона, -4% перезарядки`;
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
    super('greatsword', 'Двуручный Меч', '⚔️', 0.68, 48);
    this.onTriggerAttack = onTriggerAttack;
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: THREE.Vector3) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;

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
    this.slashRadius = Number((this.slashRadius + 0.28).toFixed(2));
    this.damage += 16;
    this.cooldown = Math.max(0.28, Number((this.cooldown * 0.96).toFixed(3)));
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    return `+0.28м радиус взмаха, +16 урона, -4% перезарядки`;
  }
}

/**
 * Steel Flail (Боевой Цеп) - Hero 3 Brigitta starting weapon
 * Whirls a heavy barbed flail in sweeping arcs, crushing foes with staggering impact and medium-wide sweep.
 */
export class FlailWeapon extends Weapon {
  private flailRadius: number = 3.9;
  private knockback: number = 0.3;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('flail', 'Боевой Цеп', '⛓️', 0.52, 42);
    this.onTriggerAttack = onTriggerAttack;
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: THREE.Vector3) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;

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
    this.flailRadius = Number((this.flailRadius + 0.25).toFixed(2));
    this.damage += 14;
    this.knockback = Number((this.knockback + 0.02).toFixed(2));
    this.cooldown = Math.max(0.22, Number((this.cooldown * 0.96).toFixed(3)));
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    return `+0.25м радиус цепа, +14 урона, сильнее отброс, -4% перезарядки`;
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
    super('astral_staff', 'Звёздный Посох', '🔮', 0.65, 34);
    this.onTriggerAttack = onTriggerAttack;
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;

      const candidates = enemies
        .filter(e => e.isAlive)
        .map(e => ({ enemy: e, distSq: e.position.distanceToSquared(playerPos) }))
        .sort((a, b) => a.distSq - b.distSq);

      if (candidates.length === 0) return;
      // Only shoot if nearest enemy is within 22 meters
      if (candidates[0].distSq > 22 * 22) return;

      this.timer = 0;
      if (this.onTriggerAttack) {
        this.onTriggerAttack();
      }

      const baseTarget = candidates[0].enemy;
      const baseDir = new THREE.Vector3().subVectors(baseTarget.position, playerPos);
      baseDir.y = 0;
      if (baseDir.lengthSq() === 0) baseDir.set(1, 0, 0);
      baseDir.normalize();

      const spreadStep = 0.14; // radians
      const startAngle = -((this.projectileCount - 1) / 2) * spreadStep;

      for (let i = 0; i < this.projectileCount; i++) {
        const angle = startAngle + i * spreadStep;
        const dir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

        const proj = new Projectile({
          position: playerPos.clone().add(new THREE.Vector3(0, 0.8, 0)),
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
    this.damage += 9;
    if ([3, 6, 9, 12, 15, 18, 20].includes(this.level)) {
      this.projectileCount++;
    }
    if ([4, 8, 12, 16, 20].includes(this.level)) {
      this.pierceCount++;
    }
    if ([2, 5, 7, 10, 14, 17].includes(this.level)) {
      this.cooldown = Math.max(0.30, Number((this.cooldown * 0.94).toFixed(3)));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (20)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+9 к урону'];
    if ([3, 6, 9, 12, 15, 18, 20].includes(nextLvl)) perks.push(`+1 снаряд веером (всего ${this.projectileCount + 1})`);
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierceCount + 1})`);
    if ([2, 5, 7, 10, 14, 17].includes(nextLvl)) perks.push('-6% перезарядки');
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
    super('chakram', 'Танцующий Чакрам', '🪃', 0.68, 36);
    this.onTriggerAttack = onTriggerAttack;
  }

  public setAttackCallback(cb: () => void) {
    this.onTriggerAttack = cb;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      if (enemies.length === 0) return;

      const candidates = enemies
        .filter(e => e.isAlive)
        .map(e => ({ enemy: e, distSq: e.position.distanceToSquared(playerPos) }))
        .sort((a, b) => a.distSq - b.distSq);

      if (candidates.length === 0) return;
      if (candidates[0].distSq > 20 * 20) return;

      this.timer = 0;
      if (this.onTriggerAttack) {
        this.onTriggerAttack();
      }

      const target = candidates[0].enemy;
      const baseDir = new THREE.Vector3().subVectors(target.position, playerPos);
      baseDir.y = 0;
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
        const throwDir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);

        const proj = new Projectile({
          position: playerPos.clone().add(new THREE.Vector3(0, 0.6, 0)),
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
    this.damage += 8;
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
    const perks: string[] = ['+8 к урону'];
    if ([4, 8, 12, 16, 20].includes(nextLvl)) perks.push(`+1 возвращающийся чакрам (всего ${this.chakramCount + 1})`);
    if ([3, 6, 9, 13, 17].includes(nextLvl)) perks.push('-6% перезарядки');
    if ([2, 5, 10, 15].includes(nextLvl)) perks.push('+1.2 м/с скорость полёта');
    return perks.join(', ');
  }
}



