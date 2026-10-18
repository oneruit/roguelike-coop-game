import test from 'node:test';
import assert from 'node:assert/strict';
import { BalanceState } from '../admin/src/state/balanceState';
import { SupabaseService } from '../admin/src/api/supabaseService';
import { DEFAULT_DEMO_LEADERBOARDS } from '../admin/src/constants';
import { LeaderboardEntry } from '../admin/src/types';

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

if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = new LocalStorageMock();
}

test('Admin SupabaseService - fetchLeaderboards returns empty array when no records exist and offline', async () => {
  localStorage.clear();
  const state = new BalanceState();
  const service = new SupabaseService(state, () => {});

  const entries = await service.fetchLeaderboards();
  assert.equal(entries.length, 0, 'Should return empty array when local and cloud are empty without demo fallback');
  assert.equal(state.leaderboardEntries.length, 0);
});

test('Admin SupabaseService - seedDemoLeaderboards populates demo records in state and storage', async () => {
  localStorage.clear();
  const state = new BalanceState();
  const service = new SupabaseService(state, () => {});

  const seeded = await service.seedDemoLeaderboards();
  assert.equal(seeded, true);
  assert.equal(state.leaderboardEntries.length, DEFAULT_DEMO_LEADERBOARDS.length);

  const raw = localStorage.getItem('outlaw_local_leaderboards');
  assert.ok(raw, 'localStorage must contain outlaw_local_leaderboards after seeding');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.length, DEFAULT_DEMO_LEADERBOARDS.length);
});

test('Admin SupabaseService - updateLeaderboardEntry modifies player record in state and storage', async () => {
  const state = new BalanceState();
  const service = new SupabaseService(state, () => {});
  await service.seedDemoLeaderboards();

  const firstEntry = state.leaderboardEntries[0];
  const targetId = firstEntry.id || 'p1';
  const targetPlayerId = firstEntry.playerId;

  const updated = await service.updateLeaderboardEntry(targetId, {
    playerId: targetPlayerId,
    playerName: 'GrandChampion',
    score: 99999
  });
  assert.equal(updated, true);

  const inMem = state.leaderboardEntries.find(e => e.playerId === targetPlayerId);
  assert.ok(inMem);
  assert.equal(inMem.playerName, 'GrandChampion');
  assert.equal(inMem.score, 99999);

  const raw = localStorage.getItem('outlaw_local_leaderboards');
  assert.ok(raw);
  const inStorage = JSON.parse(raw).find((e: LeaderboardEntry) => e.playerId === targetPlayerId);
  assert.equal(inStorage.playerName, 'GrandChampion');
  assert.equal(inStorage.score, 99999);
});

test('Admin SupabaseService - deleteLeaderboardEntry removes entry by ID or playerId', async () => {
  const state = new BalanceState();
  const service = new SupabaseService(state, () => {});
  await service.seedDemoLeaderboards();

  const initialCount = state.leaderboardEntries.length;
  const toDelete = state.leaderboardEntries[1];

  const deleted = await service.deleteLeaderboardEntry(toDelete.id, toDelete.playerId);
  assert.equal(deleted, true);
  assert.equal(state.leaderboardEntries.length, initialCount - 1);
  assert.ok(!state.leaderboardEntries.some(e => e.playerId === toDelete.playerId));

  const raw = localStorage.getItem('outlaw_local_leaderboards');
  assert.ok(raw);
  const inStorage = JSON.parse(raw);
  assert.equal(inStorage.length, initialCount - 1);
  assert.ok(!inStorage.some((e: LeaderboardEntry) => e.playerId === toDelete.playerId));
});

test('Admin SupabaseService - resetAllLeaderboards wipes all entries from state and storage', async () => {
  const state = new BalanceState();
  const service = new SupabaseService(state, () => {});
  await service.seedDemoLeaderboards();
  assert.ok(state.leaderboardEntries.length > 0);

  const reset = await service.resetAllLeaderboards();
  assert.equal(reset, true);
  assert.equal(state.leaderboardEntries.length, 0);

  const raw = localStorage.getItem('outlaw_local_leaderboards');
  assert.equal(raw, null, 'outlaw_local_leaderboards must be removed from localStorage');
});

test('LeaderboardManager - submitScore records run on surrender or death without demo fallback', async () => {
  localStorage.clear();
  const { LeaderboardManager } = await import('../game/src/core/LeaderboardManager');

  // Empty initially - must not return mock demo records
  const initial = LeaderboardManager.getLocalEntries();
  assert.equal(initial.length, 0, 'Initial local entries must be empty');

  // Submit surrender run
  const surrenderRes = await LeaderboardManager.submitScore({
    heroId: 'ronin',
    stage: 2,
    survivalTimeSec: 150.5,
    kills: 45,
    credits: 200,
    isVictory: false,
    playerId: 'surrender_hero_1',
    playerName: 'SurrenderedRonin'
  });

  assert.equal(surrenderRes.success, true);
  assert.ok(surrenderRes.score > 0);

  const localAfterSurrender = LeaderboardManager.getLocalEntries();
  assert.equal(localAfterSurrender.length, 1);
  assert.equal(localAfterSurrender[0].playerId, 'surrender_hero_1');
  assert.equal(localAfterSurrender[0].isVictory, false);

  // Submit death run
  const deathRes = await LeaderboardManager.submitScore({
    heroId: 'valkyrie',
    stage: 3,
    survivalTimeSec: 420.0,
    kills: 110,
    credits: 850,
    isVictory: false,
    playerId: 'died_hero_2',
    playerName: 'FallenValkyrie'
  });

  assert.equal(deathRes.success, true);
  const localAfterDeath = LeaderboardManager.getLocalEntries();
  assert.equal(localAfterDeath.length, 2);
  assert.equal(localAfterDeath[0].playerId, 'died_hero_2', 'Higher score run should rank first');

  // Verify getLastRun returns the latest run info
  const lastRun = LeaderboardManager.getLastRun();
  assert.ok(lastRun, 'getLastRun must return info about the most recent run');
  assert.equal(lastRun.playerId, 'died_hero_2');
  assert.equal(lastRun.heroId, 'valkyrie');
  assert.equal(lastRun.isNewRecord, true);

  // Submit a lower score run for the same player
  await LeaderboardManager.submitScore({
    heroId: 'valkyrie',
    stage: 1,
    survivalTimeSec: 60.0,
    kills: 10,
    credits: 50,
    isVictory: false,
    playerId: 'died_hero_2',
    playerName: 'FallenValkyrie'
  });

  const updatedLastRun = LeaderboardManager.getLastRun();
  assert.ok(updatedLastRun);
  assert.equal(updatedLastRun.stage, 1);
  assert.equal(updatedLastRun.isNewRecord, false, 'Lower score run should not be flagged as new record');

  // fetchTopScores returns entries seamlessly
  const topScores = await LeaderboardManager.fetchTopScores(10);
  assert.ok(topScores.length >= 2);
  assert.equal(topScores[0].playerId, 'died_hero_2');
  assert.equal(topScores[0].stage, 3, 'High score personal best must remain intact in leaderboard');
});
