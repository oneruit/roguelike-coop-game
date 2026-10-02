import * as THREE from 'three';
import { PassiveBuffId, getPassiveBuffId } from './PassiveBuffs';

export type GemType = 'blue' | 'green' | 'red' | 'gold';

export class Gem {
  public id: string;
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public xpValue: number;
  public type: GemType;
  public passiveBuffId?: PassiveBuffId;
  public isCollected = false;
  public isAttracted = false;
  private velocity = new THREE.Vector3();
  private baseHeight: number;
  private floatTime: number;

  // Static shared assets to avoid mid-game allocations and GC
  private static outerGeometries: Record<GemType, THREE.BufferGeometry> = {
    blue: new THREE.OctahedronGeometry(0.28, 0),
    green: new THREE.OctahedronGeometry(0.36, 0),
    red: new THREE.OctahedronGeometry(0.45, 0),
    gold: new THREE.OctahedronGeometry(0.42, 0)
  };

  private static innerGeometries: Record<GemType, THREE.BufferGeometry> = {
    blue: new THREE.OctahedronGeometry(0.14, 0),
    green: new THREE.OctahedronGeometry(0.18, 0),
    red: new THREE.OctahedronGeometry(0.225, 0),
    gold: new THREE.OctahedronGeometry(0.22, 0)
  };

  private static materials: Record<GemType, THREE.MeshStandardMaterial> = {
    blue: new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    }),
    green: new THREE.MeshStandardMaterial({
      color: 0x00e676,
      emissive: 0x00e676,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    }),
    red: new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xff1744,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.9
    })
  };

  private static coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private static goldRingGeometry = new THREE.TorusGeometry(0.48, 0.035, 6, 20);
  private static goldRingMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });

  static {
    Gem.goldRingGeometry.rotateX(Math.PI / 2);
  }

  constructor(type: GemType, position: THREE.Vector3, id?: string) {
    this.id = id || Math.random().toString(36).substring(2, 9);
    this.type = type;
    this.position = position.clone();
    this.baseHeight = 0.4;
    this.floatTime = Math.random() * Math.PI * 2;

    if (type === 'green') {
      this.xpValue = 12;
    } else if (type === 'red') {
      this.xpValue = 40;
    } else if (type === 'gold') {
      this.xpValue = 20;
      this.passiveBuffId = getPassiveBuffId(this.id);
    } else {
      this.xpValue = 3;
    }

    this.mesh = new THREE.Group();

    // Outer crystal (no castShadow for performance)
    const gemMesh = new THREE.Mesh(Gem.outerGeometries[type], Gem.materials[type]);
    this.mesh.add(gemMesh);

    // Inner glowing core
    const coreMesh = new THREE.Mesh(Gem.innerGeometries[type], Gem.coreMaterial);
    this.mesh.add(coreMesh);

    // Golden halo ring for passive crystals
    if (type === 'gold') {
      const ringMesh = new THREE.Mesh(Gem.goldRingGeometry, Gem.goldRingMaterial);
      this.mesh.add(ringMesh);
    }

    this.mesh.position.copy(this.position);
    this.mesh.position.y = this.baseHeight;
  }

  public update(dt: number, playerPos: THREE.Vector3, pickupRadius: number): boolean {
    if (this.isCollected) return false;

    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;

    if (distSq <= pickupRadius * pickupRadius) {
      this.isAttracted = true;
    }

    if (this.isAttracted) {
      // Accelerate towards player
      const dist = Math.sqrt(distSq);
      if (dist > 0.001) {
        const dirX = dx / dist;
        const dirZ = dz / dist;
        const speed = 14 + (pickupRadius - dist) * 2;
        this.velocity.x += (dirX * speed - this.velocity.x) * Math.min(1, dt * 10);
        this.velocity.z += (dirZ * speed - this.velocity.z) * Math.min(1, dt * 10);
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
      }

      // Reached player!
      if (distSq < 0.49) { // 0.7 * 0.7
        this.isCollected = true;
        return true;
      }
    }

    return false;
  }

  /**
   * Rendering phase: Viewport/Frustum culling and visual animations.
   * If inFrustum is false, skips rotation and float bobbing, setting mesh.visible = false.
   */
  public updateVisuals(dt: number, inFrustum: boolean) {
    if (this.isCollected || !inFrustum) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = true;
    this.floatTime += dt * 3;
    this.mesh.position.x = this.position.x;
    this.mesh.position.z = this.position.z;
    this.mesh.position.y = this.baseHeight + Math.sin(this.floatTime) * 0.12;
    this.mesh.rotation.y += dt * 2.5;
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
  }
}
