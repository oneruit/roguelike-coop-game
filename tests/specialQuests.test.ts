import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  SPECIAL_QUESTS_CONFIG,
  getSpecialQuestDef,
  getSpecialQuestsByCategory
} from '../game/src/core/SpecialQuestsConfig';
import { ProgressionManager } from '../game/src/core/ProgressionManager';
import { BattlePassManager } from '../game/src/core/BattlePassManager';

// Mock localStorage for headless Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
}

describe('Special Quests & Active Events (Rift Path & Weekly)', () => {
  beforeEach(() => {
    localStorage.clear();
    const bp = BattlePassManager.getInstance();
    bp.reset();
    const prog = ProgressionManager.getInstance();
    prog.resetAllTasksToZero();
  });

  test('SPECIAL_QUESTS_CONFIG contains rift_path and weekly quests with requested parameters', () => {
    const riftQuests = getSpecialQuestsByCategory('rift_path');
    assert.equal(riftQuests.length, 1);
    const riftQ = riftQuests[0];
    assert.equal(riftQ.id, 'rift_elite_bisons');
    assert.equal(riftQ.targetCount, 100);
    assert.equal(riftQ.rewards.bp_xp, 500);

    const weeklyQuests = getSpecialQuestsByCategory('weekly');
    assert.equal(weeklyQuests.length, 3);

    const coyotesQ = getSpecialQuestDef('weekly_elite_coyotes')!;
    assert.ok(coyotesQ);
    assert.equal(coyotesQ.targetCount, 10);
    assert.equal(coyotesQ.rewards.bp_xp, 50);

    const bossesQ = getSpecialQuestDef('weekly_defeat_bosses')!;
    assert.ok(bossesQ);
    assert.equal(bossesQ.targetCount, 2);
    assert.equal(bossesQ.rewards.coins, 500);

    const invokerQ = getSpecialQuestDef('weekly_play_invoker')!;
    assert.ok(invokerQ);
    assert.equal(invokerQ.targetCount, 1);
    assert.equal(invokerQ.rewards.bp_xp, 100);
  });

  test('Initial state: all special quests start at 0 and unclaimed', () => {
    const prog = ProgressionManager.getInstance();
    SPECIAL_QUESTS_CONFIG.forEach((q) => {
      const p = prog.getSpecialQuestProgress(q.id);
      assert.equal(p.current, 0);
      assert.equal(p.isComplete, false);
      assert.equal(p.isClaimed, false);
      assert.equal(p.label, `0 / ${q.targetCount}`);
    });
  });

  test('Rift Path: tracking elite bison kills and claiming 500 BP XP', () => {
    const prog = ProgressionManager.getInstance();
    const bp = BattlePassManager.getInstance();

    prog.recordEliteBisonKilled(50);
    let p = prog.getSpecialQuestProgress('rift_elite_bisons');
    assert.equal(p.current, 50);
    assert.equal(p.isComplete, false);

    // Cannot claim yet
    assert.equal(prog.claimSpecialQuest('rift_elite_bisons'), null);

    prog.recordEliteBisonKilled(60); // 50 + 60 = 110, capped at 100
    p = prog.getSpecialQuestProgress('rift_elite_bisons');
    assert.equal(p.current, 100);
    assert.equal(p.isComplete, true);
    assert.equal(p.isClaimed, false);

    const bpBefore = bp.getPoints();
    const res = prog.claimSpecialQuest('rift_elite_bisons');
    assert.ok(res);
    assert.equal(res?.bpXp, 500);
    assert.equal(bp.getPoints(), bpBefore + 500);

    // Second claim should return null
    assert.equal(prog.claimSpecialQuest('rift_elite_bisons'), null);
    assert.equal(bp.getPoints(), bpBefore + 500);
  });

  test('Weekly: tracking elite coyote kills and claiming 50 BP XP', () => {
    const prog = ProgressionManager.getInstance();
    const bp = BattlePassManager.getInstance();

    prog.recordEliteCoyoteKilled(5);
    let p = prog.getSpecialQuestProgress('weekly_elite_coyotes');
    assert.equal(p.current, 5);
    assert.equal(p.isComplete, false);

    prog.recordEliteCoyoteKilled(5);
    p = prog.getSpecialQuestProgress('weekly_elite_coyotes');
    assert.equal(p.current, 10);
    assert.equal(p.isComplete, true);

    const bpBefore = bp.getPoints();
    const res = prog.claimSpecialQuest('weekly_elite_coyotes');
    assert.ok(res);
    assert.equal(res?.bpXp, 50);
    assert.equal(bp.getPoints(), bpBefore + 50);
  });

  test('Weekly: tracking boss defeats and claiming 500 coins', () => {
    const prog = ProgressionManager.getInstance();

    prog.recordBossKilled();
    let p = prog.getSpecialQuestProgress('weekly_defeat_bosses');
    assert.equal(p.current, 1);
    assert.equal(p.isComplete, false);

    prog.recordBossKilled();
    p = prog.getSpecialQuestProgress('weekly_defeat_bosses');
    assert.equal(p.current, 2);
    assert.equal(p.isComplete, true);

    const coinsBefore = prog.data.walletCoins;
    const res = prog.claimSpecialQuest('weekly_defeat_bosses');
    assert.ok(res);
    assert.equal(res?.coins, 500);
    assert.equal(prog.data.walletCoins, coinsBefore + 500);
  });

  test('Weekly: playing Invoker completes quest and claims 100 BP XP', () => {
    const prog = ProgressionManager.getInstance();
    const bp = BattlePassManager.getInstance();

    // Playing Ronin should not trigger Invoker quest
    prog.recordHeroPlayed('ronin');
    let p = prog.getSpecialQuestProgress('weekly_play_invoker');
    assert.equal(p.current, 0);

    // Playing Invoker triggers quest
    prog.recordHeroPlayed('invoker');
    p = prog.getSpecialQuestProgress('weekly_play_invoker');
    assert.equal(p.current, 1);
    assert.equal(p.isComplete, true);

    const bpBefore = bp.getPoints();
    const res = prog.claimSpecialQuest('weekly_play_invoker');
    assert.ok(res);
    assert.equal(res?.bpXp, 100);
    assert.equal(bp.getPoints(), bpBefore + 100);
  });

  test('Special quests progress does not conflict with chapter quests progress', () => {
    const prog = ProgressionManager.getInstance();
    prog.recordEliteBisonKilled(100);
    prog.recordEliteCoyoteKilled(10);
    prog.recordBossKilled();
    prog.recordBossKilled();
    prog.recordHeroPlayed('invoker');

    // Chapter 1 quests should remain unpolluted
    const ch1_q1 = prog.getChapterQuestProgress('ch1_deadly_debut');
    assert.equal(ch1_q1.current, 0);
    assert.equal(ch1_q1.isComplete, false);
  });
});
