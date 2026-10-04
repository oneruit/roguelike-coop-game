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
  isArrow?: boolean;
  isKukri?: boolean;
  isLightning?: boolean;
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
  public isArrow = false;
  public isKukri = false;
  public isLightning = false;
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

  // Lightning specific visuals
  private lightningMaterial?: THREE.MeshBasicMaterial;
  private groundRingMesh?: THREE.Mesh;
  private groundRingMat?: THREE.MeshBasicMaterial;
  private groundDiscMat?: THREE.MeshBasicMaterial;

  // Shared assets for Orbiting Barrier (Holy Horseshoes)
  private static orbGeom = new THREE.SphereGeometry(1, 10, 10);
  private static orbCoreGeom = new THREE.SphereGeometry(0.5, 8, 8);
  private static orbCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private static orbMatCache = new Map<number, THREE.MeshStandardMaterial>();

  // Shared assets for Lightning Strike
  private static lightningGeomA: THREE.PlaneGeometry | null = null;
  private static lightningGeomB: THREE.PlaneGeometry | null = null;
  private static lightningRingGeom: THREE.RingGeometry | null = null;
  private static lightningDiscGeom: THREE.CircleGeometry | null = null;

  // Shared assets for Chakram (Spinning Blade Plane)
  private static chakramGeom: THREE.PlaneGeometry | null = null;
  private static chakramMaterial: THREE.MeshBasicMaterial | null = null;

  // Shared assets for Kukri Knife (Curved Spinning Blade)
  private static kukriGeom: THREE.PlaneGeometry | null = null;
  private static kukriMaterial: THREE.MeshBasicMaterial | null = null;

  // Shared assets for Arrow Sprites
  private static arrowGeomA: THREE.PlaneGeometry | null = null;
  private static arrowGeomB: THREE.PlaneGeometry | null = null;
  private static arrowMaterial: THREE.MeshBasicMaterial | null = null;

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
    this.isArrow = !!options.isArrow;
    this.isKukri = !!options.isKukri;
    this.isLightning = !!options.isLightning;
    this.curveSign = options.curveSign ?? 1;
    this.maxLifetime = options.lifetime;

    this.mesh = new THREE.Group();

    if (this.isLightning) {
      if (!Projectile.lightningGeomA || !Projectile.lightningGeomB || !Projectile.lightningRingGeom || !Projectile.lightningDiscGeom) {
        const w = 2.6;
        const h = 18.0;
        const ga = new THREE.PlaneGeometry(w, h);
        ga.translate(0, h / 2, 0);
        Projectile.lightningGeomA = ga;

        const gb = new THREE.PlaneGeometry(w, h);
        gb.translate(0, h / 2, 0);
        gb.rotateY(Math.PI / 2);
        Projectile.lightningGeomB = gb;

        const rg = new THREE.RingGeometry(0.15, 1.0, 24);
        rg.rotateX(-Math.PI / 2);
        Projectile.lightningRingGeom = rg;

        const dg = new THREE.CircleGeometry(0.5, 16);
        dg.rotateX(-Math.PI / 2);
        Projectile.lightningDiscGeom = dg;
      }

      this.lightningMaterial = new THREE.MeshBasicMaterial({
        map: TextureManager.getLightningTexture(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const boltA = new THREE.Mesh(Projectile.lightningGeomA, this.lightningMaterial);
      const boltB = new THREE.Mesh(Projectile.lightningGeomB, this.lightningMaterial);
      this.mesh.add(boltA);
      this.mesh.add(boltB);

      // Expanding ground impact shockwave ring
      this.groundRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      this.groundRingMesh = new THREE.Mesh(Projectile.lightningRingGeom, this.groundRingMat);
      this.groundRingMesh.position.y = 0.05;
      this.groundRingMesh.scale.set(this.radius, this.radius, this.radius);
      this.mesh.add(this.groundRingMesh);

      // Bright ground impact spark disc
      this.groundDiscMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const discMesh = new THREE.Mesh(Projectile.lightningDiscGeom, this.groundDiscMat);
      discMesh.position.y = 0.06;
      discMesh.scale.set(this.radius, this.radius, this.radius);
      this.mesh.add(discMesh);
    } else if (this.isChakram) {
      if (!Projectile.chakramGeom || !Projectile.chakramMaterial) {
        const geom = new THREE.PlaneGeometry(1.0, 1.0);
        geom.rotateX(-Math.PI / 2);
        Projectile.chakramGeom = geom;

        Projectile.chakramMaterial = new THREE.MeshBasicMaterial({
          map: TextureManager.getChakramTexture(),
          transparent: true,
          alphaTest: 0.02,
          side: THREE.DoubleSide,
          depthWrite: false
        });
      }

      const bladeMesh = new THREE.Mesh(Projectile.chakramGeom, Projectile.chakramMaterial);
      this.mesh.add(bladeMesh);

      const scale = this.radius * 2.8;
      this.mesh.scale.set(scale, scale, scale);
    } else if (this.isKukri) {
      if (!Projectile.kukriGeom || !Projectile.kukriMaterial) {
        const geom = new THREE.PlaneGeometry(1.4, 1.4);
        geom.rotateX(-Math.PI / 2);
        Projectile.kukriGeom = geom;

        Projectile.kukriMaterial = new THREE.MeshBasicMaterial({
          map: TextureManager.getKukriTexture(),
          transparent: true,
          alphaTest: 0.03,
          side: THREE.DoubleSide,
          depthWrite: false
        });
      }

      const bladeMesh = new THREE.Mesh(Projectile.kukriGeom, Projectile.kukriMaterial);
      this.mesh.add(bladeMesh);

      const scale = this.radius * 3.5;
      this.mesh.scale.set(scale, scale, scale);
    } else if (this.isArrow) {
      if (!Projectile.arrowGeomA || !Projectile.arrowGeomB || !Projectile.arrowMaterial) {
        const aspect = 32 / 128; // 0.25
        const geomA = new THREE.PlaneGeometry(1.5, 1.5 * aspect);
        geomA.rotateX(Math.PI / 4);
        Projectile.arrowGeomA = geomA;

        const geomB = new THREE.PlaneGeometry(1.5, 1.5 * aspect);
        geomB.rotateX(-Math.PI / 4);
        Projectile.arrowGeomB = geomB;

        Projectile.arrowMaterial = new THREE.MeshBasicMaterial({
          map: TextureManager.getArrowTexture(),
          transparent: true,
          alphaTest: 0.03,
          side: THREE.DoubleSide,
          depthWrite: false
        });
      }

      const meshA = new THREE.Mesh(Projectile.arrowGeomA, Projectile.arrowMaterial);
      const meshB = new THREE.Mesh(Projectile.arrowGeomB, Projectile.arrowMaterial);
      this.mesh.add(meshA);
      this.mesh.add(meshB);

      const scale = this.radius * 3.8;
      this.mesh.scale.set(scale, scale, scale);

      const angle = Math.atan2(this.direction.z, this.direction.x);
      this.mesh.rotation.y = -angle;
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

    if (this.isLightning) {
      const progress = 1 - Math.max(0, this.lifetime / this.maxLifetime);
      const flicker = 0.8 + Math.random() * 0.2;
      const alpha = Math.max(0, 1 - progress * progress) * flicker;
      if (this.lightningMaterial) {
        this.lightningMaterial.opacity = alpha;
      }
      if (this.groundRingMesh && this.groundRingMat) {
        const ringScale = this.radius * (0.8 + progress * 1.6);
        this.groundRingMesh.scale.set(ringScale, ringScale, ringScale);
        this.groundRingMat.opacity = Math.max(0, (1 - progress) * 0.85);
      }
      if (this.groundDiscMat) {
        this.groundDiscMat.opacity = Math.max(0, (1 - progress * 1.8) * 0.95);
      }
      return;
    } else if (this.isOrbiting && centerPos) {
      this.orbitAngle += this.orbitSpeed * dt;
      this.position.x = centerPos.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.position.z = centerPos.z + Math.sin(this.orbitAngle) * this.orbitRadius;
      this.position.y = centerPos.y + 0.6;
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y += dt * 6;
    } else if (this.isChakram) {
      this.elapsedTime += dt;
      this.mesh.rotation.y -= dt * 17; // Clockwise blade spin (avoids stroboscopic wagon-wheel aliasing)

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
    } else if (this.isKukri) {
      this.mesh.rotation.y += dt * 25;
      this.position.addScaledVector(this.direction, this.speed * dt);
      this.mesh.position.copy(this.position);
    } else {
      this.position.addScaledVector(this.direction, this.speed * dt);
      this.mesh.position.copy(this.position);
    }
  }

  public onHit(): boolean {
    this.pierce -= 1;
    if (this.pierce <= 0 && !this.isOrbiting && !this.isChakram && !this.isLightning) {
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
    if (this.lightningMaterial) {
      this.lightningMaterial.dispose();
      this.lightningMaterial = undefined;
    }
    if (this.groundRingMat) {
      this.groundRingMat.dispose();
      this.groundRingMat = undefined;
    }
    if (this.groundDiscMat) {
      this.groundDiscMat.dispose();
      this.groundDiscMat = undefined;
    }
  }
}
