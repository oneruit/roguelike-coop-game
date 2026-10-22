import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Scene } from 'three';
import { Enemy, EnemyConfig } from '../game/src/entities/Enemy';
import { FinalBossPylonManager } from '../game/src/entities/FinalBossPylonManager';
import { EnemyManager } from '../game/src/entities/EnemyManager';
import { DropManager } from '../game/src/drops/DropManager';
import { DamageNumberManager } from '../game/src/combat/DamageNumberManager';
import { ChunkManager } from '../game/src/world/ChunkManager';
import { RiftTeleporter } from '../game/src/world/RiftTeleporter';
import { ChestManager } from '../game/src/world/ChestManager';
import { AltarManager } from '../game/src/world/AltarManager';
import { ObstacleManager } from '../game/src/world/ObstacleManager';

// Bulletproof Mock DOM for Three.js TextureLoader and CanvasTexture in Node.js
const mockGradient = {
  addColorStop: () => {}
};

const mockCtx: any = new Proxy({
  measureText: () => ({ width: 50 }),
  createLinearGradient: () => mockGradient,
  createRadialGradient: () => mockGradient
}, {
  get: (target, prop) => {
    if (prop in target) return (target as any)[prop];
    return () => {};
  }
});

if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElementNS: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      src: '',
      style: {}
    }),
    createElement: (tag: string) => ({
      getContext: () => mockCtx,
      style: {},
      width: 100,
      height: 100
    }),
    getElementById: () => null,
    querySelectorAll: () => []
  };
} else {
  const origCreate = (globalThis as any).document.createElement;
  (globalThis as any).document.createElement = (tag: string) => {
    if (tag === 'canvas') {
      return {
        getContext: () => mockCtx,
        style: {},
        width: 100,
        height: 100
      };
    }
    return origCreate ? origCreate.call((globalThis as any).document, tag) : {};
  };
}

function createBoss(hp = 10000, isFinal = false): Enemy {
  const config: EnemyConfig = {
    type: 'stage5_boss',
    name: 'Древний Титан Святилища',
    texturePrefix: '/textures/bosses/boss_hydra',
    hp,
    speed: 3.0,
    damage: 80,
    width: 6.0,
    height: 6.0,
    gemType: 'red',
    isBoss: true
  };
  const boss = new Enemy(config, new Vector3(0, 0, 0));
  if (isFinal) {
    boss.isStage5FinalBoss = true;
  }
  return boss;
}

test('Stage 5 Final Boss - Invulnerability mechanics and movement freeze', () => {
  const boss = createBoss(10000, true);
  assert.equal(boss.isInvulnerable, false);
  assert.equal(boss.movementFactor, 1.0);

  // Normal damage applies
  const initialHp = boss.hp;
  const isFatal = boss.takeDamage(1000);
  assert.equal(isFatal, false);
  assert.ok(boss.hp < initialHp);

  const hpBeforeInvuln = boss.hp;

  // Set invulnerable
  boss.isInvulnerable = true;
  assert.equal(boss.movementFactor, 0, 'Stage 5 Final Boss must freeze in place while invulnerable');

  // Damage while invulnerable must deal 0 and preserve HP
  const invulnFatal = boss.takeDamage(2000);
  assert.equal(invulnFatal, false);
  assert.equal(boss.hp, hpBeforeInvuln);

  // Bleed / Burn ticks do not lower HP while invulnerable
  boss.addBleed(500, 3, 'player');
  boss.updateBleed(1.0);
  assert.equal(boss.hp, hpBeforeInvuln, 'Bleed must not damage invulnerable boss');

  boss.applyBurn(3.0, 'player');
  boss.updateSimulation(1.0, new Vector3(5, 0, 5));
  assert.equal(boss.hp, hpBeforeInvuln, 'Burn must not damage invulnerable boss');

  // Removing invulnerability restores movement and damage intake
  boss.isInvulnerable = false;
  assert.equal(boss.movementFactor, 1.0);
  boss.takeDamage(500);
  assert.ok(boss.hp < hpBeforeInvuln);
});

test('FinalBossPylonManager - 4 Spheres, 10s hold timer, and 2-phase lifecycle', () => {
  const scene = new Scene();
  const pylonManager = new FinalBossPylonManager(scene);
  const boss = createBoss(10000, true);

  pylonManager.bindBoss(boss);
  assert.equal(pylonManager.phaseCount, 0);
  assert.equal(pylonManager.isShieldActive, false);
  assert.equal(pylonManager.spheres.length, 0);

  // 1. Lower boss HP to 65% (below 66% threshold for Phase 1)
  boss.hp = 6500;
  pylonManager.update(0.1, [new Vector3(100, 0, 100)]); // Player far away

  assert.equal(pylonManager.phaseCount, 1, 'Phase 1 should be triggered at <= 66% HP');
  assert.equal(pylonManager.isShieldActive, true, 'Shield must be active');
  assert.equal(boss.isInvulnerable, true, 'Boss must be invulnerable');
  assert.equal(pylonManager.spheres.length, 4, 'Exactly 4 spheres must be spawned');

  // Verify sphere positions are ~22m from boss (+8m / 2 cells further away)
  for (const s of pylonManager.spheres) {
    const dist = s.position.distanceTo(boss.position);
    assert.ok(Math.abs(dist - 22.0) < 0.1, `Sphere distance should be ~22m, got ${dist}`);
    assert.equal(s.active, true);
    assert.equal(s.holdTimer, 0);
  }

  // 2. Stand inside sphere 0 (within 3.5m radius)
  const sphere0 = pylonManager.spheres[0];
  const insidePos0 = sphere0.position.clone();

  // Spend 5 seconds inside sphere 0
  pylonManager.update(5.0, [insidePos0]);
  assert.ok(Math.abs(sphere0.holdTimer - 5.0) < 0.01, 'Sphere 0 should have accumulated 5.0s');
  assert.equal(sphere0.active, true, 'Sphere 0 not yet deactivated');

  // Step outside sphere 0 (pause progress)
  pylonManager.update(2.0, [new Vector3(500, 0, 500)]);
  assert.ok(Math.abs(sphere0.holdTimer - 5.0) < 0.01, 'Progress should pause when outside zone');

  // Spend remaining 5 seconds inside sphere 0 to complete 10s requirement
  pylonManager.update(5.0, [insidePos0]);
  assert.equal(sphere0.active, false, 'Sphere 0 must be deactivated after 10.0s');
  assert.equal(pylonManager.isShieldActive, true, 'Shield remains active while other spheres remain');

  // Deactivate spheres 1, 2, 3
  for (let i = 1; i < 4; i++) {
    const s = pylonManager.spheres[i];
    pylonManager.update(10.0, [s.position.clone()]);
    assert.equal(s.active, false, `Sphere ${i} must be deactivated`);
  }

  // All 4 spheres deactivated -> shield should break immediately
  assert.equal(pylonManager.isShieldActive, false, 'Shield must break once all 4 spheres are deactivated');
  assert.equal(boss.isInvulnerable, false, 'Boss must lose invulnerability once shield breaks');

  // 3. Lower boss HP to 30% (below 33% threshold for Phase 2)
  boss.hp = 3000;
  pylonManager.update(0.1, [new Vector3(100, 0, 100)]);

  assert.equal(pylonManager.phaseCount, 2, 'Phase 2 should trigger at <= 33% HP');
  assert.equal(pylonManager.isShieldActive, true);
  assert.equal(boss.isInvulnerable, true);
  assert.equal(pylonManager.spheres.length, 4);
  assert.ok(pylonManager.spheres.every(s => s.active));

  // Complete Phase 2 spheres
  for (let i = 0; i < 4; i++) {
    pylonManager.update(10.0, [pylonManager.spheres[i].position.clone()]);
  }

  assert.equal(pylonManager.isShieldActive, false, 'Shield must break after Phase 2');
  assert.equal(boss.isInvulnerable, false, 'Boss must lose invulnerability after Phase 2');

  // Further HP drops should not trigger a 3rd phase
  boss.hp = 1000;
  pylonManager.update(0.1, [new Vector3(0, 0, 0)]);
  assert.equal(pylonManager.phaseCount, 2, 'Mechanic only triggers 2 times total');
});

test('EnemyManager - spawnTieredBoss vs spawnTeleporterBoss stage 5 final boss flag', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager();
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);

  // 1. Spawning 5-minute periodic boss does NOT mark isStage5FinalBoss
  enemyManager.spawnTieredBoss(new Vector3(0, 0, 0), 1);
  const periodicBoss = enemyManager.activeBoss;
  assert.ok(periodicBoss);
  assert.equal(periodicBoss.isStage5FinalBoss, false);

  // 2. Spawning stage 4 teleporter boss does NOT mark isStage5FinalBoss
  const stage4Boss = enemyManager.spawnTeleporterBoss(new Vector3(10, 0, 10), 4);
  assert.equal(stage4Boss.isStage5FinalBoss, false);

  // 3. Spawning stage 5 teleporter boss DOES mark isStage5FinalBoss and grants dense tanky resistance
  const stage5Boss = enemyManager.spawnTeleporterBoss(new Vector3(20, 0, 20), 5);
  assert.equal(stage5Boss.isStage5FinalBoss, true);
  assert.equal(stage5Boss.isBoss, true);
  assert.ok(stage5Boss.damageResistance >= 0.60, 'Stage 5 Final Boss must spawn with >= 60% damage resistance');

  // Verify damage resistance is preserved across EnemyManager.update() ticks
  enemyManager.update(0.1, new Vector3(0, 0, 0));
  assert.ok(stage5Boss.damageResistance >= 0.60, 'Stage 5 Final Boss must retain >= 60% damage resistance in update loop');

  // 4. onBossDefeat receives the specific boss entity
  let defeatedBossParam: Enemy | undefined;
  enemyManager.onBossDefeat = (boss) => {
    defeatedBossParam = boss;
  };

  // Simulate killing periodic boss
  periodicBoss.hp = 0;
  periodicBoss.isAlive = false;
  enemyManager.update(0.1, new Vector3(0, 0, 0));
  assert.equal(defeatedBossParam, periodicBoss);
  assert.equal(defeatedBossParam?.isStage5FinalBoss, false, 'Periodic boss death must not have isStage5FinalBoss');

  // Simulate killing stage 5 final boss
  stage5Boss.hp = 0;
  stage5Boss.isAlive = false;
  enemyManager.update(0.1, new Vector3(0, 0, 0));
  assert.equal(defeatedBossParam, stage5Boss);
  assert.equal(defeatedBossParam?.isStage5FinalBoss, true, 'Stage 5 final boss must have isStage5FinalBoss === true');
});

test('ChunkManager - Stage 5 generates teleporter normally (not disabled)', () => {
  const scene = new Scene();
  const altarManager = new AltarManager(scene);
  const obstacleManager = new ObstacleManager();
  const chunkManager = new ChunkManager(scene, altarManager, obstacleManager);
  const teleporter = new RiftTeleporter(scene, new Vector3(0, 0, 0));
  const chestManager = new ChestManager(scene);

  // Stage 5 generation
  chunkManager.generateMap(12345, chestManager, teleporter, 5, 'runic_sanctum');

  assert.equal(teleporter.state, 'IDLE', 'Teleporter must remain in IDLE state on stage 5, ready for player activation');
  assert.equal(teleporter.isOpened, false, 'Teleporter is closed until activated');
  assert.ok(teleporter.position.length() > 0, 'Teleporter must have a non-zero sector position on stage 5');
});

test('RiftTeleporter - Stage 5 interaction prompt provides Victory Expedition completion', () => {
  const scene = new Scene();
  const teleporter = new RiftTeleporter(scene, new Vector3(0, 0, 0));
  teleporter.state = 'WARP_READY';

  // 1. Stage 1-4 standard transition prompt
  const normalPrompt = teleporter.getInteraction(new Vector3(0, 0, 0), false);
  assert.equal(normalPrompt.canInteract, true);
  assert.equal(normalPrompt.action, 'warp');
  assert.match(normalPrompt.prompt, /Переход на следующий биом/);

  // 2. Stage 5 victory completion prompt
  const stage5Prompt = teleporter.getInteraction(new Vector3(0, 0, 0), true);
  assert.equal(stage5Prompt.canInteract, true);
  assert.equal(stage5Prompt.action, 'warp');
  assert.match(stage5Prompt.prompt, /Завершить экспедицию с Победой!/);
});

test('EnemyManager - Endless Horde mode increases mob HP, damage, and speed scaling', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager();
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);

  enemyManager.currentStage = 5;
  const initialHpMult = enemyManager.getHpMultiplier();
  const initialDmgMult = enemyManager.getDamageMultiplier();
  const initialSpdMult = enemyManager.getSpeedMultiplier();

  // Activate endless horde
  enemyManager.activateEndlessHorde();
  assert.equal(enemyManager.isEndlessHordeActive, true);
  assert.equal(enemyManager.endlessHordeTimer, 0);

  // Advance time by 60 seconds (1 minute of horde survival)
  enemyManager.update(60, new Vector3(0, 0, 0));
  assert.equal(enemyManager.endlessHordeTimer, 60);

  const hordeHpMult = enemyManager.getHpMultiplier();
  const hordeDmgMult = enemyManager.getDamageMultiplier();
  const hordeSpdMult = enemyManager.getSpeedMultiplier();

  assert.ok(hordeHpMult > initialHpMult * 1.5, `Horde HP multiplier (${hordeHpMult}) should scale strongly above base (${initialHpMult})`);
  assert.ok(hordeDmgMult > initialDmgMult * 1.4, `Horde damage multiplier (${hordeDmgMult}) should scale above base (${initialDmgMult})`);
  assert.ok(hordeSpdMult > initialSpdMult, `Horde speed multiplier (${hordeSpdMult}) should exceed base (${initialSpdMult})`);
});
