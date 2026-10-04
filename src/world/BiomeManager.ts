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
    description: 'Бескрайние барханы и ржавые дюны, усеянные обломками спасательных капсул.'
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
    description: 'Заброшенный исследовательский комплекс предтеч с поврежденными защитными матрицами.'
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
    description: 'Светящиеся грибные заросли и токсичные споровые каньоны.'
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
    description: 'Раскаленный обсидиан, реки кипящей лавы и геотермальные жерла.'
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
    description: 'Парящие золотые обелиски и антигравитационные плиты древней расы.'
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
    description: 'Эпицентр пространственного разлома. Площадка финальной эвакуации!'
  }
];

export class BiomeManager {
  public currentStageIndex: number = 0;

  public get currentBiome(): BiomeConfig {
    return BIOMES[Math.min(this.currentStageIndex, BIOMES.length - 1)];
  }

  public get stageNumber(): number {
    return this.currentStageIndex + 1;
  }

  /**
   * Applies the current biome's atmosphere, lighting, and fog to the Three.js scene.
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

    // 3. Terrain Ground Tint
    if (TerrainMaterials.sandMaterial) {
      TerrainMaterials.sandMaterial.color.setHex(biome.groundTint);
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
