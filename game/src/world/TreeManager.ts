import {
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  PlaneGeometry,
  RGBADepthPacking,
  DoubleSide,
  Texture,
  TextureLoader,
  SRGBColorSpace,
  NearestFilter,
  LinearMipmapLinearFilter,
  Group
} from 'three';
import { getAssetUrl } from '../utils/assetPath';
import { SeededRNG } from '../core/SeededRNG';
import { OccupiedArea } from './ChunkManager';
import { ObstacleManager } from './ObstacleManager';

export interface TreeTypeConfig {
  texturePath: string;
  width: number;
  height: number;
  trunkRadius: number;
  minScale: number;
  maxScale: number;
  treesPerChunkMin: number;
  treesPerChunkMax: number;
}

export const BIOME_TREE_CONFIGS: Record<string, TreeTypeConfig> = {
  ashen_wastes: {
    texturePath: '/textures/trees/tree_desert.png',
    width: 3.4,
    height: 3.35,
    trunkRadius: 0.45,
    minScale: 0.85,
    maxScale: 1.2,
    treesPerChunkMin: 1,
    treesPerChunkMax: 3
  },
  derelict_sector: {
    texturePath: '/textures/trees/tree_cyber.png',
    width: 3.4,
    height: 4.38,
    trunkRadius: 0.5,
    minScale: 0.85,
    maxScale: 1.2,
    treesPerChunkMin: 1,
    treesPerChunkMax: 3
  },
  bioluminescent_wilds: {
    texturePath: '/textures/trees/tree_bioluminescent.png',
    width: 3.5,
    height: 5.16,
    trunkRadius: 0.55,
    minScale: 0.85,
    maxScale: 1.25,
    treesPerChunkMin: 2,
    treesPerChunkMax: 4
  },
  volcanic_caldera: {
    texturePath: '/textures/trees/tree_volcanic.png',
    width: 3.4,
    height: 4.43,
    trunkRadius: 0.5,
    minScale: 0.85,
    maxScale: 1.2,
    treesPerChunkMin: 1,
    treesPerChunkMax: 3
  },
  primordial_ruins: {
    texturePath: '/textures/trees/tree_primordial.png',
    width: 3.6,
    height: 4.25,
    trunkRadius: 0.55,
    minScale: 0.85,
    maxScale: 1.2,
    treesPerChunkMin: 2,
    treesPerChunkMax: 3
  },
  rift_core: {
    texturePath: '/textures/trees/tree_primordial.png',
    width: 3.6,
    height: 4.25,
    trunkRadius: 0.55,
    minScale: 0.85,
    maxScale: 1.2,
    treesPerChunkMin: 1,
    treesPerChunkMax: 2
  }
};

export class TreeManager {
  private static loader = new TextureLoader();
  private static textureCache = new Map<string, Texture>();
  private static geometryCache = new Map<string, PlaneGeometry>();
  private static materialCache = new Map<string, MeshBasicMaterial>();
  private static depthMaterialCache = new Map<string, MeshDepthMaterial>();

  public static getTexture(texturePath: string): Texture {
    let tex = this.textureCache.get(texturePath);
    if (!tex) {
      if (typeof document === 'undefined') {
        tex = new Texture();
      } else {
        tex = this.loader.load(getAssetUrl(texturePath));
      }
      tex.colorSpace = SRGBColorSpace;
      tex.magFilter = NearestFilter;
      tex.minFilter = LinearMipmapLinearFilter;
      this.textureCache.set(texturePath, tex);
    }
    return tex;
  }

  public static getGeometry(biomeId: string, config: TreeTypeConfig): PlaneGeometry {
    let geom = this.geometryCache.get(biomeId);
    if (!geom) {
      geom = new PlaneGeometry(config.width, config.height);
      // Translate Y so anchor pivot (y = 0) is at the base of the trunk
      geom.translate(0, config.height / 2, 0);
      this.geometryCache.set(biomeId, geom);
    }
    return geom;
  }

  public static getMaterial(biomeId: string, texturePath: string): MeshBasicMaterial {
    let mat = this.materialCache.get(biomeId);
    if (!mat) {
      const tex = this.getTexture(texturePath);
      mat = new MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.15,
        side: DoubleSide,
        depthWrite: true,
        depthTest: true
      });
      this.materialCache.set(biomeId, mat);
    }
    return mat;
  }

  public static getDepthMaterial(biomeId: string, texturePath: string): MeshDepthMaterial {
    let depthMat = this.depthMaterialCache.get(biomeId);
    if (!depthMat) {
      const tex = this.getTexture(texturePath);
      depthMat = new MeshDepthMaterial({
        depthPacking: RGBADepthPacking,
        map: tex,
        alphaTest: 0.25
      });
      this.depthMaterialCache.set(biomeId, depthMat);
    }
    return depthMat;
  }

  /**
   * Creates a pseudo-3D tree mesh with directional silhouette shadow matching monsters and heroes.
   */
  public static createTreeMesh(biomeId: string, config: TreeTypeConfig): Mesh {
    const geom = this.getGeometry(biomeId, config);
    const mat = this.getMaterial(biomeId, config.texturePath);
    const depthMat = this.getDepthMaterial(biomeId, config.texturePath);

    const mesh = new Mesh(geom, mat);
    // Tilted towards isometric camera identically to Player and Enemy sprite meshes
    mesh.rotation.x = -Math.PI / 4.8;
    mesh.renderOrder = 0;
    mesh.customDepthMaterial = depthMat;
    mesh.castShadow = true;
    mesh.receiveShadow = false;

    return mesh;
  }

  /**
   * Generates pseudo-3D trees across chunks for the specified biome.
   */
  public static generateTreesForChunks(
    biomeId: string,
    rng: SeededRNG,
    activeChunks: Map<string, Group>,
    occupied: OccupiedArea[],
    obstacleManager: ObstacleManager,
    chunkSize: number = 50,
    minChunk: number = -4,
    maxChunk: number = 4
  ): void {
    const config = BIOME_TREE_CONFIGS[biomeId] || BIOME_TREE_CONFIGS.ashen_wastes;

    for (let cx = minChunk; cx <= maxChunk; cx++) {
      for (let cz = minChunk; cz <= maxChunk; cz++) {
        const key = `${cx},${cz}`;
        const chunkGroup = activeChunks.get(key);
        if (!chunkGroup) continue;

        const numTrees = Math.floor(
          rng.range(config.treesPerChunkMin, config.treesPerChunkMax + 1)
        );

        for (let i = 0; i < numTrees; i++) {
          // Attempt placement up to 4 times
          for (let attempt = 0; attempt < 4; attempt++) {
            const offsetX = rng.range(-chunkSize * 0.42, chunkSize * 0.42);
            const offsetZ = rng.range(-chunkSize * 0.42, chunkSize * 0.42);
            const worldX = cx * chunkSize + offsetX;
            const worldZ = cz * chunkSize + offsetZ;

            // Check collision against occupied regions (spawn, teleporter, chests, altars, other trees)
            let collides = false;
            for (let o = 0; o < occupied.length; o++) {
              const occ = occupied[o];
              const dx = worldX - occ.x;
              const dz = worldZ - occ.z;
              const minDist = occ.radius + config.trunkRadius + 0.8;
              if (dx * dx + dz * dz < minDist * minDist) {
                collides = true;
                break;
              }
            }

            if (collides) continue;

            // Valid position! Instantiate tree
            const treeMesh = this.createTreeMesh(biomeId, config);
            const scale = rng.range(config.minScale, config.maxScale);
            const flip = rng.next() < 0.5 ? -1 : 1;
            treeMesh.scale.set(scale * flip, scale, scale);
            treeMesh.position.set(worldX, 0, worldZ);

            chunkGroup.add(treeMesh);

            // Register obstacle collision for trunk
            obstacleManager.addObstacle(key, {
              x: worldX,
              z: worldZ,
              radius: config.trunkRadius * scale,
              type: 'tree'
            });

            // Mark area occupied so trees do not overlap
            occupied.push({
              x: worldX,
              z: worldZ,
              radius: config.trunkRadius * scale + 1.2
            });

            break;
          }
        }
      }
    }
  }
}
