import {
  Scene,
  Group,
  Mesh,
  RingGeometry,
  SphereGeometry,
  MeshBasicMaterial,
  DoubleSide,
  BufferGeometry,
  BufferAttribute,
  Line,
  LineBasicMaterial,
  Vector3,
  PlaneGeometry,
  CanvasTexture,
  LinearFilter,
  Camera
} from 'three';
import { Enemy } from './Enemy';
import { HUD } from '../ui/HUD';
import { DamageNumberManager } from '../combat/DamageNumberManager';
import { SoundManager } from '../core/SoundManager';

export interface BossSphere {
  id: number;
  position: Vector3;
  active: boolean;
  holdTimer: number;
  requiredTime: number;
  group: Group;
  ringMesh: Mesh;
  orbMesh: Mesh;
  beamMesh: Line;
  billboardMesh?: Mesh;
  billboardCanvas?: HTMLCanvasElement;
  billboardCtx?: CanvasRenderingContext2D;
  billboardTexture?: CanvasTexture;
}

export class FinalBossPylonManager {
  public static readonly SPHERE_DISTANCE: number = 22.0;

  private scene: Scene;
  private damageNumbers?: DamageNumberManager;
  public camera?: Camera;
  public hud?: HUD;
  public boss: Enemy | null = null;
  public getElevation?: (x: number, z: number) => number;

  public phaseCount: number = 0;
  public isShieldActive: boolean = false;
  public spheres: BossSphere[] = [];

  private shieldMesh?: Mesh;
  private bossAnchorPos = new Vector3();
  private animTimer = 0;

  constructor(scene: Scene, damageNumbers?: DamageNumberManager) {
    this.scene = scene;
    this.damageNumbers = damageNumbers;
  }

  public bindBoss(boss: Enemy, hud?: HUD, getElevation?: (x: number, z: number) => number): void {
    this.cleanup();
    this.boss = boss;
    this.hud = hud;
    this.getElevation = getElevation;
    this.phaseCount = 0;
    this.isShieldActive = false;
  }

  public update(dt: number, playerPositions: Vector3[]): void {
    if (!this.boss || !this.boss.isAlive) {
      if (this.isShieldActive || this.spheres.length > 0) {
        this.cleanup();
      }
      return;
    }

    this.animTimer += dt;

    // Check phase trigger thresholds: Phase 1 at <= 66% HP, Phase 2 at <= 33% HP
    if (this.phaseCount === 0 && this.boss.hp <= this.boss.maxHp * 0.66) {
      this.triggerShieldPhase(1);
    } else if (this.phaseCount === 1 && !this.isShieldActive && this.boss.hp <= this.boss.maxHp * 0.33) {
      this.triggerShieldPhase(2);
    }

    if (!this.isShieldActive) return;

    // Keep boss stationary and invulnerable while shield is up
    this.boss.isInvulnerable = true;
    this.boss.position.x = this.bossAnchorPos.x;
    this.boss.position.z = this.bossAnchorPos.z;
    if (this.getElevation) {
      this.boss.position.y = this.getElevation(this.boss.position.x, this.boss.position.z);
    }

    // Shield visual pulse
    if (this.shieldMesh) {
      this.shieldMesh.position.copy(this.boss.position);
      this.shieldMesh.position.y += 2.0;
      this.shieldMesh.rotation.y += dt * 0.8;
      const pulseMat = this.shieldMesh.material as MeshBasicMaterial;
      if (pulseMat) {
        pulseMat.opacity = 0.32 + Math.sin(this.animTimer * 5.0) * 0.12;
      }
    }

    // Process each sphere zone
    for (const sphere of this.spheres) {
      if (!sphere.active) continue;

      // Animate hovering orb & ground ring
      sphere.ringMesh.rotation.z += dt * 0.6;
      sphere.orbMesh.position.y = 1.8 + Math.sin(this.animTimer * 3.5 + sphere.id) * 0.22;
      sphere.orbMesh.rotation.y += dt * 1.2;

      // Dynamic beam line update
      const geom = sphere.beamMesh.geometry as BufferGeometry;
      const posAttr = geom.getAttribute('position') as BufferAttribute;
      if (posAttr) {
        posAttr.setXYZ(0, this.boss.position.x, this.boss.position.y + 2.0, this.boss.position.z);
        posAttr.setXYZ(1, sphere.position.x, sphere.position.y + sphere.orbMesh.position.y, sphere.position.z);
        posAttr.needsUpdate = true;
      }

      // Check if any player is inside the 3.5m radius zone
      let isInside = false;
      for (const p of playerPositions) {
        const dx = p.x - sphere.position.x;
        const dz = p.z - sphere.position.z;
        if (dx * dx + dz * dz <= 3.5 * 3.5) {
          isInside = true;
          break;
        }
      }

      const ringMat = sphere.ringMesh.material as MeshBasicMaterial;
      if (isInside) {
        sphere.holdTimer = Math.min(sphere.requiredTime, sphere.holdTimer + dt);
        if (ringMat) {
          ringMat.color.setHex(0x10b981); // Bright Emerald Green
          ringMat.opacity = 0.75 + Math.sin(this.animTimer * 8.0) * 0.20;
        }

        this.renderBillboard(sphere, true);

        // Deactivate sphere when 10.0 seconds are reached
        if (sphere.holdTimer >= sphere.requiredTime) {
          this.deactivateSphere(sphere);
        }
      } else {
        if (ringMat) {
          ringMat.color.setHex(0x06b6d4); // Vibrant Cyan
          ringMat.opacity = 0.40;
        }
        this.renderBillboard(sphere, false);
      }
    }

    // Check if all 4 spheres have been deactivated
    if (this.spheres.length > 0 && this.spheres.every(s => !s.active)) {
      this.breakShield();
    }
  }

  public triggerShieldPhase(phaseNum: number): void {
    if (this.isShieldActive || !this.boss) return;

    this.phaseCount = phaseNum;
    this.isShieldActive = true;
    this.boss.isInvulnerable = true;
    this.bossAnchorPos.copy(this.boss.position);

    // 1. Create Shield Mesh around boss
    if (!this.shieldMesh) {
      const shieldGeom = new SphereGeometry(Math.max(3.5, this.boss.width * 0.75), 24, 24);
      const shieldMat = new MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.38,
        depthWrite: false
      });
      this.shieldMesh = new Mesh(shieldGeom, shieldMat);
    }
    this.shieldMesh.position.copy(this.bossAnchorPos);
    this.shieldMesh.position.y += 2.0;
    this.scene.add(this.shieldMesh);

    // 2. Clear old spheres if any exist
    this.cleanupSpheres();

    // 3. Spawn 4 spheres in 4 orthogonal directions at 22m distance (+8m / 2 cells further away)
    const distance = FinalBossPylonManager.SPHERE_DISTANCE;
    const angles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];

    for (let i = 0; i < 4; i++) {
      const ang = angles[i];
      const sx = this.bossAnchorPos.x + Math.cos(ang) * distance;
      const sz = this.bossAnchorPos.z + Math.sin(ang) * distance;
      const sy = this.getElevation ? this.getElevation(sx, sz) : 0;
      const spherePos = new Vector3(sx, sy, sz);

      const sphereGroup = new Group();
      sphereGroup.position.copy(spherePos);

      // Ground capture circle (radius 3.5m)
      const ringGeom = new RingGeometry(0.3, 3.5, 36);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.40,
        side: DoubleSide,
        depthWrite: false
      });
      const ringMesh = new Mesh(ringGeom, ringMat);
      ringMesh.position.y = 0.05;
      sphereGroup.add(ringMesh);

      // Hovering pulsating Energy Orb
      const orbGeom = new SphereGeometry(0.85, 16, 16);
      const orbMat = new MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.88
      });
      const orbMesh = new Mesh(orbGeom, orbMat);
      orbMesh.position.y = 1.8;
      sphereGroup.add(orbMesh);

      // 3D Billboard Canvas Banner (Name & Capture Bar)
      let billboardCanvas: HTMLCanvasElement | undefined;
      let billboardCtx: CanvasRenderingContext2D | undefined;
      let billboardTexture: CanvasTexture | undefined;
      let billboardMesh: Mesh | undefined;

      if (typeof document !== 'undefined' && document.createElement) {
        billboardCanvas = document.createElement('canvas');
        billboardCanvas.width = 320;
        billboardCanvas.height = 110;
        billboardCtx = billboardCanvas.getContext('2d') || undefined;
        if (billboardCtx) {
          billboardTexture = new CanvasTexture(billboardCanvas);
          billboardTexture.minFilter = LinearFilter;
          const billboardMat = new MeshBasicMaterial({
            map: billboardTexture,
            transparent: true,
            depthWrite: false
          });
          const billboardGeom = new PlaneGeometry(3.2, 1.1);
          billboardMesh = new Mesh(billboardGeom, billboardMat);
          billboardMesh.position.set(0, 3.4, 0);
          billboardMesh.rotation.x = -Math.PI / 4.8;
          sphereGroup.add(billboardMesh);
        }
      }

      this.scene.add(sphereGroup);

      // Connecting energy beam line from boss to sphere
      const beamGeom = new BufferGeometry().setFromPoints([
        new Vector3(this.bossAnchorPos.x, this.bossAnchorPos.y + 2.0, this.bossAnchorPos.z),
        new Vector3(sx, sy + 1.8, sz)
      ]);
      const beamMat = new LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85
      });
      const beamMesh = new Line(beamGeom, beamMat);
      this.scene.add(beamMesh);

      const sphere: BossSphere = {
        id: i + 1,
        position: spherePos,
        active: true,
        holdTimer: 0,
        requiredTime: 10.0,
        group: sphereGroup,
        ringMesh,
        orbMesh,
        beamMesh,
        billboardMesh,
        billboardCanvas,
        billboardCtx,
        billboardTexture
      };

      this.renderBillboard(sphere, false);
      this.spheres.push(sphere);
    }

    SoundManager.playTeleporterActivate?.();
    this.hud?.triggerAltarNotification(
      'РУНИЧЕСКИЙ ЩИТ БОССА',
      'Зайдите в 4 сферы и удерживайте по 10 сек!',
      '🛡️',
      '#38bdf8'
    );
  }

  private renderBillboard(sphere: BossSphere, isCapturing: boolean): void {
    if (!sphere.billboardCtx || !sphere.billboardCanvas || !sphere.billboardTexture) return;
    const ctx = sphere.billboardCtx;
    const w = sphere.billboardCanvas.width;
    const h = sphere.billboardCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background badge
    ctx.fillStyle = isCapturing ? 'rgba(6, 78, 59, 0.92)' : 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = isCapturing ? '#34d399' : '#38bdf8';
    ctx.lineWidth = 3;

    // Rounded rectangle
    const x = 6, y = 6, bw = w - 12, bh = h - 12, r = 12;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + bw - r, y);
    ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
    ctx.lineTo(x + bw, y + bh - r);
    ctx.quadraticCurveTo(x + bw, y + bh, x + bw - r, y + bh);
    ctx.lineTo(x + r, y + bh);
    ctx.quadraticCurveTo(x, y + bh, x, y + bh - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sphere title
    ctx.font = 'bold 22px Montserrat, Arial, sans-serif';
    ctx.fillStyle = isCapturing ? '#6ee7b7' : '#e0f2fe';
    ctx.textAlign = 'center';
    ctx.fillText(`СФЕРА РАЗЛОМА #${sphere.id}`, w / 2, 34);

    // Progress Bar Background
    const barX = 22;
    const barY = 50;
    const barW = w - 44;
    const barH = 18;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Progress Bar Fill
    const pct = Math.min(1.0, sphere.holdTimer / sphere.requiredTime);
    ctx.fillStyle = isCapturing ? '#10b981' : '#0284c7';
    ctx.fillRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * pct), barH - 4);

    // Progress Text
    ctx.font = 'bold 16px Montserrat, Arial, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(`${sphere.holdTimer.toFixed(1)}s / ${sphere.requiredTime.toFixed(0)}s`, w / 2, 94);

    sphere.billboardTexture.needsUpdate = true;
  }

  private deactivateSphere(sphere: BossSphere): void {
    sphere.active = false;
    this.scene.remove(sphere.group);
    this.scene.remove(sphere.beamMesh);

    SoundManager.playAltarCaptured?.();
    if (this.damageNumbers && this.camera) {
      this.damageNumbers.spawnPassiveBuff(sphere.position, '⚡ Сфера деактивирована!', this.camera);
    }

    const remaining = this.spheres.filter(s => s.active).length;
    if (remaining > 0) {
      this.hud?.triggerAltarNotification(
        'СФЕРА ДЕАКТИВИРОВАНА!',
        `Осталось активных сфер: ${remaining}`,
        '⚡',
        '#10b981'
      );
    }
  }

  public breakShield(): void {
    if (!this.isShieldActive || !this.boss) return;

    this.isShieldActive = false;
    this.boss.isInvulnerable = false;

    if (this.shieldMesh) {
      this.scene.remove(this.shieldMesh);
    }
    this.cleanupSpheres();

    SoundManager.playTeleporterComplete?.();
    this.hud?.triggerAltarNotification(
      'БАРЬЕР РАЗРУШЕН!',
      'Босс уязвим! Атакуйте изо всех сил!',
      '💥',
      '#f59e0b'
    );
  }

  private cleanupSpheres(): void {
    for (const s of this.spheres) {
      this.scene.remove(s.group);
      this.scene.remove(s.beamMesh);
      if (s.billboardTexture) s.billboardTexture.dispose();
    }
    this.spheres = [];
  }

  public cleanup(): void {
    this.isShieldActive = false;
    if (this.boss) {
      this.boss.isInvulnerable = false;
    }
    if (this.shieldMesh) {
      this.scene.remove(this.shieldMesh);
    }
    this.cleanupSpheres();
  }

  public destroy(): void {
    this.cleanup();
    this.boss = null;
    this.hud = undefined;
  }
}
