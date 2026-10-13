import { SimVec3 } from '../math/SimVector';
import {
  SimWeapon,
  SimProjectileData,
  SimPlayerRef,
  SimEnemyRef,
  findClosestSimEnemies
} from './SimWeaponBase';

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
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;
      this.timer = 0;

      const targets = findClosestSimEnemies(enemies, player.position, 1, 22 * 22);
      if (targets.length === 0) return;
      const target = targets[0];

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
    if ([3, 6, 9, 12].includes(this.level)) this.projectileCount++;
    if ([4, 8, 12].includes(this.level)) this.pierceCount++;
    if ([2, 5, 8, 10, 12].includes(this.level)) {
      this.cooldown = Math.max(0.30, Number((this.cooldown * 0.94).toFixed(3)));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+5 к урону'];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 снаряд веером (всего ${this.projectileCount + 1})`);
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+1 пробивание (всего ${this.pierceCount + 1})`);
    if ([2, 5, 8, 10, 12].includes(nextLvl)) perks.push('-6% перезарядки');
    return perks.join(', ');
  }
}

/**
 * Fire Ring (Огненное Кольцо)
 */
export class SimFireRingWeapon extends SimWeapon {
  private radius: number = 3.5;

  constructor() {
    super('fire_ring', 'Огненное Кольцо', '🔥', 0.50, 16);
  }

  public update(
    dt: number,
    player: SimPlayerRef,
    enemies: SimEnemyRef[],
    _spawnProjectile: (p: SimProjectileData) => void,
    onAreaDamage: (enemyId: string, damage: number, sourcePos: SimVec3, knockbackDist?: number) => void
  ) {
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
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
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    return `+0.20м радиус, +4 урона, -4% перезарядки`;
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
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const targets = findClosestSimEnemies(enemies, player.position, 1, 20 * 20);
      if (targets.length === 0) return;

      this.timer = 0;
      onTriggerAttack?.(0.44);

      const target = targets[0];
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
    if ([3, 6, 9, 12].includes(this.level)) {
      this.chakramCount++;
    }
    if ([2, 5, 8, 11].includes(this.level)) {
      this.cooldown = Math.max(0.30, Number((this.cooldown * 0.94).toFixed(3)));
    }
    if ([3, 6, 9, 12].includes(this.level)) {
      this.flightSpeed += 1.2;
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+4 к урону'];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 возвращающийся чакрам (всего ${this.chakramCount + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) perks.push('-6% перезарядки');
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push('+1.2 м/с скорость полёта');
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
    if (this.timer >= this.effectiveCooldown) {
      if (enemies.length === 0) return;

      const targets = findClosestSimEnemies(enemies, player.position, this.strikeCount, this.range * this.range);
      if (targets.length === 0) return;

      this.timer = 0;
      if (triggerAnim) triggerAnim(0.40);
      if (emitSound) emitSound('magic');

      for (let i = 0; i < this.strikeCount; i++) {
        const targetCandidate = targets[i % targets.length];
        const proj: SimProjectileData = {
          id: `sim_lightning_${Math.random().toString(36).substring(2, 9)}`,
          ownerId: player.id,
          position: targetCandidate.position.clone(),
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
    if ([3, 6, 9, 12].includes(this.level)) {
      this.strikeCount++;
    }
    if ([2, 5, 8, 11].includes(this.level)) {
      this.cooldown = Math.max(0.40, Number((this.cooldown * 0.92).toFixed(3)));
    }
    if ([4, 8, 12].includes(this.level)) {
      this.strikeRadius = Number((this.strikeRadius + 0.30).toFixed(2));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+8 к урону'];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 разряд молнии (всего ${this.strikeCount + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) perks.push('-8% перезарядки');
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+0.30м радиус взрыва (всего ${(this.strikeRadius + 0.30).toFixed(2)}м)`);
    return perks.join(', ');
  }
}

/**
 * Ice Spike (Ледяной Шип) simulation weapon
 */
export class SimIceSpikeWeapon extends SimWeapon {
  private spikeCount: number = 1;
  private spikeRadius: number = 2.0;
  private range: number = 18;

  constructor() {
    super('ice_spike', 'Ледяной Шип', '🧊', 1.10, 38);
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

      const targets = findClosestSimEnemies(enemies, player.position, this.spikeCount, this.range * this.range);
      if (targets.length === 0) return;

      this.timer = 0;
      if (triggerAnim) triggerAnim(0.38);
      if (emitSound) emitSound('magic');

      for (let i = 0; i < this.spikeCount; i++) {
        const targetCandidate = targets[i % targets.length];
        const proj: SimProjectileData = {
          id: `sim_icespike_${Math.random().toString(36).substring(2, 9)}`,
          ownerId: player.id,
          position: targetCandidate.position.clone(),
          direction: new SimVec3(0, 1, 0),
          speed: 0,
          damage: this.damage * player.damageMultiplier,
          pierce: 999,
          lifetime: 0.38,
          radius: this.spikeRadius,
          color: 0x38bdf8,
          isIceSpike: true
        };
        spawnProjectile(proj);
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage += 7;
    if ([3, 6, 9, 12].includes(this.level)) {
      this.spikeCount++;
    }
    if ([2, 5, 8, 11].includes(this.level)) {
      this.cooldown = Math.max(0.35, Number((this.cooldown * 0.93).toFixed(3)));
    }
    if ([4, 8, 12].includes(this.level)) {
      this.spikeRadius = Number((this.spikeRadius + 0.25).toFixed(2));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+7 к урону'];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 ледяной шип (всего ${this.spikeCount + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) perks.push('-7% перезарядки');
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+0.25м радиус поражения (всего ${(this.spikeRadius + 0.25).toFixed(2)}м)`);
    return perks.join(', ');
  }
}

/**
 * Fireball (Огненный Шар) simulation weapon
 */
export class SimFireballWeapon extends SimWeapon {
  private fireballCount: number = 1;
  private explosionRadius: number = 2.5;
  private range: number = 22;
  private fallSpeed: number = 28;

  constructor() {
    super('fireball', 'Огненный Шар', '☄️', 1.35, 55);
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

      const targets = findClosestSimEnemies(enemies, player.position, this.fireballCount, this.range * this.range);
      if (targets.length === 0) return;

      this.timer = 0;
      if (triggerAnim) triggerAnim(0.42);
      if (emitSound) emitSound('magic');

      for (let i = 0; i < this.fireballCount; i++) {
        const targetCandidate = targets[i % targets.length];
        const startHeight = 15.0;
        const offsetDist = 2.8;
        const startPos = new SimVec3(targetCandidate.position.x - offsetDist, startHeight, targetCandidate.position.z - offsetDist);
        const targetPos = new SimVec3(targetCandidate.position.x, 0, targetCandidate.position.z);
        const dir = targetPos.clone().sub(startPos).normalize();
        const dist = startPos.distanceTo(targetPos);
        const flightTime = dist / this.fallSpeed;

        const proj: SimProjectileData = {
          id: `sim_fireball_${Math.random().toString(36).substring(2, 9)}`,
          ownerId: player.id,
          position: startPos,
          direction: dir,
          speed: this.fallSpeed,
          damage: this.damage * player.damageMultiplier,
          pierce: 999,
          lifetime: flightTime + 0.35,
          radius: this.explosionRadius,
          color: 0xf97316,
          isFireball: true
        };
        spawnProjectile(proj);
      }
    }
  }

  public upgrade() {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.damage += 10;
    if ([3, 6, 9, 12].includes(this.level)) {
      this.fireballCount++;
    }
    if ([2, 5, 8, 11].includes(this.level)) {
      this.cooldown = Math.max(0.40, Number((this.cooldown * 0.92).toFixed(3)));
    }
    if ([4, 8, 12].includes(this.level)) {
      this.explosionRadius = Number((this.explosionRadius + 0.35).toFixed(2));
    }
  }

  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return 'Максимальный уровень (12)';
    const nextLvl = this.level + 1;
    const perks: string[] = ['+10 к урону'];
    if ([3, 6, 9, 12].includes(nextLvl)) perks.push(`+1 огненный шар (всего ${this.fireballCount + 1})`);
    if ([2, 5, 8, 11].includes(nextLvl)) perks.push('-8% перезарядки');
    if ([4, 8, 12].includes(nextLvl)) perks.push(`+0.35м радиус взрыва (всего ${(this.explosionRadius + 0.35).toFixed(2)}м)`);
    return perks.join(', ');
  }
}
