import { selectWeaponUpgradeOptions } from "../game/src/ui/selectWeaponUpgradeOptions";
import assert from "node:assert/strict";
import test from "node:test";
import { Scene, Vector3 } from "three";
import {
  INVOKER_SPELL_IDS,
  INVOKER_SPELLS,
  SpellControlState,
  invokerWeaponId,
  createInvokerBuff,
  getInvokerScaling,
  getInvokerSpellDuration,
  type InvokerSpellCast,
} from "../game/src/shared/InvokerSpells";
import {
  InvokerSpellRuntime,
  type SpellContext,
  type SpellEnemy,
} from "../game/src/shared/InvokerSpellRuntime";
import {
  InvokerInvokeWeapon,
  InvokerSpellWeapon,
} from "../game/src/combat/InvokerWeapons";
import { InvokerSpellEffects } from "../game/src/combat/InvokerSpellEffects";
import { CombatDirector } from "../game/src/combat/CombatDirector";
import {
  packHostSnapshot,
  unpackHostSnapshot,
} from "../game/src/net/BinarySnapshot";
import { CHARACTERS } from "../game/src/shared/types/registry";
import { GameCore, SimEnemyInternal } from "../game/src/sim/GameCore";
import {
  SimInvokerWeapon,
  createSimWeaponById,
} from "../game/src/sim/SimWeapons";
import { SimVec3 } from "../game/src/sim/math/SimVector";
import type { Enemy } from "../game/src/entities/Enemy";
import type { HostSnapshotMessage } from "../game/src/shared/types";

interface Target extends SpellEnemy {
  hp: number;
}
function fixture() {
  const enemies: Target[] = [
    { id: "target", isAlive: true, position: { x: 0, y: 0, z: 5 }, hp: 1000 },
  ];
  const hits: { id: string; amount: number }[] = [],
    controls: unknown[] = [],
    buffs: string[] = [],
    visuals: InvokerSpellCast[] = [];
  const context: SpellContext<Target> = {
    position: { x: 0, y: 0, z: 0 },
    enemies,
    damage: (enemy, amount) => {
      hits.push({ id: enemy.id, amount });
      enemy.hp -= amount;
      enemy.isAlive = enemy.hp > 0;
    },
    control: (_enemy, control) => controls.push(control),
    buff: (spell) => buffs.push(spell),
    visual: (cast) => visuals.push(cast),
  };
  return {
    enemies,
    hits,
    controls,
    buffs,
    visuals,
    context,
    runtime: new InvokerSpellRuntime<Target>(),
  };
}
for (const spell of INVOKER_SPELL_IDS) {
  test("casts and resolves " + spell, () => {
    const f = fixture();
    f.runtime.cast(
      spell,
      1,
      INVOKER_SPELLS[spell].damage,
      f.enemies[0],
      f.context,
    );
    assert.equal(f.visuals.length, 1);
    for (let i = 0; i < 120; i++) f.runtime.update(0.05, f.context);
    if (spell === "ghost_walk" || spell === "alacrity") {
      assert.deepEqual(f.buffs, [spell]);
      assert.equal(
        f.hits.length,
        0,
        "Self buffs cannot cause invisible direct damage",
      );
    } else
      assert.ok(f.hits.length > 0, "Damaging spell must affect its target");
    assert.ok(
      f.hits.every((hit) => Number.isFinite(hit.amount) && hit.amount > 0),
    );
    const before = f.hits.length;
    f.runtime.update(1, f.context);
    assert.equal(f.hits.length, before, "Expired casts stop ticking");
    assert.equal(
      createSimWeaponById(invokerWeaponId(spell))?.id,
      invokerWeaponId(spell),
    );
  });
}
test("Invoke selects exactly one of all ten spells, respects cooldown and requires a target", () => {
  const enemy = {
    id: "e",
    position: new Vector3(0, 0, 4),
    isAlive: true,
    applySpellControl() {},
    takeDamage() {},
  } as unknown as Enemy;
  for (const [index, spell] of INVOKER_SPELL_IDS.entries()) {
    const weapon = new InvokerInvokeWeapon(undefined, () => (index + 0.5) / 10);
    const casts: InvokerSpellCast[] = [];
    weapon.onSpellCast = (cast) => casts.push(cast);
    weapon.update(10, new Vector3(), [], () => {});
    assert.equal(casts.length, 0);
    weapon.update(
      0.01,
      new Vector3(),
      [enemy],
      () => {},
      () => {},
    );
    assert.equal(casts.length, 1);
    assert.equal(casts[0].spellId, spell);
    weapon.update(
      0.01,
      new Vector3(),
      [enemy],
      () => {},
      () => {},
    );
    assert.equal(casts.length, 1);
  }
});
test("Sun Strike and EMP telegraph before damage and fire only once", () => {
  for (const spell of ["sun_strike", "emp"] as const) {
    const f = fixture();
    f.runtime.cast(spell, 1, 80, f.enemies[0], f.context);
    f.runtime.update(INVOKER_SPELLS[spell].delay - 0.01, f.context);
    assert.equal(f.hits.length, 0);
    f.runtime.update(0.02, f.context);
    assert.equal(f.hits.length, 1);
    f.runtime.update(10, f.context);
    assert.equal(f.hits.length, 1);
  }
});
test("Area hits are not skipped when killed enemies are removed in the damage callback", () => {
  const f = fixture();
  f.enemies[0].hp = 1;
  for (let i = 0; i < 4; i++)
    f.enemies.push({
      id: "e" + i,
      isAlive: true,
      hp: 1,
      position: { x: i * 0.2, y: 0, z: 5 },
    });
  const damage = f.context.damage;
  f.context.damage = (enemy, amount, source) => {
    damage(enemy, amount, source);
    f.enemies.splice(f.enemies.indexOf(enemy), 1);
  };
  f.runtime.cast("sun_strike", 1, 80, f.enemies[0], f.context);
  f.runtime.update(1, f.context);
  assert.equal(f.hits.length, 5);
  assert.equal(f.enemies.length, 0);
});
test("Directional spells cannot hit enemies behind the caster or hit the same target twice", () => {
  const f = fixture();
  f.enemies.push({
    id: "behind",
    isAlive: true,
    hp: 1000,
    position: { x: 0, y: 0, z: -5 },
  });
  f.runtime.cast("tornado", 1, 50, f.enemies[0], f.context);
  for (let i = 0; i < 100; i++) f.runtime.update(0.05, f.context);
  assert.deepEqual(
    f.hits.map((hit) => hit.id),
    ["target"],
  );
});
test("Control expires, bosses resist it, and the immortal boss remains immune", () => {
  const normal = new SpellControlState(),
    boss = new SpellControlState(),
    immortal = new SpellControlState();
  const control = {
    stunDuration: 2,
    disarmDuration: 3,
    slowDuration: 4,
    slowFactor: 0.3,
  };
  normal.apply(control);
  boss.apply(control, true);
  immortal.apply(control, true, true);
  assert.equal(normal.canAttack, false);
  assert.equal(normal.movementFactor, 0);
  assert.ok(boss.stun < normal.stun);
  assert.equal(immortal.canAttack, true);
  assert.equal(immortal.movementFactor, 1);
  normal.update(2.1);
  assert.equal(normal.movementFactor, 0.3);
  assert.equal(normal.canAttack, false);
  normal.update(2);
  assert.equal(normal.movementFactor, 1);
  assert.equal(normal.canAttack, true);
});
test("Ghost Walk keeps a defensive downtime even at maximum upgrades and haste", () => {
  const weapon = new InvokerSpellWeapon("ghost_walk");
  while (weapon.level < weapon.maxLevel) weapon.upgrade();
  weapon.cooldownMultiplier = 0.05;
  assert.ok(
    weapon.effectiveCooldown > createInvokerBuff("ghost_walk", 20).duration,
  );
});
test("Clearing a runtime cancels pending impacts", () => {
  const f = fixture();
  f.runtime.cast("sun_strike", 1, 100, f.enemies[0], f.context);
  f.runtime.clear();
  f.runtime.update(3, f.context);
  assert.equal(f.hits.length, 0);
});
test("Spell visuals are bounded, expire and dispose their resources", () => {
  const scene = new Scene(),
    effects = new InvokerSpellEffects(scene);
  for (const spell of INVOKER_SPELL_IDS) {
    const f = fixture();
    const cast = f.runtime.cast(spell, 1, 20, f.enemies[0], f.context);
    for (let i = 0; i < 100; i++) effects.play(cast, "p1");
  }
  assert.ok(scene.children.length <= 80);
  effects.update(20);
  assert.ok(scene.children.every((root) => !root.visible));
  effects.clear();
  assert.equal(scene.children.length, 0);
});
test("Invoker hero and spell/control events survive binary co-op snapshots", () => {
  assert.ok(CHARACTERS.includes("invoker"));
  assert.equal(CHARACTERS[0], "ronin");
  const f = fixture();
  const cast = f.runtime.cast("sun_strike", 1, 90, f.enemies[0], f.context);
  const shot = {
    x: cast.x,
    y: 0,
    z: cast.z,
    dx: cast.dx,
    dz: cast.dz,
    spd: 0,
    lt: cast.duration,
    rad: cast.radius,
    col: 0xffffff,
    ownerId: "p2",
    spell: cast,
  };
  const message: HostSnapshotMessage = {
    type: "host_snapshot",
    gameTime: 2,
    totalKills: 0,
    players: {
      p2: {
        id: "p2",
        charType: "invoker",
        x: 0,
        z: 0,
        dir: "front",
        anim: "ATTACK",
        hp: 100,
        maxHp: 100,
        level: 1,
        isDowned: false,
        kills: 0,
        damageDealt: 0,
      },
    },
    enemies: [],
    drops: [],
    events: [
      { type: "shot", shot },
      {
        type: "spell_control",
        enemyId: "target",
        killer: "p2",
        control: { stunDuration: 1 },
      },
    ],
  };
  const replay = unpackHostSnapshot(packHostSnapshot(message));
  assert.equal(replay.players?.p2.charType, "invoker");
  assert.deepEqual(replay.events, message.events);
  const scene = new Scene();
  const director = new CombatDirector(
    { scene } as never,
    { isCoop: true, position: new Vector3() } as never,
    { enemies: [] } as never,
    {} as never,
    { mySlotId: "p1", role: "host" } as never,
    new Map(),
  );
  director.spawnCosmeticShot(shot);
  assert.equal(director.projectiles.length, 0);
  assert.equal(director.pendingClientHits.length, 0);
  assert.equal(director.pendingLocalShots.length, 0);
  director.clear();
  assert.equal(scene.children.length, 0);
});
test("Dedicated simulation creates Invoker and reproduces casts from the same seed", () => {
  const run = () => {
    const core = new GameCore({ seed: 882, isCoop: false });
    const player = core.addPlayer("p1", "invoker");
    assert.equal(player.hp, 100);
    assert.ok(player.weapons[0] instanceof SimInvokerWeapon);
    core.enemies.push(
      new SimEnemyInternal(
        {
          type: "coyote",
          name: "test",
          hp: 1e6,
          speed: 0,
          damage: 0,
          width: 1,
          height: 1,
          gemType: "blue",
        },
        new SimVec3(0, 0, 5),
        "target",
      ),
    );
    const spells: string[] = [];
    for (let i = 0; i < 120; i++)
      for (const event of core.tick(0.05))
        if (event.type === "spell_cast") spells.push(event.cast.spellId);
    assert.ok(spells.length > 0);
    return spells;
  };
  assert.deepEqual(run(), run());
});

test("Dedicated upgrades reject spells without Invoke, then allow them after acquiring it for Invoker", () => {
  const core = new GameCore({ seed: 77 });
  // Ronin cannot acquire invoker spells or invoke
  const ronin = core.addPlayer("p1", "ronin");
  core.upgradePlayerWeapon("p1", "invoker_invoke");
  assert.equal(
    ronin.weapons.some((weapon) => weapon.id === "invoker_invoke"),
    false,
    "Other heroes cannot acquire Invoker abilities"
  );
  core.upgradePlayerWeapon("p1", "invoker_sun_strike");
  assert.equal(
    ronin.weapons.some((weapon) => weapon.id === "invoker_sun_strike"),
    false,
    "Other heroes cannot acquire Invoker spells"
  );

  // Invoker: reject spells without Invoke, then allow after acquiring Invoke
  const invoker = core.addPlayer("p2", "invoker");
  invoker.weapons = []; // simulate state without invoke
  core.upgradePlayerWeapon("p2", "invoker_sun_strike");
  assert.equal(
    invoker.weapons.some((weapon) => weapon.id === "invoker_sun_strike"),
    false,
    "Invoker cannot acquire standalone spells without Invoke"
  );
  core.upgradePlayerWeapon("p2", "invoker_invoke");
  core.upgradePlayerWeapon("p2", "invoker_sun_strike");
  assert.equal(
    invoker.weapons.some((weapon) => weapon.id === "invoker_sun_strike"),
    true,
    "Invoker can acquire standalone spells once Invoke is owned"
  );
  // Invoker cannot acquire non-invoker weapons
  core.upgradePlayerWeapon("p2", "bow");
  assert.equal(
    invoker.weapons.some((weapon) => weapon.id === "bow"),
    false,
    "Invoker cannot acquire generic weapons"
  );
});

function testEnemy(): Enemy {
  return {
    id: "e",
    position: new Vector3(0, 0, 4),
    isAlive: true,
    applySpellControl() {},
    takeDamage() {},
  } as unknown as Enemy;
}
function resolveSunStrike(
  weapon: InvokerInvokeWeapon | InvokerSpellWeapon,
): number {
  let damage = 0;
  const enemies = [testEnemy()];
  const hit = (_enemy: Enemy, amount: number) => {
    damage += amount;
  };
  weapon.update(
    weapon.effectiveCooldown,
    new Vector3(),
    enemies,
    () => {},
    hit,
  );
  weapon.update(0.91, new Vector3(), enemies, () => {}, hit);
  return damage;
}
test("Invoke levels add 25% base spell damage and shorten its cooldown by 4%", () => {
  const invoke = new InvokerInvokeWeapon(undefined, () => 0.65); // Sun Strike
  assert.equal(resolveSunStrike(invoke), 90);
  const upgraded = new InvokerInvokeWeapon(undefined, () => 0.65);
  upgraded.upgrade();
  assert.equal(resolveSunStrike(upgraded), 112.5);
  assert.ok(Math.abs(upgraded.effectiveCooldown - 1.4 * 0.96) < 1e-8);
});

test("Separate spells cannot cast without Invoke and inherit its upgrades when owned", () => {
  const spell = new InvokerSpellWeapon("sun_strike");
  const casts: InvokerSpellCast[] = [];
  spell.onSpellCast = (cast) => casts.push(cast);
  assert.equal(resolveSunStrike(spell), 0);
  assert.equal(casts.length, 0);
  const invoke = new InvokerInvokeWeapon();
  spell.setInvokeSource(invoke);
  assert.equal(resolveSunStrike(spell), 90);
  const stronger = new InvokerSpellWeapon("sun_strike");
  invoke.upgrade();
  stronger.setInvokeSource(invoke);
  assert.equal(resolveSunStrike(stronger), 112.5);
  assert.equal(stronger.spellLevel, 2);
  assert.ok(stronger.effectiveCooldown < 4.8);
  stronger.upgrade();
  assert.equal(stronger.spellLevel, 3);
  stronger.setInvokeSource(undefined);
  assert.equal(resolveSunStrike(stronger), 0);
});

test("Invoke mastery strengthens radius, control, persistent spells and self buffs", () => {
  const low = fixture(),
    high = fixture();
  const lowCast = low.runtime.cast("emp", 1, 65, low.enemies[0], low.context);
  const highCast = high.runtime.cast(
    "emp",
    10,
    65,
    high.enemies[0],
    high.context,
  );
  low.runtime.update(1.5, low.context);
  high.runtime.update(1.5, high.context);
  assert.ok(highCast.radius > lowCast.radius);
  const lowControl = low.controls[0] as {
    slowDuration: number;
    slowFactor: number;
  };
  const highControl = high.controls[0] as {
    slowDuration: number;
    slowFactor: number;
  };
  assert.ok(highControl.slowDuration > lowControl.slowDuration);
  assert.ok(highControl.slowFactor < lowControl.slowFactor);
  assert.ok(
    getInvokerSpellDuration("forge_spirit", 10) >
      getInvokerSpellDuration("forge_spirit", 1),
  );
  const lowBuff = createInvokerBuff("alacrity", 1),
    highBuff = createInvokerBuff("alacrity", 10);
  assert.ok(highBuff.value > lowBuff.value);
  assert.ok(highBuff.duration > lowBuff.duration);
  assert.equal(createInvokerBuff("ghost_walk", 20).duration, 3);
  assert.deepEqual(getInvokerScaling(999), getInvokerScaling(20));
});

test("Browser and headless adapters share upgraded Invoke and separate spell damage", () => {
  const invoke = new SimInvokerWeapon();
  invoke.upgrade();
  invoke.random = () => 0.65;
  const spell = new SimInvokerWeapon("sun_strike");
  const target = {
    id: "target",
    position: new SimVec3(0, 0, 4),
    isAlive: true,
  };
  const player = {
    id: "p1",
    position: new SimVec3(),
    isAlive: true,
    isDowned: false,
    damageMultiplier: 1,
  };
  const run = (weapon: SimInvokerWeapon) => {
    let total = 0;
    weapon.update(
      weapon.effectiveCooldown,
      player,
      [target],
      () => {},
      (_id, amount) => {
        total += amount;
      },
    );
    weapon.update(
      0.91,
      player,
      [target],
      () => {},
      (_id, amount) => {
        total += amount;
      },
    );
    return total;
  };
  assert.equal(run(spell), 0);
  spell.setInvokeSource(invoke);
  assert.equal(run(spell), 112.5);
  assert.equal(run(invoke), 112.5);
});

test("Mastery preserves the global cooldown floor at maximum haste", () => {
  for (const [invoke, spell] of [
    [new InvokerInvokeWeapon(), new InvokerSpellWeapon("sun_strike")],
    [new SimInvokerWeapon(), new SimInvokerWeapon("sun_strike")]
  ] as const) {
    while (invoke.level < 20) invoke.upgrade();
    while (spell.level < 20) spell.upgrade();
    spell.setInvokeSource(invoke as never);
    spell.cooldownMultiplier = 0.001;
    assert.equal(spell.effectiveCooldown, 0.08);
  }
});

test("Invoker gets new spells ahead of unrelated weapons while retaining a mastery upgrade", () => {
  const pool = [
    { id: "new_bow" }, { id: "new_fireball" }, { id: "upgrade_invoker_invoke" },
    { id: "new_invoker_emp" }, { id: "new_invoker_tornado" }, { id: "new_invoker_sun_strike" }
  ];
  const copy = [...pool];
  assert.deepEqual(selectWeaponUpgradeOptions(pool, "invoker").map(option => option.id),
    ["new_invoker_emp", "new_invoker_tornado", "upgrade_invoker_invoke"]);
  assert.deepEqual(pool, copy, "Selecting cards does not mutate the randomized pool");
});

test("Other heroes retain ordinary choices even after acquiring Invoke", () => {
  const pool = [{ id: "new_bow" }, { id: "new_invoker_emp" }, { id: "upgrade_invoker_invoke" }, { id: "new_invoker_tornado" }];
  assert.deepEqual(selectWeaponUpgradeOptions(pool, "ronin"), pool.slice(0, 3));
});

test("Invoker retains normal upgrades when no new spells can be acquired", () => {
  const fullInventoryPool = [
    { id: "upgrade_invoker_invoke" }, { id: "upgrade_invoker_emp" },
    { id: "upgrade_invoker_tornado" }, { id: "upgrade_bow" }
  ];
  assert.deepEqual(selectWeaponUpgradeOptions(fullInventoryPool, "invoker"), fullInventoryPool.slice(0, 3));
  assert.deepEqual(selectWeaponUpgradeOptions([], "invoker"), []);
});

test("Invoker fills missing spell choices without duplicates or inventing locked spells", () => {
  const pool = [{ id: "new_bow" }, { id: "new_invoker_emp" }, { id: "upgrade_invoker_invoke" }];
  const choices = selectWeaponUpgradeOptions(pool, "invoker");
  assert.equal(choices[0].id, "new_invoker_emp");
  assert.equal(new Set(choices.map(option => option.id)).size, 3);
  assert.ok(choices.every(option => pool.includes(option)));
  const withoutInvoke = [{ id: "new_invoker_invoke" }, { id: "new_bow" }];
  assert.deepEqual(selectWeaponUpgradeOptions(withoutInvoke, "invoker"), withoutInvoke);
});

test("Invoker gets three randomized new spells when all existing weapons are maxed", () => {
  const pool = [{ id: "new_bow" }, { id: "new_invoker_tornado" }, { id: "new_invoker_emp" }, { id: "new_invoker_alacrity" }];
  assert.deepEqual(selectWeaponUpgradeOptions(pool, "invoker").map(option => option.id),
    ["new_invoker_tornado", "new_invoker_emp", "new_invoker_alacrity"]);
});
