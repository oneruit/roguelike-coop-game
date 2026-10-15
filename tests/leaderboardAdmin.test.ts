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

test('Admin SupabaseService - fetchLeaderboards falls back to default demo entries when offline', async () => {
  localStorage.clear();
  const state = new BalanceState();
  const service = new SupabaseService(state, () => {});

  const entries = await service.fetchLeaderboards();
  assert.ok(entries.length > 0, 'Should load default demo records when local and cloud are empty');
  assert.equal(entries.length, DEFAULT_DEMO_LEADERBOARDS.length);
  assert.equal(state.leaderboardEntries.length, DEFAULT_DEMO_LEADERBOARDS.length);

  // Highest score should be first
  assert.ok(entries[0].score >= entries[1].score, 'Entries must be sorted by score descending');
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
