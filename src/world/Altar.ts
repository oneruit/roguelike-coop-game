import * as THREE from 'three';
import { Player, ActiveBuff, BuffType } from '../entities/Player';
import { SoundManager } from '../core/SoundManager';

export interface AltarConfig {
  type: BuffType;
  name: string;
  subtitle: string;
  icon: string;
  colorHex: number;
  colorCss: string;
  buff: ActiveBuff;
}

export const ALTAR_CONFIGS: Record<BuffType, AltarConfig> = {
  damage: {
    type: 'damage',
    name: 'Алтарь Ярости',
    subtitle: '+80% к урону на 25 сек',
    icon: '⚔️',
    colorHex: 0xef4444,
    colorCss: '#ef4444',
    buff: {
      type: 'damage',
      name: 'Ярость Пустыни',
      icon: '⚔️',
      color: '#ef4444',
      duration: 25,
      maxDuration: 25,
      value: 0.8
    }
  },
  speed: {
    type: 'speed',
    name: 'Алтарь Ветра',
    subtitle: '+60% к скорости на 20 сек',
    icon: '⚡',
    colorHex: 0x06b6d4,
    colorCss: '#06b6d4',
    buff: {
      type: 'speed',
      name: 'Дыхание Прерии',
      icon: '⚡',
      color: '#06b6d4',
      duration: 20,
      maxDuration: 20,
      value: 0.6
    }
  },
  regen: {
    type: 'regen',
    name: 'Алтарь Жизни',
    subtitle: '+12 HP/сек на 18 сек',
    icon: '💖',
    colorHex: 0x10b981,
    colorCss: '#10b981',
    buff: {
      type: 'regen',
      name: 'Живительный Оазис',
      icon: '💖',
      color: '#10b981',
      duration: 18,
      maxDuration: 18,
      value: 12
    }
  },
  invulnerable: {
    type: 'invulnerable',
    name: 'Алтарь Неуязвимости',
    subtitle: 'Бессмертие на 12 сек',
    icon: '🛡️',
    colorHex: 0xf59e0b,
    colorCss: '#f59e0b',
    buff: {
      type: 'invulnerable',
      name: 'Щит Солнца',
      icon: '🛡️',
      color: '#f59e0b',
      duration: 12,
      maxDuration: 12,
      value: 1.0
    }
  }
};

export class Altar {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public config: AltarConfig;
  public captureRadius = 4.2;
  public captureTime = 3.2; // seconds to capture
  public captureProgress = 0; // 0.0 to 1.0
  public isCaptured = false;
  public rechargeTimer = 0;
  public rechargeDuration = 75; // seconds until reactivation

  private relicMesh: THREE.Mesh;
  private light: THREE.PointLight;
  private outerRingMesh: THREE.Mesh;
  private innerZoneMesh: THREE.Mesh;
  private innerZoneMat: THREE.MeshBasicMaterial;
  private shockwaveMesh: THREE.Mesh;
  private shockwaveMat: THREE.MeshBasicMaterial;
  private isShockwaving = false;
  private shockwaveTimer = 0;

  // 3D Billboard HUD
  private billboardCanvas: HTMLCanvasElement;
  private billboardCtx: CanvasRenderingContext2D;
  private billboardTexture: THREE.CanvasTexture;
  private billboardMesh: THREE.Mesh;

  private animTimer = 0;
  public onCaptured?: (altar: Altar, buff: ActiveBuff) => void;

  constructor(type: BuffType, position: THREE.Vector3) {
    this.config = ALTAR_CONFIGS[type];
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // 1. Stepped Stone Dais
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x3d2b20,
      roughness: 0.88,
      metalness: 0.05
    });

    const step1Geom = new THREE.CylinderGeometry(2.5, 2.7, 0.35, 8);
    const step1 = new THREE.Mesh(step1Geom, stoneMat);
    step1.position.y = 0.17;
    step1.receiveShadow = true;
    step1.castShadow = true;
    this.mesh.add(step1);

    const step2Geom = new THREE.CylinderGeometry(1.8, 2.0, 0.3, 8);
    const step2 = new THREE.Mesh(step2Geom, stoneMat);
    step2.position.y = 0.45;
    step2.receiveShadow = true;
    step2.castShadow = true;
    this.mesh.add(step2);

    // 2. Central Altar Pillar
    const pillarGeom = new THREE.CylinderGeometry(0.55, 0.72, 1.1, 8);
    const pillar = new THREE.Mesh(pillarGeom, stoneMat);
    pillar.position.y = 1.05;
    pillar.castShadow = true;
    this.mesh.add(pillar);

    // Glowing Rune Band on Pillar
    const runeRingGeom = new THREE.TorusGeometry(0.62, 0.05, 6, 16);
    runeRingGeom.rotateX(Math.PI / 2);
    const runeMat = new THREE.MeshStandardMaterial({
      color: this.config.colorHex,
      emissive: this.config.colorHex,
      emissiveIntensity: 0.85
    });
    const runeRing = new THREE.Mesh(runeRingGeom, runeMat);
    runeRing.position.y = 1.15;
    this.mesh.add(runeRing);

    // 3. Four Corner Obelisks with glowing crystal caps
    const obeliskPositions = [
      new THREE.Vector3(-1.45, 0, -1.45),
      new THREE.Vector3(1.45, 0, -1.45),
      new THREE.Vector3(-1.45, 0, 1.45),
      new THREE.Vector3(1.45, 0, 1.45)
    ];

    const obeliskGeom = new THREE.CylinderGeometry(0.16, 0.24, 1.5, 6);
    const capCrystalGeom = new THREE.OctahedronGeometry(0.14, 0);

    for (const obPos of obeliskPositions) {
      const obelisk = new THREE.Mesh(obeliskGeom, stoneMat);
      obelisk.position.set(obPos.x, 0.85, obPos.z);
      obelisk.castShadow = true;
      this.mesh.add(obelisk);

      const capCrystal = new THREE.Mesh(capCrystalGeom, runeMat);
      capCrystal.position.set(obPos.x, 1.68, obPos.z);
      this.mesh.add(capCrystal);
    }

    // 4. Floating Mystic Relic (Distinct geometry per type)
    let relicGeom: THREE.BufferGeometry;
    if (type === 'damage') {
      relicGeom = new THREE.OctahedronGeometry(0.48, 0);
    } else if (type === 'speed') {
      relicGeom = new THREE.ConeGeometry(0.38, 0.85, 4);
      relicGeom.rotateX(Math.PI);
    } else if (type === 'regen') {
      relicGeom = new THREE.IcosahedronGeometry(0.44, 0);
    } else {
      relicGeom = new THREE.DodecahedronGeometry(0.46, 0);
    }

    const relicMat = new THREE.MeshStandardMaterial({
      color: this.config.colorHex,
      emissive: this.config.colorHex,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.4
    });
    this.relicMesh = new THREE.Mesh(relicGeom, relicMat);
    this.relicMesh.position.y = 1.95;
    this.relicMesh.castShadow = true;
    this.mesh.add(this.relicMesh);

    // 5. Point Light
    this.light = new THREE.PointLight(this.config.colorHex, 2.2, 9);
    this.light.position.set(0, 2.1, 0);
    this.mesh.add(this.light);

    // 6. Ground Capture Rings
    const ringGeom = new THREE.RingGeometry(this.captureRadius - 0.15, this.captureRadius, 36);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.config.colorHex,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    this.outerRingMesh = new THREE.Mesh(ringGeom, ringMat);
    this.outerRingMesh.position.y = 0.05;
    this.mesh.add(this.outerRingMesh);

    // Inner capture fill disc
    const innerGeom = new THREE.CircleGeometry(this.captureRadius - 0.16, 36);
    innerGeom.rotateX(-Math.PI / 2);
    this.innerZoneMat = new THREE.MeshBasicMaterial({
      color: this.config.colorHex,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    this.innerZoneMesh = new THREE.Mesh(innerGeom, this.innerZoneMat);
    this.innerZoneMesh.position.y = 0.04;
    this.mesh.add(this.innerZoneMesh);

    // Shockwave Ring (triggers on completion)
    const shockGeom = new THREE.RingGeometry(0.2, 0.7, 36);
    shockGeom.rotateX(-Math.PI / 2);
    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: this.config.colorHex,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.shockwaveMesh = new THREE.Mesh(shockGeom, this.shockwaveMat);
    this.shockwaveMesh.position.y = 0.08;
    this.mesh.add(this.shockwaveMesh);

    // 7. 3D Billboard Canvas Banner (Name & Capture Bar)
    this.billboardCanvas = document.createElement('canvas');
    this.billboardCanvas.width = 384;
    this.billboardCanvas.height = 144;
    this.billboardCtx = this.billboardCanvas.getContext('2d')!;
    this.billboardTexture = new THREE.CanvasTexture(this.billboardCanvas);
    this.billboardTexture.minFilter = THREE.LinearFilter;

    const billboardMat = new THREE.MeshBasicMaterial({
      map: this.billboardTexture,
      transparent: true,
      depthWrite: false
    });
    const billboardGeom = new THREE.PlaneGeometry(3.6, 1.35);
    this.billboardMesh = new THREE.Mesh(billboardGeom, billboardMat);
    this.billboardMesh.position.set(0, 3.2, 0);
    this.mesh.add(this.billboardMesh);

    this.renderBillboard(0);
  }

  private renderBillboard(progress: number) {
    const ctx = this.billboardCtx;
    ctx.clearRect(0, 0, 384, 144);

    // Background pill badge
    ctx.fillStyle = 'rgba(18, 12, 10, 0.88)';
    ctx.strokeStyle = this.config.colorCss;
    ctx.lineWidth = 3;

    // Rounded rectangle
    const x = 12, y = 10, w = 360, h = 124, r = 18;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Altar Name & Icon
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`[${this.config.icon}] ${this.config.name}`, 192, 42);

    if (this.isCaptured) {
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillStyle = this.config.colorCss;
      const secLeft = Math.ceil(this.rechargeTimer);
      ctx.fillText(`АКТИВЕН (Перезарядка: ${secLeft}с)`, 192, 75);

      // Recharging progress bar
      const rechargePct = (this.rechargeDuration - this.rechargeTimer) / this.rechargeDuration;
      ctx.fillStyle = '#332018';
      ctx.fillRect(36, 92, 312, 16);
      ctx.fillStyle = this.config.colorCss;
      ctx.fillRect(36, 92, 312 * Math.max(0, Math.min(1, rechargePct)), 16);
    } else {
      // Subtitle perk
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#e2d3be';
      ctx.fillText(this.config.subtitle, 192, 68);

      // Capture Progress Bar
      ctx.fillStyle = '#221510';
      ctx.fillRect(36, 88, 312, 22);

      const fillW = Math.max(0, Math.min(1, progress)) * 312;
      ctx.fillStyle = this.config.colorCss;
      ctx.fillRect(36, 88, fillW, 22);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(36, 88, 312, 22);

      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      const pctText = progress > 0 ? `ЗАХВАТ: ${Math.round(progress * 100)}%` : 'ВОЙДИТЕ В ЗОНУ ДЛЯ ЗАХВАТА';
      ctx.fillText(pctText, 192, 104);
    }

    this.billboardTexture.needsUpdate = true;
  }

  /**
   * Authoritative simulation update: capture zones, timers, buffs.
   */
  public updateSimulation(
    dt: number,
    player: Player,
    partnerPos?: THREE.Vector3,
    isPartnerAlive: boolean = true,
    allowCapture: boolean = true,
    allPlayers?: { position: THREE.Vector3; isAlive: boolean; isDowned?: boolean }[]
  ) {
    if (this.isCaptured) {
      this.rechargeTimer -= dt;
      if (this.rechargeTimer <= 0) {
        this.isCaptured = false;
        this.captureProgress = 0;
      }
      return;
    }

    // Distance to players (supports all team members)
    const isPlayerInside = this.position.distanceTo(player.position) <= this.captureRadius && player.isAlive && !player.isDowned;
    let anyPartnerInside = false;
    if (allPlayers && allPlayers.length > 0) {
      for (const p of allPlayers) {
        if (p.isAlive && !p.isDowned && this.position.distanceTo(p.position) <= this.captureRadius) {
          anyPartnerInside = true;
          break;
        }
      }
    } else if (partnerPos && isPartnerAlive) {
      anyPartnerInside = this.position.distanceTo(partnerPos) <= this.captureRadius;
    }
    const isInside = allowCapture && (isPlayerInside || anyPartnerInside);

    if (isInside) {
      this.captureProgress += dt / this.captureTime;

      // Pulse audio tick
      SoundManager.playAltarCapturing(this.captureProgress);

      if (this.captureProgress >= 1.0) {
        // Capture Complete!
        this.captureProgress = 1.0;
        this.isCaptured = true;
        this.rechargeTimer = this.rechargeDuration;

        // Shockwave trigger
        this.isShockwaving = true;
        this.shockwaveTimer = 0;
        this.shockwaveMat.opacity = 1.0;

        // Sound
        SoundManager.playAltarCaptured();

        // Apply Buff
        player.addBuff({ ...this.config.buff });

        if (this.onCaptured) {
          this.onCaptured(this, this.config.buff);
        }
      }
    } else {
      // Slow progress decay when player leaves
      if (this.captureProgress > 0) {
        this.captureProgress = Math.max(0, this.captureProgress - dt * 0.35);
      }
    }
  }

  /**
   * Rendering phase: Viewport/Frustum culling, billboard canvas updates, mesh animations.
   * If inFrustum is false, sets mesh.visible = false and skips all canvas redraws.
   */
  public updateVisuals(dt: number, camera: THREE.Camera, inFrustum: boolean) {
    if (!inFrustum) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = true;
    this.animTimer += dt;

    // Relic floating bob and rotation
    this.relicMesh.rotation.y += dt * (this.isCaptured ? 0.8 : (1.6 + this.captureProgress * 3.0));
    this.relicMesh.position.y = 1.95 + Math.sin(this.animTimer * 2.5) * 0.15;

    // Make billboard face camera
    this.billboardMesh.quaternion.copy(camera.quaternion);

    // Shockwave effect animation
    if (this.isShockwaving) {
      this.shockwaveTimer += dt * 3.5;
      const scale = 0.5 + this.shockwaveTimer * 7.0;
      this.shockwaveMesh.scale.set(scale, scale, scale);
      this.shockwaveMat.opacity = Math.max(0, 1 - this.shockwaveTimer);
      if (this.shockwaveTimer >= 1.0) {
        this.isShockwaving = false;
        this.shockwaveMat.opacity = 0;
      }
    }

    // Handlers for captured/recharging state
    if (this.isCaptured) {
      this.light.intensity = 0.8 + Math.sin(this.animTimer * 2) * 0.3;
      this.innerZoneMat.opacity = 0.05;
      this.renderBillboard(0);
    } else {
      this.innerZoneMat.opacity = 0.15 + this.captureProgress * 0.45;
      this.light.intensity = 2.0 + this.captureProgress * 2.5;
      this.renderBillboard(this.captureProgress);
    }
  }

  public update(
    dt: number,
    player: Player,
    camera: THREE.Camera,
    partnerPos?: THREE.Vector3,
    isPartnerAlive: boolean = true,
    allowCapture: boolean = true,
    allPlayers?: { position: THREE.Vector3; isAlive: boolean; isDowned?: boolean }[]
  ) {
    this.updateSimulation(dt, player, partnerPos, isPartnerAlive, allowCapture, allPlayers);
    this.updateVisuals(dt, camera, true);
  }

  /** Apply a capture decided by the host without replaying the local capture logic. */
  public applyRemoteCapture() {
    if (this.isCaptured) return;
    this.captureProgress = 1;
    this.isCaptured = true;
    this.rechargeTimer = this.rechargeDuration;
    this.isShockwaving = true;
    this.shockwaveTimer = 0;
    this.shockwaveMat.opacity = 1.0;
    SoundManager.playAltarCaptured();
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    this.billboardTexture.dispose();
  }
}
