import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { RunSaveManager, type SavedRunData } from '../game/src/core/RunSaveManager';
import { DEFAULT_BALANCE } from '../game/src/balance/defaultBalance';
import { ReaperScytheWeapon } from '../game/src/combat/weapons/MagicWeapons';
import { SimReaperScytheWeapon } from '../game/src/sim/weapons/SimMeleeWeapons';
import { Player } from '../game/src/entities/Player';

// Mock localStorage for Node.js test environment
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
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
  (globalThis as any).document = {
    getElementById: () => null,
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
      addEventListener: () => {},
      removeEventListener: () => {}
    })
  };
}

test('RunSaveManager saves and restores playerPosition and map seed', () => {
  const sampleData: SavedRunData = {
    version: 1,
    timestamp: Date.now(),
    heroId: 'amazon',
    stageNumber: 2,
    seed: 777123,
    playerPosition: { x: 42.5, y: 0.8, z: -19.4 },
    gameTime: 120,
    stageTime: 30,
    kills: 88,
    credits: 150,
    playerHp: 80,
    playerMaxHp: 100,
    playerLevel: 4,
    playerXp: 40,
    playerXpToNext: 100,
    passives: {
      mightElixirCount: 1,
      speedBootsCount: 0,
      flaskCount: 0,
      magnetCount: 0,
      amuletCount: 0,
      vestCount: 0,
      watchCount: 0,
      amplifierCount: 0
    },
    riftItems: {},
    weapons: []
  };

  const saved = RunSaveManager.saveRun(sampleData);
  assert.equal(saved, true);

  const loaded = RunSaveManager.loadRun();
  assert.ok(loaded);
  assert.equal(loaded.seed, 777123);
  assert.deepEqual(loaded.playerPosition, { x: 42.5, y: 0.8, z: -19.4 });
  assert.equal(loaded.stageNumber, 2);

  RunSaveManager.clearSavedRun();
  assert.equal(RunSaveManager.loadRun(), null);
});

test('Bleed damage is buffed 3x (base 24 dps) across default balance and weapons', () => {
  // Check default balance
  assert.equal(DEFAULT_BALANCE.weapons.reaper_scythe.bleedDps, 24);

  // Check ReaperScytheWeapon
  const scythe = new ReaperScytheWeapon();
  assert.equal(scythe.getBleedDps(), 24);

  // Check SimReaperScytheWeapon
  const simScythe = new SimReaperScytheWeapon();
  assert.equal((simScythe as any).bleedDps, 24);
});

test('Amazon hero triggers attack animation with proper duration for continuous weapon', () => {
  let attackTriggered = false;
  const scythe = new ReaperScytheWeapon(() => {
    attackTriggered = true;
  });

  assert.equal(typeof (scythe as any).onTriggerAttack, 'function');
  (scythe as any).onTriggerAttack();
  assert.equal(attackTriggered, true);

  // Check duration logic on Player
  const scene = new Scene();
  const player = new Player(scene);
  player.setCharacter('amazon');
  assert.equal(player.charType, 'amazon');
  assert.equal(player.startingWeaponId, 'reaper_scythe');

  // Trigger attack animation on player - should not collapse to 0.08s
  player.triggerAttackAnim(0.48, 'reaper_scythe');
  assert.equal(player.attackAnimTimer, 0.48, 'Attack animation duration should not be clamped to 0.08s for zero cooldown weapons');
});
