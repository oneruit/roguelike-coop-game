import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Scene } from 'three';
import { Enemy, EnemyConfig } from '../game/src/entities/Enemy';
import { VolatileRingManager } from '../game/src/vfx/VolatileRingVfx';
import { EnemyManager } from '../game/src/entities/EnemyManager';
import { DropManager } from '../game/src/drops/DropManager';
import { DamageNumberManager } from '../game/src/combat/DamageNumberManager';

// Mock DOM for Node.js test environment
const mockCtx: any = new Proxy({
  measureText: () => ({ width: 50 }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} })
}, {
  get: (target, prop) => {
    if (prop in target) return (target as any)[prop];
    return () => {};
  }
});

if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElementNS: () => ({ addEventListener: () => {}, removeEventListener: () => {}, src: '', style: {} }),
    createElement: () => ({ getContext: () => mockCtx, style: {}, width: 100, height: 100 }),
    getElementById: () => null,
    querySelectorAll: () => []
  };
}

function createEliteEnemy(affix: 'volatile' | 'vortex' | 'juggernaut' | 'avenger', hp = 1000, damage = 100): Enemy {
  const config: EnemyConfig = {
    type: 'brute',
    name: 'Элитный брут',
    texturePrefix: '/textures/monsters/monster_brute',
    hp,
    speed: 2.0,
    damage,
    width: 2.4,
    height: 2.4,
    gemType: 'green',
    eliteAffix: affix
  };
  return new Enemy(config, new Vector3(0, 0, 0));
}

test('Volatile Affix - Internal cooldown prevents rapid multiple triggers', () => {
  const enemy = createEliteEnemy('volatile', 1000, 100);
  let dischargeCount = 0;
  enemy.onVolatileDischarge = () => {
    dischargeCount++;
  };

  assert.equal(enemy.volatileCooldownTimer, 0);
  assert.equal(enemy.volatileLastThreshold, 1.0);
  assert.equal(enemy.maxHp, 2200, 'Elite mob gets 2.2x maxHp');

  // 1. First hit crosses 80% threshold (deals 600 dmg, HP = 1600 / 2200 -> 72.7%)
  enemy.takeDamage(600);
  assert.equal(dischargeCount, 1, 'First threshold crossing should trigger discharge');
  assert.ok(enemy.volatileCooldownTimer > 1.0, 'Internal cooldown should be set to ~1.2s');
  assert.ok(Math.abs(enemy.volatileLastThreshold - 0.6) < 0.001, 'Threshold should be updated to 0.6');

  // 2. Second hit immediately afterwards crosses 60% threshold (deals 500 dmg, HP = 1100 / 2200 -> 50%)
  // Since volatileCooldownTimer > 0, it MUST NOT trigger another discharge immediately!
  enemy.takeDamage(500);
  assert.equal(dischargeCount, 1, 'Second discharge must be blocked by internal cooldown');

  // 3. Advance time by 1.3s to expire cooldown
  enemy.updateSimulation(1.3, new Vector3(10, 0, 10));
  assert.equal(enemy.volatileCooldownTimer, 0, 'Cooldown should expire after 1.3s');

  // 4. Third hit crosses 40% threshold (deals 500 dmg, HP = 600 / 2200 -> 27.2%)
  enemy.takeDamage(500);
  assert.equal(dischargeCount, 2, 'Next threshold crossing after cooldown expires should trigger discharge');
  assert.ok(enemy.volatileCooldownTimer > 1.0);
});

test('VolatileRingManager - 0.65s telegraph delay before detonation and damage trigger', () => {
  const scene = new Scene();
  let detonated = false;
  let detonateRadius = 0;
  let detonateDmg = 0;

  const inst = VolatileRingManager.spawn(scene, new Vector3(10, 0, 10), {
    radius: 4.2,
    telegraphDuration: 0.65,
    damage: 35,
    onDetonate: (_pos, r, dmg) => {
      detonated = true;
      detonateRadius = r;
      detonateDmg = dmg;
    }
  });

  assert.equal(detonated, false, 'Must not detonate upon spawn');
  assert.equal(inst.isFinished, false);

  // Advance by 0.3s (during telegraph phase)
  VolatileRingManager.update(0.3);
  assert.equal(detonated, false, 'Must not detonate during telegraph');

  // Advance remaining 0.36s (total > 0.65s) -> Detonation occurs!
  VolatileRingManager.update(0.36);
  assert.equal(detonated, true, 'Must detonate after 0.65s telegraph completes');
  assert.equal(detonateRadius, 4.2);
  assert.equal(detonateDmg, 35);

  // Advance by another 0.25s (shockwave expands and completes)
  VolatileRingManager.update(0.25);
  assert.equal(inst.isFinished, true, 'Effect must finish and clean up after shockwave');
  assert.equal(VolatileRingManager.activeCount, 0);
});

test('EnemyManager - Volatile discharge uses balanced radius (4.2m) and capped damage (30%)', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager();
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);

  const enemy = createEliteEnemy('volatile', 1000, 200);
  enemyManager.enemies.push(enemy);

  let ringTriggered = false;
  let triggerRadius = 0;
  let triggerDamage = 0;

  enemyManager.onVolatileRingTrigger = (_pos, radius, damage) => {
    ringTriggered = true;
    triggerRadius = radius;
    triggerDamage = damage;
  };

  // Register enemy hooks
  (enemyManager as any).registerEnemy(enemy);

  // Trigger discharge (crosses 80% threshold: 600 damage out of 2200 HP)
  enemy.takeDamage(600);

  assert.equal(ringTriggered, false, 'Immediate damage must be 0 due to 0.65s telegraph');

  // Update enemyManager past 0.65s
  enemyManager.update(0.7, new Vector3(0, 0, 0), () => {});

  assert.equal(ringTriggered, true, 'Ring should trigger after 0.65s telegraph');
  assert.equal(triggerRadius, 4.2, 'Radius must be 4.2m (down from 7.0m)');
  assert.ok(triggerDamage <= 65, `Discharge damage must be capped at 65 (got ${triggerDamage})`);
  assert.ok(triggerDamage >= 15, `Discharge damage should be at least 15 (got ${triggerDamage})`);
});

test('Vortex Affix - Pull trigger fires and pulls player with tangible impulse', () => {
  const enemy = createEliteEnemy('vortex', 1000, 100);
  let pullCalled = false;
  let pullRadius = 0;

  enemy.onVortexPull = (_enemy, radius) => {
    pullCalled = true;
    pullRadius = radius;
  };

  // Run simulation for 5.6s
  enemy.updateSimulation(5.6, new Vector3(10, 0, 10));

  assert.equal(pullCalled, true, 'Vortex pull should trigger every 5.5s');
  assert.equal(pullRadius, 14, 'Vortex pull radius should be 14m');
});

test('Stage 5 - Vortex pull is suppressed and vortex affix is excluded on stage 5', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const damageNumbers = new DamageNumberManager();
  const enemyManager = new EnemyManager(scene, dropManager, damageNumbers);

  enemyManager.currentStage = 5;

  let pullFired = false;
  enemyManager.onVortexPullTrigger = () => {
    pullFired = true;
  };

  // 1. Manually registered enemy with vortex affix does NOT trigger pull on stage 5
  const vortexEnemy = createEliteEnemy('vortex', 1000, 100);
  (enemyManager as any).registerEnemy(vortexEnemy);

  vortexEnemy.onVortexPull?.(vortexEnemy, 14, 5.0);
  assert.equal(pullFired, false, 'Vortex pull trigger must be completely suppressed on stage 5');

  // 2. Regular wave spawns on stage 5 must NEVER roll 'vortex'
  for (let i = 0; i < 40; i++) {
    (enemyManager as any).spawnSingleEnemy('brute', new Vector3(0, 0, 0));
  }
  const spawnedElites = enemyManager.enemies;
  assert.ok(spawnedElites.length > 0);
  const hasVortex = spawnedElites.some(e => e.eliteAffix === 'vortex');
  assert.equal(hasVortex, false, 'No enemy spawned on Stage 5 must have vortex affix');

  // 3. Greed trial wave on stage 5 must NEVER roll 'vortex'
  enemyManager.enemies.length = 0;
  enemyManager.spawnGreedTrialWave(new Vector3(0, 0, 0), 20);
  const greedVortex = enemyManager.enemies.some(e => e.eliteAffix === 'vortex');
  assert.equal(greedVortex, false, 'No greed trial enemy on Stage 5 must have vortex affix');
});
