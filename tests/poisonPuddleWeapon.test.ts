import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { PoisonPuddleWeapon } from '../game/src/combat/weapons/MagicWeapons';
import { SimPoisonPuddleWeapon } from '../game/src/sim/weapons/SimMagicWeapons';
import { createSimWeaponById } from '../game/src/sim/weapons/SimWeaponFactory';
import { DEFAULT_BALANCE } from '../game/src/balance/defaultBalance';
import { Projectile } from '../game/src/combat/Projectile';
import { SimVec3 } from '../game/src/sim/math/SimVector';
import { SimProjectileData } from '../game/src/sim/weapons/SimWeaponBase';

test('Poison Puddle - Balance configuration exists and is well-formed', () => {
  const balance = DEFAULT_BALANCE.weapons.poison_puddle;
  assert.ok(balance, 'poison_puddle weapon balance config must exist');
  assert.equal(balance.id, 'poison_puddle');
  assert.equal(balance.name, 'Ядовитая лужа');
  assert.equal(balance.icon, '🧪');
  assert.equal(balance.damage, 18);
  assert.equal(balance.cooldown, 2.0);
  assert.equal(balance.damagePerLevel, 5);
  assert.equal(balance.maxLevel, 12);
  assert.equal(balance.range, 20);
  assert.equal(balance.splashRadius, 2.2);
});

test('Poison Puddle - Combat weapon instantiation, stats, and upgrade progression', () => {
  const weapon = new PoisonPuddleWeapon();
  assert.equal(weapon.id, 'poison_puddle');
  assert.equal(weapon.name, 'Ядовитая лужа');
  assert.equal(weapon.icon, '🧪');
  assert.equal(weapon.level, 1);
  assert.equal(weapon.damage, 18);
  assert.equal(weapon.cooldown, 2.0);

  // Upgrade level 2: Cooldown reduction step
  weapon.upgrade('common');
  assert.equal(weapon.level, 2);
  assert.equal(weapon.damage, 23);
  assert.ok(weapon.cooldown < 2.0, 'Level 2 should reduce cooldown');

  // Upgrade level 3: +1 puddle
  const descLvl3 = weapon.getNextUpgradeDescription('common');
  assert.ok(descLvl3.includes('ядовитая лужа'), 'Level 3 description mentions additional puddle');
  weapon.upgrade('common');
  assert.equal(weapon.level, 3);
  assert.equal(weapon.damage, 28);

  // Upgrade to max level 12
  while (weapon.level < weapon.maxLevel) {
    weapon.upgrade('common');
  }
  assert.equal(weapon.level, 12);
  assert.equal(weapon.damage, 18 + 11 * 5); // 73
  assert.equal(weapon.getNextUpgradeDescription('common'), 'Максимальный уровень (12)');
});

test('Poison Puddle - Spawns projectile with isPoisonPuddle flag', () => {
  const weapon = new PoisonPuddleWeapon();
  const playerPos = new Vector3(0, 0, 0);
  const dummyEnemy = {
    position: new Vector3(5, 0, 5),
    isAlive: true,
    width: 1,
    height: 1
  } as any;

  const spawned: Projectile[] = [];
  weapon.update(2.5, playerPos, [dummyEnemy], (p) => spawned.push(p));

  assert.equal(spawned.length, 1, 'Should spawn 1 poison puddle projectile');
  const proj = spawned[0];
  assert.equal(proj.isPoisonPuddle, true, 'Projectile must have isPoisonPuddle flag set to true');
  assert.equal(proj.damage, 18);
  assert.ok(proj.radius >= 2.0, 'Radius should match puddle radius');
  assert.equal(proj.onHit(), false, 'Puddle projectile should not be destroyed on single hit');
});

test('Poison Puddle - Sim weapon factory creation and simulation update', () => {
  const simWeapon = createSimWeaponById('poison_puddle');
  assert.ok(simWeapon, 'Sim weapon factory must create poison_puddle');
  assert.ok(simWeapon instanceof SimPoisonPuddleWeapon);
  assert.equal(simWeapon.id, 'poison_puddle');

  const playerRef = {
    id: 'p1',
    position: new SimVec3(0, 0, 0),
    isAlive: true,
    isDowned: false,
    damageMultiplier: 1.2
  };
  const enemyRef = {
    id: 'e1',
    position: new SimVec3(4, 0, 4),
    isAlive: true
  };

  const spawnedSim: SimProjectileData[] = [];
  simWeapon.update(
    2.5,
    playerRef as any,
    [enemyRef],
    (p) => spawnedSim.push(p),
    () => {}
  );

  assert.equal(spawnedSim.length, 1);
  assert.equal(spawnedSim[0].isPoisonPuddle, true);
  assert.equal(spawnedSim[0].damage, 18 * 1.2);

  // Upgrade simulation weapon
  simWeapon.upgrade();
  assert.equal(simWeapon.level, 2);
  assert.equal(simWeapon.damage, 23);
});
