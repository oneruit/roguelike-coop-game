import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { ChestManager } from '../game/src/world/ChestManager';
import { Player } from '../game/src/entities/Player';
import { LastRunManager, type LastRunData } from '../game/src/core/LastRunManager';

// Mock DOM for Node.js
if (typeof (globalThis as any).document === 'undefined') {
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
    getElementById: () => null,
    querySelectorAll: () => []
  };
}

// Mock localStorage for node environment if not present
if (typeof window === 'undefined') {
  const storage = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, val: string) => storage.set(key, val),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear()
    }
  };
}

test('ChestManager - getChestStats and chest opening events', () => {
  const scene = new Scene();
  const chestManager = new ChestManager(scene);

  chestManager.generateStageChests(0, 0, 15, 1);
  const initialStats = chestManager.getChestStats();

  assert.equal(initialStats.total, 15, 'Total chests generated should be 15');
  assert.equal(initialStats.opened, 0, 'Initially 0 chests are opened');
  assert.equal(initialStats.remaining, 15, '15 chests remaining');

  let openEventFired = false;
  let receivedChestId = '';
  chestManager.addChestListener((action, chest) => {
    if (action === 'open') {
      openEventFired = true;
      receivedChestId = chest?.id || '';
    }
  });

  const firstChest = chestManager.chests[0];
  assert.ok(firstChest, 'First chest should exist');
  chestManager.openChest(firstChest, 1);

  assert.equal(openEventFired, true, 'Chest listener should receive open action');
  assert.equal(receivedChestId, firstChest.id, 'Received chest ID should match opened chest');

  const afterStats = chestManager.getChestStats();
  assert.equal(afterStats.opened, 1, '1 chest should be opened');
  assert.equal(afterStats.remaining, 14, '14 chests should remain');
});

test('Player - takeDamage tracks killer info on fatal damage and clears on revive', () => {
  const scene = new Scene();
  const player = new Player(scene, 'knight', 0);
  player.hp = 100;
  player.shield = 0;

  // Non-fatal hit
  const survived = player.takeDamage(40, false, 'Пепельный зомби');
  assert.equal(survived, false, 'Player should still be alive');
  assert.equal(player.killerInfo, null, 'killerInfo should be null for non-fatal hit');

  // Fatal hit
  const died = player.takeDamage(80, false, 'Кровавый демон');
  assert.equal(died, true, 'Player should be dead');
  assert.ok(player.killerInfo, 'killerInfo should be populated on death');
  assert.equal(player.killerInfo?.name, 'Кровавый демон', 'Killer name matches attacker name');
  assert.ok(player.killerInfo?.damage > 0, 'Killer fatal damage should be recorded');

  // Revive clears killerInfo
  player.isDowned = true;
  player.revive(0.5);
  assert.equal(player.killerInfo, null, 'killerInfo should be reset upon revive');
});

test('LastRunManager - saves and loads completed run summary with killer info', () => {
  LastRunManager.clearLastRun();
  assert.equal(LastRunManager.hasLastRun(), false, 'Initially should have no saved run');

  const mockRun: Omit<LastRunData, 'version'> = {
    timestamp: 1729500000000,
    dateFormatted: '21 окт, 13:00',
    isVictory: false,
    stageNumber: 2,
    biomeName: 'Пепельные пустыни',
    seed: 421337,
    gameTime: 540,
    timeFormatted: '09:00',
    heroId: 'ranger',
    heroLevel: 14,
    kills: 350,
    damageDealt: 88500,
    creditsEarned: 1200,
    chestsOpened: 8,
    killer: {
      name: 'Элитный Владыка Разлома',
      damage: 320
    },
    weapons: [
      { id: 'bow', name: 'Охотничий лук', level: 5, damageDealt: 65000, awakenedGrade: 1 },
      { id: 'chakram', name: 'Чакрам бури', level: 3, damageDealt: 23500 }
    ],
    isCoop: false
  };

  LastRunManager.saveLastRun(mockRun);
  assert.equal(LastRunManager.hasLastRun(), true, 'Should indicate a saved run exists');

  const loaded = LastRunManager.getLastRun();
  assert.ok(loaded, 'Loaded run should exist');
  assert.equal(loaded?.heroId, 'ranger');
  assert.equal(loaded?.isVictory, false);
  assert.equal(loaded?.killer?.name, 'Элитный Владыка Разлома');
  assert.equal(loaded?.killer?.damage, 320);
  assert.equal(loaded?.chestsOpened, 8);
  assert.equal(loaded?.weapons.length, 2);

  LastRunManager.clearLastRun();
  assert.equal(LastRunManager.hasLastRun(), false, 'Should be cleared');
});
