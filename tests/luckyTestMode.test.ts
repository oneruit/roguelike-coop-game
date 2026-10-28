import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost'
});
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).HTMLCanvasElement = dom.window.HTMLCanvasElement;

dom.window.HTMLCanvasElement.prototype.getContext = () => ({
  clearRect: () => {},
  fillRect: () => {},
  fillText: () => {},
  measureText: () => ({ width: 50 }),
  beginPath: () => {},
  closePath: () => {},
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
  createRadialGradient: () => ({ addColorStop: () => {} }),
  createLinearGradient: () => ({ addColorStop: () => {} })
}) as any;

import { Vector3, Scene } from 'three';
import { LuckyTestManager, LUCKY_TEST_HERO_POOL } from '../game/src/mechanics/lucky-test/LuckyTestManager';
import { Player } from '../game/src/entities/Player';
import { RemotePlayer } from '../game/src/entities/RemotePlayer';
import { BowWeapon } from '../game/src/combat/weapons/RangedWeapons';
import { KatanaSlashWeapon } from '../game/src/combat/weapons/MeleeWeapons';
import { LightningStrikeWeapon } from '../game/src/combat/weapons/MagicWeapons';
import { Projectile } from '../game/src/combat/Projectile';
import { GladiatorBot } from '../game/src/entities/GladiatorBot';

describe('Lucky Test (PvP Arena Mode)', () => {
  it('rolls random heroes from the authorized hero pool', () => {
    const manager = LuckyTestManager.getInstance();
    for (let i = 0; i < 20; i++) {
      const hero = manager.rollRandomHero();
      assert.ok(hero.name.length > 0);
      assert.ok(LUCKY_TEST_HERO_POOL.some(h => h.type === hero.type));
    }
  });

  it('generates 2 distinct weapon choices for each draft round and avoids existing weapons', () => {
    const manager = LuckyTestManager.getInstance();
    const existing = ['bow', 'katana_slash'];
    const [w1, w2] = manager.generateWeaponDraft(existing);

    assert.notStrictEqual(w1.id, w2.id);
    assert.strictEqual(existing.includes(w1.id), false);
    assert.strictEqual(existing.includes(w2.id), false);
    assert.ok(w1.name.length > 0);
    assert.ok(w2.name.length > 0);
  });

  it('generates 12 weapon upgrades and strictly enforces level 4 maximum cap on all weapons', () => {
    const manager = LuckyTestManager.getInstance();
    const weapons = ['katana_slash', 'bow', 'fireball', 'lightning_strike'];

    for (let iteration = 0; iteration < 25; iteration++) {
      const upgrades = manager.generate12Upgrades(weapons);
      assert.ok(upgrades.length <= 12, 'Upgrades should not exceed 12');

      const levels: Record<string, number> = {
        katana_slash: 1,
        bow: 1,
        fireball: 1,
        lightning_strike: 1
      };

      for (const up of upgrades) {
        assert.ok(up.newLevel <= 4, `Weapon ${up.weaponId} exceeded level 4 cap! New level was ${up.newLevel}`);
        assert.ok(['common', 'uncommon', 'rare', 'legendary'].includes(up.grade));
        levels[up.weaponId] = up.newLevel;
      }

      // Check final levels of all weapons
      for (const wId of weapons) {
        assert.ok(levels[wId] <= 4, `Final level for ${wId} exceeded cap: ${levels[wId]}`);
      }
    }
  });

  it('generates 4 rounds of passive skills with randomized numeric rolls and valid quality tiers', () => {
    const manager = LuckyTestManager.getInstance();
    for (let round = 1; round <= 4; round++) {
      const choices = manager.generatePassiveChoices(3);
      assert.strictEqual(choices.length, 3);
      for (const p of choices) {
        assert.ok(p.value > 0);
        assert.ok(p.title.length > 0);
        assert.ok(['good', 'great', 'legendary'].includes(p.quality));
      }
    }
  });

  it('applies complete build to Player setting 1500 HP, manual aim, and 40% resilience', () => {
    const manager = LuckyTestManager.getInstance();
    const player = new Player(new Scene());

    const build = manager.createBotGladiatorBuild();
    manager.applyBuildToPlayer(player, build);

    assert.strictEqual(player.isGladiator, true);
    assert.strictEqual(player.isManualAim, true);
    assert.strictEqual(player.pvpResilience, 0.40);
    assert.ok(player.maxHp >= 1500, `Max HP should be at least 1500, was ${player.maxHp}`);
    assert.strictEqual(player.hp, player.maxHp);
    assert.strictEqual(player.weapons.length, 4);

    // Verify all weapons are capped at level 4 or less
    for (const w of player.weapons) {
      assert.ok(w.level <= 4, `Weapon ${w.id} exceeded level 4 on player: ${w.level}`);
    }
  });

  it('gladiator damage reduction factor scales incoming damage down to 40%', () => {
    const player = new Player(new Scene());
    player.isGladiator = true;
    player.pvpResilience = 0.40;
    player.maxHp = 1500;
    player.hp = 1500;
    player.shield = 0; // No shield for raw HP test

    // Hit with 100 raw damage
    player.takeDamage(100);
    // 100 * 0.40 = 40 damage taken
    assert.strictEqual(player.hp, 1460);

    // Test RemotePlayer gladiator damage
    const remote = new RemotePlayer(new Scene(), 'p2');
    remote.isGladiator = true;
    remote.pvpResilience = 0.40;
    remote.maxHp = 1500;
    remote.hp = 1500;
    remote.shield = 0;

    remote.takeDamage(100);
    assert.strictEqual(remote.hp, 1460);
  });

  it('GladiatorBot initializes with complete 4-weapon build, AI parameters, and overhead health', () => {
    const manager = LuckyTestManager.getInstance();
    const botBuild = manager.createBotGladiatorBuild();
    const bot = new GladiatorBot(new Scene(), botBuild);

    assert.strictEqual(bot.isGladiator, true);
    assert.strictEqual(bot.pvpResilience, 0.40);
    assert.ok(bot.maxHp >= 1500);
    assert.strictEqual(bot.botWeapons.length, 4);

    for (const w of bot.botWeapons) {
      assert.ok(w.level <= 4);
    }
  });
});

describe('Mouse Aim Combat Integration', () => {
  it('BowWeapon fires directly along aim vector when aimPosition is provided', async () => {
    const bow = new BowWeapon();
    const playerPos = new Vector3(0, 0, 0);
    const aimPos = new Vector3(10, 0, 0); // Aiming directly East

    let spawnedProj: Projectile | null = null;
    bow.update(
      1.0, // dt > effectiveCooldown
      playerPos,
      [], // no pve enemies!
      (p) => {
        spawnedProj = p;
      },
      undefined,
      aimPos
    );

    await new Promise(resolve => setTimeout(resolve, 80));

    assert.ok(spawnedProj !== null, 'Projectile should have spawned towards aim position');
    assert.ok((spawnedProj as Projectile).direction.x > 0.9, `Direction X was ${(spawnedProj as Projectile).direction.x}`);
    assert.ok(Math.abs((spawnedProj as Projectile).direction.z) < 0.2, `Direction Z was ${(spawnedProj as Projectile).direction.z}`);
  });

  it('KatanaSlashWeapon orients swing attack angle towards aimPosition', () => {
    const katana = new KatanaSlashWeapon();
    const playerPos = new Vector3(0, 0, 0);
    const aimPos = new Vector3(0, 0, -10); // Aiming North (-Z)

    let attackAngle = 0;
    katana.onMeleeAttack = (info) => {
      attackAngle = info.angle;
    };

    katana.update(
      1.0,
      playerPos,
      [],
      () => {},
      undefined,
      aimPos
    );

    // Angle for -Z is Math.PI / 2
    assert.ok(Math.abs(attackAngle - Math.PI / 2) < 0.01, `Attack angle was ${attackAngle}`);
  });

  it('LightningStrikeWeapon places strikes directly at aimPosition', async () => {
    const lightning = new LightningStrikeWeapon();
    const playerPos = new Vector3(0, 0, 0);
    const aimPos = new Vector3(5, 0, 8);

    let strikeProj: Projectile | null = null;
    lightning.update(
      2.0,
      playerPos,
      [],
      (p) => {
        strikeProj = p;
      },
      undefined,
      aimPos
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    assert.ok(strikeProj !== null, 'Lightning strike projectile should spawn');
    assert.ok(Math.abs((strikeProj as Projectile).position.x - 5) < 0.01);
    assert.ok(Math.abs((strikeProj as Projectile).position.z - 8) < 0.01);
  });
});
