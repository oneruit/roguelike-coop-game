import {
  type Scene,
  Group,
  Vector3,
  Box3,
  PlaneGeometry,
  Mesh,
  type Frustum
} from 'three';
import { TerrainMaterials } from './TerrainProps';
import { Altar } from './Altar';
import { AltarManager } from './AltarManager';
import { ObstacleManager } from './ObstacleManager';
import { BuffType } from '../entities/Player';
import { SeededRNG } from '../core/SeededRNG';
import { ChestManager } from './ChestManager';
import { RiftTeleporter } from './RiftTeleporter';
import { TerrainElevation } from './TerrainElevation';
import { RoughTerrainManager } from './RoughTerrainManager';
import { TreeManager } from './TreeManager';

export interface OccupiedArea {
  x: number;
  z: number;
  radius: number;
}

export class ChunkManager {
  private scene: Scene;
  private altarManager: AltarManager;
  private obstacleManager: ObstacleManager;

  // Fixed World Dimensions: 450x450 meters (9x9 chunks of 50m each)
  public static readonly CHUNK_SIZE = 50;
  public static readonly GRID_SIZE = 9;
  public static readonly MAP_SIZE = 450;
  public static readonly HALF_MAP = 225;
  public static readonly MIN_CHUNK = -4;
  public static readonly MAX_CHUNK = 4; // -4 to 4 inclusive = 9 chunks

  public currentSeed: number = 1337;
  public currentSeedString: string = '1337';

  public elevation: TerrainElevation = new TerrainElevation(1337);
  public roughTerrainManager: RoughTerrainManager;
  private oasisGroups: Group[] = [];
  private activeChunks = new Map<string, Group>();
  public isDeclarative: boolean = false;
  private chunkListeners: Set<(action: 'add' | 'remove' | 'reset', key?: string, group?: Group) => void> = new Set();

  constructor(scene: Scene, altarManager: AltarManager, obstacleManager: ObstacleManager) {
    this.scene = scene;
    this.altarManager = altarManager;
    this.obstacleManager = obstacleManager;
    this.roughTerrainManager = new RoughTerrainManager(this.scene);
    TerrainMaterials.init();
  }

  public addChunkListener(listener: (action: 'add' | 'remove' | 'reset', key?: string, group?: Group) => void): () => void {
    this.chunkListeners.add(listener);
    return () => this.chunkListeners.delete(listener);
  }

  public getActiveChunks(): Map<string, Group> {
    return this.activeChunks;
  }

  public setDeclarative(declarative: boolean): void {
    if (this.isDeclarative === declarative) return;
    this.isDeclarative = declarative;
    if (declarative) {
      for (const group of this.activeChunks.values()) {
        this.scene.remove(group);
      }
    } else {
      for (const group of this.activeChunks.values()) {
        this.scene.add(group);
      }
    }
  }

  /**
   * Returns terrain elevation Y at world coordinate (x, z) (always 0 for 2D/2.5D pixel art consistency).
   */
  public getElevation(x: number, z: number): number {
    return this.elevation.getElevation(x, z);
  }

  /**
   * Returns rough terrain slow multiplier (0.65 on dunes/rough zones, 1.0 normally).
   */
  public getSlowFactor(x: number, z: number): number {
    return this.roughTerrainManager.getSlowFactor(x, z);
  }

  /**
   * Returns surface normal vector at world coordinate (x, z).
   */
  public getNormal(x: number, z: number, target?: Vector3): Vector3 {
    return this.elevation.getNormal(x, z, target);
  }

  /**
   * Generates the entire fixed 500x500m world upfront based on a deterministic seed.
   * Completely eliminates runtime stutter and allocation during player movement.
   */
  public generateMap(
    seedInput: number | string = 1337,
    chestManager?: ChestManager,
    riftTeleporter?: RiftTeleporter,
    stageNumber: number = 1,
    biomeId?: string
  ) {
    this.clear();

    if (typeof seedInput === 'number') {
      this.currentSeed = seedInput >>> 0 || 1337;
      this.currentSeedString = this.currentSeed.toString();
    } else {
      const trimmed = seedInput.trim();
      const parsed = parseInt(trimmed, 10);
      if (!isNaN(parsed) && parsed.toString() === trimmed) {
        this.currentSeed = parsed >>> 0 || 1337;
      } else {
        this.currentSeed = SeededRNG.hashString(trimmed || '1337');
      }
      this.currentSeedString = trimmed || '1337';
    }

    // Flat terrain (elevation Y = 0 everywhere)
    this.elevation.setSeed(this.currentSeed);

    const rng = new SeededRNG(this.currentSeed);

    // List of occupied clearance zones (spawn, teleporter, altars, chests, oasis)
    const occupied: OccupiedArea[] = [];

    // 1. Safe zone around world spawn origin (0, 0)
    occupied.push({ x: 0, z: 0, radius: 15.0 });

    // 2. Teleporter Placement (Stages 1-4; on stage 5 Runic Sanctum, final stage transition is disabled)
    let teleX = 75;
    let teleZ = 75;
    if (riftTeleporter) {
      if (stageNumber >= 5) {
        riftTeleporter.disableForFinalStage();
      } else {
        // Pick deterministic sector away from spawn
        const teleAngle = rng.range(0, Math.PI * 2);
        const teleDist = rng.range(110, 165);
        teleX = Math.cos(teleAngle) * teleDist;
        teleZ = Math.sin(teleAngle) * teleDist;
        riftTeleporter.resetForStage(new Vector3(teleX, 0, teleZ));
        occupied.push({ x: teleX, z: teleZ, radius: 18.0 });
        if (stageNumber === 4) {
          // On stage 4, the portal is secretly hidden until all chests are collected
          riftTeleporter.mesh.visible = false;
          riftTeleporter.isDiscovered = false;
        }
      }
    }

    // 3. Exactly 6 Altars (radially distributed, single-use)
    const buffPool: BuffType[] = ['damage', 'speed', 'regen', 'invulnerable', 'damage', 'speed'];
    rng.shuffle(buffPool);
    const chosenBuffs = buffPool.slice(0, 6);

    const baseAltarAngle = rng.range(0, Math.PI * 2);
    for (let i = 0; i < 6; i++) {
      const sectorAngle = baseAltarAngle + (i * (Math.PI * 2 / 6)) + rng.range(-0.20, 0.20);
      const dist = rng.range(65, 145);
      const ax = Math.cos(sectorAngle) * dist;
      const az = Math.sin(sectorAngle) * dist;

      const altar = new Altar(chosenBuffs[i], new Vector3(ax, 0, az));
      this.altarManager.registerAltar(altar);

      const altarChunkX = Math.max(ChunkManager.MIN_CHUNK, Math.min(ChunkManager.MAX_CHUNK, Math.round(ax / ChunkManager.CHUNK_SIZE)));
      const altarChunkZ = Math.max(ChunkManager.MIN_CHUNK, Math.min(ChunkManager.MAX_CHUNK, Math.round(az / ChunkManager.CHUNK_SIZE)));
      const altarChunkKey = `${altarChunkX},${altarChunkZ}`;
      this.obstacleManager.addObstacle(altarChunkKey, {
        x: ax,
        z: az,
        radius: 1.5,
        type: 'altar'
      });

      occupied.push({ x: ax, z: az, radius: 9.5 });
    }

    // 3b. Altar of Greed (Spawns exclusively on Stage 4+ so players have leveled up and prepared)
    if (stageNumber >= 4) {
      const greedAngle = rng.range(0, Math.PI * 2);
      const greedDist = rng.range(75, 120);
      const gx = Math.cos(greedAngle) * greedDist;
      const gz = Math.sin(greedAngle) * greedDist;

      const greedAltar = new Altar('greed', new Vector3(gx, 0, gz));
      this.altarManager.registerAltar(greedAltar);

      const chunkX = Math.max(ChunkManager.MIN_CHUNK, Math.min(ChunkManager.MAX_CHUNK, Math.round(gx / ChunkManager.CHUNK_SIZE)));
      const chunkZ = Math.max(ChunkManager.MIN_CHUNK, Math.min(ChunkManager.MAX_CHUNK, Math.round(gz / ChunkManager.CHUNK_SIZE)));
      const chunkKey = `${chunkX},${chunkZ}`;
      this.obstacleManager.addObstacle(chunkKey, {
        x: gx,
        z: gz,
        radius: 1.5,
        type: 'altar'
      });
      occupied.push({ x: gx, z: gz, radius: 9.5 });
    }

    // 4. Chests Placement (deterministic, non-overlapping)
    if (chestManager) {
      const placedChests = chestManager.generateStageChests(
        0,
        0,
        15,
        stageNumber,
        rng,
        occupied,
        (x, z) => this.elevation.getElevation(x, z)
      );
      for (const c of placedChests) {
        occupied.push(c);
      }
    }

    // 5. Build terrain chunks across all 100 chunks

    for (let cx = ChunkManager.MIN_CHUNK; cx <= ChunkManager.MAX_CHUNK; cx++) {
      for (let cz = ChunkManager.MIN_CHUNK; cz <= ChunkManager.MAX_CHUNK; cz++) {
        const key = `${cx},${cz}`;
        const chunkGroup = new Group();

        const worldCenterX = cx * ChunkManager.CHUNK_SIZE;
        const worldCenterZ = cz * ChunkManager.CHUNK_SIZE;

        const minX = worldCenterX - ChunkManager.CHUNK_SIZE / 2 - 1;
        const minZ = worldCenterZ - ChunkManager.CHUNK_SIZE / 2 - 1;
        const maxX = worldCenterX + ChunkManager.CHUNK_SIZE / 2 + 1;
        const maxZ = worldCenterZ + ChunkManager.CHUNK_SIZE / 2 + 1;

        (chunkGroup as any).boundingBox = new Box3(
          new Vector3(minX, -6, minZ),
          new Vector3(maxX, 22, maxZ)
        );

        // Flat 2D/2.5D Floor Geometry with continuous world UVs
        const floorGeom = new PlaneGeometry(
          ChunkManager.CHUNK_SIZE,
          ChunkManager.CHUNK_SIZE,
          1,
          1
        );
        floorGeom.rotateX(-Math.PI / 2);

        const posAttr = floorGeom.attributes.position;
        const normAttr = floorGeom.attributes.normal;
        const uvAttr = floorGeom.attributes.uv;

        for (let i = 0; i < posAttr.count; i++) {
          const lx = posAttr.getX(i);
          const lz = posAttr.getZ(i);
          const wx = worldCenterX + lx;
          const wz = worldCenterZ + lz;

          posAttr.setY(i, 0);
          normAttr.setXYZ(i, 0, 1, 0);

          // Continuous world-space UV coordinates across all chunks (12m per texture repeat)
          uvAttr.setXY(i, wx / 12.0, wz / 12.0);
        }

        posAttr.needsUpdate = true;
        normAttr.needsUpdate = true;
        uvAttr.needsUpdate = true;

        const floorMesh = new Mesh(floorGeom, TerrainMaterials.sandMaterial);
        floorMesh.position.set(worldCenterX, 0, worldCenterZ);
        floorMesh.receiveShadow = true;
        chunkGroup.add(floorMesh);

        this.activeChunks.set(key, chunkGroup);
        if (!this.isDeclarative) {
          this.scene.add(chunkGroup);
        }
        for (const listener of this.chunkListeners) {
          listener('add', key, chunkGroup);
        }
      }
    }

    // 6. Procedural Rough Terrain Zones (Dunes & Barchans in Desert, Biome equivalents)
    this.roughTerrainManager.generateForStage(
      stageNumber,
      rng,
      occupied,
      (key, mesh) => {
        const chunkGroup = this.activeChunks.get(key);
        if (chunkGroup) {
          chunkGroup.add(mesh);
        } else {
          this.scene.add(mesh);
        }
      },
      biomeId
    );

    // 7. Pseudo-3D Biome Trees with directional silhouette shadows
    TreeManager.generateTreesForChunks(
      biomeId || 'ashen_wastes',
      rng,
      this.activeChunks,
      occupied,
      this.obstacleManager,
      ChunkManager.CHUNK_SIZE,
      ChunkManager.MIN_CHUNK,
      ChunkManager.MAX_CHUNK
    );
  }

  /**
   * With the fixed preloaded map, update does not need to stream or unload chunks.
   * Runs in 0ms without runtime memory allocation.
   */
  public update(_playerPos: Vector3 | Vector3[]) {
    // Fixed preloaded map: zero runtime streaming overhead!
  }

  /**
   * Frustum Culling: Hides chunks that are completely outside the camera view.
   * Keeps active rendering to only the 6-9 chunks in front of the camera.
   */
  public cull(frustum: Frustum) {
    for (const group of this.activeChunks.values()) {
      const box = (group as any).boundingBox as Box3 | undefined;
      if (box) {
        group.visible = frustum.intersectsBox(box);
      }
    }
  }

  /**
   * Deep cleanup of all chunk geometries and entities.
   */
  public clear() {
    for (const [key, group] of this.activeChunks.entries()) {
      if (!this.isDeclarative) {
        this.scene.remove(group);
      }
      for (const listener of this.chunkListeners) {
        listener('remove', key, group);
      }
      group.traverse((obj) => {
        if (obj instanceof Mesh) {
          obj.geometry.dispose();
        }
      });
    }
    this.activeChunks.clear();
    for (const listener of this.chunkListeners) {
      listener('reset');
    }

    for (const oasis of this.oasisGroups) {
      this.scene.remove(oasis);
      oasis.traverse((obj) => {
        if (obj instanceof Mesh) {
          obj.geometry.dispose();
        }
      });
    }
    this.oasisGroups = [];

    this.roughTerrainManager.clear();
    this.altarManager.clear();
    this.obstacleManager.clear();
  }
}
