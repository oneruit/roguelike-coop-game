import {
  Texture,
  TextureLoader,
  RepeatWrapping,
  SRGBColorSpace,
  NearestFilter,
  LinearMipmapLinearFilter,
  type Scene,
  Color,
  FogExp2,
  AmbientLight,
  DirectionalLight,
  HemisphereLight
} from 'three';
import { TerrainMaterials } from './TerrainProps';
import { getAssetUrl } from '../utils/assetPath';

export interface BiomeLightingConfig {
  fogColor: number;
  fogDensity: number;
  backgroundColor: number;
  ambientColor: number;
  lightColor: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
}

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
  night?: Partial<BiomeLightingConfig>;
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
    foliageColor: 0x5a6336,
    night: {
      fogColor: 0x0c1424,
      fogDensity: 0.015,
      backgroundColor: 0x0c1424,
      ambientColor: 0x2c4166,
      lightColor: 0xa5cbf5,
      hemiSkyColor: 0x38bdf8,
      hemiGroundColor: 0x111827
    }
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
    foliageColor: 0x1e293b,
    night: {
      fogColor: 0x050c18,
      fogDensity: 0.017,
      backgroundColor: 0x050c18,
      ambientColor: 0x152942,
      lightColor: 0x60a5fa,
      hemiSkyColor: 0x2563eb,
      hemiGroundColor: 0x020617
    }
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
    foliageColor: 0x10b981,
    night: {
      fogColor: 0x0a0518,
      fogDensity: 0.018,
      backgroundColor: 0x0a0518,
      ambientColor: 0x3b156b,
      lightColor: 0x67e8f9,
      hemiSkyColor: 0x06b6d4,
      hemiGroundColor: 0x1e0836
    }
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
    foliageColor: 0xd97706,
    night: {
      fogColor: 0x120406,
      fogDensity: 0.017,
      backgroundColor: 0x120406,
      ambientColor: 0x450a0a,
      lightColor: 0xf87171,
      hemiSkyColor: 0xdc2626,
      hemiGroundColor: 0x0f0203
    }
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
    foliageColor: 0xca8a04,
    night: {
      fogColor: 0x0f0a20,
      fogDensity: 0.016,
      backgroundColor: 0x0f0a20,
      ambientColor: 0x381861,
      lightColor: 0xc084fc,
      hemiSkyColor: 0xa855f7,
      hemiGroundColor: 0x1a0933
    }
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
    foliageColor: 0xec4899,
    night: {
      fogColor: 0x07021a,
      fogDensity: 0.020,
      backgroundColor: 0x07021a,
      ambientColor: 0x4c1178,
      lightColor: 0xf472b6,
      hemiSkyColor: 0xdb2777,
      hemiGroundColor: 0x0d0221
    }
  }
];

export class BiomeManager {
  public currentStageIndex: number = 0;
  public currentTimeOfDay: 'day' | 'night' = 'day';
  public activeRunBiomes: BiomeConfig[] = [];
  private static biomeTextures = new Map<string, Texture>();
  private static textureLoader = new TextureLoader();

  constructor() {
    this.initRunBiomes();
  }

  public initRunBiomes(seed?: number): BiomeConfig[] {
    const regularBiomes = BIOMES.filter(b => b.id !== 'rift_core');
    const riftCore = BIOMES.find(b => b.id === 'rift_core')!;

    // Seeded or random shuffle of the 5 non-final biomes
    const shuffled = [...regularBiomes];
    let s = typeof seed === 'number' ? seed : Math.floor(Math.random() * 1000000);
    for (let i = shuffled.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }

    // Pick 3 random biomes and append rift_core as the 4th (final) biome
    this.activeRunBiomes = [
      { ...shuffled[0], stageNumber: 1 },
      { ...shuffled[1], stageNumber: 2 },
      { ...shuffled[2], stageNumber: 3 },
      { ...riftCore, stageNumber: 4 }
    ];
    this.currentStageIndex = 0;
    return this.activeRunBiomes;
  }

  public static getBiomeTexture(biomeId: string): Texture {
    let tex = this.biomeTextures.get(biomeId);
    if (!tex) {
      tex = this.textureLoader.load(getAssetUrl(`/textures/biomes/biome_${biomeId}.jpg`));
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
      tex.colorSpace = SRGBColorSpace;
      // Preserve slightly pixelated stylized look requested by the user
      tex.magFilter = NearestFilter;
      tex.minFilter = LinearMipmapLinearFilter;
      this.biomeTextures.set(biomeId, tex);
    }
    return tex;
  }

  public get currentBiome(): BiomeConfig {
    if (this.activeRunBiomes.length === 0) {
      this.initRunBiomes();
    }
    return this.activeRunBiomes[Math.min(this.currentStageIndex, this.activeRunBiomes.length - 1)];
  }

  public get stageNumber(): number {
    return this.currentStageIndex + 1;
  }

  public isFinalStage(): boolean {
    return this.stageNumber >= 4;
  }

  /**
   * Applies the current biome's atmosphere, lighting, fog, textures and materials to the Three.js scene.
   */
  public applyBiomeToScene(scene: Scene, timeOfDay: 'day' | 'night' = this.currentTimeOfDay) {
    this.currentTimeOfDay = timeOfDay;
    const biome = this.currentBiome;
    const isNight = timeOfDay === 'night';

    const fogColor = isNight && biome.night?.fogColor !== undefined ? biome.night.fogColor : biome.fogColor;
    const fogDensity = isNight && biome.night?.fogDensity !== undefined ? biome.night.fogDensity : biome.fogDensity;
    const bgColor = isNight && biome.night?.backgroundColor !== undefined ? biome.night.backgroundColor : biome.backgroundColor;
    const ambColor = isNight && biome.night?.ambientColor !== undefined ? biome.night.ambientColor : biome.ambientColor;
    const dirColor = isNight && biome.night?.lightColor !== undefined ? biome.night.lightColor : biome.sunColor;
    const hemiSky = isNight && biome.night?.hemiSkyColor !== undefined ? biome.night.hemiSkyColor : biome.hemiSkyColor;
    const hemiGnd = isNight && biome.night?.hemiGroundColor !== undefined ? biome.night.hemiGroundColor : biome.hemiGroundColor;

    // 1. Fog & Background
    scene.background = new Color(bgColor);
    if (scene.fog instanceof FogExp2) {
      scene.fog.color.setHex(fogColor);
      scene.fog.density = fogDensity;
    } else {
      scene.fog = new FogExp2(fogColor, fogDensity);
    }

    // 2. Lights in the scene
    scene.traverse((obj) => {
      if (obj instanceof AmbientLight) {
        obj.color.setHex(ambColor);
      } else if (obj instanceof DirectionalLight) {
        obj.color.setHex(dirColor);
      } else if (obj instanceof HemisphereLight) {
        obj.color.setHex(hemiSky);
        obj.groundColor.setHex(hemiGnd);
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
   * Sets the current stage explicitly (1-based index, up to 4 stages).
   */
  public setStage(stageNumber: number): BiomeConfig {
    if (this.activeRunBiomes.length === 0) {
      this.initRunBiomes();
    }
    this.currentStageIndex = Math.max(0, Math.min(stageNumber - 1, this.activeRunBiomes.length - 1));
    return this.currentBiome;
  }

  /**
   * Advances to the next stage/biome.
   * Caps at stage 4 (final stage).
   */
  public advanceStage(): BiomeConfig {
    if (this.activeRunBiomes.length === 0) {
      this.initRunBiomes();
    }
    if (this.currentStageIndex < this.activeRunBiomes.length - 1) {
      this.currentStageIndex++;
    }
    return this.currentBiome;
  }

  public reset(seed?: number) {
    this.initRunBiomes(seed);
  }
}
