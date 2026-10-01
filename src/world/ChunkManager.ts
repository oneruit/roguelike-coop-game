import * as THREE from 'three';
import { TerrainProps, TerrainMaterials } from './TerrainProps';
import { Altar } from './Altar';
import { AltarManager } from './AltarManager';
import { ObstacleManager } from './ObstacleManager';
import { BuffType } from '../entities/Player';

export class ChunkManager {
  private scene: THREE.Scene;
  private altarManager: AltarManager;
  private obstacleManager: ObstacleManager;
  public static readonly CHUNK_SIZE = 50;
  public static readonly VIEW_RADIUS = 2; // 5x5 chunks around player (250x250 unit visible area)
  public static readonly UNLOAD_RADIUS = 3;

  private activeChunks = new Map<string, THREE.Group>();
  private chunkAltars = new Map<string, Altar[]>();
  private sharedFloorGeometry: THREE.PlaneGeometry;

  constructor(scene: THREE.Scene, altarManager: AltarManager, obstacleManager: ObstacleManager) {
    this.scene = scene;
    this.altarManager = altarManager;
    this.obstacleManager = obstacleManager;
    TerrainMaterials.init();

    // Reusable single floor geometry for all chunks with slight overlap to prevent seam gaps
    this.sharedFloorGeometry = new THREE.PlaneGeometry(
      ChunkManager.CHUNK_SIZE + 0.6,
      ChunkManager.CHUNK_SIZE + 0.6
    );
  }

  /**
   * Deterministic 2D integer coordinate hash.
   */
  private hash2D(x: number, z: number): number {
    let h = (x * 374761393 + z * 668265263) ^ 0x5bf03635;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  /**
   * Fast, deterministic Mulberry32 PRNG.
   */
  private createRng(seed: number): () => number {
    let s = seed;
    return function() {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Updates chunks centered around player position.
   */
  public update(playerPos: THREE.Vector3 | THREE.Vector3[]) {
    const positions = Array.isArray(playerPos) ? playerPos : [playerPos];
    if (positions.length === 0) return;

    // 1. Generate / keep chunks in view radius of ALL players
    const currentKeys = new Set<string>();

    for (const pos of positions) {
      const cx = Math.floor(pos.x / ChunkManager.CHUNK_SIZE);
      const cz = Math.floor(pos.z / ChunkManager.CHUNK_SIZE);

      for (let dx = -ChunkManager.VIEW_RADIUS; dx <= ChunkManager.VIEW_RADIUS; dx++) {
        for (let dz = -ChunkManager.VIEW_RADIUS; dz <= ChunkManager.VIEW_RADIUS; dz++) {
          const curX = cx + dx;
          const curZ = cz + dz;
          const key = `${curX},${curZ}`;
          currentKeys.add(key);

          if (!this.activeChunks.has(key)) {
            const chunkGroup = this.generateChunk(curX, curZ, key);
            this.activeChunks.set(key, chunkGroup);
            this.scene.add(chunkGroup);
          }
        }
      }
    }

    // 2. Unload chunks beyond unload radius from ALL players
    for (const [key, group] of this.activeChunks.entries()) {
      const [kx, kz] = key.split(',').map(Number);
      let nearAnyPlayer = false;

      for (const pos of positions) {
        const cx = Math.floor(pos.x / ChunkManager.CHUNK_SIZE);
        const cz = Math.floor(pos.z / ChunkManager.CHUNK_SIZE);
        const distX = Math.abs(kx - cx);
        const distZ = Math.abs(kz - cz);

        if (distX <= ChunkManager.UNLOAD_RADIUS && distZ <= ChunkManager.UNLOAD_RADIUS) {
          nearAnyPlayer = true;
          break;
        }
      }

      if (!nearAnyPlayer) {
        this.scene.remove(group);
        this.disposeChunk(group);
        this.activeChunks.delete(key);

        // Unregister any altars belonging to this unloaded chunk
        const altars = this.chunkAltars.get(key);
        if (altars) {
          for (const altar of altars) {
            this.altarManager.unregisterAltar(altar);
          }
          this.chunkAltars.delete(key);
        }

        // Remove obstacles for this chunk
        this.obstacleManager.removeChunkObstacles(key);
      }
    }
  }

  /**
   * Procedurally generates a single chunk with floor and scattered desert props.
   */
  private generateChunk(cx: number, cz: number, key: string): THREE.Group {
    const chunkGroup = new THREE.Group();
    const seed = this.hash2D(cx, cz);
    const rng = this.createRng(seed);

    const worldCenterX = cx * ChunkManager.CHUNK_SIZE + ChunkManager.CHUNK_SIZE / 2;
    const worldCenterZ = cz * ChunkManager.CHUNK_SIZE + ChunkManager.CHUNK_SIZE / 2;

    const minX = cx * ChunkManager.CHUNK_SIZE - 1;
    const minZ = cz * ChunkManager.CHUNK_SIZE - 1;
    const maxX = (cx + 1) * ChunkManager.CHUNK_SIZE + 1;
    const maxZ = (cz + 1) * ChunkManager.CHUNK_SIZE + 1;
    (chunkGroup as any).boundingBox = new THREE.Box3(
      new THREE.Vector3(minX, -2, minZ),
      new THREE.Vector3(maxX, 16, maxZ)
    );

    // Floor Mesh (receives dynamic shadows)
    const floorMesh = new THREE.Mesh(this.sharedFloorGeometry, TerrainMaterials.sandMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(worldCenterX, 0, worldCenterZ);
    floorMesh.receiveShadow = true;
    chunkGroup.add(floorMesh);

    // Check for Altar generation in this chunk
    let altarPos: THREE.Vector3 | null = null;
    let altarType: BuffType | null = null;

    // Guaranteed starter altars in immediate neighboring chunks for quick discovery
    if (cx === 0 && cz === 1) {
      altarType = 'damage'; // South: Wrath Altar
      altarPos = new THREE.Vector3(worldCenterX - 4, 0, worldCenterZ);
    } else if (cx === -1 && cz === 0) {
      altarType = 'speed'; // West: Wind Altar
      altarPos = new THREE.Vector3(worldCenterX, 0, worldCenterZ + 5);
    } else if (cx === 1 && cz === -1) {
      altarType = 'regen'; // North-East: Vitality Altar
      altarPos = new THREE.Vector3(worldCenterX + 3, 0, worldCenterZ - 3);
    } else if (cx === 0 && cz === -1) {
      altarType = 'invulnerable'; // North: Aegis Altar
      altarPos = new THREE.Vector3(worldCenterX - 3, 0, worldCenterZ - 5);
    } else if (Math.abs(cx) > 1 || Math.abs(cz) > 1) {
      // Procedural chance for farther chunks (~30% chance)
      const altarRoll = this.hash2D(cx * 19, cz * 37) % 100;
      if (altarRoll < 30) {
        const types: BuffType[] = ['damage', 'speed', 'regen', 'invulnerable'];
        altarType = types[this.hash2D(cx + 43, cz + 97) % 4];
        altarPos = new THREE.Vector3(
          worldCenterX + (rng() - 0.5) * 24,
          0,
          worldCenterZ + (rng() - 0.5) * 24
        );
      }
    }

    if (altarType && altarPos) {
      const altar = new Altar(altarType, altarPos);
      this.altarManager.registerAltar(altar);

      if (!this.chunkAltars.has(key)) {
        this.chunkAltars.set(key, []);
      }
      this.chunkAltars.get(key)!.push(altar);

      // Altar solid stone base collider (capture radius is 4.2, solid center is 1.5)
      this.obstacleManager.addObstacle(key, {
        x: altarPos.x,
        z: altarPos.z,
        radius: 1.5,
        type: 'altar'
      });
    }

    // Scattered 3D Props
    // Divide the 50x50 chunk into 3x3 cells (each ~16.6x16.6 units)
    const cellSize = ChunkManager.CHUNK_SIZE / 3;

    for (let ix = 0; ix < 3; ix++) {
      for (let iz = 0; iz < 3; iz++) {
        if (rng() > 0.65) continue;

        const localX = (ix + 0.2 + rng() * 0.6) * cellSize - ChunkManager.CHUNK_SIZE / 2;
        const localZ = (iz + 0.2 + rng() * 0.6) * cellSize - ChunkManager.CHUNK_SIZE / 2;

        const propWorldX = worldCenterX + localX;
        const propWorldZ = worldCenterZ + localZ;

        // Keep 8.0 unit safe clearing around world origin (0, 0)
        if (Math.hypot(propWorldX, propWorldZ) < 8.0) continue;

        // Keep 6.0 unit clearing around any altar so the capture zone is open
        if (altarPos && Math.hypot(propWorldX - altarPos.x, propWorldZ - altarPos.z) < 6.0) {
          continue;
        }

        const propRoll = rng();
        let prop: THREE.Group;

        if (propRoll < 0.42) {
          prop = TerrainProps.createCactus(rng);
          this.obstacleManager.addObstacle(key, {
            x: propWorldX,
            z: propWorldZ,
            radius: 0.55,
            type: 'cactus'
          });
        } else if (propRoll < 0.72) {
          prop = TerrainProps.createTree(rng);
          this.obstacleManager.addObstacle(key, {
            x: propWorldX,
            z: propWorldZ,
            radius: 0.70,
            type: 'tree'
          });
        } else if (propRoll < 0.90) {
          prop = TerrainProps.createBoulder(rng);
          this.obstacleManager.addObstacle(key, {
            x: propWorldX,
            z: propWorldZ,
            radius: 0.95,
            type: 'boulder'
          });
        } else {
          prop = TerrainProps.createScrub(rng);
        }

        prop.position.set(propWorldX, 0, propWorldZ);
        chunkGroup.add(prop);
      }
    }

    // Secondary layer: 2 to 4 small dry grass / sagebrush tufts per chunk
    const scrubCount = 2 + Math.floor(rng() * 3);
    for (let s = 0; s < scrubCount; s++) {
      const localX = (rng() - 0.5) * (ChunkManager.CHUNK_SIZE - 6);
      const localZ = (rng() - 0.5) * (ChunkManager.CHUNK_SIZE - 6);
      const scrubWorldX = worldCenterX + localX;
      const scrubWorldZ = worldCenterZ + localZ;

      if (Math.hypot(scrubWorldX, scrubWorldZ) < 6.0) continue;
      if (altarPos && Math.hypot(scrubWorldX - altarPos.x, scrubWorldZ - altarPos.z) < 4.5) continue;

      const scrub = TerrainProps.createScrub(rng);
      scrub.position.set(scrubWorldX, 0, scrubWorldZ);
      chunkGroup.add(scrub);
    }

    // Rare Wild West Landmarks (~22% chance per chunk)
    if (rng() < 0.22) {
      const landmarkRoll = rng();
      let landmark: THREE.Group;

      const lx = worldCenterX + (rng() - 0.5) * (ChunkManager.CHUNK_SIZE - 12);
      const lz = worldCenterZ + (rng() - 0.5) * (ChunkManager.CHUNK_SIZE - 12);

      const tooCloseToAltar = altarPos && Math.hypot(lx - altarPos.x, lz - altarPos.z) < 6.0;
      if (Math.hypot(lx, lz) > 7.0 && !tooCloseToAltar) {
        if (landmarkRoll < 0.45) {
          landmark = TerrainProps.createWagonWheel(rng);
          this.obstacleManager.addObstacle(key, {
            x: lx,
            z: lz,
            radius: 0.65,
            type: 'landmark'
          });
        } else if (landmarkRoll < 0.78) {
          landmark = TerrainProps.createSteerSkull(rng);
        } else {
          landmark = TerrainProps.createTrailPost(rng);
          this.obstacleManager.addObstacle(key, {
            x: lx,
            z: lz,
            radius: 0.35,
            type: 'landmark'
          });
        }

        landmark.position.set(lx, 0, lz);
        chunkGroup.add(landmark);
      }
    }

    return chunkGroup;
  }

  /**
   * Deep cleanup of geometry instances when a chunk is unloaded.
   */
  private disposeChunk(group: THREE.Group) {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry !== this.sharedFloorGeometry) {
          obj.geometry.dispose();
        }
      }
    });
  }

  /**
   * Rendering phase: Culls entire chunks that are outside the camera frustum.
   * Completely skips rendering terrain sand floors and 20-30 props per culled chunk!
   */
  public cull(frustum: THREE.Frustum) {
    for (const group of this.activeChunks.values()) {
      const box = (group as any).boundingBox as THREE.Box3 | undefined;
      if (box) {
        group.visible = frustum.intersectsBox(box);
      }
    }
  }

  /**
   * Clears all loaded chunks and altars.
   */
  public clear() {
    for (const group of this.activeChunks.values()) {
      this.scene.remove(group);
      this.disposeChunk(group);
    }
    this.activeChunks.clear();
    this.chunkAltars.clear();
    this.altarManager.clear();
    this.obstacleManager.clear();
  }
}
