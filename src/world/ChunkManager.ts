import * as THREE from 'three';
import { TerrainProps, TerrainMaterials } from './TerrainProps';
import { Altar } from './Altar';
import { AltarManager } from './AltarManager';
import { ObstacleManager } from './ObstacleManager';
import { BuffType } from '../entities/Player';
import { SeededRNG } from '../core/SeededRNG';
import { ChestManager } from './ChestManager';
import { RiftTeleporter } from './RiftTeleporter';
import { TerrainElevation } from './TerrainElevation';
import { RoughTerrainManager } from './RoughTerrainManager';

export interface OccupiedArea {
  x: number;
  z: number;
  radius: number;
}

export class ChunkManager {
  private scene: THREE.Scene;
  private altarManager: AltarManager;
  private obstacleManager: ObstacleManager;

  // Fixed World Dimensions: 500x500 meters (10x10 chunks of 50m each)
  public static readonly CHUNK_SIZE = 50;
  public static readonly GRID_SIZE = 10;
  public static readonly MAP_SIZE = 500;
  public static readonly HALF_MAP = 250;
  public static readonly MIN_CHUNK = -5;
  public static readonly MAX_CHUNK = 4; // -5 to 4 inclusive = 10 chunks

  public currentSeed: number = 1337;
  public currentSeedString: string = '1337';

  public elevation: TerrainElevation = new TerrainElevation(1337);
  public roughTerrainManager: RoughTerrainManager;
  private oasisGroups: THREE.Group[] = [];
  private activeChunks = new Map<string, THREE.Group>();

  constructor(scene: THREE.Scene, altarManager: AltarManager, obstacleManager: ObstacleManager) {
    this.scene = scene;
    this.altarManager = altarManager;
    this.obstacleManager = obstacleManager;
    this.roughTerrainManager = new RoughTerrainManager(this.scene);
    TerrainMaterials.init();
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
  public getNormal(x: number, z: number, target?: THREE.Vector3): THREE.Vector3 {
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
    stageNumber: number = 1
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

    // 2. Teleporter Placement
    let teleX = 75;
    let teleZ = 75;
    if (riftTeleporter) {
      // Pick deterministic sector away from spawn
      const teleAngle = rng.range(0, Math.PI * 2);
      const teleDist = rng.range(110, 165);
      teleX = Math.cos(teleAngle) * teleDist;
      teleZ = Math.sin(teleAngle) * teleDist;
      riftTeleporter.resetForStage(new THREE.Vector3(teleX, 0, teleZ));
      occupied.push({ x: teleX, z: teleZ, radius: 18.0 });
    }

    // 3. Exactly 3 Altars (radially distributed, never close to each other)
    const buffPool: BuffType[] = ['damage', 'speed', 'regen', 'invulnerable'];
    rng.shuffle(buffPool);
    const chosenBuffs = buffPool.slice(0, 3);

    const baseAltarAngle = rng.range(0, Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      const sectorAngle = baseAltarAngle + (i * (Math.PI * 2 / 3)) + rng.range(-0.25, 0.25);
      const dist = rng.range(85, 160);
      const ax = Math.cos(sectorAngle) * dist;
      const az = Math.sin(sectorAngle) * dist;

      const altar = new Altar(chosenBuffs[i], new THREE.Vector3(ax, 0, az));
      this.altarManager.registerAltar(altar);

      const altarChunkKey = `${Math.floor(ax / ChunkManager.CHUNK_SIZE)},${Math.floor(az / ChunkManager.CHUNK_SIZE)}`;
      this.obstacleManager.addObstacle(altarChunkKey, {
        x: ax,
        z: az,
        radius: 1.5,
        type: 'altar'
      });

      occupied.push({ x: ax, z: az, radius: 9.5 });
    }

    // 3.5. Oases Placement (Majestic desert oasis sanctuary with water & palms; solid collision)
    const oasisCount = 2;
    for (let o = 0; o < oasisCount; o++) {
      const oasisAngle = (o * Math.PI) + rng.range(0.35, 0.85);
      const oasisDist = rng.range(80, 140);
      const ox = Math.cos(oasisAngle) * oasisDist;
      const oz = Math.sin(oasisAngle) * oasisDist;

      const oasis = TerrainProps.createOasis(() => rng.next());
      oasis.group.position.set(ox, 0, oz);
      this.scene.add(oasis.group);
      this.oasisGroups.push(oasis.group);

      const chunkX = Math.max(ChunkManager.MIN_CHUNK, Math.min(ChunkManager.MAX_CHUNK, Math.floor(ox / ChunkManager.CHUNK_SIZE)));
      const chunkZ = Math.max(ChunkManager.MIN_CHUNK, Math.min(ChunkManager.MAX_CHUNK, Math.floor(oz / ChunkManager.CHUNK_SIZE)));
      const chunkKey = `${chunkX},${chunkZ}`;

      this.obstacleManager.addObstacle(chunkKey, {
        x: ox,
        z: oz,
        radius: oasis.radius,
        type: 'oasis'
      });

      // Clearance area to prevent overlapping props, chests, or dunes
      occupied.push({ x: ox, z: oz, radius: oasis.radius + 6.0 });
    }

    // 4. Chests Placement (deterministic, non-overlapping)
    if (chestManager) {
      const placedChests = chestManager.generateStageChests(
        0,
        0,
        16,
        1,
        rng,
        occupied,
        (x, z) => this.elevation.getElevation(x, z)
      );
      for (const c of placedChests) {
        occupied.push(c);
      }
    }

    // 5. Environmental Obstacles across all 100 chunks
    // Guarantee that obstacles do NOT cluster and have minimum 6.5m distance between each other
    const placedObstaclePositions: { x: number; z: number }[] = [];

    for (let cx = ChunkManager.MIN_CHUNK; cx <= ChunkManager.MAX_CHUNK; cx++) {
      for (let cz = ChunkManager.MIN_CHUNK; cz <= ChunkManager.MAX_CHUNK; cz++) {
        const key = `${cx},${cz}`;
        const chunkGroup = new THREE.Group();

        const worldCenterX = cx * ChunkManager.CHUNK_SIZE + ChunkManager.CHUNK_SIZE / 2;
        const worldCenterZ = cz * ChunkManager.CHUNK_SIZE + ChunkManager.CHUNK_SIZE / 2;

        const minX = cx * ChunkManager.CHUNK_SIZE - 1;
        const minZ = cz * ChunkManager.CHUNK_SIZE - 1;
        const maxX = (cx + 1) * ChunkManager.CHUNK_SIZE + 1;
        const maxZ = (cz + 1) * ChunkManager.CHUNK_SIZE + 1;

        (chunkGroup as any).boundingBox = new THREE.Box3(
          new THREE.Vector3(minX, -6, minZ),
          new THREE.Vector3(maxX, 22, maxZ)
        );

        // Flat 2D/2.5D Floor Geometry with continuous world UVs
        const floorGeom = new THREE.PlaneGeometry(
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

        const floorMesh = new THREE.Mesh(floorGeom, TerrainMaterials.sandMaterial);
        floorMesh.position.set(worldCenterX, 0, worldCenterZ);
        floorMesh.receiveShadow = true;
        chunkGroup.add(floorMesh);

        // Scattered 3D Props with strict separation
        const candidateCount = 8;
        let chunkObstaclesCount = 0;

        for (let a = 0; a < candidateCount && chunkObstaclesCount < 4; a++) {
          const candX = cx * ChunkManager.CHUNK_SIZE + rng.range(5.0, 45.0);
          const candZ = cz * ChunkManager.CHUNK_SIZE + rng.range(5.0, 45.0);

          // Boundary safe margin
          if (Math.abs(candX) > 235 || Math.abs(candZ) > 235) continue;

          // Distance check to all occupied zones (spawn, teleporter, altars, chests)
          let overlapsOccupied = false;
          for (const occ of occupied) {
            if (Math.hypot(candX - occ.x, candZ - occ.z) < occ.radius + 3.0) {
              overlapsOccupied = true;
              break;
            }
          }
          if (overlapsOccupied) continue;

          // Strict separation from all existing obstacles (minimum 6.8m)
          let tooCloseToOtherObstacle = false;
          for (const obs of placedObstaclePositions) {
            if (Math.hypot(candX - obs.x, candZ - obs.z) < 6.8) {
              tooCloseToOtherObstacle = true;
              break;
            }
          }
          if (tooCloseToOtherObstacle) continue;

          // Valid placement! Choose prop type
          const propRoll = rng.next();
          let prop: THREE.Group;
          let obsRadius = 0.55;
          let obsType: 'cactus' | 'tree' | 'boulder' | 'landmark' = 'cactus';

          if (propRoll < 0.40) {
            prop = TerrainProps.createCactus(() => rng.next());
            obsRadius = 0.55;
            obsType = 'cactus';
          } else if (propRoll < 0.70) {
            prop = TerrainProps.createTree(() => rng.next());
            obsRadius = 0.70;
            obsType = 'tree';
          } else if (propRoll < 0.88) {
            prop = TerrainProps.createBoulder(() => rng.next());
            obsRadius = 0.95;
            obsType = 'boulder';
          } else {
            prop = rng.next() < 0.5
              ? TerrainProps.createWagonWheel(() => rng.next())
              : TerrainProps.createTrailPost(() => rng.next());
            obsRadius = 0.50;
            obsType = 'landmark';
          }

          prop.position.set(candX, 0, candZ);
          chunkGroup.add(prop);

          this.obstacleManager.addObstacle(key, {
            x: candX,
            z: candZ,
            radius: obsRadius,
            type: obsType
          });

          placedObstaclePositions.push({ x: candX, z: candZ });
          chunkObstaclesCount++;
        }

        // Secondary purely visual sagebrush tufts (no collision, 2-3 per chunk)
        const scrubCount = 2 + rng.rangeInt(0, 1);
        for (let s = 0; s < scrubCount; s++) {
          const sx = cx * ChunkManager.CHUNK_SIZE + rng.range(4.0, 46.0);
          const sz = cz * ChunkManager.CHUNK_SIZE + rng.range(4.0, 46.0);
          if (Math.hypot(sx, sz) < 10.0) continue;

          const scrub = TerrainProps.createScrub(() => rng.next());
          scrub.position.set(sx, 0, sz);
          chunkGroup.add(scrub);
        }

        this.activeChunks.set(key, chunkGroup);
        this.scene.add(chunkGroup);
      }
    }

    // 6. Natural Perimeter Canyon Boulders along the 500x500 map borders
    this.generatePerimeterBoulders(rng);

    // 7. Procedural Rough Terrain Zones (Dunes & Barchans in Desert, Biome equivalents)
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
      }
    );
  }

  /**
   * Generates decorative and solid perimeter rock formations along boundaries.
   */
  private generatePerimeterBoulders(rng: SeededRNG) {
    const margin = 244;
    const step = 9.5;

    for (let coord = -margin; coord <= margin; coord += step) {
      // North & South walls
      this.placeBoundaryRock(coord, margin, rng);
      this.placeBoundaryRock(coord, -margin, rng);

      // East & West walls
      this.placeBoundaryRock(margin, coord, rng);
      this.placeBoundaryRock(-margin, coord, rng);
    }
  }

  private placeBoundaryRock(x: number, z: number, rng: SeededRNG) {
    const cx = Math.max(ChunkManager.MIN_CHUNK, Math.min(ChunkManager.MAX_CHUNK, Math.floor(x / ChunkManager.CHUNK_SIZE)));
    const cz = Math.max(ChunkManager.MIN_CHUNK, Math.min(ChunkManager.MAX_CHUNK, Math.floor(z / ChunkManager.CHUNK_SIZE)));
    const key = `${cx},${cz}`;
    const chunkGroup = this.activeChunks.get(key);
    if (!chunkGroup) return;

    const boulder = TerrainProps.createBoulder(() => rng.next());
    const scale = 1.35 + rng.range(0, 0.45);
    boulder.scale.set(scale, scale * 1.2, scale);
    boulder.position.set(x, 0, z);
    chunkGroup.add(boulder);

    this.obstacleManager.addObstacle(key, {
      x,
      z,
      radius: 2.2 * scale,
      type: 'boulder'
    });
  }

  /**
   * With the fixed preloaded map, update does not need to stream or unload chunks.
   * Runs in 0ms without runtime memory allocation.
   */
  public update(_playerPos: THREE.Vector3 | THREE.Vector3[]) {
    // Fixed preloaded map: zero runtime streaming overhead!
  }

  /**
   * Frustum Culling: Hides chunks that are completely outside the camera view.
   * Keeps active rendering to only the 6-9 chunks in front of the camera.
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
   * Deep cleanup of all chunk geometries and entities.
   */
  public clear() {
    for (const group of this.activeChunks.values()) {
      this.scene.remove(group);
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
    }
    this.activeChunks.clear();

    for (const oasis of this.oasisGroups) {
      this.scene.remove(oasis);
      oasis.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
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
