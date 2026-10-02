import { SimVec3 } from './math/SimVector';
import { SimRNG } from './SimRNG';
import {
  CharacterType,
  HeroAnimState,
  SpriteDirection,
  BuffType,
  GemType,
  EnemyType,
  ActiveBuff,
  SimPlayerInput,
  SimPlayerState,
  SimEnemyState,
  SimProjectileState,
  SimDropState,
  SimAltarState,
  SimEvent,
  SimSnapshot,
  SimPlayerStats
} from './types';
import {
  SimWeapon,
  SimProjectileData,
  createSimWeaponForCharacter,
  createSimWeaponById
} from './SimWeapons';
import { ObstacleManager } from '../world/ObstacleManager';

export interface GameCoreConfig {
  seed?: number;
  isCoop?: boolean;
  tickRate?: number; // e.g. 30 or 60 Hz
  obstacleManager?: ObstacleManager;
}

export interface SimEnemyConfig {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  width: number;
  height: number;
  gemType: GemType;
  isBoss?: boolean;
  isImmortal?: boolean;
}

export class SimPlayerInternal {
  public id: string;
  public charType: CharacterType;
  public position: SimVec3;
  public dir: SpriteDirection = 'front';
  public anim: HeroAnimState = 'IDLE';
  public attackAnimTimer: number = 0;

  public hp: number;
  public maxHp: number;
  public speed: number;
  public baseSpeed: number;
  public xp: number = 0;
  public xpToNextLevel: number = 10;
  public level: number = 1;
  public pickupRadius: number = 4.2;

  public damageMultiplier: number = 1.35;
  public baseDamageMultiplier: number = 1.35;
  public passiveDamageMultiplier: number = 1.0;
  public passiveSpeedMultiplier: number = 1.0;
  public passiveCooldownMultiplier: number = 1.0;
  public passiveHpRegen: number = 0;
  public passiveDamageReduction: number = 0;

  public isAlive: boolean = true;
  public isDowned: boolean = false;
  public reviveProgress: number = 0;

  public kills: number = 0;
  public totalDamageDealt: number = 0;
  public revivesCount: number = 0;

  public weapons: SimWeapon[] = [];
  public activeBuffs: Map<BuffType, ActiveBuff> = new Map();
  public currentInput: SimPlayerInput = { moveX: 0, moveZ: 0 };
  public lastHitTimeByEnemy: number = 0;

  constructor(id: string, charType: CharacterType, spawnPos: SimVec3 = new SimVec3(0, 0, 0)) {
    this.id = id;
    this.charType = charType;
    this.position = spawnPos.clone();

    if (charType === 'valkyrie') {
      this.maxHp = 135;
      this.hp = 135;
      this.baseSpeed = 8.2;
      this.baseDamageMultiplier = 1.45;
    } else if (charType === 'flail') {
      this.maxHp = 125;
      this.hp = 125;
      this.baseSpeed = 8.5;
      this.baseDamageMultiplier = 1.40;
    } else if (charType === 'sorceress') {
      this.maxHp = 105;
      this.hp = 105;
      this.baseSpeed = 8.8;
      this.baseDamageMultiplier = 1.30;
    } else if (charType === 'chakram') {
      this.maxHp = 115;
      this.hp = 115;
      this.baseSpeed = 8.7;
      this.baseDamageMultiplier = 1.35;
    } else if (charType === 'archer') {
      this.maxHp = 110;
      this.hp = 110;
      this.baseSpeed = 8.9;
      this.baseDamageMultiplier = 1.35;
    } else {
      this.maxHp = 115;
      this.hp = 115;
      this.baseSpeed = 8.6;
      this.baseDamageMultiplier = 1.35;
    }
    this.speed = this.baseSpeed;
    this.damageMultiplier = this.baseDamageMultiplier;
    this.weapons.push(createSimWeaponForCharacter(charType));
  }

  public recalculateStats() {
    let speedBonus = 0;
    let dmgBonus = 0;
    const speedBuff = this.activeBuffs.get('speed');
    if (speedBuff) speedBonus += speedBuff.value;
    const dmgBuff = this.activeBuffs.get('damage');
    if (dmgBuff) dmgBonus += dmgBuff.value;

    this.speed = this.baseSpeed * this.passiveSpeedMultiplier * (1 + speedBonus);
    this.damageMultiplier = this.baseDamageMultiplier * this.passiveDamageMultiplier * (1 + dmgBonus);
  }
}

export class SimEnemyInternal {
  public id: string;
  public type: EnemyType;
  public name: string;
  public position: SimVec3;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public damage: number;
  public width: number;
  public height: number;
  public gemType: GemType;
  public isBoss: boolean;
  public isImmortal: boolean;
  public isAlive: boolean = true;
  public currentDir: SpriteDirection = 'front';
  public knockback: SimVec3 = new SimVec3();
  public lastHitBy: string = 'host';

  constructor(cfg: SimEnemyConfig, pos: SimVec3, id?: string) {
    this.id = id || Math.random().toString(36).substring(2, 9);
    this.type = cfg.type;
    this.name = cfg.name;
    this.position = pos.clone();
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.speed = cfg.speed;
    this.damage = cfg.damage;
    this.width = cfg.width;
    this.height = cfg.height;
    this.gemType = cfg.gemType;
    this.isBoss = !!cfg.isBoss;
    this.isImmortal = !!cfg.isImmortal;
  }
}

export class SimProjectileInternal {
  public id: string;
  public ownerId: string;
  public position: SimVec3;
  public direction: SimVec3;
  public speed: number;
  public damage: number;
  public pierce: number;
  public lifetime: number;
  public maxLifetime: number;
  public radius: number;
  public color: number;
  public isMagic: boolean;
  public isChakram: boolean;
  public isArrow: boolean;
  public isKukri: boolean;
  public curveSign: number;
  public elapsedTime: number = 0;
  public hasTurnedBack: boolean = false;
  public isOrbiting: boolean;
  public orbitRadius: number;
  public orbitSpeed: number;
  public orbitAngle: number;
  public isAlive: boolean = true;
  public hitEnemies = new Set<string>();

  constructor(data: SimProjectileData) {
    this.id = data.id;
    this.ownerId = data.ownerId;
    this.position = data.position.clone();
    this.direction = data.direction.clone();
    this.speed = data.speed;
    this.damage = data.damage;
    this.pierce = data.pierce;
    this.lifetime = data.lifetime;
    this.maxLifetime = data.lifetime;
    this.radius = data.radius;
    this.color = data.color;
    this.isMagic = !!data.isMagic;
    this.isChakram = !!data.isChakram;
    this.isArrow = !!data.isArrow;
    this.isKukri = !!data.isKukri;
    this.curveSign = data.curveSign || 1;
    this.isOrbiting = !!data.isOrbiting;
    this.orbitRadius = data.orbitRadius || 2.4;
    this.orbitSpeed = data.orbitSpeed || 3.8;
    this.orbitAngle = data.orbitAngle || 0;
  }
}

export class SimDropInternal {
  public id: string;
  public type: GemType;
  public position: SimVec3;
  public isAttracted: boolean = false;
  public xpValue: number;

  constructor(id: string, type: GemType, position: SimVec3) {
    this.id = id;
    this.type = type;
    this.position = position.clone();
    this.xpValue = type === 'red' ? 25 : type === 'green' ? 8 : type === 'gold' ? 20 : 2;
  }
}

export class SimAltarInternal {
  public id: string;
  public type: BuffType;
  public name: string;
  public position: SimVec3;
  public radius: number = 5.0;
  public captureProgress: number = 0; // 0 to 1
  public isCaptured: boolean = false;
  public buffDuration: number;

  constructor(type: BuffType, name: string, position: SimVec3, buffDuration: number = 20) {
    this.id = `altar_${type}`;
    this.type = type;
    this.name = name;
    this.position = position.clone();
    this.buffDuration = buffDuration;
  }
}

/**
 * Headless Deterministic GameCore Simulation Engine
 * Manages all authoritative game state, math, collisions, spawns, and drops.
 * Decoupled from WebGL / Three.js / DOM.
 */
export class GameCore {
  public rng: SimRNG;
  public isCoop: boolean;
  public tickRate: number;
  public currentTick: number = 0;
  public gameTime: number = 0;
  public totalKills: number = 0;

  // Simulation Entities
  public players = new Map<string, SimPlayerInternal>();
  public enemies: SimEnemyInternal[] = [];
  public projectiles: SimProjectileInternal[] = [];
  public drops: SimDropInternal[] = [];
  public altars: SimAltarInternal[] = [];
  public activeBoss: SimEnemyInternal | null = null;
  public immortalBossSpawned: boolean = false;
  public lastBossMinute: number = 0;
  public obstacleManager: ObstacleManager;

  // Spawning & waves
  private spawnTimer: number = 0;
  private events: SimEvent[] = [];

  // Enemy configuration table
  private enemyConfigs: Record<EnemyType, SimEnemyConfig> = {
    coyote: { type: 'coyote', name: 'Кровожадный койот', hp: 48, speed: 5.4, damage: 16, width: 2.1, height: 1.6, gemType: 'blue' },
    crawler: { type: 'crawler', name: 'Ползучая тварь', hp: 40, speed: 6.0, damage: 20, width: 2.0, height: 1.2, gemType: 'blue' },
    cactus: { type: 'cactus', name: 'Кактусовый зомби', hp: 88, speed: 3.5, damage: 28, width: 1.9, height: 2.3, gemType: 'blue' },
    skeleton: { type: 'skeleton', name: 'Бандит-скелет', hp: 110, speed: 3.8, damage: 32, width: 1.9, height: 2.4, gemType: 'green' },
    ghost: { type: 'ghost', name: 'Призрак ковбоя', hp: 140, speed: 4.0, damage: 36, width: 1.7, height: 2.5, gemType: 'green' },
    scorpion: { type: 'scorpion', name: 'Скорпион-ползун', hp: 190, speed: 3.2, damage: 44, width: 2.3, height: 2.1, gemType: 'green' },
    brute: { type: 'brute', name: 'Пустынный громила', hp: 320, speed: 2.6, damage: 64, width: 2.8, height: 3.2, gemType: 'red' },
    bison: { type: 'bison', name: 'Бешеный бизон', hp: 520, speed: 4.4, damage: 76, width: 3.6, height: 3.0, gemType: 'red' },
    boss: { type: 'boss', name: 'Повелитель Дюн', hp: 2400, speed: 2.8, damage: 90, width: 4.2, height: 4.5, gemType: 'red', isBoss: true },
    hydra: { type: 'hydra', name: 'Трехглавая гидра', hp: 7000, speed: 2.3, damage: 130, width: 8.0, height: 8.0, gemType: 'red', isBoss: true }
  };

  constructor(config: GameCoreConfig = {}) {
    this.rng = new SimRNG(config.seed ?? 1337);
    this.isCoop = !!config.isCoop;
    this.tickRate = config.tickRate || 30;
    this.obstacleManager = config.obstacleManager || new ObstacleManager();

    // Initialize 4 ancient shrines matching world chunk layout
    this.altars.push(new SimAltarInternal('damage', 'Алтарь Ярости', new SimVec3(21, 0, 75), 25));
    this.altars.push(new SimAltarInternal('speed', 'Алтарь Ветра', new SimVec3(-25, 0, 30), 20));
    this.altars.push(new SimAltarInternal('regen', 'Алтарь Жизни', new SimVec3(78, 0, -28), 18));
    this.altars.push(new SimAltarInternal('invulnerable', 'Алтарь Духов', new SimVec3(22, 0, -30), 12));

    for (const altar of this.altars) {
      this.obstacleManager.addObstacle(altar.id, {
        x: altar.position.x,
        z: altar.position.z,
        radius: 1.5,
        type: 'altar'
      });
    }
  }

  // -------------------------------------------------------------
  // Player Management
  // -------------------------------------------------------------

  public addPlayer(id: string, charType: CharacterType = 'ronin', spawnPos?: SimVec3): SimPlayerInternal {
    const defaultPos = spawnPos || (id === 'host' ? new SimVec3(0, 0, 0) : new SimVec3(2.5, 0, 0));
    const p = new SimPlayerInternal(id, charType, defaultPos);
    this.players.set(id, p);
    return p;
  }

  public removePlayer(id: string) {
    this.players.delete(id);
  }

  public setPlayerInput(id: string, input: SimPlayerInput) {
    const p = this.players.get(id);
    if (!p) return;
    p.currentInput = { ...input };
    if (input.dir) p.dir = input.dir;
  }

  public upgradePlayerWeapon(playerId: string, weaponId: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    let weapon = player.weapons.find(w => w.id === weaponId);
    if (weapon) {
      weapon.upgrade();
    } else {
      const newW = createSimWeaponById(weaponId);
      if (newW) player.weapons.push(newW);
    }
  }

  public revivePlayer(reviverId: string, targetId: string) {
    const reviver = this.players.get(reviverId);
    const downed = this.players.get(targetId);
    if (!reviver || !downed || !downed.isDowned) return;

    downed.isDowned = false;
    downed.reviveProgress = 0;
    downed.hp = Math.round(downed.maxHp * 0.4);
    reviver.revivesCount++;

    this.events.push({
      type: 'player_revived',
      targetId: downed.id,
      reviverId: reviver.id
    });
  }

  // -------------------------------------------------------------
  // Authoritative Tick Update
  // -------------------------------------------------------------

  public tick(dt: number): SimEvent[] {
    this.currentTick++;
    this.gameTime += dt;

    // 1. Update Players (Movement, Buffs, Weapons)
    this.updatePlayers(dt);

    // 2. Wave Spawner & Boss Checks
    this.updateWaves(dt);

    // 3. Update Enemies (Pathing AI, Collision, Knockback)
    this.updateEnemies(dt);

    // 4. Update Projectiles & Combat Collisions
    this.updateProjectiles(dt);

    // 5. Update Drops (XP Magnet & Pickup)
    this.updateDrops(dt);

    // 6. Update Altars
    this.updateAltars(dt);

    // 7. Revives & Team Wipe Check
    this.updateRevives(dt);

    // Return collected events and clear buffer
    const outEvents = [...this.events];
    this.events = [];
    return outEvents;
  }

  private updatePlayers(dt: number) {
    for (const player of this.players.values()) {
      if (!player.isAlive || player.isDowned) {
        player.anim = 'IDLE';
        continue;
      }

      // Decrement attack animation timer
      if (player.attackAnimTimer > 0) {
        player.attackAnimTimer = Math.max(0, player.attackAnimTimer - dt);
      }

      // Passive HP Regen
      if (player.passiveHpRegen > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + player.passiveHpRegen * dt);
      }

      // Shrines Buffs Timer
      for (const [type, buff] of player.activeBuffs) {
        buff.duration -= dt;
        if (buff.duration <= 0) {
          player.activeBuffs.delete(type);
          player.recalculateStats();
        }
      }

      // Movement
      const mx = player.currentInput.moveX;
      const mz = player.currentInput.moveZ;
      const isMoving = Math.abs(mx) > 0.01 || Math.abs(mz) > 0.01;

      if (isMoving) {
        player.position.x += mx * player.speed * dt;
        player.position.z += mz * player.speed * dt;
        this.obstacleManager.resolveEntityCollision(player.position, 0.45);

        // Facing direction
        if (Math.abs(mx) > Math.abs(mz)) {
          player.dir = mx > 0 ? 'right' : 'left';
        } else {
          player.dir = mz > 0 ? 'front' : 'back';
        }

        player.anim = player.attackAnimTimer > 0 ? 'WALK_ATTACK' : 'WALK';
      } else {
        player.anim = player.attackAnimTimer > 0 ? 'ATTACK' : 'IDLE';
      }

      // Update Weapons
      for (const weapon of player.weapons) {
        weapon.update(
          dt,
          {
            id: player.id,
            position: player.position,
            isAlive: player.isAlive,
            isDowned: player.isDowned,
            damageMultiplier: player.damageMultiplier
          },
          this.enemies,
          (projData) => {
            this.projectiles.push(new SimProjectileInternal(projData));
          },
          (enemyId, damage, sourcePos, knockbackDist = 0.2) => {
            this.damageEnemy(enemyId, damage, sourcePos, player.id, knockbackDist);
          },
          (duration) => {
            player.attackAnimTimer = Math.max(player.attackAnimTimer, duration);
          },
          (sound) => {
            this.events.push({ type: 'sound', sound });
          }
        );
      }
    }
  }

  private updateWaves(dt: number) {
    this.spawnTimer += dt;

    // Check boss minute (every 3 minutes, e.g. 3, 6, 9, 12, 15, 18, 21, 24, 27)
    const currentMinute = Math.floor(this.gameTime / 60);
    if (currentMinute > 0 && currentMinute % 3 === 0 && currentMinute !== this.lastBossMinute) {
      this.lastBossMinute = currentMinute;
      this.spawnBoss();
    }

    // Immortal Reaper at 30 min (1800s)
    if (this.gameTime >= 1800 && !this.immortalBossSpawned) {
      this.immortalBossSpawned = true;
      this.spawnImmortalReaper();
    }

    // Regular waves interval (scaled with active players)
    const activePlayerCount = Math.max(1, Array.from(this.players.values()).filter(p => p.isAlive).length);
    const targetInterval = Math.max(0.35, 1.0 - (this.gameTime / 1800) * 0.5 - (activePlayerCount - 1) * 0.1);
    const maxEnemies = Math.min(220, 60 + Math.floor(this.gameTime / 15) * 5 + (activePlayerCount - 1) * 25);

    if (this.spawnTimer >= targetInterval && this.enemies.length < maxEnemies) {
      this.spawnTimer = 0;
      this.spawnEnemyWave(activePlayerCount);
    }
  }

  private spawnEnemyWave(playerCount: number) {
    const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive && !p.isDowned);
    if (alivePlayers.length === 0) return;

    // Pick enemy types based on game time
    const types: EnemyType[] = ['coyote'];
    if (this.gameTime > 60) types.push('crawler');
    if (this.gameTime > 180) types.push('cactus');
    if (this.gameTime > 360) types.push('skeleton');
    if (this.gameTime > 600) types.push('ghost');
    if (this.gameTime > 900) types.push('scorpion');
    if (this.gameTime > 1200) types.push('brute');
    if (this.gameTime > 1500) types.push('bison');

    const spawnCount = Math.min(8, 2 + Math.floor(this.gameTime / 120) + Math.floor(playerCount * 0.6));

    for (let i = 0; i < spawnCount; i++) {
      const p = alivePlayers[this.rng.nextInt(0, alivePlayers.length - 1)];
      const type = types[this.rng.nextInt(0, types.length - 1)];
      const cfg = this.enemyConfigs[type];

      // Spawn in an annular ring around chosen player (18 to 26 meters away)
      const angle = this.rng.nextRange(0, Math.PI * 2);
      const dist = this.rng.nextRange(18, 26);
      const spawnPos = new SimVec3(
        p.position.x + Math.cos(angle) * dist,
        0,
        p.position.z + Math.sin(angle) * dist
      );

      const enemy = new SimEnemyInternal(cfg, spawnPos);
      this.enemies.push(enemy);
    }
  }

  private spawnBoss() {
    const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive && !p.isDowned);
    if (alivePlayers.length === 0) return;

    const p = alivePlayers[0];
    const angle = this.rng.nextRange(0, Math.PI * 2);
    const pos = new SimVec3(p.position.x + Math.cos(angle) * 22, 0, p.position.z + Math.sin(angle) * 22);

    const cfg = { ...this.enemyConfigs.boss };
    // Scale boss HP by game progress and player count
    const hpScale = (1 + this.gameTime / 600) * (1 + (this.players.size - 1) * 0.35);
    cfg.hp = Math.round(cfg.hp * hpScale);

    const boss = new SimEnemyInternal(cfg, pos);
    this.enemies.push(boss);
    this.activeBoss = boss;

    this.events.push({
      type: 'boss_spawn',
      name: boss.name,
      isImmortal: false,
      hp: boss.hp
    });
  }

  private spawnImmortalReaper() {
    const p = Array.from(this.players.values())[0];
    const pos = new SimVec3(p ? p.position.x + 20 : 0, 0, p ? p.position.z + 20 : 0);
    const reaperCfg: SimEnemyConfig = {
      type: 'ghost',
      name: 'Бессмертный Жнец',
      hp: 99999999,
      speed: 12.0,
      damage: 9999,
      width: 3.5,
      height: 4.5,
      gemType: 'red',
      isBoss: true,
      isImmortal: true
    };
    const reaper = new SimEnemyInternal(reaperCfg, pos);
    this.enemies.push(reaper);
    this.activeBoss = reaper;

    this.events.push({
      type: 'boss_spawn',
      name: reaper.name,
      isImmortal: true,
      hp: reaper.hp
    });
  }

  private updateEnemies(dt: number) {
    const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive && !p.isDowned);

    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;

      // Knockback damping
      if (enemy.knockback.lengthSq() > 0.001) {
        enemy.position.add(enemy.knockback);
        enemy.knockback.multiplyScalar(Math.max(0, 1 - dt * 5.0));
      }

      if (alivePlayers.length === 0) continue;

      // Find closest alive player
      let target: SimPlayerInternal = alivePlayers[0];
      let minDistanceSq = enemy.position.distanceToSquared(alivePlayers[0].position);

      for (let i = 1; i < alivePlayers.length; i++) {
        const dSq = enemy.position.distanceToSquared(alivePlayers[i].position);
        if (dSq < minDistanceSq) {
          minDistanceSq = dSq;
          target = alivePlayers[i];
        }
      }

      // Move towards target player
      const dx = target.position.x - enemy.position.x;
      const dz = target.position.z - enemy.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.05) {
        const vx = (dx / dist) * enemy.speed * dt;
        const vz = (dz / dist) * enemy.speed * dt;
        enemy.position.x += vx;
        enemy.position.z += vz;
        this.obstacleManager.resolveEntityCollision(enemy.position, (enemy.width + enemy.height) * 0.15);

        // Facing direction
        if (Math.abs(dx) > Math.abs(dz)) {
          enemy.currentDir = dx > 0 ? 'right' : 'left';
        } else {
          enemy.currentDir = dz > 0 ? 'front' : 'back';
        }
      }

      // Contact collision damage with player
      const collisionRadius = (enemy.width + enemy.height) * 0.25 + 0.5;
      if (dist <= collisionRadius) {
        const now = this.gameTime;
        if (now - target.lastHitTimeByEnemy >= 0.38) {
          target.lastHitTimeByEnemy = now;
          this.damagePlayer(target, enemy);
        }
      }
    }
  }

  private damagePlayer(player: SimPlayerInternal, enemy: SimEnemyInternal) {
    const isInvulnerable = player.activeBuffs.has('invulnerable');
    if (isInvulnerable) return;

    let dmg = enemy.damage * (1 - player.passiveDamageReduction);
    if (enemy.isImmortal || this.gameTime >= 1800) {
      dmg = 999999;
    }

    player.hp = Math.max(0, player.hp - dmg);
    const isFatal = player.hp <= 0;

    if (isFatal) {
      if (this.isCoop) {
        player.isDowned = true;
        player.reviveProgress = 0;
      } else {
        player.isAlive = false;
      }
    }

    this.events.push({
      type: 'player_hurt',
      playerId: player.id,
      damage: Math.round(dmg),
      isFatal,
      isVictory: enemy.isImmortal || this.gameTime >= 1800
    });
    this.events.push({ type: 'sound', sound: 'player_hurt' });
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.isAlive) {
        this.projectiles.splice(i, 1);
        continue;
      }

      proj.lifetime -= dt;
      if (proj.lifetime <= 0) {
        proj.isAlive = false;
        this.projectiles.splice(i, 1);
        continue;
      }

      if (proj.isOrbiting) {
        const owner = this.players.get(proj.ownerId);
        if (owner && owner.isAlive && !owner.isDowned) {
          proj.orbitAngle += proj.orbitSpeed * dt;
          proj.position.set(
            owner.position.x + Math.cos(proj.orbitAngle) * proj.orbitRadius,
            0.6,
            owner.position.z + Math.sin(proj.orbitAngle) * proj.orbitRadius
          );
        } else {
          proj.isAlive = false;
          this.projectiles.splice(i, 1);
          continue;
        }
      } else if (proj.isChakram) {
        proj.elapsedTime += dt;
        const turnTime = proj.maxLifetime * 0.44;
        if (proj.elapsedTime < turnTime) {
          const progress = proj.elapsedTime / turnTime;
          const curveAngle = (proj.curveSign || 1) * dt * 3.4 * (1 - progress * 0.4);
          const cos = Math.cos(curveAngle);
          const sin = Math.sin(curveAngle);
          const nx = proj.direction.x * cos - proj.direction.z * sin;
          const nz = proj.direction.x * sin + proj.direction.z * cos;
          proj.direction.x = nx;
          proj.direction.z = nz;
          const curSpeed = proj.speed * Math.max(0.25, 1 - progress * 0.65);
          proj.position.x += proj.direction.x * curSpeed * dt;
          proj.position.z += proj.direction.z * curSpeed * dt;
        } else {
          if (!proj.hasTurnedBack) {
            proj.hasTurnedBack = true;
            proj.hitEnemies.clear();
          }
          const owner = this.players.get(proj.ownerId);
          if (owner) {
            const dx = owner.position.x - proj.position.x;
            const dz = owner.position.z - proj.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 1.0) {
              proj.isAlive = false;
              this.projectiles.splice(i, 1);
              continue;
            }
            const returnSpeed = proj.speed * (1.1 + (proj.elapsedTime - turnTime) * 0.7);
            const toOwnerX = dx / dist;
            const toOwnerZ = dz / dist;
            const lerpFactor = Math.min(1.0, dt * 7.5);
            proj.direction.x += (toOwnerX - proj.direction.x) * lerpFactor;
            proj.direction.z += (toOwnerZ - proj.direction.z) * lerpFactor;
            proj.position.x += proj.direction.x * returnSpeed * dt;
            proj.position.z += proj.direction.z * returnSpeed * dt;
          } else {
            proj.position.x -= proj.direction.x * proj.speed * dt;
            proj.position.z -= proj.direction.z * proj.speed * dt;
          }
        }
      } else {
        proj.position.x += proj.direction.x * proj.speed * dt;
        proj.position.z += proj.direction.z * proj.speed * dt;
      }

      // Check collision against enemies
      for (const enemy of this.enemies) {
        if (!enemy.isAlive) continue;
        if (proj.hitEnemies.has(enemy.id)) continue;

        const enemyRad = (enemy.width + enemy.height) * 0.25;
        const totalRad = proj.radius + enemyRad;
        const distSq = proj.position.distanceToSquared(enemy.position);

        if (distSq <= totalRad * totalRad) {
          proj.hitEnemies.add(enemy.id);
          this.damageEnemy(enemy.id, proj.damage, proj.position, proj.ownerId, 0.2);

          if (!proj.isOrbiting && !proj.isChakram) {
            proj.pierce--;
            if (proj.pierce <= 0) {
              proj.isAlive = false;
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      }
    }
  }

  public damageEnemy(
    enemyId: string,
    damage: number,
    sourcePos?: SimVec3,
    attackerId: string = 'host',
    knockbackStrength: number = 0.2
  ) {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (!enemy || !enemy.isAlive) return;

    if (enemy.isImmortal) return;

    enemy.hp -= damage;
    enemy.lastHitBy = attackerId;

    const attacker = this.players.get(attackerId);
    if (attacker) {
      attacker.totalDamageDealt += damage;
    }

    // Knockback
    if (sourcePos) {
      const kx = enemy.position.x - sourcePos.x;
      const kz = enemy.position.z - sourcePos.z;
      const len = Math.hypot(kx, kz);
      if (len > 0.01) {
        enemy.knockback.set((kx / len) * knockbackStrength, 0, (kz / len) * knockbackStrength);
      }
    }

    const isCrit = damage >= 30;
    this.events.push({
      type: 'damage_num',
      enemyId: enemy.id,
      attackerId,
      damage: Math.round(damage),
      isCrit,
      x: enemy.position.x,
      y: enemy.height * 0.8,
      z: enemy.position.z
    });
    this.events.push({ type: 'sound', sound: 'hit' });

    if (enemy.hp <= 0) {
      this.killEnemy(enemy, attackerId);
    }
  }

  private killEnemy(enemy: SimEnemyInternal, killerId: string) {
    enemy.isAlive = false;
    this.totalKills++;

    const killer = this.players.get(killerId);
    if (killer) {
      killer.kills++;
    }

    // Spawn XP Gem
    const gemId = Math.random().toString(36).substring(2, 9);
    const drop = new SimDropInternal(gemId, enemy.gemType, enemy.position);
    this.drops.push(drop);

    this.events.push({
      type: 'enemy_death',
      enemyId: enemy.id,
      attackerId: killerId,
      enemyType: enemy.type,
      x: enemy.position.x,
      z: enemy.position.z,
      gemType: enemy.gemType
    });

    if (enemy.isBoss) {
      if (this.activeBoss === enemy) this.activeBoss = null;
      this.events.push({ type: 'boss_defeat', name: enemy.name });
    }

    // Remove from array
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }
  }

  private updateDrops(dt: number) {
    const activePlayers = Array.from(this.players.values()).filter(p => p.isAlive && !p.isDowned);

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];

      if (activePlayers.length === 0) {
        drop.isAttracted = false;
        continue;
      }

      // Find closest alive player
      let closest: SimPlayerInternal = activePlayers[0];
      let minDistanceSq = drop.position.distanceToSquared(activePlayers[0].position);

      for (let j = 1; j < activePlayers.length; j++) {
        const dSq = drop.position.distanceToSquared(activePlayers[j].position);
        if (dSq < minDistanceSq) {
          minDistanceSq = dSq;
          closest = activePlayers[j];
        }
      }

      const dist = Math.sqrt(minDistanceSq);

      // Magnet attraction
      if (dist <= closest.pickupRadius) {
        drop.isAttracted = true;
        const spd = 12 + dist * 2.2;
        drop.position.x += ((closest.position.x - drop.position.x) / dist) * spd * dt;
        drop.position.z += ((closest.position.z - drop.position.z) / dist) * spd * dt;

        // Pickup collection radius
        if (dist <= 0.65) {
          this.collectDrop(drop, closest);
          this.drops.splice(i, 1);
        }
      }
    }
  }

  private collectDrop(drop: SimDropInternal, player: SimPlayerInternal) {
    player.xp += drop.xpValue;

    this.events.push({
      type: 'gem_collected',
      gemId: drop.id,
      playerId: player.id,
      xp: drop.xpValue,
      x: drop.position.x,
      z: drop.position.z
    });
    this.events.push({ type: 'sound', sound: 'gem' });

    // Check level up
    while (player.xp >= player.xpToNextLevel) {
      player.xp -= player.xpToNextLevel;
      player.level++;
      player.xpToNextLevel = Math.round(10 * Math.pow(1.3, player.level - 1));

      this.events.push({
        type: 'player_level_up',
        playerId: player.id,
        level: player.level,
        x: player.position.x,
        z: player.position.z
      });
      this.events.push({ type: 'sound', sound: 'level_up' });
    }
  }

  private updateAltars(dt: number) {
    const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive && !p.isDowned);

    for (const altar of this.altars) {
      if (altar.isCaptured) continue;

      const anyInZone = alivePlayers.some(p => p.position.distanceTo(altar.position) <= altar.radius);
      if (anyInZone) {
        altar.captureProgress = Math.min(1.0, altar.captureProgress + dt * 0.16); // ~6.2s to capture
        if (altar.captureProgress >= 1.0) {
          altar.isCaptured = true;
          this.grantTeamAltarBuff(altar);
        }
      }
    }
  }

  private grantTeamAltarBuff(altar: SimAltarInternal) {
    for (const p of this.players.values()) {
      if (!p.isAlive) continue;
      p.activeBuffs.set(altar.type, {
        type: altar.type,
        name: altar.name,
        icon: '✨',
        color: '#f59e0b',
        duration: altar.buffDuration,
        maxDuration: altar.buffDuration,
        value: altar.type === 'damage' ? 0.8 : altar.type === 'speed' ? 0.6 : altar.type === 'regen' ? 12 : 1
      });
      p.recalculateStats();
    }

    this.events.push({
      type: 'altar_captured',
      altarType: altar.type,
      buffDuration: altar.buffDuration,
      name: altar.name
    });
    this.events.push({ type: 'sound', sound: 'altar' });
  }

  private updateRevives(dt: number) {
    if (!this.isCoop) return;

    const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive && !p.isDowned);
    const downedPlayers = Array.from(this.players.values()).filter(p => p.isDowned);

    for (const downed of downedPlayers) {
      let isBeingRevived = false;

      for (const reviver of alivePlayers) {
        if (reviver.position.distanceTo(downed.position) <= 3.5) {
          isBeingRevived = true;
          downed.reviveProgress = Math.min(1.0, downed.reviveProgress + dt / 3.0); // 3 seconds
          if (downed.reviveProgress >= 1.0) {
            downed.isDowned = false;
            downed.reviveProgress = 0;
            downed.hp = Math.round(downed.maxHp * 0.4);
            reviver.revivesCount++;

            this.events.push({
              type: 'player_revived',
              targetId: downed.id,
              reviverId: reviver.id
            });
          }
          break;
        }
      }

      if (!isBeingRevived && downed.reviveProgress > 0) {
        downed.reviveProgress = Math.max(0, downed.reviveProgress - dt * 0.8);
      }
    }
  }

  public isGameOver(): { isOver: boolean; isVictory: boolean } {
    const isVictory = this.gameTime >= 1800 || (this.activeBoss?.isImmortal ?? false);

    if (this.isCoop) {
      const anyAlive = Array.from(this.players.values()).some(p => p.isAlive && !p.isDowned);
      return { isOver: !anyAlive, isVictory };
    } else {
      const host = this.players.get('host');
      const isOver = !host || !host.isAlive;
      return { isOver, isVictory };
    }
  }

  // -------------------------------------------------------------
  // Snapshot Generation
  // -------------------------------------------------------------

  public getSnapshot(): SimSnapshot {
    const playersRecord: Record<string, SimPlayerState> = {};
    const statsRecord: Record<string, SimPlayerStats> = {};

    for (const [id, p] of this.players) {
      playersRecord[id] = {
        id,
        x: p.position.x,
        z: p.position.z,
        dir: p.dir,
        anim: p.anim,
        hp: p.hp,
        maxHp: p.maxHp,
        level: p.level,
        xp: p.xp,
        xpToNextLevel: p.xpToNextLevel,
        isDowned: p.isDowned,
        charType: p.charType,
        kills: p.kills,
        damageDealt: Math.round(p.totalDamageDealt),
        revives: p.revivesCount,
        buffs: Array.from(p.activeBuffs.keys())
      };

      statsRecord[id] = {
        kills: p.kills,
        damageDealt: Math.round(p.totalDamageDealt),
        level: p.level,
        revives: p.revivesCount
      };
    }

    const enemiesArray: SimEnemyState[] = this.enemies.map(e => ({
      id: e.id,
      type: e.type,
      name: e.name,
      x: e.position.x,
      z: e.position.z,
      hp: e.hp,
      maxHp: e.maxHp,
      dir: e.currentDir,
      isBoss: e.isBoss,
      isImmortal: e.isImmortal
    }));

    const projectilesArray: SimProjectileState[] = this.projectiles.map(p => ({
      id: p.id,
      ownerId: p.ownerId,
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      dirX: p.direction.x,
      dirZ: p.direction.z,
      speed: p.speed,
      damage: p.damage,
      radius: p.radius,
      color: p.color,
      isMagic: p.isMagic,
      isOrbiting: p.isOrbiting
    }));

    const dropsArray: SimDropState[] = this.drops.map(d => ({
      id: d.id,
      type: d.type,
      x: d.position.x,
      z: d.position.z
    }));

    const altarsArray: SimAltarState[] = this.altars.map(a => ({
      id: a.id,
      type: a.type,
      x: a.position.x,
      z: a.position.z,
      radius: a.radius,
      captureProgress: a.captureProgress,
      isCaptured: a.isCaptured
    }));

    return {
      tick: this.currentTick,
      gameTime: this.gameTime,
      totalKills: this.totalKills,
      players: playersRecord,
      stats: statsRecord,
      enemies: enemiesArray,
      projectiles: projectilesArray,
      drops: dropsArray,
      altars: altarsArray,
      boss: this.activeBoss
        ? {
            hp: this.activeBoss.hp,
            maxHp: this.activeBoss.maxHp,
            isAlive: this.activeBoss.isAlive,
            isImmortal: this.activeBoss.isImmortal
          }
        : null,
      events: [...this.events]
    };
  }
}
