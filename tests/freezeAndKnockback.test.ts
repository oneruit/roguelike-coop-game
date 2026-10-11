import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Scene } from 'three';
import { Enemy, EnemyConfig } from '../game/src/entities/Enemy';
import { EnemyManager } from '../game/src/entities/EnemyManager';
import { Player } from '../game/src/entities/Player';
import { DropManager } from '../game/src/drops/DropManager';
import { DamageNumberManager } from '../game/src/combat/DamageNumberManager';
import { RIFT_ITEMS } from '../game/src/items/RiftItemSystem';

// Mock DOM for Three.js TextureLoader and CanvasTexture in Node.js
if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElementNS: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      src: '',
      set src(_val: string) {},
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
      height: 100
    }),
    getElementById: () => null,
    querySelectorAll: () => []
  };
}

function createTestMonster(pos = new Vector3(10, 0, 0)): Enemy {
  const config: EnemyConfig = {
    type: 'coyote',
    name: 'Кровожадный койот',
    texturePrefix: '/textures/monsters/monster_coyote',
    hp: 100,
    speed: 5.0,
    damage: 10,
    width: 2.0,
    height: 2.0,
    gemType: 'blue'
  };
  return new Enemy(config, pos);
}

function createTestBoss(pos = new Vector3(15, 0, 0)): Enemy {
  const config: EnemyConfig = {
    type: 'boss',
    name: 'Кровавый демон',
    texturePrefix: '/textures/bosses/boss_demon',
    hp: 5000,
    speed: 2.5,
    damage: 50,
    width: 4.5,
    height: 4.5,
    gemType: 'red',
    isBoss: true
  };
  return new Enemy(config, pos);
}

test('Freeze Mechanic - Monster and Boss stand completely still while frozen', () => {
  const monster = createTestMonster(new Vector3(10, 0, 0));
  const boss = createTestBoss(new Vector3(15, 0, 0));
  const playerPos = new Vector3(0, 0, 0);

  // Initially not frozen, can attack
  assert.equal(monster.isFrozen, false);
  assert.equal(monster.canAttack, true);
  assert.equal(boss.isFrozen, false);
  assert.equal(boss.canAttack, true);

  // Apply freeze for 5 seconds
  monster.freeze(5.0);
  boss.freeze(5.0);

  assert.equal(monster.isFrozen, true);
  assert.equal(monster.canAttack, false);
  assert.equal(monster.freezeTimer, 5.0);

  assert.equal(boss.isFrozen, true);
  assert.equal(boss.canAttack, false);
  assert.equal(boss.freezeTimer, 5.0);

  const initMonsterPos = monster.position.clone();
  const initBossPos = boss.position.clone();

  // Run simulation updates for 2 seconds (4 steps of 0.5s)
  for (let step = 0; step < 4; step++) {
    monster.updateSimulation(0.5, playerPos);
    boss.updateSimulation(0.5, playerPos);
  }

  // Position must NOT have changed ("стоят на месте")
  assert.equal(monster.position.x, initMonsterPos.x, 'Frozen monster must stand in place');
  assert.equal(monster.position.z, initMonsterPos.z, 'Frozen monster must stand in place');
  assert.equal(boss.position.x, initBossPos.x, 'Frozen boss must stand in place');
  assert.equal(boss.position.z, initBossPos.z, 'Frozen boss must stand in place');

  // Freeze timer decremented: 5.0 - 2.0 = 3.0
  assert.ok(Math.abs(monster.freezeTimer - 3.0) < 0.001);
  assert.ok(Math.abs(boss.freezeTimer - 3.0) < 0.001);

  // Advance remaining 3.1 seconds
  monster.updateSimulation(3.1, playerPos);
  boss.updateSimulation(3.1, playerPos);

  // Freeze expired
  assert.equal(monster.isFrozen, false);
  assert.equal(monster.canAttack, true);
  assert.equal(boss.isFrozen, false);
  assert.equal(boss.canAttack, true);

  // Further simulation step should move them towards playerPos
  monster.updateSimulation(0.5, playerPos);
  boss.updateSimulation(0.5, playerPos);
  assert.ok(monster.position.x < initMonsterPos.x, 'Unfrozen monster should resume moving towards player');
  assert.ok(boss.position.x < initBossPos.x, 'Unfrozen boss should resume moving towards player');
});

test('Knockback Mechanic - Knocks back monsters and bosses by 25 meters', () => {
  const playerPos = new Vector3(0, 0, 0);
  const monster = createTestMonster(new Vector3(5, 0, 0));
  const boss = createTestBoss(new Vector3(0, 0, 8));

  // Instant knockback by 25 meters away from player
  monster.knockbackFrom(playerPos, 25.0, 0);
  boss.knockbackFrom(playerPos, 25.0, 0);

  // Monster was at (5, 0, 0), away from (0, 0, 0) -> direction is (+1, 0) -> new position is (30, 0, 0)
  assert.ok(Math.abs(monster.position.x - 30.0) < 0.01, `Expected monster x=30, got ${monster.position.x}`);
  assert.ok(Math.abs(monster.position.z - 0) < 0.01);

  // Boss was at (0, 0, 8), away from (0, 0, 0) -> direction is (0, +1) -> new position is (0, 0, 33)
  assert.ok(Math.abs(boss.position.z - 33.0) < 0.01, `Expected boss z=33, got ${boss.position.z}`);
  assert.ok(Math.abs(boss.position.x - 0) < 0.01);
});

test('Knockback Mechanic - Smooth impulse over 0.25s delivers exactly 25 meters displacement', () => {
  const playerPos = new Vector3(10, 0, 10);
  const monster = createTestMonster(new Vector3(10, 0, 20)); // 10m away along +Z

  monster.knockbackFrom(playerPos, 25.0, 0.25);
  monster.freeze(5.0);

  // Step 0.1s
  monster.updateSimulation(0.1, playerPos);
  assert.ok(monster.position.z > 20, 'Should be sliding outward');

  // Step 0.1s
  monster.updateSimulation(0.1, playerPos);

  // Step 0.1s (exceeds 0.25s duration)
  monster.updateSimulation(0.1, playerPos);

  // Total displacement must be exactly 25 meters along +Z -> original z=20 + 25 = 45
  assert.ok(Math.abs(monster.position.z - 45.0) < 0.001, `Expected monster z=45, got ${monster.position.z}`);
  assert.ok(monster.isFrozen, 'Monster remains frozen after knockback');
});

test('EnemyManager - freezeAndKnockbackAll affects all monsters and bosses', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager(scene);
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);

  const playerPos = new Vector3(0, 0, 0);

  const m1 = createTestMonster(new Vector3(4, 0, 0));
  const m2 = createTestMonster(new Vector3(0, 0, 6));
  const boss = createTestBoss(new Vector3(-5, 0, 0));

  enemyManager.enemies.push(m1, m2, boss);
  enemyManager.activeBoss = boss;

  // Execute freezeAndKnockbackAll for 5 seconds and 25 meters
  enemyManager.freezeAndKnockbackAll(playerPos, 5.0, 25.0);

  // All must be frozen for 5 seconds
  assert.equal(m1.isFrozen, true);
  assert.equal(m1.freezeTimer, 5.0);
  assert.equal(m2.isFrozen, true);
  assert.equal(m2.freezeTimer, 5.0);
  assert.equal(boss.isFrozen, true);
  assert.equal(boss.freezeTimer, 5.0);

  // Advance through 0.25s forced knockback
  for (let i = 0; i < 5; i++) {
    m1.updateSimulation(0.05, playerPos);
    m2.updateSimulation(0.05, playerPos);
    boss.updateSimulation(0.05, playerPos);
  }

  // Check displacements: original dist + 25 meters
  const distM1 = m1.position.distanceTo(playerPos);
  const distM2 = m2.position.distanceTo(playerPos);
  const distBoss = boss.position.distanceTo(playerPos);

  assert.ok(Math.abs(distM1 - 29.0) < 0.05, `Expected m1 dist=29, got ${distM1}`);
  assert.ok(Math.abs(distM2 - 31.0) < 0.05, `Expected m2 dist=31, got ${distM2}`);
  assert.ok(Math.abs(distBoss - 30.0) < 0.05, `Expected boss dist=30, got ${distBoss}`);
});

test('Time Crystal (Chronos Phylactery) - Triggers 5s freeze and 25m knockback on lethal damage', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager(scene);
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);

  const player = new Player(scene, 'ronin');
  player.position.set(0, 0, 0);

  // Add Time Crystal (chronos_phylactery)
  player.addRiftItem(RIFT_ITEMS.chronos_phylactery);
  assert.equal(player.getItemStacks('chronos_phylactery'), 1);
  assert.equal(player.hasChronosReady, true);

  const monster = createTestMonster(new Vector3(3, 0, 0));
  const boss = createTestBoss(new Vector3(0, 0, 4));
  enemyManager.enemies.push(monster, boss);

  let chronosTriggeredAt: Vector3 | null = null;
  player.onChronosTrigger = (pos) => {
    chronosTriggeredAt = pos.clone();
    enemyManager.freezeAndKnockbackAll(pos, 5.0, 25.0);
  };

  // Player takes lethal damage
  player.hp = 10;
  const died = player.takeDamage(100);

  // Player survived due to Time Crystal
  assert.equal(died, false, 'Player must survive lethal damage with Chronos Phylactery');
  assert.equal(player.hasChronosReady, false, 'Chronos is spent for the stage');
  assert.ok(player.hp > 0, 'Player HP was restored');
  assert.equal(player.activeBuffs.has('invulnerable'), true, 'Player has invulnerability buff');
  assert.equal(player.activeBuffs.get('invulnerable')?.duration, 5.0, 'Invulnerability lasts 5.0 seconds');

  // onChronosTrigger fired with player position
  assert.ok(chronosTriggeredAt !== null);
  assert.equal((chronosTriggeredAt as Vector3).x, 0);
  assert.equal((chronosTriggeredAt as Vector3).z, 0);

  // Enemies are frozen for 5s
  assert.equal(monster.isFrozen, true);
  assert.equal(monster.freezeTimer, 5.0);
  assert.equal(boss.isFrozen, true);
  assert.equal(boss.freezeTimer, 5.0);

  // Complete knockback movement
  monster.updateSimulation(0.25, player.position);
  boss.updateSimulation(0.25, player.position);

  // Monster knocked back 25m from x=3 -> x=28
  assert.ok(Math.abs(monster.position.x - 28.0) < 0.05);
  // Boss knocked back 25m from z=4 -> z=29
  assert.ok(Math.abs(boss.position.z - 29.0) < 0.05);
});
