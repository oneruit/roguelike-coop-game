import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerStats } from '../game/src/mechanics/player/PlayerStats';
import {
  RIFT_ITEMS,
  COMMON_ITEMS,
  UNCOMMON_ITEMS,
  RARE_ITEMS,
  rollChestDropPair,
  type RiftItemId
} from '../game/src/items/RiftItemSystem';

test('Armor System - Base stats and Phase Carapace scaling up to 160 cap', () => {
  const getZeroItems = (_id: RiftItemId) => 0;

  // 1. Base player stats: 35 base shield, 5.0s regen delay, 1.0x regen multiplier
  const baseStats = PlayerStats.recalculate(
    100,
    5.0,
    1.0,
    new Map(),
    getZeroItems,
    { amplifierCount: 0, speedBootsCount: 0, flaskCount: 0, magnetCount: 0, amuletCount: 0, vestCount: 0, watchCount: 0, mightElixirCount: 0 },
    {},
    []
  );

  assert.equal(baseStats.maxShield, 35, 'Base maxShield must be 35');
  assert.equal(baseStats.shieldRegenDelay, 5.0, 'Base shieldRegenDelay must be 5.0 seconds');
  assert.equal(baseStats.shieldRegenMultiplier, 1.0, 'Base shieldRegenMultiplier must be 1.0');

  // 2. 1 stack of Phase Carapace -> 60 shield (35 + 25)
  const stats1 = PlayerStats.recalculate(
    100,
    5.0,
    1.0,
    new Map(),
    (id) => (id === 'phase_carapace' ? 1 : 0),
    { amplifierCount: 0, speedBootsCount: 0, flaskCount: 0, magnetCount: 0, amuletCount: 0, vestCount: 0, watchCount: 0, mightElixirCount: 0 },
    {},
    []
  );
  assert.equal(stats1.maxShield, 60, '1 stack of Phase Carapace should give 60 max shield');

  // 3. 5 stacks of Phase Carapace -> 160 shield (Cap: 35 + 125 = 160)
  const stats5 = PlayerStats.recalculate(
    100,
    5.0,
    1.0,
    new Map(),
    (id) => (id === 'phase_carapace' ? 5 : 0),
    { amplifierCount: 0, speedBootsCount: 0, flaskCount: 0, magnetCount: 0, amuletCount: 0, vestCount: 0, watchCount: 0, mightElixirCount: 0 },
    {},
    []
  );
  assert.equal(stats5.maxShield, 160, '5 stacks of Phase Carapace should hit the 160 max shield cap');

  // 4. Over cap (e.g. 8 stacks) -> strictly capped at 160
  const stats8 = PlayerStats.recalculate(
    100,
    5.0,
    1.0,
    new Map(),
    (id) => (id === 'phase_carapace' ? 8 : 0),
    { amplifierCount: 0, speedBootsCount: 0, flaskCount: 0, magnetCount: 0, amuletCount: 0, vestCount: 0, watchCount: 0, mightElixirCount: 0 },
    {},
    []
  );
  assert.equal(stats8.maxShield, 160, 'Over-stacked Phase Carapace must not exceed 160');

  // 5. Meta progression shield barrier bonus (+15 shield)
  const metaStats = PlayerStats.recalculate(
    100,
    5.0,
    1.0,
    new Map(),
    getZeroItems,
    { amplifierCount: 0, speedBootsCount: 0, flaskCount: 0, magnetCount: 0, amuletCount: 0, vestCount: 0, watchCount: 0, mightElixirCount: 0 },
    {},
    [],
    { shieldBarrierBonus: 15 } as any
  );
  assert.equal(metaStats.maxShield, 50, 'Base 35 + 15 meta bonus should give 50 max shield');
});

test('Armor System - Aegis Exoskeleton accelerates regen delay and multiplier', () => {
  // 1. 2 stacks of Aegis Exoskeleton (-0.6s delay, +30% speed)
  const stats = PlayerStats.recalculate(
    100,
    5.0,
    1.0,
    new Map(),
    (id) => (id === 'aegis_exoskeleton' ? 2 : 0),
    { amplifierCount: 0, speedBootsCount: 0, flaskCount: 0, magnetCount: 0, amuletCount: 0, vestCount: 0, watchCount: 0, mightElixirCount: 0 },
    {},
    []
  );

  assert.equal(stats.shieldRegenDelay, 4.4, '2 stacks of Aegis Exoskeleton should reduce delay from 5.0s to 4.4s');
  assert.equal(stats.shieldRegenMultiplier, 1.3, '2 stacks of Aegis Exoskeleton should increase regen speed to 1.3x');

  // 2. Max 5 stacks -> delay reduced to min 3.5s, 1.75x speed
  const statsMax = PlayerStats.recalculate(
    100,
    5.0,
    1.0,
    new Map(),
    (id) => (id === 'aegis_exoskeleton' ? 5 : 0),
    { amplifierCount: 0, speedBootsCount: 0, flaskCount: 0, magnetCount: 0, amuletCount: 0, vestCount: 0, watchCount: 0, mightElixirCount: 0 },
    {},
    []
  );
  assert.equal(statsMax.shieldRegenDelay, 3.5, '5 stacks of Aegis Exoskeleton should hit the 3.5s minimum delay');
  assert.equal(statsMax.shieldRegenMultiplier, 1.75, '5 stacks of Aegis Exoskeleton should give 1.75x regen speed');
});

test('Item Pool - aegis_battery removed, phase_carapace and aegis_exoskeleton registered', () => {
  // 1. aegis_battery must NOT exist anywhere in pools
  assert.equal((RIFT_ITEMS as any)['aegis_battery'], undefined, 'aegis_battery must be removed from RIFT_ITEMS');
  assert.equal(UNCOMMON_ITEMS.includes('aegis_battery' as any), false, 'aegis_battery must not be in UNCOMMON_ITEMS');

  // 2. aegis_exoskeleton must be present in UNCOMMON_ITEMS
  assert.ok(RIFT_ITEMS['aegis_exoskeleton'], 'aegis_exoskeleton must exist in RIFT_ITEMS');
  assert.equal(RIFT_ITEMS['aegis_exoskeleton'].rarity, 'uncommon');
  assert.ok(UNCOMMON_ITEMS.includes('aegis_exoskeleton'), 'aegis_exoskeleton must be in UNCOMMON_ITEMS');

  // 3. phase_carapace must be present in RARE_ITEMS
  assert.ok(RIFT_ITEMS['phase_carapace'], 'phase_carapace must exist in RIFT_ITEMS');
  assert.equal(RIFT_ITEMS['phase_carapace'].rarity, 'rare');
  assert.ok(RARE_ITEMS.includes('phase_carapace'), 'phase_carapace must be in RARE_ITEMS');
});

test('Chest Drops - Large Chests prioritize Phase Carapace until capped', () => {
  // When player has not maxed Phase Carapace (isItemMaxed returns false)
  const isItemMaxedUncapped = (id: string) => id === 'phase_carapace' ? false : false;

  // Predictable RNG that triggers the < 0.30 check
  const fakeRng = () => 0.1;

  const [item1, item2] = rollChestDropPair(1, fakeRng, false, isItemMaxedUncapped, 'large');
  assert.equal(item1.id, 'phase_carapace', 'Large chest should offer Phase Carapace when player is below 160 armor');
  assert.notEqual(item2.id, 'phase_carapace', 'Second drop must be distinct from first drop');

  // When player has reached 160 armor (isItemMaxed returns true)
  const isItemMaxedCapped = (id: string) => id === 'phase_carapace';
  const [cappedItem1, cappedItem2] = rollChestDropPair(1, fakeRng, false, isItemMaxedCapped, 'large');
  assert.notEqual(cappedItem1.id, 'phase_carapace', 'Large chest should NOT offer Phase Carapace once armor is capped at 160');
  assert.notEqual(cappedItem2.id, 'phase_carapace', 'Large chest should NOT offer Phase Carapace once armor is capped at 160');
});
