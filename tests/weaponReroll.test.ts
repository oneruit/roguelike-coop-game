import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canRerollWeaponOptions,
  filterAndShuffleForReroll,
  selectWeaponUpgradeOptions
} from '../game/src/ui/selectWeaponUpgradeOptions';

test('Weapon Reroll System', async (t) => {
  await t.test('canRerollWeaponOptions returns true when all 3 choices are new weapons', () => {
    const threeNewWeapons = [
      { id: 'new_bow' },
      { id: 'new_kukri' },
      { id: 'new_orbiting_barrier' }
    ];
    assert.equal(canRerollWeaponOptions(threeNewWeapons), true);
  });

  await t.test('canRerollWeaponOptions returns false if any option is an upgrade', () => {
    const withOneUpgrade = [
      { id: 'upgrade_bow' },
      { id: 'new_kukri' },
      { id: 'new_orbiting_barrier' }
    ];
    assert.equal(canRerollWeaponOptions(withOneUpgrade), false);

    const allUpgrades = [
      { id: 'upgrade_bow' },
      { id: 'upgrade_kukri' },
      { id: 'upgrade_orbiting_barrier' }
    ];
    assert.equal(canRerollWeaponOptions(allUpgrades), false);
  });

  await t.test('canRerollWeaponOptions returns false if less than 3 options are offered', () => {
    const twoNewWeapons = [
      { id: 'new_bow' },
      { id: 'new_kukri' }
    ];
    assert.equal(canRerollWeaponOptions(twoNewWeapons), false);

    const singleFallbackReward = [
      { id: 'max_arsenal_reward' }
    ];
    assert.equal(canRerollWeaponOptions(singleFallbackReward), false);

    assert.equal(canRerollWeaponOptions([]), false);
  });

  await t.test('filterAndShuffleForReroll prioritizes fresh options over previously rejected options', () => {
    const pool = [
      { id: 'new_bow' },
      { id: 'new_kukri' },
      { id: 'new_orbiting_barrier' },
      { id: 'upgrade_heavy_colt' },
      { id: 'new_katana_slash' },
      { id: 'new_fireball' }
    ];

    const excludedIds = new Set(['new_bow', 'new_kukri', 'new_orbiting_barrier']);
    const rerolled = filterAndShuffleForReroll(pool, excludedIds);

    // All 6 items must be preserved
    assert.equal(rerolled.length, 6);
    const rerolledIds = new Set(rerolled.map((x) => x.id));
    assert.equal(rerolledIds.size, 6);

    // The first 3 items MUST be the fresh items (upgrade_heavy_colt, new_katana_slash, new_fireball)
    const firstThreeIds = rerolled.slice(0, 3).map((x) => x.id);
    for (const id of firstThreeIds) {
      assert.equal(excludedIds.has(id), false, `Option ${id} should be fresh, not one of the excluded options`);
    }

    // The remaining 3 items are the excluded ones
    const lastThreeIds = rerolled.slice(3).map((x) => x.id);
    for (const id of lastThreeIds) {
      assert.equal(excludedIds.has(id), true, `Option ${id} should be one of the excluded options`);
    }
  });

  await t.test('filterAndShuffleForReroll handles empty or full excluded sets gracefully', () => {
    const pool = [
      { id: 'new_bow' },
      { id: 'new_kukri' },
      { id: 'new_orbiting_barrier' }
    ];

    // Empty excluded set
    const withEmpty = filterAndShuffleForReroll(pool, new Set());
    assert.equal(withEmpty.length, 3);
    assert.equal(new Set(withEmpty.map((x) => x.id)).size, 3);

    // Undefined excluded set
    const withUndefined = filterAndShuffleForReroll(pool);
    assert.equal(withUndefined.length, 3);

    // All items excluded (e.g. pool only has 3 items)
    const allExcluded = new Set(['new_bow', 'new_kukri', 'new_orbiting_barrier']);
    const withAllExcluded = filterAndShuffleForReroll(pool, allExcluded);
    assert.equal(withAllExcluded.length, 3);
    assert.equal(new Set(withAllExcluded.map((x) => x.id)).size, 3);
  });

  await t.test('End-to-end reroll flow for standard hero', () => {
    const pool = [
      { id: 'new_bow' },
      { id: 'new_kukri' },
      { id: 'new_orbiting_barrier' },
      { id: 'upgrade_colt' },
      { id: 'new_flail' },
      { id: 'new_fireball' }
    ];

    // Initial roll dealt 3 new weapons
    const roll1 = [{ id: 'new_bow' }, { id: 'new_kukri' }, { id: 'new_orbiting_barrier' }];
    assert.equal(canRerollWeaponOptions(roll1), true);

    // Player triggers reroll
    const excludedRoll1 = new Set(roll1.map((x) => x.id));
    const rerolledPool = filterAndShuffleForReroll(pool, excludedRoll1);
    const roll2 = selectWeaponUpgradeOptions(rerolledPool, 'ronin');

    // Roll 2 contains 3 choices, none of which were in Roll 1
    assert.equal(roll2.length, 3);
    for (const opt of roll2) {
      assert.equal(excludedRoll1.has(opt.id), false, `Roll 2 option ${opt.id} should not be from Roll 1`);
    }

    // Since roll2 contains 'upgrade_colt', it no longer qualifies for reroll
    assert.ok(roll2.some((opt) => opt.id === 'upgrade_colt'));
    assert.equal(canRerollWeaponOptions(roll2), false);
  });

  await t.test('End-to-end reroll flow for Invoker with maxed weapons', () => {
    // When all current weapons are maxed, Invoker gets 3 new spells
    const maxedInvokerPool = [
      { id: 'new_invoker_emp' },
      { id: 'new_invoker_tornado' },
      { id: 'new_invoker_sun_strike' },
      { id: 'new_invoker_chaos_meteor' },
      { id: 'new_invoker_alacrity' },
      { id: 'new_invoker_deafening_blast' }
    ];

    const roll1 = [{ id: 'new_invoker_emp' }, { id: 'new_invoker_tornado' }, { id: 'new_invoker_sun_strike' }];
    assert.equal(canRerollWeaponOptions(roll1), true);

    const excludedRoll1 = new Set(roll1.map((x) => x.id));
    const rerolledPool = filterAndShuffleForReroll(maxedInvokerPool, excludedRoll1);
    const roll2 = selectWeaponUpgradeOptions(rerolledPool, 'invoker');

    assert.equal(roll2.length, 3);
    // All choices in roll2 should be from the remaining 3 spells
    for (const opt of roll2) {
      assert.equal(excludedRoll1.has(opt.id), false);
    }
    // And roll2 still qualifies for reroll if desired
    assert.equal(canRerollWeaponOptions(roll2), true);
  });
});
