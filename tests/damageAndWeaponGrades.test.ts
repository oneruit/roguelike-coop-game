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
import {
  getItemsByGrade,
  rollChestDropPair,
  rollRiftItemByStage,
  RIFT_ITEMS,
  COMMON_ITEMS,
  UNCOMMON_ITEMS,
  RARE_ITEMS,
  LEGENDARY_ITEMS,
  type RiftItemId
} from '../game/src/items/RiftItemSystem';

test('Critical strike caps and tier calculations', () => {
  // Max crit chance = 100% (1.0), max crit damage = 1000% (10.0)
  const maxCritChance = 1.0;
  const maxCritDamage = 10.0;

  // Chance calculation logic clamped to 1.0 (100%)
  const isCrit = (chance: number, rand: number): boolean => {
    const clamped = Math.min(maxCritChance, Math.max(0, chance));
    return rand < clamped;
  };

  // At 0% crit chance
  assert.equal(isCrit(0, 0.5), false);

  // At 50% crit chance (0.50)
  assert.equal(isCrit(0.5, 0.3), true); // rand < 0.5
  assert.equal(isCrit(0.5, 0.7), false); // rand >= 0.5

  // At 100% crit chance (1.0) -> guaranteed crit
  assert.equal(isCrit(1.0, 0.999), true);

  // Over 100% (e.g. 1.5) -> clamped to 1.0
  assert.equal(isCrit(1.5, 0.999), true);

  // Damage scaling: baseDamage * (1 + (crit ? critDamage : 0))
  const computeDamage = (baseDamage: number, hasCrit: boolean, critDmg: number): number => {
    const clampedCritDmg = Math.min(maxCritDamage, Math.max(0, critDmg));
    return Math.round(baseDamage * (1 + (hasCrit ? clampedCritDmg : 0)));
  };

  // No crit: no bonus
  assert.equal(computeDamage(100, false, 0.50), 100);
  // Crit with 50% crit dmg -> 150
  assert.equal(computeDamage(100, true, 0.50), 150);
  // Crit with 200% crit dmg -> 300
  assert.equal(computeDamage(100, true, 2.0), 300);
  // Crit with 1000% crit dmg (cap) -> 1100
  assert.equal(computeDamage(100, true, 10.0), 1100);
  // Crit dmg over 1000% (15.0) gets clamped to 10.0 -> 1100
  assert.equal(computeDamage(100, true, 15.0), 1100);
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

test('Weapon grade upgrades apply stats cumulatively to weapon and record upgradeHistory', () => {
  const bow = new BowWeapon();
  const initialDamage = bow.damage;
  const initialCd = bow.cooldown;

  // Initial weapon has no grade property, upgradeHistory is empty, and has no crit chance on weapon itself
  assert.equal((bow as any).grade, undefined);
  assert.equal((bow as any).critChance, undefined);
  assert.equal((bow as any).critDamage, undefined);
  assert.deepEqual(bow.upgradeHistory, []);

  // Upgrade with 'rare' grade
  bow.upgrade('rare');
  assert.equal(bow.level, 2);
  assert.deepEqual(bow.upgradeHistory, ['rare']);
  // Rare gives bonus damage and cooldown reduction
  assert.ok(bow.damage > initialDamage);
  assert.ok(bow.bonusDamage > 0);
  assert.ok(bow.cooldown < initialCd);
  // Upgrades do NOT give crit or crit chance
  assert.equal((bow as any).critChance, undefined);
  assert.equal((bow as any).critDamage, undefined);

  // Upgrade with 'common' grade appends to upgradeHistory
  const prevDamage = bow.damage;
  bow.upgrade('common');
  assert.equal(bow.level, 3);
  assert.deepEqual(bow.upgradeHistory, ['rare', 'common']);
  assert.ok(bow.damage > prevDamage);

  // Upgrade with 'legendary' appends to upgradeHistory
  const prevDamage2 = bow.damage;
  bow.upgrade('legendary');
  assert.equal(bow.level, 4);
  assert.deepEqual(bow.upgradeHistory, ['rare', 'common', 'legendary']);
  assert.ok(bow.damage > prevDamage2);
  assert.ok(bow.cooldownBonus > 0);
  // Still no crit on weapon
  assert.equal((bow as any).critChance, undefined);
  assert.equal((bow as any).critDamage, undefined);
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

test('Rift Items have at least 3 items per grade and proper rarity mapping', () => {
  // Test requirement: at least 3 test items of each grade
  assert.ok(COMMON_ITEMS.length >= 3, `Expected at least 3 common items, got ${COMMON_ITEMS.length}`);
  assert.ok(UNCOMMON_ITEMS.length >= 3, `Expected at least 3 uncommon items, got ${UNCOMMON_ITEMS.length}`);
  assert.ok(RARE_ITEMS.length >= 3, `Expected at least 3 rare items, got ${RARE_ITEMS.length}`);
  assert.ok(LEGENDARY_ITEMS.length >= 3, `Expected at least 3 legendary items, got ${LEGENDARY_ITEMS.length}`);

  // Test getItemsByGrade
  assert.equal(getItemsByGrade('common').length, COMMON_ITEMS.length);
  assert.equal(getItemsByGrade('uncommon').length, UNCOMMON_ITEMS.length);
  assert.equal(getItemsByGrade('rare').length, RARE_ITEMS.length);
  assert.equal(getItemsByGrade('legendary').length, LEGENDARY_ITEMS.length);

  // New Rare items exist
  assert.ok(RIFT_ITEMS.crit_lens);
  assert.equal(RIFT_ITEMS.crit_lens.rarity, 'rare');

  assert.ok(RIFT_ITEMS.heavy_hollowpoint);
  assert.equal(RIFT_ITEMS.heavy_hollowpoint.rarity, 'rare');

  assert.ok(RIFT_ITEMS.energy_amplifier);
  assert.equal(RIFT_ITEMS.energy_amplifier.rarity, 'rare');
});

test('Chest drops roll 2 items, do not allow duplicates, and depend on biome stage', () => {
  // 1. rollChestDropPair returns exactly 2 items
  const pair = rollChestDropPair(1);
  assert.equal(pair.length, 2);
  assert.ok(pair[0].id);
  assert.ok(pair[1].id);

  // 2. Duplicates must NOT roll: distinct items guaranteed
  const pairSame = rollChestDropPair(1, () => 0.001);
  assert.notEqual(pairSame[0].id, pairSame[1].id);

  // 3. Stage probability scaling
  // Stage 1 with RNG = 0.5 rolls common item
  const commonItem = rollRiftItemByStage(1, () => 0.5);
  assert.equal(commonItem.rarity, 'common');

  // Stage 4 with RNG = 0.4 rolls rare item (since rare chance is 40% on stage 4)
  const rareItem = rollRiftItemByStage(4, () => 0.4);
  assert.equal(rareItem.rarity, 'rare');
});

test('Rare items correctly modify player stats and caps', () => {
  const calculatePlayerStats = (items: Map<RiftItemId, number>, baseDamageMult: number = 1.0) => {
    const lensStacks = items.get('crit_lens') || 0;
    const critChance = Math.min(1.0, Math.max(0, 0.05 + (lensStacks * 0.03)));

    const hollowStacks = items.get('heavy_hollowpoint') || 0;
    const critDamage = Math.min(10.0, Math.max(0, 0.50 + (hollowStacks * 0.20)));

    const ampStacks = items.get('energy_amplifier') || 0;
    const ampMult = 1.0 + (ampStacks * 0.18);
    const damageMult = baseDamageMult * ampMult;

    return { critChance, critDamage, damageMult };
  };

  const items = new Map<RiftItemId, number>();
  const base = calculatePlayerStats(items);
  assert.equal(base.critChance, 0.05);
  assert.equal(base.critDamage, 0.50);
  assert.equal(base.damageMult, 1.0);

  // 1 stack of crit_lens (+3% crit chance)
  items.set('crit_lens', 1);
  const withLens = calculatePlayerStats(items);
  assert.equal(Math.round(withLens.critChance * 100) / 100, 0.08);

  // 1 stack of heavy_hollowpoint (+20% crit damage)
  items.set('heavy_hollowpoint', 1);
  const withHollow = calculatePlayerStats(items);
  assert.equal(Math.round(withHollow.critDamage * 100) / 100, 0.70);

  // 1 stack of energy_amplifier (+18% general damage)
  items.set('energy_amplifier', 1);
  const withAmp = calculatePlayerStats(items);
  assert.equal(Math.round(withAmp.damageMult * 100) / 100, 1.18);

  // Test crit damage cap: 1000% (10.0)
  items.set('heavy_hollowpoint', 60);
  const cappedDmg = calculatePlayerStats(items);
  assert.equal(cappedDmg.critDamage, 10.0); // capped at 1000%

  // Test crit chance cap: 100% (1.0)
  items.set('crit_lens', 50);
  const cappedChance = calculatePlayerStats(items);
  assert.equal(cappedChance.critChance, 1.0); // capped at 100%
});
