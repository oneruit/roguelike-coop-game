import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';

/**
 * Skeletal Cutout / Paperdoll Rig for the Mage.
 * Mounts 9 segmented pixel-art textured planes directly to the corresponding joints of CharacterRig.
 * Fully animated by CharacterAnimator (Idle breathing, Walking strides, Running, Casting).
 */
export class MageCutoutRig {
  private rig: CharacterRig;
  public root: THREE.Group;

  // Cutout Meshes
  public hatMesh?: THREE.Mesh;
  public headMesh?: THREE.Mesh;
  public torsoMesh?: THREE.Mesh;
  public skirtMesh?: THREE.Mesh;
  public capeMesh?: THREE.Mesh;
  public leftArmMesh?: THREE.Mesh;
  public staffArmMesh?: THREE.Mesh;
  public leftLegMesh?: THREE.Mesh;
  public rightLegMesh?: THREE.Mesh;

  // Arcane Crystal Light on Staff
  public crystalLight: THREE.PointLight;
  public particlesGroup: THREE.Group;

  // State
  public isLoaded: boolean = false;
  public isVisible: boolean = false;
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();

  constructor(rig: CharacterRig) {
    this.rig = rig;
    this.root = new THREE.Group();
    this.root.name = 'MageCutoutRigRoot';
    this.root.visible = false;

    // Dynamic light attached to staff crystal
    this.crystalLight = new THREE.PointLight(0xa855f7, 2.5, 3.5);
    this.crystalLight.position.set(-0.25, 0.45, 0.05);

    // Glowing arcane motes
    this.particlesGroup = new THREE.Group();
    const moteGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const moteMat = new THREE.MeshBasicMaterial({ color: 0xd8b4fe });
    for (let i = 0; i < 4; i++) {
      const mote = new THREE.Mesh(moteGeo, moteMat);
      const angle = (i / 4) * Math.PI * 2;
      mote.position.set(
        -0.25 + Math.cos(angle) * 0.12,
        0.45 + (i % 2 === 0 ? 0.03 : -0.03),
        Math.sin(angle) * 0.12
      );
      this.particlesGroup.add(mote);
    }

    this.loadTextures();
  }

  private getTextureUrl(fileName: string): string {
    const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '/';
    return `${base.replace(/\/$/, '')}/textures/character-lab/cutouts/${fileName}`;
  }

  private configurePixelTexture(texture: THREE.Texture) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
  }

  private loadTextures() {
    if (typeof document === 'undefined') {
      // Headless Node environment: initialize dummy meshes for unit testing
      this.buildMeshes({});
      this.isLoaded = true;
      return;
    }

    const files = [
      'hat.png',
      'head.png',
      'torso.png',
      'skirt.png',
      'left_arm.png',
      'staff_arm.png',
      'left_leg.png',
      'right_leg.png',
      'cape.png',
    ];

    const textures: Record<string, THREE.Texture> = {};
    let loaded = 0;

    files.forEach((file) => {
      const key = file.replace('.png', '');
      this.textureLoader.load(
        this.getTextureUrl(file),
        (t) => {
          this.configurePixelTexture(t);
          textures[key] = t;
          loaded++;
          if (loaded === files.length) {
            this.buildMeshes(textures);
            this.isLoaded = true;
          }
        },
        undefined,
        (err) => console.warn(`[MageCutoutRig] Failed loading ${file}:`, err)
      );
    });
  }

  private buildMeshes(textures: Record<string, THREE.Texture>) {
    const createMat = (tex?: THREE.Texture) =>
      new THREE.MeshStandardMaterial({
        map: tex || null,
        transparent: true,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.85,
        metalness: 0.05,
      });

    const S = 0.0033; // Scale factor from sprite pixels to 3D world meters

    // 1. Hat (250x195) - attached to headNode
    const hatGeo = new THREE.PlaneGeometry(250 * S, 195 * S);
    this.hatMesh = new THREE.Mesh(hatGeo, createMat(textures['hat']));
    this.hatMesh.name = 'Cutout_Hat';
    this.hatMesh.position.set(0.02, 0.28, 0.06);
    this.hatMesh.castShadow = true;

    // 2. Head / Face (110x110) - attached to headNode
    const headGeo = new THREE.PlaneGeometry(110 * S, 110 * S);
    this.headMesh = new THREE.Mesh(headGeo, createMat(textures['head']));
    this.headMesh.name = 'Cutout_Head';
    this.headMesh.position.set(0, 0.16, 0.04);
    this.headMesh.castShadow = true;

    // 3. Torso / Bodice with potion (115x120) - attached to chestNode
    const torsoGeo = new THREE.PlaneGeometry(115 * S, 120 * S);
    this.torsoMesh = new THREE.Mesh(torsoGeo, createMat(textures['torso']));
    this.torsoMesh.name = 'Cutout_Torso';
    this.torsoMesh.position.set(0, 0.08, 0.05);
    this.torsoMesh.castShadow = true;

    // 4. Skirt (140x120) - attached to pelvisNode
    const skirtGeo = new THREE.PlaneGeometry(140 * S, 120 * S);
    this.skirtMesh = new THREE.Mesh(skirtGeo, createMat(textures['skirt']));
    this.skirtMesh.name = 'Cutout_Skirt';
    this.skirtMesh.position.set(0, -0.16, 0.04);
    this.skirtMesh.castShadow = true;

    // 5. Cape with celestial golden crest (240x285) - attached to backSocket
    const capeGeo = new THREE.PlaneGeometry(240 * S, 285 * S);
    this.capeMesh = new THREE.Mesh(capeGeo, createMat(textures['cape']));
    this.capeMesh.name = 'Cutout_Cape';
    this.capeMesh.rotation.y = Math.PI; // Face backward
    this.capeMesh.position.set(0, -0.25, -0.06);
    this.capeMesh.castShadow = true;

    // 6. Left Arm (106x160) - attached to leftArm
    const lArmGeo = new THREE.PlaneGeometry(106 * S, 160 * S);
    // Pivot at shoulder
    lArmGeo.translate(0, -80 * S, 0);
    this.leftArmMesh = new THREE.Mesh(lArmGeo, createMat(textures['left_arm']));
    this.leftArmMesh.name = 'Cutout_LeftArm';
    this.leftArmMesh.position.set(0.12, 0, 0.05);
    this.leftArmMesh.castShadow = true;

    // 7. Right Arm & Arcane Staff (125x515) - attached to rightArm
    const staffGeo = new THREE.PlaneGeometry(125 * S, 515 * S);
    // Pivot around hand / shoulder level
    staffGeo.translate(0, -60 * S, 0);
    this.staffArmMesh = new THREE.Mesh(staffGeo, createMat(textures['staff_arm']));
    this.staffArmMesh.name = 'Cutout_StaffArm';
    this.staffArmMesh.position.set(-0.16, 0.05, 0.06);
    this.staffArmMesh.castShadow = true;

    // Attach crystal light and particles to staff head
    this.staffArmMesh.add(this.crystalLight, this.particlesGroup);

    // 8. Left Leg with high boot (80x176) - attached to leftThigh
    const lLegGeo = new THREE.PlaneGeometry(80 * S, 176 * S);
    lLegGeo.translate(0, -88 * S, 0);
    this.leftLegMesh = new THREE.Mesh(lLegGeo, createMat(textures['left_leg']));
    this.leftLegMesh.name = 'Cutout_LeftLeg';
    this.leftLegMesh.position.set(0.04, 0, 0.02);
    this.leftLegMesh.castShadow = true;

    // 9. Right Leg with high boot (80x176) - attached to rightThigh
    const rLegGeo = new THREE.PlaneGeometry(80 * S, 176 * S);
    rLegGeo.translate(0, -88 * S, 0);
    this.rightLegMesh = new THREE.Mesh(rLegGeo, createMat(textures['right_leg']));
    this.rightLegMesh.name = 'Cutout_RightLeg';
    this.rightLegMesh.position.set(-0.04, 0, 0.02);
    this.rightLegMesh.castShadow = true;
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;

    if (visible) {
      if (this.hatMesh) this.rig.headNode.add(this.hatMesh);
      if (this.headMesh) this.rig.headNode.add(this.headMesh);
      if (this.torsoMesh) this.rig.chestNode.add(this.torsoMesh);
      if (this.capeMesh) this.rig.sockets.back.add(this.capeMesh);
      if (this.skirtMesh) this.rig.pelvisNode.add(this.skirtMesh);
      if (this.leftArmMesh) this.rig.leftArm.add(this.leftArmMesh);
      if (this.staffArmMesh) this.rig.rightArm.add(this.staffArmMesh);
      if (this.leftLegMesh) this.rig.leftThigh.add(this.leftLegMesh);
      if (this.rightLegMesh) this.rig.rightThigh.add(this.rightLegMesh);
    } else {
      this.hatMesh?.removeFromParent();
      this.headMesh?.removeFromParent();
      this.torsoMesh?.removeFromParent();
      this.capeMesh?.removeFromParent();
      this.skirtMesh?.removeFromParent();
      this.leftArmMesh?.removeFromParent();
      this.staffArmMesh?.removeFromParent();
      this.leftLegMesh?.removeFromParent();
      this.rightLegMesh?.removeFromParent();
    }
  }

  public update(time: number) {
    if (!this.isVisible) return;

    // Staff crystal pulse and light modulation
    this.crystalLight.intensity = 2.2 + Math.sin(time * 5.0) * 0.7;
    this.particlesGroup.rotation.y = time * 2.5;

    // Secondary Hat Motion (Spring physics simulation)
    if (this.hatMesh) {
      this.hatMesh.rotation.z = Math.sin(time * 3.5) * 0.04;
      this.hatMesh.rotation.x = Math.cos(time * 3.0) * 0.03;
    }

    // Secondary Cape Swaying
    if (this.capeMesh) {
      this.capeMesh.rotation.x = Math.PI - 0.08 + Math.sin(time * 3.0) * 0.06;
    }
  }
}
