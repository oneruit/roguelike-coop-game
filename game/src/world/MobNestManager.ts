import { type Scene, Vector3, type Camera } from 'three';
import { MobNest } from './MobNest';
import type { SeededRNG } from '../core/SeededRNG';
import type { Player } from '../entities/Player';
import type { RemotePlayer } from '../entities/RemotePlayer';
import type { EnemyManager } from '../entities/EnemyManager';
import type { DamageNumberManager } from '../combat/DamageNumberManager';

export interface OccupiedArea {
  x: number;
  z: number;
  radius: number;
}

export class MobNestManager {
  private scene: Scene;
  public nests: MobNest[] = [];
  public isDeclarative = false;

  public onNestExploded?: (nest: MobNest, destroyedCount: number, totalCount: number) => void;

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
  }

  /**
   * Generates exactly 4 nests on Stage 4 in four quadrant bases.
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

  public update(
    dt: number,
    player: Player,
    remotePlayers: Map<string, RemotePlayer>,
    isInteractHeld: boolean,
    enemyManager: EnemyManager,
    damageNumbers?: DamageNumberManager,
    camera?: Camera
  ): void {
    if (this.nests.length === 0) return;

    // 1. Process holding interaction on closest nest
    let closestNest: MobNest | null = null;
    let closestDist = Infinity;

    for (const nest of this.nests) {
      if (nest.state === 'DESTROYED') continue;
      const dist = player.position.distanceTo(nest.position);
      if (dist < closestDist) {
        closestDist = dist;
        closestNest = nest;
      }
    }

    if (closestNest && closestDist <= MobNest.INTERACT_RADIUS) {
      if (closestNest.state === 'IDLE' || closestNest.state === 'PLANTING') {
        if (isInteractHeld && player.isAlive && !player.isDowned) {
          closestNest.state = 'PLANTING';
          closestNest.plantProgress = Math.min(1.0, closestNest.plantProgress + dt / MobNest.PLANT_DURATION);

          if (closestNest.plantProgress >= 1.0) {
            closestNest.state = 'ARMED';
            closestNest.fuseTimer = MobNest.FUSE_DURATION;
          }
        } else if (closestNest.state === 'PLANTING') {
          closestNest.plantProgress = Math.max(0, closestNest.plantProgress - dt * 2.0);
          if (closestNest.plantProgress <= 0) {
            closestNest.state = 'IDLE';
          }
        }
      }
    } else {
      // If player stepped away from planting nest, cancel planting
      for (const nest of this.nests) {
        if (nest.state === 'PLANTING') {
          nest.plantProgress = Math.max(0, nest.plantProgress - dt * 2.0);
          if (nest.plantProgress <= 0) {
            nest.state = 'IDLE';
          }
        }
      }
    }

    // 2. Update all nests
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
   * Returns interaction prompt details when the player is near a nest.
   */
  public getInteraction(playerPos: Vector3): { canInteract: boolean; prompt: string } {
    for (const nest of this.nests) {
      if (nest.state === 'DESTROYED') continue;
      const dist = playerPos.distanceTo(nest.position);
      if (dist <= MobNest.INTERACT_RADIUS) {
        if (nest.state === 'IDLE') {
          return {
            canInteract: true,
            prompt: '[УДЕРЖИВАЙТЕ E] Установить взрывчатку'
          };
        }
        if (nest.state === 'PLANTING') {
          return {
            canInteract: true,
            prompt: `Установка заряда: ${Math.round(nest.plantProgress * 100)}%`
          };
        }
        if (nest.state === 'ARMED') {
          const sec = Math.ceil(nest.fuseTimer);
          return {
            canInteract: false,
            prompt: `⚠️ ЗАРЯД АКТИВИРОВАН! БЕГИТЕ! (${sec}с)`
          };
        }
      }
    }
    return { canInteract: false, prompt: '' };
  }

  public get destroyedCount(): number {
    return this.nests.filter(n => n.state === 'DESTROYED').length;
  }

  public get totalCount(): number {
    return this.nests.length;
  }

  public get remainingCount(): number {
    return this.totalCount - this.destroyedCount;
  }

  public isAllNestsDestroyed(): boolean {
    return this.nests.length > 0 && this.nests.every(n => n.state === 'DESTROYED');
  }

  public clear(): void {
    for (const nest of this.nests) {
      nest.dispose(this.scene);
    }
    this.nests = [];
  }
}
