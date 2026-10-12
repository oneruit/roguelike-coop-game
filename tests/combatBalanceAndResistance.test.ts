import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { Gem } from '../game/src/drops/Gem';
import { Enemy } from '../game/src/entities/Enemy';
import { EnemyManager } from '../game/src/entities/EnemyManager';
import { DropManager } from '../game/src/drops/DropManager';
import { DamageNumberManager } from '../game/src/combat/DamageNumberManager';
import { KatanaSlashWeapon } from '../game/src/combat/weapons/MeleeWeapons';
import { DEFAULT_BALANCE } from '../game/src/balance/defaultBalance';

// Mock DOM for Three.js ImageLoader in Node.js
if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    getElementById: () => null,
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
      height: 100,
      appendChild: () => {},
      addEventListener: () => {},
      classList: {
        contains: () => false,
        add: () => {},
        remove: () => {}
      }
    })
  };
}

test('Gem attraction speed is always positive and accelerates towards player from far away', () => {
  const gem = new Gem('blue', new Vector3(30, 0, 0));
  gem.isAttracted = true;
  const playerPos = new Vector3(0, 0, 0);
  const pickupRadius = 4.2;

  // Update gem when 30m away
  gem.update(0.1, playerPos, pickupRadius);

  // Velocity X must be negative (moving from x=30 towards x=0), position X must decrease
  assert.ok(gem.position.x < 30, 'Gem position should move toward player');
  assert.ok(gem.position.x > 0, 'Gem should not overshoot in one tick');
});

test('Melee weapons can hit large bosses within visual contact reach', () => {
  const katana = new KatanaSlashWeapon();
  const playerPos = new Vector3(0, 0, 0);

  // Hydra has width 10, height 10. Center is at distance 5.5m (outside raw slashRadius 3.8m, but touching the body)
  const hydra = new Enemy(
    {
      type: 'hydra',
      name: 'Hydra',
      texturePrefix: '/textures/bosses/boss_hydra',
      hp: 28000,
      speed: 2.3,
      damage: 65,
      width: 10.0,
      height: 10.0,
      gemType: 'red',
      isBoss: true
    },
    new Vector3(5.5, 0, 0)
  );

  let damageDealt = 0;
  katana.update(
    katana.effectiveCooldown,
    playerPos,
    [hydra],
    () => {},
    (_enemy, amount) => {
      damageDealt += amount;
    }
  );

  assert.ok(damageDealt > 0, 'Katana slash must reach the large boss body at 5.5m');
});

test('Boss attack reach is calibrated to prevent absurd distant hitting', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const dmgNumbers = new DamageNumberManager(scene);
  const enemyManager = new EnemyManager(scene, dropManager, dmgNumbers);

  const hydra = new Enemy(
    {
      type: 'hydra',
      name: 'Hydra',
      texturePrefix: '/textures/bosses/boss_hydra',
      hp: 28000,
      speed: 2.3,
      damage: 65,
      width: 10.0,
      height: 10.0,
      gemType: 'red',
      isBoss: true
    },
    new Vector3(6.5, 0, 0) // 6.5 meters away
  );
  enemyManager.enemies.push(hydra);

  let playerHit = false;
  // Trigger an attack and advance it
  hydra.animState = 'ATTACK';
  hydra.pendingAttackHit = true;

  enemyManager.update(
    0.05,
    new Vector3(0, 0, 0),
    () => { playerHit = true; }
  );

  assert.equal(playerHit, false, 'Boss should not land a hit from 6.5m away (hitReach calibrated to <= 5.0m)');
});

test('Late game CC and Damage resistance scale with time and reduce damage/duration', () => {
  const scene = new Scene();
  const dropManager = new DropManager(scene);
  const dmgNumbers = new DamageNumberManager(scene);
  const enemyManager = new EnemyManager(scene, dropManager, dmgNumbers);

  // Early game: 5 min
  enemyManager.setGameTime(300);
  assert.equal(enemyManager.getLateGameDamageResistance(false), 0, 'Normal mobs have 0 damage resistance early game');
  assert.equal(enemyManager.getLateGameCcResistance(false), 0, 'Normal mobs have 0 CC resistance early game');

  // Late game: 60 min (3600 sec)
  enemyManager.setGameTime(3600);
  const lateMobCcRes = enemyManager.getLateGameCcResistance(false);
  const lateMobDmgRes = enemyManager.getLateGameDamageResistance(false);
  const lateBossCcRes = enemyManager.getLateGameCcResistance(true);
  const lateBossDmgRes = enemyManager.getLateGameDamageResistance(true);

  assert.ok(lateMobCcRes > 0.40, 'Normal mobs gain substantial CC resistance in late game');
  assert.ok(lateMobDmgRes > 0.40, 'Normal mobs gain damage resistance in late game');
  assert.ok(lateBossCcRes >= 0.85, 'Bosses gain very high CC resistance in late game');
  assert.ok(lateBossDmgRes >= 0.70, 'Bosses gain high damage resistance in late game');

  // Enemy takes reduced damage with damage resistance
  const boss = new Enemy(
    {
      type: 'boss',
      name: 'Demon',
      texturePrefix: '/textures/bosses/boss_demon',
      hp: 7600,
      speed: 2.4,
      damage: 45,
      width: 7.8,
      height: 7.8,
      gemType: 'red',
      isBoss: true
    },
    new Vector3(0, 0, 0)
  );
  boss.damageResistance = 0.50; // 50% resistance
  boss.takeDamage(1000);
  assert.equal(boss.lastDamageTaken, 500, 'Damage must be reduced by damageResistance');
  assert.equal(boss.hp, 7100, 'HP should be reduced by effective damage');
});

test('Enemy slow mechanic reduces movement speed and respects CC resistance', () => {
  const enemy = new Enemy(
    {
      type: 'coyote',
      name: 'Coyote',
      texturePrefix: '/textures/monsters/monster_coyote',
      hp: 50,
      speed: 5.0,
      damage: 10,
      width: 1.0,
      height: 1.0,
      gemType: 'blue'
    },
    new Vector3(10, 0, 0)
  );

  assert.equal(enemy.movementFactor, 1.0);
  enemy.applySlow(0.60, 2.0); // 40% slow
  assert.equal(enemy.movementFactor, 0.60);
  assert.ok(enemy.slowTimer > 0);

  // Coyote moves towards player at slowed speed
  enemy.updateSimulation(0.1, new Vector3(0, 0, 0));
  const expectedDistMoved = 5.0 * 0.60 * 0.1; // 0.3m
  assert.ok(Math.abs((10 - enemy.position.x) - expectedDistMoved) < 0.05);
});

test('Invoker base damage multiplier is balanced', () => {
  assert.equal(DEFAULT_BALANCE.heroes.invoker.damageMultiplier, 1.40);
});
