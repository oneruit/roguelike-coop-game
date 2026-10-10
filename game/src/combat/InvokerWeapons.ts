import { Vector3 } from "three";
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
  type InvokerSpellId,
  type InvokerSpellCast,
  type SpellControl,
} from "../shared/InvokerSpells";

/** Invoke powers random casts and any separately acquired spell weapons. */
export class InvokerWeapon extends Weapon {
  public onSpellCast?: (cast: InvokerSpellCast) => void;
  public onSpellControl?: (enemy: Enemy, control: SpellControl) => void;
  public onSpellBuff?: (
    spell: "ghost_walk" | "alacrity",
    level: number,
  ) => void;
  private runtime = new InvokerSpellRuntime<Enemy>();
  private invokeSource?: InvokerWeapon;
  public setInvokeSource(invoke?: InvokerWeapon): void {
    this.invokeSource = invoke?.spell === null ? invoke : undefined;
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
    private onTriggerAttack?: () => void,
    private random: () => number = Math.random,
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
    this.cooldown = Math.max(
      0.5,
      this.baseCooldown *
        Math.pow(this.spell ? 0.975 : INVOKE_COOLDOWN_FACTOR, this.level - 1),
    );
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
    const damage = this.spell
      ? this.damage * (this.invokeSource!.damage / INVOKE_BASE_DAMAGE)
      : BalanceManager.getWeaponConfig(invokerWeaponId(spell)).damage *
        (this.damage / INVOKE_BASE_DAMAGE);
    this.timer = 0;
    this.lastSpell = spell;
    this.runtime.cast(
      spell,
      this.spellLevel,
      damage,
      target,
      context,
      BalanceManager.getWeaponConfig(invokerWeaponId(spell)).explosionRadius ??
        INVOKER_SPELLS[spell].radius,
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
