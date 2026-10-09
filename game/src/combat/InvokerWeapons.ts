import { Vector3 } from "three";
import type { Enemy } from "../entities/Enemy";
import type { Projectile } from "./Projectile";
import { Weapon, findClosestEnemies } from "./Weapon";
import { BalanceManager } from "../balance/BalanceManager";
import { SoundManager } from "../core/SoundManager";
import {
  InvokerSpellRuntime,
  type SpellContext,
} from "../shared/InvokerSpellRuntime";
import {
  INVOKER_SPELL_IDS,
  INVOKER_SPELLS,
  invokerWeaponId,
  type InvokerSpellId,
  type InvokerSpellCast,
  type SpellControl,
} from "../shared/InvokerSpells";

/** Both Invoke and the ten separately obtainable spell weapons share the same cast rules. */
export class InvokerWeapon extends Weapon {
  public onSpellCast?: (cast: InvokerSpellCast) => void;
  public onSpellControl?: (enemy: Enemy, control: SpellControl) => void;
  public onSpellBuff?: (
    spell: "ghost_walk" | "alacrity",
    level: number,
  ) => void;
  private runtime = new InvokerSpellRuntime<Enemy>();
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
      def?.damage ?? 36,
      spell && def?.damage === 0 ? 0 : 6,
    );
    this.recalculateStats();
  }
  public override get effectiveCooldown(): number {
    const cooldown = super.effectiveCooldown;
    return this.spell === "ghost_walk"
      ? Math.max(INVOKER_SPELLS.ghost_walk.duration + 1.5, cooldown)
      : cooldown;
  }
  public override recalculateStats(): void {
    super.recalculateStats();
    this.cooldown = Math.max(
      0.5,
      this.baseCooldown * Math.pow(0.975, this.level - 1),
    );
  }
  public update(
    dt: number,
    playerPos: Vector3,
    enemies: Enemy[],
    _spawnProjectile: (p: Projectile) => void,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3) => void,
  ): void {
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
      ? this.damage
      : BalanceManager.getWeaponConfig(invokerWeaponId(spell)).damage *
        (this.damage / 36);
    this.timer = 0;
    this.lastSpell = spell;
    this.runtime.cast(
      spell,
      this.level,
      damage,
      target,
      context,
      BalanceManager.getWeaponConfig(invokerWeaponId(spell)).explosionRadius ??
        INVOKER_SPELLS[spell].radius,
    );
    this.onTriggerAttack?.();
    SoundManager.playMagic();
  }
  public upgrade(): void {
    if (this.level < this.maxLevel) {
      this.level++;
      this.recalculateStats();
    }
  }
  public getNextUpgradeDescription(): string {
    if (this.level >= this.maxLevel) return "Максимальный уровень";
    return this.spell === null
      ? "Усиливает все десять случайных заклинаний; −2.5% перезарядки"
      : (this.damagePerLevel > 0
          ? "+" + this.damagePerLevel + " к урону; "
          : "Усиливает эффект; ") +
          "−2.5% перезарядки, больше область действия";
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
