import {
  Group,
  Vector3,
  type BufferGeometry,
  OctahedronGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  TorusGeometry,
  Mesh,
  type Scene
} from 'three';
import { PassiveBuffId, getPassiveBuffId } from './PassiveBuffs';

import { GemType } from '../shared/types';
export type { GemType };

export class Gem {
  public id: string;
  public mesh: Group;
  public position: Vector3;
  public xpValue: number;
  public type: GemType;
  public passiveBuffId?: PassiveBuffId;
  public crystalValue: number = 0;
  public isCollected = false;
  public isAttracted = false;
  public getElevation?: (x: number, z: number) => number;
  private velocity = new Vector3();
  private baseHeight: number;
  private floatTime: number;
  private outerMesh: Mesh;
  private coreMesh: Mesh;

  // Static shared assets to avoid mid-game allocations and GC
  private static outerGeometries: Record<GemType, BufferGeometry> = {
    blue: new OctahedronGeometry(0.28, 0),
    green: new OctahedronGeometry(0.36, 0),
    red: new OctahedronGeometry(0.45, 0),
    gold: new OctahedronGeometry(0.42, 0),
    crystal: new OctahedronGeometry(0.35, 0)
  };

  private static innerGeometries: Record<GemType, BufferGeometry> = {
    blue: new OctahedronGeometry(0.14, 0),
    green: new OctahedronGeometry(0.18, 0),
    red: new OctahedronGeometry(0.225, 0),
    gold: new OctahedronGeometry(0.22, 0),
    crystal: new OctahedronGeometry(0.18, 0)
  };

  private static materials: Record<GemType, MeshStandardMaterial> = {
    blue: new MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    }),
    green: new MeshStandardMaterial({
      color: 0x00e676,
      emissive: 0x00e676,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    }),
    red: new MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xff1744,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    }),
    gold: new MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.9
    }),
    crystal: new MeshStandardMaterial({
      color: 0xd946ef,
      emissive: 0x9333ea,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.85
    })
  };

  private static coreMaterial = new MeshBasicMaterial({ color: 0xffffff });
  private static goldRingGeometry = new TorusGeometry(0.48, 0.035, 6, 20);
  private static goldRingMaterial = new MeshBasicMaterial({ color: 0xffd700 });
  private static crystalRingGeometry = new TorusGeometry(0.44, 0.03, 6, 20);
  private static crystalRingMaterial = new MeshBasicMaterial({ color: 0xd946ef });

  static {
    Gem.goldRingGeometry.rotateX(Math.PI / 2);
    Gem.crystalRingGeometry.rotateX(Math.PI / 2);
  }

  constructor(type: GemType, position: Vector3, id?: string) {
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
    } else if (type === 'crystal') {
      this.xpValue = 5;
      this.crystalValue = 1;
    } else {
      this.xpValue = 3;
    }

    this.mesh = new Group();

    // Outer crystal (no castShadow for performance)
    this.outerMesh = new Mesh(Gem.outerGeometries[type], Gem.materials[type]);
    this.mesh.add(this.outerMesh);

    // Inner glowing core
    this.coreMesh = new Mesh(Gem.innerGeometries[type], Gem.coreMaterial);
    this.mesh.add(this.coreMesh);

    // Golden halo ring for passive crystals
    if (type === 'gold') {
      const ringMesh = new Mesh(Gem.goldRingGeometry, Gem.goldRingMaterial);
      this.mesh.add(ringMesh);
    } else if (type === 'crystal') {
      const ringMesh = new Mesh(Gem.crystalRingGeometry, Gem.crystalRingMaterial);
      this.mesh.add(ringMesh);
    }

    this.mesh.position.copy(this.position);
    this.mesh.position.y = this.baseHeight;
  }

  public setType(newType: GemType): void {
    if (this.type === newType) return;
    this.type = newType;
    if (this.outerMesh && Gem.outerGeometries[newType] && Gem.materials[newType]) {
      this.outerMesh.geometry = Gem.outerGeometries[newType];
      this.outerMesh.material = Gem.materials[newType];
    }
    if (this.coreMesh && Gem.innerGeometries[newType]) {
      this.coreMesh.geometry = Gem.innerGeometries[newType];
    }
  }

  public addXp(amount: number): void {
    this.xpValue += amount;
    if (this.type !== 'gold' && this.type !== 'crystal') {
      if (this.xpValue >= 75) {
        this.setType('red');
      } else if (this.xpValue >= 25) {
        this.setType('green');
      }
      const scaleMultiplier = Math.min(2.0, 1.0 + Math.max(0, this.xpValue - 40) * 0.005);
      this.mesh.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);
    }
  }

  public update(dt: number, playerPos: Vector3, pickupRadius: number): boolean {
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
        const speed = 14 + Math.max(0, dist - pickupRadius) * 2.2;
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
    const groundY = this.getElevation ? this.getElevation(this.position.x, this.position.z) : this.position.y;
    this.mesh.position.y = groundY + this.baseHeight + Math.sin(this.floatTime) * 0.12;
    this.mesh.rotation.y += dt * 2.5;
  }

  public destroy(scene: Scene) {
    scene.remove(this.mesh);
  }
}
