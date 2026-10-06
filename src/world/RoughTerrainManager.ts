import * as THREE from 'three';
import { SeededRNG } from '../core/SeededRNG';
import { OccupiedArea } from './ChunkManager';

export interface RoughZone {
  x: number;
  z: number;
  radius: number;
  mesh: THREE.Mesh;
}

export class RoughTerrainManager {
  private scene: THREE.Scene;
  private zones: RoughZone[] = [];
  // Spatial hash: hash -> RoughZone[]
  private spatialHash = new Map<number, RoughZone[]>();

  private static textureLoader = new THREE.TextureLoader();
  private static cachedTextures = new Map<string, THREE.Texture>();

  // Slowdown multiplier when inside a rough terrain / sand dune zone (35% slowdown)
  public static readonly SLOW_FACTOR = 0.65;
  private static readonly CELL_SIZE = 50;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private static getTexture(filename: string): THREE.Texture {
    let tex = this.cachedTextures.get(filename);
    if (!tex) {
      tex = this.textureLoader.load(`/textures/dunes/${filename}`);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      this.cachedTextures.set(filename, tex);
    }
    return tex;
  }

  private static toHash(cx: number, cz: number): number {
    return ((cx + 10000) * 20000) + (cz + 10000);
  }

  /**
   * Generates rough terrain patches (dunes/barchans in desert, thematic equivalents in other biomes).
   */
  public generateForStage(
    stageNumber: number,
    rng: SeededRNG,
    occupied: OccupiedArea[],
    addMeshToChunk?: (chunkKey: string, mesh: THREE.Object3D) => void
  ) {
    this.clear();

    // Select sprite textures based on current stage biome
    let primaryTexName = 'dune_barchan.png';
    let secondaryTexName: string | null = 'dune_mound.png';
    let baseRadius = 3.6;

    switch (stageNumber) {
      case 1: // Ashen Wastes (Desert) - Sand Dunes & Crescent Barchans
        primaryTexName = 'dune_barchan.png';
        secondaryTexName = 'dune_mound.png';
        baseRadius = 3.8;
        break;
      case 2: // Derelict Sector - Scrap Metal Drifts & Industrial Slag
        primaryTexName = 'scrap_drift.png';
        secondaryTexName = null;
        baseRadius = 3.4;
        break;
      case 3: // Bioluminescent Wilds - Spore Thickets & Toxic Mold Clumps
        primaryTexName = 'spore_patch.png';
        secondaryTexName = null;
        baseRadius = 3.5;
        break;
      case 4: // Volcanic Caldera - Scorched Ash Mounds & Pumice
        primaryTexName = 'ash_drift.png';
        secondaryTexName = null;
        baseRadius = 3.6;
        break;
      case 5: // Primordial Ruins - Overgrown Temple Rubble & Briars
        primaryTexName = 'ruins_rubble.png';
        secondaryTexName = null;
        baseRadius = 3.8;
        break;
      case 6: // Rift Core - Gravitational Anomaly & Void Vortex
        primaryTexName = 'void_distortion.png';
        secondaryTexName = null;
        baseRadius = 4.0;
        break;
      default:
        primaryTexName = 'dune_barchan.png';
        secondaryTexName = 'dune_mound.png';
        baseRadius = 3.6;
        break;
    }

    const primaryTex = RoughTerrainManager.getTexture(primaryTexName);
    const secondaryTex = secondaryTexName ? RoughTerrainManager.getTexture(secondaryTexName) : null;

    // Plane geometry laying flat on the ground plane at y = 0.02
    // We create separate materials for primary and secondary sprites with smooth alpha blending and zero z-fighting
    const primaryMat = new THREE.MeshStandardMaterial({
      map: primaryTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      roughness: 0.95,
      metalness: 0.02
    });

    const secondaryMat = secondaryTex
      ? new THREE.MeshStandardMaterial({
          map: secondaryTex,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
          roughness: 0.95,
          metalness: 0.02
        })
      : null;

    // Scatter 1-2 rough patches per chunk across the 10x10 world (-5 to 4 chunks)
    for (let cx = -5; cx <= 4; cx++) {
      for (let cz = -5; cz <= 4; cz++) {
        const chunkKey = `${cx},${cz}`;
        const patchCount = rng.next() < 0.8 ? (rng.next() < 0.5 ? 2 : 1) : 0;

        for (let p = 0; p < patchCount; p++) {
          const px = cx * 50 + rng.range(6.0, 44.0);
          const pz = cz * 50 + rng.range(6.0, 44.0);

          // Boundary margin check
          if (Math.abs(px) > 230 || Math.abs(pz) > 230) continue;

          // Check distance to occupied areas (spawn, teleporter, altars, oasis, chests)
          let overlapsOccupied = false;
          for (const occ of occupied) {
            if (Math.hypot(px - occ.x, pz - occ.z) < occ.radius + baseRadius + 1.0) {
              overlapsOccupied = true;
              break;
            }
          }
          if (overlapsOccupied) continue;

          // Separation from other dunes
          let tooCloseToOther = false;
          for (const existing of this.zones) {
            if (Math.hypot(px - existing.x, pz - existing.z) < (baseRadius * 1.8)) {
              tooCloseToOther = true;
              break;
            }
          }
          if (tooCloseToOther) continue;

          // Pick texture variant & scale
          const useSecondary = secondaryMat && rng.next() < 0.45;
          const mat = useSecondary && secondaryMat ? secondaryMat : primaryMat;
          const scaleMult = rng.range(0.85, 1.25);
          const actualRadius = baseRadius * scaleMult;
          const diameter = actualRadius * 2.0;

          const geom = new THREE.PlaneGeometry(diameter, diameter);
          geom.rotateX(-Math.PI / 2);

          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.set(px, 0.02, pz);

          if (stageNumber === 1) {
            // Align with prevailing desert wind and ground ripple angle (~-0.52 rad)
            // with subtle organic fluctuation (±18°) so dunes blend seamlessly with the terrain flow
            mesh.rotation.y = -0.52 + rng.range(-0.32, 0.32);
            // Random mirroring along transverse axis preserves solar shading while varying crescent orientation
            if (rng.next() < 0.5) {
              mesh.scale.x = -1;
            }
          } else {
            mesh.rotation.y = rng.range(0, Math.PI * 2);
          }

          mesh.receiveShadow = true;

          if (addMeshToChunk) {
            addMeshToChunk(chunkKey, mesh);
          } else {
            this.scene.add(mesh);
          }

          const zone: RoughZone = {
            x: px,
            z: pz,
            radius: actualRadius * 0.85, // matches dense dune sand body
            mesh
          };
          this.zones.push(zone);

          // Insert into spatial hash
          const hashX = Math.floor(px / RoughTerrainManager.CELL_SIZE);
          const hashZ = Math.floor(pz / RoughTerrainManager.CELL_SIZE);
          const hash = RoughTerrainManager.toHash(hashX, hashZ);
          let list = this.spatialHash.get(hash);
          if (!list) {
            list = [];
            this.spatialHash.set(hash, list);
          }
          list.push(zone);
        }
      }
    }
  }

  /**
   * Fast O(1) query returning speed multiplier (0.65 if in rough terrain/dune, 1.0 otherwise).
   */
  public getSlowFactor(x: number, z: number): number {
    const cx = Math.floor(x / RoughTerrainManager.CELL_SIZE);
    const cz = Math.floor(z / RoughTerrainManager.CELL_SIZE);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const hash = RoughTerrainManager.toHash(cx + dx, cz + dz);
        const list = this.spatialHash.get(hash);
        if (!list) continue;

        for (let i = 0; i < list.length; i++) {
          const zone = list[i];
          const distSq = (x - zone.x) * (x - zone.x) + (z - zone.z) * (z - zone.z);
          if (distSq < zone.radius * zone.radius) {
            return RoughTerrainManager.SLOW_FACTOR;
          }
        }
      }
    }

    return 1.0;
  }

  /**
   * Returns true if given world coordinate is inside any dune / rough zone.
   */
  public isSlowed(x: number, z: number): boolean {
    return this.getSlowFactor(x, z) < 0.99;
  }

  /**
   * Cleans up all zones and materials.
   */
  public clear() {
    for (const zone of this.zones) {
      if (zone.mesh.parent) {
        zone.mesh.parent.remove(zone.mesh);
      } else {
        this.scene.remove(zone.mesh);
      }
      zone.mesh.geometry.dispose();
    }
    this.zones = [];
    this.spatialHash.clear();
  }
}
