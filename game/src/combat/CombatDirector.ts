import { Vector3, Frustum } from 'three';
import { Projectile } from './Projectile';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { EnemyManager } from '../entities/EnemyManager';
import { Engine } from '../core/Engine';
import { DamageNumberManager } from './DamageNumberManager';
import { NetworkManager, NetShotInfo, DamageDealtEvent } from '../net/NetworkManager';
import { RemotePlayer } from '../entities/RemotePlayer';
import { SoundManager } from '../core/SoundManager';

export class CombatDirector {
  private engine: Engine;
  private player: Player;
  private enemyManager: EnemyManager;
  private damageNumbers: DamageNumberManager;
  private net: NetworkManager;
  private remotePlayers: Map<string, RemotePlayer>;

  public projectiles: Projectile[] = [];
  public pendingClientHits: DamageDealtEvent[] = [];
  public pendingLocalShots: NetShotInfo[] = [];
  public recentlyDeadEnemyIds: Set<string> = new Set();
  private scratchNearbyEnemies: Enemy[] = [];

  constructor(
    engine: Engine,
    player: Player,
    enemyManager: EnemyManager,
    damageNumbers: DamageNumberManager,
    net: NetworkManager,
    remotePlayers: Map<string, RemotePlayer>
  ) {
    this.engine = engine;
    this.player = player;
    this.enemyManager = enemyManager;
    this.damageNumbers = damageNumbers;
    this.net = net;
    this.remotePlayers = remotePlayers;
  }

  public spawnCosmeticShot(shot: NetShotInfo): void {
    const proj = new Projectile({
      position: new Vector3(shot.x, shot.y, shot.z),
      direction: new Vector3(shot.dx, shot.dy ?? 0, shot.dz),
      speed: shot.spd,
      damage: 0,
      pierce: 9999,
      lifetime: shot.orb ? 999999 : (shot.lt || 2.5),
      radius: shot.rad,
      color: shot.col,
      isMagic: shot.mag,
      isOrbiting: shot.orb,
      isArrow: shot.arr,
      isKukri: shot.kkr,
      isLightning: shot.ltg,
      isIceSpike: shot.ice,
      isFireball: shot.fb,
      orbitRadius: shot.orad,
      orbitSpeed: shot.ospd,
      isCosmetic: true,
      ownerId: shot.ownerId
    });
    this.spawnProjectile(proj);
    if (!shot.orb) {
      if (shot.ltg) {
        SoundManager.playLightning();
      } else if (shot.ice) {
        SoundManager.playIceSpike();
      } else if (shot.fb) {
        SoundManager.playFireballLaunch();
      } else if (shot.arr) {
        SoundManager.playBowShoot();
      } else if (shot.kkr) {
        SoundManager.playSlash();
      } else {
        SoundManager.playShoot();
      }
    }
  }

  public spawnProjectile = (proj: Projectile): void => {
    this.projectiles.push(proj);
    this.engine.scene.add(proj.mesh);

    if (this.player.isCoop && !proj.isCosmetic) {
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      this.pendingLocalShots.push({
        x: proj.position.x,
        y: proj.position.y,
        z: proj.position.z,
        dx: proj.direction.x,
        dy: proj.direction.y,
        dz: proj.direction.z,
        spd: proj.speed,
        lt: proj.lifetime,
        rad: proj.radius,
        col: proj.color ?? 0xf59e0b,
        mag: proj.isMagic,
        orb: proj.isOrbiting,
        orad: proj.orbitRadius,
        ospd: proj.orbitSpeed,
        arr: proj.isArrow,
        kkr: proj.isKukri,
        ltg: proj.isLightning,
        ice: proj.isIceSpike,
        fb: proj.isFireball,
        ownerId: myId
      });
    }
  };

  public applyCombatProcOnEnemyHit(
    enemy: Enemy,
    baseDamage: number,
    _sourcePos?: Vector3
  ): { finalDamage: number; isCrit: boolean } {
    let finalDamage = baseDamage;
    let isCrit = false;

    // Item Proc: Crit Visor (Uncommon)
    if (Math.random() < this.player.critChance) {
      finalDamage = Math.round(finalDamage * 2.0);
      isCrit = true;
      SoundManager.playCrit();
    }

    // Item Proc: Pulse Rounds (Common) - chance to inflict extra bleed over 3 sec (180% damage)
    const pulseStacks = this.player.getItemStacks('pulse_rounds');
    if (pulseStacks > 0 && Math.random() < Math.min(0.8, pulseStacks * 0.15)) {
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      const bleedDps = (finalDamage * 1.8) / 3.0;
      enemy.addBleed(bleedDps, 3.0, myId);
      isCrit = true;
    }

    // Item Proc: Chain Lightning Coil (Uncommon)
    const chainStacks = this.player.getItemStacks('chain_lightning');
    if (chainStacks > 0 && Math.random() < 0.25) {
      const maxTargets = 2 + chainStacks;
      const chainDmg = Math.round(finalDamage * (1.2 + chainStacks * 0.3));
      let hitCount = 0;
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      const nearby = this.enemyManager.getNearbyEnemies(enemy.position.x, enemy.position.z, 8.5, this.scratchNearbyEnemies);
      for (const other of nearby) {
        if (other.isAlive && other !== enemy && other.position.distanceTo(enemy.position) <= 8.5) {
          if (this.net.role === 'client') {
            const isChainDead = other.takeDamage(chainDmg, enemy.position, myId);
            this.damageNumbers.spawnDamage(other.position, chainDmg, false, this.engine.camera);
            if (isChainDead) {
              this.player.kills++;
              this.recentlyDeadEnemyIds.add(other.id);
              this.onLocalPlayerEnemyKill(other);
              other.destroy(this.engine.scene);
              const oIdx = this.enemyManager.enemies.indexOf(other);
              if (oIdx !== -1) this.enemyManager.enemies.splice(oIdx, 1);
            }
            this.pendingClientHits.push({
              enemyId: other.id,
              damage: chainDmg,
              sourceX: enemy.position.x,
              sourceZ: enemy.position.z,
              isFatal: isChainDead
            });
          } else {
            this.enemyManager.damageEnemy(other, chainDmg, enemy.position, this.engine.camera, myId);
          }
          hitCount++;
          if (hitCount >= maxTargets) break;
        }
      }
      if (hitCount > 0) {
        SoundManager.playChainLightning();
      }
    }

    return { finalDamage, isCrit };
  }

  public onLocalPlayerEnemyKill(enemy?: Enemy): void {
    // Item Proc: Bio-Leech (+5 HP per stack)
    const leechStacks = this.player.getItemStacks('bio_leech');
    if (leechStacks > 0) {
      this.player.heal(leechStacks * 5);
    }

    // Item Proc: Singularity Core (Legendary: every 10 kills [-2/stack, min 3] creates black hole pull & 600% [+200%/stack] explosion)
    const singularityStacks = this.player.getItemStacks('singularity_core');
    if (singularityStacks > 0 && enemy && enemy.position) {
      this.player.singularityKillCounter++;
      const reqKills = Math.max(3, 10 - (singularityStacks - 1) * 2);
      if (this.player.singularityKillCounter >= reqKills) {
        this.player.singularityKillCounter = 0;
        const centerPos = enemy.position.clone();
        const pullRadius = 7.5;
        const baseDmg = 25 * this.player.damageMultiplier;
        const singularityDmg = Math.round(baseDmg * (6.0 + (singularityStacks - 1) * 2.0));
        const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
        const nearby = this.enemyManager.getNearbyEnemies(centerPos.x, centerPos.z, pullRadius, this.scratchNearbyEnemies);

        SoundManager.playTeleporterActivate();
        for (const other of nearby) {
          if (other.isAlive) {
            const pullDir = new Vector3().subVectors(centerPos, other.position);
            const dist = pullDir.length();
            if (dist > 0.1) {
              other.position.addScaledVector(pullDir.normalize(), Math.min(dist, 3.2));
            }
            if (this.net.role === 'client') {
              const isDead = other.takeDamage(singularityDmg, centerPos, myId);
              this.damageNumbers.spawnDamage(other.position, singularityDmg, true, this.engine.camera);
              if (isDead) {
                this.recentlyDeadEnemyIds.add(other.id);
                other.destroy(this.engine.scene);
                const idx = this.enemyManager.enemies.indexOf(other);
                if (idx !== -1) this.enemyManager.enemies.splice(idx, 1);
              }
              this.pendingClientHits.push({
                enemyId: other.id,
                damage: singularityDmg,
                sourceX: centerPos.x,
                sourceZ: centerPos.z,
                isFatal: isDead
              });
            } else {
              this.enemyManager.damageEnemy(other, singularityDmg, centerPos, this.engine.camera, myId);
            }
          }
        }
      }
    }

    // Item Proc: Plasma Detonator (AOE explosion on kill)
    const detonatorStacks = this.player.getItemStacks('plasma_detonator');
    if (detonatorStacks > 0 && enemy && enemy.position) {
      SoundManager.playShoot();
      const radius = 4.0 + detonatorStacks * 1.0;
      const baseDmg = 25 * this.player.damageMultiplier;
      const explosionDmg = Math.round(baseDmg * (2.0 + detonatorStacks * 0.5));
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      const nearby = this.enemyManager.getNearbyEnemies(enemy.position.x, enemy.position.z, radius, this.scratchNearbyEnemies);

      for (const other of nearby) {
        if (other.isAlive && other !== enemy && other.position.distanceTo(enemy.position) <= radius) {
          if (this.net.role === 'client') {
            const isDead = other.takeDamage(explosionDmg, enemy.position, myId);
            this.damageNumbers.spawnDamage(other.position, explosionDmg, true, this.engine.camera);
            if (isDead) {
              this.recentlyDeadEnemyIds.add(other.id);
              other.destroy(this.engine.scene);
              const idx = this.enemyManager.enemies.indexOf(other);
              if (idx !== -1) this.enemyManager.enemies.splice(idx, 1);
            }
            this.pendingClientHits.push({
              enemyId: other.id,
              damage: explosionDmg,
              sourceX: enemy.position.x,
              sourceZ: enemy.position.z,
              isFatal: isDead
            });
          } else {
            this.enemyManager.damageEnemy(other, explosionDmg, enemy.position, this.engine.camera, myId);
          }
        }
      }
    }
  }

  public updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      let centerPos = this.player.position;
      if (proj.ownerId && proj.ownerId !== this.net.mySlotId) {
        const rp = this.remotePlayers.get(proj.ownerId);
        if (rp) centerPos = rp.position;
      }
      proj.update(dt, centerPos);

      if (!proj.isAlive) {
        proj.destroy(this.engine.scene);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (proj.isCosmetic || proj.damage === 0) {
        continue;
      }

      if (proj.isFireball && !proj.hasImpacted) {
        continue;
      }

      const nearbyEnemies = this.enemyManager.getNearbyEnemies(
        proj.position.x,
        proj.position.z,
        proj.radius + 2.5,
        this.scratchNearbyEnemies
      );
      for (const enemy of nearbyEnemies) {
        if (!enemy.isAlive) continue;
        if (proj.hitEnemies.has(enemy.id)) continue;

        const hitDist = proj.radius + (enemy.width + enemy.height) * 0.22;
        const dx = proj.position.x - enemy.position.x;
        if (Math.abs(dx) > hitDist) continue;
        const dz = proj.position.z - enemy.position.z;
        if (Math.abs(dz) > hitDist) continue;

        if (dx * dx + dz * dz <= hitDist * hitDist) {
          proj.hitEnemies.add(enemy.id);
          const baseDmg = proj.damage * this.player.damageMultiplier;
          const { finalDamage, isCrit } = this.applyCombatProcOnEnemyHit(enemy, baseDmg, proj.position);
          const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');

          if (proj.isOrbiting) {
            const bleedDps = (proj.bleedDps || 8) * this.player.damageMultiplier;
            enemy.addBleed(bleedDps, 3.0, myId);
          }

          if (this.net.role === 'client') {
            const isDead = enemy.takeDamage(finalDamage, proj.position, myId);
            this.damageNumbers.spawnDamage(enemy.position, finalDamage, isCrit || finalDamage > 28, this.engine.camera);
            SoundManager.playHit();
            this.player.totalDamageDealt += finalDamage;

            if (isDead) {
              this.player.kills++;
              this.recentlyDeadEnemyIds.add(enemy.id);
              this.onLocalPlayerEnemyKill(enemy);
              enemy.destroy(this.engine.scene);
              const idx = this.enemyManager.enemies.indexOf(enemy);
              if (idx !== -1) {
                this.enemyManager.enemies.splice(idx, 1);
              }
            }

            this.pendingClientHits.push({
              enemyId: enemy.id,
              damage: finalDamage,
              sourceX: proj.position.x,
              sourceZ: proj.position.z,
              isFatal: isDead
            });
          } else {
            this.player.totalDamageDealt += finalDamage;
            this.enemyManager.damageEnemy(enemy, finalDamage, proj.position, this.engine.camera, myId);
          }

          const destroyed = proj.onHit();
          if (destroyed) {
            proj.destroy(this.engine.scene);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  public updateProjectileVisuals(frustum: Frustum): void {
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (p.isOrbiting) {
        p.mesh.visible = true;
        continue;
      }
      p.mesh.visible = frustum.containsPoint(p.position);
    }
  }

  public updateItemProcs(dt: number): void {
    // Item Proc: Orbital Strike (Legendary: every 12s [-2s/stack, min 4s], satellite beam fires at highest HP enemy for 800% base damage)
    const orbitalStacks = this.player.getItemStacks('orbital_strike');
    if (orbitalStacks > 0 && this.player.isAlive && !this.player.isDowned) {
      this.player.orbitalStrikeTimer -= dt;
      const orbitalCooldown = Math.max(4.0, 12.0 - (orbitalStacks - 1) * 2.0);
      if (this.player.orbitalStrikeTimer <= 0) {
        this.player.orbitalStrikeTimer = orbitalCooldown;

        let highestHpEnemy: Enemy | null = null;
        let maxHpVal = -1;
        const playerPos = this.player.position;
        for (const enemy of this.enemyManager.enemies) {
          if (enemy.isAlive && enemy.position.distanceTo(playerPos) <= 30) {
            if (enemy.hp > maxHpVal) {
              maxHpVal = enemy.hp;
              highestHpEnemy = enemy;
            }
          }
        }

        if (highestHpEnemy) {
          const baseDmg = 25 * this.player.damageMultiplier;
          const strikeDmg = Math.round(baseDmg * 8.0);
          const strikePos = highestHpEnemy.position.clone();
          const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');

          SoundManager.playLightning();

          const beamProj = new Projectile({
            position: new Vector3(strikePos.x, 0, strikePos.z),
            direction: new Vector3(0, 0, 1),
            speed: 0,
            damage: strikeDmg,
            pierce: 999,
            lifetime: 0.35,
            radius: 3.0,
            color: 0xef4444,
            isLightning: true
          });
          this.spawnProjectile(beamProj);

          const blastRadius = 3.0;
          const blastEnemies = this.enemyManager.getNearbyEnemies(strikePos.x, strikePos.z, blastRadius, this.scratchNearbyEnemies);
          for (const target of blastEnemies) {
            if (target.isAlive) {
              if (this.net.role === 'client') {
                const isDead = target.takeDamage(strikeDmg, strikePos, myId);
                this.damageNumbers.spawnDamage(target.position, strikeDmg, true, this.engine.camera);
                this.player.totalDamageDealt += strikeDmg;
                if (isDead) {
                  this.player.kills++;
                  this.recentlyDeadEnemyIds.add(target.id);
                  this.onLocalPlayerEnemyKill(target);
                  target.destroy(this.engine.scene);
                  const idx = this.enemyManager.enemies.indexOf(target);
                  if (idx !== -1) this.enemyManager.enemies.splice(idx, 1);
                }
                this.pendingClientHits.push({
                  enemyId: target.id,
                  damage: strikeDmg,
                  sourceX: strikePos.x,
                  sourceZ: strikePos.z,
                  isFatal: isDead
                });
              } else {
                this.player.totalDamageDealt += strikeDmg;
                this.enemyManager.damageEnemy(target, strikeDmg, strikePos, this.engine.camera, myId);
              }
            }
          }
        }
      }
    }
  }

  public clear(): void {
    for (const p of this.projectiles) {
      p.destroy(this.engine.scene);
    }
    this.projectiles = [];
    this.pendingClientHits = [];
    this.pendingLocalShots = [];
    this.recentlyDeadEnemyIds.clear();
  }
}

