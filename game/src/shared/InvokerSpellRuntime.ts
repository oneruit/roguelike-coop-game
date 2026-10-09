import {
  INVOKER_SPELLS,
  type InvokerSpellCast,
  type InvokerSpellId,
  type SpellControl,
} from "./InvokerSpells";

export interface SpellPosition {
  x: number;
  y: number;
  z: number;
}
export interface SpellEnemy {
  id: string;
  position: SpellPosition;
  isAlive: boolean;
}
export interface SpellContext<E extends SpellEnemy> {
  position: SpellPosition;
  enemies: readonly E[];
  damage: (enemy: E, amount: number, source: SpellPosition) => void;
  control: (enemy: E, control: SpellControl) => void;
  buff: (spell: "ghost_walk" | "alacrity", level: number) => void;
  visual: (cast: InvokerSpellCast) => void;
}
interface ActiveSpell {
  cast: InvokerSpellCast;
  damage: number;
  age: number;
  nextTick: number;
  hit: Set<string>;
}
/** Spell rules are independent of rendering: remote visual events cannot deal damage. */
export class InvokerSpellRuntime<E extends SpellEnemy> {
  private active: ActiveSpell[] = [];
  public clear(): void {
    this.active = [];
  }
  public cast(
    spellId: InvokerSpellId,
    level: number,
    damage: number,
    target: E,
    context: SpellContext<E>,
    baseRadius = INVOKER_SPELLS[spellId].radius,
  ): InvokerSpellCast {
    const def = INVOKER_SPELLS[spellId];
    const dx = target.position.x - context.position.x,
      dz = target.position.z - context.position.z;
    const length = Math.hypot(dx, dz) || 1;
    const cast: InvokerSpellCast = {
      spellId,
      level,
      x: context.position.x,
      y: context.position.y,
      z: context.position.z,
      targetX: target.position.x,
      targetY: target.position.y,
      targetZ: target.position.z,
      targetId: target.id,
      dx: dx / length,
      dz: dz / length,
      radius: baseRadius + Math.min(2, (level - 1) * 0.06),
      duration: def.duration,
      delay: def.delay,
    };
    if (spellId === "ghost_walk" || spellId === "alacrity")
      context.buff(spellId, level);
    context.visual(cast);
    if (this.active.length >= 24) this.active.shift();
    this.active.push({
      cast,
      damage,
      age: 0,
      nextTick: def.delay,
      hit: new Set(),
    });
    this.update(0, context);
    return cast;
  }
  public update(dt: number, context: SpellContext<E>): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const spell = this.active[i];
      spell.age += Math.max(0, dt);
      const c = spell.cast;
      const endAge = Math.min(spell.age, c.duration);
      const source: SpellPosition = { x: c.x, y: c.y, z: c.z };
      if (c.spellId === "tornado" || c.spellId === "deafening_blast") {
        const speed = c.spellId === "tornado" ? 8 : 16;
        const previous = Math.max(0, Math.min(endAge, spell.age - dt)) * speed;
        const travel = endAge * speed;
        for (const enemy of [...context.enemies]) {
          if (!enemy.isAlive || spell.hit.has(enemy.id)) continue;
          const ex = enemy.position.x - c.x,
            ez = enemy.position.z - c.z;
          const along = ex * c.dx + ez * c.dz,
            across = Math.abs(ex * c.dz - ez * c.dx);
          if (
            along >= previous - c.radius &&
            along <= travel + c.radius &&
            across <= c.radius
          ) {
            spell.hit.add(enemy.id);
            context.control(
              enemy,
              c.spellId === "tornado"
                ? { stunDuration: 1.2 }
                : { disarmDuration: 1.8, pushX: c.dx * 12, pushZ: c.dz * 12 },
            );
            context.damage(enemy, spell.damage, source);
          }
        }
      } else {
        while (spell.nextTick <= endAge + 1e-8 && spell.nextTick < c.duration) {
          const tickAge = spell.nextTick;
          let interval = 0.4;
          if (c.spellId === "cold_snap") {
            interval = 0.6;
            const target = context.enemies.find(
              (e) => e.id === c.targetId && e.isAlive,
            );
            if (target) {
              context.control(target, {
                stunDuration: 0.16,
                slowFactor: 0.7,
                slowDuration: 0.6,
              });
              context.damage(target, spell.damage / 4, source);
            }
          } else if (c.spellId === "ghost_walk") {
            this.area(
              context,
              context.position.x,
              context.position.z,
              c.radius,
              (enemy) =>
                context.control(enemy, { slowFactor: 0.55, slowDuration: 0.5 }),
            );
          } else if (c.spellId === "alacrity") {
            interval = c.duration;
          } else if (c.spellId === "forge_spirit") {
            interval = 0.75;
            let target: E | undefined;
            let best = c.radius * c.radius;
            for (const enemy of [...context.enemies]) {
              if (!enemy.isAlive) continue;
              const dist =
                (enemy.position.x - context.position.x) ** 2 +
                (enemy.position.z - context.position.z) ** 2;
              if (dist < best) {
                best = dist;
                target = enemy;
              }
            }
            if (target)
              context.damage(target, spell.damage / 7, context.position);
          } else if (c.spellId === "ice_wall") {
            for (const enemy of [...context.enemies]) {
              if (!enemy.isAlive) continue;
              const ex = enemy.position.x - c.targetX,
                ez = enemy.position.z - c.targetZ;
              if (
                Math.abs(ex * c.dx + ez * c.dz) <= 0.9 &&
                Math.abs(ex * c.dz - ez * c.dx) <= c.radius
              ) {
                context.control(enemy, { slowFactor: 0.3, slowDuration: 0.55 });
                context.damage(enemy, spell.damage / 10, source);
              }
            }
          } else if (c.spellId === "chaos_meteor") {
            const travel = Math.max(0, tickAge - c.delay) * 5;
            this.area(
              context,
              c.targetX + c.dx * travel,
              c.targetZ + c.dz * travel,
              c.radius,
              (enemy) => context.damage(enemy, spell.damage / 8, source),
            );
          } else if (c.spellId === "sun_strike" || c.spellId === "emp") {
            interval = c.duration;
            this.area(context, c.targetX, c.targetZ, c.radius, (enemy) => {
              if (c.spellId === "emp")
                context.control(enemy, { slowFactor: 0.55, slowDuration: 1.5 });
              context.damage(enemy, spell.damage, source);
            });
          }
          spell.nextTick += interval;
        }
      }
      if (spell.age >= c.duration) this.active.splice(i, 1);
    }
  }
  private area(
    context: SpellContext<E>,
    x: number,
    z: number,
    radius: number,
    hit: (enemy: E) => void,
  ): void {
    for (const enemy of [...context.enemies]) {
      if (
        enemy.isAlive &&
        (enemy.position.x - x) ** 2 + (enemy.position.z - z) ** 2 <=
          radius * radius
      )
        hit(enemy);
    }
  }
}
