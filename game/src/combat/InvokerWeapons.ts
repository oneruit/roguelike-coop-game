import {
  AdditiveBlending,
  Mesh,
  MeshBasicMaterial,
  type Scene,
  SphereGeometry,
  Vector3
} from "three";
import type { Enemy } from "../entities/Enemy";
import type { Projectile } from "./Projectile";
import { Weapon, findClosestEnemies } from "./Weapon";
import { type WeaponGrade, WEAPON_GRADES } from "./WeaponGrades";
import { BalanceManager } from "../balance/BalanceManager";
import { SoundManager } from "../core/SoundManager";
import {
  InvokerSpellRuntime,
  type SpellContext,
} from "../shared/InvokerSpellRuntime";
import {
  INVOKER_SPELL_IDS,
  INVOKER_SPELLS,
  INVOKE_BASE_DAMAGE,
  INVOKE_DAMAGE_PER_LEVEL,
  INVOKE_COOLDOWN_FACTOR,
  invokerWeaponId,
  getInvokerSphereScaling,
  type InvokerSpellId,
  type InvokerSpellCast,
  type SpellControl,
} from "../shared/InvokerSpells";

/** Invoke powers random casts and scales dynamically with Quas, Wex, and Exort spheres. */
export class InvokerWeapon extends Weapon {
  public onSpellCast?: (cast: InvokerSpellCast) => void;
  public onSpellControl?: (enemy: Enemy, control: SpellControl) => void;
  public onSpellBuff?: (
    spell: "ghost_walk" | "alacrity",
    level: number,
  ) => void;
  protected runtime = new InvokerSpellRuntime<Enemy>();
  protected invokeSource?: InvokerWeapon;
  public ownerWeapons: Weapon[] = [];

  public setInvokeSource(invoke?: InvokerWeapon): void {
    this.invokeSource = invoke?.spell === null ? invoke : undefined;
  }

  public setOwnerWeapons(weapons: Weapon[]): void {
    this.ownerWeapons = weapons;
  }

  public get spellLevel(): number {
    return Math.min(
      20,
      this.level + (this.spell ? (this.invokeSource?.level ?? 1) - 1 : 0),
    );
  }

  public lastSpell: InvokerSpellId | null = null;

  constructor(
    public readonly spell: InvokerSpellId | null = null,
    protected onTriggerAttack?: () => void,
    protected random: () => number = Math.random,
  ) {
    const def = spell ? INVOKER_SPELLS[spell] : null;
    super(
      spell ? invokerWeaponId(spell) : "invoker_invoke",
      def?.name ?? "Invoke — Случайное заклинание",
      def?.icon ?? "🔮",
      def?.cooldown ?? 1.4,
      def?.damage ?? INVOKE_BASE_DAMAGE,
      spell ? (def?.damage === 0 ? 0 : 6) : INVOKE_DAMAGE_PER_LEVEL,
    );
    this.recalculateStats();
  }

  public override get effectiveCooldown(): number {
    const cooldown =
      super.effectiveCooldown *
      (this.spell
        ? Math.pow(INVOKE_COOLDOWN_FACTOR, (this.invokeSource?.level ?? 1) - 1)
        : 1);
    return this.spell === "ghost_walk"
      ? Math.max(INVOKER_SPELLS.ghost_walk.duration + 1.5, cooldown)
      : Math.max(0.08, cooldown);
  }

  public override recalculateStats(): void {
    super.recalculateStats();
    const levelCd =
      this.baseCooldown *
      Math.pow(this.spell ? 0.975 : INVOKE_COOLDOWN_FACTOR, this.level - 1);
    this.cooldown = Math.max(0.08, Number((levelCd * (1 - this.cooldownBonus)).toFixed(3)));
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void,
  ): void {
    if (this.spell && !this.invokeSource) {
      this.runtime.clear();
      return;
    }
    const context: SpellContext<Enemy> = {
      position: playerPos,
      enemies,
      damage: (enemy, amount, source) => {
        if (damageEnemy)
          damageEnemy(enemy, amount, new Vector3(source.x, source.y, source.z));
        else
          enemy.takeDamage(amount, new Vector3(source.x, source.y, source.z));
      },
      control: (enemy, control) =>
        this.onSpellControl
          ? this.onSpellControl(enemy, control)
          : enemy.applySpellControl(control),
      buff: (spell, level) => this.onSpellBuff?.(spell, level),
      visual: (cast) => this.onSpellCast?.(cast),
    };
    this.runtime.update(dt, context);
    this.timer += dt;
    if (this.timer < this.effectiveCooldown) return;
    const config = BalanceManager.getWeaponConfig(this.id);
    const target = findClosestEnemies(
      enemies,
      playerPos,
      1,
      (config.range ?? 22) ** 2,
    )[0];
    if (!target) return;

    const index = Math.max(
      0,
      Math.min(9, Math.floor(this.random() * INVOKER_SPELL_IDS.length)),
    );
    const spell = this.spell ?? INVOKER_SPELL_IDS[index];

    // Determine sphere masteries from owner's active Quas, Wex, Exort weapons
    const quasW = this.ownerWeapons.find(w => w.id === 'invoker_quas');
    const wexW = this.ownerWeapons.find(w => w.id === 'invoker_wex');
    const exortW = this.ownerWeapons.find(w => w.id === 'invoker_exort');
    const qLevel = quasW ? quasW.level : 0;
    const wLevel = wexW ? wexW.level : 0;
    const eLevel = exortW ? exortW.level : 0;

    const scaling = getInvokerSphereScaling(spell, {
      qLevel,
      wLevel,
      eLevel,
      invokeLevel: this.invokeSource?.level ?? this.level
    });

    const baseSpellDamage = this.spell
      ? this.damage * (this.invokeSource!.damage / INVOKE_BASE_DAMAGE)
      : BalanceManager.getWeaponConfig(invokerWeaponId(spell)).damage *
        (this.damage / INVOKE_BASE_DAMAGE);

    const damage = baseSpellDamage * scaling.damageMult;
    const effectiveLvl = Math.max(this.spellLevel, scaling.compositeLevel);

    this.timer = Math.min(this.effectiveCooldown * 0.5, this.timer - this.effectiveCooldown);
    this.lastSpell = spell;
    this.runtime.cast(
      spell,
      effectiveLvl,
      damage,
      target,
      context,
      BalanceManager.getWeaponConfig(invokerWeaponId(spell)).explosionRadius ??
        INVOKER_SPELLS[spell].radius,
      scaling.controlMult,
      scaling.radiusSpeedMult
    );
    this.onTriggerAttack?.();
    SoundManager.playMagic();
  }

  public upgrade(grade: WeaponGrade = 'common'): void {
    if (this.level < this.maxLevel) {
      this.level++;
      this.applyGradeUpgrade(grade);
      this.recalculateStats();
    }
  }

  public get hpRegenBonus(): number {
    return this.level * 1.5;
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return "Максимальный уровень (12)";
    const cfg = WEAPON_GRADES[grade];
    const dmgBonusPct = Math.round(((100 * this.damagePerLevel) / INVOKE_BASE_DAMAGE) * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const perks: string[] = [];
    if (this.spell === null) {
      perks.push(`+${dmgBonusPct}% базового урона всех заклинаний`);
      perks.push("−4% перезарядки, +3.5% радиуса");
    } else {
      if (this.damagePerLevel > 0) {
        const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
        perks.push(`+${dmg} к урону`);
      } else {
        perks.push("Усиливает эффект");
      }
      perks.push("−2.5% перезарядки, больше область действия");
    }
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    const prefix = this.getGradePrefix();
    return `${prefix}[${cfg.name.toUpperCase()}] ${perks.join("; ")}`;
  }
}

export class InvokerInvokeWeapon extends InvokerWeapon {
  constructor(onTriggerAttack?: () => void, random?: () => number) {
    super(null, onTriggerAttack, random);
  }
}

export class InvokerSpellWeapon extends InvokerWeapon {
  constructor(spell: InvokerSpellId, onTriggerAttack?: () => void) {
    super(spell, onTriggerAttack);
  }
}

/** Base class for orbiting elemental sphere weapons */
abstract class InvokerSphereWeapon extends Weapon {
  public hasInitVisual: boolean = false;
  protected orbitMesh: Mesh | null = null;
  protected orbitAngle: number = 0;
  protected orbitRadius: number = 1.15;
  protected orbitSpeed: number = 3.2;
  protected heightOffset: number = 0.95;

  constructor(
    id: string,
    name: string,
    icon: string,
    cooldown: number,
    damage: number,
    damagePerLevel: number,
    protected color: number,
    initialAngle: number = 0
  ) {
    super(id, name, icon, cooldown, damage, damagePerLevel);
    this.orbitAngle = initialAngle;
    this.recalculateStats();
  }

  public initVisual(scene: Scene, playerPos: Vector3): void {
    if (this.hasInitVisual && this.orbitMesh) return;
    this.hasInitVisual = true;

    const geom = new SphereGeometry(0.22, 12, 12);
    const mat = new MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending
    });
    this.orbitMesh = new Mesh(geom, mat);
    this.orbitMesh.name = `invoker_sphere_${this.id}`;
    this.orbitMesh.position.set(
      playerPos.x + Math.cos(this.orbitAngle) * this.orbitRadius,
      playerPos.y + this.heightOffset,
      playerPos.z + Math.sin(this.orbitAngle) * this.orbitRadius
    );
    scene.add(this.orbitMesh);
  }

  public destroy(scene: Scene): void {
    this.hasInitVisual = false;
    if (this.orbitMesh) {
      scene.remove(this.orbitMesh);
      this.orbitMesh.geometry.dispose();
      if (this.orbitMesh.material) {
        if (Array.isArray(this.orbitMesh.material)) {
          this.orbitMesh.material.forEach(m => m.dispose());
        } else {
          this.orbitMesh.material.dispose();
        }
      }
      this.orbitMesh = null;
    }
  }

  protected updateVisual(dt: number, playerPos: Vector3): void {
    this.orbitAngle += dt * this.orbitSpeed;
    if (this.orbitMesh) {
      this.orbitMesh.position.set(
        playerPos.x + Math.cos(this.orbitAngle) * this.orbitRadius,
        playerPos.y + this.heightOffset + Math.sin(this.orbitAngle * 2) * 0.12,
        playerPos.z + Math.sin(this.orbitAngle) * this.orbitRadius
      );
    }
  }

  public upgrade(grade: WeaponGrade = 'common'): void {
    if (this.level >= this.maxLevel) return;
    this.level++;
    this.applyGradeUpgrade(grade);
    this.recalculateStats();
  }
}

/**
 * Quas (Сфера Льда)
 * Grants +1.5 HP/s per level, chills nearby monsters, and powers Quas-based spells.
 */
export class InvokerQuasWeapon extends InvokerSphereWeapon {
  public get hpRegenBonus(): number {
    return this.level * 1.5;
  }

  constructor() {
    super('invoker_quas', 'Quas — Сфера Льда', '❄️', 1.0, 15, 5, 0x38bdf8, 0);
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void
  ): void {
    this.updateVisual(dt, playerPos);
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      this.timer = Math.min(this.effectiveCooldown * 0.5, this.timer - this.effectiveCooldown);
      const chillRadius = 4.5 + this.level * 0.2;
      const target = findClosestEnemies(enemies, playerPos, 1, chillRadius * chillRadius)[0];
      if (target && target.isAlive) {
        target.applySpellControl({
          slowFactor: Math.max(0.4, 0.8 - this.level * 0.02),
          slowDuration: 0.8
        });
        if (damageEnemy) damageEnemy(target, this.damage, playerPos);
        else target.takeDamage(this.damage, playerPos);
      }
    }
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return "Максимальный уровень (12)";
    const cfg = WEAPON_GRADES[grade];
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const perks = [
      `+${dmg} к урону льдом`,
      '+1.5 HP/с регенерации',
      'Усиливает Quas: Cold Snap, Ice Wall, Ghost Walk, Tornado, Forge Spirit, Deafening Blast'
    ];
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    return `${this.getGradePrefix()}[${cfg.name.toUpperCase()}] ${perks.join("; ")}`;
  }
}

/**
 * Wex (Сфера Бури)
 * Grants +3% move speed, +2% attack speed / CDR per level, periodic electric shock, and powers Wex-based spells.
 */
export class InvokerWexWeapon extends InvokerSphereWeapon {
  public get speedBonus(): number {
    return this.level * 0.03;
  }
  public get cdrBonus(): number {
    return this.level * 0.02;
  }

  constructor() {
    super('invoker_wex', 'Wex — Сфера Бури', '⚡', 1.0, 15, 5, 0xc084fc, (Math.PI * 2) / 3);
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void
  ): void {
    this.updateVisual(dt, playerPos);
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      this.timer = Math.min(this.effectiveCooldown * 0.5, this.timer - this.effectiveCooldown);
      const zapRange = 9.0;
      const targets = findClosestEnemies(enemies, playerPos, 2, zapRange * zapRange);
      for (const target of targets) {
        if (!target.isAlive) continue;
        if (damageEnemy) damageEnemy(target, this.damage, playerPos);
        else target.takeDamage(this.damage, playerPos);
      }
      if (targets.length > 0) {
        SoundManager.playLightning();
      }
    }
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return "Максимальный уровень (12)";
    const cfg = WEAPON_GRADES[grade];
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const perks = [
      `+${dmg} к урону молнией`,
      '+3% скорости бега, +2% скорости атаки',
      'Усиливает Wex: EMP, Tornado, Alacrity, Ghost Walk, Chaos Meteor, Deafening Blast'
    ];
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    return `${this.getGradePrefix()}[${cfg.name.toUpperCase()}] ${perks.join("; ")}`;
  }
}

/**
 * Exort (Сфера Огня)
 * Grants +6% total damage per level, burns nearby enemies, and powers Exort-based spells.
 */
export class InvokerExortWeapon extends InvokerSphereWeapon {
  public get damageBonus(): number {
    return this.level * 0.06;
  }

  constructor() {
    super('invoker_exort', 'Exort — Сфера Огня', '🔥', 1.0, 20, 6, 0xf97316, (Math.PI * 4) / 3);
  }

  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void
  ): void {
    this.updateVisual(dt, playerPos);
    this.timer += dt;
    if (this.timer >= this.effectiveCooldown) {
      this.timer = Math.min(this.effectiveCooldown * 0.5, this.timer - this.effectiveCooldown);
      const burnRange = 6.0;
      const target = findClosestEnemies(enemies, playerPos, 1, burnRange * burnRange)[0];
      if (target && target.isAlive) {
        if (damageEnemy) damageEnemy(target, this.damage, playerPos);
        else target.takeDamage(this.damage, playerPos);
        target.applyBurn(2.0, 'p1', this.id);
      }
    }
  }

  public getNextUpgradeDescription(grade: WeaponGrade = 'common'): string {
    if (this.level >= this.maxLevel) return "Максимальный уровень (12)";
    const cfg = WEAPON_GRADES[grade];
    const dmg = Math.round(this.damagePerLevel * cfg.damageMultiplierBonus * this.gradeStatMultiplier);
    const perks = [
      `+${dmg} к урону огнем`,
      '+6% к общему урону',
      'Усиливает Exort: Sun Strike, Chaos Meteor, Forge Spirit, Ice Wall, Alacrity, Deafening Blast'
    ];
    if (cfg.cooldownReductionBonus > 0) perks.push(`-${Math.round(cfg.cooldownReductionBonus * 100)}% кд`);
    return `${this.getGradePrefix()}[${cfg.name.toUpperCase()}] ${perks.join("; ")}`;
  }
}
