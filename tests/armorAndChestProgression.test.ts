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

test('Armor System - Base stats and Phase Carapace scaling up to 350 cap', () => {
  const getZeroItems = (_id: RiftItemId) => 0;

  // 1. Base player stats: 100 base shield, 3.0s regen delay, 1.0x regen multiplier
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

  assert.equal(baseStats.maxShield, 100, 'Base maxShield must be 100');
  assert.equal(baseStats.shieldRegenDelay, 3.0, 'Base shieldRegenDelay must be 3.0 seconds');
  assert.equal(baseStats.shieldRegenMultiplier, 1.0, 'Base shieldRegenMultiplier must be 1.0');

  // 2. 1 stack of Phase Carapace -> 150 shield
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
  assert.equal(stats1.maxShield, 150, '1 stack of Phase Carapace should give 150 max shield');

  // 3. 5 stacks of Phase Carapace -> 350 shield (Cap)
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
  assert.equal(stats5.maxShield, 350, '5 stacks of Phase Carapace should hit the 350 max shield cap');

  // 4. Over cap (e.g. 8 stacks) -> strictly capped at 350
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
  assert.equal(stats8.maxShield, 350, 'Over-stacked Phase Carapace must not exceed 350');
});

test('Armor System - Aegis Exoskeleton accelerates regen delay and multiplier', () => {
  // 1. 2 stacks of Aegis Exoskeleton (-0.5s delay, +50% speed)
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

  assert.equal(stats.shieldRegenDelay, 2.5, '2 stacks of Aegis Exoskeleton should reduce delay from 3.0s to 2.5s');
  assert.equal(stats.shieldRegenMultiplier, 1.5, '2 stacks of Aegis Exoskeleton should increase regen speed to 1.5x');

  // 2. Max 5 stacks -> delay reduced to 1.75s, 2.25x speed
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
  assert.equal(statsMax.shieldRegenDelay, 1.75, '5 stacks of Aegis Exoskeleton should reduce delay to 1.75s');
  assert.equal(statsMax.shieldRegenMultiplier, 2.25, '5 stacks of Aegis Exoskeleton should give 2.25x regen speed');
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

  // Predictable RNG that triggers the < 0.65 check
  const fakeRng = () => 0.1;

  const [item1, item2] = rollChestDropPair(1, fakeRng, false, isItemMaxedUncapped, 'large');
  assert.equal(item1.id, 'phase_carapace', 'Large chest should offer Phase Carapace when player is below 350 armor');
  assert.notEqual(item2.id, 'phase_carapace', 'Second drop must be distinct from first drop');

  // When player has reached 350 armor (isItemMaxed returns true)
  const isItemMaxedCapped = (id: string) => id === 'phase_carapace';
  const [cappedItem1, cappedItem2] = rollChestDropPair(1, fakeRng, false, isItemMaxedCapped, 'large');
  assert.notEqual(cappedItem1.id, 'phase_carapace', 'Large chest should NOT offer Phase Carapace once armor is capped at 350');
  assert.notEqual(cappedItem2.id, 'phase_carapace', 'Large chest should NOT offer Phase Carapace once armor is capped at 350');
});
