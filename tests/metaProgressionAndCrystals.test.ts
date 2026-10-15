import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import {
  MetaProgression,
  META_BRANCHES,
  type MetaBranchId
} from '../game/src/meta/MetaProgression';
import { DEFAULT_BALANCE } from '../game/src/balance/defaultBalance';
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

test('MetaProgression - 3 branches with 10 talents each, 5 ranks max per talent', () => {
  const branches: MetaBranchId[] = ['offense', 'defense', 'utility'];
  assert.equal(branches.length, 3, 'Exactly 3 meta progression branches');

  let totalTalentsCount = 0;
  for (const b of branches) {
    const def = META_BRANCHES[b];
    assert.equal(def.talentIds.length, 10, `${b} has exactly 10 talents`);
    totalTalentsCount += def.talentIds.length;

    const talents = metaProgressionTalents(b);
    assert.equal(talents.length, 10, `${b} returns 10 valid TalentBalanceConfig objects`);

    for (const t of talents) {
      assert.equal(t.maxLevel, 5, `Talent ${t.id} has maxLevel = 5`);
      assert.equal(t.costPerLevel.length, 5, `Talent ${t.id} has 5 cost tiers`);
      assert.equal(t.costPerLevel[0], 15, `Rank 1 cost is 15 crystals`);
      assert.equal(t.costPerLevel[4], 240, `Rank 5 cost is 240 crystals`);
      assert.ok(t.bonusPerLevel > 0, `Talent ${t.id} has positive bonus per level`);
      assert.ok(t.name.length > 0, `Talent ${t.id} has localized name`);
    }
  }

  assert.equal(totalTalentsCount, 30, 'Total of 30 unique talents in meta progression');
  assert.equal(Object.keys(DEFAULT_BALANCE.talents).length, 30, 'DEFAULT_BALANCE.talents has 30 entries');
});

function metaProgressionTalents(branch: MetaBranchId) {
  const meta = MetaProgression.getInstance();
  return meta.getBranchTalents(branch);
}

test('MetaProgression - Upgrading individual talents, cost deduction, and max rank capping', () => {
  const meta = MetaProgression.getInstance();
  meta.respecAll();

  // Give enough crystals for testing
  meta.addCrystals(5000);
  const startCrystals = meta.getCrystals();

  // Test offense_damage (Rank 1 costs 15)
  assert.equal(meta.getTalentLevel('offense_damage'), 0);
  assert.equal(meta.getTalentNextCost('offense_damage'), 15);
  assert.equal(meta.canAffordTalent('offense_damage'), true);

  const upgraded1 = meta.upgradeTalent('offense_damage');
  assert.equal(upgraded1, true);
  assert.equal(meta.getTalentLevel('offense_damage'), 1);
  assert.equal(meta.getCrystals(), startCrystals - 15);

  // Upgrade to max (rank 5)
  for (let i = 2; i <= 5; i++) {
    const success = meta.upgradeTalent('offense_damage');
    assert.equal(success, true, `Upgrade to rank ${i} succeeded`);
  }

  assert.equal(meta.getTalentLevel('offense_damage'), 5);
  assert.equal(meta.getTalentNextCost('offense_damage'), null, 'Max rank has null next cost');
  assert.equal(meta.canAffordTalent('offense_damage'), false, 'Cannot afford upgrade when at max');
  assert.equal(meta.upgradeTalent('offense_damage'), false, 'Cannot upgrade beyond max rank 5');
});

test('MetaProgression - Respec refunds 100% of invested crystals across arbitrary allocations', () => {
  const meta = MetaProgression.getInstance();
  meta.respecAll();

  meta.addCrystals(2000);
  const baseline = meta.getCrystals();

  // Upgrade offense_damage to rank 3 (15 + 35 + 75 = 125)
  meta.upgradeTalent('offense_damage');
  meta.upgradeTalent('offense_damage');
  meta.upgradeTalent('offense_damage');

  // Upgrade defense_max_hp to rank 2 (15 + 35 = 50)
  meta.upgradeTalent('defense_max_hp');
  meta.upgradeTalent('defense_max_hp');

  // Upgrade utility_speed to rank 1 (15)
  meta.upgradeTalent('utility_speed');

  const expectedSpent = 125 + 50 + 15; // 190
  const totalSpent = meta.getTotalSpentCrystals();
  assert.equal(totalSpent, expectedSpent, 'Total spent equals sum of purchased ranks');

  const refunded = meta.respecAll();
  assert.equal(refunded, expectedSpent, 'Refunded crystals matches spent amount');
  assert.equal(meta.getCrystals(), baseline, 'Wallet balance is fully restored');
  assert.equal(meta.getTalentLevel('offense_damage'), 0, 'offense_damage reset to 0');
  assert.equal(meta.getTalentLevel('defense_max_hp'), 0, 'defense_max_hp reset to 0');
  assert.equal(meta.getTalentLevel('utility_speed'), 0, 'utility_speed reset to 0');
});

test('MetaProgression - Bonuses calculation matches active talent ranks', () => {
  const meta = MetaProgression.getInstance();
  meta.respecAll();
  meta.addCrystals(10000);

  // Upgrade damage 5 times: 5 * 0.03 = +15%
  for (let i = 0; i < 5; i++) meta.upgradeTalent('offense_damage');
  // Upgrade crit chance 5 times: 5 * 0.015 = +7.5%
  for (let i = 0; i < 5; i++) meta.upgradeTalent('offense_crit_chance');
  // Upgrade max hp 5 times: 5 * 15 = +75 HP
  for (let i = 0; i < 5; i++) meta.upgradeTalent('defense_max_hp');
  // Upgrade speed 5 times: 5 * 0.025 = +12.5%
  for (let i = 0; i < 5; i++) meta.upgradeTalent('utility_speed');
  // Upgrade pickup radius 5 times: 5 * 0.8 = +4.0m
  for (let i = 0; i < 5; i++) meta.upgradeTalent('utility_pickup_radius');

  const bonuses = meta.getBonuses();
  assert.ok(Math.abs(bonuses.damageMultiplierBonus - 0.15) < 1e-4, '+15% damage at rank 5');
  assert.ok(Math.abs(bonuses.critChanceBonus - 0.075) < 1e-4, '+7.5% crit chance at rank 5');
  assert.equal(bonuses.maxHpBonus, 75, '+75 max HP at rank 5');
  assert.ok(Math.abs(bonuses.speedMultiplierBonus - 0.125) < 1e-4, '+12.5% speed at rank 5');
  assert.ok(Math.abs(bonuses.pickupRadiusBonus - 4.0) < 1e-4, '+4.0m pickup radius at rank 5');
});

test('Player inherits MetaProgression bonuses globally across characters', () => {
  const meta = MetaProgression.getInstance();
  meta.respecAll();
  meta.addCrystals(10000);

  for (let i = 0; i < 5; i++) meta.upgradeTalent('offense_damage');
  for (let i = 0; i < 5; i++) meta.upgradeTalent('defense_max_hp');
  for (let i = 0; i < 5; i++) meta.upgradeTalent('utility_pickup_radius');

  const scene = new Scene();
  const ronin = new Player(scene, 'ronin');
  const valkyrie = new Player(scene, 'valkyrie');

  // Defense bonus (+75 HP)
  assert.ok(ronin.maxHp >= 175, 'Ronin base HP received +75 meta bonus');
  assert.ok(valkyrie.maxHp >= 205, 'Valkyrie base HP received +75 meta bonus');

  // Utility bonus (+4.0m pickup radius)
  assert.ok(ronin.pickupRadius >= 8.0, 'Pickup radius includes +4.0m meta bonus');

  // Offense bonus (+15% damage)
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
