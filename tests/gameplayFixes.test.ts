import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Scene } from 'three';
import { Player } from '../game/src/entities/Player';
import { DropManager, GemCollector } from '../game/src/drops/DropManager';
import { Gem } from '../game/src/drops/Gem';
import { RIFT_ITEMS } from '../game/src/items/RiftItemSystem';
import { BowWeapon, KukriWeapon, OrbitingBarrierWeapon, GreatswordWeapon } from '../game/src/combat/Weapon';
import { LevelUpUI, LevelUpUIContext } from '../game/src/ui/modules/LevelUpUI';

// Mock DOM for Node.js
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

test('Time Crystal consumption from inventory', async (t) => {
  await t.test('consumes exactly 1 Time Crystal on lethal damage if multiple are held', () => {
    const scene = new Scene();
    const player = new Player(scene, 'ronin');

    // Add 2 Time Crystals
    player.addRiftItem(RIFT_ITEMS.chronos_phylactery);
    player.addRiftItem(RIFT_ITEMS.chronos_phylactery);
    assert.equal(player.getItemStacks('chronos_phylactery'), 2);

    // Inflict lethal damage (shield depleted)
    player.shield = 0;
    player.hp = 10;
    const isDead1 = player.takeDamage(100);
    assert.equal(isDead1, false, 'Player should be saved from lethal damage');
    assert.equal(player.getItemStacks('chronos_phylactery'), 1, 'Should consume 1 Time Crystal, leaving 1');
    assert.equal(player.hp, Math.round(player.maxHp * 0.5), 'Should restore 50% HP');

    // Inflict lethal damage second time (clear invulnerability granted by previous save first)
    player.activeBuffs.delete('invulnerable');
    const isDead2 = player.takeDamage(1000);
    assert.equal(isDead2, false, 'Player should be saved second time');
    assert.equal(player.getItemStacks('chronos_phylactery'), 0, 'Should consume the last Time Crystal');

    // Inflict lethal damage third time (no crystals left)
    player.activeBuffs.delete('invulnerable');
    const isDead3 = player.takeDamage(1000);
    assert.equal(isDead3, true, 'Player should die when no Time Crystals remain');
  });
});

test('Experience condensation and merging', async (t) => {
  await t.test('far away gems merge into nearest visible gem', () => {
    const scene = new Scene();
    const dropManager = new DropManager(scene);

    const nearGem = dropManager.spawnGem(new Vector3(2, 0, 0), 'blue');
    const initialNearXp = nearGem.xpValue;

    // Spawn a gem far away (> 32m)
    const farGem = dropManager.spawnGem(new Vector3(60, 0, 0), 'blue');
    const farXp = farGem.xpValue;

    const collectors: GemCollector[] = [
      {
        id: 'local',
        position: new Vector3(0, 0, 0),
        pickupRadius: 2.0,
        isAlive: true,
        isDowned: false
      }
    ];

    dropManager.updateWithCollectors(0.016, collectors);

    assert.equal(dropManager.gems.includes(farGem), false, 'Far gem should be culled');
    assert.equal(dropManager.gems.includes(nearGem), true, 'Near gem should persist');
    assert.equal(nearGem.xpValue, initialNearXp + farXp, 'Near gem should absorb the far gem XP');
  });

  await t.test('gem updates its visual type when accumulating XP', () => {
    const gem = new Gem('blue', new Vector3(0, 0, 0));
    assert.equal(gem.type, 'blue');

    gem.addXp(30);
    assert.equal(gem.type, 'green', 'Gem should upgrade to green at 25+ XP');

    gem.addXp(60);
    assert.equal(gem.type, 'red', 'Gem should upgrade to red at 75+ XP');
  });

  await t.test('spawns visible gem near player if no visible gem existed', () => {
    const scene = new Scene();
    const dropManager = new DropManager(scene);

    // Spawn only far away gem
    const farGem = dropManager.spawnGem(new Vector3(50, 0, 0), 'blue');
    const farXp = farGem.xpValue;

    const playerPos = new Vector3(0, 0, 0);
    const collectors: GemCollector[] = [
      {
        id: 'local',
        position: playerPos,
        pickupRadius: 2.0,
        isAlive: true,
        isDowned: false
      }
    ];

    dropManager.updateWithCollectors(0.016, collectors);

    assert.equal(dropManager.gems.includes(farGem), false, 'Far gem should be culled');
    assert.equal(dropManager.gems.length, 1, 'A new gem should be created within visible range');
    const spawnedGem = dropManager.gems[0];
    assert.equal(spawnedGem.xpValue, farXp, 'Spawned gem should contain the culled XP');
    const distToPlayer = spawnedGem.position.distanceTo(playerPos);
    assert.ok(distToPlayer <= 22, 'Spawned gem must be within visible range of player');
  });
});

test('Level Up options always offer 3 choices and require level 12 for grades', async (t) => {
  function createTestLevelUpUI(scene: Scene) {
    const dummyEl = {
      levelUpModal: { classList: { add: () => {}, remove: () => {}, contains: () => false } },
      levelUpStepIndicator: { innerHTML: '', style: {} },
      levelUpTitle: { innerText: '' },
      levelUpRerollContainer: { classList: { add: () => {}, remove: () => {} } },
      btnLevelUpReroll: { innerHTML: '', onclick: null },
      upgradeCardsContainer: { innerHTML: '', appendChild: () => {} }
    } as any;

    const ctx: LevelUpUIContext = {
      elements: dummyEl,
      getScene: () => scene,
      getCurrentStageNumber: () => 1,
      getIsAutoLevelUp: () => false,
      updateWeaponsBar: () => {},
      updatePassivesBar: () => {}
    };

    return new LevelUpUI(ctx);
  }

  await t.test('weapon grade is NOT offered when weapons are below level 12, and IS offered individually once a weapon reaches 12', () => {
    const scene = new Scene();
    const player = new Player(scene, 'ronin');
    player.weapons = [
      new BowWeapon(),
      new KukriWeapon(),
      new OrbitingBarrierWeapon(),
      new GreatswordWeapon()
    ];
    player.weapons[0].level = 10;
    player.weapons[1].level = 11;
    player.weapons[2].level = 8;
    player.weapons[3].level = 9;

    assert.equal(player.areAllWeaponsMaxed(), false);

    const levelUpUI = createTestLevelUpUI(scene);
    const optionsBefore = levelUpUI.generateWeaponOptions(player);

    assert.equal(optionsBefore.length, 3, 'Must offer exactly 3 options');
    const hasAwakenBefore = optionsBefore.some(opt => opt.id.startsWith('awaken_') || opt.id.startsWith('awaken3_'));
    assert.equal(hasAwakenBefore, false, 'No weapon grade should be offered when all weapons are < level 12');

    // Once a weapon individually reaches level 12, awakening IS offered
    player.weapons[0].level = 12;
    const optionsAfter = levelUpUI.generateWeaponOptions(player);
    assert.equal(optionsAfter.length, 3, 'Must offer exactly 3 options');
    const hasAwakenAfter = optionsAfter.some(opt => opt.id === `awaken_${player.weapons[0].id}`);
    assert.equal(hasAwakenAfter, true, 'Individual weapon awakening should be offered when weapon reaches level 12');
  });

  await t.test('weapon grade IS offered and gives exactly 3 choices when all weapons are level 12', () => {
    const scene = new Scene();
    const player = new Player(scene, 'ronin');
    player.weapons = [
      new BowWeapon(),
      new KukriWeapon(),
      new OrbitingBarrierWeapon(),
      new GreatswordWeapon()
    ];
    for (const w of player.weapons) {
      w.level = 12;
    }

    assert.equal(player.areAllWeaponsMaxed(), true);

    const levelUpUI = createTestLevelUpUI(scene);
    const options = levelUpUI.generateWeaponOptions(player);

    assert.equal(options.length, 3, 'Must offer exactly 3 choices');
    const hasAwaken = options.some(opt => opt.id.startsWith('awaken_'));
    assert.equal(hasAwaken, true, 'Weapon grade awakening should be offered when all weapons are level 12');
  });

  await t.test('after first weapon grade, choices remain exactly 3 and at most 1 tier upgrade is offered while leveling up', () => {
    const scene = new Scene();
    const player = new Player(scene, 'ronin');
    player.weapons = [
      new BowWeapon(),
      new KukriWeapon(),
      new OrbitingBarrierWeapon(),
      new GreatswordWeapon()
    ];
    // 1 weapon awakened to Tier 2 (Grade II), reset to level 1
    player.weapons[0].awakenGrade();
    player.weapons[0].level = 1;
    // other weapons remain level 12 Tier 3
    player.weapons[1].level = 12;
    player.weapons[2].level = 12;
    player.weapons[3].level = 12;

    assert.equal(player.areAllWeaponsMaxed(), false, 'Not all weapons are level 12');

    const levelUpUI = createTestLevelUpUI(scene);
    const options = levelUpUI.generateWeaponOptions(player);

    assert.equal(options.length, 3, 'Must offer exactly 3 choices always (not 4 or 5!)');
    const awakenCount = options.filter(opt => opt.id.startsWith('awaken_') || opt.id.startsWith('awaken3_')).length;
    assert.ok(awakenCount <= 1, 'At most 1 weapon tier upgrade can be offered while leveling up');

    // Upgrades for the Tier 2 weapon should be available
    const hasUpgrade = options.some(opt => opt.id === `upgrade_${player.weapons[0].id}`);
    assert.equal(hasUpgrade, true, 'Tier 2 weapon upgrade should be available in the options');
  });
});
