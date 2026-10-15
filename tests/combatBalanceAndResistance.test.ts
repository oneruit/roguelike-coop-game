import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Vector3 } from 'three';
import { Gem } from '../game/src/drops/Gem';
import { Enemy } from '../game/src/entities/Enemy';
import { EnemyManager } from '../game/src/entities/EnemyManager';
import { DropManager } from '../game/src/drops/DropManager';
import { DamageNumberManager } from '../game/src/combat/DamageNumberManager';
import { KatanaSlashWeapon } from '../game/src/combat/weapons/MeleeWeapons';
import {
  BowWeapon,
  KukriWeapon,
  ReaperScytheWeapon,
  GreatswordWeapon,
  getWeaponEffectiveCap
} from '../game/src/combat/Weapon';
import { Player } from '../game/src/entities/Player';
import { MerchantManager } from '../game/src/world/MerchantManager';
import { BiomeManager } from '../game/src/world/BiomeManager';
import { LevelUpUI, type LevelUpUIContext } from '../game/src/ui/modules/LevelUpUI';
import { DEFAULT_BALANCE } from '../game/src/balance/defaultBalance';
import { PlayerStatusManager } from '../game/src/entities/PlayerStatusManager';

// Mock DOM for Three.js ImageLoader in Node.js
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
  const dmgNumbers = new DamageNumberManager();
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
  const dmgNumbers = new DamageNumberManager();
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

test('PlayerStatusManager handles burn, shock, and slow', () => {
  let tickDamageDealt = 0;
  const statusMgr = new PlayerStatusManager();
  const maxHp = 1000;
  const onBurnTick = (dmg: number) => { tickDamageDealt += dmg; };

  // 1. Burn: 2% of 1000 max HP = 20 dmg/sec
  statusMgr.applyBurn(3.0);
  assert.equal(statusMgr.isBurning, true);
  statusMgr.update(1.0, onBurnTick, maxHp);
  assert.equal(tickDamageDealt, 20);
  statusMgr.update(2.0, onBurnTick, maxHp);
  assert.equal(tickDamageDealt, 60);
  assert.equal(statusMgr.isBurning, false);

  // 2. Shock: +10% incoming damage for 5s
  statusMgr.applyShock(5.0);
  assert.equal(statusMgr.isShocked, true);
  assert.equal(statusMgr.incomingDamageMultiplier, 1.10);
  statusMgr.update(5.0, onBurnTick, maxHp);
  assert.equal(statusMgr.isShocked, false);
  assert.equal(statusMgr.incomingDamageMultiplier, 1.0);

  // 3. Slow: speed * 0.65 for 3s
  statusMgr.applySlow(0.65, 3.0);
  assert.equal(statusMgr.isSlowed, true);
  assert.equal(statusMgr.movementMultiplier, 0.65);
  statusMgr.update(3.0, onBurnTick, maxHp);
  assert.equal(statusMgr.isSlowed, false);
  assert.equal(statusMgr.movementMultiplier, 1.0);
});

test('Enemy status effects: Burn (2% max HP/sec), Shock (+10% damage taken), Stun (halts movement)', () => {
  const enemy = new Enemy(
    {
      type: 'skeleton',
      name: 'Skeleton',
      texturePrefix: '/textures/monsters/monster_skeleton',
      hp: 1000,
      speed: 3.0,
      damage: 10,
      width: 1.0,
      height: 1.0,
      gemType: 'blue'
    },
    new Vector3(5, 0, 0)
  );

  // Shock test
  assert.equal(enemy.isShocked, false);
  enemy.applyShock(5.0);
  assert.equal(enemy.isShocked, true);
  enemy.takeDamage(100);
  assert.equal(enemy.lastDamageTaken, 110, 'Shocked enemy takes 10% more damage (100 * 1.10 = 110)');

  // Burn test
  let burnDamage = 0;
  enemy.onBleedDamage = (_target, amount) => { burnDamage += amount; };
  enemy.applyBurn(3.0, 'p1', 'fireball');
  assert.equal(enemy.isBurning, true);
  enemy.updateSimulation(1.0, new Vector3(0, 0, 0));
  // 2% of 1000 = 20 damage per second
  assert.equal(burnDamage, 20);

  // Stun test
  enemy.stun(2.0);
  assert.equal(enemy.isStunned, true);
  const posX = enemy.position.x;
  enemy.updateSimulation(0.5, new Vector3(0, 0, 0));
  assert.equal(enemy.position.x, posX, 'Stunned enemy does not move');
  enemy.updateSimulation(1.6, new Vector3(0, 0, 0));
  assert.equal(enemy.isStunned, false, 'Stun expires after duration');
});

test('Weapon tiers: Tier 3 (starter), Tier 2 (grade 1), Tier 1 (grade 2)', () => {
  const katana = new KatanaSlashWeapon();
  assert.equal(katana.tier, 3, 'Base weapon is Tier 3 (starter/worst)');
  assert.equal(katana.tierName, 'Тир 3');

  katana.awakenedGrade = 1;
  assert.equal(katana.tier, 2, 'Awakened Grade 1 is Tier 2');
  assert.equal(katana.tierName, 'Тир 2');
  assert.equal(katana.getGradePrefix(), '[ТИР 2 • x2] ');

  katana.awakenedGrade = 2;
  assert.equal(katana.tier, 1, 'Awakened Grade 2 is Tier 1 (best)');
  assert.equal(katana.tierName, 'Тир 1');
  assert.equal(katana.getGradePrefix(), '[ТИР 1 • x3] ');
});

test('Boss relics golem_core and molten_scale balance definitions', () => {
  const golemCore = DEFAULT_BALANCE.items.golem_core;
  assert.ok(golemCore, 'golem_core exists in balance');
  assert.equal(golemCore.name, 'Око Титана');

  const moltenScale = DEFAULT_BALANCE.items.molten_scale;
  assert.ok(moltenScale, 'molten_scale exists in balance');
  assert.equal(moltenScale.name, 'Огненная Чешуя');
});

test('Weapon tier effective caps (Tier 3 = 12, Tier 2 = 6/8/10/12, Tier 1 = 6/8/10/12)', () => {
  const w1 = new BowWeapon();
  const w2 = new KukriWeapon();
  const w3 = new ReaperScytheWeapon();
  const w4 = new GreatswordWeapon();
  const all = [w1, w2, w3, w4];

  // Tier 3 always has cap 12
  assert.equal(getWeaponEffectiveCap(w1, all), 12);
  assert.equal(getWeaponEffectiveCap(w2, all), 12);

  // 1 Tier 2 awakened
  w1.awakenedGrade = 1;
  assert.equal(getWeaponEffectiveCap(w1, all), 6, '1 Tier 2 weapon -> cap 6');
  assert.equal(getWeaponEffectiveCap(w2, all), 12, 'Tier 3 weapon still cap 12');

  // 2 Tier 2 awakened
  w2.awakenedGrade = 1;
  assert.equal(getWeaponEffectiveCap(w1, all), 8, '2 Tier 2 weapons -> cap 8');
  assert.equal(getWeaponEffectiveCap(w2, all), 8);

  // 3 Tier 2 awakened
  w3.awakenedGrade = 1;
  assert.equal(getWeaponEffectiveCap(w1, all), 10, '3 Tier 2 weapons -> cap 10');

  // 4 Tier 2 awakened
  w4.awakenedGrade = 1;
  assert.equal(getWeaponEffectiveCap(w1, all), 12, '4 Tier 2 weapons -> cap 12');
  assert.equal(getWeaponEffectiveCap(w4, all), 12);

  // 1 Tier 1 awakened (from Tier 2)
  w1.awakenedGrade = 2;
  assert.equal(getWeaponEffectiveCap(w1, all), 6, '1 Tier 1 weapon -> cap 6');
  assert.equal(getWeaponEffectiveCap(w2, all), 12, 'Tier 2 weapon with 4 Tier-2-or-higher weapons has cap 12');

  // 2 Tier 1 awakened
  w2.awakenedGrade = 2;
  assert.equal(getWeaponEffectiveCap(w1, all), 8, '2 Tier 1 weapons -> cap 8');

  // 3 Tier 1 awakened
  w3.awakenedGrade = 2;
  assert.equal(getWeaponEffectiveCap(w1, all), 10, '3 Tier 1 weapons -> cap 10');

  // 4 Tier 1 awakened
  w4.awakenedGrade = 2;
  assert.equal(getWeaponEffectiveCap(w1, all), 12, '4 Tier 1 weapons -> cap 12');
});

test('Diminishing returns on speed boots, magnet, and pocket watch', () => {
  const scene = new Scene();
  const player = new Player(scene, 'ronin');

  // Speed Boots (stat_speed_boots): Base 1.0x. Level 1 -> +3% (0.03, total 1.03x). Level 300 -> +200% (2.00, mult x3.0).
  player.speedBootsCount = 0;
  player.recalculateStats();
  assert.equal(player.passiveSpeedMultiplier, 1.0);

  player.speedBootsCount = 1;
  player.recalculateStats();
  assert.ok(Math.abs(player.passiveSpeedMultiplier - 1.03) < 1e-4, 'Speed Boots at lvl 1 gives 1.03x');

  player.speedBootsCount = 100;
  player.recalculateStats();
  const speed100 = player.passiveSpeedMultiplier;
  assert.ok(speed100 > 1.03 && speed100 < 3.0, 'Speed Boots scales with level');
  assert.ok(speed100 > 1.5, 'Speed Boots curve is concave');

  player.speedBootsCount = 300;
  player.recalculateStats();
  assert.ok(Math.abs(player.passiveSpeedMultiplier - 3.0) < 1e-3, 'Speed Boots at lvl 300 gives x3 total speed mult');

  // Magnet (stat_magnet): Base 4m. Level 1 -> 4.4m (+10%). Level 300 -> 50m.
  player.magnetCount = 0;
  player.recalculateStats();
  assert.equal(player.pickupRadius, 4.0, 'Base pickup radius is 4m');

  player.magnetCount = 1;
  player.recalculateStats();
  assert.ok(Math.abs(player.pickupRadius - 4.4) < 1e-4, 'Magnet at lvl 1 gives 4.4m (base 4m + 10%)');

  player.magnetCount = 300;
  player.recalculateStats();
  assert.ok(Math.abs(player.pickupRadius - 50.0) < 1e-3, 'Magnet at lvl 300 reaches 50m cap');

  // Watch (stat_watch): Base 1.0 (0% reduction). Level 1 -> 0.99 (1% CDR). Level 300 -> 0.70 (30% CDR cap).
  player.watchCount = 0;
  player.recalculateStats();
  assert.equal(player.passiveCooldownMultiplier, 1.0);

  player.watchCount = 1;
  player.recalculateStats();
  assert.ok(Math.abs(player.passiveCooldownMultiplier - 0.99) < 1e-4, 'Watch at lvl 1 gives 1% CDR');

  player.watchCount = 300;
  player.recalculateStats();
  assert.ok(Math.abs(player.passiveCooldownMultiplier - 0.70) < 1e-3, 'Watch at lvl 300 reaches 30% CDR cap (mult 0.70)');
});

test('MerchantManager 10x base prices, 40% compounding inflation, and weapon upgrade limit', () => {
  const scene = new Scene();
  const biomeManager = new BiomeManager();
  const merchant = new MerchantManager(scene, biomeManager);

  // Check 10x base price definitions in balance
  const cfg = DEFAULT_BALANCE.global;
  assert.equal(cfg.merchantPriceCommon, 400);
  assert.equal(cfg.merchantPriceUncommon, 800);
  assert.equal(cfg.merchantPriceRare, 1500);
  assert.equal(cfg.merchantPriceLegendary, 3000);
  assert.equal(cfg.merchantPriceBoss, 5000);
  assert.equal(cfg.merchantPriceWeaponUpgrade, 500);

  // Spawn merchant stock
  merchant.spawn(() => 0);
  assert.equal(merchant.isActive, true);
  assert.ok(merchant.stock.length > 0);

  const upgradeStock = merchant.stock.find(s => s.id === 'merchant_upgrade_weapon');
  assert.ok(upgradeStock, 'Weapon upgrade is offered in merchant stock');
  assert.equal(upgradeStock.price, 500, 'Initial weapon upgrade base price is 500');

  const player = new Player(scene, 'ronin');
  player.credits = 100000;
  player.weapons = [new BowWeapon(), new KukriWeapon(), new ReaperScytheWeapon(), new GreatswordWeapon()];
  for (const w of player.weapons) {
    w.level = 1;
  }

  // 1st purchase: price = 500
  const p1 = merchant.buyItem(upgradeStock, player);
  assert.equal(p1.success, true);
  assert.equal(merchant.purchaseCount, 1);
  assert.equal(merchant.weaponUpgradePurchases, 1);
  // Next price for upgradeStock: 500 * 1.4^1 = 700
  assert.equal(upgradeStock.price, 700);

  // 2nd purchase
  merchant.buyItem(upgradeStock, player);
  assert.equal(merchant.purchaseCount, 2);
  // Next price: 500 * 1.4^2 = 980
  assert.equal(upgradeStock.price, 980);

  // 3rd, 4th, 5th purchases
  merchant.buyItem(upgradeStock, player);
  merchant.buyItem(upgradeStock, player);
  const p5 = merchant.buyItem(upgradeStock, player);
  assert.equal(p5.success, true);
  assert.equal(merchant.weaponUpgradePurchases, 5);

  // 6th purchase must fail because limit is 5 per visit
  const p6 = merchant.buyItem(upgradeStock, player);
  assert.equal(p6.success, false);
  assert.equal(merchant.weaponUpgradePurchases, 5);

  // Player weapons had upgrade rarities upgraded 5 times (levels remain unchanged, upgrade rarity improved)
  const totalUpgrades = player.weapons.reduce((acc, w) => acc + w.upgradeHistory.length, 0);
  const totalBonusDamage = player.weapons.reduce((acc, w) => acc + w.bonusDamage, 0);
  assert.ok(totalUpgrades > 0 || totalBonusDamage > 0, '5 weapon upgrade purchases improved weapon upgrade rarities');
});

test('LevelUpUI tier progression milestones and Elixir of Might gate', () => {
  const scene = new Scene();
  const player = new Player(scene, 'ronin');
  player.weapons = [
    new BowWeapon(),
    new KukriWeapon(),
    new ReaperScytheWeapon(),
    new GreatswordWeapon()
  ];
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
  const levelUpUI = new LevelUpUI(ctx);

  // Milestone 1: All 4 Tier 3 weapons reach level 12
  for (const w of player.weapons) {
    w.level = 12;
    w.awakenedGrade = 0;
  }
  const milestone1Options = levelUpUI.generateWeaponOptions(player);
  assert.equal(milestone1Options.length, 3, 'Must offer 3 cards');
  assert.equal(milestone1Options[0].id, 'bonus_health_elixir', 'First card is HP elixir');
  const awakenT2Count = milestone1Options.filter(o => o.id.startsWith('awaken_')).length;
  assert.equal(awakenT2Count, 2, 'Offers exactly 2 Tier 2 awakenings on first milestone');

  // Apply 1 Tier 2 awaken, set to level 1
  player.weapons[0].awakenGrade();
  player.weapons[0].level = 1;
  // Weapons 1, 2, 3 are still Tier 3 level 12
  // While leveling up, at most 1 awakening card can appear
  for (let i = 0; i < 20; i++) {
    const opts = levelUpUI.generateWeaponOptions(player);
    assert.equal(opts.length, 3);
    const awakenOpts = opts.filter(o => o.id.startsWith('awaken_') || o.id.startsWith('awaken3_'));
    assert.ok(awakenOpts.length <= 1, 'While leveling up, at most 1 tier awakening can appear');
  }

  // All 4 weapons reach Tier 2 level 12 -> Milestone 2
  for (const w of player.weapons) {
    w.awakenedGrade = 1;
    w.level = 12;
  }
  const milestone2Options = levelUpUI.generateWeaponOptions(player);
  assert.equal(milestone2Options.length, 3);
  assert.equal(milestone2Options[0].id, 'bonus_health_elixir');
  const awakenT1Count = milestone2Options.filter(o => o.id.startsWith('awaken3_')).length;
  assert.equal(awakenT1Count, 2, 'Offers exactly 2 Tier 1 awakenings on second milestone');

  // All 4 weapons reach Tier 1 level 12 -> Milestone 3
  for (const w of player.weapons) {
    w.awakenedGrade = 2;
    w.level = 12;
  }
  const milestone3Options = levelUpUI.generateWeaponOptions(player);
  assert.equal(milestone3Options.length, 3);
  assert.ok(milestone3Options.some(o => o.id === 'bonus_health_elixir'));
  assert.ok(milestone3Options.some(o => o.id === 'bonus_damage_elixir'));
  assert.ok(milestone3Options.some(o => o.id === 'bonus_credits_cache'));
  assert.ok(!milestone3Options.some(o => o.id === 'bonus_speed_elixir'));

  // Elixir of Might bonus check: +1% per stack
  const initialMult = player.passiveDamageMultiplier;
  player.addMightElixirBonus();
  assert.ok(Math.abs(player.passiveDamageMultiplier - (initialMult + 0.01)) < 1e-4, 'Might elixir gives +1%');
});


