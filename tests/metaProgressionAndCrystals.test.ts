import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import {
  MetaProgression,
  META_BRANCHES,
  UPGRADE_TIER_COSTS,
  type MetaBranchId
} from '../game/src/meta/MetaProgression';
import { Player } from '../game/src/entities/Player';
import { Gem } from '../game/src/drops/Gem';
import { PASSIVE_BUFFS, PASSIVE_BUFF_IDS } from '../game/src/drops/PassiveBuffs';

test('MetaProgression - Initial state and crystal management', () => {
  const meta = MetaProgression.getInstance();
  meta.respecAll();
  const initial = meta.getCrystals();

  meta.addCrystals(500);
  assert.equal(meta.getCrystals(), initial + 500, 'Adding crystals increases balance');
  assert.ok(meta.getLifetimeCrystals() >= 500, 'Lifetime crystals track cumulative total');
});

test('MetaProgression - 3 branches with 10 tiers each and cost progression', () => {
  const branches: MetaBranchId[] = ['offense', 'defense', 'utility'];
  assert.equal(branches.length, 3, 'Exactly 3 meta progression branches');

  for (const b of branches) {
    const def = META_BRANCHES[b];
    assert.equal(def.maxTier, 10, `${b} has 10 max tiers`);
    assert.equal(def.tiers.length, 10, `${b} defines 10 tier descriptions`);
  }

  assert.equal(UPGRADE_TIER_COSTS.length, 10, 'UPGRADE_TIER_COSTS has 10 costs');
  assert.equal(UPGRADE_TIER_COSTS[0], 10, 'Tier 1 cost is 10 crystals');
  assert.equal(UPGRADE_TIER_COSTS[9], 700, 'Tier 10 cost is 700 crystals');
});

test('MetaProgression - Upgrading branches, cost deduction, and max tier capping', () => {
  const meta = MetaProgression.getInstance();
  meta.respecAll();

  // Give enough crystals for testing
  meta.addCrystals(5000);
  const startCrystals = meta.getCrystals();

  // Offense Tier 1 costs 10
  assert.equal(meta.getUpgradeLevel('offense'), 0);
  assert.equal(meta.getNextTierCost('offense'), 10);
  assert.equal(meta.canAffordUpgrade('offense'), true);

  const upgraded1 = meta.upgradeBranch('offense');
  assert.equal(upgraded1, true);
  assert.equal(meta.getUpgradeLevel('offense'), 1);
  assert.equal(meta.getCrystals(), startCrystals - 10);

  // Upgrade to max (level 10)
  for (let i = 2; i <= 10; i++) {
    const success = meta.upgradeBranch('offense');
    assert.equal(success, true, `Upgrade to tier ${i} succeeded`);
  }

  assert.equal(meta.getUpgradeLevel('offense'), 10);
  assert.equal(meta.getNextTierCost('offense'), null, 'Max level has null next tier cost');
  assert.equal(meta.canAffordUpgrade('offense'), false, 'Cannot afford upgrade when at max');
  assert.equal(meta.upgradeBranch('offense'), false, 'Cannot upgrade beyond max tier');
});

test('MetaProgression - Respec refunds 100% of invested crystals', () => {
  const meta = MetaProgression.getInstance();
  meta.respecAll();

  meta.addCrystals(1000);
  const baseline = meta.getCrystals();

  // Upgrade offense to level 3 (costs 10 + 25 + 50 = 85)
  meta.upgradeBranch('offense');
  meta.upgradeBranch('offense');
  meta.upgradeBranch('offense');

  // Upgrade defense to level 2 (costs 10 + 25 = 35)
  meta.upgradeBranch('defense');
  meta.upgradeBranch('defense');

  // Upgrade utility to level 1 (costs 10)
  meta.upgradeBranch('utility');

  const totalSpent = meta.getTotalSpentCrystals();
  assert.equal(totalSpent, 85 + 35 + 10, 'Total spent equals sum of tier costs');

  const refunded = meta.respecAll();
  assert.equal(refunded, 130, 'Refunded crystals matches spent amount');
  assert.equal(meta.getCrystals(), baseline, 'Wallet balance is fully restored');
  assert.equal(meta.getUpgradeLevel('offense'), 0, 'Offense level reset to 0');
  assert.equal(meta.getUpgradeLevel('defense'), 0, 'Defense level reset to 0');
  assert.equal(meta.getUpgradeLevel('utility'), 0, 'Utility level reset to 0');
});

test('MetaProgression - Bonuses calculation at level 10', () => {
  const meta = MetaProgression.getInstance();
  meta.respecAll();
  meta.addCrystals(10000);

  for (let i = 0; i < 10; i++) meta.upgradeBranch('offense');
  for (let i = 0; i < 10; i++) meta.upgradeBranch('defense');
  for (let i = 0; i < 10; i++) meta.upgradeBranch('utility');

  const bonuses = meta.getBonuses();
  assert.ok(Math.abs(bonuses.damageMultiplierBonus - 0.30) < 1e-4, '+30% damage at level 10');
  assert.ok(Math.abs(bonuses.critChanceBonus - 0.10) < 1e-4, '+10% crit chance at level 10');
  assert.ok(Math.abs(bonuses.critDamageMultBonus - 0.35) < 1e-4, '+35% crit damage at level 10');
  assert.ok(Math.abs(bonuses.cooldownReductionBonus - 0.06) < 1e-4, '-6% weapon cooldown at level 10');
  assert.equal(bonuses.maxHpBonus, 100, '+100 max HP at level 10');
  assert.ok(Math.abs(bonuses.damageReductionBonus - 0.10) < 1e-4, '-10% damage taken at level 10');
  assert.ok(Math.abs(bonuses.hpRegenBonus - 3.5) < 1e-4, '+3.5 HP/s regen at level 10');
  assert.ok(Math.abs(bonuses.speedMultiplierBonus - 0.20) < 1e-4, '+20% speed at level 10');
  assert.ok(Math.abs(bonuses.pickupRadiusBonus - 5.0) < 1e-4, '+5m pickup radius at level 10');
  assert.ok(Math.abs(bonuses.crystalDropBonus - 0.30) < 1e-4, '+30% crystal drop rate at level 10');
});

test('Player inherits MetaProgression bonuses globally across characters', () => {
  const meta = MetaProgression.getInstance();
  meta.respecAll();
  meta.addCrystals(10000);

  // Upgrade offense to level 5 (+15% dmg, +3% crit), defense to level 5 (+50 HP, -5% dmg, +1.0 regen), utility to level 5 (+10% spd, +2.5m pickup)
  for (let i = 0; i < 5; i++) meta.upgradeBranch('offense');
  for (let i = 0; i < 5; i++) meta.upgradeBranch('defense');
  for (let i = 0; i < 5; i++) meta.upgradeBranch('utility');

  const scene = new Scene();
  const ronin = new Player(scene, 'ronin');
  const valkyrie = new Player(scene, 'valkyrie');

  // Defense bonus (+50 HP)
  assert.ok(ronin.maxHp > 100, 'Ronin base HP received meta bonus');
  assert.ok(valkyrie.maxHp > 130, 'Valkyrie base HP received meta bonus');

  // Utility bonus (+2.5m pickup radius)
  assert.ok(ronin.pickupRadius >= 6.5, 'Pickup radius includes +2.5m meta bonus');

  // Offense bonus (damage multiplier includes +15% meta damage)
  assert.ok(ronin.passiveDamageMultiplier >= 1.15, 'Passive damage multiplier includes +15% meta bonus');

  // Clean up
  meta.respecAll();
});

test('Crystal Gem Drop - Initialized correctly', () => {
  const gem = new Gem('crystal', { x: 5, y: 0, z: 10 } as any);
  assert.equal(gem.type, 'crystal', 'Gem type is crystal');
  assert.equal(gem.crystalValue, 1, 'Crystal gem grants 1 crystal currency');
  assert.equal(gem.xpValue, 5, 'Crystal gem also gives minor XP');
  assert.ok(gem.mesh.children.length >= 2, 'Mesh contains crystal and ring');
});

test('Legacy passives cleanup - Unused legacy passives are removed', () => {
  assert.equal(PASSIVE_BUFF_IDS.length, 7, 'PASSIVE_BUFF_IDS has exactly 7 passives');
  assert.ok(PASSIVE_BUFF_IDS.includes('stat_amplifier'));
  assert.ok(PASSIVE_BUFF_IDS.includes('stat_speed_boots'));
  assert.ok(PASSIVE_BUFF_IDS.includes('stat_flask'));
  assert.ok(PASSIVE_BUFF_IDS.includes('stat_magnet'));
  assert.ok(PASSIVE_BUFF_IDS.includes('stat_amulet'));
  assert.ok(PASSIVE_BUFF_IDS.includes('stat_vest'));
  assert.ok(PASSIVE_BUFF_IDS.includes('stat_watch'));

  // Ensure legacy aliases are NOT in PASSIVE_BUFF_IDS or PASSIVE_BUFFS
  assert.equal((PASSIVE_BUFF_IDS as any).includes('stat_lasso'), false);
  assert.equal((PASSIVE_BUFF_IDS as any).includes('stat_spurs'), false);
  assert.equal((PASSIVE_BUFF_IDS as any).includes('stat_sheriff_star'), false);
  assert.equal((PASSIVE_BUFFS as any)['stat_lasso'], undefined);
  assert.equal((PASSIVE_BUFFS as any)['stat_spurs'], undefined);
  assert.equal((PASSIVE_BUFFS as any)['stat_sheriff_star'], undefined);
});
