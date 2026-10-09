import type { ActiveBuff } from "./types/entities";

export const INVOKER_SPELL_IDS = [
  "cold_snap",
  "ghost_walk",
  "ice_wall",
  "emp",
  "tornado",
  "alacrity",
  "sun_strike",
  "forge_spirit",
  "chaos_meteor",
  "deafening_blast",
] as const;
export type InvokerSpellId = (typeof INVOKER_SPELL_IDS)[number];
export interface InvokerSpellDefinition {
  name: string;
  icon: string;
  color: number;
  damage: number;
  cooldown: number;
  duration: number;
  delay: number;
  radius: number;
  description: string;
}
export const INVOKER_SPELLS: Record<InvokerSpellId, InvokerSpellDefinition> = {
  cold_snap: {
    name: "Cold Snap — Холодная хватка",
    icon: "❄️",
    color: 0x9ceaff,
    damage: 36,
    cooldown: 2.8,
    duration: 2.4,
    delay: 0,
    radius: 1,
    description: "Замораживает цель серией ударов с короткими оглушениями.",
  },
  ghost_walk: {
    name: "Ghost Walk — Призрачная поступь",
    icon: "👻",
    color: 0xc8a7ff,
    damage: 0,
    cooldown: 9,
    duration: 3,
    delay: 0,
    radius: 3.5,
    description:
      "Призрачная форма защищает от атак, ускоряет героя и замедляет врагов рядом.",
  },
  ice_wall: {
    name: "Ice Wall — Ледяная стена",
    icon: "🧊",
    color: 0x64ddff,
    damage: 32,
    cooldown: 6,
    duration: 4,
    delay: 0,
    radius: 4,
    description:
      "Стена льда перед целью наносит периодический урон и сильно замедляет.",
  },
  emp: {
    name: "EMP — Электромагнитный импульс",
    icon: "⚡",
    color: 0xb584ff,
    damage: 65,
    cooldown: 5,
    duration: 2,
    delay: 1.4,
    radius: 4,
    description:
      "Заряжает сферу и взрывается по области. Вместо сжигания маны замедляет врагов.",
  },
  tornado: {
    name: "Tornado — Торнадо",
    icon: "🌪️",
    color: 0xceecff,
    damage: 38,
    cooldown: 4.6,
    duration: 2.5,
    delay: 0,
    radius: 1.6,
    description: "Летящий вихрь поражает врагов на пути и временно оглушает.",
  },
  alacrity: {
    name: "Alacrity — Воодушевление",
    icon: "✨",
    color: 0xffd76a,
    damage: 0,
    cooldown: 9,
    duration: 4,
    delay: 0,
    radius: 1.3,
    description:
      "Временно повышает урон и скорость срабатывания всех оружий героя.",
  },
  sun_strike: {
    name: "Sun Strike — Солнечный удар",
    icon: "☀️",
    color: 0xffce50,
    damage: 90,
    cooldown: 4.8,
    duration: 1.35,
    delay: 0.9,
    radius: 2.4,
    description:
      "Отмечает место цели и после задержки обрушивает солнечный столб.",
  },
  forge_spirit: {
    name: "Forge Spirit — Духи кузницы",
    icon: "🔥",
    color: 0xff8b38,
    damage: 48,
    cooldown: 8,
    duration: 5,
    delay: 0,
    radius: 12,
    description:
      "Призывает двух огненных духов, которые пять секунд атакуют ближайших врагов.",
  },
  chaos_meteor: {
    name: "Chaos Meteor — Метеор хаоса",
    icon: "☄️",
    color: 0xff4e22,
    damage: 65,
    cooldown: 6.5,
    duration: 3.5,
    delay: 0.6,
    radius: 2.3,
    description:
      "Метеор падает к цели, катится вперёд и обжигает врагов на пути.",
  },
  deafening_blast: {
    name: "Deafening Blast — Оглушительный взрыв",
    icon: "💥",
    color: 0xc89fff,
    damage: 45,
    cooldown: 4.8,
    duration: 1.2,
    delay: 0,
    radius: 2.1,
    description:
      "Волна силы наносит урон, отбрасывает врагов и временно запрещает им атаковать.",
  },
};
export function isInvokerSpellId(value: unknown): value is InvokerSpellId {
  return typeof value === "string" && Object.hasOwn(INVOKER_SPELLS, value);
}
export function invokerWeaponId(spell: InvokerSpellId): string {
  return "invoker_" + spell;
}
export function invokerSpellFromWeaponId(id: string): InvokerSpellId | null {
  const spell = id.replace(/^invoker_/, "");
  return id.startsWith("invoker_") && isInvokerSpellId(spell) ? spell : null;
}
/** Separate spell weapons require Invoke in the same inventory. */
export function canAcquireInvokerWeapon(
  id: string,
  weapons: readonly { id: string }[],
): boolean {
  return (
    !invokerSpellFromWeaponId(id) ||
    weapons.some((weapon) => weapon.id === "invoker_invoke")
  );
}
export const INVOKE_BASE_DAMAGE = 36;
export const INVOKE_DAMAGE_PER_LEVEL = 9;
export const INVOKE_COOLDOWN_FACTOR = 0.96;

/** Shared mastery curve for browser and deterministic simulation. Ghost duration stays fixed. */
export function getInvokerScaling(level: number) {
  const steps = Math.max(0, Math.min(19, Math.floor(level) - 1));
  return {
    radius: 1 + steps * 0.035,
    duration: 1 + steps * 0.025,
    control: 1 + steps * 0.025,
    slowBonus: steps * 0.005,
    buffValue: Math.min(0.75, 0.25 + steps * 0.025),
  };
}
export function getInvokerSpellDuration(
  spell: InvokerSpellId,
  level: number,
): number {
  const persistent = [
    "ice_wall",
    "forge_spirit",
    "chaos_meteor",
    "alacrity",
  ].includes(spell);
  return (
    INVOKER_SPELLS[spell].duration *
    (persistent ? getInvokerScaling(level).duration : 1)
  );
}
export interface InvokerSpellCast {
  spellId: InvokerSpellId;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetId?: string;
  dx: number;
  dz: number;
  radius: number;
  duration: number;
  delay: number;
  level: number;
}
export interface SpellControl {
  slowFactor?: number;
  slowDuration?: number;
  stunDuration?: number;
  disarmDuration?: number;
  pushX?: number;
  pushZ?: number;
}
/** Countdown state shared by the browser and dedicated simulation. */
export class SpellControlState {
  public stun = 0;
  public slow = 0;
  public slowFactor = 1;
  public disarm = 0;
  public get canAttack(): boolean {
    return this.stun <= 0 && this.disarm <= 0;
  }
  public get movementFactor(): number {
    return this.stun > 0 ? 0 : this.slow > 0 ? this.slowFactor : 1;
  }
  public update(dt: number): void {
    this.stun = Math.max(0, this.stun - dt);
    this.disarm = Math.max(0, this.disarm - dt);
    this.slow = Math.max(0, this.slow - dt);
    if (this.slow === 0) this.slowFactor = 1;
  }
  public apply(
    control: SpellControl,
    isBoss = false,
    isImmortal = false,
  ): void {
    if (isImmortal) return;
    const resistance = isBoss ? 0.35 : 1;
    const duration = (value: number | undefined) =>
      Number.isFinite(value)
        ? Math.max(0, Math.min(8, value!)) * resistance
        : 0;
    this.stun = Math.max(this.stun, duration(control.stunDuration));
    this.disarm = Math.max(this.disarm, duration(control.disarmDuration));
    if (
      duration(control.slowDuration) > 0 &&
      Number.isFinite(control.slowFactor)
    ) {
      this.slow = Math.max(this.slow, duration(control.slowDuration));
      this.slowFactor = Math.min(
        this.slowFactor,
        Math.max(isBoss ? 0.7 : 0.2, Math.min(1, control.slowFactor!)),
      );
    }
  }
}
export function createInvokerBuff(
  spell: "ghost_walk" | "alacrity",
  level: number,
): ActiveBuff {
  const def = INVOKER_SPELLS[spell];
  return {
    type: spell === "ghost_walk" ? "ghost" : "alacrity",
    name: def.name,
    icon: def.icon,
    color: "#" + def.color.toString(16).padStart(6, "0"),
    duration: getInvokerSpellDuration(spell, level),
    maxDuration: getInvokerSpellDuration(spell, level),
    value: getInvokerScaling(level).buffValue,
  };
}
