import * as THREE from 'three';
import { TextureManager } from '../core/TextureManager';

export interface ProjectileOptions {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  damage: number;
  pierce: number;
  lifetime: number;
  radius: number;
  color: number;
  isMagic?: boolean;
  isChakram?: boolean;
  curveSign?: number;
  isOrbiting?: boolean;
  orbitRadius?: number;
  orbitSpeed?: number;
  isCosmetic?: boolean;
  ownerId?: string;
}

export class Projectile {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public direction: THREE.Vector3;
  public speed: number;
  public damage: number;
  public pierce: number;
  public lifetime: number;
  public radius: number;
  public color: number;
  public isMagic: boolean;
  public isCosmetic: boolean;
  public ownerId?: string;
  public isAlive = true;
  public hitEnemies = new Set<string>(); // avoid hitting same enemy multiple times per frame

  // Orbiting projectile specific
  public isOrbiting = false;
  public orbitRadius = 2.5;
  public orbitSpeed = 4.0;
  public orbitAngle = 0;

  // Chakram specific
  public isChakram = false;
  public curveSign = 1;
  public maxLifetime = 1.4;
  public elapsedTime = 0;
  public hasTurnedBack = false;

  // Shared assets for Orbiting Barrier (Holy Horseshoes)
  private static orbGeom = new THREE.SphereGeometry(1, 10, 10);
  private static orbCoreGeom = new THREE.SphereGeometry(0.5, 8, 8);
  private static orbCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private static orbMatCache = new Map<number, THREE.MeshStandardMaterial>();

  // Shared assets for Chakram (Spinning Blade Ring)
  private static chakramRingGeom = new THREE.TorusGeometry(0.55, 0.12, 8, 28);
  private static chakramDiscGeom = new THREE.CircleGeometry(0.46, 20);
  private static chakramRingMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.8
  });
  private static chakramDiscMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide
  });

  // Shared assets for Gun Bullet Sprites
  private static bulletGeomA: THREE.PlaneGeometry | null = null;
  private static bulletGeomB: THREE.PlaneGeometry | null = null;
  private static bulletMaterial: THREE.MeshBasicMaterial | null = null;

  private static getOrbMaterial(color: number): THREE.MeshStandardMaterial {
    let mat = Projectile.orbMatCache.get(color);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.2,
        roughness: 0.1
      });
      Projectile.orbMatCache.set(color, mat);
    }
    return mat;
  }

  constructor(options: ProjectileOptions) {
    this.position = options.position.clone();
    this.direction = options.direction.clone().normalize();
    this.speed = options.speed;
    this.damage = options.damage;
    this.pierce = options.pierce;
    this.lifetime = options.lifetime;
    this.radius = options.radius;
    this.color = options.color;
    this.isMagic = !!options.isMagic;
    this.isCosmetic = !!options.isCosmetic;
    this.ownerId = options.ownerId;
    this.isOrbiting = !!options.isOrbiting;
    this.orbitRadius = options.orbitRadius ?? 2.5;
    this.orbitSpeed = options.orbitSpeed ?? 4.0;
    this.isChakram = !!options.isChakram;
    this.curveSign = options.curveSign ?? 1;
    this.maxLifetime = options.lifetime;

    this.mesh = new THREE.Group();

    if (this.isChakram) {
      // Golden razor-sharp spinning chakram blade with glowing energy core
      const ringMesh = new THREE.Mesh(Projectile.chakramRingGeom, Projectile.chakramRingMat);
      ringMesh.rotation.x = Math.PI / 2;
      const discMesh = new THREE.Mesh(Projectile.chakramDiscGeom, Projectile.chakramDiscMat);
      discMesh.rotation.x = -Math.PI / 2;
      this.mesh.add(ringMesh);
      this.mesh.add(discMesh);

      const scale = this.radius * 2.8;
      this.mesh.scale.set(scale, scale, scale);
    } else if (this.isOrbiting || options.isMagic) {
      const sphere = new THREE.Mesh(Projectile.orbGeom, Projectile.getOrbMaterial(options.color));
      this.mesh.add(sphere);

      const core = new THREE.Mesh(Projectile.orbCoreGeom, Projectile.orbCoreMat);
      this.mesh.add(core);

      this.mesh.scale.setScalar(this.radius);
    } else {
      // Authentic Revolver Bullet Sprite from FX sheet #6
      if (!Projectile.bulletGeomA || !Projectile.bulletGeomB || !Projectile.bulletMaterial) {
        const aspect = 8 / 52;
        const geomA = new THREE.PlaneGeometry(1.0, aspect);
        geomA.rotateX(Math.PI / 4);
        Projectile.bulletGeomA = geomA;

        const geomB = new THREE.PlaneGeometry(1.0, aspect);
        geomB.rotateX(-Math.PI / 4);
        Projectile.bulletGeomB = geomB;

        Projectile.bulletMaterial = new THREE.MeshBasicMaterial({
          map: TextureManager.getBulletTexture(),
          transparent: true,
          alphaTest: 0.04,
          side: THREE.DoubleSide,
          depthWrite: false
        });
      }

      const meshA = new THREE.Mesh(Projectile.bulletGeomA, Projectile.bulletMaterial);
      const meshB = new THREE.Mesh(Projectile.bulletGeomB, Projectile.bulletMaterial);
      this.mesh.add(meshA);
      this.mesh.add(meshB);

      // Scale bullet: length scales with weapon radius
      const scaleLen = this.radius * 4.4;
      this.mesh.scale.set(scaleLen, scaleLen, scaleLen);

      // Orient bullet along flight path
      const angle = Math.atan2(this.direction.z, this.direction.x);
      this.mesh.rotation.y = -angle;
    }

    this.mesh.position.copy(this.position);
  }

  public update(dt: number, centerPos?: THREE.Vector3) {
    if (!this.isAlive) return;

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.isAlive = false;
      return;
    }

    if (this.isOrbiting && centerPos) {
      this.orbitAngle += this.orbitSpeed * dt;
      this.position.x = centerPos.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.position.z = centerPos.z + Math.sin(this.orbitAngle) * this.orbitRadius;
      this.position.y = centerPos.y + 0.6;
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y += dt * 6;
    } else if (this.isChakram) {
      this.elapsedTime += dt;
      this.mesh.rotation.y += dt * 26; // Rapid horizontal blade spin

      const turnTime = this.maxLifetime * 0.44;
      if (this.elapsedTime < turnTime) {
        // Outward sweeping curved arc phase
        const progress = this.elapsedTime / turnTime;
        const curveAngle = (this.curveSign || 1) * dt * 3.4 * (1 - progress * 0.4);
        this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), curveAngle);
        const curSpeed = this.speed * Math.max(0.25, 1 - progress * 0.65);
        this.position.addScaledVector(this.direction, curSpeed * dt);
      } else {
        // Returning boomerang phase: clear hits once so it damages on return trip
        if (!this.hasTurnedBack) {
          this.hasTurnedBack = true;
          this.hitEnemies.clear();
        }

        if (centerPos) {
          const toOwner = new THREE.Vector3().subVectors(centerPos, this.position);
          toOwner.y = 0;
          const dist = toOwner.length();
          if (dist < 1.0) {
            // Caught by the hero!
            this.isAlive = false;
            return;
          }
          toOwner.normalize();
          const returnSpeed = this.speed * (1.1 + (this.elapsedTime - turnTime) * 0.7);
          this.direction.lerp(toOwner, Math.min(1.0, dt * 7.5)).normalize();
          this.position.addScaledVector(this.direction, returnSpeed * dt);
        } else {
          this.position.addScaledVector(this.direction, -this.speed * dt);
        }
      }
      this.mesh.position.copy(this.position);
    } else {
      this.position.addScaledVector(this.direction, this.speed * dt);
      this.mesh.position.copy(this.position);
    }
  }

  public onHit(): boolean {
    this.pierce -= 1;
    if (this.pierce <= 0 && !this.isOrbiting && !this.isChakram) {
      this.isAlive = false;
      return true;
    }
    return false;
  }

  public updateVisuals(inFrustum: boolean) {
    if (!this.isAlive || !inFrustum) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
  }
}
