import {
  Scene,
  Mesh,
  MeshStandardMaterial,
  CylinderGeometry,
  RingGeometry,
  MeshBasicMaterial,
  Group,
  Vector3,
  DoubleSide,
  BoxGeometry,
  PointLight
} from 'three';
import { SoundManager } from '../core/SoundManager';
import { ObstacleManager } from './ObstacleManager';

export interface ReadyPadState {
  x: number;
  z: number;
  radius: number;
  isActivated: boolean;
  activationProgress: number; // 0 to 1
}

export class GladiatorArena {
  public static readonly PILLARS = [
    { x: -8, z: -8 },
    { x: 8, z: -8 },
    { x: -8, z: 8 },
    { x: 8, z: 8 }
  ];
  public static readonly PILLAR_RADIUS = 1.6;

  public group: Group;
  public arenaRadius: number = 24;

  public player1Pad: ReadyPadState = { x: -12, z: 0, radius: 2.8, isActivated: false, activationProgress: 0 };
  public player2Pad: ReadyPadState = { x: 12, z: 0, radius: 2.8, isActivated: false, activationProgress: 0 };

  private p1PadMesh!: Mesh;
  private p2PadMesh!: Mesh;
  private p1PadRing!: Mesh;
  private p2PadRing!: Mesh;

  private p1Light!: PointLight;
  private p2Light!: PointLight;

  private arenaFloorMesh!: Mesh;
  private wallMeshes: Mesh[] = [];
  private pillarMeshes: Mesh[] = [];

  public onBothPlayersReady?: () => void;
  public isCountdownActive: boolean = false;
  public countdownTimer: number = 3.0;

  constructor(private scene: Scene, private obstacleManager?: ObstacleManager) {
    this.group = new Group();
    this.buildArenaGeometry();
    this.buildReadyPads();
    this.scene.add(this.group);
  }

  private buildArenaGeometry(): void {
    // 1. Arena Sand / Stone Floor (radius 24m)
    const floorGeom = new CylinderGeometry(this.arenaRadius, this.arenaRadius, 0.4, 48);
    const floorMat = new MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.85,
      metalness: 0.1
    });
    this.arenaFloorMesh = new Mesh(floorGeom, floorMat);
    this.arenaFloorMesh.position.y = -0.2;
    this.arenaFloorMesh.receiveShadow = true;
    this.group.add(this.arenaFloorMesh);

    // 2. Outer Perimeter Stone Wall (radius 24m)
    const wallSegments = 24;
    for (let i = 0; i < wallSegments; i++) {
      const angle = (i / wallSegments) * Math.PI * 2;
      const x = Math.cos(angle) * this.arenaRadius;
      const z = Math.sin(angle) * this.arenaRadius;

      const wallGeom = new BoxGeometry(6.4, 3.2, 1.2);
      const wallMat = new MeshStandardMaterial({
        color: 0x3f3f46,
        roughness: 0.9,
        metalness: 0.05
      });
      const wall = new Mesh(wallGeom, wallMat);
      wall.position.set(x, 1.6, z);
      wall.rotation.y = -angle + Math.PI / 2;
      this.group.add(wall);
      this.wallMeshes.push(wall);
    }

    // 3. Four Tactical Cover Pillars (at radius 11m)
    for (const pos of GladiatorArena.PILLARS) {
      const pillarGeom = new CylinderGeometry(1.4, 1.6, 4.2, 16);
      const pillarMat = new MeshStandardMaterial({
        color: 0x52525b,
        roughness: 0.8,
        metalness: 0.1
      });
      const pillar = new Mesh(pillarGeom, pillarMat);
      pillar.position.set(pos.x, 2.1, pos.z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.group.add(pillar);
      this.pillarMeshes.push(pillar);

      // Register obstacle with ObstacleManager so players and monsters cannot walk through it
      if (this.obstacleManager) {
        this.obstacleManager.addObstacle('gladiator_arena', {
          x: pos.x,
          z: pos.z,
          radius: 1.5,
          type: 'boulder'
        });
      }
    }
  }

  private buildReadyPads(): void {
    // Player 1 Pad (Left)
    const padGeom = new RingGeometry(0, this.player1Pad.radius, 32);
    const p1Mat = new MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.35,
      side: DoubleSide
    });
    this.p1PadMesh = new Mesh(padGeom, p1Mat);
    this.p1PadMesh.rotation.x = -Math.PI / 2;
    this.p1PadMesh.position.set(this.player1Pad.x, 0.02, this.player1Pad.z);
    this.group.add(this.p1PadMesh);

    const ringGeom = new RingGeometry(this.player1Pad.radius - 0.2, this.player1Pad.radius, 32);
    const ringMat1 = new MeshBasicMaterial({ color: 0x22d3ee, side: DoubleSide });
    this.p1PadRing = new Mesh(ringGeom, ringMat1);
    this.p1PadRing.rotation.x = -Math.PI / 2;
    this.p1PadRing.position.set(this.player1Pad.x, 0.03, this.player1Pad.z);
    this.group.add(this.p1PadRing);

    this.p1Light = new PointLight(0x06b6d4, 1.2, 6);
    this.p1Light.position.set(this.player1Pad.x, 1.0, this.player1Pad.z);
    this.group.add(this.p1Light);

    // Player 2 / Bot Pad (Right)
    const p2Mat = new MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.35,
      side: DoubleSide
    });
    this.p2PadMesh = new Mesh(padGeom.clone(), p2Mat);
    this.p2PadMesh.rotation.x = -Math.PI / 2;
    this.p2PadMesh.position.set(this.player2Pad.x, 0.02, this.player2Pad.z);
    this.group.add(this.p2PadMesh);

    const ringMat2 = new MeshBasicMaterial({ color: 0xfb7185, side: DoubleSide });
    this.p2PadRing = new Mesh(ringGeom.clone(), ringMat2);
    this.p2PadRing.rotation.x = -Math.PI / 2;
    this.p2PadRing.position.set(this.player2Pad.x, 0.03, this.player2Pad.z);
    this.group.add(this.p2PadRing);

    this.p2Light = new PointLight(0xf43f5e, 1.2, 6);
    this.p2Light.position.set(this.player2Pad.x, 1.0, this.player2Pad.z);
    this.group.add(this.p2Light);
  }

  public setP2AutoReady(isBot: boolean): void {
    if (isBot) {
      this.player2Pad.isActivated = true;
      this.player2Pad.activationProgress = 1.0;
      if (this.p2PadMesh) {
        (this.p2PadMesh.material as MeshBasicMaterial).opacity = 0.85;
      }
    }
  }

  public update(dt: number, p1Pos: Vector3, p2Pos?: Vector3): void {
    // Animate glow rings
    if (this.p1PadRing) this.p1PadRing.rotation.z += dt * 0.5;
    if (this.p2PadRing) this.p2PadRing.rotation.z -= dt * 0.5;

    // Check P1 Pad presence
    const dist1 = Math.hypot(p1Pos.x - this.player1Pad.x, p1Pos.z - this.player1Pad.z);
    if (dist1 <= this.player1Pad.radius) {
      this.player1Pad.activationProgress = Math.min(1.0, this.player1Pad.activationProgress + dt * 1.5);
    } else {
      this.player1Pad.activationProgress = Math.max(0.0, this.player1Pad.activationProgress - dt * 2.0);
    }
    this.player1Pad.isActivated = this.player1Pad.activationProgress >= 0.95;
    (this.p1PadMesh.material as MeshBasicMaterial).opacity = 0.25 + this.player1Pad.activationProgress * 0.65;

    // Check P2 Pad presence (if not auto-ready)
    if (p2Pos && !this.player2Pad.isActivated) {
      const dist2 = Math.hypot(p2Pos.x - this.player2Pad.x, p2Pos.z - this.player2Pad.z);
      if (dist2 <= this.player2Pad.radius) {
        this.player2Pad.activationProgress = Math.min(1.0, this.player2Pad.activationProgress + dt * 1.5);
      } else {
        this.player2Pad.activationProgress = Math.max(0.0, this.player2Pad.activationProgress - dt * 2.0);
      }
      this.player2Pad.isActivated = this.player2Pad.activationProgress >= 0.95;
      (this.p2PadMesh.material as MeshBasicMaterial).opacity = 0.25 + this.player2Pad.activationProgress * 0.65;
    }

    // Check countdown trigger
    if (this.player1Pad.isActivated && this.player2Pad.isActivated) {
      if (!this.isCountdownActive) {
        this.isCountdownActive = true;
        this.countdownTimer = 3.0;
        SoundManager.playLevelUp?.();
      } else {
        this.countdownTimer -= dt;
        if (this.countdownTimer <= 0) {
          this.onBothPlayersReady?.();
          this.isCountdownActive = false;
        }
      }
    } else {
      this.isCountdownActive = false;
      this.countdownTimer = 3.0;
    }
  }

  public hidePads(): void {
    if (this.p1PadMesh) this.p1PadMesh.visible = false;
    if (this.p2PadMesh) this.p2PadMesh.visible = false;
    if (this.p1PadRing) this.p1PadRing.visible = false;
    if (this.p2PadRing) this.p2PadRing.visible = false;
    if (this.p1Light) this.p1Light.visible = false;
    if (this.p2Light) this.p2Light.visible = false;
  }

  public destroy(): void {
    if (this.obstacleManager) {
      this.obstacleManager.removeChunkObstacles('0,0');
    }
    this.scene.remove(this.group);
  }
}
