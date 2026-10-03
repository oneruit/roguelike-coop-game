import * as THREE from 'three';
import { rollRiftItem, RiftItemDef } from '../items/RiftItemSystem';
import { DifficultyDirector } from '../director/DifficultyDirector';

export type ChestTier = 'small' | 'large' | 'legendary';

export interface ChestInstance {
  id: string;
  tier: ChestTier;
  baseCost: number;
  position: THREE.Vector3;
  isOpened: boolean;
  mesh: THREE.Group;
  lidMesh: THREE.Mesh;
  hologramMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
}

export class ChestManager {
  private scene: THREE.Scene;
  public chests: ChestInstance[] = [];
  private static nextId = 1;

  // Shared Geometries & Materials for high performance
  private smallBaseGeom = new THREE.BoxGeometry(1.6, 0.9, 1.2);
  private smallLidGeom = new THREE.BoxGeometry(1.65, 0.35, 1.25);
  private largeBaseGeom = new THREE.BoxGeometry(2.2, 1.2, 1.6);
  private largeLidGeom = new THREE.BoxGeometry(2.25, 0.45, 1.65);

  private smallMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.3,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3
  });
  private largeMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x16a34a,
    emissiveIntensity: 0.35
  });
  private legendaryMat = new THREE.MeshStandardMaterial({
    color: 0x450a0a,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0xdc2626,
    emissiveIntensity: 0.5
  });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Spawns a chest at the given position.
   */
  public spawnChest(x: number, z: number, tier: ChestTier = 'small'): ChestInstance {
    const id = `chest_${ChestManager.nextId++}`;
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    let baseCost = 25;
    let baseGeom = this.smallBaseGeom;
    let lidGeom = this.smallLidGeom;
    let mat = this.smallMat;
    let glowColor = 0x38bdf8;

    if (tier === 'large') {
      baseCost = 50;
      baseGeom = this.largeBaseGeom;
      lidGeom = this.largeLidGeom;
      mat = this.largeMat;
      glowColor = 0x4ade80;
    } else if (tier === 'legendary') {
      baseCost = 100;
      baseGeom = this.largeBaseGeom;
      lidGeom = this.largeLidGeom;
      mat = this.legendaryMat;
      glowColor = 0xf87171;
    }

    // Base body
    const baseMesh = new THREE.Mesh(baseGeom, mat);
    baseMesh.position.y = baseGeom.parameters.height / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Opening Lid (hinged at back)
    const lidMesh = new THREE.Mesh(lidGeom, mat);
    lidMesh.position.set(0, baseGeom.parameters.height + lidGeom.parameters.height / 2, 0);
    lidMesh.castShadow = true;
    group.add(lidMesh);

    // Glowing Hologram Beacon above chest
    const holoGeom = new THREE.OctahedronGeometry(0.35);
    const holoMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      wireframe: true
    });
    const hologramMesh = new THREE.Mesh(holoGeom, holoMat);
    hologramMesh.position.y = baseGeom.parameters.height + 1.2;
    group.add(hologramMesh);

    // Ground energy aura
    const auraGeom = new THREE.RingGeometry(1.2, 1.5, 24);
    auraGeom.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(auraGeom, auraMat);
    glowMesh.position.y = 0.05;
    group.add(glowMesh);

    const chest: ChestInstance = {
      id,
      tier,
      baseCost,
      position: new THREE.Vector3(x, 0, z),
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
   * Generates scattered chests across a stage area.
   */
  public generateStageChests(centerX: number, centerZ: number, count: number = 14, stage: number = 1) {
    this.clear();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const dist = 20 + Math.random() * 85;
      const x = centerX + Math.cos(angle) * dist;
      const z = centerZ + Math.sin(angle) * dist;

      // Tier weights
      const roll = Math.random();
      let tier: ChestTier = 'small';
      if (stage >= 2 && roll < 0.15) {
        tier = 'legendary';
      } else if (roll < 0.45) {
        tier = 'large';
      }

      this.spawnChest(x, z, tier);
    }
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
    playerPos: THREE.Vector3,
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
}
