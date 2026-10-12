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
    fogColor: 0x1e293b,
    fogDensity: 0.012,
    backgroundColor: 0x1e293b,
    ambientColor: 0x476384,
    sunColor: 0xb0e5fc,
    hemiSkyColor: 0x7dd3fc,
    hemiGroundColor: 0x334155,
    groundTint: 0xe2e8f0,
    description: 'Исследовательский комплекс предтеч со светлыми титановыми плитами и энерголиниями.',
    roughness: 0.45,
    metalness: 0.25,
    rockColor: 0x64748b,
    foliageColor: 0x38bdf8,
    night: {
      fogColor: 0x0f172a,
      fogDensity: 0.012,
      backgroundColor: 0x0f172a,
      ambientColor: 0x334b6b,
      lightColor: 0x93c5fd,
      hemiSkyColor: 0x60a5fa,
      hemiGroundColor: 0x1e293b
    }
  },
  {
    id: 'bioluminescent_wilds',
    stageNumber: 3,
    name: 'Ксено-Джунгли',
    nameEn: 'Bioluminescent Wilds',
    fogColor: 0x1a2e26,
    fogDensity: 0.012,
    backgroundColor: 0x1a2e26,
    ambientColor: 0x2e6b54,
    sunColor: 0xc7f9e8,
    hemiSkyColor: 0x34d399,
    hemiGroundColor: 0x1b4332,
    groundTint: 0xd1fae5,
    description: 'Светящиеся мятно-бирюзовые споровые заросли и люминесцентный мох.',
    roughness: 0.65,
    metalness: 0.05,
    rockColor: 0x3b82f6,
    foliageColor: 0x10b981,
    night: {
      fogColor: 0x0d2019,
      fogDensity: 0.012,
      backgroundColor: 0x0d2019,
      ambientColor: 0x245441,
      lightColor: 0xa7f3d0,
      hemiSkyColor: 0x2dd4bf,
      hemiGroundColor: 0x133024
    }
  },
  {
    id: 'volcanic_caldera',
    stageNumber: 4,
    name: 'Базальтовая Кальдера',
    nameEn: 'Volcanic Forge',
    fogColor: 0x381912,
    fogDensity: 0.013,
    backgroundColor: 0x381912,
    ambientColor: 0x9a3e22,
    sunColor: 0xffeedd,
    hemiSkyColor: 0xf97316,
    hemiGroundColor: 0x4a180e,
    groundTint: 0xfed7aa,
    description: 'Теплые янтарные пески, реки кипящей лавы и сияющая магматическая пемза.',
    roughness: 0.80,
    metalness: 0.08,
    rockColor: 0x7c2d12,
    foliageColor: 0xf59e0b,
    night: {
      fogColor: 0x260e0a,
      fogDensity: 0.013,
      backgroundColor: 0x260e0a,
      ambientColor: 0x6b2411,
      lightColor: 0xfca5a5,
      hemiSkyColor: 0xef4444,
      hemiGroundColor: 0x2e0c05
    }
  },
  {
    id: 'primordial_ruins',
    stageNumber: 5,
    name: 'Руины Предтеч',
    nameEn: 'Primordial Monoliths',
    fogColor: 0x2b261f,
    fogDensity: 0.012,
    backgroundColor: 0x2b261f,
    ambientColor: 0x7a6345,
    sunColor: 0xfff8db,
    hemiSkyColor: 0xfacc15,
    hemiGroundColor: 0x3d3121,
    groundTint: 0xfef08a,
    description: 'Золотистый песчаник, алебастровые плиты и сияющие древние руны.',
    roughness: 0.65,
    metalness: 0.12,
    rockColor: 0xa16207,
    foliageColor: 0x84cc16,
    night: {
      fogColor: 0x171926,
      fogDensity: 0.012,
      backgroundColor: 0x171926,
      ambientColor: 0x484d69,
      lightColor: 0xe0e7ff,
      hemiSkyColor: 0xa5b4fc,
      hemiGroundColor: 0x1e2130
    }
  },
  {
    id: 'rift_core',
    stageNumber: 6,
    name: 'Ядро Разлома',
    nameEn: 'The Rift Core',
    fogColor: 0x2e183b,
    fogDensity: 0.012,
    backgroundColor: 0x2e183b,
    ambientColor: 0x7b3294,
    sunColor: 0xffd6f9,
    hemiSkyColor: 0xe879f9,
    hemiGroundColor: 0x3b0764,
    groundTint: 0xf5d0fe,
    description: 'Сияющий аметистовый кристаллический пол и космические туманности.',
    roughness: 0.40,
    metalness: 0.20,
    rockColor: 0x86198f,
    foliageColor: 0xf43f5e,
    night: {
      fogColor: 0x1e0d29,
      fogDensity: 0.012,
      backgroundColor: 0x1e0d29,
      ambientColor: 0x5b1e70,
      lightColor: 0xf0abfc,
      hemiSkyColor: 0xd946ef,
      hemiGroundColor: 0x250640
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
