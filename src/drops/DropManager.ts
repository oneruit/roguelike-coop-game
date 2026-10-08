import { Vector3, type Scene, Sphere, type Frustum } from 'three';
import { Gem, GemType } from './Gem';
import { SoundManager } from '../core/SoundManager';
import { DropSnapshot } from '../net/NetworkManager';

export interface GemCollector {
  id: string;
  position: Vector3;
  pickupRadius: number;
  isAlive: boolean;
  isDowned: boolean;
  onCollect?: (xp: number, gem: Gem) => void;
}

export class DropManager {
  private scene: Scene;
  public gems: Gem[] = [];
  public getElevation?: (x: number, z: number) => number;
  private static readonly MAX_GEMS = 120;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public spawnGem(position: Vector3, type: GemType = 'blue', id?: string) {
    // If ground is cluttered, discard oldest common uncollected gem
    if (this.gems.length >= DropManager.MAX_GEMS) {
      const nonGoldIdx = this.gems.findIndex(g => g.type !== 'gold');
      const oldest = nonGoldIdx !== -1 ? this.gems.splice(nonGoldIdx, 1)[0] : this.gems.shift();
      if (oldest) {
        oldest.destroy(this.scene);
      }
    }

    const gem = new Gem(type, position, id);
    gem.getElevation = this.getElevation;
    this.gems.push(gem);
    this.scene.add(gem.mesh);
    return gem;
  }

  /**
   * Updates gem attraction and pickup with multi-player support.
   * Dead/downed players are excluded: they cannot move, attract, or collect XP.
   */
  public updateWithCollectors(dt: number, collectors: GemCollector[]) {
    const activeCollectors = collectors.filter(c => c.isAlive && !c.isDowned && c.pickupRadius > 0);

    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];

      if (activeCollectors.length === 0) {
        gem.isAttracted = false;
        continue;
      }

      let closest: GemCollector = activeCollectors[0];
      let minDistanceSq = gem.position.distanceToSquared(activeCollectors[0].position);

      for (let j = 1; j < activeCollectors.length; j++) {
        const dSq = gem.position.distanceToSquared(activeCollectors[j].position);
        if (dSq < minDistanceSq) {
          minDistanceSq = dSq;
          closest = activeCollectors[j];
        }
      }

      // Cull gems left far behind in the world
      if (!gem.isAttracted && minDistanceSq > 65 * 65) {
        gem.destroy(this.scene);
        this.gems.splice(i, 1);
        continue;
      }

      const collected = gem.update(dt, closest.position, closest.pickupRadius);

      if (collected) {
        if (closest.onCollect) {
          closest.onCollect(gem.xpValue, gem);
        }
        SoundManager.playGem();
        gem.destroy(this.scene);
        this.gems.splice(i, 1);
      }
    }
  }

  public update(
    dt: number,
    playerPos: Vector3,
    pickupRadius: number,
    onCollectXp: (xp: number) => void,
    partnerPos?: Vector3,
    partnerPickupRadius: number = 4.2,
    onPartnerCollectXp?: (xp: number) => void
  ) {
    const collectors: GemCollector[] = [
      {
        id: 'local',
        position: playerPos,
        pickupRadius,
        isAlive: true,
        isDowned: false,
        onCollect: (xp) => onCollectXp(xp)
      }
    ];

    if (partnerPos) {
      collectors.push({
        id: 'partner',
        position: partnerPos,
        pickupRadius: partnerPickupRadius,
        isAlive: true,
        isDowned: false,
        onCollect: (xp) => {
          if (onPartnerCollectXp) onPartnerCollectXp(xp);
        }
      });
    }

    this.updateWithCollectors(dt, collectors);
  }

  public getSnapshot(): DropSnapshot[] {
    return this.gems.map((g) => ({
      id: g.id,
      type: g.type,
      x: g.position.x,
      z: g.position.z
    }));
  }

  public applySnapshot(snapshots: DropSnapshot[]) {
    const seenIds = new Set<string>();
    for (const s of snapshots) {
      seenIds.add(s.id);
      let gem = this.gems.find((g) => g.id === s.id);
      if (!gem) {
        gem = new Gem(s.type, new Vector3(s.x, 0, s.z), s.id);
        this.gems.push(gem);
        this.scene.add(gem.mesh);
      }
    }

    for (let i = this.gems.length - 1; i >= 0; i--) {
      if (!seenIds.has(this.gems[i].id)) {
        this.gems[i].destroy(this.scene);
        this.gems.splice(i, 1);
      }
    }
  }

  public vacuumAll() {
    for (const gem of this.gems) {
      gem.isAttracted = true;
    }
  }

  private tempSphere = new Sphere();

  /**
   * Rendering phase: Viewport/Frustum culling across all ground gems.
   * Culled gems have mesh.visible = false and skip all bobbing/rotation calculations.
   */
  public updateVisuals(dt: number, frustum: Frustum) {
    for (let i = 0; i < this.gems.length; i++) {
      const gem = this.gems[i];
      if (gem.isCollected) {
        gem.mesh.visible = false;
        continue;
      }
      this.tempSphere.center.set(gem.position.x, 0.4, gem.position.z);
      this.tempSphere.radius = 1.2;
      const inFrustum = frustum.intersectsSphere(this.tempSphere);
      gem.updateVisuals(dt, inFrustum);
    }
  }

  public clear() {
    for (const gem of this.gems) {
      gem.destroy(this.scene);
    }
    this.gems = [];
  }
}
