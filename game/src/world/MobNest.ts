import {
  Group,
  Vector3,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
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

export type NestState = 'IDLE' | 'PLANTING' | 'ARMED' | 'DESTROYED';

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

    // 2. Central 2.5D Nest Maw Sprite
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

    // 3. Danger zone circle on ground (1 map grid cell across, radius 25m)
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

    // 4. Red blinking point light for armed state
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
    if (this.overheadSprite) this.overheadSprite.visible = false;
    this.mesh.add(this.overheadSprite);
  }

  private redrawOverhead() {
    if (!this.overheadCanvas || !this.overheadCtx || !this.overheadTex) {
      return;
    }
    const ctx = this.overheadCtx;
    const w = this.overheadCanvas.width;
    const h = this.overheadCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (this.state === 'PLANTING') {
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

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Cinzel", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ЗАРЯД: ${Math.round(this.plantProgress * 100)}%`, w / 2, h / 2);
    } else if (this.state === 'ARMED') {
      // Danger blinking pill
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
    }

    this.overheadTex.needsUpdate = true;
  }

  public update(
    dt: number,
    scene: Scene,
    player: Player,
    remotePlayers: Map<string, RemotePlayer>,
    enemyManager: EnemyManager,
    damageNumbers?: DamageNumberManager,
    camera?: Camera
  ): { justExploded: boolean } {
    this.animTimer += dt;

    if (this.state === 'IDLE') {
      // Gentle breathing pulsation
      const s = 1.0 + Math.sin(this.animTimer * 2.2) * 0.035;
      this.spriteMesh.scale.set(s, s, 1.0);
      if (this.overheadSprite) this.overheadSprite.visible = false;
      this.dangerZoneMesh.visible = false;
      this.innerDangerRing.visible = false;
      this.beaconLight.intensity = 0;
      return { justExploded: false };
    }

    if (this.state === 'PLANTING') {
      if (this.overheadSprite) this.overheadSprite.visible = true;
      this.redrawOverhead();
      // Slight mechanical shake while planting
      this.spriteMesh.position.x = (Math.random() - 0.5) * 0.04;
      return { justExploded: false };
    }

    if (this.state === 'ARMED') {
      if (this.overheadSprite) this.overheadSprite.visible = true;
      this.dangerZoneMesh.visible = true;
      this.innerDangerRing.visible = true;

      this.fuseTimer -= dt;

      // Accelerated ticking sound & beeping
      const currentSec = Math.ceil(this.fuseTimer);
      if (currentSec !== this.lastTickSecond && this.fuseTimer > 0) {
        this.lastTickSecond = currentSec;
        SoundManager.playBombTick(this.fuseTimer);
      }

      // Danger circle pulse (speeds up as timer nears 0)
      const pulseSpeed = 4.0 + (MobNest.FUSE_DURATION - this.fuseTimer) * 2.5;
      const alpha = 0.22 + 0.18 * Math.sin(this.animTimer * pulseSpeed);
      this.dangerZoneMat.opacity = alpha;
      this.innerDangerMat.opacity = Math.min(1.0, alpha * 2.2);

      // Beacon flashing light
      const flash = (Math.sin(this.animTimer * pulseSpeed * 2) + 1) * 0.5;
      this.beaconLight.intensity = flash * 3.5;

      this.redrawOverhead();

      // Detonation moment!
      if (this.fuseTimer <= 0) {
        this.detonate(scene, player, remotePlayers, enemyManager, damageNumbers, camera);
        return { justExploded: true };
      }
      return { justExploded: false };
    }

    // DESTROYED
    if (this.overheadSprite) this.overheadSprite.visible = false;
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
    this.spriteMesh.scale.set(1.15, 0.85, 1.0); // collapsed crater form
    this.spriteMesh.position.y = -0.3;

    // 1. Play massive explosion audio
    SoundManager.playBombExplosion();

    // 2. Spawn sulfur explosion smoke VFX
    SulfurSmokeManager.spawn(scene, this.position.clone(), {
      size: 14.0,
      fps: 12
    });

    // 3. Player damage check (deals non-lethal but noticeable 35 damage if inside 25m cell radius)
    const pDist = player.position.distanceTo(this.position);
    if (pDist <= this.blastRadius && player.isAlive && !player.isDowned) {
      player.takeDamage(MobNest.BLAST_DAMAGE, false, 'Взрыв логова');
      if (damageNumbers && camera) {
        damageNumbers.spawnDamage(player.position, MobNest.BLAST_DAMAGE, false, camera);
      }
      // Small knockback away from crater
      const pushDir = player.position.clone().sub(this.position).setY(0);
      if (pushDir.lengthSq() > 0.01) {
        pushDir.normalize();
        player.position.addScaledVector(pushDir, 3.5);
      }
    }

    // 3b. Remote players damage check
    for (const remote of remotePlayers.values()) {
      if (remote.isDowned) continue;
      const rDist = remote.position.distanceTo(this.position);
      if (rDist <= this.blastRadius) {
        remote.hp = Math.max(1, remote.hp - MobNest.BLAST_DAMAGE);
        remote.redrawOverhead();
      }
    }

    // 4. Friendly Fire: Obliterate ordinary enemies caught in the blast wave!
    enemyManager.damageEnemiesInRadius(this.position, this.blastRadius, 1500, camera);

    // 5. Swarm Eruption: 14 volcanic/void monsters burst out from the crater!
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

    if (this.overheadSprite) {
      this.overheadSprite.geometry.dispose();
      (this.overheadSprite.material as MeshBasicMaterial).dispose();
      this.overheadTex?.dispose();
    }

    this.beaconLight.dispose();
  }
}
