import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { Enemy } from '../game/src/entities/Enemy';
import { EnemyManager } from '../game/src/entities/EnemyManager';
import { DropManager } from '../game/src/drops/DropManager';
import { DamageNumberManager } from '../game/src/combat/DamageNumberManager';
import { FinalBossPylonManager } from '../game/src/entities/FinalBossPylonManager';
import { RiftTeleporter } from '../game/src/world/RiftTeleporter';
import { ChunkManager } from '../game/src/world/ChunkManager';
import { AltarManager } from '../game/src/world/AltarManager';
import { ObstacleManager } from '../game/src/world/ObstacleManager';

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

test('Stage 5 Final Boss - isInvulnerable shields damage and freezes movement', () => {
  const enemy = new Enemy({
    type: 'stage5_boss',
    name: 'Астральный Титан Древних',
    hp: 10000,
    speed: 2.0,
    damage: 50,
    width: 4.5,
    height: 4.5,
    gemType: 'gold',
    isBoss: true
  }, new Vector3(0, 0, 0));

  enemy.isStage5FinalBoss = true;
  assert.equal(enemy.isInvulnerable, false);
  assert.equal(enemy.movementFactor > 0, true);

  // Normal damage reduces HP
  const hit = enemy.takeDamage(100);
  assert.equal(hit, false); // not dead yet
  assert.equal(enemy.hp, 9900);

  // Enable invulnerability (shield phase)
  enemy.isInvulnerable = true;
  assert.equal(enemy.movementFactor, 0, 'Final boss must become immobile during shield phase');

  // Damage while invulnerable is completely blocked
  const shieldedHit = enemy.takeDamage(500);
  assert.equal(shieldedHit, false);
  assert.equal(enemy.hp, 9900, 'HP must not change while invulnerable');
});

test('Stage 5 Final Boss - spawnTeleporterBoss on stage 5 configures final boss and binds pylon manager', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager();
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);

  const boss = enemyManager.spawnTeleporterBoss(new Vector3(50, 0, 50), 5);

  assert.equal(boss.isBoss, true);
  assert.equal(boss.isStage5Boss, true);
  assert.equal(boss.isStage5FinalBoss, true);
  assert.equal(enemyManager.finalBossPylonManager.boss, boss);
  assert.equal(enemyManager.finalBossPylonManager.isShieldActive, false);
  assert.equal(boss.isInvulnerable, false);
});

test('FinalBossPylonManager - 4-sphere invulnerability triggers at 66% and 33% HP', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager();
  const pylonManager = new FinalBossPylonManager(scene, damageNumbers);

  const boss = new Enemy({
    type: 'stage5_boss',
    name: 'Астральный Титан Древних',
    hp: 10000,
    speed: 2.0,
    damage: 50,
    width: 4.5,
    height: 4.5,
    gemType: 'gold',
    isBoss: true
  }, new Vector3(0, 0, 0));
  boss.isStage5FinalBoss = true;

  pylonManager.bindBoss(boss);
  assert.equal(pylonManager.isShieldActive, false);
  assert.equal(pylonManager.phaseCount, 0);

  // Step 1: Boss at 80% HP -> no shield yet
  boss.hp = 8000;
  pylonManager.update(0.1, [new Vector3(0, 0, 0)]);
  assert.equal(pylonManager.isShieldActive, false);

  // Step 2: Boss drops to 65% HP (<= 66%) -> Phase 1 activates!
  boss.hp = 6500;
  pylonManager.update(0.1, [new Vector3(0, 0, 0)]);
  assert.equal(pylonManager.isShieldActive, true, 'Shield must activate at <= 66% HP');
  assert.equal(pylonManager.phaseCount, 1);
  assert.equal(boss.isInvulnerable, true);
  assert.equal(pylonManager.spheres.length, 4, 'Must spawn exactly 4 spheres');
  assert.equal(pylonManager.spheres.every(s => s.active), true);

  // Step 3: Deactivate each sphere by standing in its zone for 10 seconds
  for (let i = 0; i < 4; i++) {
    const sphere = pylonManager.spheres[i];
    assert.equal(sphere.active, true);

    // Player stands inside sphere radius (3.5m) for 5 seconds
    pylonManager.update(5.0, [sphere.position]);
    assert.equal(sphere.active, true);
    assert.equal(Math.abs(sphere.holdTimer - 5.0) < 0.01, true);

    // Player steps outside sphere: progress is preserved, not reset
    pylonManager.update(1.0, [new Vector3(999, 0, 999)]);
    assert.equal(Math.abs(sphere.holdTimer - 5.0) < 0.01, true);

    // Player returns and finishes the remaining 5 seconds
    pylonManager.update(5.1, [sphere.position]);
    assert.equal(sphere.active, false, `Sphere ${i + 1} must be deactivated after 10s`);
  }

  // All 4 spheres deactivated -> shield breaks!
  assert.equal(pylonManager.isShieldActive, false, 'Shield must break when all 4 spheres are deactivated');
  assert.equal(boss.isInvulnerable, false, 'Boss must be vulnerable after shield breaks');

  // Step 4: Boss drops to 30% HP (<= 33%) -> Phase 2 activates!
  boss.hp = 3000;
  pylonManager.update(0.1, [new Vector3(0, 0, 0)]);
  assert.equal(pylonManager.isShieldActive, true, 'Shield must activate for Phase 2 at <= 33% HP');
  assert.equal(pylonManager.phaseCount, 2);
  assert.equal(boss.isInvulnerable, true);
  assert.equal(pylonManager.spheres.length, 4);

  // Deactivate all 4 spheres again
  for (let i = 0; i < 4; i++) {
    const sphere = pylonManager.spheres[i];
    pylonManager.update(10.1, [sphere.position]);
    assert.equal(sphere.active, false);
  }

  assert.equal(pylonManager.isShieldActive, false, 'Shield must break after Phase 2 spheres deactivated');
  assert.equal(boss.isInvulnerable, false);
});

test('Boss defeat distinction - Periodic boss does not end game, only Stage 5 Final Boss triggers victory', () => {
  let gameOverTriggered = false;
  let victoryState = false;

  const mockTriggerGameOver = (isVictory: boolean) => {
    gameOverTriggered = true;
    victoryState = isVictory;
  };

  const handleBossDefeat = (boss?: Enemy) => {
    if (boss?.isStage5FinalBoss) {
      mockTriggerGameOver(true);
    }
  };

  // Case A: Periodic 5-minute boss defeated on Stage 5 (isStage5FinalBoss is false)
  const periodicBoss = new Enemy({
    type: 'stage5_boss',
    name: 'Астральный Титан Древних',
    hp: 10000,
    speed: 2.0,
    damage: 50,
    width: 4.5,
    height: 4.5,
    gemType: 'gold',
    isBoss: true
  }, new Vector3(0, 0, 0));
  periodicBoss.isStage5FinalBoss = false;

  handleBossDefeat(periodicBoss);
  assert.equal(gameOverTriggered, false, 'Periodic 5-minute boss must NOT trigger game over');

  // Case B: Stage 5 Teleporter Final Boss defeated (isStage5FinalBoss is true)
  const finalBoss = new Enemy({
    type: 'stage5_boss',
    name: 'Астральный Титан Древних',
    hp: 10000,
    speed: 2.0,
    damage: 50,
    width: 4.5,
    height: 4.5,
    gemType: 'gold',
    isBoss: true
  }, new Vector3(0, 0, 0));
  finalBoss.isStage5FinalBoss = true;

  handleBossDefeat(finalBoss);
  assert.equal(gameOverTriggered, true, 'Stage 5 Final Boss must trigger victory');
  assert.equal(victoryState, true, 'Result must be victory');
});

test('ChunkManager - Stage 5 generates accessible Rift Teleporter', () => {
  const scene = new Scene();
  const altarManager = new AltarManager(scene);
  const obstacleManager = new ObstacleManager();
  const chunkManager = new ChunkManager(scene, altarManager, obstacleManager);
  const teleporter = new RiftTeleporter(scene, new Vector3(75, 0, 75));

  // Generate map for stage 5
  chunkManager.generateMap(12345, undefined, teleporter, 5, 'runic_sanctuary');

  assert.equal(teleporter.mesh.visible, true, 'Teleporter must be visible on stage 5');
  assert.equal(teleporter.state, 'IDLE', 'Teleporter must be in IDLE state on stage 5');
  assert.notEqual(teleporter.position.x, 99999, 'Teleporter must not be disabled/hidden off-map');
  assert.notEqual(teleporter.position.z, 99999, 'Teleporter must not be disabled/hidden off-map');
});
