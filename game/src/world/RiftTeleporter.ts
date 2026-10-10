import {
  type Scene,
  Vector3,
  Group,
  Mesh,
  MeshBasicMaterial,
  CylinderGeometry,
  MeshStandardMaterial,
  TorusGeometry,
  DoubleSide,
  RingGeometry
} from 'three';

export type TeleporterState = 'IDLE' | 'CHARGING' | 'COMPLETED' | 'WARP_READY';

export class RiftTeleporter {
  private scene: Scene;
  public position: Vector3;
  public state: TeleporterState = 'IDLE';

  public chargeProgress: number = 0; // 0.0 to 1.0 (0% to 100%)
  public chargeRadius: number = 35; // 35 meters radius
  public isPlayerInsideZone: boolean = false;
  public isBossDefeated: boolean = false;
  public isDiscovered: boolean = false;

  public mesh: Group;
  private ringMesh1!: Mesh;
  private ringMesh2!: Mesh;
  private beaconBeam!: Mesh;
  private zoneDome!: Mesh;
  private zoneDomeMat!: MeshBasicMaterial;

  constructor(scene: Scene, position: Vector3 = new Vector3(75, 0, 75)) {
    this.scene = scene;
    this.position = position.clone();
    this.mesh = new Group();
    this.mesh.position.copy(this.position);

    this.createTeleporterVisuals();
    this.scene.add(this.mesh);
  }

  private createTeleporterVisuals() {
    // 1. Central Obelisk
    const obeliskGeom = new CylinderGeometry(0.8, 1.8, 6.5, 6);
    const obeliskMat = new MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x4338ca,
      emissiveIntensity: 0.4
    });
    const obelisk = new Mesh(obeliskGeom, obeliskMat);
    obelisk.position.y = 3.25;
    obelisk.castShadow = true;
    this.mesh.add(obelisk);

    // 2. Floating Rotating Energy Rings
    const ringGeom = new TorusGeometry(2.4, 0.15, 12, 32);
    const ringMat = new MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true
    });
    this.ringMesh1 = new Mesh(ringGeom, ringMat);
    this.ringMesh1.position.y = 3.8;
    this.ringMesh1.rotation.x = Math.PI / 4;
    this.mesh.add(this.ringMesh1);

    this.ringMesh2 = new Mesh(ringGeom, ringMat);
    this.ringMesh2.position.y = 3.8;
    this.ringMesh2.rotation.y = Math.PI / 3;
    this.mesh.add(this.ringMesh2);

    // 3. Skyward Beacon Beam (visible from anywhere)
    const beamGeom = new CylinderGeometry(0.6, 1.4, 180, 16);
    beamGeom.translate(0, 90, 0);
    const beamMat = new MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.45,
      side: DoubleSide
    });
    this.beaconBeam = new Mesh(beamGeom, beamMat);
    this.mesh.add(this.beaconBeam);

    // 4. Ground Charge Circle / Dome
    const zoneGeom = new RingGeometry(this.chargeRadius - 0.4, this.chargeRadius + 0.4, 64);
    zoneGeom.rotateX(-Math.PI / 2);
    this.zoneDomeMat = new MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.35,
      side: DoubleSide
    });
    this.zoneDome = new Mesh(zoneGeom, this.zoneDomeMat);
    this.zoneDome.position.y = 0.1;
    this.zoneDome.visible = false;
    this.mesh.add(this.zoneDome);
  }

  public activate(): boolean {
    if (this.state !== 'IDLE') return false;
    this.isDiscovered = true;
    this.state = 'CHARGING';
    this.chargeProgress = 0;
    this.isBossDefeated = false;
    this.zoneDome.visible = true;
    this.zoneDomeMat.color.setHex(0xf43f5e); // Pulsing red while charging
    return true;
  }

  public update(dt: number, playerPositions: Vector3[]): { justCompleted: boolean } {
    // Animate beacon and rings
    this.ringMesh1.rotation.y += dt * 1.5;
    this.ringMesh1.rotation.z += dt * 0.8;
    this.ringMesh2.rotation.x += dt * 1.2;
    this.ringMesh2.rotation.y -= dt * 1.0;

    // Check discovery radius if not yet discovered
    if (!this.isDiscovered) {
      if (this.state !== 'IDLE') {
        this.isDiscovered = true;
      } else {
        for (const pos of playerPositions) {
          if (pos.distanceToSquared(this.position) <= 45 * 45) {
            this.isDiscovered = true;
            break;
          }
        }
      }
    }

    let justCompleted = false;

    if (this.state === 'CHARGING') {
      // Zone capture is no longer required; player must defeat the stage boss to unlock the portal
      if (this.isBossDefeated) {
        this.state = 'WARP_READY';
        this.chargeProgress = 1.0;
        this.zoneDome.visible = true;
        this.zoneDomeMat.color.setHex(0x10b981); // Emerald green for stable rift!
        this.zoneDomeMat.opacity = 0.6;
        justCompleted = true;
      } else {
        this.zoneDomeMat.opacity = 0.35 + Math.sin(Date.now() * 0.005) * 0.15;
      }
    }

    return { justCompleted };
  }

  /**
   * Resets teleporter for a new stage at new random location.
   */
  public resetForStage(newPos: Vector3) {
    this.position.copy(newPos);
    this.mesh.position.copy(newPos);
    this.state = 'IDLE';
    this.isDiscovered = false;
    this.chargeProgress = 0;
    this.isBossDefeated = false;
    this.isPlayerInsideZone = false;
    this.zoneDome.visible = false;
    this.zoneDomeMat.color.setHex(0x6366f1);
  }

  /**
   * Disables the teleporter for the final stage (Rift Core) where no transitions occur.
   */
  public disableForFinalStage() {
    this.mesh.visible = false;
    this.state = 'IDLE';
    this.isDiscovered = false;
    this.chargeProgress = 0;
    this.position.set(99999, -999, 99999);
    this.mesh.position.copy(this.position);
  }

  /**
   * Automatically stabilizes the teleporter when 5 minutes on the biome have elapsed.
   */
  public stabilizeVoluntaryPortal(): boolean {
    if (!this.mesh.visible) return false;
    if (this.state === 'WARP_READY') return false;
    this.state = 'WARP_READY';
    this.isDiscovered = true;
    this.isBossDefeated = true;
    this.chargeProgress = 1.0;
    this.zoneDome.visible = true;
    this.zoneDomeMat.color.setHex(0x10b981);
    this.zoneDomeMat.opacity = 0.6;
    return true;
  }

  public getInteraction(playerPos: Vector3): { canInteract: boolean; prompt: string; action: 'activate' | 'warp' | null } {
    if (!this.mesh.visible) {
      return { canInteract: false, prompt: '', action: null };
    }

    const distSq = playerPos.distanceToSquared(this.position);
    if (distSq > 5.5 * 5.5) {
      return { canInteract: false, prompt: '', action: null };
    }

    if (this.state === 'IDLE') {
      return {
        canInteract: true,
        prompt: '[E] Активировать Телепорт Разлома (Призыв Босса)',
        action: 'activate'
      };
    }

    if (this.state === 'WARP_READY') {
      return {
        canInteract: true,
        prompt: '[E] Переместиться на следующий биом',
        action: 'warp'
      };
    }

    return { canInteract: false, prompt: '', action: null };
  }

  public destroy() {
    this.scene.remove(this.mesh);
  }

  public getSnapshot() {
    return {
      x: this.position.x,
      z: this.position.z,
      isActivated: this.state !== 'IDLE',
      chargeProgress: this.chargeProgress,
      isCompleted: this.state === 'WARP_READY',
      isDiscovered: this.isDiscovered || this.state !== 'IDLE'
    };
  }

  public applySnapshot(snap: { x: number; z: number; isActivated: boolean; chargeProgress: number; isCompleted: boolean; isDiscovered?: boolean }) {
    if (this.position.x !== snap.x || this.position.z !== snap.z) {
      this.resetForStage(new Vector3(snap.x, 0, snap.z));
    }
    if (snap.isDiscovered || snap.isActivated || snap.isCompleted) {
      this.isDiscovered = true;
    }
    if (snap.isActivated && this.state === 'IDLE') {
      this.activate();
    }
    this.chargeProgress = snap.chargeProgress;
    if (snap.isCompleted) {
      this.state = 'WARP_READY';
      this.isBossDefeated = true;
      this.zoneDome.visible = true;
      this.zoneDomeMat.color.setHex(0x10b981);
      this.zoneDomeMat.opacity = 0.6;
    }
  }
}
