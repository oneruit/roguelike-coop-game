import {
  Vector3,
  Group,
  Mesh,
  type Scene,
  BoxGeometry,
  OctahedronGeometry,
  MeshBasicMaterial,
  RingGeometry,
  DoubleSide,
  PlaneGeometry,
  Texture,
  TextureLoader,
  SRGBColorSpace,
  LinearFilter,
  PointLight,
  MeshDepthMaterial,
  RGBADepthPacking,
  Color
} from 'three';
import { rollChestDropPair, RiftItemDef } from '../items/RiftItemSystem';
import { DifficultyDirector } from '../director/DifficultyDirector';
import { SeededRNG } from '../core/SeededRNG';
import { getAssetUrl } from '../utils/assetPath';

export type ChestTier = 'small' | 'large' | 'legendary';

export interface StageChestTierCounts {
  small: number;
  large: number;
  legendary: number;
}

export const STAGE_CHEST_DISTRIBUTION: Record<number, StageChestTierCounts> = {
  1: { small: 11, large: 4, legendary: 0 },
  2: { small: 10, large: 5, legendary: 0 },
  3: { small: 0, large: 11, legendary: 4 },
  4: { small: 0, large: 4, legendary: 11 }
};

export interface ChestInstance {
  id: string;
  tier: ChestTier;
  baseCost: number;
  position: Vector3;
  isOpened: boolean;
  mesh: Group;
  lidMesh: Mesh;
  hologramMesh: Mesh;
  glowMesh: Mesh;
  spriteMesh?: Mesh;
  depthMesh?: Mesh;
  contactShadowMesh?: Mesh;
  spriteTexture?: Texture;
  depthTexture?: Texture;
  openProgress?: number;
  isAnimating?: boolean;
  flashLight?: PointLight;
}

export class ChestManager {
  private scene: Scene;
  public chests: ChestInstance[] = [];
  public chronosDroppedInCurrentBiome: boolean = false;
  private static nextId = 1;

  // Shared Textures & Geometry for high performance
  private static textureLoader = new TextureLoader();
  private static sheetSmall: Texture | null = null;
  private static sheetLarge: Texture | null = null;
  private static sheetLegendary: Texture | null = null;
  private static shadowTexture: Texture | null = null;
  private static sharedPlaneGeom: PlaneGeometry | null = null;
  private static sharedShadowGeom: PlaneGeometry | null = null;

  private static getChestGeometry(): PlaneGeometry {
    if (!ChestManager.sharedPlaneGeom) {
      const geom = new PlaneGeometry(1.9, 1.9);
      // Anchor contact shadow to ground level y=0
      geom.translate(0, 0.77, 0);
      ChestManager.sharedPlaneGeom = geom;
    }
    return ChestManager.sharedPlaneGeom;
  }

  private static getShadowGeometry(): PlaneGeometry {
    if (!ChestManager.sharedShadowGeom) {
      const geom = new PlaneGeometry(1.65, 0.85);
      geom.rotateX(-Math.PI / 2);
      ChestManager.sharedShadowGeom = geom;
    }
    return ChestManager.sharedShadowGeom;
  }

  private static getShadowTexture(): Texture {
    if (!ChestManager.shadowTexture) {
      let tex: Texture;
      if (typeof document === 'undefined') {
        tex = new Texture();
      } else {
        tex = ChestManager.textureLoader.load(getAssetUrl('/textures/chests/chest_contact_shadow.png'));
      }
      tex.colorSpace = SRGBColorSpace;
      ChestManager.shadowTexture = tex;
    }
    return ChestManager.shadowTexture;
  }

  private static getSheetTexture(tier: ChestTier): Texture {
    let url = '/textures/chests/chest_small_sheet.png';
    let cached: Texture | null = null;

    if (tier === 'large') {
      url = '/textures/chests/chest_large_sheet.png';
      cached = ChestManager.sheetLarge;
    } else if (tier === 'legendary') {
      url = '/textures/chests/chest_legendary_sheet.png';
      cached = ChestManager.sheetLegendary;
    } else {
      cached = ChestManager.sheetSmall;
    }

    if (!cached) {
      let tex: Texture;
      if (typeof document === 'undefined') {
        tex = new Texture();
      } else {
        tex = ChestManager.textureLoader.load(getAssetUrl(url));
      }
      tex.colorSpace = SRGBColorSpace;
      tex.minFilter = LinearFilter;
      tex.magFilter = LinearFilter;

      if (tier === 'large') ChestManager.sheetLarge = tex;
      else if (tier === 'legendary') ChestManager.sheetLegendary = tex;
      else ChestManager.sheetSmall = tex;

      return tex;
    }
    return cached;
  }

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Spawns an animated 2.5D chest at the given position.
   */
  public spawnChest(
    x: number,
    z: number,
    tier: ChestTier = 'small',
    customId?: string,
    customBaseCost?: number,
    y: number = 0
  ): ChestInstance {
    const id = customId || `chest_${ChestManager.nextId++}`;
    const group = new Group();
    group.position.set(x, y, z);

    let baseCost = customBaseCost ?? 25;
    let glowColor = 0xf59e0b; // Small tier: warm gold

    if (tier === 'large') {
      baseCost = customBaseCost ?? 50;
      glowColor = 0x06b6d4; // Large tier: arcane cyan
    } else if (tier === 'legendary') {
      baseCost = customBaseCost ?? 100;
      glowColor = 0xf43f5e; // Legendary tier: crimson rose
    }

    // 0. Soft Ground Contact AO Shadow (firmly plants the chest onto terrain)
    const shadowMat = new MeshBasicMaterial({
      map: ChestManager.getShadowTexture(),
      transparent: true,
      opacity: 0.85,
      side: DoubleSide,
      depthWrite: false,
      depthTest: true
    });
    const contactShadowMesh = new Mesh(ChestManager.getShadowGeometry(), shadowMat);
    contactShadowMesh.position.set(0, 0.02, -0.03);
    group.add(contactShadowMesh);

    // 1. Cloned UV-offset texture for independent 6-frame animation
    const sheet = ChestManager.getSheetTexture(tier);
    const spriteTex = sheet.clone();
    spriteTex.repeat.set(1 / 6, 1);
    spriteTex.offset.set(0, 0); // Frame 1: closed

    // 1b. Volumetric depth layer (Option B: gives physical thickness and parallax in isometric view)
    const depthTex = sheet.clone();
    depthTex.repeat.set(1 / 6, 1);
    depthTex.offset.set(0, 0);

    const depthMat = new MeshBasicMaterial({
      map: depthTex,
      color: new Color(0.28, 0.22, 0.18), // Darkened ambient tone for back/side rim
      transparent: true,
      alphaTest: 0.15,
      side: DoubleSide,
      depthWrite: false,
      depthTest: true
    });

    const depthMesh = new Mesh(ChestManager.getChestGeometry(), depthMat);
    depthMesh.rotation.x = -Math.PI / 4.8;
    depthMesh.position.set(0, 0.08, -0.07);
    group.add(depthMesh);

    const spriteMat = new MeshBasicMaterial({
      map: spriteTex,
      transparent: true,
      alphaTest: 0.15,
      side: DoubleSide,
      depthWrite: true,
      depthTest: true
    });

    const spriteMesh = new Mesh(ChestManager.getChestGeometry(), spriteMat);
    // Align with 2.5D camera perspective (-37.5 degrees)
    spriteMesh.rotation.x = -Math.PI / 4.8;
    spriteMesh.position.y = 0.05;
    spriteMesh.castShadow = true;
    spriteMesh.customDepthMaterial = new MeshDepthMaterial({
      depthPacking: RGBADepthPacking,
      map: spriteTex,
      alphaTest: 0.15
    });
    group.add(spriteMesh);

    // 2. Glowing Hologram Beacon above chest
    const holoGeom = new OctahedronGeometry(0.32);
    const holoMat = new MeshBasicMaterial({
      color: glowColor,
      wireframe: true
    });
    const hologramMesh = new Mesh(holoGeom, holoMat);
    hologramMesh.position.y = 1.95;
    group.add(hologramMesh);

    // 3. Ground magic energy aura ring
    const auraGeom = new RingGeometry(1.0, 1.35, 24);
    auraGeom.rotateX(-Math.PI / 2);
    const auraMat = new MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.45,
      side: DoubleSide
    });
    const glowMesh = new Mesh(auraGeom, auraMat);
    glowMesh.position.y = 0.03;
    group.add(glowMesh);

    // 4. Dummy lid for backward compatibility
    const lidMesh = new Mesh(new BoxGeometry(0.01, 0.01, 0.01), new MeshBasicMaterial({ visible: false }));
    group.add(lidMesh);

    const chest: ChestInstance = {
      id,
      tier,
      baseCost,
      position: new Vector3(x, y, z),
      isOpened: false,
      mesh: group,
      lidMesh,
      hologramMesh,
      glowMesh,
      spriteMesh,
      depthMesh,
      contactShadowMesh,
      spriteTexture: spriteTex,
      depthTexture: depthTex,
      openProgress: 0,
      isAnimating: false
    };

    this.chests.push(chest);
    this.scene.add(group);
    return chest;
  }

  /**
   * Returns a deterministic list of chest tiers for the given stage and count,
   * shuffled with the provided PRNG.
   *
   * Stage 1: 11 small, 4 large, 0 legendary
   * Stage 2: 10 small, 5 large, 0 legendary
   * Stage 3: 0 small, 11 large, 4 legendary
   * Stage 4+: 0 small, 4 large, 11 legendary
   */
  public static getStageChestTiers(stage: number, count: number = 15, prng?: SeededRNG): ChestTier[] {
    const effectiveStage = Math.max(1, Math.min(4, Math.floor(stage || 1)));
    const counts = STAGE_CHEST_DISTRIBUTION[effectiveStage] || STAGE_CHEST_DISTRIBUTION[4];

    const tiers: ChestTier[] = [];
    if (count === 15) {
      for (let i = 0; i < counts.legendary; i++) tiers.push('legendary');
      for (let i = 0; i < counts.large; i++) tiers.push('large');
      for (let i = 0; i < counts.small; i++) tiers.push('small');
    } else {
      let leg = Math.round((counts.legendary / 15) * count);
      let large = Math.round((counts.large / 15) * count);
      let small = Math.max(0, count - leg - large);
      for (let i = 0; i < leg; i++) tiers.push('legendary');
      for (let i = 0; i < large; i++) tiers.push('large');
      for (let i = 0; i < small; i++) tiers.push('small');
      while (tiers.length < count) tiers.push('small');
      if (tiers.length > count) tiers.length = count;
    }

    if (prng) {
      // Deterministic Fisher-Yates shuffle
      for (let i = tiers.length - 1; i > 0; i--) {
        const j = Math.floor(prng.next() * (i + 1));
        const temp = tiers[i];
        tiers[i] = tiers[j];
        tiers[j] = temp;
      }
    }

    return tiers;
  }

  /**
   * Generates scattered chests across the fixed 500x500 map area using deterministic PRNG.
   * Guarantees healthy clearance from spawn, altars, teleporter, and other chests.
   */
  public generateStageChests(
    centerX: number = 0,
    centerZ: number = 0,
    count: number = 15,
    stage: number = 1,
    rng?: SeededRNG,
    forbiddenZones?: { x: number; z: number; radius: number }[],
    getElevation?: (x: number, z: number) => number
  ): { x: number; z: number; radius: number }[] {
    this.clear();
    this.chronosDroppedInCurrentBiome = false;
    const prng = rng || new SeededRNG(stage * 7919);
    const placedZones: { x: number; z: number; radius: number }[] = [];

    // Deterministic tier distribution per stage
    const tiers = ChestManager.getStageChestTiers(stage, count, prng);

    // Attempt to scatter chests across the 450x450 map (-195 to +195)
    for (let i = 0; i < count; i++) {
      let chosenX = 0;
      let chosenZ = 0;
      let valid = false;

      for (let attempt = 0; attempt < 45; attempt++) {
        // Sample candidate
        const candX = prng.range(-195, 195);
        const candZ = prng.range(-195, 195);

        // Distance from spawn (0, 0)
        if (Math.hypot(candX, candZ) < 26.0) continue;

        // Distance from forbidden zones (altars, teleporter)
        let tooCloseToZone = false;
        if (forbiddenZones) {
          for (const zone of forbiddenZones) {
            if (Math.hypot(candX - zone.x, candZ - zone.z) < zone.radius + 6.0) {
              tooCloseToZone = true;
              break;
            }
          }
        }
        if (tooCloseToZone) continue;

        // Distance from already placed chests (min 28m)
        let tooCloseToChest = false;
        for (const placed of placedZones) {
          if (Math.hypot(candX - placed.x, candZ - placed.z) < 28.0) {
            tooCloseToChest = true;
            break;
          }
        }
        if (tooCloseToChest) continue;

        chosenX = candX;
        chosenZ = candZ;
        valid = true;
        break;
      }

      if (!valid) {
        // Fallback with radial distribution if random box attempts were dense
        const ang = (i / count) * Math.PI * 2 + prng.range(-0.2, 0.2);
        const dist = 35 + prng.range(15, 170);
        chosenX = centerX + Math.cos(ang) * dist;
        chosenZ = centerZ + Math.sin(ang) * dist;
      }

      const tier: ChestTier = tiers[i] || 'small';

      const chosenY = getElevation ? getElevation(chosenX, chosenZ) : 0;
      this.spawnChest(chosenX, chosenZ, tier, undefined, undefined, chosenY);
      placedZones.push({ x: chosenX, z: chosenZ, radius: 4.5 });
    }

    return placedZones;
  }

  /**
   * Updates floating chest hologram visuals, pulse aura, and opening animations.
   */
  public update(dt: number) {
    for (const chest of this.chests) {
      if (!chest.isOpened) {
        chest.hologramMesh.rotation.y += dt * 2.0;
        chest.hologramMesh.rotation.x += dt * 0.8;
        if (chest.glowMesh && chest.glowMesh.material instanceof MeshBasicMaterial) {
          const pulse = 0.35 + 0.15 * Math.sin(Date.now() * 0.003 + chest.position.x);
          chest.glowMesh.material.opacity = pulse;
        }
      } else {
        // Animate 6-frame opening sequence over 0.5s
        if (chest.isAnimating && chest.spriteTexture) {
          chest.openProgress = (chest.openProgress || 0) + dt / 0.5;
          if (chest.openProgress >= 1) {
            chest.openProgress = 1;
            chest.isAnimating = false;
          }
          const frameIndex = Math.min(5, Math.floor(chest.openProgress * 6));
          chest.spriteTexture.offset.x = frameIndex / 6;
          if (chest.depthTexture) {
            chest.depthTexture.offset.x = frameIndex / 6;
          }
        }

        // Fade out opening burst light if present
        if (chest.flashLight) {
          chest.flashLight.intensity = Math.max(0, chest.flashLight.intensity - dt * 4.0);
          if (chest.flashLight.intensity <= 0.01) {
            chest.mesh.remove(chest.flashLight);
            chest.flashLight = undefined;
          }
        }
      }
    }
  }

  /**
   * Finds the closest unopened chest within interaction distance (~3.6m).
   */
  public getClosestInteractableChest(
    playerPos: Vector3,
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
   * Opens the chest, triggers opening animation and light burst, awards item and returns dropped item.
   */
  public openChest(
    chest: ChestInstance,
    stageNumber: number = 1,
    isItemMaxed?: (id: string) => boolean
  ): [RiftItemDef, RiftItemDef] {
    chest.isOpened = true;
    chest.isAnimating = true;
    chest.openProgress = 0;
    chest.hologramMesh.visible = false;
    chest.glowMesh.visible = false;

    // Opening burst light flare
    let glowColor = 0xf59e0b;
    if (chest.tier === 'large') glowColor = 0x06b6d4;
    else if (chest.tier === 'legendary') glowColor = 0xf43f5e;

    const flash = new PointLight(glowColor, 2.5, 7.0);
    flash.position.set(0, 0.9, 0.3);
    chest.mesh.add(flash);
    chest.flashLight = flash;

    const pair = rollChestDropPair(stageNumber, Math.random, this.chronosDroppedInCurrentBiome, isItemMaxed, chest.tier);
    if (pair[0].id === 'chronos_phylactery' || pair[1].id === 'chronos_phylactery') {
      this.chronosDroppedInCurrentBiome = true;
    }
    return pair;
  }

  public clear() {
    this.chronosDroppedInCurrentBiome = false;
    for (const chest of this.chests) {
      this.scene.remove(chest.mesh);
    }
    this.chests = [];
  }

  public getSnapshot(): { id: string; tier: ChestTier; baseCost: number; x: number; z: number; isOpened: boolean }[] {
    return this.chests.map((c) => ({
      id: c.id,
      tier: c.tier,
      baseCost: c.baseCost,
      x: c.position.x,
      z: c.position.z,
      isOpened: c.isOpened
    }));
  }

  public applySnapshot(
    snapshots: { id: string; tier: ChestTier; baseCost: number; x: number; z: number; isOpened: boolean }[]
  ) {
    if (!snapshots || snapshots.length === 0) return;

    const currentIds = new Set(this.chests.map((c) => c.id));
    const isDifferent =
      snapshots.length !== this.chests.length ||
      snapshots.some((s) => !currentIds.has(s.id));

    if (isDifferent) {
      this.clear();
      for (const snap of snapshots) {
        const chest = this.spawnChest(snap.x, snap.z, snap.tier, snap.id, snap.baseCost);
        if (snap.isOpened) {
          chest.isOpened = true;
          chest.isAnimating = false;
          chest.openProgress = 1;
          chest.hologramMesh.visible = false;
          chest.glowMesh.visible = false;
          if (chest.spriteTexture) {
            chest.spriteTexture.offset.x = 5 / 6; // Stay on frame 6 (opened)
          }
          if (chest.depthTexture) {
            chest.depthTexture.offset.x = 5 / 6;
          }
        }
      }
      return;
    }

    for (const snap of snapshots) {
      if (snap.isOpened) {
        const chest = this.chests.find((c) => c.id === snap.id);
        if (chest && !chest.isOpened) {
          this.openChest(chest);
        }
      }
    }
  }
}
