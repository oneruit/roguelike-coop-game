import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudSyncManager } from '../game/src/meta/CloudSyncManager';
import { MetaProgression } from '../game/src/meta/MetaProgression';
import { ProgressionManager } from '../game/src/core/ProgressionManager';

// Mock localStorage for node:test environment if not provided
class LocalStorageMock {
  private store: Map<string, string> = new Map();
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new LocalStorageMock();
}

test('CloudSyncManager - Singleton and Initialization', () => {
  const syncManager = CloudSyncManager.getInstance();
  assert.ok(syncManager, 'CloudSyncManager should exist');
  assert.equal(syncManager.getStatus(), 'idle', 'Initial status should be idle');
});

test('MetaProgression - State export, import and merge', () => {
  const meta = MetaProgression.getInstance();
  meta.resetAllProgress();

  assert.equal(meta.getCrystals(), 0);
  assert.equal(meta.getLifetimeCrystals(), 0);
  assert.deepEqual(meta.getUpgrades(), {});

  // Add some local progress
  meta.addCrystals(100);
  meta.loadExternalState({
    crystals: 100,
    lifetimeCrystals: 100,
    upgrades: { offense_damage: 2, defense_max_hp: 1 }
  });

  const exported = meta.getState();
  assert.equal(exported.crystals, 100);
  assert.equal(exported.upgrades.offense_damage, 2);
  assert.equal(exported.upgrades.defense_max_hp, 1);

  // Simulate cloud merge with higher levels
  const cloudCrystals = 250;
  const cloudUpgrades: Record<string, number> = { offense_damage: 1, defense_max_hp: 3, utility_speed: 2 };

  const mergedCrystals = Math.max(cloudCrystals, meta.getCrystals());
  const mergedUpgrades: Record<string, number> = { ...cloudUpgrades };
  for (const [id, lvl] of Object.entries(meta.getUpgrades())) {
    mergedUpgrades[id] = Math.max(mergedUpgrades[id] || 0, lvl || 0);
  }

  meta.loadExternalState({
    crystals: mergedCrystals,
    lifetimeCrystals: mergedCrystals,
    upgrades: mergedUpgrades
  });

  assert.equal(meta.getCrystals(), 250, 'Crystals must merge to highest (250)');
  assert.equal(meta.getUpgrades().offense_damage, 2, 'offense_damage must retain higher local level 2');
  assert.equal(meta.getUpgrades().defense_max_hp, 3, 'defense_max_hp must take higher cloud level 3');
  assert.equal(meta.getUpgrades().utility_speed, 2, 'utility_speed must take cloud level 2');
});

test('ProgressionManager - Cloud external data loading and onSave listeners', () => {
  const prog = ProgressionManager.getInstance();
  prog.resetAllProgress();

  let saveNotificationCount = 0;
  const unsubscribe = prog.onSave(() => {
    saveNotificationCount++;
  });

  prog.loadExternalData({
    accountLevel: 5,
    walletCoins: 120,
    bossesKilled: 2,
    unlockedHeroes: {
      archer: true
    } as any
  });

  assert.equal(prog.data.accountLevel, 5, 'Account level must update to 5');
  assert.equal(prog.data.walletCoins, 120, 'Wallet coins must update to 120');
  assert.equal(prog.data.bossesKilled, 2, 'Bosses killed must update to 2');
  assert.equal(prog.data.unlockedHeroes.archer, true, 'Archer must be unlocked from cloud data');
  assert.ok(saveNotificationCount > 0, 'onSave listener must be triggered');

  unsubscribe();
});

test('CloudSyncManager - Reset cloud progress clears local state', async () => {
  const syncManager = CloudSyncManager.getInstance();
  const meta = MetaProgression.getInstance();
  const prog = ProgressionManager.getInstance();

  meta.addCrystals(500);
  prog.data.accountLevel = 10;
  prog.save();

  assert.ok(meta.getCrystals() > 0);
  assert.equal(prog.data.accountLevel, 10);

  const res = await syncManager.resetCloudProgress();
  assert.equal(res.success, true);
  assert.equal(meta.getCrystals(), 0, 'Crystals must be reset to 0');
  assert.equal(prog.data.accountLevel, 1, 'Account level must reset to default 1');
});
