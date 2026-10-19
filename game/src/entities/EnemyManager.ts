import { Vector3, type Scene, type Camera, Sphere, type Frustum } from 'three';
import { Enemy, EnemyConfig, EnemyType } from './Enemy';
import { SpatialGrid } from './SpatialGrid';
import { DropManager } from '../drops/DropManager';
import { SoundManager } from '../core/SoundManager';
import { DamageNumberManager } from '../combat/DamageNumberManager';
import { ObstacleManager } from '../world/ObstacleManager';
import { EnemySnapshot } from '../net/NetworkManager';
import { DifficultyDirector } from '../director/DifficultyDirector';
import { BalanceManager } from '../balance/BalanceManager';
import { MetaProgression } from '../meta/MetaProgression';

export interface PlayerTargetInfo {
  id: string; // 'p1', 'p2', 'p3', 'p4', 'p5'
  position: Vector3;
  isAlive: boolean;
  isDowned: boolean;
}

export class EnemyManager {
  private scene: Scene;
  private dropManager: DropManager;
  private damageNumbers: DamageNumberManager;
  private spatialGrid = new SpatialGrid(4.0);
  public enemies: Enemy[] = [];
  public totalKills = 0;
  public activeBoss: Enemy | null = null;
  public bossSpawned = false;
  public lastBossMinute = 0;
  public immortalBossSpawned = false;
  public currentStage = 1;

  private spawnTimer = 0;
  private spawnInterval = 1.0;
  public gameTime = 0;
  public isDeclarative = false;

  public setDeclarative(declarative: boolean): void {
    if (this.isDeclarative === declarative) return;
    this.isDeclarative = declarative;
    if (declarative) {
      for (const enemy of this.enemies) {
        this.scene.remove(enemy.mesh);
      }
    } else {
      for (const enemy of this.enemies) {
        this.scene.add(enemy.mesh);
      }
    }
  }

  private configs: Record<EnemyType, EnemyConfig> = {
    coyote: {
      type: 'coyote',
      name: 'Кровожадный койот',
      texturePrefix: '/textures/monsters/monster_coyote',
      hp: 48,
      speed: 5.4,
      damage: 8,
      width: 1.6,
      height: 1.6,
      gemType: 'blue',
      animated: true
    },
    crawler: {
      type: 'crawler',
      name: 'Ползучая тварь',
      texturePrefix: '/textures/monsters/monster_crawler',
      hp: 40,
      speed: 6.0,
      damage: 10,
      width: 1.5,
      height: 1.5,
      gemType: 'blue',
      animated: true
    },
    cactus: {
      type: 'cactus',
      name: 'Кактусовый зомби',
      texturePrefix: '/textures/monsters/monster_cactus',
      hp: 88,
      speed: 3.5,
      damage: 14,
      width: 1.7,
      height: 1.7,
      gemType: 'blue',
      animated: true
    },
    skeleton: {
      type: 'skeleton',
      name: 'Бандит-скелет',
      texturePrefix: '/textures/monsters/monster_skeleton',
      hp: 110,
      speed: 3.8,
      damage: 16,
      width: 1.8,
      height: 1.8,
      gemType: 'green',
      animated: true
    },
    ghost: {
      type: 'ghost',
      name: 'Призрак ковбоя',
      texturePrefix: '/textures/monsters/monster_ghost',
      hp: 140,
      speed: 4.0,
      damage: 18,
      width: 1.8,
      height: 1.8,
      gemType: 'green',
      animated: true
    },
    scorpion: {
      type: 'scorpion',
      name: 'Скорпион-ползун',
      texturePrefix: '/textures/monsters/monster_scorpion',
      hp: 190,
      speed: 3.2,
      damage: 22,
      width: 1.7,
      height: 1.7,
      gemType: 'green',
      animated: true
    },
    brute: {
      type: 'brute',
      name: 'Пустынный громила',
      texturePrefix: '/textures/monsters/monster_brute',
      hp: 350,
      speed: 2.6,
      damage: 28,
      width: 2.0,
      height: 2.0,
      gemType: 'green',
      animated: true
    },
    bison: {
      type: 'bison',
      name: 'Белый бизон-убийца',
      texturePrefix: '/textures/monsters/monster_bison',
      hp: 480,
      speed: 3.9,
      damage: 34,
      width: 2.4,
      height: 2.4,
      gemType: 'red',
      animated: true
    },
    boss: {
      type: 'boss',
      name: 'Кровавый демон',
      texturePrefix: '/textures/bosses/boss_demon',
      hp: 7600,
      speed: 2.4,
      damage: 45,
      width: 7.8,
      height: 7.8,
      gemType: 'red',
      isBoss: true
    },
    hydra: {
      type: 'hydra',
      name: 'Древняя трехглавая гидра',
      texturePrefix: '/textures/bosses/boss_hydra',
      hp: 28000,
      speed: 2.3,
      damage: 65,
      width: 10.0,
      height: 10.0,
      gemType: 'red',
      isBoss: true
    },
    spore_queen: {
      type: 'spore_queen',
      name: 'Споровая Владычица Ксено-Леса',
      texturePrefix: '/textures/bosses/boss_hydra',
      hp: 85000,
      speed: 2.7,
      damage: 90,
      width: 10.5,
      height: 10.5,
      gemType: 'red',
      isBoss: true
    }
  };

  // Event callbacks
  public onBossSpawn?: (boss: Enemy, tier: number) => void;
  public onImmortalBossSpawn?: (boss: Enemy) => void;
  public onBossDefeat?: () => void;
  public onEnemyKilled?: (enemy: Enemy, killer: string) => void;
  public onBleedDamage?: (enemy: Enemy, damage: number, isDead: boolean, hitter: string, sourceWeaponId?: string) => void;
  public onBurnDamage?: (enemy: Enemy, damage: number, isDead: boolean, hitter: string, sourceWeaponId?: string) => void;
  public camera?: Camera;

  public activePlayerCount: number = 1;
  public getElevation?: (x: number, z: number) => number;
  private lastTargetHitTimes: Map<string, number> = new Map();

  constructor(scene: Scene, dropManager: DropManager, damageNumbers: DamageNumberManager) {
    this.scene = scene;
    this.dropManager = dropManager;
    this.damageNumbers = damageNumbers;
    this.syncBalance();
  }

  public syncBalance(): void {
    const types: EnemyType[] = ['coyote', 'crawler', 'cactus', 'skeleton', 'ghost', 'scorpion', 'brute', 'bison'];
    for (const t of types) {
      const cfg = BalanceManager.getEnemyConfig(t);
      if (this.configs[t]) {
        this.configs[t].hp = cfg.hp;
        this.configs[t].speed = cfg.speed;
        this.configs[t].damage = cfg.damage;
      }
    }
    const demonCfg = BalanceManager.getBossConfig('boss');
    if (this.configs.boss) {
      this.configs.boss.hp = demonCfg.hp;
      this.configs.boss.speed = demonCfg.speed;
      this.configs.boss.damage = demonCfg.damage;
    }
    const hydraCfg = BalanceManager.getBossConfig('hydra');
    if (this.configs.hydra) {
      this.configs.hydra.hp = hydraCfg.hp;
      this.configs.hydra.speed = hydraCfg.speed;
      this.configs.hydra.damage = hydraCfg.damage;
    }
    const sporeCfg = BalanceManager.getBossConfig('spore_queen');
    if (this.configs.spore_queen && sporeCfg) {
      this.configs.spore_queen.hp = sporeCfg.hp;
      this.configs.spore_queen.speed = sporeCfg.speed;
      this.configs.spore_queen.damage = sporeCfg.damage;
    }
  }

  private registerEnemy(enemy: Enemy): Enemy {
    enemy.onBleedDamage = (e, tickDamage, isDead, hitter, sourceWeaponId) => {
      if (this.camera) {
        this.damageNumbers.spawnDamage(e.position, tickDamage, false, this.camera, true);
      }
      if (this.onBleedDamage) {
        this.onBleedDamage(e, tickDamage, isDead, hitter, sourceWeaponId);
      }
    };
    enemy.onBurnDamage = (e, tickDamage, isDead, hitter, sourceWeaponId) => {
      if (this.camera) {
        this.damageNumbers.spawnDamage(e.position, tickDamage, false, this.camera, false, 1, 1.5, true);
      }
      if (this.onBurnDamage) {
        this.onBurnDamage(e, tickDamage, isDead, hitter, sourceWeaponId);
      }
    };
    return enemy;
  }

  public stageTime: number = 0;

  /**
   * Continuous progressive scaling multipliers with endless scaling, stage progression, and biome overstay penalties.
   */
  public getHpMultiplier(): number {
    const minute = this.gameTime / 60;
    const baseMult = 1 + (minute * 0.35 + Math.pow(minute / 4.0, 1.8) * 0.45) * 1.5;
    const mPost = Math.max(0, minute - 15);
    const hpPostSurge = Math.pow(mPost / 3.5, 2.3) * 3.5 * (1 + mPost * 0.15);
    const overstay = DifficultyDirector.getBiomeOverstayMultiplier(this.stageTime, this.currentStage >= 4);
    const stageMult = Math.pow(1.40, Math.max(0, this.currentStage - 1));
    return (baseMult + hpPostSurge) * overstay.hpMult * stageMult;
  }

  public getDamageMultiplier(): number {
    const minute = this.gameTime / 60;
    const baseMult = 1 + (minute * 0.15 + Math.pow(minute / 6.0, 1.5) * 0.30) * 1.5;
    const mPost = Math.max(0, minute - 15);
    const dmgPostSurge = Math.pow(mPost / 4.0, 2.0) * 1.8 * (1 + mPost * 0.10);
    const overstay = DifficultyDirector.getBiomeOverstayMultiplier(this.stageTime, this.currentStage >= 4);
    const stageMult = Math.pow(1.25, Math.max(0, this.currentStage - 1));
    return (baseMult + dmgPostSurge) * overstay.dmgMult * stageMult;
  }

  public getSpeedMultiplier(): number {
    const minute = this.gameTime / 60;
    const mPost = Math.max(0, minute - 15);
    const stageBonus = Math.max(0, this.currentStage - 1) * 0.04;
    return Math.min(1.85, 1 + (minute * 0.015) * 1.5 + mPost * 0.01 + stageBonus);
  }

  public resetStageTime(): void {
    this.stageTime = 0;
  }

  public getLateGameCcResistance(isBoss: boolean): number {
    const minute = this.gameTime / 60;
    const stageBonus = Math.max(0, this.currentStage - 1) * 0.06;
    if (isBoss) {
      // Bosses have 65% base CC resistance, scaling up to 92%
      return Math.min(0.92, 0.65 + Math.max(0, minute - 15) * 0.006 + stageBonus);
    }
    // Normal mobs have 0% CC resistance before 15 min on stage 1, scaling up to 70% in late game
    return Math.min(0.70, Math.max(0, minute - 15) * 0.015 + stageBonus);
  }

  public getKnockbackResistance(isBoss: boolean, isTough: boolean = false): number {
    const minute = this.gameTime / 60;
    const stageBonus = Math.max(0, this.currentStage - 1) * 0.06;
    if (isBoss) {
      return 0.95; // Bosses barely flinch
    }
    const mPost = Math.max(0, minute - 15);
    if (isTough) {
      // Tough mobs (brute, bison) start at 25% resistance, scaling up to 85%
      return Math.min(0.85, 0.25 + mPost * 0.02 + stageBonus);
    }
    // Normal mobs scale from 0% up to 75%
    return Math.min(0.75, mPost * 0.02 + stageBonus);
  }

  public getLateGameDamageResistance(isBoss: boolean): number {
    const minute = this.gameTime / 60;
    if (isBoss) {
      const stageBonus = Math.max(0, this.currentStage - 1) * 0.05;
      const mPost = Math.max(0, minute - 15);
      // Bosses have 35% base damage resistance from 15m, scaling up to 85% at 60+ min
      return Math.min(0.85, 0.35 + mPost * 0.015 + stageBonus);
    }
    // Normal mobs have 0% damage resistance before 20 min, scaling up to 55% at 60+ min
    return Math.min(0.55, Math.max(0, minute - 20) * 0.012);
  }

  public update(
    dt: number,
    playerPos: Vector3,
    onPlayerDamage: (damage: number, isImmortalHit?: boolean, attacker?: Enemy) => void,
    obstacleManager?: ObstacleManager,
    allTargets?: PlayerTargetInfo[],
    onRemoteDamage?: (targetId: string, damage: number, isImmortalHit?: boolean, attacker?: Enemy) => void,
    partnerPos?: Vector3,
    onPartnerDamage?: (damage: number, isImmortalHit?: boolean, attacker?: Enemy) => void,
    isPartnerAlive: boolean = true
  ) {
    this.gameTime += dt;
    this.stageTime += dt;
    this.spawnTimer += dt;

    // 1. Spawning Boss every 5 minutes only starting from minute 15 (minute 15, 20, 25, 30, 35, 40...)
    const currentMinute = Math.floor(this.gameTime / 60);
    if (
      currentMinute >= 15 &&
      currentMinute % 5 === 0 &&
      currentMinute > this.lastBossMinute
    ) {
      this.lastBossMinute = currentMinute;
      const tier = Math.floor(currentMinute / 5);
      this.spawnTieredBoss(playerPos, tier);
    }

    // Progressive spawn interval: starts at this.spawnInterval (1.0s), accelerates smoothly through early game
    // (~0.47s at 4 min, ~0.35s at 8 min, ~0.26s at 10 min), and surges down to 0.14s-0.12s
    // from minute 15+ for high-intensity late-game swarm pressure.
    const tMin = this.gameTime / 60;
    const currentInterval = tMin < 15
      ? Math.max(0.18, this.spawnInterval / (1 + tMin * 0.28))
      : Math.max(0.12, 0.18 - (tMin - 15) * 0.006);

    if (this.spawnTimer >= currentInterval) {
      this.spawnTimer = 0;
      let targetSpawn = playerPos;
      if (allTargets && allTargets.length > 0) {
        const valid = allTargets.filter((t) => t.isAlive && !t.isDowned);
        if (valid.length > 0) {
          targetSpawn = valid[Math.floor(Math.random() * valid.length)].position;
        }
      } else if (partnerPos && isPartnerAlive && Math.random() < 0.5) {
        targetSpawn = partnerPos;
      }
      this.spawnWave(targetSpawn);
    }

    // High performance O(N) spatial partitioning & separation
    this.spatialGrid.clear();
    this.spatialGrid.insertAll(this.enemies);
    this.spatialGrid.resolveSeparation();

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      let closestTargetPos = playerPos;
      let closestTargetId = 'p1';
      let closestDistSq = Infinity;

      if (allTargets && allTargets.length > 0) {
        for (const target of allTargets) {
          if (!target.isAlive || target.isDowned) continue;
          const dx = enemy.position.x - target.position.x;
          const dz = enemy.position.z - target.position.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < closestDistSq) {
            closestDistSq = dSq;
            closestTargetPos = target.position;
            closestTargetId = target.id;
          }
        }
      } else {
        const dx1 = enemy.position.x - playerPos.x;
        const dz1 = enemy.position.z - playerPos.z;
        closestDistSq = dx1 * dx1 + dz1 * dz1;
        closestTargetPos = playerPos;

        if (partnerPos && isPartnerAlive) {
          const dx2 = enemy.position.x - partnerPos.x;
          const dz2 = enemy.position.z - partnerPos.z;
          const distSq2 = dx2 * dx2 + dz2 * dz2;
          if (distSq2 < closestDistSq) {
            closestTargetPos = partnerPos;
            closestTargetId = 'p2';
            closestDistSq = distSq2;
          }
        }
      }

      // Despawn enemies left far behind in the infinite desert (keep bosses always alive)
      if (!enemy.isBoss && closestDistSq > 60 * 60) {
        enemy.destroy(this.scene);
        this.enemies.splice(i, 1);
        continue;
      }

      enemy.ccResistance = this.getLateGameCcResistance(enemy.isBoss);
      enemy.damageResistance = this.getLateGameDamageResistance(enemy.isBoss);
      const isTough = enemy.type === 'brute' || enemy.type === 'bison';
      enemy.knockbackResistance = this.getKnockbackResistance(enemy.isBoss, isTough);

      enemy.updateSimulation(dt, closestTargetPos);

      // Slide around terrain obstacles (cacti, trees, boulders, altars) for nearby grounded enemies
      if (obstacleManager && enemy.type !== 'ghost' && closestDistSq <= 32 * 32) {
        const rad = (enemy.width + enemy.height) * 0.16;
        obstacleManager.resolveEntityCollision(enemy.position, rad, 1);
      }

      if (this.getElevation) {
        enemy.position.y = this.getElevation(enemy.position.x, enemy.position.z);
      }

      // Check attack and collision with targeted player
      if (enemy.canAttack) {
        if (enemy.hasAttackAnimation) {
          const attackReach = enemy.isBoss
            ? Math.min(4.2, (enemy.width + enemy.height) * 0.18 + 0.6)
            : (enemy.width + enemy.height) * 0.28 + 0.6;
          if (closestDistSq <= attackReach * attackReach && enemy.animState !== 'ATTACK' && enemy.attackCooldownTimer <= 0) {
            enemy.triggerAttack(closestTargetId);
          }

          if (enemy.pendingAttackHit) {
            enemy.pendingAttackHit = false;
            // Strike damage lands strictly on 3rd frame if target is within reach
            const hitReach = enemy.isBoss
              ? Math.min(5.0, (enemy.width + enemy.height) * 0.22 + 0.8)
              : (enemy.width + enemy.height) * 0.36 + 0.9;
            if (closestDistSq <= hitReach * hitReach) {
              const hitTargetId = enemy.attackTargetId || closestTargetId;
              const now = performance.now();
              this.lastTargetHitTimes.set(hitTargetId, now);
              if (hitTargetId === 'p1') {
                onPlayerDamage(enemy.damage, enemy.isImmortal, enemy);
              } else if (onRemoteDamage) {
                onRemoteDamage(hitTargetId, enemy.damage, enemy.isImmortal, enemy);
              } else if (onPartnerDamage) {
                onPartnerDamage(enemy.damage, enemy.isImmortal, enemy);
              }
              SoundManager.playPlayerHurt();
            }
          }
        } else {
          // Fallback for non-animated enemies (e.g. Cacti, Ghosts, Immortal Reaper) with individual attack cooldown
          const collisionRadius = (enemy.width + enemy.height) * 0.25 + 0.5;
          if (closestDistSq < collisionRadius * collisionRadius && enemy.attackCooldownTimer <= 0) {
            enemy.attackCooldownTimer = enemy.baseAttackCooldown;
            const now = performance.now();
            this.lastTargetHitTimes.set(closestTargetId, now);
            if (closestTargetId === 'p1') {
              onPlayerDamage(enemy.damage, enemy.isImmortal, enemy);
            } else if (onRemoteDamage) {
              onRemoteDamage(closestTargetId, enemy.damage, enemy.isImmortal, enemy);
            } else if (onPartnerDamage) {
              onPartnerDamage(enemy.damage, enemy.isImmortal, enemy);
            }
            SoundManager.playPlayerHurt();
          }
        }
      }

      // Check death
      if (!enemy.isAlive) {
        const killer = enemy.lastHitBy || 'p1';
        if (this.onEnemyKilled) {
          this.onEnemyKilled(enemy, killer);
        }

        if (enemy.isBoss) {
          if (!enemy.isImmortal) {
            // Boss drops red gems scaling with boss tier & stage
            const tier = Math.max(1, Math.floor(this.gameTime / 300));
            const gemCount = 10 + tier * 2;
            const stageMultiplier = Math.pow(1.25, Math.max(0, this.currentStage - 1));
            const bossGemXp = Math.round((250 + tier * 180) * stageMultiplier);

            for (let g = 0; g < gemCount; g++) {
              const offset = new Vector3(
                (Math.random() - 0.5) * 4.0,
                0,
                (Math.random() - 0.5) * 4.0
              );
              const gem = this.dropManager.spawnGem(enemy.position.clone().add(offset), 'red');
              if (gem) {
                gem.xpValue = bossGemXp;
              }
            }
            // Boss drops 2 guaranteed gold passive crystals
            const goldCount = 2;
            for (let gp = 0; gp < goldCount; gp++) {
              const pOffset = new Vector3(
                (Math.random() - 0.5) * 2.5,
                0,
                (Math.random() - 0.5) * 2.5
              );
              this.dropManager.spawnGem(enemy.position.clone().add(pOffset), 'gold');
            }

            // Boss drops Rift Crystals (5-7 crystals + meta bonus)
            const metaBonus = MetaProgression.getInstance().getBonuses();
            const crystalDropCount = Math.max(1, Math.round((5 + Math.floor(Math.random() * 3)) * (1 + metaBonus.crystalDropBonus)));
            for (let c = 0; c < crystalDropCount; c++) {
              const cOffset = new Vector3(
                (Math.random() - 0.5) * 3.5,
                0,
                (Math.random() - 0.5) * 3.5
              );
              this.dropManager.spawnGem(enemy.position.clone().add(cOffset), 'crystal');
            }

            if (this.onBossDefeat) this.onBossDefeat();
          }

          // Switch activeBoss to another alive boss if one exists
          const nextBoss = this.enemies.find((e) => e.isBoss && e.isAlive && e !== enemy);
          this.activeBoss = nextBoss || null;
        } else {
          this.dropManager.spawnGem(enemy.position, enemy.gemType);

          // Random chance for passive buff drop from global balance config
          const globalCfg = BalanceManager.getGlobalConfig();
          const baseNormalGoldChance = globalCfg?.goldGemChanceNormal ?? 0.01;
          const isTough = enemy.type === 'bison' || enemy.type === 'brute' || enemy.type === 'scorpion';
          const passiveChance = isTough ? baseNormalGoldChance * 3 : baseNormalGoldChance;
          if (Math.random() < passiveChance) {
            const pOffset = new Vector3(
              (Math.random() - 0.5),
              0,
              (Math.random() - 0.5)
            );
            this.dropManager.spawnGem(enemy.position.clone().add(pOffset), 'gold');
          }

          // Rift Crystals drop: reduced 50x (0.5% for regular creeps, 1.2% for tough mobs, scales with utility meta branch)
          const metaBonus = MetaProgression.getInstance().getBonuses();
          const baseCrystalChance = (isTough ? 0.60 : 0.25) / 50;
          const crystalChance = baseCrystalChance * (1 + metaBonus.crystalDropBonus);
          if (Math.random() < crystalChance) {
            const count = isTough ? (Math.random() < 0.4 ? 2 : 1) : 1;
            for (let c = 0; c < count; c++) {
              const cOffset = new Vector3(
                (Math.random() - 0.5) * 1.2,
                0,
                (Math.random() - 0.5) * 1.2
              );
              this.dropManager.spawnGem(enemy.position.clone().add(cOffset), 'crystal');
            }
          }
        }

        enemy.destroy(this.scene);
        this.enemies.splice(i, 1);
        this.totalKills++;
      }
    }
  }

  /**
   * Spawns a 5-minute boss with stats scaling by tier (5m, 10m, 15m, 20m, 25m)
   */
  public spawnTieredBoss(playerPos: Vector3, tier: number = 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 16;
    const spawnPos = new Vector3(
      playerPos.x + Math.cos(angle) * distance,
      0,
      playerPos.z + Math.sin(angle) * distance
    );

    const baseHp = this.configs.boss.hp; // 7600
    const baseDmg = this.configs.boss.damage; // 90
    const baseSpd = this.configs.boss.speed; // 2.4
    const stageMult = Math.pow(1.50, Math.max(0, this.currentStage - 1));

    // Tier 1 (5m): ~12,000 HP, 90 dmg (Кровавый демон)
    // Tier 2 (10m): Hydra
    // Tier 3 (15m): ~350,000 * stageMult HP (Stage 4: ~1.2M HP)
    // Tier 4 (20m): ~900,000 * stageMult HP (Stage 4: ~3M HP)
    // Tier 5 (25m): ~2,200,000 * stageMult HP (Stage 4: ~7.4M HP)
    // Tier 6 (30m): ~5,000,000 * stageMult HP (Stage 4: ~16.8M HP)
    // Tier 8 (40m): ~18,000,000 * stageMult HP (Stage 4: ~60M HP)
    // Tier 12 (60m): ~65,000,000 * stageMult HP (Stage 4: ~220M HP)
    let bossConfig: EnemyConfig;
    if (tier === 2) {
      bossConfig = {
        ...this.configs.hydra,
        name: 'Древняя трехглавая гидра',
        hp: Math.round(this.configs.hydra.hp * stageMult),
        damage: Math.round(this.configs.hydra.damage * stageMult),
        speed: 2.3
      };
    } else {
      const tierPost = Math.max(0, tier - 3);
      let calculatedHp: number;
      if (tier < 3) {
        calculatedHp = baseHp * (1 + (tier - 1) * 2.2);
      } else {
        calculatedHp = 350000 * Math.pow(2.2, tierPost) * (1 + tierPost * 0.35);
      }
      const tierHp = Math.round(calculatedHp * stageMult);

      const baseTierDmg = baseDmg * (1 + ((tier - 1) * 0.6 + Math.pow(tier - 1, 1.3) * 0.2) * 1.5);
      const postDmgMult = 1 + Math.pow(tierPost / 2.0, 1.8) * 0.5;
      const tierDmg = Math.round(baseTierDmg * postDmgMult * stageMult);
      const tierSpd = Number((Math.min(3.8, baseSpd + (tier - 1) * 0.18 * 1.5 + tierPost * 0.1)).toFixed(2));

      bossConfig = {
        ...this.configs.boss,
        name: `Кровавый демон (Ур. ${tier})`,
        hp: tierHp,
        damage: tierDmg,
        speed: tierSpd
      };
    }

    const boss = this.registerEnemy(new Enemy(bossConfig, spawnPos));
    boss.ccResistance = this.getLateGameCcResistance(true);
    boss.damageResistance = this.getLateGameDamageResistance(true);
    boss.knockbackResistance = this.getKnockbackResistance(true);
    this.enemies.push(boss);
    if (!this.isDeclarative) {
      this.scene.add(boss.mesh);
    }
    this.activeBoss = boss;
    this.bossSpawned = true;

    if (this.onBossSpawn) {
      this.onBossSpawn(boss, tier);
    }
  }

  /**
   * Spawns a stage boss explicitly when the Teleporter event is activated.
   */
  public spawnTeleporterBoss(playerPos: Vector3, stage: number = 1): Enemy {
    const angle = Math.random() * Math.PI * 2;
    const distance = 16;
    const spawnPos = new Vector3(
      playerPos.x + Math.cos(angle) * distance,
      0,
      playerPos.z + Math.sin(angle) * distance
    );
    if (this.getElevation) {
      spawnPos.y = this.getElevation(spawnPos.x, spawnPos.z);
    }

    const isHydra = stage === 2;
    const isSporeQueen = stage === 3;
    const stageBaseConfig = isHydra
      ? this.configs.hydra
      : isSporeQueen
        ? this.configs.spore_queen
        : this.configs.boss;

    const baseHp = stageBaseConfig.hp;
    const baseDmg = stageBaseConfig.damage;
    const baseSpd = stageBaseConfig.speed;

    const diffCoeff = DifficultyDirector.getDifficultyCoefficient(this.gameTime, this.activePlayerCount, stage);
    const hpStageMult = isSporeQueen ? (1.3 + (stage - 1) * 0.8) : isHydra ? (1.1 + (stage - 1) * 0.7) : (1.2 + (stage - 1) * 1.5);
    const tierHp = Math.round(baseHp * hpStageMult * diffCoeff);
    const tierDmg = Math.round(baseDmg * (1 + (stage - 1) * 0.35) * (1 + (diffCoeff - 1) * 0.25));

    const stageBossNames = [
      'Кровавый Страж Разлома',
      'Древняя трёхглавая гидра',
      'Споровая Владычица Ксено-Леса',
      'Магматический Колосс Кальдеры',
      'Первородный Страж Предтеч',
      'Архитектор Разлома'
    ];

    const bossName = stageBossNames[Math.min(stage - 1, stageBossNames.length - 1)];

    const bossConfig: EnemyConfig = {
      ...stageBaseConfig,
      name: bossName,
      hp: tierHp,
      damage: tierDmg,
      speed: Math.min(3.8, Number((baseSpd + (stage - 1) * 0.15).toFixed(2))),
      creditsValue: 150 + stage * 50
    };

    const boss = this.registerEnemy(new Enemy(bossConfig, spawnPos));
    boss.ccResistance = Math.max(0.65, this.getLateGameCcResistance(true));
    boss.damageResistance = Math.max(0.15, this.getLateGameDamageResistance(true));
    boss.knockbackResistance = this.getKnockbackResistance(true);
    if (isSporeQueen) {
      boss.ccResistance = Math.max(0.75, boss.ccResistance);
      boss.damageResistance = Math.max(0.35, boss.damageResistance);
      boss.knockbackResistance = 0.95;
    }
    this.enemies.push(boss);
    if (!this.isDeclarative) {
      this.scene.add(boss.mesh);
    }
    this.activeBoss = boss;
    this.bossSpawned = true;

    if (this.onBossSpawn) {
      this.onBossSpawn(boss, stage);
    }
    return boss;
  }

  /**
   * Spawns an endgame rift boss
   */
  public spawnImmortalBoss(playerPos: Vector3) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 18;
    const spawnPos = new Vector3(
      playerPos.x + Math.cos(angle) * distance,
      0,
      playerPos.z + Math.sin(angle) * distance
    );

    const reaperConfig: EnemyConfig = {
      type: 'boss',
      name: 'Древний Владыка Разлома',
      texturePrefix: '/textures/bosses/boss_sheriff',
      hp: 99999999,
      speed: 7.6,
      damage: 99999,
      width: 5.6,
      height: 5.2,
      gemType: 'red',
      isBoss: true,
      isImmortal: true
    };

    const reaper = this.registerEnemy(new Enemy(reaperConfig, spawnPos));
    this.enemies.push(reaper);
    if (!this.isDeclarative) {
      this.scene.add(reaper.mesh);
    }
    this.activeBoss = reaper;
    this.immortalBossSpawned = true;

    if (this.onImmortalBossSpawn) {
      this.onImmortalBossSpawn(reaper);
    }
  }

  private spawnWave(playerPos: Vector3) {
    // 30-Minute comprehensive wave progression:
    let types: EnemyType[] = ['coyote'];
    const time = this.gameTime;

    if (time < 60) {
      // 0 - 1 min: Coyotes and Crawlers
      types = Math.random() < 0.5 ? ['coyote'] : ['crawler'];
    } else if (time < 120) {
      // 1 - 2 min: Coyotes, Crawlers, Cacti, Skeletons
      const r = Math.random();
      if (r < 0.35) types = ['coyote', 'crawler'];
      else if (r < 0.7) types = ['cactus'];
      else types = ['skeleton'];
    } else if (time < 180) {
      // 2 - 3 min: Cacti, Skeletons, Scorpions, Ghosts
      const r = Math.random();
      if (r < 0.3) types = ['cactus', 'skeleton'];
      else if (r < 0.65) types = ['scorpion'];
      else types = ['ghost'];
    } else if (time < 240) {
      // 3 - 4 min: Desert Brutes, Scorpions, Ghosts
      const r = Math.random();
      if (r < 0.35) types = ['scorpion', 'ghost'];
      else if (r < 0.75) types = ['brute'];
      else types = ['skeleton', 'cactus'];
    } else if (time < 300) {
      // 4 - 5 min: Introduction of Bisons as heavy vanguard, supported by Brutes, Scorpions, and XP fodder
      const r = Math.random();
      if (r < 0.18) types = ['bison'];
      else if (r < 0.58) types = ['brute', 'scorpion'];
      else types = ['skeleton', 'ghost', 'crawler'];
    } else if (time < 600) {
      // 5 - 10 min: Heavy frontline (Bisons, Brutes) with flankers
      const r = Math.random();
      if (r < 0.35) types = ['bison', 'brute'];
      else if (r < 0.7) types = ['scorpion', 'skeleton'];
      else types = ['ghost', 'crawler'];
    } else if (time < 900) {
      // 10 - 15 min: Aggressive mixed swarms with high Bison/Brute frequency
      const r = Math.random();
      if (r < 0.45) types = ['bison', 'brute'];
      else if (r < 0.75) types = ['scorpion', 'ghost'];
      else types = ['cactus', 'skeleton'];
    } else if (time < 1200) {
      // 15 - 20 min: Stampedes of Bisons and Brutes with Ghost infiltration
      const r = Math.random();
      if (r < 0.5) types = ['bison'];
      else if (r < 0.8) types = ['brute', 'ghost'];
      else types = ['scorpion', 'skeleton'];
    } else if (time < 1500) {
      // 20 - 25 min: Relentless elite desert hordes
      const r = Math.random();
      if (r < 0.55) types = ['bison', 'brute'];
      else if (r < 0.85) types = ['ghost', 'scorpion'];
      else types = ['crawler', 'skeleton'];
    } else if (time < 1800) {
      // 25 - 30 min: Void Breach — continuous stampedes of Bisons and Brutes with fast infiltrators
      const r = Math.random();
      if (r < 0.65) types = ['bison', 'brute'];
      else if (r < 0.88) types = ['ghost', 'scorpion'];
      else types = ['skeleton', 'crawler'];
    } else if (time < 2100) {
      // 30 - 35 min: Endless Rift Cataclysm — heavy elite stampedes
      const r = Math.random();
      if (r < 0.72) types = ['bison', 'brute'];
      else if (r < 0.92) types = ['ghost', 'scorpion'];
      else types = ['cactus', 'crawler'];
    } else if (time < 2400) {
      // 35 - 40 min: Apocalypse — massive heavy horde assault
      const r = Math.random();
      if (r < 0.80) types = ['bison', 'brute'];
      else if (r < 0.95) types = ['ghost'];
      else types = ['scorpion'];
    } else {
      // 40+ min: Void Singularity / Climax — endless supreme apocalypse
      const r = Math.random();
      if (r < 0.85) types = ['bison', 'brute'];
      else types = ['ghost', 'scorpion'];
    }

    // Cap maximum active enemies to prevent frame drops in long runs (scales with player count)
    const baseCap = 95 + Math.floor(time / 60) * 2.5;
    const maxEnemies = Math.min(220, baseCap + (this.activePlayerCount - 1) * 22);
    if (this.enemies.length >= maxEnemies) return;

    // Number of monsters spawned per wave scales with time and player count
    let count = 1;
    if (time > 2100) count = 8;      // 35+ min
    else if (time > 1800) count = 7; // 30-35 min
    else if (time > 1500) count = 6; // 25-30 min
    else if (time > 1200) count = 5; // 20-25 min
    else if (time > 900) count = 4;  // 15-20 min
    else if (time > 600) count = 3;  // 10-15 min
    else if (time > 240) count = 2;  // 4-10 min
    else if (time > 90) count = Math.random() < 0.6 ? 2 : 1;

    if (this.activePlayerCount > 1) {
      count = Math.max(1, Math.round(count * (1 + (this.activePlayerCount - 1) * 0.35)));
    }

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      this.spawnSingleEnemy(type, playerPos);
    }
  }

  private spawnSingleEnemy(type: EnemyType, playerPos: Vector3) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 18 + Math.random() * 5;
    const spawnPos = new Vector3(
      Math.max(-219, Math.min(219, playerPos.x + Math.cos(angle) * distance)),
      0,
      Math.max(-219, Math.min(219, playerPos.z + Math.sin(angle) * distance))
    );
    if (this.getElevation) {
      spawnPos.y = this.getElevation(spawnPos.x, spawnPos.z);
    }

    // Dynamic progressive scaling for regular monsters
    const baseConfig = this.configs[type];
    const hpMult = this.getHpMultiplier();
    const dmgMult = this.getDamageMultiplier();
    const spdMult = this.getSpeedMultiplier();

    // Check elite spawn chance from Difficulty Director
    const isElite = Math.random() < DifficultyDirector.getEliteSpawnChance(this.gameTime, this.currentStage);
    const affixes: ('blazing' | 'glacial' | 'overloading')[] = ['blazing', 'glacial', 'overloading'];
    const chosenAffix = isElite ? affixes[Math.floor(Math.random() * affixes.length)] : undefined;

    const scaledConfig: EnemyConfig = {
      ...baseConfig,
      hp: Math.max(1, Math.round(baseConfig.hp * hpMult)),
      damage: Math.max(1, Math.round(baseConfig.damage * dmgMult)),
      speed: Number((baseConfig.speed * spdMult).toFixed(2)),
      eliteAffix: chosenAffix,
      creditsValue: (baseConfig.creditsValue || 1) + Math.max(0, this.currentStage - 1) * 2
    };

    const enemy = this.registerEnemy(new Enemy(scaledConfig, spawnPos));
    const isTough = type === 'brute' || type === 'bison';
    enemy.ccResistance = this.getLateGameCcResistance(false);
    enemy.damageResistance = this.getLateGameDamageResistance(false);
    enemy.knockbackResistance = this.getKnockbackResistance(false, isTough);
    this.enemies.push(enemy);
    if (!this.isDeclarative) {
      this.scene.add(enemy.mesh);
    }
  }

  /**
   * Fast query for enemies within radius using the Spatial Grid.
   */
  public getNearbyEnemies(x: number, z: number, radius: number, out?: Enemy[]): Enemy[] {
    return this.spatialGrid.queryRadius(x, z, radius, out);
  }

  public damageEnemy(
    enemy: Enemy,
    amount: number,
    sourcePos?: Vector3,
    camera?: Camera,
    hitter: string = 'p1',
    showDamageNumber: boolean = true,
    isCrit: boolean = false,
    critTier: number = 1,
    critMultiplier: number = 1.5,
    weaponId?: string
  ) {
    const isDead = enemy.takeDamage(amount, sourcePos, hitter, weaponId);
    const displayedDamage = enemy.lastDamageTaken > 0 ? enemy.lastDamageTaken : amount;
    if (showDamageNumber && camera) {
      this.damageNumbers.spawnDamage(enemy.position, displayedDamage, isCrit, camera, false, critTier, critMultiplier);
    }
    SoundManager.playHit();
    return isDead;
  }

  public killAll(camera?: Camera) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.isImmortal) continue; // Immortal Reaper cannot be wiped
      this.damageEnemy(enemy, 99999, undefined, camera);
    }
  }

  /**
   * Freezes all active monsters and bosses for the given duration, and knocks them back
   * away from the specified center position by the given distance.
   */
  public freezeAndKnockbackAll(
    center: Vector3,
    freezeDuration: number = 5.0,
    knockbackDistance: number = 25.0
  ): void {
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      enemy.freeze(freezeDuration);
      enemy.knockbackFrom(center, knockbackDistance, 0.25);
    }
    if (this.activeBoss && this.activeBoss.isAlive && !this.enemies.includes(this.activeBoss)) {
      this.activeBoss.freeze(freezeDuration);
      this.activeBoss.knockbackFrom(center, knockbackDistance, 0.25);
    }
  }

  public spawnSpecificEnemy(type: EnemyType | 'reaper', playerPos: Vector3) {
    if (type === 'reaper') {
      this.spawnImmortalBossNow(playerPos);
      return;
    }
    if (type === 'boss') {
      this.spawnBossNow(playerPos);
      return;
    }
    if (type === 'hydra') {
      this.spawnHydraNow(playerPos);
      return;
    }
    this.spawnSingleEnemy(type, playerPos);
  }

  public spawnBossNow(playerPos: Vector3) {
    const currentTier = Math.max(1, Math.floor(this.gameTime / 300) || 1);
    this.spawnTieredBoss(playerPos, currentTier);
  }

  public spawnHydraNow(playerPos: Vector3) {
    this.spawnTieredBoss(playerPos, 2);
  }

  public spawnImmortalBossNow(playerPos: Vector3) {
    this.spawnImmortalBoss(playerPos);
  }

  public setGameTime(seconds: number) {
    this.gameTime = Math.max(0, seconds);
    const minute = Math.floor(this.gameTime / 60);
    if (minute < 15) {
      this.lastBossMinute = 0;
    } else {
      this.lastBossMinute = Math.floor(minute / 5) * 5;
      if (minute % 5 === 0 && seconds % 60 < 2) {
        this.lastBossMinute = Math.max(10, this.lastBossMinute - 5);
      }
    }
    if (this.gameTime < 2400) {
      this.immortalBossSpawned = false;
    }
  }

  public getSnapshot(): EnemySnapshot[] {
    return this.enemies.map((e) => ({
      id: e.id,
      type: e.type,
      x: e.position.x,
      z: e.position.z,
      hp: e.hp,
      maxHp: e.maxHp,
      dir: e.currentDir,
      isImmortal: e.isImmortal
    }));
  }

  public applySnapshot(snapshots: EnemySnapshot[], ignoredIds?: Set<string>) {
    const seenIds = new Set<string>();
    for (const s of snapshots) {
      if (ignoredIds && ignoredIds.has(s.id)) continue;
      seenIds.add(s.id);
      let enemy = this.enemies.find((e) => e.id === s.id);
      if (!enemy) {
        const baseConfig = this.configs[s.type] || this.configs.coyote;
        const config: EnemyConfig = {
          ...baseConfig,
          hp: s.maxHp || s.hp,
          isImmortal: s.isImmortal
        };
        if (s.isImmortal) {
          config.name = 'Древний Владыка Разлома';
          config.width = 5.6;
          config.height = 5.2;
          config.damage = 99999;
          config.speed = 7.6;
        }
        const initY = this.getElevation ? this.getElevation(s.x, s.z) : 0;
        enemy = this.registerEnemy(new Enemy(config, new Vector3(s.x, initY, s.z)));
        enemy.id = s.id;
        this.enemies.push(enemy);
        if (!this.isDeclarative) {
          this.scene.add(enemy.mesh);
        }
        if (enemy.isBoss) {
          this.activeBoss = enemy;
        }
      }
      // Lerp position towards snapshot
      enemy.position.x += (s.x - enemy.position.x) * 0.4;
      enemy.position.z += (s.z - enemy.position.z) * 0.4;
      const ey = this.getElevation ? this.getElevation(enemy.position.x, enemy.position.z) : 0;
      enemy.position.y = ey;
      enemy.mesh.position.set(enemy.position.x, ey, enemy.position.z);
      enemy.hp = s.hp;
      enemy.maxHp = s.maxHp;
      if (s.dir !== enemy.currentDir) {
        enemy.setDirection(s.dir);
      }
    }

    // Cleanup dead/despawned
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!seenIds.has(this.enemies[i].id)) {
        const deadEnemy = this.enemies[i];
        if (deadEnemy === this.activeBoss) {
          this.activeBoss = null;
        }
        deadEnemy.destroy(this.scene);
        this.enemies.splice(i, 1);
      }
    }

    if (this.activeBoss && (!this.enemies.includes(this.activeBoss) || !this.activeBoss.isAlive)) {
      this.activeBoss = null;
    }
  }

  public applyRemoteDamage(
    enemyId: string,
    amount: number,
    sourcePos?: Vector3,
    camera?: Camera,
    hitter: string = 'client',
    showDamageNumber: boolean = false
  ) {
    const enemy = this.enemies.find((e) => e.id === enemyId);
    if (enemy && enemy.isAlive) {
      return this.damageEnemy(enemy, amount, sourcePos, camera, hitter, showDamageNumber);
    }
    return false;
  }

  private tempSphere = new Sphere();

  /**
   * Rendering phase: Viewport/Frustum culling across all active enemies.
   * Enemies outside the camera frustum are culled (mesh.visible = false, zero draw calls).
   */
  public updateVisuals(dt: number, frustum: Frustum, cameraPos?: Vector3) {
    const maxDistSq = 52 * 52;
    const cx = cameraPos ? cameraPos.x : 0;
    const cz = cameraPos ? cameraPos.z : 0;

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (!enemy.isAlive) {
        enemy.mesh.visible = false;
        continue;
      }

      if (cameraPos) {
        const dx = enemy.position.x - cx;
        const dz = enemy.position.z - cz;
        if (dx * dx + dz * dz > maxDistSq) {
          enemy.updateVisuals(dt, false);
          continue;
        }
      }

      this.tempSphere.center.set(enemy.position.x, enemy.height * 0.5, enemy.position.z);
      this.tempSphere.radius = enemy.boundingRadius;
      const inFrustum = frustum.intersectsSphere(this.tempSphere);
      enemy.updateVisuals(dt, inFrustum);
    }
  }

  public clear() {
    this.spatialGrid.clear();
    for (const enemy of this.enemies) {
      enemy.destroy(this.scene);
    }
    this.enemies = [];
    this.totalKills = 0;
    this.spawnTimer = 0;
    this.gameTime = 0;
    this.stageTime = 0;
    this.activeBoss = null;
    this.bossSpawned = false;
    this.lastBossMinute = 0;
    this.immortalBossSpawned = false;
    this.lastTargetHitTimes.clear();
  }
}
