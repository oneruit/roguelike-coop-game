import {
  type Scene,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
  DoubleSide,
  Group
} from 'three';

/**
 * 3D visual reticle (crosshair) projected onto the ground at the mouse world position.
 * Features an outer targeting ring and central reticle pip for tactical aiming.
 */
export class AimReticle {
  public group: Group;
  public position: Vector3 = new Vector3();
  public isVisible: boolean = false;

  private outerRing: Mesh;
  private innerDot: Mesh;
  private ringMaterial: MeshBasicMaterial;
  private dotMaterial: MeshBasicMaterial;
  private pulseTimer: number = 0;

  constructor(private scene: Scene) {
    this.group = new Group();

    // Outer aiming ring (radius 0.65m)
    const ringGeom = new RingGeometry(0.55, 0.65, 32);
    this.ringMaterial = new MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: DoubleSide,
      depthWrite: false
    });
    this.outerRing = new Mesh(ringGeom, this.ringMaterial);
    this.outerRing.rotation.x = -Math.PI / 2;
    this.group.add(this.outerRing);

    // Center targeting pip
    const dotGeom = new RingGeometry(0, 0.12, 16);
    this.dotMaterial = new MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.9,
      side: DoubleSide,
      depthWrite: false
    });
    this.innerDot = new Mesh(dotGeom, this.dotMaterial);
    this.innerDot.rotation.x = -Math.PI / 2;
    this.group.add(this.innerDot);

    this.group.visible = false;
    this.scene.add(this.group);
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible;
  }

  public setColor(ringColor: number, dotColor: number = 0xef4444): void {
    this.ringMaterial.color.setHex(ringColor);
    this.dotMaterial.color.setHex(dotColor);
  }

  public update(dt: number, worldX: number, worldY: number, worldZ: number): void {
    if (!this.isVisible) return;

    this.position.set(worldX, worldY + 0.05, worldZ);
    this.group.position.copy(this.position);

    // Subtle breathing pulse & slow rotation
    this.pulseTimer += dt * 3.0;
    const scale = 1.0 + Math.sin(this.pulseTimer) * 0.06;
    this.outerRing.scale.set(scale, scale, 1);
    this.outerRing.rotation.z += dt * 1.5;
  }

  public destroy(): void {
    this.scene.remove(this.group);
    this.outerRing.geometry.dispose();
    this.innerDot.geometry.dispose();
    this.ringMaterial.dispose();
    this.dotMaterial.dispose();
  }
}
