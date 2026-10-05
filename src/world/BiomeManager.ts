import * as THREE from 'three';
import { TerrainMaterials } from './TerrainProps';

export interface BiomeConfig {
  id: string;
  stageNumber: number;
  name: string;
  nameEn: string;
  fogColor: number;
  fogDensity: number;
  backgroundColor: number;
  ambientColor: number;
  sunColor: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  groundTint: number;
  description: string;
  roughness?: number;
  metalness?: number;
  rockColor?: number;
  foliageColor?: number;
}

export const BIOMES: BiomeConfig[] = [
  {
    id: 'ashen_wastes',
    stageNumber: 1,
    name: 'Пепельные Пустыни',
    nameEn: 'The Ashen Wastes',
    fogColor: 0x23140e,
    fogDensity: 0.016,
    backgroundColor: 0x23140e,
    ambientColor: 0x8a4216,
    sunColor: 0xffedd5,
    hemiSkyColor: 0xfb923c,
    hemiGroundColor: 0x241209,
    groundTint: 0xc78446,
    description: 'Бескрайние барханы и ржавые дюны, усеянные обломками спасательных капсул.',
    roughness: 0.90,
    metalness: 0.04,
    rockColor: 0x8a5433,
    foliageColor: 0x5a6336
  },
  {
    id: 'derelict_sector',
    stageNumber: 2,
    name: 'Комплекс «Омега»',
    nameEn: 'Derelict Sector 7',
    fogColor: 0x0a1420,
    fogDensity: 0.018,
    backgroundColor: 0x0a1420,
    ambientColor: 0x1e3a5f,
    sunColor: 0x7dd3fc,
    hemiSkyColor: 0x38bdf8,
    hemiGroundColor: 0x030712,
    groundTint: 0x334155,
    description: 'Заброшенный исследовательский комплекс предтеч с поврежденными защитными матрицами.',
    roughness: 0.55,
    metalness: 0.35,
    rockColor: 0x334155,
    foliageColor: 0x1e293b
  },
  {
    id: 'bioluminescent_wilds',
    stageNumber: 3,
    name: 'Ксено-Джунгли',
    nameEn: 'Bioluminescent Wilds',
    fogColor: 0x110c1f,
    fogDensity: 0.02,
    backgroundColor: 0x110c1f,
    ambientColor: 0x4c1d95,
    sunColor: 0xa7f3d0,
    hemiSkyColor: 0x10b981,
    hemiGroundColor: 0x2e1065,
    groundTint: 0x1e1b4b,
    description: 'Светящиеся грибные заросли и токсичные споровые каньоны.',
    roughness: 0.75,
    metalness: 0.08,
    rockColor: 0x2e1065,
    foliageColor: 0x10b981
  },
  {
    id: 'volcanic_caldera',
    stageNumber: 4,
    name: 'Базальтовая Кальдера',
    nameEn: 'Volcanic Forge',
    fogColor: 0x1f0b08,
    fogDensity: 0.019,
    backgroundColor: 0x1f0b08,
    ambientColor: 0x7f1d1d,
    sunColor: 0xfca5a5,
    hemiSkyColor: 0xef4444,
    hemiGroundColor: 0x1c0604,
    groundTint: 0x27272a,
    description: 'Раскаленный обсидиан, реки кипящей лавы и геотермальные жерла.',
    roughness: 0.85,
    metalness: 0.15,
    rockColor: 0x18181b,
    foliageColor: 0xd97706
  },
  {
    id: 'primordial_ruins',
    stageNumber: 5,
    name: 'Руины Предтеч',
    nameEn: 'Primordial Monoliths',
    fogColor: 0x161324,
    fogDensity: 0.017,
    backgroundColor: 0x161324,
    ambientColor: 0x581c87,
    sunColor: 0xfef08a,
    hemiSkyColor: 0xeab308,
    hemiGroundColor: 0x3b0764,
    groundTint: 0x475569,
    description: 'Парящие золотые обелиски и антигравитационные плиты древней расы.',
    roughness: 0.70,
    metalness: 0.20,
    rockColor: 0x475569,
    foliageColor: 0xca8a04
  },
  {
    id: 'rift_core',
    stageNumber: 6,
    name: 'Ядро Разлома',
    nameEn: 'The Rift Core',
    fogColor: 0x0f0728,
    fogDensity: 0.022,
    backgroundColor: 0x0f0728,
    ambientColor: 0x6b21a8,
    sunColor: 0xf43f5e,
    hemiSkyColor: 0xec4899,
    hemiGroundColor: 0x180838,
    groundTint: 0x09090b,
    description: 'Эпицентр пространственного разлома. Площадка финальной эвакуации!',
    roughness: 0.60,
    metalness: 0.28,
    rockColor: 0x180838,
    foliageColor: 0xec4899
  }
];

export class BiomeManager {
  public currentStageIndex: number = 0;
  private static biomeTextures = new Map<string, THREE.Texture>();
  private static textureLoader = new THREE.TextureLoader();

  public static getBiomeTexture(biomeId: string): THREE.Texture {
    let tex = this.biomeTextures.get(biomeId);
    if (!tex) {
      tex = this.textureLoader.load(`/textures/biomes/biome_${biomeId}.jpg`);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      // Preserve slightly pixelated stylized look requested by the user
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      this.biomeTextures.set(biomeId, tex);
    }
    return tex;
  }

  public get currentBiome(): BiomeConfig {
    return BIOMES[Math.min(this.currentStageIndex, BIOMES.length - 1)];
  }

  public get stageNumber(): number {
    return this.currentStageIndex + 1;
  }

  /**
   * Applies the current biome's atmosphere, lighting, fog, textures and materials to the Three.js scene.
   */
  public applyBiomeToScene(scene: THREE.Scene) {
    const biome = this.currentBiome;

    // 1. Fog & Background
    scene.background = new THREE.Color(biome.backgroundColor);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.setHex(biome.fogColor);
      scene.fog.density = biome.fogDensity;
    } else {
      scene.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity);
    }

    // 2. Lights in the scene
    scene.traverse((obj) => {
      if (obj instanceof THREE.AmbientLight) {
        obj.color.setHex(biome.ambientColor);
      } else if (obj instanceof THREE.DirectionalLight) {
        obj.color.setHex(biome.sunColor);
      } else if (obj instanceof THREE.HemisphereLight) {
        obj.color.setHex(biome.hemiSkyColor);
        obj.groundColor.setHex(biome.hemiGroundColor);
      }
    });

    // 3. Terrain Ground Texture & Material Tuning
    if (TerrainMaterials.sandMaterial) {
      const tex = BiomeManager.getBiomeTexture(biome.id);
      TerrainMaterials.sandMaterial.map = tex;
      TerrainMaterials.sandMaterial.color.setHex(0xffffff);
      TerrainMaterials.sandMaterial.roughness = biome.roughness ?? 0.88;
      TerrainMaterials.sandMaterial.metalness = biome.metalness ?? 0.05;
      TerrainMaterials.sandMaterial.needsUpdate = true;
    }

    // 4. Props Material Tuning to match Biome
    if (TerrainMaterials.rockMaterial && biome.rockColor !== undefined) {
      TerrainMaterials.rockMaterial.color.setHex(biome.rockColor);
      TerrainMaterials.rockMaterial.needsUpdate = true;
    }
    if (TerrainMaterials.foliageMaterial && biome.foliageColor !== undefined) {
      TerrainMaterials.foliageMaterial.color.setHex(biome.foliageColor);
      TerrainMaterials.foliageMaterial.needsUpdate = true;
    }
  }

  /**
   * Sets the current stage explicitly (1-based index).
   */
  public setStage(stageNumber: number): BiomeConfig {
    this.currentStageIndex = Math.max(0, stageNumber - 1) % BIOMES.length;
    return this.currentBiome;
  }

  /**
   * Advances to the next stage/biome.
   */
  public advanceStage(): BiomeConfig {
    this.currentStageIndex++;
    if (this.currentStageIndex >= BIOMES.length) {
      // Loop over or stay at final
      this.currentStageIndex = 0; // Looping like in RoR2!
    }
    return this.currentBiome;
  }

  public reset() {
    this.currentStageIndex = 0;
  }
}
