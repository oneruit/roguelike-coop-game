import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCharacterAcquireWeapon,
  isUniqueCharacter,
  getExclusiveWeaponOwner,
  isExclusiveWeapon,
  registerUniqueCharacter,
  INVOKER_EXCLUSIVE_WEAPONS
} from '../game/src/shared/UniqueCharacters';
import { INVOKER_SPELL_IDS, invokerWeaponId } from '../game/src/shared/InvokerSpells';

test('Unique Character System - Invoker is unique and isolated', () => {
  assert.equal(isUniqueCharacter('invoker'), true);
  assert.equal(isUniqueCharacter('ronin'), false);
  assert.equal(isUniqueCharacter('valkyrie'), false);
  assert.equal(isUniqueCharacter('archer'), false);

  // Invoker exclusive weapons check
  assert.equal(isExclusiveWeapon('invoker_invoke'), true);
  assert.equal(getExclusiveWeaponOwner('invoker_invoke'), 'invoker');
  assert.equal(isExclusiveWeapon('invoker_sun_strike'), true);
  assert.equal(getExclusiveWeaponOwner('invoker_sun_strike'), 'invoker');
  assert.equal(isExclusiveWeapon('bow'), false);
  assert.equal(getExclusiveWeaponOwner('bow'), null);
});

test('Unique Character System - Invoker weapon acquisition rules', () => {
  // Invoker starts with invoke
  assert.equal(
    canCharacterAcquireWeapon('invoker', 'invoker_invoke', []),
    true,
    'Invoker can acquire base invoke'
  );

  // Invoker cannot acquire standalone spells without invoke
  assert.equal(
    canCharacterAcquireWeapon('invoker', 'invoker_chaos_meteor', []),
    false,
    'Invoker cannot acquire meteor without invoke'
  );

  // Invoker can acquire standalone spells with invoke in inventory
  assert.equal(
    canCharacterAcquireWeapon('invoker', 'invoker_chaos_meteor', [{ id: 'invoker_invoke' }]),
    true,
    'Invoker can acquire meteor with invoke present'
  );

  // Invoker CANNOT acquire any generic or other character weapons
  const genericWeapons = [
    'bow',
    'kukri',
    'orbiting_barrier',
    'holy_aura',
    'katana_slash',
    'whirlwind_slash',
    'greatsword',
    'flail',
    'astral_staff',
    'chakram',
    'lightning_strike',
    'ice_spike',
    'fireball',
    'assault_rifle'
  ];

  for (const wId of genericWeapons) {
    assert.equal(
      canCharacterAcquireWeapon('invoker', wId, [{ id: 'invoker_invoke' }]),
      false,
      `Invoker must NOT be able to acquire ${wId}`
    );
  }
});

test('Unique Character System - Other characters CANNOT acquire Invoker abilities', () => {
  const otherHeroes = ['ronin', 'valkyrie', 'flail', 'sorceress', 'chakram', 'archer', 'rocket'] as const;

  for (const hero of otherHeroes) {
    // Cannot acquire invoke
    assert.equal(
      canCharacterAcquireWeapon(hero, 'invoker_invoke', []),
      false,
      `${hero} must NOT be able to acquire invoker_invoke`
    );

    // Cannot acquire any of the 10 spells
    for (const spell of INVOKER_SPELL_IDS) {
      const spellWeaponId = invokerWeaponId(spell);
      assert.equal(
        canCharacterAcquireWeapon(hero, spellWeaponId, [{ id: 'invoker_invoke' }]),
        false,
        `${hero} must NOT be able to acquire ${spellWeaponId}`
      );
    }

    // Can acquire regular weapons
    assert.equal(
      canCharacterAcquireWeapon(hero, 'bow', []),
      true,
      `${hero} should be able to acquire regular bow`
    );
    assert.equal(
      canCharacterAcquireWeapon(hero, 'katana_slash', []),
      true,
      `${hero} should be able to acquire katana_slash`
    );
  }
});

test('Unique Character System - Extensibility for future unique characters', () => {
  // Register a mock unique character
  registerUniqueCharacter({
    charType: 'test_mage' as any,
    name: 'Тестовый Маг',
    isUnique: true,
    exclusiveWeaponIds: ['test_fire_blast', 'test_water_blast'],
    allowGenericWeapons: false
  });

  assert.equal(isUniqueCharacter('test_mage' as any), true);
  assert.equal(isExclusiveWeapon('test_fire_blast'), true);
  assert.equal(getExclusiveWeaponOwner('test_fire_blast'), 'test_mage');

  // Test mage can acquire their own weapon
  assert.equal(canCharacterAcquireWeapon('test_mage' as any, 'test_fire_blast', []), true);
  // Test mage cannot acquire generic weapon
  assert.equal(canCharacterAcquireWeapon('test_mage' as any, 'bow', []), false);
  // Test mage cannot acquire invoker weapon
  assert.equal(canCharacterAcquireWeapon('test_mage' as any, 'invoker_invoke', []), false);

  // Invoker cannot acquire test mage weapon
  assert.equal(canCharacterAcquireWeapon('invoker', 'test_fire_blast', [{ id: 'invoker_invoke' }]), false);
  // Ronin cannot acquire test mage weapon
  assert.equal(canCharacterAcquireWeapon('ronin', 'test_fire_blast', []), false);
});
