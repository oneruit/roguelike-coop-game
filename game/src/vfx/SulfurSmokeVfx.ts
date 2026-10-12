import {
  type Scene,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
  DoubleSide,
  type Texture,
  PointLight
} from 'three';
import { TextureManager } from '../core/TextureManager';

export interface SulfurSmokeOptions {
  size?: number; // default: 6.2
  fps?: number; // default: 11
  onVanish?: () => void;
  onComplete?: () => void;
}

/**
 * Individual instance of the Brimstone Smoke cloud VFX.
 * Plays sequential 6-frame animation with initial bright light burst
 * followed by expanding and dissipating violet-black / dark blue sulfur smoke.
 */
export class SulfurSmokeVfxInstance {
  public mesh: Mesh;
  private mat: MeshBasicMaterial;
  private tex: Texture;
  private flashLight?: PointLight;
  private timer: number = 0;
  private frameCount: number = 6;
  private fps: number;
  private vanishTriggered: boolean = false;
  private onVanish?: () => void;
  private onComplete?: () => void;
  public isFinished: boolean = false;

  constructor(
    private scene: Scene,
    position: Vector3,
    options: SulfurSmokeOptions = {}
  ) {
    const size = options.size ?? 6.2;
    this.fps = options.fps ?? 11;
    this.onVanish = options.onVanish;
    this.onComplete = options.onComplete;

    const baseTex = TextureManager.getSulfurSmokeTexture();
    this.tex = baseTex.clone();
    this.tex.repeat.set(1 / this.frameCount, 1);
    this.tex.offset.set(0, 0);

    const geom = new PlaneGeometry(size, size);
    geom.translate(0, size * 0.45, 0);

    this.mat = new MeshBasicMaterial({
      map: this.tex,
      transparent: true,
      depthWrite: false,
      side: DoubleSide
    });

    this.mesh = new Mesh(geom, this.mat);
    this.mesh.rotation.x = -Math.PI / 4.8;
    this.mesh.position.copy(position);
    this.mesh.renderOrder = 999;

    // Brilliant initial burst flash light
    this.flashLight = new PointLight(0xd8b4fe, 3.5, 12);
    this.flashLight.position.set(position.x, position.y + 1.5, position.z);

    this.scene.add(this.mesh);
    this.scene.add(this.flashLight);
  }

  public update(dt: number): boolean {
    if (this.isFinished) return true;

    this.timer += dt;
    const currentFrame = Math.floor(this.timer * this.fps);

    // Initial flash burst fades rapidly in the first 0.18s
    if (this.flashLight) {
      const flashFade = Math.max(0, 1.0 - this.timer / 0.18);
      this.flashLight.intensity = flashFade * 4.0;
      if (flashFade <= 0.01) {
        this.scene.remove(this.flashLight);
        this.flashLight.dispose();
        this.flashLight = undefined;
      }
    }

    // Call onVanish around frame 2 (peak density of the dark sulfur cloud)
    if (!this.vanishTriggered && currentFrame >= 2) {
      this.vanishTriggered = true;
      if (this.onVanish) {
        this.onVanish();
      }
    }

    if (currentFrame >= this.frameCount) {
      this.dispose();
      return true;
    }

    this.tex.offset.set(currentFrame / this.frameCount, 0);
    return false;
  }

  public dispose() {
    if (this.isFinished) return;
    this.isFinished = true;
    if (this.flashLight) {
      this.scene.remove(this.flashLight);
      this.flashLight.dispose();
      this.flashLight = undefined;
    }
    this.scene.remove(this.mesh);
    this.mat.dispose();
    this.tex.dispose();
    this.mesh.geometry.dispose();
    if (this.onComplete) {
      this.onComplete();
    }
  }
}

/**
 * Global manager for Brimstone / Sulfur Smoke teleport and disappearance effects.
 */
export class SulfurSmokeManager {
  private static activeInstances: SulfurSmokeVfxInstance[] = [];

  public static spawn(
    scene: Scene,
    position: Vector3,
    options?: SulfurSmokeOptions
  ): SulfurSmokeVfxInstance {
    const inst = new SulfurSmokeVfxInstance(scene, position, options);
    this.activeInstances.push(inst);
    return inst;
  }

  public static update(dt: number) {
    for (let i = this.activeInstances.length - 1; i >= 0; i--) {
      const inst = this.activeInstances[i];
      const finished = inst.update(dt);
      if (finished) {
        this.activeInstances.splice(i, 1);
      }
    }
  }

  public static clear() {
    for (const inst of this.activeInstances) {
      inst.dispose();
    }
    this.activeInstances = [];
  }
}
