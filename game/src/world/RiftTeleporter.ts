import {
  type Scene,
  Vector3,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  DoubleSide,
  RingGeometry,
  PointLight,
  MeshDepthMaterial,
  RGBADepthPacking,
  type Texture
} from 'three';
import { TextureManager } from '../core/TextureManager';

export type TeleporterState = 'IDLE' | 'CHARGING' | 'COMPLETED' | 'WARP_READY';

export interface RiftUpdateResult {
  justCompleted: boolean;
  justTouched?: boolean;
}

/**
 * 2.5D Dimensional Rift (Разлом) for biome transitions.
 * - Closed state: Dark ominous cosmic tear in reality, pulsating with dark eldritch veins.
 * - On touch or interaction [E]: The boss emerges from the rift and the portal opens.
 * - Open state: Radiant glowing interdimensional gateway with swirling celestial vortex.
 * - Sized 8.0 units with contact shadow and directional shadow casting.
 * - Warp transition to next biome triggers ONLY via interaction prompt [E].
 */
export class RiftTeleporter {
  public static readonly RIFT_SIZE = 8.0; // 8.0 units

  private scene: Scene;
  public position: Vector3;
  public state: TeleporterState = 'IDLE';

  public chargeProgress: number = 0; // 0.0 to 1.0 (0% to 100%)
  public chargeRadius: number = 35; // 35 meters radius
  public isPlayerInsideZone: boolean = false;
  public isBossDefeated: boolean = false;
  public isDiscovered: boolean = false;

  public mesh: Group;
  private riftSprite!: Mesh;
  private riftSpriteMat!: MeshBasicMaterial;
  private customDepthMaterial!: MeshDepthMaterial;
  private shadowMesh!: Mesh;
  private groundAura!: Mesh;
  private groundAuraMat!: MeshBasicMaterial;
  private riftLight!: PointLight;

  private riftClosedTex!: Texture;
  private riftOpenTex!: Texture;
  private animTimer: number = 0;

  constructor(scene: Scene, position: Vector3 = new Vector3(75, 0, 75)) {
    this.scene = scene;
    this.position = position.clone();
    this.mesh = new Group();
    this.mesh.position.copy(this.position);

    this.createTeleporterVisuals();
    this.scene.add(this.mesh);
  }

  private createTeleporterVisuals() {
    this.riftClosedTex = TextureManager.getRiftClosedTexture();
    this.riftOpenTex = TextureManager.getRiftOpenTexture();

    // 1. Central 2.5D Rift Sprite (8.0 x 8.0)
    const riftGeom = new PlaneGeometry(RiftTeleporter.RIFT_SIZE, RiftTeleporter.RIFT_SIZE);
    // Anchor pivot near bottom so the dimensional tear hovers just slightly above terrain
    riftGeom.translate(0, RiftTeleporter.RIFT_SIZE * 0.45, 0);

    this.riftSpriteMat = new MeshBasicMaterial({
      map: this.riftClosedTex,
      transparent: true,
      alphaTest: 0.08,
      side: DoubleSide,
      depthWrite: true
    });

    this.customDepthMaterial = new MeshDepthMaterial({
      depthPacking: RGBADepthPacking,
      map: this.riftClosedTex,
      alphaTest: 0.15
    });

    this.riftSprite = new Mesh(riftGeom, this.riftSpriteMat);
    // Standard 2.5D isometric tilt matching players, bosses, and trees
    this.riftSprite.rotation.x = -Math.PI / 4.8;
    this.riftSprite.customDepthMaterial = this.customDepthMaterial;
    this.riftSprite.castShadow = true;
    this.riftSprite.renderOrder = 1;
    this.mesh.add(this.riftSprite);

    // 2. High-performance contact ground shadow
    this.shadowMesh = TextureManager.createShadowMesh(2.6);
    this.shadowMesh.position.y = 0.03;
    this.mesh.add(this.shadowMesh);

    // 3. Ground Energy Aura Ring (scaled for 8.0m rift)
    const auraGeom = new RingGeometry(1.4, 4.0, 48);
    auraGeom.rotateX(-Math.PI / 2);
    this.groundAuraMat = new MeshBasicMaterial({
      color: 0x7c3aed, // Faint dark violet when closed
      transparent: true,
      opacity: 0.35,
      side: DoubleSide,
      depthWrite: false
    });
    this.groundAura = new Mesh(auraGeom, this.groundAuraMat);
    this.groundAura.position.y = 0.08;
    this.mesh.add(this.groundAura);

    // 4. Radiant Point Light
    this.riftLight = new PointLight(0x7c3aed, 1.2, 14);
    this.riftLight.position.set(0, 2.8, 0);
    this.mesh.add(this.riftLight);
  }

  public activate(): boolean {
    if (this.state !== 'IDLE') return false;
    this.isDiscovered = true;
    this.state = 'CHARGING';
    this.chargeProgress = 0;
    this.isBossDefeated = false;

    // Awaken and open the rift: switch to radiant glowing open vortex!
    this.riftSpriteMat.map = this.riftOpenTex;
    this.riftSpriteMat.needsUpdate = true;
    if (this.customDepthMaterial) {
      this.customDepthMaterial.map = this.riftOpenTex;
      this.customDepthMaterial.needsUpdate = true;
    }
    this.groundAuraMat.color.setHex(0x38bdf8); // Bright radiant cyan
    this.groundAuraMat.opacity = 0.65;
    this.riftLight.color.setHex(0x38bdf8);
    this.riftLight.intensity = 3.5;
    this.riftLight.distance = 26;

    return true;
  }

  public update(dt: number, playerPositions: Vector3[]): RiftUpdateResult {
    this.animTimer += dt;

    // Check discovery radius if not yet discovered
    if (!this.isDiscovered) {
      if (this.state !== 'IDLE') {
        this.isDiscovered = true;
      } else {
        for (const pos of playerPositions) {
          if (pos.distanceToSquared(this.position) <= 45 * 45) {
            this.isDiscovered = true;
            break;
          }
        }
      }
    }

    let justCompleted = false;
    let justTouched = false;

    if (this.state === 'IDLE') {
      // Pulsating dormant rift: breathing scale & subtle ground aura flicker
      const pulse = 1.0 + Math.sin(this.animTimer * 2.6) * 0.04;
      this.riftSprite.scale.set(pulse, pulse, pulse);
      this.groundAuraMat.opacity = 0.28 + Math.sin(this.animTimer * 2.6) * 0.12;
      this.groundAura.rotation.y += dt * 0.25;

      // Check contact touch: when player physically approaches the rift to awaken it
      for (const pos of playerPositions) {
        if (pos.distanceToSquared(this.position) <= 3.8 * 3.8) {
          justTouched = true;
          break;
        }
      }
    } else if (this.state === 'CHARGING') {
      // Violent energized pulse while boss fight is ongoing
      const pulse = 1.0 + Math.sin(this.animTimer * 4.2) * 0.06;
      this.riftSprite.scale.set(pulse, pulse, pulse);
      this.groundAura.rotation.y += dt * 0.8;
      this.groundAuraMat.opacity = 0.45 + Math.sin(this.animTimer * 4.0) * 0.2;

      if (this.isBossDefeated) {
        this.state = 'WARP_READY';
        this.chargeProgress = 1.0;
        this.groundAuraMat.color.setHex(0x10b981); // Emerald green for stabilized rift
        this.groundAuraMat.opacity = 0.75;
        this.riftLight.color.setHex(0x34d399);
        this.riftLight.intensity = 4.0;
        justCompleted = true;
      }
    } else if (this.state === 'WARP_READY') {
      // Radiant stabilized portal humming with interdimensional power
      // Warp to next biome triggers strictly on [E] interaction, not on automatic walk-in
      const pulse = 1.02 + Math.sin(this.animTimer * 3.2) * 0.04;
      this.riftSprite.scale.set(pulse, pulse, pulse);
      this.groundAura.rotation.y += dt * 0.5;
      this.groundAuraMat.opacity = 0.60 + Math.sin(this.animTimer * 3.0) * 0.15;
    }

    return { justCompleted, justTouched };
  }

  /**
   * Resets teleporter for a new stage at new random location.
   */
  public resetForStage(newPos: Vector3) {
    this.position.copy(newPos);
    this.mesh.position.copy(newPos);
    this.mesh.visible = true;
    this.state = 'IDLE';
    this.isDiscovered = false;
    this.chargeProgress = 0;
    this.isBossDefeated = false;
    this.isPlayerInsideZone = false;

    // Reset visuals to closed dormant rift
    this.riftSpriteMat.map = this.riftClosedTex;
    this.riftSpriteMat.needsUpdate = true;
    if (this.customDepthMaterial) {
      this.customDepthMaterial.map = this.riftClosedTex;
      this.customDepthMaterial.needsUpdate = true;
    }
    this.groundAuraMat.color.setHex(0x7c3aed);
    this.groundAuraMat.opacity = 0.35;
    this.riftLight.color.setHex(0x7c3aed);
    this.riftLight.intensity = 1.2;
    this.riftLight.distance = 14;
  }

  /**
   * Disables the teleporter for the final stage (Rift Core) where no transitions occur.
   */
  public disableForFinalStage() {
    this.mesh.visible = false;
    this.state = 'IDLE';
    this.isDiscovered = false;
    this.chargeProgress = 0;
    this.position.set(99999, -999, 99999);
    this.mesh.position.copy(this.position);
  }

  /**
   * Automatically stabilizes the teleporter when 5 minutes on the biome have elapsed.
   */
  public stabilizeVoluntaryPortal(): boolean {
    if (!this.mesh.visible) return false;
    if (this.state === 'WARP_READY') return false;
    this.state = 'WARP_READY';
    this.isDiscovered = true;
    this.isBossDefeated = true;
    this.chargeProgress = 1.0;

    this.riftSpriteMat.map = this.riftOpenTex;
    this.riftSpriteMat.needsUpdate = true;
    if (this.customDepthMaterial) {
      this.customDepthMaterial.map = this.riftOpenTex;
      this.customDepthMaterial.needsUpdate = true;
    }
    this.groundAuraMat.color.setHex(0x10b981);
    this.groundAuraMat.opacity = 0.75;
    this.riftLight.color.setHex(0x34d399);
    this.riftLight.intensity = 4.0;
    return true;
  }

  public getInteraction(playerPos: Vector3): { canInteract: boolean; prompt: string; action: 'activate' | 'warp' | null } {
    if (!this.mesh.visible) {
      return { canInteract: false, prompt: '', action: null };
    }

    const distSq = playerPos.distanceToSquared(this.position);
    // 8m portal footprint: interaction range 5.5 meters
    if (distSq > 5.5 * 5.5) {
      return { canInteract: false, prompt: '', action: null };
    }

    if (this.state === 'IDLE') {
      return {
        canInteract: true,
        prompt: '[E] Прикоснуться к Разлому (Призыв Босса)',
        action: 'activate'
      };
    }

    if (this.state === 'WARP_READY') {
      return {
        canInteract: true,
        prompt: '[E] Войти в Разлом (Переход на следующий биом)',
        action: 'warp'
      };
    }

    return { canInteract: false, prompt: '', action: null };
  }

  public destroy() {
    this.scene.remove(this.mesh);
    this.riftSpriteMat.dispose();
    this.customDepthMaterial?.dispose();
    this.groundAuraMat.dispose();
    this.riftLight.dispose();
  }

  public getSnapshot() {
    return {
      x: this.position.x,
      z: this.position.z,
      isActivated: this.state !== 'IDLE',
      chargeProgress: this.chargeProgress,
      isCompleted: this.state === 'WARP_READY',
      isDiscovered: this.isDiscovered || this.state !== 'IDLE'
    };
  }

  public applySnapshot(snap: { x: number; z: number; isActivated: boolean; chargeProgress: number; isCompleted: boolean; isDiscovered?: boolean }) {
    if (this.position.x !== snap.x || this.position.z !== snap.z) {
      this.resetForStage(new Vector3(snap.x, 0, snap.z));
    }
    if (snap.isDiscovered || snap.isActivated || snap.isCompleted) {
      this.isDiscovered = true;
    }
    if (snap.isActivated && this.state === 'IDLE') {
      this.activate();
    }
    this.chargeProgress = snap.chargeProgress;
    if (snap.isCompleted) {
      this.state = 'WARP_READY';
      this.isBossDefeated = true;
      this.riftSpriteMat.map = this.riftOpenTex;
      this.riftSpriteMat.needsUpdate = true;
      if (this.customDepthMaterial) {
        this.customDepthMaterial.map = this.riftOpenTex;
        this.customDepthMaterial.needsUpdate = true;
      }
      this.groundAuraMat.color.setHex(0x10b981);
      this.groundAuraMat.opacity = 0.75;
      this.riftLight.color.setHex(0x34d399);
      this.riftLight.intensity = 4.0;
    }
  }
}
