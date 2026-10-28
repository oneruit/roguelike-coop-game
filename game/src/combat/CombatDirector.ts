import { InvokerSpellEffects } from './InvokerSpellEffects';
import type { NetEvent } from '../shared/types';
import type { InvokerSpellCast, SpellControl } from '../shared/InvokerSpells';
import { Vector3, Frustum, RingGeometry, PlaneGeometry, Mesh, MeshBasicMaterial, DoubleSide, AdditiveBlending } from 'three';
import { Projectile } from './Projectile';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { EnemyManager } from '../entities/EnemyManager';
import { Engine } from '../core/Engine';
import { DamageNumberManager } from './DamageNumberManager';
import { NetworkManager, NetShotInfo, DamageDealtEvent } from '../net/NetworkManager';
import { RemotePlayer } from '../entities/RemotePlayer';
import { SoundManager } from '../core/SoundManager';
import { ProgressionManager } from '../core/ProgressionManager';
import { MeleeAttackEffects } from './MeleeAttackEffects';
import type { MeleeAttackInfo } from '../shared/types';

export class CombatDirector {
  private engine: Engine;
  private player: Player;
  private enemyManager: EnemyManager;
  private damageNumbers: DamageNumberManager;
  private net: NetworkManager;
  private remotePlayers: Map<string, RemotePlayer>;

  public isPvPMode: boolean = false;
  public onPvPKill?: (targetId: string) => void;
  public projectiles: Projectile[] = [];
  public pendingClientHits: DamageDealtEvent[] = [];
  public pendingLocalShots: NetShotInfo[] = [];
  public pendingSpellControls: NetEvent[] = [];
  public recentlyDeadEnemyIds: Set<string> = new Set();
  private scratchNearbyEnemies: Enemy[] = [];
  private meleeEffects: MeleeAttackEffects;
  private spellEffects: InvokerSpellEffects;
  private chronosShockwaves: {
    mesh: Mesh;
    geometry: RingGeometry;
    material: MeshBasicMaterial;
    age: number;
    maxAge: number;
    maxRadius: number;
  }[] = [];
  private flameTrailPatches: {
    mesh: Mesh;
    geometry: PlaneGeometry;
    material: MeshBasicMaterial;
    position: Vector3;
    radius: number;
    dps: number;
    age: number;
    maxAge: number;
    tickTimer: number;
  }[] = [];

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
    this.meleeEffects = new MeleeAttackEffects(engine.scene);
    this.player.onMeleeAttack = this.spawnMeleeAttack;
    this.spellEffects = new InvokerSpellEffects(
      engine.scene,
      id => {
        const localId = this.net.mySlotId || (this.net.role === 'client' ? 'p2' : 'p1');
        return id === localId
          ? this.player.position
          : this.remotePlayers.get(id)?.position ??
            this.enemyManager.enemies.find(enemy => enemy.id === id && enemy.isAlive)?.position;
      },
      (position, range) => {
        let closest: Enemy | undefined;
        let distance = range * range;
        for (const enemy of this.enemyManager.enemies) {
          if (!enemy.isAlive) continue;
          const dist = (enemy.position.x - position.x) ** 2 + (enemy.position.z - position.z) ** 2;
          if (dist < distance) {
            closest = enemy;
            distance = dist;
          }
        }
        return closest?.position;
      }
    );
    this.player.onSpellCast = this.spawnSpellCast;
    this.player.onSpellControl = this.applySpellControl;
  }

  public spawnSpellCast = (cast: InvokerSpellCast): void => {
    const effect = {
      ...cast,
      y: this.engine.chunkManager.getElevation(cast.x, cast.z),
      targetY: this.engine.chunkManager.getElevation(cast.targetX, cast.targetZ)
    };
    const ownerId = this.net.mySlotId || (this.net.role === 'client' ? 'p2' : 'p1');
    this.spellEffects.play(effect, ownerId);
    if (this.player.isCoop) {
      this.pendingLocalShots.push({
        x: effect.x, y: effect.y, z: effect.z,
        dx: effect.dx, dz: effect.dz, spd: 0, lt: effect.duration,
        rad: effect.radius, col: 0xffffff, ownerId, spell: effect
      });
    }
  };

  public applySpellControl = (enemy: Enemy, control: SpellControl): void => {
    enemy.applySpellControl(control);
    if (this.net.role === 'host' && this.player.isCoop) {
      this.pendingSpellControls.push({
        type: 'spell_control', enemyId: enemy.id, control, killer: this.net.mySlotId || 'p1'
      });
    }
    if (this.net.role === 'client') {
      this.pendingClientHits.push({
        enemyId: enemy.id, damage: 0,
        sourceX: this.player.position.x, sourceZ: this.player.position.z, control
      });
    }
  };

  public spawnMeleeAttack = (attack: MeleeAttackInfo): void => {
    const effect = { ...attack, y: this.engine.chunkManager.getElevation(attack.x, attack.z) };
    this.meleeEffects.play(effect);
    if (this.player.isCoop) {
      this.pendingLocalShots.push({
        x: effect.x, y: effect.y, z: effect.z,
        dx: Math.cos(effect.angle), dz: -Math.sin(effect.angle),
        spd: 0, lt: 0.4, rad: effect.radius, col: 0xffffff,
        melee: effect.weaponId,
        ownerId: this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2')
      });
    }
  };

  public spawnCosmeticShot(shot: NetShotInfo): void {
    if (shot.spell) {
      this.spellEffects.play(shot.spell,shot.ownerId);
      SoundManager.playMagic();
      return;
    }
    if (shot.melee) {
      this.meleeEffects.play({
        weaponId: shot.melee, x: shot.x, y: shot.y, z: shot.z,
        radius: shot.rad, angle: Math.atan2(-shot.dz, shot.dx)
      });
      SoundManager.playSlash();
      return;
    }
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
      isPoisonPuddle: shot.psn,
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
      } else if (shot.psn) {
        SoundManager.playPoisonPuddle();
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
        psn: proj.isPoisonPuddle,
        ownerId: myId
      });
    }
  };

  public applyCombatProcOnEnemyHit(
    enemy: Enemy,
    baseDamage: number,
    _sourcePos?: Vector3,
    customCritChance?: number,
    customCritDamage?: number
  ): { finalDamage: number; isCrit: boolean; critTier: number; critMultiplier: number } {
    let finalDamage = baseDamage;
    let isCrit = false;
    let critTier = 0;
    let critMultiplier = 1.0;

    // Crit chance: clamp to [0, 1.0] (max 100%)
    // Crit damage: clamp to [0, 10.0] (max 1000%)
    const effectiveCritChance = Math.min(1.0, Math.max(0, customCritChance ?? this.player.critChance));
    const effectiveCritDamage = Math.min(10.0, Math.max(0, customCritDamage ?? this.player.critDamage));

    if (effectiveCritChance > 0 && Math.random() < effectiveCritChance) {
      isCrit = true;
      critTier = 1;
      critMultiplier = 1.0 + effectiveCritDamage;
      finalDamage = Math.round(finalDamage * critMultiplier);
      ProgressionManager.getInstance().recordRunCrit(1);
      SoundManager.playCrit();
    }

    // Item Proc: Pulse Rounds (Common) - chance to inflict extra bleed over 3 sec (180% damage)
    const pulseStacks = this.player.getItemStacks('pulse_rounds');
    if (pulseStacks > 0 && Math.random() < Math.min(0.8, pulseStacks * 0.15)) {
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      const bleedDps = (finalDamage * 5.4) / 3.0;
      enemy.addBleed(bleedDps, 3.0, myId);
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

    return { finalDamage, isCrit, critTier, critMultiplier };
  }

  public onLocalPlayerEnemyKill(enemy?: Enemy): void {
    // Item Proc: Bio-Leech (+2 HP and +0.6% max HP per stack)
    const leechStacks = this.player.getItemStacks('bio_leech');
    if (leechStacks > 0) {
      const healAmount = Math.max(1, Math.round(leechStacks * (2 + this.player.maxHp * 0.006)));
      this.player.heal(healAmount);
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
        const baseDmg = 25 * this.player.getDamageMultiplier();
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
      const baseDmg = 25 * this.player.getDamageMultiplier();
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

  public spawnChronosShockwave(center: Vector3): void {
    const geometry = new RingGeometry(0.8, 1.3, 48);
    const material = new MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: DoubleSide,
      blending: AdditiveBlending,
      depthWrite: false
    });
    const mesh = new Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(center.x, 0.15, center.z);
    this.engine.scene.add(mesh);

    this.chronosShockwaves.push({
      mesh,
      geometry,
      material,
      age: 0,
      maxAge: 0.55,
      maxRadius: 25.0
    });
  }

  public spawnFlameTrailPatch(center: Vector3, dps: number): void {
    const radius = 1.35;
    const geometry = new PlaneGeometry(radius * 2, radius * 2);
    const material = new MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      side: DoubleSide,
      blending: AdditiveBlending,
      depthWrite: false
    });
    const mesh = new Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(center.x, 0.06, center.z);
    this.engine.scene.add(mesh);

    this.flameTrailPatches.push({
      mesh,
      geometry,
      material,
      position: center.clone(),
      radius,
      dps,
      age: 0,
      maxAge: 2.8,
      tickTimer: 0
    });
  }

  public updateProjectiles(dt: number): void {
    this.meleeEffects.update(dt);
    this.spellEffects.update(dt);

    for (let i = this.chronosShockwaves.length - 1; i >= 0; i--) {
      const sw = this.chronosShockwaves[i];
      sw.age += dt;
      const progress = Math.min(1.0, sw.age / sw.maxAge);
      const currentScale = 1.0 + (sw.maxRadius - 1.0) * Math.sin(progress * Math.PI * 0.5);
      sw.mesh.scale.set(currentScale, currentScale, 1.0);
      sw.material.opacity = Math.max(0, 0.9 * (1.0 - progress));
      if (sw.age >= sw.maxAge) {
        this.engine.scene.remove(sw.mesh);
        sw.geometry.dispose();
        sw.material.dispose();
        this.chronosShockwaves.splice(i, 1);
      }
    }

    const flameHitter = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
    for (let i = this.flameTrailPatches.length - 1; i >= 0; i--) {
      const patch = this.flameTrailPatches[i];
      patch.age += dt;
      const progress = patch.age / patch.maxAge;
      patch.material.opacity = Math.max(0, 0.85 * (1.0 - progress));
      patch.tickTimer += dt;
      if (patch.tickTimer >= 0.33) {
        patch.tickTimer = 0;
        const tickDmg = Math.max(1, Math.round(patch.dps * 0.33));
        const nearby = this.enemyManager.getNearbyEnemies(
          patch.position.x,
          patch.position.z,
          patch.radius + 1.2,
          this.scratchNearbyEnemies
        );
        for (const target of nearby) {
          if (target.isAlive && target.position.distanceTo(patch.position) <= patch.radius + (target.width + target.height) * 0.22) {
            target.applyBurn(3.0, flameHitter, 'molten_scale');
            if (this.net.role === 'client') {
              const isDead = target.takeDamage(tickDmg, patch.position, flameHitter);
              this.damageNumbers.spawnDamage(target.position, tickDmg, false, this.engine.camera);
              this.player.totalDamageDealt += tickDmg;
              this.player.recordWeaponDamage('molten_scale', tickDmg);
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
                damage: tickDmg,
                sourceX: patch.position.x,
                sourceZ: patch.position.z,
                isFatal: isDead
              });
            } else {
              this.player.totalDamageDealt += tickDmg;
              this.player.recordWeaponDamage('molten_scale', tickDmg);
              this.enemyManager.damageEnemy(target, tickDmg, patch.position, this.engine.camera, flameHitter);
            }
          }
        }
      }

      if (patch.age >= patch.maxAge) {
        this.engine.scene.remove(patch.mesh);
        patch.geometry.dispose();
        patch.material.dispose();
        this.flameTrailPatches.splice(i, 1);
      }
    }
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

      if (this.isPvPMode || this.player.isGladiator) {
        const isLocalProj = !proj.ownerId || proj.ownerId === (this.net.mySlotId || 'p1');
        if (isLocalProj) {
          for (const [rpId, rp] of this.remotePlayers.entries()) {
            if (rp.hp <= 0 || rp.isDowned) continue;
            if (proj.hitEnemies.has(`pvp_${rpId}`)) continue;
            const hitDist = proj.radius + 0.6;
            const dx = proj.position.x - rp.position.x;
            const dz = proj.position.z - rp.position.z;
            if (dx * dx + dz * dz <= hitDist * hitDist) {
              proj.hitEnemies.add(`pvp_${rpId}`);
              const baseDmg = proj.damage * this.player.getDamageMultiplier(proj.sourceWeaponId);
              const isCrit = Math.random() < (proj.critChance ?? this.player.critChance);
              const finalDmg = isCrit ? Math.round(baseDmg * (1.0 + (proj.critDamage ?? this.player.critDamage))) : Math.round(baseDmg);
              const isKilled = rp.takeDamage(finalDmg);
              this.damageNumbers.spawnDamage(rp.position, finalDmg, isCrit, this.engine.camera);
              SoundManager.playHit();
              this.player.totalDamageDealt += finalDmg;
              this.player.recordWeaponDamage(proj.sourceWeaponId, finalDmg);
              if (isKilled) {
                this.onPvPKill?.(rpId);
              }
              proj.pierce--;
              if (proj.pierce <= 0) {
                proj.isAlive = false;
                break;
              }
            }
          }
        } else {
          if (!proj.hitEnemies.has('local_player')) {
            const hitDist = proj.radius + 0.6;
            const dx = proj.position.x - this.player.position.x;
            const dz = proj.position.z - this.player.position.z;
            if (dx * dx + dz * dz <= hitDist * hitDist) {
              proj.hitEnemies.add('local_player');
              const finalDmg = Math.round(proj.damage);
              this.player.takeDamage(finalDmg, false, 'Opponent');
              this.damageNumbers.spawnDamage(this.player.position, finalDmg, false, this.engine.camera);
              proj.pierce--;
              if (proj.pierce <= 0) {
                proj.isAlive = false;
              }
            }
          }
        }
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
          const baseDmg = proj.damage * this.player.getDamageMultiplier(proj.sourceWeaponId);
          const { finalDamage, isCrit, critTier, critMultiplier } = this.applyCombatProcOnEnemyHit(
            enemy,
            baseDmg,
            proj.position,
            proj.critChance,
            proj.critDamage
          );
          const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');

          if (proj.bleedDps && proj.bleedDps > 0) {
            const bleedDps = proj.bleedDps * this.player.getDamageMultiplier(proj.sourceWeaponId);
            enemy.addBleed(bleedDps, 3.0, myId, proj.sourceWeaponId);
          } else if (proj.isOrbiting) {
            const bleedDps = 24 * this.player.getDamageMultiplier(proj.sourceWeaponId);
            enemy.addBleed(bleedDps, 3.0, myId, proj.sourceWeaponId);
          }

          if (proj.isIceSpike) {
            enemy.applySlow(0.60, 2.0);
          }

          if (proj.isFireball) {
            enemy.applyBurn(3.0, myId, proj.sourceWeaponId);
          }

          if (proj.isLightning) {
            enemy.applyShock(5.0);
          }

          if (proj.isKineticBeam) {
            enemy.stun(1.8);
          }

          if (proj.isPoisonPuddle) {
            enemy.applySlow(0.35, 1.0);
          }

          if (this.net.role === 'client') {
            const isDead = enemy.takeDamage(finalDamage, proj.position, myId, proj.sourceWeaponId);
            const displayedDamage = enemy.lastDamageTaken > 0 ? enemy.lastDamageTaken : finalDamage;
            this.damageNumbers.spawnDamage(enemy.position, displayedDamage, isCrit, this.engine.camera, false, critTier, critMultiplier);
            SoundManager.playHit();
            this.player.totalDamageDealt += displayedDamage;
            this.player.recordWeaponDamage(proj.sourceWeaponId, displayedDamage);

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
            this.player.recordWeaponDamage(proj.sourceWeaponId, finalDamage);
            this.enemyManager.damageEnemy(enemy, finalDamage, proj.position, this.engine.camera, myId, true, isCrit, critTier, critMultiplier, proj.sourceWeaponId);
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
          const baseDmg = 25 * this.player.getDamageMultiplier();
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
    // Item Proc: Molten Scale (Boss Item: drops flame trail behind the hero when moving)
    const moltenStacks = this.player.getItemStacks('molten_scale');
    if (moltenStacks > 0 && this.player.isAlive && !this.player.isDowned && this.player.isMoving) {
      this.player.moltenScaleTimer -= dt;
      if (this.player.moltenScaleTimer <= 0) {
        this.player.moltenScaleTimer = 0.28;
        const baseDmg = 25 * this.player.getDamageMultiplier();
        const flameDps = Math.round(baseDmg * (1.2 + (moltenStacks - 1) * 0.48));
        this.spawnFlameTrailPatch(this.player.position, flameDps);
      }
    }

    // Item Proc: Titan Eye / Golem Core (Boss Item: periodic kinetic beam stunning enemies)
    const golemStacks = this.player.getItemStacks('golem_core');
    if (golemStacks > 0 && this.player.isAlive && !this.player.isDowned) {
      this.player.golemCoreTimer -= dt;
      if (this.player.golemCoreTimer <= 0) {
        this.player.golemCoreTimer = 6.0;
        let closestTarget: Enemy | null = null;
        let minDistSq = 25 * 25;
        for (const enemy of this.enemyManager.enemies) {
          if (enemy.isAlive) {
            const dSq = enemy.position.distanceToSquared(this.player.position);
            if (dSq <= minDistSq) {
              minDistSq = dSq;
              closestTarget = enemy;
            }
          }
        }

        if (closestTarget) {
          const baseDmg = 30 * this.player.getDamageMultiplier();
          const beamDmg = Math.round(baseDmg * (4.0 + (golemStacks - 1) * 2.0));
          const shootPos = this.player.position.clone().add(new Vector3(0, 0.5, 0));
          const dir = new Vector3().subVectors(closestTarget.position, this.player.position);
          dir.y = 0;
          if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
          dir.normalize();

          const beamProj = new Projectile({
            position: shootPos,
            direction: dir,
            speed: 36.0,
            damage: beamDmg,
            pierce: 999,
            lifetime: 0.75,
            radius: 1.6,
            color: 0xf59e0b,
            isMagic: true,
            isKineticBeam: true
          });
          this.spawnProjectile(beamProj);
          SoundManager.playShoot();
        }
      }
    }
  }

  public clear(): void {
    this.meleeEffects.clear();
    this.spellEffects.clear();
    for (const p of this.projectiles) {
      p.destroy(this.engine.scene);
    }
    this.projectiles = [];
    for (const sw of this.chronosShockwaves) {
      this.engine.scene.remove(sw.mesh);
      sw.geometry.dispose();
      sw.material.dispose();
    }
    this.chronosShockwaves = [];
    for (const ftp of this.flameTrailPatches) {
      this.engine.scene.remove(ftp.mesh);
      ftp.geometry.dispose();
      ftp.material.dispose();
    }
    this.flameTrailPatches = [];
    this.pendingClientHits = [];
    this.pendingSpellControls = [];
    this.pendingLocalShots = [];
    this.recentlyDeadEnemyIds.clear();
  }
}

