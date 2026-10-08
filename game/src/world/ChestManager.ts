import {
  Vector3,
  Group,
  Mesh,
  type Scene,
  BoxGeometry,
  MeshStandardMaterial,
  OctahedronGeometry,
  MeshBasicMaterial,
  RingGeometry,
  DoubleSide
} from 'three';
import { rollRiftItem, RiftItemDef } from '../items/RiftItemSystem';
import { DifficultyDirector } from '../director/DifficultyDirector';
import { SeededRNG } from '../core/SeededRNG';

export type ChestTier = 'small' | 'large' | 'legendary';

export interface ChestInstance {
  id: string;
  tier: ChestTier;
  baseCost: number;
  position: Vector3;
  isOpened: boolean;
  mesh: Group;
  lidMesh: Mesh;
  hologramMesh: Mesh;
  glowMesh: Mesh;
}

export class ChestManager {
  private scene: Scene;
  public chests: ChestInstance[] = [];
  private static nextId = 1;

  // Shared Geometries & Materials for high performance
  private smallBaseGeom = new BoxGeometry(1.6, 0.9, 1.2);
  private smallLidGeom = new BoxGeometry(1.65, 0.35, 1.25);
  private largeBaseGeom = new BoxGeometry(2.2, 1.2, 1.6);
  private largeLidGeom = new BoxGeometry(2.25, 0.45, 1.65);

  private smallMat = new MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.3,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3
  });
  private largeMat = new MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x16a34a,
    emissiveIntensity: 0.35
  });
  private legendaryMat = new MeshStandardMaterial({
    color: 0x450a0a,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0xdc2626,
    emissiveIntensity: 0.5
  });

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Spawns a chest at the given position.
   */
  public spawnChest(
    x: number,
    z: number,
    tier: ChestTier = 'small',
    customId?: string,
    customBaseCost?: number,
    y: number = 0
  ): ChestInstance {
    const id = customId || `chest_${ChestManager.nextId++}`;
    const group = new Group();
    group.position.set(x, y, z);

    let baseCost = customBaseCost ?? 25;
    let baseGeom = this.smallBaseGeom;
    let lidGeom = this.smallLidGeom;
    let mat = this.smallMat;
    let glowColor = 0x38bdf8;

    if (tier === 'large') {
      baseCost = customBaseCost ?? 50;
      baseGeom = this.largeBaseGeom;
      lidGeom = this.largeLidGeom;
      mat = this.largeMat;
      glowColor = 0x4ade80;
    } else if (tier === 'legendary') {
      baseCost = customBaseCost ?? 100;
      baseGeom = this.largeBaseGeom;
      lidGeom = this.largeLidGeom;
      mat = this.legendaryMat;
      glowColor = 0xf87171;
    }

    // Base body
    const baseMesh = new Mesh(baseGeom, mat);
    baseMesh.position.y = baseGeom.parameters.height / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Opening Lid (hinged at back)
    const lidMesh = new Mesh(lidGeom, mat);
    lidMesh.position.set(0, baseGeom.parameters.height + lidGeom.parameters.height / 2, 0);
    lidMesh.castShadow = true;
    group.add(lidMesh);

    // Glowing Hologram Beacon above chest
    const holoGeom = new OctahedronGeometry(0.35);
    const holoMat = new MeshBasicMaterial({
      color: glowColor,
      wireframe: true
    });
    const hologramMesh = new Mesh(holoGeom, holoMat);
    hologramMesh.position.y = baseGeom.parameters.height + 1.2;
    group.add(hologramMesh);

    // Ground energy aura
    const auraGeom = new RingGeometry(1.2, 1.5, 24);
    auraGeom.rotateX(-Math.PI / 2);
    const auraMat = new MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.45,
      side: DoubleSide
    });
    const glowMesh = new Mesh(auraGeom, auraMat);
    glowMesh.position.y = 0.05;
    group.add(glowMesh);

    const chest: ChestInstance = {
      id,
      tier,
      baseCost,
      position: new Vector3(x, y, z),
      isOpened: false,
      mesh: group,
      lidMesh,
      hologramMesh,
      glowMesh
    };

    this.chests.push(chest);
    this.scene.add(group);
    return chest;
  }

  /**
   * Generates scattered chests across the fixed 500x500 map area using deterministic PRNG.
   * Guarantees healthy clearance from spawn, altars, teleporter, and other chests.
   */
  public generateStageChests(
    centerX: number = 0,
    centerZ: number = 0,
    count: number = 16,
    stage: number = 1,
    rng?: SeededRNG,
    forbiddenZones?: { x: number; z: number; radius: number }[],
    getElevation?: (x: number, z: number) => number
  ): { x: number; z: number; radius: number }[] {
    this.clear();
    const prng = rng || new SeededRNG(stage * 7919);
    const placedZones: { x: number; z: number; radius: number }[] = [];

    // Attempt to scatter chests across the 500x500 map (-215 to +215)
    for (let i = 0; i < count; i++) {
      let chosenX = 0;
      let chosenZ = 0;
      let valid = false;

      for (let attempt = 0; attempt < 45; attempt++) {
        // Sample candidate
        const candX = prng.range(-215, 215);
        const candZ = prng.range(-215, 215);

        // Distance from spawn (0, 0)
        if (Math.hypot(candX, candZ) < 26.0) continue;

        // Distance from forbidden zones (altars, teleporter)
        let tooCloseToZone = false;
        if (forbiddenZones) {
          for (const zone of forbiddenZones) {
            if (Math.hypot(candX - zone.x, candZ - zone.z) < zone.radius + 6.0) {
              tooCloseToZone = true;
              break;
            }
          }
        }
        if (tooCloseToZone) continue;

        // Distance from already placed chests (min 28m)
        let tooCloseToChest = false;
        for (const placed of placedZones) {
          if (Math.hypot(candX - placed.x, candZ - placed.z) < 28.0) {
            tooCloseToChest = true;
            break;
          }
        }
        if (tooCloseToChest) continue;

        chosenX = candX;
        chosenZ = candZ;
        valid = true;
        break;
      }

      if (!valid) {
        // Fallback with radial distribution if random box attempts were dense
        const ang = (i / count) * Math.PI * 2 + prng.range(-0.2, 0.2);
        const dist = 35 + prng.range(15, 170);
        chosenX = centerX + Math.cos(ang) * dist;
        chosenZ = centerZ + Math.sin(ang) * dist;
      }

      // Deterministic tier weights
      const roll = prng.next();
      let tier: ChestTier = 'small';
      if (stage >= 2 && roll < 0.15) {
        tier = 'legendary';
      } else if (roll < 0.45) {
        tier = 'large';
      }

      const chosenY = getElevation ? getElevation(chosenX, chosenZ) : 0;
      this.spawnChest(chosenX, chosenZ, tier, undefined, undefined, chosenY);
      placedZones.push({ x: chosenX, z: chosenZ, radius: 4.5 });
    }

    return placedZones;
  }

  /**
   * Updates floating chest hologram visuals.
   */
  public update(dt: number) {
    for (const chest of this.chests) {
      if (!chest.isOpened) {
        chest.hologramMesh.rotation.y += dt * 2.0;
        chest.hologramMesh.rotation.x += dt * 0.8;
      } else {
        // Smoothly swing lid open backwards
        if (chest.lidMesh.rotation.x > -Math.PI * 0.4) {
          chest.lidMesh.rotation.x -= dt * 4.0;
          chest.lidMesh.position.z -= dt * 0.8;
        }
      }
    }
  }

  /**
   * Finds the closest unopened chest within interaction distance (~3.6m).
   */
  public getClosestInteractableChest(
    playerPos: Vector3,
    gameTime: number,
    stage: number
  ): { chest: ChestInstance; cost: number; canAfford: boolean } | null {
    let closest: ChestInstance | null = null;
    let minDistSq = 3.6 * 3.6;

    for (const chest of this.chests) {
      if (chest.isOpened) continue;
      const dSq = playerPos.distanceToSquared(chest.position);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closest = chest;
      }
    }

    if (!closest) return null;

    const cost = DifficultyDirector.getScaledChestCost(closest.baseCost, gameTime, stage);
    return {
      chest: closest,
      cost,
      canAfford: true // Caller checks credits
    };
  }

  /**
   * Opens the chest, awards item and returns dropped item.
   */
  public openChest(chest: ChestInstance): RiftItemDef {
    chest.isOpened = true;
    chest.hologramMesh.visible = false;
    chest.glowMesh.visible = false;

    let weights = { common: 80, uncommon: 20, legendary: 0 };
    if (chest.tier === 'large') {
      weights = { common: 20, uncommon: 70, legendary: 10 };
    } else if (chest.tier === 'legendary') {
      weights = { common: 0, uncommon: 10, legendary: 90 };
    }

    const item = rollRiftItem(weights);
    return item;
  }

  public clear() {
    for (const chest of this.chests) {
      this.scene.remove(chest.mesh);
    }
    this.chests = [];
  }

  public getSnapshot(): { id: string; tier: ChestTier; baseCost: number; x: number; z: number; isOpened: boolean }[] {
    return this.chests.map((c) => ({
      id: c.id,
      tier: c.tier,
      baseCost: c.baseCost,
      x: c.position.x,
      z: c.position.z,
      isOpened: c.isOpened
    }));
  }

  public applySnapshot(
    snapshots: { id: string; tier: ChestTier; baseCost: number; x: number; z: number; isOpened: boolean }[]
  ) {
    if (!snapshots || snapshots.length === 0) return;

    const currentIds = new Set(this.chests.map((c) => c.id));
    const isDifferent =
      snapshots.length !== this.chests.length ||
      snapshots.some((s) => !currentIds.has(s.id));

    if (isDifferent) {
      this.clear();
      for (const snap of snapshots) {
        const chest = this.spawnChest(snap.x, snap.z, snap.tier, snap.id, snap.baseCost);
        if (snap.isOpened) {
          chest.isOpened = true;
          chest.hologramMesh.visible = false;
          chest.glowMesh.visible = false;
          chest.lidMesh.rotation.x = -Math.PI * 0.4;
          chest.lidMesh.position.z -= 0.3;
        }
      }
      return;
    }

    for (const snap of snapshots) {
      if (snap.isOpened) {
        const chest = this.chests.find((c) => c.id === snap.id);
        if (chest && !chest.isOpened) {
          this.openChest(chest);
        }
      }
    }
  }
}
