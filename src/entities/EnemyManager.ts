import * as THREE from 'three';
import { Enemy, EnemyConfig, EnemyType } from './Enemy';
import { DropManager } from '../drops/DropManager';
import { SoundManager } from '../core/SoundManager';
import { DamageNumberManager } from '../combat/DamageNumberManager';
import { ObstacleManager } from '../world/ObstacleManager';
import { EnemySnapshot } from '../net/NetworkManager';

export interface PlayerTargetInfo {
  id: string; // 'p1', 'p2', 'p3', 'p4', 'p5'
  position: THREE.Vector3;
  isAlive: boolean;
  isDowned: boolean;
}

export class EnemyManager {
  private scene: THREE.Scene;
  private dropManager: DropManager;
  private damageNumbers: DamageNumberManager;
  public enemies: Enemy[] = [];
  public totalKills = 0;
  public activeBoss: Enemy | null = null;
  public bossSpawned = false;
  public lastBossMinute = 0;
  public immortalBossSpawned = false;

  private spawnTimer = 0;
  private spawnInterval = 1.0;
  public gameTime = 0;

  private configs: Record<EnemyType, EnemyConfig> = {
    coyote: {
      type: 'coyote',
      name: 'Кровожадный койот',
      texturePrefix: '/textures/monster_coyote',
      hp: 24,
      speed: 5.4,
      damage: 8,
      width: 2.1,
      height: 1.6,
      gemType: 'blue'
    },
    crawler: {
      type: 'crawler',
      name: 'Ползучая тварь',
      texturePrefix: '/textures/monster_crawler',
      hp: 20,
      speed: 6.0,
      damage: 10,
      width: 2.0,
      height: 1.2,
      gemType: 'blue'
    },
    cactus: {
      type: 'cactus',
      name: 'Кактусовый зомби',
      texturePrefix: '/textures/monster_cactus',
      hp: 44,
      speed: 3.5,
      damage: 14,
      width: 1.9,
      height: 2.3,
      gemType: 'blue'
    },
    skeleton: {
      type: 'skeleton',
      name: 'Бандит-скелет',
      texturePrefix: '/textures/monster_skeleton',
      hp: 55,
      speed: 3.8,
      damage: 16,
      width: 1.9,
      height: 2.4,
      gemType: 'green'
    },
    ghost: {
      type: 'ghost',
      name: 'Призрак ковбоя',
      texturePrefix: '/textures/monster_ghost',
      hp: 70,
      speed: 4.0,
      damage: 18,
      width: 1.7,
      height: 2.5,
      gemType: 'green'
    },
    scorpion: {
      type: 'scorpion',
      name: 'Скорпион-ползун',
      texturePrefix: '/textures/monster_scorpion',
      hp: 95,
      speed: 3.2,
      damage: 22,
      width: 2.3,
      height: 2.1,
      gemType: 'green'
    },
    brute: {
      type: 'brute',
      name: 'Пустынный громила',
      texturePrefix: '/textures/monster_brute',
      hp: 175,
      speed: 2.6,
      damage: 28,
      width: 2.5,
      height: 2.7,
      gemType: 'green'
    },
    bison: {
      type: 'bison',
      name: 'Белый бизон-убийца',
      texturePrefix: '/textures/monster_bison',
      hp: 360,
      speed: 4.8,
      damage: 35,
      width: 3.4,
      height: 1.9,
      gemType: 'red'
    },
    boss: {
      type: 'boss',
      name: 'Кровавый демон',
      texturePrefix: '/textures/boss_demon',
      hp: 3800,
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
      texturePrefix: '/textures/boss_hydra',
      hp: 14000,
      speed: 2.3,
      damage: 65,
      width: 10.0,
      height: 10.0,
      gemType: 'red',
      isBoss: true
    }
  };

  // Event callbacks
  public onBossSpawn?: (boss: Enemy, tier: number) => void;
  public onImmortalBossSpawn?: (boss: Enemy) => void;
  public onBossDefeat?: () => void;
  public onEnemyKilled?: (enemy: Enemy, killer: string) => void;

  public activePlayerCount: number = 1;
  private lastTargetHitTimes: Map<string, number> = new Map();

  constructor(scene: THREE.Scene, dropManager: DropManager, damageNumbers: DamageNumberManager) {
    this.scene = scene;
    this.dropManager = dropManager;
    this.damageNumbers = damageNumbers;
  }

  /**
   * Continuous progressive scaling multipliers based on elapsed minutes in prairie
   */
  public getHpMultiplier(): number {
    const minute = this.gameTime / 60;
    // Smooth progressive scaling: ~1.28x at 1m, ~2.5x at 4m, ~3.6x at 6m, ~8.5x at 12m, ~25x at 25m, ~35x at 30m
    return 1 + minute * 0.28 + Math.pow(minute / 4.5, 1.7) * 0.4;
  }

  public getDamageMultiplier(): number {
    const minute = this.gameTime / 60;
    // Damage scaling: ~1.12x at 1m, ~1.75x at 5m, ~2.7x at 10m, ~4.5x at 18m, ~7.5x at 28m
    return 1 + minute * 0.12 + Math.pow(minute / 8, 1.4) * 0.25;
  }

  public getSpeedMultiplier(): number {
    const minute = this.gameTime / 60;
    return Math.min(1.35, 1 + minute * 0.012);
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    onPlayerDamage: (damage: number, isImmortalHit?: boolean) => void,
    obstacleManager?: ObstacleManager,
    allTargets?: PlayerTargetInfo[],
    onRemoteDamage?: (targetId: string, damage: number, isImmortalHit?: boolean) => void,
    partnerPos?: THREE.Vector3,
    onPartnerDamage?: (damage: number, isImmortalHit?: boolean) => void,
    isPartnerAlive: boolean = true
  ) {
    this.gameTime += dt;
    this.spawnTimer += dt;

    // 1. Spawning Boss every 5 minutes (minute 5, 10, 15, 20, 25)
    const currentMinute = Math.floor(this.gameTime / 60);
    if (
      currentMinute >= 5 &&
      currentMinute < 30 &&
      currentMinute % 5 === 0 &&
      currentMinute > this.lastBossMinute
    ) {
      this.lastBossMinute = currentMinute;
      const tier = Math.floor(currentMinute / 5);
      this.spawnTieredBoss(playerPos, tier);
    }

    // 2. Minute 30 (1800s) Immortal Boss Trigger!
    if (this.gameTime >= 1800 && !this.immortalBossSpawned) {
      this.immortalBossSpawned = true;
      this.spawnImmortalBoss(playerPos);
    }

    // Dynamic spawn interval (gets faster over time, down to 0.18s per wave)
    const currentInterval = Math.max(0.18, this.spawnInterval - (this.gameTime / 240) * 0.75);

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

    // Soft separation
    this.applySeparation();

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

      enemy.updateSimulation(dt, closestTargetPos);

      // Slide around terrain obstacles (cacti, trees, boulders, altars) for nearby grounded enemies
      if (obstacleManager && enemy.type !== 'ghost' && closestDistSq <= 32 * 32) {
        const rad = (enemy.width + enemy.height) * 0.16;
        obstacleManager.resolveEntityCollision(enemy.position, rad, 1);
      }

      // Check collision with targeted player
      const collisionRadius = (enemy.width + enemy.height) * 0.25 + 0.5;
      if (closestDistSq < collisionRadius * collisionRadius) {
        const now = performance.now();
        const lastHit = this.lastTargetHitTimes.get(closestTargetId) || 0;
        if (now - lastHit > 380) {
          this.lastTargetHitTimes.set(closestTargetId, now);
          if (enemy.isBoss) {
            enemy.triggerAttack();
          }
          if (closestTargetId === 'p1') {
            onPlayerDamage(enemy.damage, enemy.isImmortal);
          } else if (onRemoteDamage) {
            onRemoteDamage(closestTargetId, enemy.damage, enemy.isImmortal);
          } else if (onPartnerDamage) {
            onPartnerDamage(enemy.damage, enemy.isImmortal);
          }
          SoundManager.playPlayerHurt();
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
            // Boss drops red gems scaling with boss tier
            const tier = Math.max(1, Math.floor(this.gameTime / 300));
            const gemCount = 5 + tier * 2;
            for (let g = 0; g < gemCount; g++) {
              const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 3.5,
                0,
                (Math.random() - 0.5) * 3.5
              );
              this.dropManager.spawnGem(enemy.position.clone().add(offset), 'red');
            }
            if (this.onBossDefeat) this.onBossDefeat();
          }

          // Switch activeBoss to another alive boss if one exists
          const nextBoss = this.enemies.find((e) => e.isBoss && e.isAlive && e !== enemy);
          this.activeBoss = nextBoss || null;
        } else {
          this.dropManager.spawnGem(enemy.position, enemy.gemType);
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
  public spawnTieredBoss(playerPos: THREE.Vector3, tier: number = 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 16;
    const spawnPos = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * distance,
      0,
      playerPos.z + Math.sin(angle) * distance
    );

    const baseHp = this.configs.boss.hp; // 3800
    const baseDmg = this.configs.boss.damage; // 45
    const baseSpd = this.configs.boss.speed; // 2.4

    // Tier 1 (5m): 3,800 HP, 45 dmg (Кровавый демон)
    // Tier 2 (10m): 14,000 HP, 65 dmg (Древняя трехглавая гидра)
    // Tier 3 (15m): ~25,000 HP, 105 dmg
    // Tier 4 (20m): ~42,000 HP, 145 dmg
    // Tier 5 (25m): ~65,000 HP, 190 dmg
    let bossConfig: EnemyConfig;
    if (tier === 2) {
      bossConfig = {
        ...this.configs.hydra,
        name: 'Древняя трехглавая гидра',
        hp: 14000,
        damage: 65,
        speed: 2.3
      };
    } else {
      const tierHp = Math.round(baseHp * (1 + (tier - 1) * 2.2 + Math.pow(tier - 1, 1.6) * 1.0));
      const tierDmg = Math.round(baseDmg * (1 + (tier - 1) * 0.6 + Math.pow(tier - 1, 1.3) * 0.2));
      const tierSpd = Number((baseSpd + (tier - 1) * 0.18).toFixed(2));

      bossConfig = {
        ...this.configs.boss,
        name: `Кровавый демон (Ур. ${tier})`,
        hp: tierHp,
        damage: tierDmg,
        speed: tierSpd
      };
    }

    const boss = new Enemy(bossConfig, spawnPos);
    this.enemies.push(boss);
    this.scene.add(boss.mesh);
    this.activeBoss = boss;
    this.bossSpawned = true;

    if (this.onBossSpawn) {
      this.onBossSpawn(boss, tier);
    }
  }

  /**
   * Spawns the inevitable 30-minute Immortal Boss (Death / Grim Reaper)
   */
  public spawnImmortalBoss(playerPos: THREE.Vector3) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 18;
    const spawnPos = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * distance,
      0,
      playerPos.z + Math.sin(angle) * distance
    );

    const reaperConfig: EnemyConfig = {
      type: 'boss',
      name: 'Бессмертный Жнец Прерии',
      texturePrefix: '/textures/boss_sheriff',
      hp: 99999999,
      speed: 7.6,
      damage: 99999,
      width: 5.6,
      height: 5.2,
      gemType: 'red',
      isBoss: true,
      isImmortal: true
    };

    const reaper = new Enemy(reaperConfig, spawnPos);
    this.enemies.push(reaper);
    this.scene.add(reaper.mesh);
    this.activeBoss = reaper;
    this.immortalBossSpawned = true;

    if (this.onImmortalBossSpawn) {
      this.onImmortalBossSpawn(reaper);
    }
  }

  private spawnWave(playerPos: THREE.Vector3) {
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
      // 4 - 5 min: Charging Bisons, Brutes, Scorpions
      const r = Math.random();
      if (r < 0.35) types = ['bison'];
      else if (r < 0.7) types = ['brute', 'scorpion'];
      else types = ['ghost', 'crawler'];
    } else if (time < 600) {
      // 5 - 10 min: Heavy frontline (Bisons, Brutes) with flankers
      const r = Math.random();
      if (r < 0.4) types = ['bison', 'brute'];
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
    } else {
      // 25 - 30 min: Desert Apocalypse! Non-stop stampedes of Bisons & Brutes
      const r = Math.random();
      if (r < 0.6) types = ['bison', 'brute'];
      else if (r < 0.85) types = ['ghost', 'scorpion'];
      else types = ['skeleton', 'coyote', 'crawler'];
    }

    // Cap maximum active enemies to prevent frame drops in long runs (scales with player count)
    const baseCap = 95 + Math.floor(time / 60) * 2;
    const maxEnemies = Math.min(190, baseCap + (this.activePlayerCount - 1) * 22);
    if (this.enemies.length >= maxEnemies) return;

    // Number of monsters spawned per wave scales with time and player count
    let count = 1;
    if (time > 1200) count = 5;      // 20+ min
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

  private spawnSingleEnemy(type: EnemyType, playerPos: THREE.Vector3) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 18 + Math.random() * 5;
    const spawnPos = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * distance,
      0,
      playerPos.z + Math.sin(angle) * distance
    );

    // Dynamic progressive scaling for regular monsters
    const baseConfig = this.configs[type];
    const hpMult = this.getHpMultiplier();
    const dmgMult = this.getDamageMultiplier();
    const spdMult = this.getSpeedMultiplier();

    const scaledConfig: EnemyConfig = {
      ...baseConfig,
      hp: Math.max(1, Math.round(baseConfig.hp * hpMult)),
      damage: Math.max(1, Math.round(baseConfig.damage * dmgMult)),
      speed: Number((baseConfig.speed * spdMult).toFixed(2))
    };

    const enemy = new Enemy(scaledConfig, spawnPos);
    this.enemies.push(enemy);
    this.scene.add(enemy.mesh);
  }

  private applySeparation() {
    const len = this.enemies.length;
    for (let i = 0; i < len; i++) {
      const e1 = this.enemies[i];
      if (e1.type === 'ghost') continue;
      const p1 = e1.position;

      for (let j = i + 1; j < len; j++) {
        const e2 = this.enemies[j];
        if (e2.type === 'ghost') continue;

        const minDist = (e1.width + e2.width) * 0.32;
        const dx = p1.x - e2.position.x;
        if (Math.abs(dx) > minDist) continue;
        const dz = p1.z - e2.position.z;
        if (Math.abs(dz) > minDist) continue;

        const distSq = dx * dx + dz * dz;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5;
          const pushX = (dx / dist) * overlap;
          const pushZ = (dz / dist) * overlap;
          p1.x += pushX;
          p1.z += pushZ;
          e2.position.x -= pushX;
          e2.position.z -= pushZ;
        }
      }
    }
  }

  public damageEnemy(
    enemy: Enemy,
    amount: number,
    sourcePos?: THREE.Vector3,
    camera?: THREE.Camera,
    hitter: string = 'p1',
    showDamageNumber: boolean = true
  ) {
    const isDead = enemy.takeDamage(amount, sourcePos, hitter);
    if (showDamageNumber && camera) {
      this.damageNumbers.spawnDamage(enemy.position, amount, amount > 28, camera);
    }
    SoundManager.playHit();
    return isDead;
  }

  public killAll(camera?: THREE.Camera) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.isImmortal) continue; // Immortal Reaper cannot be wiped
      this.damageEnemy(enemy, 99999, undefined, camera);
    }
  }

  public spawnSpecificEnemy(type: EnemyType | 'reaper', playerPos: THREE.Vector3) {
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

  public spawnBossNow(playerPos: THREE.Vector3) {
    const currentTier = Math.max(1, Math.floor(this.gameTime / 300) || 1);
    this.spawnTieredBoss(playerPos, currentTier);
  }

  public spawnHydraNow(playerPos: THREE.Vector3) {
    this.spawnTieredBoss(playerPos, 2);
  }

  public spawnImmortalBossNow(playerPos: THREE.Vector3) {
    this.spawnImmortalBoss(playerPos);
  }

  public setGameTime(seconds: number) {
    this.gameTime = Math.max(0, seconds);
    const minute = Math.floor(this.gameTime / 60);
    this.lastBossMinute = Math.floor(minute / 5) * 5;
    if (minute % 5 === 0 && seconds % 60 < 2) {
      this.lastBossMinute = Math.max(0, this.lastBossMinute - 5);
    }
    if (this.gameTime < 1800) {
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
          config.name = 'Бессмертный Жнец Прерии';
          config.width = 5.6;
          config.height = 5.2;
          config.damage = 99999;
          config.speed = 7.6;
        }
        enemy = new Enemy(config, new THREE.Vector3(s.x, 0, s.z));
        enemy.id = s.id;
        this.enemies.push(enemy);
        this.scene.add(enemy.mesh);
        if (enemy.isBoss) {
          this.activeBoss = enemy;
        }
      }
      // Lerp position towards snapshot
      enemy.position.x += (s.x - enemy.position.x) * 0.4;
      enemy.position.z += (s.z - enemy.position.z) * 0.4;
      enemy.mesh.position.set(enemy.position.x, 0, enemy.position.z);
      enemy.hp = s.hp;
      enemy.maxHp = s.maxHp;
      if (s.dir !== enemy.currentDir) {
        enemy.setDirection(s.dir);
      }
    }

    // Cleanup dead/despawned
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!seenIds.has(this.enemies[i].id)) {
        this.enemies[i].destroy(this.scene);
        this.enemies.splice(i, 1);
      }
    }
  }

  public applyRemoteDamage(
    enemyId: string,
    amount: number,
    sourcePos?: THREE.Vector3,
    camera?: THREE.Camera,
    hitter: string = 'client',
    showDamageNumber: boolean = false
  ) {
    const enemy = this.enemies.find((e) => e.id === enemyId);
    if (enemy && enemy.isAlive) {
      return this.damageEnemy(enemy, amount, sourcePos, camera, hitter, showDamageNumber);
    }
    return false;
  }

  private tempSphere = new THREE.Sphere();

  /**
   * Rendering phase: Viewport/Frustum culling across all active enemies.
   * Enemies outside the camera frustum are culled (mesh.visible = false, zero draw calls).
   */
  public updateVisuals(dt: number, frustum: THREE.Frustum) {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (!enemy.isAlive) {
        enemy.mesh.visible = false;
        continue;
      }
      this.tempSphere.center.set(enemy.position.x, enemy.height * 0.5, enemy.position.z);
      this.tempSphere.radius = enemy.boundingRadius;
      const inFrustum = frustum.intersectsSphere(this.tempSphere);
      enemy.updateVisuals(dt, inFrustum);
    }
  }

  public clear() {
    for (const enemy of this.enemies) {
      enemy.destroy(this.scene);
    }
    this.enemies = [];
    this.totalKills = 0;
    this.spawnTimer = 0;
    this.gameTime = 0;
    this.activeBoss = null;
    this.bossSpawned = false;
    this.lastBossMinute = 0;
    this.immortalBossSpawned = false;
    this.lastTargetHitTimes.clear();
  }
}
