import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTERS_CONFIG,
  getChapterDef,
  getChapterQuestDef
} from '../game/src/core/ChapterQuestsConfig';
import { ProgressionManager } from '../game/src/core/ProgressionManager';

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

describe('Chapter Quests Rework & Zero State', () => {
  beforeEach(() => {
    localStorage.clear();
    const prog = ProgressionManager.getInstance();
    prog.resetAllTasksToZero();
  });

  test('CHAPTERS_CONFIG contains exactly 4 chapters with requested details', () => {
    assert.equal(CHAPTERS_CONFIG.length, 4);

    // Chapter 1
    const ch1 = getChapterDef(1)!;
    assert.ok(ch1);
    assert.equal(ch1.finalRewardCoins, 2000);
    assert.equal(ch1.title, 'Глава I: «Пробуждение в Разломе»');
    assert.equal(ch1.quests.length, 4);
    assert.deepEqual(ch1.quests.map((q) => q.id), [
      'ch1_deadly_debut',
      'ch1_essence_collection',
      'ch1_altar_call',
      'ch1_veil_breakthrough'
    ]);

    // Chapter 2
    const ch2 = getChapterDef(2)!;
    assert.ok(ch2);
    assert.equal(ch2.finalRewardCoins, 2500);
    assert.equal(ch2.title, 'Глава II: «Тени Древнего Леса»');
    assert.equal(ch2.quests.length, 4);
    assert.deepEqual(ch2.quests.map((q) => q.id), [
      'ch2_trail_of_beasts',
      'ch2_forest_cache',
      'ch2_cleanse_roots',
      'ch2_fall_of_leshy'
    ]);

    // Chapter 3
    const ch3 = getChapterDef(3)!;
    assert.ok(ch3);
    assert.equal(ch3.finalRewardCoins, 3000);
    assert.equal(ch3.title, 'Глава III: «Технологии Заброшенного Сектора»');
    assert.equal(ch3.quests.length, 4);
    assert.deepEqual(ch3.quests.map((q) => q.id), [
      'ch3_critical_overload',
      'ch3_energy_symbiosis',
      'ch3_rift_smuggler',
      'ch3_death_of_titan'
    ]);

    // Chapter 4
    const ch4 = getChapterDef(4)!;
    assert.ok(ch4);
    assert.equal(ch4.finalRewardCoins, 5000);
    assert.equal(ch4.title, 'Глава IV: «Охотничьи контракты»');
    assert.equal(ch4.quests.length, 3);
    assert.deepEqual(ch4.quests.map((q) => q.id), [
      'ch4_arrow_hail',
      'ch4_veteran',
      'ch4_golden_treasury'
    ]);
  });

  test('all chapter quests start at zero in fresh progression state', () => {
    const prog = ProgressionManager.getInstance();
    prog.resetAllTasksToZero();

    for (const ch of CHAPTERS_CONFIG) {
      assert.equal(prog.isChapterComplete(ch.chapter), false);
      assert.equal(prog.isChapterRewardClaimed(ch.chapter), false);
      for (const q of ch.quests) {
        const p = prog.getChapterQuestProgress(q.id);
        assert.equal(p.current, 0, `Quest ${q.id} current progress must be 0`);
        assert.equal(p.isComplete, false, `Quest ${q.id} must not be complete`);
        assert.equal(p.isClaimed, false, `Quest ${q.id} must not be claimed`);
      }
    }
  });

  test('legacy saves without rework version are reset to zero upon load', () => {
    // Write legacy data with old values
    const legacy = {
      accountLevel: 3,
      chapterQuestsProgress: {
        ch1_deadly_debut: { current: 50, isComplete: true, isClaimed: true }
      },
      claimedChapterRewards: { 1: true }
    };
    localStorage.setItem('rift_progression_save_v2', JSON.stringify(legacy));

    // Force re-instantiation / reload by resetAllProgress or accessing data
    const prog = ProgressionManager.getInstance();
    (prog as any).data = (prog as any).loadFromStorage();

    const debut = prog.getChapterQuestProgress('ch1_deadly_debut');
    assert.equal(debut.current, 0);
    assert.equal(debut.isComplete, false);
    assert.equal(debut.isClaimed, false);
    assert.equal(prog.isChapterRewardClaimed(1), false);
  });

  test('Chapter 1 quests progress and can be completed and claimed', () => {
    const prog = ProgressionManager.getInstance();

    // 1. Deadly debut
    prog.recordMeleeOrSpellKill(30);
    assert.equal(prog.getChapterQuestProgress('ch1_deadly_debut').current, 30);
    assert.equal(prog.getChapterQuestProgress('ch1_deadly_debut').isComplete, false);
    prog.recordMeleeOrSpellKill(20);
    assert.equal(prog.getChapterQuestProgress('ch1_deadly_debut').current, 50);
    assert.equal(prog.getChapterQuestProgress('ch1_deadly_debut').isComplete, true);

    // 2. Essence collection
    prog.recordXpGemCollected(75);
    assert.equal(prog.getChapterQuestProgress('ch1_essence_collection').current, 75);
    prog.recordXpGemCollected(25);
    assert.equal(prog.getChapterQuestProgress('ch1_essence_collection').current, 100);
    assert.equal(prog.getChapterQuestProgress('ch1_essence_collection').isComplete, true);

    // 3. Altar call
    prog.recordAltarCaptured();
    assert.equal(prog.getChapterQuestProgress('ch1_altar_call').isComplete, true);

    // 4. Veil breakthrough
    prog.recordTeleporterBossKilled();
    assert.equal(prog.getChapterQuestProgress('ch1_veil_breakthrough').isComplete, true);

    // Chapter 1 is complete!
    assert.equal(prog.isChapterComplete(1), true);

    // Claim individual quest
    const coinsBefore = prog.data.walletCoins;
    const claimRes = prog.claimChapterQuest('ch1_deadly_debut');
    assert.ok(claimRes);
    assert.equal(claimRes.coins, 200);
    assert.equal(prog.data.walletCoins, coinsBefore + 200);

    // Claim final chapter reward
    const coinsBeforeFinal = prog.data.walletCoins;
    const finalRes = prog.claimChapterFinalReward(1);
    assert.ok(finalRes);
    assert.equal(finalRes.coins, 2000);
    assert.equal(prog.data.walletCoins, coinsBeforeFinal + 2000);
    assert.equal(prog.isChapterRewardClaimed(1), true);
  });

  test('tasks in locked chapters do NOT progress or complete', () => {
    const prog = ProgressionManager.getInstance();
    prog.resetAllTasksToZero();

    assert.equal(prog.isChapterUnlocked(1), true);
    assert.equal(prog.isChapterUnlocked(2), false);
    assert.equal(prog.isChapterUnlocked(3), false);
    assert.equal(prog.isChapterUnlocked(4), false);

    // Try to progress Chapter 2 tasks while Chapter 1 is incomplete
    prog.recordCrawlerOrCoyoteKilled(75);
    prog.recordForestGoldenChestOpened();
    prog.recordForestSurvivalTime(720);
    prog.recordLeshyDefeated();

    assert.equal(prog.getChapterQuestProgress('ch2_trail_of_beasts').current, 0);
    assert.equal(prog.getChapterQuestProgress('ch2_trail_of_beasts').isComplete, false);
    assert.equal(prog.getChapterQuestProgress('ch2_forest_cache').isComplete, false);
    assert.equal(prog.getChapterQuestProgress('ch2_cleanse_roots').isComplete, false);
    assert.equal(prog.getChapterQuestProgress('ch2_fall_of_leshy').isComplete, false);

    // Try to progress Chapter 3 tasks while Chapter 1 & 2 are incomplete
    prog.recordRunCrit(50);
    prog.recordSimultaneousPassives(4);
    prog.recordMerchantPurchaseInRun(3);
    prog.recordBossSpawn(100);
    prog.recordBossDefeat(180);

    assert.equal(prog.getChapterQuestProgress('ch3_critical_overload').isComplete, false);
    assert.equal(prog.getChapterQuestProgress('ch3_energy_symbiosis').isComplete, false);
    assert.equal(prog.getChapterQuestProgress('ch3_rift_smuggler').isComplete, false);
    assert.equal(prog.getChapterQuestProgress('ch3_death_of_titan').isComplete, false);

    // Try to progress Chapter 4 tasks while previous chapters are incomplete
    prog.recordRangedKill(200);
    prog.data.accountLevel = 10;
    prog.data.walletCoins = 1000;

    assert.equal(prog.getChapterQuestProgress('ch4_arrow_hail').isComplete, false);
    assert.equal(prog.getChapterQuestProgress('ch4_veteran').isComplete, false);
    assert.equal(prog.getChapterQuestProgress('ch4_golden_treasury').isComplete, false);

    assert.equal(prog.isChapterComplete(2), false);
    assert.equal(prog.isChapterComplete(3), false);
    assert.equal(prog.isChapterComplete(4), false);
  });

  test('sequential chapter progression unlocks each chapter only after previous is complete', () => {
    const prog = ProgressionManager.getInstance();
    prog.resetAllTasksToZero();

    // 1. Complete Chapter 1
    assert.equal(prog.isChapterUnlocked(2), false);
    prog.recordMeleeOrSpellKill(50);
    prog.recordXpGemCollected(100);
    prog.recordAltarCaptured();
    prog.recordTeleporterBossKilled();

    assert.equal(prog.isChapterComplete(1), true);
    assert.equal(prog.isChapterUnlocked(2), true);
    assert.equal(prog.isChapterUnlocked(3), false);
    assert.equal(prog.isChapterUnlocked(4), false);

    // 2. Complete Chapter 2
    prog.recordCrawlerOrCoyoteKilled(75);
    assert.equal(prog.getChapterQuestProgress('ch2_trail_of_beasts').isComplete, true);

    prog.recordForestGoldenChestOpened();
    assert.equal(prog.getChapterQuestProgress('ch2_forest_cache').isComplete, true);

    prog.recordForestSurvivalTime(720);
    assert.equal(prog.getChapterQuestProgress('ch2_cleanse_roots').isComplete, true);

    prog.recordLeshyDefeated();
    assert.equal(prog.getChapterQuestProgress('ch2_fall_of_leshy').isComplete, true);

    assert.equal(prog.isChapterComplete(2), true);
    assert.equal(prog.isChapterUnlocked(3), true);
    assert.equal(prog.isChapterUnlocked(4), false);

    // 3. Complete Chapter 3
    prog.recordRunCrit(30);
    assert.equal(prog.getChapterQuestProgress('ch3_critical_overload').current, 30);
    prog.resetRunSessionProgress();
    assert.equal(prog.getChapterQuestProgress('ch3_critical_overload').current, 0);
    prog.recordRunCrit(50);
    assert.equal(prog.getChapterQuestProgress('ch3_critical_overload').isComplete, true);

    prog.recordSimultaneousPassives(4);
    assert.equal(prog.getChapterQuestProgress('ch3_energy_symbiosis').isComplete, true);

    prog.recordMerchantPurchaseInRun(2);
    assert.equal(prog.getChapterQuestProgress('ch3_rift_smuggler').current, 2);
    prog.recordMerchantPurchaseInRun(1);
    assert.equal(prog.getChapterQuestProgress('ch3_rift_smuggler').isComplete, true);

    prog.recordBossSpawn(100);
    prog.recordBossDefeat(180);
    assert.equal(prog.getChapterQuestProgress('ch3_death_of_titan').isComplete, true);

    assert.equal(prog.isChapterComplete(3), true);
    assert.equal(prog.isChapterUnlocked(4), true);

    // 4. Complete Chapter 4
    prog.recordRangedKill(200);
    assert.equal(prog.getChapterQuestProgress('ch4_arrow_hail').isComplete, true);

    prog.data.accountLevel = 5;
    assert.equal(prog.getChapterQuestProgress('ch4_veteran').isComplete, true);

    prog.data.walletCoins = 500;
    assert.equal(prog.getChapterQuestProgress('ch4_golden_treasury').isComplete, true);

    assert.equal(prog.isChapterComplete(4), true);
    const finalRes = prog.claimChapterFinalReward(4);
    assert.ok(finalRes);
    assert.equal(finalRes.coins, 5000);
  });

  test('archer is unlocked and playable by default', () => {
    const prog = ProgressionManager.getInstance();
    assert.equal(prog.isHeroUnlocked('archer'), true);
    assert.equal(prog.data.unlockedHeroes.archer, true);
    const progress = prog.getHeroProgress('archer');
    assert.equal(progress.isComplete, true);
    const def = prog.getHeroQuestDefinition('archer');
    assert.equal(def.heroName, 'Лучница');
  });
});
