import {
  Group,
  Vector3,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  OctahedronGeometry,
  DoubleSide,
  Texture,
  TextureLoader,
  SRGBColorSpace,
  PointLight,
  CanvasTexture,
  type Scene,
  type Camera
} from 'three';
import { getAssetUrl } from '../utils/assetPath';
import { SoundManager } from '../core/SoundManager';
import { SulfurSmokeManager } from '../vfx/SulfurSmokeVfx';
import type { Player } from '../entities/Player';
import type { RemotePlayer } from '../entities/RemotePlayer';
import type { EnemyManager } from '../entities/EnemyManager';
import type { DamageNumberManager } from '../combat/DamageNumberManager';

export type NestState = 'IDLE' | 'PLANTING' | 'ARMED' | 'DESTROYED' | 'CHARGED' | 'EXTRACTED';

export class DroppedAstralCore {
  public id: string;
  public position: Vector3;
  public mesh: Group;
  private coreMesh: Mesh;
  private groundRing: Mesh;
  private light: PointLight;
  private animTimer: number = 0;

  private overheadSprite?: Mesh;
  private overheadCanvas?: HTMLCanvasElement;
  private overheadCtx?: CanvasRenderingContext2D;
  private overheadTex?: CanvasTexture;

  constructor(id: string, position: Vector3) {
    this.id = id;
    this.position = position.clone();
    this.mesh = new Group();
    this.mesh.position.copy(this.position);

    // 1. Floating Octahedron Core
    const coreGeom = new OctahedronGeometry(0.75);
    const coreMat = new MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: false
    });
    this.coreMesh = new Mesh(coreGeom, coreMat);
    this.coreMesh.position.y = 1.1;
    this.mesh.add(this.coreMesh);

    // 2. Ground beacon ring
    const ringGeom = new RingGeometry(0.5, 2.0, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: DoubleSide,
      depthWrite: false
    });
    this.groundRing = new Mesh(ringGeom, ringMat);
    this.groundRing.position.y = 0.04;
    this.mesh.add(this.groundRing);

    // 3. Glowing cyan point light
    this.light = new PointLight(0x38bdf8, 3.0, 14);
    this.light.position.set(0, 1.1, 0);
    this.mesh.add(this.light);

    this.createOverheadUI();
  }

  private createOverheadUI() {
    if (typeof document === 'undefined') return;
    this.overheadCanvas = document.createElement('canvas');
    this.overheadCanvas.width = 256;
    this.overheadCanvas.height = 64;
    this.overheadCtx = this.overheadCanvas.getContext('2d')!;
    this.overheadTex = new CanvasTexture(this.overheadCanvas);

    const planeGeom = new PlaneGeometry(3.0, 0.75);
    const planeMat = new MeshBasicMaterial({
      map: this.overheadTex,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    this.overheadSprite = new Mesh(planeGeom, planeMat);
    this.overheadSprite.position.set(0, 2.3, 0);
    this.overheadSprite.rotation.x = -Math.PI / 4.8;
    this.overheadSprite.renderOrder = 999;
    this.mesh.add(this.overheadSprite);

    this.redrawOverhead();
  }

  private redrawOverhead() {
    if (!this.overheadCanvas || !this.overheadCtx || !this.overheadTex) return;
    const ctx = this.overheadCtx;
    const w = this.overheadCanvas.width;
    const h = this.overheadCanvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(12, 74, 110, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(8, 6, w - 16, h - 12, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Cinzel", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ АСТРАЛЬНОЕ ЯДРО', w / 2, h / 2);

    this.overheadTex.needsUpdate = true;
  }

  public update(dt: number): void {
    this.animTimer += dt;
    this.coreMesh.rotation.y += dt * 3.5;
    this.coreMesh.rotation.z += dt * 1.8;
    this.coreMesh.position.y = 1.1 + Math.sin(this.animTimer * 4.5) * 0.18;

    const ringScale = 1.0 + Math.sin(this.animTimer * 3.5) * 0.2;
    this.groundRing.scale.set(ringScale, ringScale, 1.0);
    this.light.intensity = 2.5 + Math.sin(this.animTimer * 5.0) * 0.8;
  }

  public dispose(scene: Scene): void {
    scene.remove(this.mesh);
    this.coreMesh.geometry.dispose();
    (this.coreMesh.material as MeshBasicMaterial).dispose();
    this.groundRing.geometry.dispose();
    (this.groundRing.material as MeshBasicMaterial).dispose();
    this.overheadTex?.dispose();
    if (this.overheadSprite) {
      this.overheadSprite.geometry.dispose();
      (this.overheadSprite.material as MeshBasicMaterial).dispose();
    }
  }
}

export class MobNest {
  /** 1 map grid square diameter (50m across, radius 25m) */
  public static readonly BLAST_RADIUS = 25.0;
  public static readonly INTERACT_RADIUS = 3.8;
  public static readonly PLANT_DURATION = 1.8; // seconds holding E to plant
  public static readonly FUSE_DURATION = 5.0;  // 5 seconds fuse
  public static readonly BLAST_DAMAGE = 35;    // non-lethal but noticeable player damage

  public id: string;
  public position: Vector3;
  public state: NestState = 'IDLE';

  public plantProgress: number = 0; // 0.0 to 1.0
  public fuseTimer: number = MobNest.FUSE_DURATION;
  public blastRadius: number = MobNest.BLAST_RADIUS;

  public mesh: Group;

  // Visuals
  private spriteMesh!: Mesh;
  private spriteMat!: MeshBasicMaterial;
  private shadowMesh!: Mesh;
  private dangerZoneMesh!: Mesh;
  private dangerZoneMat!: MeshBasicMaterial;
  private innerDangerRing!: Mesh;
  private innerDangerMat!: MeshBasicMaterial;
  private beaconLight!: PointLight;

  // Astral Core Hovering Visuals (Stage 4 Generator)
  private coreOrbMesh!: Mesh;
  private coreOrbLight!: PointLight;
  private coreEnergyRing!: Mesh;

  // Overhead canvas UI
  private overheadSprite!: Mesh;
  private overheadCanvas!: HTMLCanvasElement;
  private overheadCtx!: CanvasRenderingContext2D;
  private overheadTex!: CanvasTexture;

  // Textures
  private static nestTex: Texture | null = null;
  private static craterTex: Texture | null = null;
  private static loader = new TextureLoader();

  private lastTickSecond: number = 5;
  private animTimer: number = 0;

  constructor(id: string, position: Vector3) {
    this.id = id;
    this.position = position.clone();
    this.mesh = new Group();
    this.mesh.position.copy(this.position);

    this.createVisuals();
  }

  private static getNestTexture(): Texture {
    if (!this.nestTex) {
      if (typeof document === 'undefined') {
        this.nestTex = new Texture();
      } else {
        this.nestTex = this.loader.load(getAssetUrl('/textures/props/void_nest.png'));
        this.nestTex.colorSpace = SRGBColorSpace;
      }
    }
    return this.nestTex;
  }

  private static getCraterTexture(): Texture {
    if (!this.craterTex) {
      if (typeof document === 'undefined') {
        this.craterTex = new Texture();
      } else {
        this.craterTex = this.loader.load(getAssetUrl('/textures/props/void_nest_crater.png'));
        this.craterTex.colorSpace = SRGBColorSpace;
      }
    }
    return this.craterTex;
  }

  private createVisuals() {
    // 1. Dark contact shadow on ground
    const shadowGeom = new PlaneGeometry(5.2, 5.2);
    shadowGeom.rotateX(-Math.PI / 2);
    const shadowMat = new MeshBasicMaterial({
      color: 0x050208,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    this.shadowMesh = new Mesh(shadowGeom, shadowMat);
    this.shadowMesh.position.y = 0.02;
    this.mesh.add(this.shadowMesh);

    // 2. Central 2.5D Nest / Generator Base Sprite
    const spriteGeom = new PlaneGeometry(4.8, 4.8);
    spriteGeom.translate(0, 2.1, 0); // anchor near ground
    this.spriteMat = new MeshBasicMaterial({
      map: MobNest.getNestTexture(),
      transparent: true,
      alphaTest: 0.05,
      side: DoubleSide,
      depthWrite: true
    });
    this.spriteMesh = new Mesh(spriteGeom, this.spriteMat);
    this.spriteMesh.rotation.x = -Math.PI / 4.8; // standard 2.5D camera tilt
    this.mesh.add(this.spriteMesh);

    // 3. Danger zone circle on ground (used in legacy fuse countdown)
    const dangerGeom = new RingGeometry(0.5, MobNest.BLAST_RADIUS, 64);
    dangerGeom.rotateX(-Math.PI / 2);
    this.dangerZoneMat = new MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.0,
      side: DoubleSide,
      depthWrite: false
    });
    this.dangerZoneMesh = new Mesh(dangerGeom, this.dangerZoneMat);
    this.dangerZoneMesh.position.y = 0.04;
    this.dangerZoneMesh.visible = false;
    this.mesh.add(this.dangerZoneMesh);

    // 3b. Outer border ring for high visibility
    const borderGeom = new RingGeometry(MobNest.BLAST_RADIUS - 0.6, MobNest.BLAST_RADIUS, 64);
    borderGeom.rotateX(-Math.PI / 2);
    this.innerDangerMat = new MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.0,
      side: DoubleSide,
      depthWrite: false
    });
    this.innerDangerRing = new Mesh(borderGeom, this.innerDangerMat);
    this.innerDangerRing.position.y = 0.05;
    this.innerDangerRing.visible = false;
    this.mesh.add(this.innerDangerRing);

    // 4. Floating Astral Core (when charged / idle)
    const coreGeom = new OctahedronGeometry(0.85);
    const coreMat = new MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: false
    });
    this.coreOrbMesh = new Mesh(coreGeom, coreMat);
    this.coreOrbMesh.position.set(0, 2.2, 0);
    this.mesh.add(this.coreOrbMesh);

    // Ground energy aura ring (pulsing cyan)
    const ringGeom = new RingGeometry(1.0, 3.2, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.55,
      side: DoubleSide,
      depthWrite: false
    });
    this.coreEnergyRing = new Mesh(ringGeom, ringMat);
    this.coreEnergyRing.position.y = 0.03;
    this.mesh.add(this.coreEnergyRing);

    this.coreOrbLight = new PointLight(0x38bdf8, 2.8, 16);
    this.coreOrbLight.position.set(0, 2.2, 0);
    this.mesh.add(this.coreOrbLight);

    // Red blinking point light for armed bomb state
    this.beaconLight = new PointLight(0xef4444, 0, 15);
    this.beaconLight.position.set(0, 0.8, 0);
    this.mesh.add(this.beaconLight);

    // 5. Overhead Canvas UI
    this.createOverheadUI();
  }

  private createOverheadUI() {
    if (typeof document === 'undefined') {
      return;
    }
    this.overheadCanvas = document.createElement('canvas');
    this.overheadCanvas.width = 256;
    this.overheadCanvas.height = 72;
    this.overheadCtx = this.overheadCanvas.getContext('2d')!;

    this.overheadTex = new CanvasTexture(this.overheadCanvas);
    const planeGeom = new PlaneGeometry(3.6, 1.0);
    const planeMat = new MeshBasicMaterial({
      map: this.overheadTex,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });

    this.overheadSprite = new Mesh(planeGeom, planeMat);
    this.overheadSprite.position.set(0, 3.8, 0);
    this.overheadSprite.rotation.x = -Math.PI / 4.8;
    this.overheadSprite.renderOrder = 999;
    if (this.overheadSprite) this.overheadSprite.visible = true;
    this.mesh.add(this.overheadSprite);
    this.redrawOverhead();
  }

  private redrawOverhead() {
    if (!this.overheadCanvas || !this.overheadCtx || !this.overheadTex) {
      return;
    }
    const ctx = this.overheadCtx;
    const w = this.overheadCanvas.width;
    const h = this.overheadCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (this.state === 'IDLE' || this.state === 'CHARGED') {
      ctx.fillStyle = 'rgba(12, 74, 110, 0.90)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(10, 8, w - 20, h - 16, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Cinzel", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ ГЕНЕРАТОР ЯДРА', w / 2, h / 2 - 2);
    } else if (this.state === 'PLANTING') {
      // Background pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(10, 8, w - 20, h - 16, 12);
      ctx.fill();
      ctx.stroke();

      // Progress bar fill
      const barW = (w - 36) * Math.min(1, Math.max(0, this.plantProgress));
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(18, 14, barW, h - 28, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Cinzel", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ИЗВЛЕЧЕНИЕ: ${Math.round(this.plantProgress * 100)}%`, w / 2, h / 2);
    } else if (this.state === 'ARMED') {
      const isFlash = Math.floor(this.fuseTimer * 4) % 2 === 0;
      ctx.fillStyle = isFlash ? 'rgba(220, 38, 38, 0.95)' : 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(8, 8, w - 16, h - 16, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Cinzel", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const sec = Math.max(0.1, this.fuseTimer).toFixed(1);
      ctx.fillText(`⚠️ ВЗРЫВ: ${sec}с`, w / 2, h / 2);
    } else if (this.state === 'DESTROYED' || this.state === 'EXTRACTED') {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(12, 10, w - 24, h - 20, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px "Cinzel", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚙️ ОПУСТОШЕН', w / 2, h / 2);
    }

    this.overheadTex.needsUpdate = true;
  }

  public extractCore(player: Player): boolean {
    if (this.state !== 'IDLE' && this.state !== 'CHARGED') {
      return false;
    }
    this.state = 'DESTROYED';
    if (this.coreOrbMesh) this.coreOrbMesh.visible = false;
    if (this.coreOrbLight) this.coreOrbLight.intensity = 0;
    if (this.coreEnergyRing) this.coreEnergyRing.visible = false;
    this.spriteMat.map = MobNest.getCraterTexture();
    this.spriteMat.needsUpdate = true;

    player.pickupAstralCore();
    SoundManager.playLightning();
    this.redrawOverhead();
    return true;
  }

  public update(
    dt: number,
    scene: Scene,
    player: Player,
    remotePlayers: Map<string, RemotePlayer>,
    enemyManager: EnemyManager,
    damageNumbers?: DamageNumberManager,
    camera?: Camera
  ): { justExploded: boolean; justExtracted?: boolean } {
    this.animTimer += dt;

    if (this.state === 'IDLE' || this.state === 'CHARGED') {
      // Gentle core rotation & hovering
      if (this.coreOrbMesh) {
        this.coreOrbMesh.rotation.y += dt * 3.0;
        this.coreOrbMesh.rotation.z += dt * 1.5;
        this.coreOrbMesh.position.y = 2.2 + Math.sin(this.animTimer * 3.5) * 0.2;
      }
      if (this.coreOrbLight) {
        this.coreOrbLight.intensity = 2.5 + Math.sin(this.animTimer * 4.0) * 0.6;
      }
      if (this.coreEnergyRing) {
        const ringScale = 1.0 + Math.sin(this.animTimer * 2.5) * 0.15;
        this.coreEnergyRing.scale.set(ringScale, ringScale, 1.0);
      }
      if (this.overheadSprite) this.overheadSprite.visible = true;
      this.dangerZoneMesh.visible = false;
      this.innerDangerRing.visible = false;
      this.beaconLight.intensity = 0;
      return { justExploded: false };
    }

    if (this.state === 'PLANTING') {
      if (this.overheadSprite) this.overheadSprite.visible = true;
      this.redrawOverhead();
      this.spriteMesh.position.x = (Math.random() - 0.5) * 0.04;
      return { justExploded: false };
    }

    if (this.state === 'ARMED') {
      if (this.overheadSprite) this.overheadSprite.visible = true;
      this.dangerZoneMesh.visible = true;
      this.innerDangerRing.visible = true;

      this.fuseTimer -= dt;

      const currentSec = Math.ceil(this.fuseTimer);
      if (currentSec !== this.lastTickSecond && this.fuseTimer > 0) {
        this.lastTickSecond = currentSec;
        SoundManager.playBombTick(this.fuseTimer);
      }

      const pulseSpeed = 4.0 + (MobNest.FUSE_DURATION - this.fuseTimer) * 2.5;
      const alpha = 0.22 + 0.18 * Math.sin(this.animTimer * pulseSpeed);
      this.dangerZoneMat.opacity = alpha;
      this.innerDangerMat.opacity = Math.min(1.0, alpha * 2.2);

      const flash = (Math.sin(this.animTimer * pulseSpeed * 2) + 1) * 0.5;
      this.beaconLight.intensity = flash * 3.5;

      this.redrawOverhead();

      if (this.fuseTimer <= 0) {
        this.detonate(scene, player, remotePlayers, enemyManager, damageNumbers, camera);
        return { justExploded: true };
      }
      return { justExploded: false };
    }

    // DESTROYED / EXTRACTED
    if (this.coreOrbMesh) this.coreOrbMesh.visible = false;
    if (this.coreOrbLight) this.coreOrbLight.intensity = 0;
    if (this.coreEnergyRing) this.coreEnergyRing.visible = false;
    this.dangerZoneMesh.visible = false;
    this.innerDangerRing.visible = false;
    this.beaconLight.intensity = 0;
    return { justExploded: false };
  }

  private detonate(
    scene: Scene,
    player: Player,
    remotePlayers: Map<string, RemotePlayer>,
    enemyManager: EnemyManager,
    damageNumbers?: DamageNumberManager,
    camera?: Camera
  ) {
    this.state = 'DESTROYED';
    this.spriteMat.map = MobNest.getCraterTexture();
    this.spriteMat.needsUpdate = true;
    this.spriteMesh.scale.set(1.15, 0.85, 1.0);
    this.spriteMesh.position.y = -0.3;

    if (this.coreOrbMesh) this.coreOrbMesh.visible = false;
    if (this.coreOrbLight) this.coreOrbLight.intensity = 0;
    if (this.coreEnergyRing) this.coreEnergyRing.visible = false;

    SoundManager.playBombExplosion();

    SulfurSmokeManager.spawn(scene, this.position.clone(), {
      size: 14.0,
      fps: 12
    });

    const pDist = player.position.distanceTo(this.position);
    if (pDist <= this.blastRadius && player.isAlive && !player.isDowned) {
      player.takeDamage(MobNest.BLAST_DAMAGE, false, 'Взрыв логова');
      if (damageNumbers && camera) {
        damageNumbers.spawnDamage(player.position, MobNest.BLAST_DAMAGE, false, camera);
      }
      const pushDir = player.position.clone().sub(this.position).setY(0);
      if (pushDir.lengthSq() > 0.01) {
        pushDir.normalize();
        player.position.addScaledVector(pushDir, 3.5);
      }
    }

    for (const remote of remotePlayers.values()) {
      if (remote.isDowned) continue;
      const rDist = remote.position.distanceTo(this.position);
      if (rDist <= this.blastRadius) {
        remote.hp = Math.max(1, remote.hp - MobNest.BLAST_DAMAGE);
        remote.redrawOverhead();
      }
    }

    enemyManager.damageEnemiesInRadius(this.position, this.blastRadius, 1500, camera);
    enemyManager.spawnNestSwarm(this.position, 14);
  }

  public dispose(scene: Scene) {
    scene.remove(this.mesh);
    this.shadowMesh.geometry.dispose();
    (this.shadowMesh.material as MeshBasicMaterial).dispose();

    this.spriteMesh.geometry.dispose();
    this.spriteMat.dispose();

    this.dangerZoneMesh.geometry.dispose();
    this.dangerZoneMat.dispose();

    this.innerDangerRing.geometry.dispose();
    this.innerDangerMat.dispose();

    if (this.coreOrbMesh) {
      this.coreOrbMesh.geometry.dispose();
      (this.coreOrbMesh.material as MeshBasicMaterial).dispose();
    }
    if (this.coreEnergyRing) {
      this.coreEnergyRing.geometry.dispose();
      (this.coreEnergyRing.material as MeshBasicMaterial).dispose();
    }
    this.coreOrbLight?.dispose();

    if (this.overheadSprite) {
      this.overheadSprite.geometry.dispose();
      (this.overheadSprite.material as MeshBasicMaterial).dispose();
      this.overheadTex?.dispose();
    }

    this.beaconLight.dispose();
  }
}

export type AstralGenerator = MobNest;
export const AstralGenerator = MobNest;
