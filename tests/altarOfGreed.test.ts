import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { Altar } from '../game/src/world/Altar';
import { AltarManager } from '../game/src/world/AltarManager';
import { ChunkManager } from '../game/src/world/ChunkManager';
import { ChestManager } from '../game/src/world/ChestManager';
import { EnemyManager } from '../game/src/entities/EnemyManager';
import { DropManager } from '../game/src/drops/DropManager';
import { DamageNumberManager } from '../game/src/combat/DamageNumberManager';
import { Player } from '../game/src/entities/Player';
import { ObstacleManager } from '../game/src/world/ObstacleManager';
import { rollChestDropPair, LEGENDARY_ITEMS } from '../game/src/items/RiftItemSystem';

// Mock DOM for Node.js test environment
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    getElementById: () => null,
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
        rotate: () => {},
        moveTo: () => {},
        lineTo: () => {},
        quadraticCurveTo: () => {},
        closePath: () => {},
        strokeRect: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} })
      }),
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {}
    })
  };
}

test('Altar of Greed - Instantiation and initial state', () => {
  const altar = new Altar('greed', new Vector3(10, 0, 15));
  assert.strictEqual(altar.isGreedAltar, true);
  assert.strictEqual(altar.config.type, 'greed');
  assert.strictEqual(altar.trialState, 'idle');
  assert.strictEqual(altar.trialTimer, 45);
  assert.strictEqual(altar.trialDuration, 45);
  assert.strictEqual(altar.isCaptured, false);
  assert.strictEqual(altar.isSpent, false);
});

test('Altar of Greed - Spawns strictly on Stage 4 and NOT on Stages 1, 2, or 3', () => {
  const scene = new Scene();
  const altarManager = new AltarManager(scene);
  const obstacleManager = new ObstacleManager();
  const chunkManager = new ChunkManager(scene, altarManager, obstacleManager);

  // Stage 1
  altarManager.clear();
  chunkManager.generateMap(1337, undefined, undefined, 1, 'ashen_wastes');
  const stage1Greed = altarManager.altars.filter(a => a.isGreedAltar);
  assert.strictEqual(stage1Greed.length, 0, 'Stage 1 must have 0 Altar of Greed');

  // Stage 2
  altarManager.clear();
  chunkManager.generateMap(1337, undefined, undefined, 2, 'derelict_sector');
  const stage2Greed = altarManager.altars.filter(a => a.isGreedAltar);
  assert.strictEqual(stage2Greed.length, 0, 'Stage 2 must have 0 Altar of Greed');

  // Stage 3
  altarManager.clear();
  chunkManager.generateMap(1337, undefined, undefined, 3, 'bioluminescent_wilds');
  const stage3Greed = altarManager.altars.filter(a => a.isGreedAltar);
  assert.strictEqual(stage3Greed.length, 0, 'Stage 3 must have 0 Altar of Greed');

  // Stage 4 (Endgame / Volcanic Caldera)
  altarManager.clear();
  chunkManager.generateMap(1337, undefined, undefined, 4, 'volcanic_caldera');
  const stage4Greed = altarManager.altars.filter(a => a.isGreedAltar);
  assert.strictEqual(stage4Greed.length, 1, 'Stage 4 must spawn exactly 1 Altar of Greed');
  assert.strictEqual(stage4Greed[0].config.type, 'greed');
});

test('Altar of Greed - Activation, 45s countdown, and trial completion', () => {
  const scene = new Scene();
  const altarManager = new AltarManager(scene);
  const altar = new Altar('greed', new Vector3(0, 0, 0));
  altarManager.registerAltar(altar);

  let startedCalled = false;
  let completedCalled = false;
  altarManager.onGreedTrialStarted = (a) => {
    assert.strictEqual(a, altar);
    startedCalled = true;
  };
  altarManager.onGreedTrialCompleted = (a) => {
    assert.strictEqual(a, altar);
    completedCalled = true;
  };

  const dummyPlayer = {
    position: new Vector3(0, 0, 0),
    isAlive: true,
    isDowned: false,
    addBuff: () => {}
  } as any;

  // Step inside capture radius to charge activation
  altar.updateSimulation(2.0, dummyPlayer);
  assert.strictEqual(startedCalled, true, 'onGreedTrialStarted must trigger upon full capture');
  assert.strictEqual(altar.trialState, 'active');
  assert.strictEqual(altar.trialTimer, 45);

  // Advance simulation by 20 seconds
  altar.updateSimulation(20.0, dummyPlayer);
  assert.strictEqual(altar.trialState, 'active');
  assert.strictEqual(altar.trialTimer, 25);
  assert.strictEqual(completedCalled, false);

  // Advance remaining 25 seconds (total 45s elapsed)
  altar.updateSimulation(25.0, dummyPlayer);
  assert.strictEqual(altar.trialState, 'completed');
  assert.strictEqual(altar.trialTimer, 0);
  assert.strictEqual(altar.isCaptured, true);
  assert.strictEqual(altar.isSpent, true);
  assert.strictEqual(completedCalled, true, 'onGreedTrialCompleted must trigger at 45s');
});

test('EnemyManager - spawnGreedTrialWave spawns guaranteed enraged elite mobs', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager();
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);

  enemyManager.spawnGreedTrialWave(new Vector3(0, 0, 0), 6);
  assert.strictEqual(enemyManager.enemies.length, 6);

  const affixes = new Set(['blazing', 'glacial', 'overloading']);
  for (const enemy of enemyManager.enemies) {
    assert.ok(enemy.eliteAffix, 'Trial mob must have an elite affix');
    assert.ok(affixes.has(enemy.eliteAffix), `Affix ${enemy.eliteAffix} must be valid`);
  }
});

test('EnemyManager - killNonBossesAround clears wave mobs while preserving bosses', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager();
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);

  // Spawn regular/elite mobs
  enemyManager.spawnGreedTrialWave(new Vector3(0, 0, 0), 4);

  // Spawn boss
  const boss = enemyManager.spawnTeleporterBoss(new Vector3(5, 0, 5), 4);
  assert.strictEqual(boss.isBoss, true);
  assert.strictEqual(boss.isAlive, true);

  // Perform trial wipe
  enemyManager.killNonBossesAround(new Vector3(0, 0, 0), 50);

  const aliveRegulars = enemyManager.enemies.filter(e => !e.isBoss && e.isAlive);
  assert.strictEqual(aliveRegulars.length, 0, 'All regular trial enemies in radius must be killed');
  assert.strictEqual(boss.isAlive, true, 'Boss must survive trial clear wipe');
});

test('RiftItemSystem - rollChestDropPair guarantees legendary choices on legendary chests', () => {
  const legendarySet = new Set(LEGENDARY_ITEMS);

  for (let i = 0; i < 30; i++) {
    const [item1, item2] = rollChestDropPair(4, Math.random, false, undefined, 'legendary');
    assert.ok(legendarySet.has(item1.id as any), `item1 ${item1.id} must be legendary`);
    assert.ok(legendarySet.has(item2.id as any), `item2 ${item2.id} must be legendary`);
    assert.notStrictEqual(item1.id, item2.id, 'Drops must not be duplicates');
  }
});
