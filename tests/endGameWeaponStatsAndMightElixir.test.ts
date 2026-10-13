import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { Player } from '../game/src/entities/Player';
import { BowWeapon, KukriWeapon, KatanaSlashWeapon, ChakramWeapon } from '../game/src/combat/Weapon';
import { InvokerInvokeWeapon } from '../game/src/combat/InvokerWeapons';
import { GameOverUI } from '../game/src/ui/modules/GameOverUI';
import { InventoryUI } from '../game/src/ui/modules/InventoryUI';
import { LevelUpUI, type LevelUpUIContext } from '../game/src/ui/modules/LevelUpUI';

// Minimal mock DOM for Node test environment
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

if (typeof (globalThis as any).document === 'undefined') {
  const elements: Record<string, any> = {};

  const makeMockElement = (id: string = '') => {
    const el = {
      id,
      innerHTML: '',
      innerText: '',
      className: '',
      style: {} as Record<string, string>,
      classList: {
        classes: new Set<string>(),
        contains(c: string) { return this.classes.has(c); },
        add(c: string) { this.classes.add(c); },
        remove(c: string) { this.classes.delete(c); },
        toggle(c: string) {
          if (this.classes.has(c)) this.classes.delete(c);
          else this.classes.add(c);
        }
      },
      appendChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    return el;
  };

  (globalThis as any).document = {
    createElementNS: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      src: '',
      style: {}
    }),
    createElement: () => ({
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        fillText: () => {},
        measureText: () => ({ width: 50 }),
        beginPath: () => {},
        arc: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        scale: () => {},
        translate: () => {},
        rotate: () => {}
      }),
      style: {},
      width: 100,
      height: 100,
      appendChild: () => {},
      addEventListener: () => {},
      classList: {
        contains: () => false,
        add: () => {},
        remove: () => {}
      }
    }),
    getElementById: (id: string) => {
      if (!elements[id]) {
        elements[id] = makeMockElement(id);
      }
      return elements[id];
    },
    querySelectorAll: () => []
  };
}

test('Elixir of Might (Эликсир Могущества) character stats integration', async (t) => {
  await t.test('mightElixirCount scales passiveDamageMultiplier and persists across recalculateStats', () => {
    const scene = new Scene();
    const player = new Player(scene, 'ronin');

    // Initial state
    assert.equal(player.mightElixirCount, 0);
    assert.equal(player.passiveDamageMultiplier, 1.0);

    // Starting weapon and other weapon damage should both scale up by 5%
    const initialStartingDmg = player.getDamageMultiplier(player.startingWeaponId);
    const initialOtherDmg = player.getDamageMultiplier('other_weapon');

    // Add 1 Elixir of Might (+5%)
    player.addMightElixirBonus();
    assert.equal(player.mightElixirCount, 1);
    assert.equal(Number(player.passiveDamageMultiplier.toFixed(2)), 1.05);

    // Starting weapon and other weapon damage should both scale up by 5%
    assert.equal(
      Number(player.getDamageMultiplier(player.startingWeaponId).toFixed(3)),
      Number((initialStartingDmg * 1.05).toFixed(3))
    );
    assert.equal(
      Number(player.getDamageMultiplier('other_weapon').toFixed(3)),
      Number((initialOtherDmg * 1.05).toFixed(3))
    );

    // Call recalculateStats multiple times (must NOT reset the might elixir bonus!)
    player.recalculateStats();
    player.recalculateStats();
    assert.equal(player.mightElixirCount, 1);
    assert.equal(Number(player.passiveDamageMultiplier.toFixed(2)), 1.05);

    // Add 2nd Elixir of Might (+5%) and 1 Amplifier (+2%)
    player.addMightElixirBonus();
    player.addAmplifierBonus();
    assert.equal(player.mightElixirCount, 2);
    assert.equal(player.amplifierCount, 1);
    // 1.0 + 1 * 0.02 + 2 * 0.05 = 1.12
    assert.equal(Number(player.passiveDamageMultiplier.toFixed(2)), 1.12);
  });

  await t.test('LevelUpUI bonus_damage_elixir correctly triggers addMightElixirBonus', () => {
    const scene = new Scene();
    const player = new Player(scene, 'ronin');
    player.weapons = [
      new KukriWeapon(),
      new BowWeapon(),
      new KatanaSlashWeapon(),
      new ChakramWeapon()
    ];
    for (const w of player.weapons) {
      w.level = 12;
      w.awakenedGrade = 2; // Grade III maxed to ensure elixirs are offered
    }

    const context: LevelUpUIContext = {
      elements: {
        levelUpModal: document.getElementById('level-up-modal')!,
        levelUpTitle: document.getElementById('level-up-title')!,
        levelUpStepIndicator: document.getElementById('level-up-step-indicator')!,
        upgradeCardsContainer: document.getElementById('upgrade-cards')!,
        levelUpRerollContainer: document.getElementById('level-up-reroll-container')!,
        btnLevelUpReroll: document.getElementById('btn-level-up-reroll')!
      } as any,
      getScene: () => scene,
      getCurrentStageNumber: () => 1,
      getIsAutoLevelUp: () => false,
      updateWeaponsBar: () => {},
      updatePassivesBar: () => {}
    };

    const levelUpUI = new LevelUpUI(context);
    const options = levelUpUI.generateWeaponOptions(player);
    const mightOption = options.find((opt) => opt.id === 'bonus_damage_elixir');

    assert.ok(mightOption, 'bonus_damage_elixir should be offered in upgrade options');
    const prevCount = player.mightElixirCount;
    mightOption.apply();

    assert.equal(player.mightElixirCount, prevCount + 1);
    assert.equal(Number(player.passiveDamageMultiplier.toFixed(2)), 1.05);
  });

  await t.test('InventoryUI accounts for and displays Elixir of Might in stats and passives', () => {
    const scene = new Scene();
    const player = new Player(scene, 'ronin');
    player.addMightElixirBonus();
    player.addMightElixirBonus(); // 2 stacks (+10%)

    const invUI = new InventoryUI();
    invUI.renderInventory(player);

    const statsList = document.getElementById('inventory-stats-list')!;
    const passivesList = document.getElementById('inventory-passives-list')!;

    // Should include Elixir of Might in the general stats table
    assert.ok(statsList.innerHTML.includes('Эликсир Могущества'), 'Stats table must display Elixir of Might');
    assert.ok(statsList.innerHTML.includes('+10%'), 'Stats table must show +10% for 2 stacks');

    // Should include Elixir of Might in the passives list
    assert.ok(passivesList.innerHTML.includes('Эликсир Могущества'), 'Passives list must display Elixir of Might');
    assert.ok(passivesList.innerHTML.includes('x2'), 'Passives list must show stack count x2');
  });

  await t.test('player.reset resets mightElixirCount to 0', () => {
    const scene = new Scene();
    const player = new Player(scene, 'ronin');
    player.addMightElixirBonus();
    assert.equal(player.mightElixirCount, 1);

    player.reset();
    assert.equal(player.mightElixirCount, 0);
    assert.equal(player.passiveDamageMultiplier, 1.0);
  });
});

test('End-game weapon damage statistics', async (t) => {
  await t.test('Weapon damageDealt tracking and player.recordWeaponDamage', () => {
    const scene = new Scene();
    const player = new Player(scene, 'archer');
    const bow = new BowWeapon();
    const katana = new KatanaSlashWeapon();
    player.weapons = [bow, katana];

    assert.equal(bow.damageDealt, 0);
    assert.equal(katana.damageDealt, 0);

    player.recordWeaponDamage('bow', 1250);
    player.recordWeaponDamage('katana_slash', 750);

    assert.equal(bow.damageDealt, 1250);
    assert.equal(katana.damageDealt, 750);

    // Invoker spell weapon resolution to invoke_source if generic invoke is equipped
    const invokerPlayer = new Player(scene, 'invoker');
    const invokeWeapon = new InvokerInvokeWeapon();
    invokerPlayer.weapons = [invokeWeapon];

    invokerPlayer.recordWeaponDamage('invoker_sunstrike', 500);
    assert.equal(invokeWeapon.damageDealt, 500);
  });

  await t.test('GameOverUI renders weapon damage statistics breakdown correctly', () => {
    const gameOverUI = new GameOverUI();
    const arsenalEl = document.getElementById('arsenal-items-list')!;

    const w1 = new BowWeapon();
    w1.name = 'Охотничий Лук';
    w1.level = 8;
    w1.damageDealt = 6000;

    const w2 = new KatanaSlashWeapon();
    w2.name = 'Катана Самурая';
    w2.level = 5;
    w2.damageDealt = 3000;

    const w3 = new KukriWeapon();
    w3.name = 'Парные Револьверы';
    w3.level = 3;
    w3.damageDealt = 1000;

    const weapons = [w2, w3, w1]; // Unordered

    gameOverUI.showGameOver(
      '15:30',
      { kills: 250, damageDealt: 10000, level: 12, revives: 0 },
      null,
      false,
      false,
      weapons
    );

    const html = arsenalEl.innerHTML;

    // Check descending sort (w1: 6000 first, w2: 3000 second, w3: 1000 third)
    const posW1 = html.indexOf('Охотничий Лук');
    const posW2 = html.indexOf('Катана Самурая');
    const posW3 = html.indexOf('Парные Револьверы');

    assert.ok(posW1 !== -1 && posW2 !== -1 && posW3 !== -1);
    assert.ok(posW1 < posW2, 'Weapon with highest damage must appear before lower damage weapon');
    assert.ok(posW2 < posW3, 'Weapon with medium damage must appear before lowest damage weapon');

    // Check top damage badge and class
    assert.ok(html.includes('top-damage'), 'Highest damaging weapon must have top-damage class');
    assert.ok(html.includes('ТОП УРОН'), 'Highest damaging weapon must display ТОП УРОН badge');

    // Total damage is 10,000 -> 60.0%, 30.0%, 10.0%
    assert.ok(html.includes('60.0%'), 'W1 percentage must be 60.0%');
    assert.ok(html.includes('30.0%'), 'W2 percentage must be 30.0%');
    assert.ok(html.includes('10.0%'), 'W3 percentage must be 10.0%');

    // Check bar widths
    assert.ok(html.includes('width: 60%;'), 'W1 bar fill must be 60%');
    assert.ok(html.includes('width: 30%;'), 'W2 bar fill must be 30%');
    assert.ok(html.includes('width: 10%;'), 'W3 bar fill must be 10%');
  });

  await t.test('GameOverUI handles zero damage run gracefully without NaN', () => {
    const gameOverUI = new GameOverUI();
    const arsenalEl = document.getElementById('arsenal-items-list')!;

    const w1 = new BowWeapon();
    w1.damageDealt = 0;

    gameOverUI.showGameOver(
      '00:05',
      { kills: 0, damageDealt: 0, level: 1, revives: 0 },
      null,
      false,
      false,
      [w1]
    );

    const html = arsenalEl.innerHTML;
    assert.ok(!html.includes('NaN'), 'Output must never contain NaN');
    assert.ok(html.includes('0.0%'), 'Zero damage weapon must show 0.0%');
    assert.ok(html.includes('width: 0%;'), 'Zero damage bar width must be 0%');
  });

  await t.test('GameOverUI displays grade badge when awakened', () => {
    const gameOverUI = new GameOverUI();
    const arsenalEl = document.getElementById('arsenal-items-list')!;

    const w1 = new BowWeapon();
    w1.awakenedGrade = 1; // Grade II
    w1.damageDealt = 500;

    gameOverUI.showGameOver(
      '10:00',
      { kills: 10, damageDealt: 500, level: 5, revives: 0 },
      null,
      false,
      false,
      [w1]
    );

    const html = arsenalEl.innerHTML;
    assert.ok(html.includes('Тир 2'), 'Awakened weapon must display awakened tier tag');
  });
});
