import test from 'node:test';
import assert from 'node:assert/strict';
import { BloodBatsWeapon, getBloodBatsCount } from '../game/src/combat/weapons/BloodBatsWeapon';
import { SimBloodBatsWeapon } from '../game/src/sim/weapons/SimBloodBatsWeapon';
import { DEFAULT_BALANCE } from '../game/src/balance/defaultBalance';

test('BloodBatsWeapon - Balance configuration has 12 max levels', () => {
  const cfg = DEFAULT_BALANCE.weapons.blood_bats;
  assert.equal(cfg.maxLevel, 12, 'Blood bats maxLevel must be 12 in default balance');
  assert.equal(cfg.damage, 18);
  assert.equal(cfg.count, 4);
  assert.equal(cfg.bleedDps, 14);
  assert.ok(cfg.notes.includes('12-м уровне'));
});

test('BloodBatsWeapon - 12-level progression and stat scaling (1 to 8 equivalent to 1 to 12)', () => {
  const bats = new BloodBatsWeapon();
  assert.equal(bats.maxLevel, 12);
  assert.equal(bats.level, 1);
  assert.equal(bats.tier, 3);
  assert.equal(bats.projectileCount, 4);
  assert.equal(bats.damage, 18);
  assert.equal(bats.bleedDps, 14);

  let prevCount = bats.projectileCount;
  for (let lvl = 2; lvl <= 12; lvl++) {
    bats.upgrade();
    assert.equal(bats.level, lvl);
    assert.ok(
      bats.projectileCount >= prevCount,
      `Bat count at level ${lvl} (${bats.projectileCount}) should be >= previous (${prevCount})`
    );
    prevCount = bats.projectileCount;
  }

  // At max level 12: exactly 24 bats, 53 damage, 42 bleed DPS (matching old level 8 cap)
  assert.equal(bats.level, 12);
  assert.equal(bats.projectileCount, 24, 'Blood bats must reach exactly 24 bats at level 12');
  assert.equal(bats.damage, 53, 'Damage must scale to 53 at level 12 (equivalent of old lvl 8)');
  assert.equal(bats.bleedDps, 42, 'Bleed DPS must scale to 42 at level 12 (equivalent of old lvl 8)');

  // Attempting to upgrade past maxLevel does nothing
  bats.upgrade();
  assert.equal(bats.level, 12);
});

test('BloodBatsWeapon - Tier 2 Awakening (x2 damage and bleed multiplier)', () => {
  const bats = new BloodBatsWeapon();
  // Max out Tier 3
  while (bats.level < bats.maxLevel) {
    bats.upgrade();
  }
  assert.equal(bats.level, 12);

  // Awaken to Tier 2
  bats.awakenGrade();
  assert.equal(bats.awakenedGrade, 1);
  assert.equal(bats.tier, 2);
  assert.equal(bats.tierName, 'Тир 2');
  assert.equal(bats.getGradePrefix(), '[ТИР 2 • x2] ');
  assert.equal(bats.level, 1, 'Awakening resets level to 1');

  // At Tier 2 level 1: damage is doubled (18 * 2 = 36), bleed is doubled (14 * 2 = 28), bats reset to 4
  assert.equal(bats.damage, 36, 'Tier 2 level 1 damage must be doubled (x2)');
  assert.equal(bats.bleedDps, 28, 'Tier 2 level 1 bleed DPS must be doubled (x2)');
  assert.equal(bats.projectileCount, 4, 'Bat count resets to 4 at level 1');

  // Upgrade through Tier 2 to level 12
  while (bats.level < bats.maxLevel) {
    bats.upgrade();
  }
  assert.equal(bats.level, 12);
  assert.equal(bats.damage, 106, 'Tier 2 level 12 damage must be 106 (53 * 2)');
  assert.equal(bats.bleedDps, 84, 'Tier 2 level 12 bleed DPS must be 84 (42 * 2)');
  assert.equal(bats.projectileCount, 24, 'Bat count reaches 24 at level 12');
});

test('BloodBatsWeapon - Tier 1 Awakening (x3 damage and bleed multiplier)', () => {
  const bats = new BloodBatsWeapon();
  // Reach Tier 2
  bats.awakenGrade();
  assert.equal(bats.tier, 2);

  // Awaken to Tier 1
  bats.awakenGrade();
  assert.equal(bats.awakenedGrade, 2);
  assert.equal(bats.tier, 1);
  assert.equal(bats.tierName, 'Тир 1');
  assert.equal(bats.getGradePrefix(), '[ТИР 1 • x3] ');
  assert.equal(bats.level, 1);

  // At Tier 1 level 1: damage is tripled (18 * 3 = 54), bleed is tripled (14 * 3 = 42), bats reset to 4
  assert.equal(bats.damage, 54, 'Tier 1 level 1 damage must be tripled (x3)');
  assert.equal(bats.bleedDps, 42, 'Tier 1 level 1 bleed DPS must be tripled (x3)');
  assert.equal(bats.projectileCount, 4, 'Bat count resets to 4 at level 1');

  // Upgrade through Tier 1 to level 12
  while (bats.level < bats.maxLevel) {
    bats.upgrade();
  }
  assert.equal(bats.level, 12);
  assert.equal(bats.damage, 159, 'Tier 1 level 12 damage must be 159 (53 * 3)');
  assert.equal(bats.bleedDps, 126, 'Tier 1 level 12 bleed DPS must be 126 (42 * 3)');
  assert.equal(bats.projectileCount, 24, 'Bat count reaches 24 at level 12');
});

test('SimBloodBatsWeapon - Headless simulation mirrors 12 levels and tiers', () => {
  const sim = new SimBloodBatsWeapon();
  assert.equal(sim.maxLevel, 12);
  assert.equal(sim.level, 1);
  assert.equal(sim.damage, 18);
  assert.equal(sim.bleedDps, 14);
  assert.equal(sim.projectileCount, 4);

  while (sim.level < sim.maxLevel) {
    sim.upgrade();
  }
  assert.equal(sim.level, 12);
  assert.equal(sim.damage, 53);
  assert.equal(sim.bleedDps, 42);
  assert.equal(sim.projectileCount, 24);

  // Awaken to Tier 2
  sim.awakenGrade();
  assert.equal(sim.awakenedGrade, 1);
  assert.equal(sim.level, 1);
  assert.equal(sim.damage, 36);
  assert.equal(sim.bleedDps, 28);
  assert.equal(sim.projectileCount, 4);

  while (sim.level < sim.maxLevel) {
    sim.upgrade();
  }
  assert.equal(sim.damage, 106);
  assert.equal(sim.bleedDps, 84);
  assert.equal(sim.projectileCount, 24);
});
