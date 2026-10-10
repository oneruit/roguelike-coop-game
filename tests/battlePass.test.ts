import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBattlePassPoints,
  BattlePassManager,
  BATTLE_PASS_REWARDS,
  BP_MAX_LEVEL,
  BP_POINTS_PER_LEVEL,
  BP_MAX_POINTS
} from '../game/src/core/BattlePassManager';
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

describe('Battle Pass Survival XP System', () => {
  test('awarded points match the exact survival duration rules requested', () => {
    // 1. If died before 5 minutes (< 300s): 20 points
    assert.equal(calculateBattlePassPoints(0), 20, '0s should give 20 points');
    assert.equal(calculateBattlePassPoints(60), 20, '1m should give 20 points');
    assert.equal(calculateBattlePassPoints(180), 20, '3m should give 20 points');
    assert.equal(calculateBattlePassPoints(299), 20, '4m 59s should give 20 points');

    // 2. If died before 10 minutes (300s..599s): 50 points
    assert.equal(calculateBattlePassPoints(300), 50, '5m 00s should give 50 points');
    assert.equal(calculateBattlePassPoints(420), 50, '7m should give 50 points');
    assert.equal(calculateBattlePassPoints(599), 50, '9m 59s should give 50 points');

    // 3. If died before 15 minutes (600s..899s): 100 points
    assert.equal(calculateBattlePassPoints(600), 100, '10m 00s should give 100 points');
    assert.equal(calculateBattlePassPoints(750), 100, '12m 30s should give 100 points');
    assert.equal(calculateBattlePassPoints(899), 100, '14m 59s should give 100 points');

    // 4. If died before 20 minutes (900s..1199s): 150 points
    assert.equal(calculateBattlePassPoints(900), 150, '15m 00s should give 150 points');
    assert.equal(calculateBattlePassPoints(1050), 150, '17m 30s should give 150 points');
    assert.equal(calculateBattlePassPoints(1199), 150, '19m 59s should give 150 points');

    // 5. If died between 20 and 30 minutes, or survived 30 minutes (>= 1200s): 200 points
    assert.equal(calculateBattlePassPoints(1200), 200, '20m 00s should give 200 points');
    assert.equal(calculateBattlePassPoints(1500), 200, '25m 00s should give 200 points');
    assert.equal(calculateBattlePassPoints(1799), 200, '29m 59s should give 200 points');
    assert.equal(calculateBattlePassPoints(1800), 200, '30m 00s (victory) should give 200 points');
    assert.equal(calculateBattlePassPoints(2400), 200, '40m should give 200 points');
  });

  test('Battle Pass rewards configuration has all 15 levels and milestone chests', () => {
    assert.equal(BATTLE_PASS_REWARDS.length, 15, 'Should have exactly 15 levels of rewards');
    assert.equal(BP_MAX_LEVEL, 15);
    assert.equal(BP_POINTS_PER_LEVEL, 200);
    assert.equal(BP_MAX_POINTS, 2800);

    for (let i = 1; i <= 15; i++) {
      const reward = BATTLE_PASS_REWARDS.find((r) => r.level === i);
      assert.ok(reward, `Reward for level ${i} must exist`);
      assert.ok(reward.coins > 0, `Level ${i} must give coins`);
      assert.ok(reward.name.length > 0, `Level ${i} must have a name`);
    }

    const lvl10 = BATTLE_PASS_REWARDS.find((r) => r.level === 10);
    assert.ok(lvl10?.isMilestone, 'Level 10 must be a milestone chest');

    const lvl15 = BATTLE_PASS_REWARDS.find((r) => r.level === 15);
    assert.ok(lvl15?.isMilestone, 'Level 15 must be a milestone chest');
  });

  test('BattlePassManager progression and level calculations', () => {
    const prog = ProgressionManager.getInstance();
    prog.data.battlePass = {
      seasonId: 'season_1',
      points: 0,
      claimedLevels: []
    };

    const bp = BattlePassManager.getInstance();

    assert.equal(bp.getLevel(), 1, 'Initial level is 1');
    assert.equal(bp.getPoints(), 0);
    assert.equal(bp.getPointsInCurrentLevel(), 0);
    assert.equal(bp.getProgressPercent(), 0);

    // Add points for 4 minute death (20 points)
    const run1 = bp.addPointsForSurvival(240);
    assert.equal(run1.pointsAwarded, 20);
    assert.equal(run1.oldLevel, 1);
    assert.equal(run1.newLevel, 1);
    assert.equal(run1.leveledUp, false);
    assert.equal(bp.getPoints(), 20);
    assert.equal(bp.getPointsInCurrentLevel(), 20);

    // Add points for 18 minute death (150 points) -> total 170 points (still level 1)
    const run2 = bp.addPointsForSurvival(18 * 60);
    assert.equal(run2.pointsAwarded, 150);
    assert.equal(run2.oldLevel, 1);
    assert.equal(run2.newLevel, 1);
    assert.equal(run2.leveledUp, false);
    assert.equal(bp.getPoints(), 170);
    assert.equal(bp.getLevel(), 1);
    assert.equal(bp.getPointsInCurrentLevel(), 170);

    // Add another run with 50 points -> total 220 points (level 2!)
    const run3 = bp.addPointsForSurvival(7 * 60);
    assert.equal(run3.pointsAwarded, 50);
    assert.equal(run3.oldLevel, 1);
    assert.equal(run3.newLevel, 2);
    assert.equal(run3.leveledUp, true);
    assert.equal(bp.getPoints(), 220);
    assert.equal(bp.getLevel(), 2);
    assert.equal(bp.getPointsInCurrentLevel(), 20);

    // Level up directly to max level 15 (2800 points)
    prog.data.battlePass.points = 2800;
    assert.equal(bp.getLevel(), 15);
    assert.equal(bp.getProgressPercent(), 100);
    assert.equal(bp.isLevelUnlocked(15), true);
  });

  test('Claiming rewards adds coins and marks level as claimed', () => {
    const prog = ProgressionManager.getInstance();
    prog.data.walletCoins = 500;
    prog.data.battlePass = {
      seasonId: 'season_1',
      points: 400, // Reached level 3 (200 * 2)
      claimedLevels: []
    };

    const bp = BattlePassManager.getInstance();
    assert.equal(bp.getLevel(), 3);
    assert.equal(bp.canClaim(1), true);
    assert.equal(bp.canClaim(2), true);
    assert.equal(bp.canClaim(3), true);
    assert.equal(bp.canClaim(4), false, 'Level 4 is locked');

    // Claim level 1 (gives 100 coins)
    const claim1 = bp.claimReward(1);
    assert.equal(claim1.success, true);
    assert.equal(claim1.reward?.coins, 100);
    assert.equal(prog.data.walletCoins, 600);
    assert.equal(bp.isLevelClaimed(1), true);
    assert.equal(bp.canClaim(1), false);

    // Attempting to claim again fails
    const claimAgain = bp.claimReward(1);
    assert.equal(claimAgain.success, false);

    // Attempting to claim locked level fails
    const claimLocked = bp.claimReward(4);
    assert.equal(claimLocked.success, false);

    // Claim all available (claims level 2 and 3)
    const claimAll = bp.claimAllAvailable();
    assert.equal(claimAll.claimedCount, 2);
    assert.equal(claimAll.totalCoins, 350); // 150 + 200
    assert.equal(prog.data.walletCoins, 950);
    assert.equal(bp.isLevelClaimed(2), true);
    assert.equal(bp.isLevelClaimed(3), true);
  });
});
