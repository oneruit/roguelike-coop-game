import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { MobNest } from '../game/src/world/MobNest';
import { MobNestManager } from '../game/src/world/MobNestManager';
import { SeededRNG } from '../game/src/core/SeededRNG';
import { EnemyManager } from '../game/src/entities/EnemyManager';
import { DropManager } from '../game/src/drops/DropManager';
import { Player } from '../game/src/entities/Player';

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
        restore: () => {}
      }),
      width: 256,
      height: 72
    })
  };
}

test('Mob Nests - Only generates 4 nests on Stage 4, 0 on other stages', () => {
  const scene = new Scene();
  const nestManager = new MobNestManager(scene);

  // Stage 1, 2, 3, 5 must have 0 nests
  for (const stage of [1, 2, 3, 5]) {
    const placed = nestManager.generateStageNests(stage, new SeededRNG(1337), []);
    assert.equal(placed.length, 0, `Stage ${stage} must have 0 nests`);
    assert.equal(nestManager.totalCount, 0);
  }

  // Stage 4 must have exactly 4 nests
  const placedStage4 = nestManager.generateStageNests(4, new SeededRNG(1337), []);
  assert.equal(placedStage4.length, 4, 'Stage 4 must generate exactly 4 nests');
  assert.equal(nestManager.totalCount, 4);
  assert.equal(nestManager.destroyedCount, 0);
  assert.equal(nestManager.isAllNestsDestroyed(), false);
});

test('Mob Nests - Configuration constants: blast radius is 25m (1 map cell across), fuse is 5s', () => {
  assert.equal(MobNest.BLAST_RADIUS, 25.0, 'Blast radius must be 25m (covering 1 full 50x50m map cell)');
  assert.equal(MobNest.FUSE_DURATION, 5.0, 'Fuse countdown must be 5.0 seconds');
  assert.equal(MobNest.PLANT_DURATION, 1.8, 'Plant holding duration must be 1.8 seconds');
  assert.equal(MobNest.BLAST_DAMAGE, 35, 'Blast damage to player must be 35');
});

test('Mob Nests - Four quadrant positions are spaced properly around Caldera', () => {
  const scene = new Scene();
  const nestManager = new MobNestManager(scene);
  nestManager.generateStageNests(4, new SeededRNG(42), []);

  assert.equal(nestManager.nests.length, 4);

  // Check each quadrant (NW, NE, SW, SE)
  const [nw, ne, sw, se] = nestManager.nests;
  assert.ok(nw.position.x < -60 && nw.position.z < -60, 'NW nest in negative quadrant');
  assert.ok(ne.position.x > 60 && ne.position.z < -60, 'NE nest in positive X, negative Z');
  assert.ok(sw.position.x < -60 && sw.position.z > 60, 'SW nest in negative X, positive Z');
  assert.ok(se.position.x > 60 && se.position.z > 60, 'SE nest in positive quadrant');
});

test('Mob Nests - Hold-to-plant channeling and arming state transition', () => {
  const scene = new Scene();
  const nest = new MobNest('test_nest', new Vector3(0, 0, 0));
  assert.equal(nest.state, 'IDLE');
  assert.equal(nest.plantProgress, 0);

  // Planting simulation
  nest.state = 'PLANTING';
  nest.plantProgress = 0.5;
  assert.equal(nest.state, 'PLANTING');

  // Reach 100%
  nest.plantProgress = 1.0;
  nest.state = 'ARMED';
  assert.equal(nest.state, 'ARMED');
  assert.equal(nest.fuseTimer, 5.0);

  nest.dispose(scene);
});

test('Mob Nests - Explosion deals player damage, enemy friendly fire, spawns swarm, and destroys nest', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = { spawnDamage: () => {} } as any;
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);
  const player = new Player(scene);
  player.position.set(5, 0, 0); // 5m away from nest (within 25m blast radius)
  const initialEffectiveHp = player.hp + player.shield;

  const nest = new MobNest('exploding_nest', new Vector3(0, 0, 0));
  nest.state = 'ARMED';
  nest.fuseTimer = 0.05;

  // Update ticks past 0
  const result = nest.update(
    0.1,
    scene,
    player,
    new Map(),
    enemyManager,
    damageNumbers
  );

  assert.equal(result.justExploded, true);
  assert.equal(nest.state, 'DESTROYED');

  const currentEffectiveHp = player.hp + player.shield;
  assert.ok(currentEffectiveHp < initialEffectiveHp, 'Player received blast damage for not stepping away');
  assert.equal(initialEffectiveHp - currentEffectiveHp, MobNest.BLAST_DAMAGE, 'Player damage matches MobNest.BLAST_DAMAGE (35)');

  // Swarm spawned
  assert.ok(enemyManager.enemies.length >= 12, 'At least 12 monsters burst out from the nest');

  nest.dispose(scene);
});

test('Mob Nests - Player escapes outside 25m radius takes 0 damage', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = { spawnDamage: () => {} } as any;
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);
  const player = new Player(scene);
  player.position.set(30, 0, 0); // 30m away (escaped beyond 25m radius)
  const initialEffectiveHp = player.hp + player.shield;

  const nest = new MobNest('escaped_nest', new Vector3(0, 0, 0));
  nest.state = 'ARMED';
  nest.fuseTimer = 0.05;

  nest.update(0.1, scene, player, new Map(), enemyManager, damageNumbers);

  assert.equal(nest.state, 'DESTROYED');
  const currentEffectiveHp = player.hp + player.shield;
  assert.equal(currentEffectiveHp, initialEffectiveHp, 'Player escaped blast radius and took 0 damage');

  nest.dispose(scene);
});

test('Mob Nest Manager - isAllNestsDestroyed turns true only when all 4 nests are destroyed', () => {
  const scene = new Scene();
  const nestManager = new MobNestManager(scene);
  nestManager.generateStageNests(4, new SeededRNG(999), []);

  assert.equal(nestManager.isAllNestsDestroyed(), false);
  assert.equal(nestManager.destroyedCount, 0);

  // Destroy 3 nests
  nestManager.nests[0].state = 'DESTROYED';
  nestManager.nests[1].state = 'DESTROYED';
  nestManager.nests[2].state = 'DESTROYED';
  assert.equal(nestManager.destroyedCount, 3);
  assert.equal(nestManager.remainingCount, 1);
  assert.equal(nestManager.isAllNestsDestroyed(), false);

  // Destroy 4th nest
  nestManager.nests[3].state = 'DESTROYED';
  assert.equal(nestManager.destroyedCount, 4);
  assert.equal(nestManager.remainingCount, 0);
  assert.equal(nestManager.isAllNestsDestroyed(), true);

  nestManager.clear();
});
