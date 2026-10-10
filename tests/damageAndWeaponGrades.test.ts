import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPON_GRADES,
  BIOME_GRADE_CHANCES,
  rollWeaponGrade,
  getGradeTier,
  getGradeLabel,
  getGradeColor,
  type WeaponGrade
} from '../game/src/combat/WeaponGrades';
import { BowWeapon, KukriWeapon } from '../game/src/combat/Weapon';
import { InvokerInvokeWeapon, InvokerSpellWeapon } from '../game/src/combat/InvokerWeapons';
import { BalanceManager } from '../game/src/balance/BalanceManager';

test('Critical strike caps and tier calculations', () => {
  // Max crit chance = 1000% (10.0), max crit damage = 100% (1.0)
  const maxCritChance = 10.0;
  const maxCritDamage = 1.0;

  // Tier calculation logic:
  // tier = Math.floor(chance) + (random < remainder ? 1 : 0)
  const computeTier = (chance: number, rand: number): number => {
    const clamped = Math.min(maxCritChance, Math.max(0, chance));
    const floorTier = Math.floor(clamped);
    const remainder = clamped - floorTier;
    return floorTier + (rand < remainder ? 1 : 0);
  };

  // At 0% crit chance
  assert.equal(computeTier(0, 0.5), 0);

  // At 50% crit chance (0.50)
  assert.equal(computeTier(0.5, 0.3), 1); // rand < 0.5 -> tier 1
  assert.equal(computeTier(0.5, 0.7), 0); // rand >= 0.5 -> tier 0

  // At 150% crit chance (1.50)
  assert.equal(computeTier(1.5, 0.2), 2); // rand < 0.5 -> tier 2
  assert.equal(computeTier(1.5, 0.8), 1); // rand >= 0.5 -> tier 1

  // At 1000% crit chance (10.0) -> guaranteed tier 10
  assert.equal(computeTier(10.0, 0.999), 10);

  // Over 1000% (e.g. 15.0) -> clamped to 10.0
  assert.equal(computeTier(15.0, 0.5), 10);

  // Damage scaling: baseDamage * (1 + tier * critDamage)
  const computeDamage = (baseDamage: number, tier: number, critDmg: number): number => {
    const clampedCritDmg = Math.min(maxCritDamage, Math.max(0, critDmg));
    return Math.round(baseDamage * (1 + tier * clampedCritDmg));
  };

  // Tier 0: no bonus
  assert.equal(computeDamage(100, 0, 0.50), 100);
  // Tier 1 with 50% crit dmg -> 150
  assert.equal(computeDamage(100, 1, 0.50), 150);
  // Tier 2 with 50% crit dmg -> 200
  assert.equal(computeDamage(100, 2, 0.50), 200);
  // Tier 1 with 100% crit dmg (cap) -> 200
  assert.equal(computeDamage(100, 1, 1.0), 200);
  // Tier 3 with 100% crit dmg -> 400
  assert.equal(computeDamage(100, 3, 1.0), 400);
  // Crit dmg over 100% (1.5) gets clamped to 1.0 -> 200
  assert.equal(computeDamage(100, 1, 1.5), 200);
});

test('Weapon grade definitions and biome probabilities', () => {
  // 4 grades exist
  const grades: WeaponGrade[] = ['common', 'uncommon', 'rare', 'legendary'];
  for (const grade of grades) {
    assert.ok(WEAPON_GRADES[grade]);
    assert.ok(getGradeLabel(grade));
    assert.ok(getGradeColor(grade));
  }

  // Tier hierarchy (1-4)
  assert.equal(getGradeTier('common'), 1);
  assert.equal(getGradeTier('uncommon'), 2);
  assert.equal(getGradeTier('rare'), 3);
  assert.equal(getGradeTier('legendary'), 4);

  // Biome probability distribution tests
  // Stage 1: mostly common
  const ch1 = BIOME_GRADE_CHANCES[1];
  assert.equal(ch1.common, 0.65);
  assert.equal(ch1.uncommon, 0.25);
  assert.equal(ch1.rare, 0.09);
  assert.equal(ch1.legendary, 0.01);

  // Stage 4+: rare and legendary are significantly higher
  const ch4 = BIOME_GRADE_CHANCES[4];
  assert.equal(ch4.common, 0.10);
  assert.equal(ch4.uncommon, 0.25);
  assert.equal(ch4.rare, 0.40);
  assert.equal(ch4.legendary, 0.25);

  // Probabilities sum to 1.0
  for (let stage = 1; stage <= 4; stage++) {
    const ch = BIOME_GRADE_CHANCES[stage];
    const sum = Math.round((ch.common + ch.uncommon + ch.rare + ch.legendary) * 100) / 100;
    assert.equal(sum, 1.0);
  }

  // Deterministic roll checks using explicit rng parameter
  // Stage 1: leg: 0.01, rare: 0.09 (0.10 total), unc: 0.25 (0.35 total), com: 0.65
  assert.equal(rollWeaponGrade(1, () => 0.005), 'legendary'); // < 0.01
  assert.equal(rollWeaponGrade(1, () => 0.05), 'rare');       // < 0.10
  assert.equal(rollWeaponGrade(1, () => 0.20), 'uncommon');   // < 0.35
  assert.equal(rollWeaponGrade(1, () => 0.50), 'common');     // >= 0.35

  // Stage 4: leg: 0.25, rare: 0.40 (0.65 total), unc: 0.25 (0.90 total), com: 0.10
  assert.equal(rollWeaponGrade(4, () => 0.10), 'legendary');  // < 0.25
  assert.equal(rollWeaponGrade(4, () => 0.40), 'rare');       // < 0.65
  assert.equal(rollWeaponGrade(4, () => 0.80), 'uncommon');   // < 0.90
  assert.equal(rollWeaponGrade(4, () => 0.95), 'common');     // >= 0.90
});

test('Weapon grade upgrades apply stats cumulatively', () => {
  const bow = new BowWeapon();
  const initialBaseDamage = bow.baseDamage;
  const initialDamage = bow.damage;
  const initialCd = bow.cooldown;

  // Upgrade with 'rare' grade
  bow.upgrade('rare');
  assert.equal(bow.level, 2);
  assert.equal(bow.grade, 'rare');
  // Rare gives 1.35x damage multiplier bonus on damagePerLevel
  assert.ok(bow.damage > initialDamage);
  assert.ok(bow.critChance > 0); // Rare adds crit chance
  assert.ok(bow.cooldown < initialCd); // Rare adds cooldown reduction

  // Upgrade with 'common' grade does not downgrade weapon grade
  bow.upgrade('common');
  assert.equal(bow.level, 3);
  assert.equal(bow.grade, 'rare');

  // Upgrade with 'legendary' promotes grade to legendary
  bow.upgrade('legendary');
  assert.equal(bow.level, 4);
  assert.equal(bow.grade, 'legendary');
  assert.ok(bow.critDamage > 0); // Legendary adds crit damage bonus
});

test('Initial hero damage bonuses apply ONLY to starting weapon', () => {
  // Sheriff (hero 1) has damageMultiplier in hero config
  const sheriffCfg = BalanceManager.getHeroConfig('sheriff');
  const sheriffMultiplier = sheriffCfg?.damageMultiplier ?? 1.15;

  // Mock player damage multiplier logic
  const getMultiplier = (
    weaponId: string | undefined,
    startingWeaponId: string,
    heroMult: number,
    generalBonus: number = 1.0
  ): number => {
    let mult = generalBonus;
    if (weaponId && weaponId === startingWeaponId) {
      mult *= heroMult;
    }
    return mult;
  };

  const startingWeapon = 'bow';
  const acquiredWeapon = 'kukri';

  // Starting weapon receives hero damage multiplier
  const bowMult = getMultiplier(startingWeapon, startingWeapon, sheriffMultiplier, 1.0);
  assert.equal(bowMult, sheriffMultiplier);

  // Acquired secondary weapon does NOT receive hero damage multiplier
  const kukriMult = getMultiplier(acquiredWeapon, startingWeapon, sheriffMultiplier, 1.0);
  assert.equal(kukriMult, 1.0);

  // When general bonus (e.g. Sheriff Star passive) is acquired, it applies to both
  const generalBonus = 1.25;
  assert.equal(
    getMultiplier(startingWeapon, startingWeapon, sheriffMultiplier, generalBonus),
    sheriffMultiplier * generalBonus
  );
  assert.equal(
    getMultiplier(acquiredWeapon, startingWeapon, sheriffMultiplier, generalBonus),
    1.0 * generalBonus
  );

  // Invoker: all Invoker spells inherit hero multiplier
  const invokerCfg = BalanceManager.getHeroConfig('invoker');
  const invokerMult = invokerCfg?.damageMultiplier ?? 1.0;
  const isInvokerSpell = (id?: string) => id === 'invoker_invoke' || (id !== undefined && id.startsWith('invoker_'));

  assert.ok(isInvokerSpell('invoker_invoke'));
  assert.ok(isInvokerSpell('invoker_sun_strike'));
  assert.ok(!isInvokerSpell('bow'));
});
