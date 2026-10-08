import {
  AdditiveBlending,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  type Scene,
  SphereGeometry,
  Vector3
} from 'three';
import { TextureManager } from '../core/TextureManager';
import { SoundManager } from '../core/SoundManager';

export interface ProjectileOptions {
  position: Vector3;
  direction: Vector3;
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
  isIceSpike?: boolean;
  isFireball?: boolean;
  bleedDps?: number;
}

export class Projectile {
  public mesh: Group;
  public position: Vector3;
  public direction: Vector3;
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
  public isIceSpike = false;
  public isFireball = false;
  public hasImpacted = false;
  public isCosmetic: boolean;
  public ownerId?: string;
  public isAlive = true;
  public hitEnemies = new Set<string>(); // avoid hitting same enemy multiple times per frame
  public bleedDps: number = 0;

  // Orbiting projectile specific
  public isOrbiting = false;
  public orbitRadius = 2.5;
  public orbitSpeed = 4.0;
  public orbitAngle = 0;
  private orbitHitTimer = 0;

  // Chakram specific
  public isChakram = false;
  public curveSign = 1;
  public maxLifetime = 1.4;
  public elapsedTime = 0;
  public hasTurnedBack = false;

  // Lightning specific visuals
  private lightningMaterial?: MeshBasicMaterial;
  private groundRingMesh?: Mesh;
  private groundRingMat?: MeshBasicMaterial;
  private groundDiscMat?: MeshBasicMaterial;

  // Ice Spike specific visuals
  private iceSpikeGroup?: Group;
  private iceSpikeMaterial?: MeshBasicMaterial;
  private iceGroundRingMesh?: Mesh;
  private iceGroundRingMat?: MeshBasicMaterial;

  // Fireball specific visuals
  private fireballFlightGroup?: Group;
  private fireballImpactRing?: Mesh;
  private fireballImpactDisc?: Mesh;
  private fireballMaterial?: MeshBasicMaterial;
  private fireballRingMat?: MeshBasicMaterial;
  private fireballDiscMat?: MeshBasicMaterial;
  private impactLifetime = 0.24;

  // Weapon VFX Opacity control
  public static vfxOpacity: number = 1.0;
  private static activeProjectiles = new Set<Projectile>();

  public static setVfxOpacity(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    Projectile.vfxOpacity = clamped;

    if (Projectile.bulletMaterial) {
      Projectile.bulletMaterial.opacity = clamped;
      Projectile.bulletMaterial.visible = clamped > 0.005;
    }
    if (Projectile.arrowMaterial) {
      Projectile.arrowMaterial.opacity = clamped;
      Projectile.arrowMaterial.visible = clamped > 0.005;
    }
    if (Projectile.kukriMaterial) {
      Projectile.kukriMaterial.opacity = clamped;
      Projectile.kukriMaterial.visible = clamped > 0.005;
    }
    if (Projectile.chakramMaterial) {
      Projectile.chakramMaterial.opacity = clamped;
      Projectile.chakramMaterial.visible = clamped > 0.005;
    }
    if (Projectile.scytheMaterial) {
      Projectile.scytheMaterial.opacity = clamped;
      Projectile.scytheMaterial.visible = clamped > 0.005;
    }
    if (Projectile.orbCoreMat) {
      Projectile.orbCoreMat.transparent = true;
      Projectile.orbCoreMat.opacity = clamped;
      Projectile.orbCoreMat.visible = clamped > 0.005;
    }
    for (const mat of Projectile.orbMatCache.values()) {
      mat.transparent = true;
      mat.opacity = clamped;
      mat.emissiveIntensity = 1.2 * clamped;
      mat.visible = clamped > 0.005;
    }
    for (const p of Projectile.activeProjectiles) {
      if (p.lightningMaterial) {
        p.lightningMaterial.opacity = clamped;
        p.lightningMaterial.visible = clamped > 0.005;
      }
      if (p.groundRingMat) {
        p.groundRingMat.opacity = 0.9 * clamped;
        p.groundRingMat.visible = clamped > 0.005;
      }
      if (p.groundDiscMat) {
        p.groundDiscMat.opacity = 0.95 * clamped;
        p.groundDiscMat.visible = clamped > 0.005;
      }
      if (p.iceSpikeMaterial) {
        p.iceSpikeMaterial.opacity = 0.95 * clamped;
        p.iceSpikeMaterial.visible = clamped > 0.005;
      }
      if (p.iceGroundRingMat) {
        p.iceGroundRingMat.opacity = 0.9 * clamped;
        p.iceGroundRingMat.visible = clamped > 0.005;
      }
      if (p.fireballMaterial) {
        p.fireballMaterial.opacity = clamped;
        p.fireballMaterial.visible = clamped > 0.005;
      }
      if (p.fireballRingMat) {
        p.fireballRingMat.opacity = 0.95 * clamped;
        p.fireballRingMat.visible = clamped > 0.005;
      }
      if (p.fireballDiscMat) {
        p.fireballDiscMat.opacity = 0.9 * clamped;
        p.fireballDiscMat.visible = clamped > 0.005;
      }
    }
  }

  // Shared assets for Orbiting Barrier (Reaper's Scythe / Magic Orbs)
  private static orbGeom = new SphereGeometry(1, 10, 10);
  private static orbCoreGeom = new SphereGeometry(0.5, 8, 8);
  private static orbCoreMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
  private static orbMatCache = new Map<number, MeshStandardMaterial>();

  // Shared assets for Reaper's Scythe
  private static scytheGeom: PlaneGeometry | null = null;
  private static scytheMaterial: MeshBasicMaterial | null = null;

  // Shared assets for Lightning Strike
  private static lightningGeomA: PlaneGeometry | null = null;
  private static lightningGeomB: PlaneGeometry | null = null;
  private static lightningRingGeom: RingGeometry | null = null;
  private static lightningDiscGeom: CircleGeometry | null = null;

  // Shared assets for Ice Spike (Crossed Planes analogous to Lightning)
  private static iceSpikeGeomA: PlaneGeometry | null = null;
  private static iceSpikeGeomB: PlaneGeometry | null = null;
  private static iceGroundRingGeom: RingGeometry | null = null;

  // Shared assets for Fireball (Crossed Planes analogous to Lightning)
  private static fireballGeomA: PlaneGeometry | null = null;
  private static fireballGeomB: PlaneGeometry | null = null;
  private static fireballRingGeom: RingGeometry | null = null;
  private static fireballDiscGeom: CircleGeometry | null = null;

  // Shared assets for Chakram (Spinning Blade Plane)
  private static chakramGeom: PlaneGeometry | null = null;
  private static chakramMaterial: MeshBasicMaterial | null = null;

  // Shared assets for Kukri Knife (Curved Spinning Blade)
  private static kukriGeom: PlaneGeometry | null = null;
  private static kukriMaterial: MeshBasicMaterial | null = null;

  // Shared assets for Arrow Sprites
  private static arrowGeomA: PlaneGeometry | null = null;
  private static arrowGeomB: PlaneGeometry | null = null;
  private static arrowMaterial: MeshBasicMaterial | null = null;

  // Shared assets for Gun Bullet Sprites
  private static bulletGeomA: PlaneGeometry | null = null;
  private static bulletGeomB: PlaneGeometry | null = null;
  private static bulletMaterial: MeshBasicMaterial | null = null;

  private static getOrbMaterial(color: number): MeshStandardMaterial {
    let mat = Projectile.orbMatCache.get(color);
    if (!mat) {
      mat = new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.2 * Projectile.vfxOpacity,
        roughness: 0.1,
        transparent: true,
        opacity: Projectile.vfxOpacity,
        visible: Projectile.vfxOpacity > 0.005
      });
      Projectile.orbMatCache.set(color, mat);
    }
    return mat;
  }

  constructor(options: ProjectileOptions) {
    Projectile.activeProjectiles.add(this);
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
    this.isIceSpike = !!options.isIceSpike;
    this.isFireball = !!options.isFireball;
    this.curveSign = options.curveSign ?? 1;
    this.bleedDps = options.bleedDps ?? 0;
    this.maxLifetime = options.lifetime;

    this.mesh = new Group();

    if (this.isIceSpike) {
      if (!Projectile.iceSpikeGeomA || !Projectile.iceSpikeGeomB || !Projectile.iceGroundRingGeom) {
        const w = 2.4;
        const h = 5.2;
        const ga = new PlaneGeometry(w, h);
        ga.translate(0, h / 2, 0);
        Projectile.iceSpikeGeomA = ga;

        const gb = new PlaneGeometry(w, h);
        gb.translate(0, h / 2, 0);
        gb.rotateY(Math.PI / 2);
        Projectile.iceSpikeGeomB = gb;

        const ring = new RingGeometry(0.15, 1.0, 20);
        ring.rotateX(-Math.PI / 2);
        Projectile.iceGroundRingGeom = ring;
      }

      this.iceSpikeMaterial = new MeshBasicMaterial({
        map: TextureManager.getIceSpikeTexture(),
        transparent: true,
        opacity: 0.95 * Projectile.vfxOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        visible: Projectile.vfxOpacity > 0.005
      });

      this.iceSpikeGroup = new Group();
      const spikeA = new Mesh(Projectile.iceSpikeGeomA, this.iceSpikeMaterial);
      const spikeB = new Mesh(Projectile.iceSpikeGeomB, this.iceSpikeMaterial);
      this.iceSpikeGroup.add(spikeA, spikeB);
      // Start submerged below ground
      this.iceSpikeGroup.position.y = -5.2;
      this.mesh.add(this.iceSpikeGroup);

      this.iceGroundRingMat = new MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.9 * Projectile.vfxOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        visible: Projectile.vfxOpacity > 0.005
      });
      this.iceGroundRingMesh = new Mesh(Projectile.iceGroundRingGeom!, this.iceGroundRingMat);
      this.iceGroundRingMesh.position.y = 0.04;
      this.iceGroundRingMesh.scale.set(this.radius, this.radius, this.radius);
      this.mesh.add(this.iceGroundRingMesh);
    } else if (this.isFireball) {
      if (!Projectile.fireballGeomA || !Projectile.fireballGeomB || !Projectile.fireballRingGeom || !Projectile.fireballDiscGeom) {
        const w = 2.4;
        const h = 5.6;
        const ga = new PlaneGeometry(w, h);
        ga.translate(0, h / 2, 0);
        Projectile.fireballGeomA = ga;

        const gb = new PlaneGeometry(w, h);
        gb.translate(0, h / 2, 0);
        gb.rotateY(Math.PI / 2);
        Projectile.fireballGeomB = gb;

        const r = new RingGeometry(0.2, 1.0, 24);
        r.rotateX(-Math.PI / 2);
        Projectile.fireballRingGeom = r;
        const d = new CircleGeometry(0.5, 16);
        d.rotateX(-Math.PI / 2);
        Projectile.fireballDiscGeom = d;
      }

      this.fireballMaterial = new MeshBasicMaterial({
        map: TextureManager.getFireballTexture(),
        transparent: true,
        opacity: Projectile.vfxOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        visible: Projectile.vfxOpacity > 0.005
      });

      this.fireballFlightGroup = new Group();
      const fbA = new Mesh(Projectile.fireballGeomA, this.fireballMaterial);
      const fbB = new Mesh(Projectile.fireballGeomB, this.fireballMaterial);
      this.fireballFlightGroup.add(fbA, fbB);

      // Orient flight group so the bottom head points along motion direction
      const up = new Vector3(0, 1, 0);
      const backDir = this.direction.clone().negate().normalize();
      this.fireballFlightGroup.quaternion.setFromUnitVectors(up, backDir);
      this.mesh.add(this.fireballFlightGroup);
    } else if (this.isLightning) {
      if (!Projectile.lightningGeomA || !Projectile.lightningGeomB || !Projectile.lightningRingGeom || !Projectile.lightningDiscGeom) {
        const w = 2.6;
        const h = 18.0;
        const ga = new PlaneGeometry(w, h);
        ga.translate(0, h / 2, 0);
        Projectile.lightningGeomA = ga;

        const gb = new PlaneGeometry(w, h);
        gb.translate(0, h / 2, 0);
        gb.rotateY(Math.PI / 2);
        Projectile.lightningGeomB = gb;

        const rg = new RingGeometry(0.15, 1.0, 24);
        rg.rotateX(-Math.PI / 2);
        Projectile.lightningRingGeom = rg;

        const dg = new CircleGeometry(0.5, 16);
        dg.rotateX(-Math.PI / 2);
        Projectile.lightningDiscGeom = dg;
      }

      this.lightningMaterial = new MeshBasicMaterial({
        map: TextureManager.getLightningTexture(),
        transparent: true,
        opacity: Projectile.vfxOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        visible: Projectile.vfxOpacity > 0.005
      });

      const boltA = new Mesh(Projectile.lightningGeomA, this.lightningMaterial);
      const boltB = new Mesh(Projectile.lightningGeomB, this.lightningMaterial);
      this.mesh.add(boltA);
      this.mesh.add(boltB);

      // Expanding ground impact shockwave ring
      this.groundRingMat = new MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.9 * Projectile.vfxOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        visible: Projectile.vfxOpacity > 0.005
      });
      this.groundRingMesh = new Mesh(Projectile.lightningRingGeom, this.groundRingMat);
      this.groundRingMesh.position.y = 0.05;
      this.groundRingMesh.scale.set(this.radius, this.radius, this.radius);
      this.mesh.add(this.groundRingMesh);

      // Bright ground impact spark disc
      this.groundDiscMat = new MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95 * Projectile.vfxOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        visible: Projectile.vfxOpacity > 0.005
      });
      const discMesh = new Mesh(Projectile.lightningDiscGeom, this.groundDiscMat);
      discMesh.position.y = 0.06;
      discMesh.scale.set(this.radius, this.radius, this.radius);
      this.mesh.add(discMesh);
    } else if (this.isChakram) {
      if (!Projectile.chakramGeom || !Projectile.chakramMaterial) {
        const geom = new PlaneGeometry(1.0, 1.0);
        geom.rotateX(-Math.PI / 2);
        Projectile.chakramGeom = geom;

        Projectile.chakramMaterial = new MeshBasicMaterial({
          map: TextureManager.getChakramTexture(),
          transparent: true,
          opacity: Projectile.vfxOpacity,
          alphaTest: 0.02,
          side: DoubleSide,
          depthWrite: false,
          visible: Projectile.vfxOpacity > 0.005
        });
      }

      const bladeMesh = new Mesh(Projectile.chakramGeom, Projectile.chakramMaterial);
      this.mesh.add(bladeMesh);

      const scale = this.radius * 2.8;
      this.mesh.scale.set(scale, scale, scale);
    } else if (this.isKukri) {
      if (!Projectile.kukriGeom || !Projectile.kukriMaterial) {
        const geom = new PlaneGeometry(1.4, 1.4);
        geom.rotateX(-Math.PI / 2);
        Projectile.kukriGeom = geom;

        Projectile.kukriMaterial = new MeshBasicMaterial({
          map: TextureManager.getKukriTexture(),
          transparent: true,
          opacity: Projectile.vfxOpacity,
          alphaTest: 0.03,
          side: DoubleSide,
          depthWrite: false,
          visible: Projectile.vfxOpacity > 0.005
        });
      }

      const bladeMesh = new Mesh(Projectile.kukriGeom, Projectile.kukriMaterial);
      this.mesh.add(bladeMesh);

      const scale = this.radius * 3.5;
      this.mesh.scale.set(scale, scale, scale);
    } else if (this.isArrow) {
      if (!Projectile.arrowGeomA || !Projectile.arrowGeomB || !Projectile.arrowMaterial) {
        const aspect = 32 / 128; // 0.25
        const geomA = new PlaneGeometry(1.5, 1.5 * aspect);
        geomA.rotateX(Math.PI / 4);
        Projectile.arrowGeomA = geomA;

        const geomB = new PlaneGeometry(1.5, 1.5 * aspect);
        geomB.rotateX(-Math.PI / 4);
        Projectile.arrowGeomB = geomB;

        Projectile.arrowMaterial = new MeshBasicMaterial({
          map: TextureManager.getArrowTexture(),
          transparent: true,
          opacity: Projectile.vfxOpacity,
          alphaTest: 0.03,
          side: DoubleSide,
          depthWrite: false,
          visible: Projectile.vfxOpacity > 0.005
        });
      }

      const meshA = new Mesh(Projectile.arrowGeomA, Projectile.arrowMaterial);
      const meshB = new Mesh(Projectile.arrowGeomB, Projectile.arrowMaterial);
      this.mesh.add(meshA);
      this.mesh.add(meshB);

      const scale = this.radius * 3.8;
      this.mesh.scale.set(scale, scale, scale);

      const angle = Math.atan2(this.direction.z, this.direction.x);
      this.mesh.rotation.y = -angle;
    } else if (this.isOrbiting) {
      if (!Projectile.scytheGeom || !Projectile.scytheMaterial) {
        const geom = new PlaneGeometry(1.5, 1.5);
        geom.rotateX(-Math.PI / 2);
        Projectile.scytheGeom = geom;

        Projectile.scytheMaterial = new MeshBasicMaterial({
          map: TextureManager.getScytheTexture(),
          transparent: true,
          opacity: Projectile.vfxOpacity,
          side: DoubleSide,
          depthWrite: false,
          visible: Projectile.vfxOpacity > 0.005
        });
      }

      const scytheMesh = new Mesh(Projectile.scytheGeom, Projectile.scytheMaterial);
      this.mesh.add(scytheMesh);
      const scale = this.radius * 3.4;
      this.mesh.scale.set(scale, scale, scale);
    } else if (options.isMagic) {
      const sphere = new Mesh(Projectile.orbGeom, Projectile.getOrbMaterial(options.color));
      this.mesh.add(sphere);

      const core = new Mesh(Projectile.orbCoreGeom, Projectile.orbCoreMat);
      this.mesh.add(core);

      this.mesh.scale.setScalar(this.radius);
    } else {
      // Authentic Revolver Bullet Sprite from FX sheet #6
      if (!Projectile.bulletGeomA || !Projectile.bulletGeomB || !Projectile.bulletMaterial) {
        const aspect = 8 / 52;
        const geomA = new PlaneGeometry(1.0, aspect);
        geomA.rotateX(Math.PI / 4);
        Projectile.bulletGeomA = geomA;

        const geomB = new PlaneGeometry(1.0, aspect);
        geomB.rotateX(-Math.PI / 4);
        Projectile.bulletGeomB = geomB;

        Projectile.bulletMaterial = new MeshBasicMaterial({
          map: TextureManager.getBulletTexture(),
          transparent: true,
          opacity: Projectile.vfxOpacity,
          alphaTest: 0.04,
          side: DoubleSide,
          depthWrite: false,
          visible: Projectile.vfxOpacity > 0.005
        });
      }

      const meshA = new Mesh(Projectile.bulletGeomA, Projectile.bulletMaterial);
      const meshB = new Mesh(Projectile.bulletGeomB, Projectile.bulletMaterial);
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

  public update(dt: number, centerPos?: Vector3) {
    if (!this.isAlive) return;

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.isAlive = false;
      return;
    }

    if (this.isIceSpike) {
      const progress = 1 - Math.max(0, this.lifetime / this.maxLifetime);
      if (this.iceSpikeGroup) {
        if (progress < 0.25) {
          // Rapidly thrust upwards from underneath the ground (-5.2 to 0)
          const t = progress / 0.25;
          const easeOut = Math.sin((t * Math.PI) / 2);
          this.iceSpikeGroup.position.y = -5.2 * (1 - easeOut);
        } else if (progress < 0.65) {
          // Peak extension with subtle crystalline tremor
          this.iceSpikeGroup.position.y = 0.0 + (Math.random() - 0.5) * 0.04;
        } else {
          // Shatter and dissolve
          const t = (progress - 0.65) / 0.35;
          const fade = Math.max(0, 1 - t);
          this.iceSpikeGroup.scale.set(fade, fade, fade);
          if (this.iceSpikeMaterial) {
            this.iceSpikeMaterial.opacity = fade * 0.95 * Projectile.vfxOpacity;
            this.iceSpikeMaterial.visible = Projectile.vfxOpacity > 0.005;
          }
        }
      }
      if (this.iceGroundRingMesh && this.iceGroundRingMat) {
        const ringScale = this.radius * (0.6 + progress * 0.9);
        this.iceGroundRingMesh.scale.set(ringScale, ringScale, ringScale);
        this.iceGroundRingMat.opacity = Math.max(0, (1 - progress) * 0.9) * Projectile.vfxOpacity;
        this.iceGroundRingMat.visible = Projectile.vfxOpacity > 0.005;
      }
      return;
    } else if (this.isFireball) {
      if (!this.hasImpacted) {
        // Descending along trajectory towards impact point
        this.position.addScaledVector(this.direction, this.speed * dt);
        this.mesh.position.copy(this.position);

        if (this.position.y <= 0.25) {
          this.hasImpacted = true;
          this.position.y = 0.05;
          this.mesh.position.copy(this.position);
          this.lifetime = this.impactLifetime;
          this.maxLifetime = this.impactLifetime;

          if (this.fireballFlightGroup) this.fireballFlightGroup.visible = false;

          this.fireballRingMat = new MeshBasicMaterial({
            color: 0xf97316,
            transparent: true,
            opacity: 0.95 * Projectile.vfxOpacity,
            blending: AdditiveBlending,
            depthWrite: false,
            side: DoubleSide,
            visible: Projectile.vfxOpacity > 0.005
          });
          this.fireballImpactRing = new Mesh(Projectile.fireballRingGeom!, this.fireballRingMat);
          this.fireballImpactRing.position.y = 0.04;
          this.mesh.add(this.fireballImpactRing);

          this.fireballDiscMat = new MeshBasicMaterial({
            color: 0xfef08a,
            transparent: true,
            opacity: 0.9 * Projectile.vfxOpacity,
            blending: AdditiveBlending,
            depthWrite: false,
            side: DoubleSide,
            visible: Projectile.vfxOpacity > 0.005
          });
          this.fireballImpactDisc = new Mesh(Projectile.fireballDiscGeom!, this.fireballDiscMat);
          this.fireballImpactDisc.position.y = 0.05;
          this.mesh.add(this.fireballImpactDisc);

          SoundManager.playFireballImpact();
        }
      } else {
        // Detonation explosion expansion phase
        const progress = 1 - Math.max(0, this.lifetime / this.maxLifetime);
        if (this.fireballImpactRing && this.fireballRingMat) {
          const ringScale = this.radius * (0.4 + progress * 1.6);
          this.fireballImpactRing.scale.set(ringScale, ringScale, ringScale);
          this.fireballRingMat.opacity = Math.max(0, (1 - progress) * 0.95) * Projectile.vfxOpacity;
          this.fireballRingMat.visible = Projectile.vfxOpacity > 0.005;
        }
        if (this.fireballImpactDisc && this.fireballDiscMat) {
          this.fireballDiscMat.opacity = Math.max(0, (1 - progress * 1.7) * 0.9) * Projectile.vfxOpacity;
          this.fireballDiscMat.visible = Projectile.vfxOpacity > 0.005;
        }
      }
      return;
    } else if (this.isLightning) {
      const progress = 1 - Math.max(0, this.lifetime / this.maxLifetime);
      const flicker = 0.8 + Math.random() * 0.2;
      const alpha = Math.max(0, 1 - progress * progress) * flicker * Projectile.vfxOpacity;
      if (this.lightningMaterial) {
        this.lightningMaterial.opacity = alpha;
        this.lightningMaterial.visible = Projectile.vfxOpacity > 0.005;
      }
      if (this.groundRingMesh && this.groundRingMat) {
        const ringScale = this.radius * (0.8 + progress * 1.6);
        this.groundRingMesh.scale.set(ringScale, ringScale, ringScale);
        this.groundRingMat.opacity = Math.max(0, (1 - progress) * 0.85) * Projectile.vfxOpacity;
        this.groundRingMat.visible = Projectile.vfxOpacity > 0.005;
      }
      if (this.groundDiscMat) {
        this.groundDiscMat.opacity = Math.max(0, (1 - progress * 1.8) * 0.95) * Projectile.vfxOpacity;
        this.groundDiscMat.visible = Projectile.vfxOpacity > 0.005;
      }
      return;
    } else if (this.isOrbiting && centerPos) {
      this.orbitAngle += this.orbitSpeed * dt;
      this.position.x = centerPos.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.position.z = centerPos.z + Math.sin(this.orbitAngle) * this.orbitRadius;
      this.position.y = centerPos.y + 0.6;
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y += dt * 6;
      this.orbitHitTimer += dt;
      if (this.orbitHitTimer >= 0.40) {
        this.orbitHitTimer = 0;
        this.hitEnemies.clear();
      }
    } else if (this.isChakram) {
      this.elapsedTime += dt;
      this.mesh.rotation.y -= dt * 17; // Clockwise blade spin (avoids stroboscopic wagon-wheel aliasing)

      const turnTime = this.maxLifetime * 0.44;
      if (this.elapsedTime < turnTime) {
        // Outward sweeping curved arc phase
        const progress = this.elapsedTime / turnTime;
        const curveAngle = (this.curveSign || 1) * dt * 3.4 * (1 - progress * 0.4);
        this.direction.applyAxisAngle(new Vector3(0, 1, 0), curveAngle);
        const curSpeed = this.speed * Math.max(0.25, 1 - progress * 0.65);
        this.position.addScaledVector(this.direction, curSpeed * dt);
      } else {
        // Returning boomerang phase: clear hits once so it damages on return trip
        if (!this.hasTurnedBack) {
          this.hasTurnedBack = true;
          this.hitEnemies.clear();
        }

        if (centerPos) {
          const toOwner = new Vector3().subVectors(centerPos, this.position);
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
    if (this.pierce <= 0 && !this.isOrbiting && !this.isChakram && !this.isLightning && !this.isIceSpike && !this.isFireball) {
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

  public destroy(scene: Scene) {
    Projectile.activeProjectiles.delete(this);
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
    if (this.iceSpikeMaterial) {
      this.iceSpikeMaterial.dispose();
      this.iceSpikeMaterial = undefined;
    }
    if (this.iceGroundRingMat) {
      this.iceGroundRingMat.dispose();
      this.iceGroundRingMat = undefined;
    }
    if (this.fireballMaterial) {
      this.fireballMaterial.dispose();
      this.fireballMaterial = undefined;
    }
    if (this.fireballRingMat) {
      this.fireballRingMat.dispose();
      this.fireballRingMat = undefined;
    }
    if (this.fireballDiscMat) {
      this.fireballDiscMat.dispose();
      this.fireballDiscMat = undefined;
    }
  }
}
