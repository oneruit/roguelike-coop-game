import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

describe('Daily & Weekly Quests Style and Battle Pass Rewards Rework', () => {
  beforeEach(() => {
    localStorage.clear();
    const prog = ProgressionManager.getInstance();
    prog.resetAllTasksToZero();
    BattlePassManager.getInstance().reset();
  });

  test('All required quest textures exist on disk', () => {
    const rootDir = process.cwd();
    const requiredTextures = [
      'ui_quest_card_daily.png',
      'ui_quest_card_weekly.png',
      'ui_quest_card_panel.png',
      'ui_quest_slot_coyote.png',
      'ui_quest_slot_boss.png',
      'ui_quest_slot_invoker.png',
      'ui_quest_slot_bison.png',
      'ui_quest_slot_crystal_green.png',
      'ui_quest_slot_crystal_blue.png',
      'ui_quest_slot_coin.png',
      'ui_quest_slot_crystal_combo.png'
    ];

    for (const tex of requiredTextures) {
      const p = path.join(rootDir, 'public', 'textures', 'quests', tex);
      assert.ok(fs.existsSync(p), `Missing required texture: ${tex} at ${p}`);
      const stats = fs.statSync(p);
      assert.ok(stats.size > 0, `Texture file ${tex} must not be empty`);
    }
  });

  test('Daily quests contain 3 tasks matching mockup: coyotes, bosses, and invoker', () => {
    const prog = ProgressionManager.getInstance();
    const dailyQuests = prog.getDailySidebarQuests();

    assert.equal(dailyQuests.length, 3, 'Must have exactly 3 daily quests');

    // 1. Coyotes quest
    const coyotesQuest = dailyQuests.find((q) => q.id === 'daily_coyotes');
    assert.ok(coyotesQuest, 'Must have daily_coyotes quest');
    assert.equal(coyotesQuest.title, 'Убить 10 элитных койотов');
    assert.equal(coyotesQuest.max, 10);
    assert.equal(coyotesQuest.current, 0);
    assert.equal(coyotesQuest.rewardType, 'bp_green_crystal');
    assert.equal(coyotesQuest.rewardAmount, 50);

    // 2. Bosses quest
    const bossesQuest = dailyQuests.find((q) => q.id === 'daily_bosses');
    assert.ok(bossesQuest, 'Must have daily_bosses quest');
    assert.equal(bossesQuest.title, 'Победить 2 боссов');
    assert.equal(bossesQuest.max, 2);
    assert.equal(bossesQuest.current, 0);
    assert.equal(bossesQuest.rewardType, 'coin');
    assert.equal(bossesQuest.rewardAmount, 2);

    // 3. Invoker quest
    const invokerQuest = dailyQuests.find((q) => q.id === 'daily_invoker');
    assert.ok(invokerQuest, 'Must have daily_invoker quest');
    assert.equal(invokerQuest.title, 'Сыграть на персонаже Инвокер');
    assert.equal(invokerQuest.max, 1);
    assert.equal(invokerQuest.current, 0);
    assert.equal(invokerQuest.rewardType, 'bp_blue_crystal');
    assert.equal(invokerQuest.rewardAmount, 100);
  });

  test('Weekly quests contain bisons task matching mockup', () => {
    const prog = ProgressionManager.getInstance();
    const weeklyQuests = prog.getWeeklySidebarQuests();

    assert.equal(weeklyQuests.length, 1, 'Must have 1 weekly quest');
    const bisonQuest = weeklyQuests[0];
    assert.equal(bisonQuest.id, 'weekly_bisons');
    assert.equal(bisonQuest.title, 'Убить 100 элитных бизонов');
    assert.equal(bisonQuest.max, 100);
    assert.equal(bisonQuest.current, 0);
    assert.equal(bisonQuest.rewardType, 'bp_blue_crystal');
    assert.equal(bisonQuest.rewardAmount, 100);
  });

  test('Small green crystal awards exactly 50 Battle Pass XP points upon claiming', () => {
    const prog = ProgressionManager.getInstance();
    const bp = BattlePassManager.getInstance();

    assert.equal(bp.getPoints(), 0);
    assert.equal(bp.getLevel(), 1);

    // Progress coyotes quest to 10
    prog.recordCoyoteKilled(10);
    const dailyQuests = prog.getDailySidebarQuests();
    const coyotesQuest = dailyQuests.find((q) => q.id === 'daily_coyotes')!;
    assert.equal(coyotesQuest.isComplete, true);
    assert.equal(coyotesQuest.isClaimed, false);

    // Claim reward
    const res = prog.claimSidebarQuest('daily_coyotes');
    assert.ok(res);
    assert.equal(res.success, true);
    assert.equal(res.rewardType, 'bp_green_crystal');
    assert.equal(res.amount, 50);

    // Battle Pass should now have 50 points
    assert.equal(bp.getPoints(), 50);
  });

  test('Blue crystal awards exactly 100 Battle Pass XP points upon claiming', () => {
    const prog = ProgressionManager.getInstance();
    const bp = BattlePassManager.getInstance();

    assert.equal(bp.getPoints(), 0);

    // Progress invoker quest by playing invoker
    prog.recordHeroPlayed('invoker');
    const dailyQuests = prog.getDailySidebarQuests();
    const invokerQuest = dailyQuests.find((q) => q.id === 'daily_invoker')!;
    assert.equal(invokerQuest.isComplete, true);
    assert.equal(invokerQuest.isClaimed, false);

    // Claim reward
    const res = prog.claimSidebarQuest('daily_invoker');
    assert.ok(res);
    assert.equal(res.success, true);
    assert.equal(res.rewardType, 'bp_blue_crystal');
    assert.equal(res.amount, 100);

    // Battle Pass should now have 100 points
    assert.equal(bp.getPoints(), 100);
  });

  test('Claiming both green and blue crystals accumulates Battle Pass XP and triggers level progression', () => {
    const prog = ProgressionManager.getInstance();
    const bp = BattlePassManager.getInstance();

    // 1. Green crystal: +50 XP
    prog.recordCoyoteKilled(10);
    prog.claimSidebarQuest('daily_coyotes');
    assert.equal(bp.getPoints(), 50);

    // 2. Blue crystal: +100 XP
    prog.recordHeroPlayed('invoker');
    prog.claimSidebarQuest('daily_invoker');
    assert.equal(bp.getPoints(), 150);

    // 3. Weekly bison quest: +100 XP (brings total to 250 XP, reaching BP Level 2)
    prog.recordBisonKilled(100);
    prog.claimSidebarQuest('weekly_bisons');
    assert.equal(bp.getPoints(), 250);
    assert.equal(bp.getLevel(), 2, 'Total 250 pts with 200 pts/level should reach Level 2');
  });
});
