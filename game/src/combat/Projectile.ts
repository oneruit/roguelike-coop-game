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
  Shape,
  ShapeGeometry,
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
  isStar?: boolean;
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
  isKineticBeam?: boolean;
  isPoisonPuddle?: boolean;
  bleedDps?: number;
  sourceWeaponId?: string;
  critChance?: number;
  critDamage?: number;
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
  public isKineticBeam = false;
  public isPoisonPuddle = false;
  public isStar = false;
  private starGroup?: Group;
  private starOuterMesh?: Mesh;
  private starCrossOuterMesh?: Mesh;
  private starInnerMesh?: Mesh;
  private starGlowMesh?: Mesh;
  public hasImpacted = false;
  public isCosmetic: boolean;
  public ownerId?: string;
  public isAlive = true;
  public hitEnemies = new Set<string>(); // avoid hitting same enemy multiple times per frame
  public bleedDps: number = 0;
  public sourceWeaponId?: string;
  public critChance?: number;
  public critDamage?: number;

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

  // Poison Puddle specific visuals
  private poisonDiscMat?: MeshBasicMaterial;
  private poisonRingMat?: MeshBasicMaterial;
  private poisonBubbleMats: MeshBasicMaterial[] = [];
  private puddleTickTimer = 0;

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
    if (Projectile.starInnerMat) {
      Projectile.starInnerMat.opacity = clamped;
      Projectile.starInnerMat.visible = clamped > 0.005;
    }
    if (Projectile.starGlowMat) {
      Projectile.starGlowMat.opacity = 0.85 * clamped;
      Projectile.starGlowMat.visible = clamped > 0.005;
    }
    for (const mat of Projectile.starOuterMatCache.values()) {
      mat.opacity = 0.95 * clamped;
      mat.visible = clamped > 0.005;
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
      if (p.poisonDiscMat) {
        p.poisonDiscMat.opacity = 0.78 * clamped;
        p.poisonDiscMat.visible = clamped > 0.005;
      }
      if (p.poisonRingMat) {
        p.poisonRingMat.opacity = 0.90 * clamped;
        p.poisonRingMat.visible = clamped > 0.005;
      }
      for (const bMat of p.poisonBubbleMats) {
        bMat.opacity = 0.85 * clamped;
        bMat.visible = clamped > 0.005;
      }
    }
  }

  // Shared assets for Orbiting Barrier (Reaper's Scythe / Magic Orbs)
  private static orbGeom = new SphereGeometry(1, 10, 10);
  private static orbCoreGeom = new SphereGeometry(0.5, 8, 8);
  private static orbCoreMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
  private static orbMatCache = new Map<number, MeshStandardMaterial>();

  // Shared assets for Astral Star Projectiles
  private static starOuterGeom: ShapeGeometry | null = null;
  private static starInnerGeom: ShapeGeometry | null = null;
  private static starGlowGeom: CircleGeometry | null = null;
  private static starOuterMatCache = new Map<number, MeshBasicMaterial>();
  private static starInnerMat: MeshBasicMaterial | null = null;
  private static starGlowMat: MeshBasicMaterial | null = null;

  private static initStarAssets(color: number): void {
    if (!Projectile.starOuterGeom) {
      // 8-pointed radiant celestial star (ShapeGeometry)
      const outerShape = new Shape();
      const points = 16;
      for (let i = 0; i < points; i++) {
        const angle = (i * Math.PI * 2) / points;
        let r: number;
        if (i % 4 === 0) {
          r = 1.0; // 4 primary cardinal points
        } else if (i % 2 === 0) {
          r = 0.52; // 4 secondary diagonal points
        } else {
          r = 0.18; // 8 deep waists
        }
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) outerShape.moveTo(x, y);
        else outerShape.lineTo(x, y);
      }
      outerShape.closePath();
      Projectile.starOuterGeom = new ShapeGeometry(outerShape);

      // Inner 4-pointed radiant core star
      const innerShape = new Shape();
      const innerPoints = 8;
      for (let i = 0; i < innerPoints; i++) {
        const angle = (i * Math.PI * 2) / innerPoints + Math.PI / 4;
        const r = (i % 2 === 0) ? 0.50 : 0.12;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) innerShape.moveTo(x, y);
        else innerShape.lineTo(x, y);
      }
      innerShape.closePath();
      Projectile.starInnerGeom = new ShapeGeometry(innerShape);

      // Soft luminous central glow halo
      Projectile.starGlowGeom = new CircleGeometry(0.35, 16);

      // Pure glowing white celestial core material
      Projectile.starInnerMat = new MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: Projectile.vfxOpacity,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
        visible: Projectile.vfxOpacity > 0.005
      });

      // Ethereal outer astral glow
      Projectile.starGlowMat = new MeshBasicMaterial({
        color: 0xfdf4ff,
        transparent: true,
        opacity: 0.85 * Projectile.vfxOpacity,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
        visible: Projectile.vfxOpacity > 0.005
      });
    }

    if (!Projectile.starOuterMatCache.has(color)) {
      const mat = new MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.95 * Projectile.vfxOpacity,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
        visible: Projectile.vfxOpacity > 0.005
      });
      Projectile.starOuterMatCache.set(color, mat);
    }
  }

  // Shared assets for Poison Puddle
  private static poisonPuddleDiscGeom: CircleGeometry | null = null;
  private static poisonPuddleRingGeom: RingGeometry | null = null;
  private static poisonBubbleGeom: CircleGeometry | null = null;

  // Shared assets for Reaper's Scythe
  private static scytheGeom: PlaneGeometry | null = null;
  private static scytheMaterial: MeshBasicMaterial | null = null;

  // Shared assets for Lightning Strike
  private static lightningGeomA: PlaneGeometry | null = null;
  private static lightningGeomB: PlaneGeometry | null = null;
  private static lightningRingGeom: RingGeometry | null = null;
  private static lightningDiscGeom: CircleGeometry | null = null;

  // Shared assets for Ice Spike
  private static iceSpikeGeomA: PlaneGeometry | null = null;
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
    this.isStar = !!options.isStar || options.sourceWeaponId === 'astral_staff' || (!!options.isMagic && !options.isKineticBeam);
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
    this.isKineticBeam = !!options.isKineticBeam;
    this.isPoisonPuddle = !!options.isPoisonPuddle;
    this.curveSign = options.curveSign ?? 1;
    this.bleedDps = options.bleedDps ?? 0;
    this.sourceWeaponId = options.sourceWeaponId;
    this.critChance = options.critChance;
    this.critDamage = options.critDamage;
    this.maxLifetime = options.lifetime;

    this.mesh = new Group();

    if (this.isIceSpike) {
      if (!Projectile.iceSpikeGeomA || !Projectile.iceGroundRingGeom) {
        // Scaled down by 1.5x (2.5 -> 1.67, 5.0 -> 3.33)
        const w = 1.67;
        const h = 3.33;
        const ga = new PlaneGeometry(w, h);
        ga.translate(0, h / 2, 0); // Pivot at bottom center
        Projectile.iceSpikeGeomA = ga;

        const ring = new RingGeometry(0.14, 0.8, 24);
        ring.rotateX(-Math.PI / 2);
        Projectile.iceGroundRingGeom = ring;
      }

      this.iceSpikeMaterial = new MeshBasicMaterial({
        map: TextureManager.getIceSpikeTexture(),
        transparent: true,
        alphaTest: 0.05,
        depthWrite: true,
        side: DoubleSide,
        opacity: 1.0 * Projectile.vfxOpacity,
        visible: Projectile.vfxOpacity > 0.005
      });

      this.iceSpikeGroup = new Group();
      const spikeA = new Mesh(Projectile.iceSpikeGeomA, this.iceSpikeMaterial);
      this.iceSpikeGroup.add(spikeA);
      // Standard 2.5D isometric tilt matching all entities and rifts
      this.iceSpikeGroup.rotation.x = -Math.PI / 4.8;
      // Start scaled down at ground level for thrust eruption
      this.iceSpikeGroup.scale.set(0.1, 0.0, 0.1);
      this.mesh.add(this.iceSpikeGroup);

      this.iceGroundRingMat = new MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85 * Projectile.vfxOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        side: DoubleSide,
        visible: Projectile.vfxOpacity > 0.005
      });
      this.iceGroundRingMesh = new Mesh(Projectile.iceGroundRingGeom!, this.iceGroundRingMat);
      this.iceGroundRingMesh.position.y = 0.03;
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
    } else if (this.isKineticBeam) {
      const beamGeomA = new PlaneGeometry(0.45, 3.4);
      beamGeomA.rotateX(Math.PI / 2);
      const beamGeomB = new PlaneGeometry(0.45, 3.4);
      beamGeomB.rotateX(Math.PI / 2);
      beamGeomB.rotateY(Math.PI / 2);
      const mat = new MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.95 * Projectile.vfxOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        visible: Projectile.vfxOpacity > 0.005
      });
      this.mesh.add(new Mesh(beamGeomA, mat));
      this.mesh.add(new Mesh(beamGeomB, mat));
      const angle = Math.atan2(this.direction.x, this.direction.z);
      this.mesh.rotation.y = angle;
      this.mesh.scale.setScalar(this.radius);
    } else if (this.isPoisonPuddle) {
      if (!Projectile.poisonPuddleDiscGeom || !Projectile.poisonPuddleRingGeom || !Projectile.poisonBubbleGeom) {
        const disc = new CircleGeometry(1.0, 32);
        disc.rotateX(-Math.PI / 2);
        Projectile.poisonPuddleDiscGeom = disc;

        const ring = new RingGeometry(0.82, 1.0, 32);
        ring.rotateX(-Math.PI / 2);
        Projectile.poisonPuddleRingGeom = ring;

        const bubble = new CircleGeometry(0.12, 16);
        bubble.rotateX(-Math.PI / 2);
        Projectile.poisonBubbleGeom = bubble;
      }

      this.poisonDiscMat = new MeshBasicMaterial({
        color: 0x15803d,
        transparent: true,
        opacity: 0.78 * Projectile.vfxOpacity,
        side: DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1.2,
        visible: Projectile.vfxOpacity > 0.005
      });
      const discMesh = new Mesh(Projectile.poisonPuddleDiscGeom, this.poisonDiscMat);
      discMesh.position.y = 0.03;
      this.mesh.add(discMesh);

      this.poisonRingMat = new MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.90 * Projectile.vfxOpacity,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1.5,
        visible: Projectile.vfxOpacity > 0.005
      });
      const ringMesh = new Mesh(Projectile.poisonPuddleRingGeom, this.poisonRingMat);
      ringMesh.position.y = 0.035;
      this.mesh.add(ringMesh);

      const bubbleOffsets = [
        { x: 0.35, z: -0.22, r: 1.1 },
        { x: -0.42, z: 0.31, r: 0.8 },
        { x: 0.18, z: 0.44, r: 1.3 },
        { x: -0.26, z: -0.38, r: 0.9 }
      ];
      this.poisonBubbleMats = [];
      for (const b of bubbleOffsets) {
        const bMat = new MeshBasicMaterial({
          color: 0x86efac,
          transparent: true,
          opacity: 0.75 * Projectile.vfxOpacity,
          blending: AdditiveBlending,
          side: DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1.6,
          visible: Projectile.vfxOpacity > 0.005
        });
        this.poisonBubbleMats.push(bMat);
        const bMesh = new Mesh(Projectile.poisonBubbleGeom, bMat);
        bMesh.position.set(b.x, 0.04, b.z);
        bMesh.scale.setScalar(b.r);
        this.mesh.add(bMesh);
      }

      this.mesh.scale.set(this.radius, 1, this.radius);
    } else if (this.isStar) {
      Projectile.initStarAssets(options.color);

      this.starGroup = new Group();
      // Tilt to align face-on with 2.5D camera perspective (-Math.PI / 4.8)
      this.starGroup.rotation.x = -Math.PI / 4.8;

      const outerMat = Projectile.starOuterMatCache.get(options.color) || Projectile.starOuterMatCache.get(0xc084fc)!;
      this.starOuterMesh = new Mesh(Projectile.starOuterGeom!, outerMat);
      this.starGroup.add(this.starOuterMesh);

      // Crossed 3D flair: a second outer star rotated 90 degrees around Y for full 3D volumetric sparkle
      this.starCrossOuterMesh = new Mesh(Projectile.starOuterGeom!, outerMat);
      this.starCrossOuterMesh.rotation.y = Math.PI / 2;
      this.starGroup.add(this.starCrossOuterMesh);

      this.starInnerMesh = new Mesh(Projectile.starInnerGeom!, Projectile.starInnerMat!);
      this.starInnerMesh.position.z = 0.01;
      this.starGroup.add(this.starInnerMesh);

      this.starGlowMesh = new Mesh(Projectile.starGlowGeom!, Projectile.starGlowMat!);
      this.starGlowMesh.position.z = 0.015;
      this.starGroup.add(this.starGlowMesh);

      this.mesh.add(this.starGroup);

      const starScale = this.radius * 2.8;
      this.mesh.scale.set(starScale, starScale, starScale);
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
    this.elapsedTime += dt;

    if (this.isIceSpike) {
      const progress = 1 - Math.max(0, this.lifetime / this.maxLifetime);
      if (this.iceSpikeGroup) {
        if (progress < 0.22) {
          // Rapid thrust eruption upwards from ground base
          const t = progress / 0.22;
          const easeOut = Math.sin((t * Math.PI) / 2);
          const sY = Math.min(1.06, easeOut * 1.06);
          const sXZ = 0.3 + easeOut * 0.7;
          this.iceSpikeGroup.scale.set(sXZ, sY, sXZ);
        } else if (progress < 0.65) {
          // Fully extended crystal spike with subtle tremor
          const tremor = (Math.random() - 0.5) * 0.03;
          this.iceSpikeGroup.scale.set(1.0 + tremor, 1.0 + tremor, 1.0 + tremor);
        } else {
          // Shatter and dissolve
          const t = (progress - 0.65) / 0.35;
          const fade = Math.max(0, 1 - t);
          this.iceSpikeGroup.scale.set(fade, fade, fade);
          if (this.iceSpikeMaterial) {
            this.iceSpikeMaterial.opacity = fade * Projectile.vfxOpacity;
            this.iceSpikeMaterial.visible = Projectile.vfxOpacity > 0.005;
          }
        }
      }
      if (this.iceGroundRingMesh && this.iceGroundRingMat) {
        const ringScale = this.radius * (0.6 + progress * 0.9);
        this.iceGroundRingMesh.scale.set(ringScale, ringScale, ringScale);
        this.iceGroundRingMat.opacity = Math.max(0, (1 - progress) * 0.85) * Projectile.vfxOpacity;
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
    } else if (this.isPoisonPuddle) {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y += dt * 0.25;

      const pulse = 1.0 + Math.sin(this.elapsedTime * 5.0) * 0.04;
      this.mesh.scale.set(this.radius * pulse, 1, this.radius * pulse);

      const fadeIn = Math.min(1.0, (this.maxLifetime - this.lifetime) / 0.25);
      const fadeOut = Math.min(1.0, this.lifetime / 0.6);
      const alpha = Math.min(fadeIn, fadeOut);

      if (this.poisonDiscMat) {
        this.poisonDiscMat.opacity = 0.78 * alpha * Projectile.vfxOpacity;
        this.poisonDiscMat.visible = Projectile.vfxOpacity > 0.005 && alpha > 0.01;
      }
      if (this.poisonRingMat) {
        this.poisonRingMat.opacity = 0.90 * alpha * Projectile.vfxOpacity;
        this.poisonRingMat.visible = Projectile.vfxOpacity > 0.005 && alpha > 0.01;
      }
      for (let bi = 0; bi < this.poisonBubbleMats.length; bi++) {
        const mat = this.poisonBubbleMats[bi];
        const bPulse = 0.5 + 0.5 * Math.sin(this.elapsedTime * 6.0 + bi * 1.5);
        mat.opacity = 0.85 * alpha * bPulse * Projectile.vfxOpacity;
        mat.visible = Projectile.vfxOpacity > 0.005 && alpha > 0.01;
      }

      this.puddleTickTimer += dt;
      if (this.puddleTickTimer >= 0.40) {
        this.puddleTickTimer = 0;
        this.hitEnemies.clear();
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
      if (this.isStar) {
        if (this.starOuterMesh) this.starOuterMesh.rotation.z += dt * 8.0;
        if (this.starCrossOuterMesh) this.starCrossOuterMesh.rotation.z += dt * 8.0;
        if (this.starInnerMesh) this.starInnerMesh.rotation.z -= dt * 12.0;
        if (this.starGroup) {
          const pulse = 1.0 + Math.sin(this.elapsedTime * 14.0) * 0.08;
          this.starGroup.scale.set(pulse, pulse, pulse);
        }
      }
      this.position.addScaledVector(this.direction, this.speed * dt);
      this.mesh.position.copy(this.position);
    }
  }

  public onHit(): boolean {
    this.pierce -= 1;
    if (this.pierce <= 0 && !this.isOrbiting && !this.isChakram && !this.isLightning && !this.isIceSpike && !this.isFireball && !this.isKineticBeam && !this.isPoisonPuddle) {
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
    if (this.poisonDiscMat) {
      this.poisonDiscMat.dispose();
      this.poisonDiscMat = undefined;
    }
    if (this.poisonRingMat) {
      this.poisonRingMat.dispose();
      this.poisonRingMat = undefined;
    }
    for (const bMat of this.poisonBubbleMats) {
      bMat.dispose();
    }
    this.poisonBubbleMats = [];
  }
}
