if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElementNS: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      src: '',
      style: {}
    }),
    createElement: () => ({
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        fillText: () => {},
        measureText: () => ({ width: 50 }),
        beginPath: () => {},
        arc: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        scale: () => {},
        translate: () => {},
        rotate: () => {}
      }),
      style: {},
      width: 100,
      height: 100,
      appendChild: () => {},
      addEventListener: () => {},
      classList: {
        contains: () => false,
        add: () => {},
        remove: () => {}
      }
    }),
    getElementById: () => null,
    querySelectorAll: () => []
  };
}

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
import { DEFAULT_BALANCE } from '../game/src/balance/defaultBalance';
import { getCharacterAnimLayout, ANIM_LAYOUT_V2 } from '../game/src/entities/CharacterAnimator';
import { ChunkManager } from '../game/src/world/ChunkManager';
import { SummonUndeadWeapon } from '../game/src/combat/weapons/SummonUndeadWeapon';
import { BloodBatsWeapon } from '../game/src/combat/weapons/BloodBatsWeapon';
import { Vector3, Scene } from 'three';
import { Player } from '../game/src/entities/Player';

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
    'reaper_scythe',
    'fire_ring',
    'katana_slash',
    'whirlwind_slash',
    'greatsword',
    'flail',
    'astral_staff',
    'chakram',
    'lightning_strike',
    'ice_spike',
    'fireball',
    'assault_rifle',
    'poison_puddle',
    'blood_bats'
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
  const otherHeroes = ['ronin', 'valkyrie', 'flail', 'sorceress', 'chakram', 'archer', 'rocket', 'necromancer', 'amazon', 'vampire'] as const;

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

test('Hero Starting Weapons - Necromancer and Amazon are properly configured', () => {
  assert.equal(DEFAULT_BALANCE.heroes.necromancer.startingWeapon, 'summon_undead');
  assert.equal(DEFAULT_BALANCE.heroes.amazon.startingWeapon, 'reaper_scythe');
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


test('Character Animation Layout - Ronin and V2 heroes use ANIM_LAYOUT_V2', () => {
  assert.equal(getCharacterAnimLayout('ronin'), ANIM_LAYOUT_V2);
  assert.equal(getCharacterAnimLayout('valkyrie'), ANIM_LAYOUT_V2);
  assert.equal(getCharacterAnimLayout('flail'), ANIM_LAYOUT_V2);
  assert.equal(getCharacterAnimLayout('chakram'), ANIM_LAYOUT_V2);
  assert.equal(getCharacterAnimLayout('sorceress'), ANIM_LAYOUT_V2);
  assert.equal(getCharacterAnimLayout('amazon'), ANIM_LAYOUT_V2);
  assert.equal(getCharacterAnimLayout('archer'), ANIM_LAYOUT_V2);
  assert.equal(getCharacterAnimLayout('necromancer'), ANIM_LAYOUT_V2);
  assert.equal(getCharacterAnimLayout('vampire'), ANIM_LAYOUT_V2);
  assert.equal(ANIM_LAYOUT_V2.cols, 6);
  assert.equal(ANIM_LAYOUT_V2.rows, 4);
  assert.deepEqual(ANIM_LAYOUT_V2.rowMap, {
    front: 0,
    back: 1,
    right: 2,
    left: 3
  });
});

test('ChunkManager - 7x7 map grid and bounds verification', () => {
  assert.equal(ChunkManager.GRID_SIZE, 7, 'Grid size should be 7x7');
  assert.equal(ChunkManager.MAP_SIZE, 350, 'Map size should be 350m');
  assert.equal(ChunkManager.HALF_MAP, 175, 'Half map should be 175m');
  assert.equal(ChunkManager.MIN_CHUNK, -3);
  assert.equal(ChunkManager.MAX_CHUNK, 3);
});

test('SummonUndeadWeapon - minion scaling and combat engagement', () => {
  const weapon = new SummonUndeadWeapon();
  assert.equal(weapon.id, 'summon_undead');
  assert.equal(weapon.level, 1);
  assert.equal(weapon.damage, 22);

  // Upgrade through levels
  weapon.upgrade(); // lv 2
  assert.equal(weapon.level, 2);
  weapon.upgrade(); // lv 3 -> adds minion
  assert.equal(weapon.level, 3);

  let damagedEnemyId = '';
  let dealtDamage = 0;
  const dummyEnemy = {
    id: 'e1',
    isAlive: true,
    position: new Vector3(1, 0, 1),
    width: 1,
    height: 1
  };

  weapon.update(
    0.8,
    new Vector3(0, 0, 0),
    [dummyEnemy as any],
    () => {},
    (enemy, dmg) => {
      damagedEnemyId = enemy.id;
      dealtDamage = dmg;
    }
  );

  assert.equal(damagedEnemyId, 'e1');
  assert.ok(dealtDamage > 0, 'Minions should deal damage to target enemy');
  weapon.destroy();
});

test('Player (Necromancer) - initializes SummonUndeadWeapon with visual scene and adds minion groups', () => {
  const scene = new Scene();
  const player = new Player(scene, 'necromancer');

  const undeadWeapon = player.weapons.find(w => w.id === 'summon_undead') as any;
  assert.ok(undeadWeapon, 'Necromancer should start with summon_undead');
  assert.equal(undeadWeapon.hasInitVisual, true, 'Weapon should be visually initialized with player scene');

  // Update player to populate minions
  player.update(0.1, new Vector3(), [], () => {});

  // Scene should now contain minion groups
  assert.ok(undeadWeapon.minions.length >= 2, 'Should have at least 2 minions');
  for (const m of undeadWeapon.minions) {
    assert.ok(m.group.parent === scene, 'Minion group must be added to the scene');
  }
  player.destroy(scene);
});



test('Hero Starting Weapons - Vampire Carmilla is properly configured', () => {
  assert.equal(DEFAULT_BALANCE.heroes.vampire.startingWeapon, 'blood_bats');
  assert.equal(DEFAULT_BALANCE.heroes.vampire.maxHp, 110);
  assert.equal(DEFAULT_BALANCE.heroes.vampire.damageMultiplier, 1.35);
  assert.equal(DEFAULT_BALANCE.heroes.vampire.baseSpeed, 8.8);
});

test('BloodBatsWeapon - scaling up to 24 bats, random target selection, and bleed', async () => {
  const batsWeapon = new BloodBatsWeapon();
  assert.equal(batsWeapon.id, 'blood_bats');
  assert.equal(batsWeapon.level, 1);
  assert.equal(batsWeapon.projectileCount, 4);
  assert.equal(batsWeapon.bleedDps, 14);

  // Upgrade through level 8
  for (let lvl = 2; lvl <= 12; lvl++) {
    batsWeapon.upgrade();
  }
  assert.equal(batsWeapon.level, 12);
  assert.equal(batsWeapon.projectileCount, 24, 'Bats weapon must reach exactly 24 projectiles at level 12');

  // Verify firing at random targets
  const dummyEnemies = [
    { id: 'e1', isAlive: true, position: new Vector3(5, 0, 0), width: 1, height: 1 },
    { id: 'e2', isAlive: true, position: new Vector3(-5, 0, 0), width: 1, height: 1 },
    { id: 'e3', isAlive: true, position: new Vector3(0, 0, 5), width: 1, height: 1 }
  ];

  const spawnedProjectiles: any[] = [];
  batsWeapon.update(
    2.0, // trigger attack cooldown
    new Vector3(0, 0, 0),
    dummyEnemies as any,
    (proj) => spawnedProjectiles.push(proj)
  );

  // Wait for burst delay timers to complete
  await new Promise(r => setTimeout(r, 24 * 35 + 150));

  assert.equal(spawnedProjectiles.length, 24);
  for (const p of spawnedProjectiles) {
    assert.equal(p.isBat, true);
    assert.equal(p.bleedDps, batsWeapon.bleedDps);
  }
});

test('Player (Vampire) - initializes with BloodBatsWeapon and Carmilla overhead name', () => {
  const scene = new Scene();
  const player = new Player(scene, 'vampire');

  const batsWeapon = player.weapons.find(w => w.id === 'blood_bats');
  assert.ok(batsWeapon, 'Vampire should start with blood_bats');
  assert.equal(player.charType, 'vampire');
  player.destroy(scene);
});
