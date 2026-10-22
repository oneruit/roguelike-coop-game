import { type Scene, Vector3, type Camera } from 'three';
import { MobNest, DroppedAstralCore } from './MobNest';
import type { SeededRNG } from '../core/SeededRNG';
import type { Player } from '../entities/Player';
import type { RemotePlayer } from '../entities/RemotePlayer';
import type { EnemyManager } from '../entities/EnemyManager';
import type { DamageNumberManager } from '../combat/DamageNumberManager';
import type { RiftTeleporter } from './RiftTeleporter';
import { SoundManager } from '../core/SoundManager';
import { SulfurSmokeManager } from '../vfx/SulfurSmokeVfx';

export interface OccupiedArea {
  x: number;
  z: number;
  radius: number;
}

export class MobNestManager {
  private scene: Scene;
  public nests: MobNest[] = [];
  public droppedCores: DroppedAstralCore[] = [];
  public deliveredCount: number = 0;
  public riftTeleporter?: RiftTeleporter;
  public isDeclarative = false;

  private lightningTimer: number = 0;

  // Event Callbacks
  public onNestExploded?: (nest: MobNest, destroyedCount: number, totalCount: number) => void;
  public onCoreExtracted?: (generator: MobNest, remaining: number) => void;
  public onCoreDropped?: (pos: Vector3) => void;
  public onCorePickedUp?: () => void;
  public onCoreDelivered?: (delivered: number, total: number) => void;
  public onAllCoresDelivered?: () => void;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public setDeclarative(declarative: boolean): void {
    if (this.isDeclarative === declarative) return;
    this.isDeclarative = declarative;
    for (const nest of this.nests) {
      if (declarative) {
        this.scene.remove(nest.mesh);
      } else {
        this.scene.add(nest.mesh);
      }
    }
    for (const core of this.droppedCores) {
      if (declarative) {
        this.scene.remove(core.mesh);
      } else {
        this.scene.add(core.mesh);
      }
    }
  }

  /**
   * Generates exactly 4 astral generators on Stage 4 in four quadrant bases.
   */
  public generateStageNests(
    stageNumber: number,
    rng: SeededRNG,
    occupied: OccupiedArea[],
    getElevation?: (x: number, z: number) => number
  ): OccupiedArea[] {
    this.clear();

    if (stageNumber !== 4) {
      return [];
    }

    const placedAreas: OccupiedArea[] = [];

    // 4 designated quadrant coordinates around the caldera (NW, NE, SW, SE)
    const basePositions = [
      { x: -85, z: -85 }, // NW
      { x: 85, z: -85 },  // NE
      { x: -85, z: 85 },  // SW
      { x: 85, z: 85 }    // SE
    ];

    basePositions.forEach((base, index) => {
      // Deterministic slight jitter (+-8m) while keeping clear from center
      const jitterX = rng.range(-8, 8);
      const jitterZ = rng.range(-8, 8);
      const nx = base.x + jitterX;
      const nz = base.z + jitterZ;
      const ny = getElevation ? getElevation(nx, nz) : 0;

      const nest = new MobNest(`nest_${index + 1}`, new Vector3(nx, ny, nz));
      this.nests.push(nest);

      if (!this.isDeclarative) {
        this.scene.add(nest.mesh);
      }

      const area: OccupiedArea = { x: nx, z: nz, radius: 7.0 };
      occupied.push(area);
      placedAreas.push(area);
    });

    return placedAreas;
  }

  /**
   * Spawns a dropped Astral Core in 3D world (e.g. when player dashes or is downed).
   */
  public spawnDroppedCore(pos: Vector3): DroppedAstralCore {
    const core = new DroppedAstralCore(`core_${Date.now()}_${Math.floor(Math.random() * 1000)}`, pos);
    if (!this.isDeclarative) {
      this.scene.add(core.mesh);
    }
    this.droppedCores.push(core);
    this.onCoreDropped?.(pos);
    return core;
  }

  public update(
    dt: number,
    player: Player,
    remotePlayers: Map<string, RemotePlayer>,
    isInteractHeld: boolean,
    enemyManager: EnemyManager,
    damageNumbers?: DamageNumberManager,
    camera?: Camera
  ): void {
    if (this.nests.length === 0 && this.droppedCores.length === 0) return;

    // 1. Core Carrier Perk: Periodic chain lightning discharges hitting nearby monsters
    if (player.hasAstralCore && player.isAlive && !player.isDowned) {
      this.lightningTimer += dt;
      if (this.lightningTimer >= 1.5) {
        this.lightningTimer = 0;
        const zapRadius = 12.0;
        const nearbyEnemies = enemyManager.enemies
          .filter(e => e.isAlive && e.position.distanceTo(player.position) <= zapRadius)
          .sort((a, b) => a.position.distanceTo(player.position) - b.position.distanceTo(player.position))
          .slice(0, 3);

        if (nearbyEnemies.length > 0) {
          SoundManager.playChainLightning?.();
          for (const enemy of nearbyEnemies) {
            enemy.takeDamage(75, player.position, 'p1', 'chain_lightning');
            damageNumbers?.spawnDamage(enemy.position, 75, false, camera);
          }
        }
      }
    }

    // 2. Delivery to Central Rift Teleporter
    if (player.hasAstralCore && this.riftTeleporter && this.riftTeleporter.isStage4 && player.isAlive && !player.isDowned) {
      const distToTele = player.position.distanceTo(this.riftTeleporter.position);
      if (distToTele <= 5.5) {
        player.hasAstralCore = false;
        this.deliveredCount++;
        this.riftTeleporter.coresDelivered = this.deliveredCount;

        SoundManager.playLightning?.();
        SoundManager.playTeleporterActivate?.();
        SulfurSmokeManager.spawn(this.scene, this.riftTeleporter.position, { size: 10.0, fps: 12 });
        enemyManager.damageEnemiesInRadius(this.riftTeleporter.position, 14.0, 600, camera);

        player.gainXp(250);
        player.credits += 75;
        damageNumbers?.spawnPassiveBuff(player.position, '+250 XP  +75 ⬡', camera);

        if (this.deliveredCount < 4) {
          this.onCoreDelivered?.(this.deliveredCount, 4);
        } else {
          this.onAllCoresDelivered?.();
        }
      }
    }

    // 3. Update & Interaction with Dropped Astral Cores
    for (const core of this.droppedCores) {
      core.update(dt);
    }

    let closestDropped: DroppedAstralCore | null = null;
    let closestDropDist = Infinity;
    for (const core of this.droppedCores) {
      const dist = player.position.distanceTo(core.position);
      if (dist < closestDropDist) {
        closestDropDist = dist;
        closestDropped = core;
      }
    }

    if (closestDropped && closestDropDist <= 3.2 && !player.hasAstralCore) {
      if (isInteractHeld && player.isAlive && !player.isDowned) {
        player.pickupAstralCore();
        closestDropped.dispose(this.scene);
        this.droppedCores = this.droppedCores.filter(c => c !== closestDropped);
        SoundManager.playLevelUp?.();
        this.onCorePickedUp?.();
      }
    }

    // 4. Update & Interaction with Astral Generators (nests)
    let closestNest: MobNest | null = null;
    let closestNestDist = Infinity;

    for (const nest of this.nests) {
      if (nest.state === 'DESTROYED') continue;
      const dist = player.position.distanceTo(nest.position);
      if (dist < closestNestDist) {
        closestNestDist = dist;
        closestNest = nest;
      }
    }

    if (closestNest && closestNestDist <= MobNest.INTERACT_RADIUS) {
      if (closestNest.state === 'IDLE' || closestNest.state === 'PLANTING') {
        if (!player.hasAstralCore && isInteractHeld && player.isAlive && !player.isDowned) {
          closestNest.extractCore(player);
          this.onCoreExtracted?.(closestNest, this.remainingCount);
        }
      }
    }

    // 5. Update all nests
    for (const nest of this.nests) {
      const { justExploded } = nest.update(
        dt,
        this.scene,
        player,
        remotePlayers,
        enemyManager,
        damageNumbers,
        camera
      );

      if (justExploded) {
        if (this.onNestExploded) {
          this.onNestExploded(nest, this.destroyedCount, this.nests.length);
        }
      }
    }
  }

  /**
   * Returns interaction prompt details when the player is near a dropped core, generator, or rift teleporter.
   */
  public getInteraction(playerPos: Vector3, playerHasCore: boolean = false): { canInteract: boolean; prompt: string } {
    // 1. Teleporter Delivery check (Stage 4 only, while portal is waiting for cores)
    if (this.riftTeleporter && this.riftTeleporter.isStage4 && this.riftTeleporter.state === 'IDLE') {
      const dist = playerPos.distanceTo(this.riftTeleporter.position);
      if (dist <= 6.0) {
        if (playerHasCore) {
          return {
            canInteract: true,
            prompt: `[E] Вставить Астральное Ядро в Разлом (${this.deliveredCount + 1}/4)`
          };
        }
        if (this.deliveredCount < 4) {
          return {
            canInteract: false,
            prompt: `⚡ ДОСТАВЬТЕ АСТРАЛЬНЫЕ ЯДРА: ${this.deliveredCount} / 4`
          };
        }
      }
    }

    // 2. Dropped Core check
    for (const core of this.droppedCores) {
      const dist = playerPos.distanceTo(core.position);
      if (dist <= 3.2) {
        if (playerHasCore) {
          return {
            canInteract: false,
            prompt: '⚠️ ВЫ УЖЕ НЕСЕТЕ АСТРАЛЬНОЕ ЯДРО'
          };
        }
        return {
          canInteract: true,
          prompt: '[E] Подобрать Астральное Ядро'
        };
      }
    }

    // 3. Generator check
    for (const nest of this.nests) {
      const dist = playerPos.distanceTo(nest.position);
      if (dist <= MobNest.INTERACT_RADIUS) {
        if (nest.state === 'IDLE' || nest.state === 'CHARGED') {
          if (playerHasCore) {
            return {
              canInteract: false,
              prompt: '⚠️ ВЫ УЖЕ НЕСЕТЕ АСТРАЛЬНОЕ ЯДРО'
            };
          }
          return {
            canInteract: true,
            prompt: '[E] Извлечь Астральное Ядро'
          };
        }
        if (nest.state === 'DESTROYED' || nest.state === 'EXTRACTED') {
          return {
            canInteract: false,
            prompt: '⚙️ ГЕНЕРАТОР [ ОПУСТОШЕН ]'
          };
        }
      }
    }

    return { canInteract: false, prompt: '' };
  }

  public get destroyedCount(): number {
    return Math.max(
      this.deliveredCount,
      this.nests.filter(n => n.state === 'DESTROYED' || n.state === 'EXTRACTED').length
    );
  }

  public get totalCount(): number {
    return this.nests.length;
  }

  public get remainingCount(): number {
    return Math.max(0, this.totalCount - this.destroyedCount);
  }

  public isAllNestsDestroyed(): boolean {
    return this.deliveredCount >= 4 || (this.nests.length > 0 && this.nests.every(n => n.state === 'DESTROYED' || n.state === 'EXTRACTED'));
  }

  public clear(): void {
    for (const nest of this.nests) {
      nest.dispose(this.scene);
    }
    this.nests = [];

    for (const core of this.droppedCores) {
      core.dispose(this.scene);
    }
    this.droppedCores = [];
    this.deliveredCount = 0;
  }
}

export type AstralCoreManager = MobNestManager;
export const AstralCoreManager = MobNestManager;
