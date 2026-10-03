import * as THREE from 'three';

export type TeleporterState = 'IDLE' | 'CHARGING' | 'COMPLETED' | 'WARP_READY';

export class RiftTeleporter {
  private scene: THREE.Scene;
  public position: THREE.Vector3;
  public state: TeleporterState = 'IDLE';

  public chargeProgress: number = 0; // 0.0 to 1.0 (0% to 100%)
  public chargeRadius: number = 35; // 35 meters radius
  public isPlayerInsideZone: boolean = false;
  public isBossDefeated: boolean = false;

  public mesh: THREE.Group;
  private ringMesh1!: THREE.Mesh;
  private ringMesh2!: THREE.Mesh;
  private beaconBeam!: THREE.Mesh;
  private zoneDome!: THREE.Mesh;
  private zoneDomeMat!: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, position: THREE.Vector3 = new THREE.Vector3(75, 0, 75)) {
    this.scene = scene;
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.createTeleporterVisuals();
    this.scene.add(this.mesh);
  }

  private createTeleporterVisuals() {
    // 1. Central Obelisk
    const obeliskGeom = new THREE.CylinderGeometry(0.8, 1.8, 6.5, 6);
    const obeliskMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x4338ca,
      emissiveIntensity: 0.4
    });
    const obelisk = new THREE.Mesh(obeliskGeom, obeliskMat);
    obelisk.position.y = 3.25;
    obelisk.castShadow = true;
    this.mesh.add(obelisk);

    // 2. Floating Rotating Energy Rings
    const ringGeom = new THREE.TorusGeometry(2.4, 0.15, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true
    });
    this.ringMesh1 = new THREE.Mesh(ringGeom, ringMat);
    this.ringMesh1.position.y = 3.8;
    this.ringMesh1.rotation.x = Math.PI / 4;
    this.mesh.add(this.ringMesh1);

    this.ringMesh2 = new THREE.Mesh(ringGeom, ringMat);
    this.ringMesh2.position.y = 3.8;
    this.ringMesh2.rotation.y = Math.PI / 3;
    this.mesh.add(this.ringMesh2);

    // 3. Skyward Beacon Beam (visible from anywhere)
    const beamGeom = new THREE.CylinderGeometry(0.6, 1.4, 180, 16);
    beamGeom.translate(0, 90, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    this.beaconBeam = new THREE.Mesh(beamGeom, beamMat);
    this.mesh.add(this.beaconBeam);

    // 4. Ground Charge Circle / Dome
    const zoneGeom = new THREE.RingGeometry(this.chargeRadius - 0.4, this.chargeRadius + 0.4, 64);
    zoneGeom.rotateX(-Math.PI / 2);
    this.zoneDomeMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.zoneDome = new THREE.Mesh(zoneGeom, this.zoneDomeMat);
    this.zoneDome.position.y = 0.1;
    this.zoneDome.visible = false;
    this.mesh.add(this.zoneDome);
  }

  public activate(): boolean {
    if (this.state !== 'IDLE') return false;
    this.state = 'CHARGING';
    this.chargeProgress = 0;
    this.isBossDefeated = false;
    this.zoneDome.visible = true;
    this.zoneDomeMat.color.setHex(0xf43f5e); // Pulsing red while charging
    return true;
  }

  public update(dt: number, playerPositions: THREE.Vector3[]): { justCompleted: boolean } {
    // Animate beacon and rings
    this.ringMesh1.rotation.y += dt * 1.5;
    this.ringMesh1.rotation.z += dt * 0.8;
    this.ringMesh2.rotation.x += dt * 1.2;
    this.ringMesh2.rotation.y -= dt * 1.0;

    let justCompleted = false;

    if (this.state === 'CHARGING') {
      // Check if at least one player is within radius
      this.isPlayerInsideZone = false;
      for (const pos of playerPositions) {
        const distSq = pos.distanceToSquared(this.position);
        if (distSq <= this.chargeRadius * this.chargeRadius) {
          this.isPlayerInsideZone = true;
          break;
        }
      }

      // Charge speed: ~75 seconds to full charge (1.0 / 75 per sec)
      if (this.isPlayerInsideZone) {
        this.chargeProgress = Math.min(1.0, this.chargeProgress + dt / 75.0);
        this.zoneDomeMat.opacity = 0.45 + Math.sin(Date.now() * 0.005) * 0.2;
      } else {
        // Paused charge when out of zone
        this.zoneDomeMat.opacity = 0.2;
      }

      // Check completion criteria: 100% charged AND boss defeated
      if (this.chargeProgress >= 1.0 && this.isBossDefeated) {
        this.state = 'WARP_READY';
        this.zoneDomeMat.color.setHex(0x10b981); // Emerald green for stable rift!
        this.zoneDomeMat.opacity = 0.6;
        justCompleted = true;
      }
    }

    return { justCompleted };
  }

  /**
   * Resets teleporter for a new stage at new random location.
   */
  public resetForStage(newPos: THREE.Vector3) {
    this.position.copy(newPos);
    this.mesh.position.copy(newPos);
    this.state = 'IDLE';
    this.chargeProgress = 0;
    this.isBossDefeated = false;
    this.isPlayerInsideZone = false;
    this.zoneDome.visible = false;
    this.zoneDomeMat.color.setHex(0x6366f1);
  }

  public getInteraction(playerPos: THREE.Vector3): { canInteract: boolean; prompt: string; action: 'activate' | 'warp' | null } {
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
}
