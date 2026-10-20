import {
  type Scene,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
  DoubleSide,
  Group,
  PointLight
} from 'three';

export interface VolatileRingOptions {
  radius?: number; // default: 4.2m
  telegraphDuration?: number; // default: 0.65s
  damage?: number; // discharge damage
  onDetonate?: (position: Vector3, radius: number, damage: number) => void;
}

/**
 * Visual effect instance for the Volatile elite affix lightning discharge.
 * Displays a 0.65s ground telegraph circle before detonating an expanding electric shockwave.
 */
export class VolatileRingInstance {
  public group: Group;
  public isFinished: boolean = false;

  private radius: number;
  private telegraphDuration: number;
  private damage: number;
  private onDetonate?: (position: Vector3, radius: number, damage: number) => void;

  private state: 'TELEGRAPH' | 'DETONATING' | 'DONE' = 'TELEGRAPH';
  private timer: number = 0;
  private detonationTimer: number = 0;
  private readonly detonationDuration: number = 0.24;

  private telegraphRingMat?: MeshBasicMaterial;
  private telegraphDiscMat?: MeshBasicMaterial;
  private telegraphRingMesh?: Mesh;
  private telegraphDiscMesh?: Mesh;

  private shockwaveMesh?: Mesh;
  private shockwaveMat?: MeshBasicMaterial;
  private flashLight?: PointLight;

  constructor(
    private scene: Scene,
    public position: Vector3,
    options: VolatileRingOptions = {}
  ) {
    this.radius = options.radius ?? 4.2;
    this.telegraphDuration = options.telegraphDuration ?? 0.65;
    this.damage = options.damage ?? 35;
    this.onDetonate = options.onDetonate;

    this.group = new Group();
    this.group.position.set(position.x, position.y + 0.04, position.z);

    this.initTelegraph();

    if (this.scene && typeof this.scene.add === 'function') {
      this.scene.add(this.group);
    }
  }

  private initTelegraph(): void {
    // 1. Outer warning border ring
    const ringGeom = new RingGeometry(Math.max(0.1, this.radius - 0.22), this.radius, 36);
    ringGeom.rotateX(-Math.PI / 2);

    this.telegraphRingMat = new MeshBasicMaterial({
      color: 0xfacc15, // Bright amber electric yellow
      transparent: true,
      opacity: 0.55,
      side: DoubleSide,
      depthWrite: false
    });
    this.telegraphRingMesh = new Mesh(ringGeom, this.telegraphRingMat);
    this.group.add(this.telegraphRingMesh);

    // 2. Inner danger zone disc (subtle fill showing hazard area)
    const discGeom = new RingGeometry(0.1, Math.max(0.2, this.radius - 0.24), 36);
    discGeom.rotateX(-Math.PI / 2);

    this.telegraphDiscMat = new MeshBasicMaterial({
      color: 0xfef08a, // Soft electric glow
      transparent: true,
      opacity: 0.12,
      side: DoubleSide,
      depthWrite: false
    });
    this.telegraphDiscMesh = new Mesh(discGeom, this.telegraphDiscMat);
    this.group.add(this.telegraphDiscMesh);
  }

  public update(dt: number): boolean {
    if (this.isFinished) return true;

    this.timer += dt;

    if (this.state === 'TELEGRAPH') {
      // Pulse outer warning ring faster as detonation approaches
      const pulseSpeed = 14.0 + (this.timer / this.telegraphDuration) * 16.0;
      if (this.telegraphRingMat) {
        this.telegraphRingMat.opacity = 0.45 + Math.sin(this.timer * pulseSpeed) * 0.25;
      }

      // Disc fill opacity gradually intensifies towards blast
      if (this.telegraphDiscMat) {
        const progress = Math.min(1.0, this.timer / this.telegraphDuration);
        this.telegraphDiscMat.opacity = 0.12 + progress * 0.24;
      }

      if (this.timer >= this.telegraphDuration) {
        this.triggerDetonation();
      }
    } else if (this.state === 'DETONATING') {
      this.detonationTimer += dt;
      const progress = Math.min(1.0, this.detonationTimer / this.detonationDuration);

      if (this.shockwaveMesh && this.shockwaveMat) {
        // Expand rapidly from center to full radius
        const currentScale = 0.2 + progress * 0.95;
        this.shockwaveMesh.scale.set(currentScale, 1.0, currentScale);
        this.shockwaveMat.opacity = Math.max(0, (1.0 - progress) * 0.85);
      }

      if (this.flashLight) {
        this.flashLight.intensity = Math.max(0, (1.0 - progress) * 3.5);
      }

      if (this.detonationTimer >= this.detonationDuration) {
        this.dispose();
        return true;
      }
    }

    return false;
  }

  private triggerDetonation(): void {
    this.state = 'DETONATING';

    // Remove telegraph meshes
    if (this.telegraphRingMesh) {
      this.group.remove(this.telegraphRingMesh);
      this.telegraphRingMesh.geometry.dispose();
      this.telegraphRingMat?.dispose();
    }
    if (this.telegraphDiscMesh) {
      this.group.remove(this.telegraphDiscMesh);
      this.telegraphDiscMesh.geometry.dispose();
      this.telegraphDiscMat?.dispose();
    }

    // Trigger damage callback strictly upon detonation
    if (this.onDetonate) {
      this.onDetonate(this.position, this.radius, this.damage);
    }

    // Create expanding shockwave blast
    const shockGeom = new RingGeometry(Math.max(0.1, this.radius * 0.75), this.radius, 36);
    shockGeom.rotateX(-Math.PI / 2);

    this.shockwaveMat = new MeshBasicMaterial({
      color: 0x67e8f9, // Brilliant electric cyan shockwave
      transparent: true,
      opacity: 0.9,
      side: DoubleSide,
      depthWrite: false
    });
    this.shockwaveMesh = new Mesh(shockGeom, this.shockwaveMat);
    this.group.add(this.shockwaveMesh);

    // Brief brilliant flash light
    if (typeof PointLight !== 'undefined') {
      try {
        this.flashLight = new PointLight(0x38bdf8, 3.5, this.radius * 2.2);
        this.flashLight.position.set(0, 0.8, 0);
        this.group.add(this.flashLight);
      } catch {
        // Safe fallback in mock environments
      }
    }
  }

  public dispose(): void {
    if (this.isFinished) return;
    this.isFinished = true;
    this.state = 'DONE';

    if (this.telegraphRingMesh) {
      this.group.remove(this.telegraphRingMesh);
      this.telegraphRingMesh.geometry.dispose();
      this.telegraphRingMat?.dispose();
    }
    if (this.telegraphDiscMesh) {
      this.group.remove(this.telegraphDiscMesh);
      this.telegraphDiscMesh.geometry.dispose();
      this.telegraphDiscMat?.dispose();
    }
    if (this.shockwaveMesh) {
      this.group.remove(this.shockwaveMesh);
      this.shockwaveMesh.geometry.dispose();
      this.shockwaveMat?.dispose();
    }
    if (this.flashLight) {
      this.group.remove(this.flashLight);
      this.flashLight.dispose?.();
    }

    if (this.scene && typeof this.scene.remove === 'function') {
      this.scene.remove(this.group);
    }
  }
}

/**
 * Global manager for Volatile elite affix lightning telegraphs and shockwave detonations.
 */
export class VolatileRingManager {
  private static activeInstances: VolatileRingInstance[] = [];

  public static spawn(
    scene: Scene,
    position: Vector3,
    options?: VolatileRingOptions
  ): VolatileRingInstance {
    const inst = new VolatileRingInstance(scene, position, options);
    this.activeInstances.push(inst);
    return inst;
  }

  public static update(dt: number): void {
    for (let i = this.activeInstances.length - 1; i >= 0; i--) {
      const inst = this.activeInstances[i];
      const finished = inst.update(dt);
      if (finished) {
        this.activeInstances.splice(i, 1);
      }
    }
  }

  public static clear(): void {
    for (const inst of this.activeInstances) {
      inst.dispose();
    }
    this.activeInstances = [];
  }

  public static get activeCount(): number {
    return this.activeInstances.length;
  }
}
