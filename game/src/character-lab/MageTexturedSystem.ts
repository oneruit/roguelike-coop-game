import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';

export type MageViewAngleMode = 'auto' | 'front' | 'side' | 'back' | 'cross3d';

/**
 * High-fidelity textured pixel-art system for the Mage.
 * Utilizes 3-view turnaround sprites (Front, Side, Back) with NearestFilter,
 * directional angle-based perspective matching, and dynamic 3D lighting/particle integration.
 */
export class MageTexturedSystem {
  private rig: CharacterRig;
  public root: THREE.Group;

  // Textures
  public frontTexture?: THREE.Texture;
  public sideTexture?: THREE.Texture;
  public backTexture?: THREE.Texture;

  // Meshes
  public frontMesh?: THREE.Mesh;
  public sideMesh?: THREE.Mesh;
  public backMesh?: THREE.Mesh;
  public crossMeshA?: THREE.Mesh;
  public crossMeshB?: THREE.Mesh;

  // Active Display Mode
  public angleMode: MageViewAngleMode = 'auto';

  // 3D Arcane Staff Socket Attachment
  public staffGroup: THREE.Group;
  public crystalLight: THREE.PointLight;
  public crystalMesh: THREE.Mesh;
  public particlesGroup: THREE.Group;

  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  public isLoaded: boolean = false;
  public isVisible: boolean = false;

  constructor(rig: CharacterRig) {
    this.rig = rig;
    this.root = new THREE.Group();
    this.root.name = 'MageTexturedRoot';
    this.root.visible = false;

    // Staff with real-time dynamic light
    this.staffGroup = new THREE.Group();
    this.staffGroup.name = 'Mage3DStaff';

    // Arcane Crystal Light (glowing violet)
    this.crystalLight = new THREE.PointLight(0xa855f7, 2.8, 4.0);
    this.crystalLight.position.set(0, 1.25, 0);

    // Glowing faceted crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.09, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0xa855f7,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.1,
    });
    this.crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    this.crystalMesh.position.set(0, 1.25, 0);

    // Particle motes
    this.particlesGroup = new THREE.Group();
    const moteGeo = new THREE.SphereGeometry(0.016, 6, 6);
    const moteMat = new THREE.MeshBasicMaterial({ color: 0xd8b4fe });
    for (let i = 0; i < 5; i++) {
      const mote = new THREE.Mesh(moteGeo, moteMat);
      const angle = (i / 5) * Math.PI * 2;
      mote.position.set(Math.cos(angle) * 0.14, 1.25 + (i % 2 === 0 ? 0.03 : -0.03), Math.sin(angle) * 0.14);
      this.particlesGroup.add(mote);
    }

    this.staffGroup.add(this.crystalLight, this.crystalMesh, this.particlesGroup);
    this.loadTextures();
  }

  private getTextureUrl(fileName: string): string {
    const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '/';
    return `${base.replace(/\/$/, '')}/textures/character-lab/${fileName}`;
  }

  private configurePixelTexture(texture: THREE.Texture) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
  }

  private loadTextures() {
    if (typeof document === 'undefined') {
      // Headless Node environment: initialize textures and meshes for testability
      this.frontTexture = new THREE.Texture();
      this.sideTexture = new THREE.Texture();
      this.backTexture = new THREE.Texture();
      this.buildMeshes();
      this.isLoaded = true;
      return;
    }

    const frontUrl = this.getTextureUrl('mage_front.png');
    const sideUrl = this.getTextureUrl('mage_side.png');
    const backUrl = this.getTextureUrl('mage_back.png');

    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount++;
      if (loadedCount === 3) {
        this.buildMeshes();
        this.isLoaded = true;
      }
    };

    this.frontTexture = this.textureLoader.load(frontUrl, (t) => {
      this.configurePixelTexture(t);
      onLoaded();
    });

    this.sideTexture = this.textureLoader.load(sideUrl, (t) => {
      this.configurePixelTexture(t);
      onLoaded();
    });

    this.backTexture = this.textureLoader.load(backUrl, (t) => {
      this.configurePixelTexture(t);
      onLoaded();
    });
  }

  private buildMeshes() {
    if (!this.frontTexture || !this.sideTexture || !this.backTexture) return;

    // Character dimensions matching humanoid proportions
    // Height: 1.85m, Width proportional to aspect ratio
    const height = 1.85;
    const frontWidth = height * (316 / 556); // ~ 1.05m
    const sideWidth = height * (270 / 556);  // ~ 0.90m
    const backWidth = height * (324 / 556);  // ~ 1.08m

    const frontMat = new THREE.MeshStandardMaterial({
      map: this.frontTexture,
      transparent: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.05,
    });

    const sideMat = new THREE.MeshStandardMaterial({
      map: this.sideTexture,
      transparent: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.05,
    });

    const backMat = new THREE.MeshStandardMaterial({
      map: this.backTexture,
      transparent: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.05,
    });

    // 1. Front Mesh (facing +Z)
    const frontGeo = new THREE.PlaneGeometry(frontWidth, height);
    this.frontMesh = new THREE.Mesh(frontGeo, frontMat);
    this.frontMesh.position.set(0, height * 0.5 - 0.05, 0.01);
    this.frontMesh.castShadow = true;
    this.frontMesh.receiveShadow = true;
    this.root.add(this.frontMesh);

    // 2. Back Mesh (facing -Z)
    const backGeo = new THREE.PlaneGeometry(backWidth, height);
    this.backMesh = new THREE.Mesh(backGeo, backMat);
    this.backMesh.rotation.y = Math.PI;
    this.backMesh.position.set(0, height * 0.5 - 0.05, -0.01);
    this.backMesh.castShadow = true;
    this.backMesh.receiveShadow = true;
    this.root.add(this.backMesh);

    // 3. Side Mesh (facing +X)
    const sideGeo = new THREE.PlaneGeometry(sideWidth, height);
    this.sideMesh = new THREE.Mesh(sideGeo, sideMat);
    this.sideMesh.rotation.y = Math.PI / 2;
    this.sideMesh.position.set(0, height * 0.5 - 0.05, 0);
    this.sideMesh.castShadow = true;
    this.sideMesh.receiveShadow = true;
    this.root.add(this.sideMesh);

    // 4. Cross 3D Meshes (for volumetric paperdoll view)
    const crossMat = new THREE.MeshStandardMaterial({
      map: this.frontTexture,
      transparent: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.85,
    });
    this.crossMeshA = new THREE.Mesh(new THREE.PlaneGeometry(frontWidth, height), crossMat);
    this.crossMeshA.position.y = height * 0.5 - 0.05;
    this.crossMeshB = new THREE.Mesh(new THREE.PlaneGeometry(sideWidth, height), sideMat);
    this.crossMeshB.position.y = height * 0.5 - 0.05;
    this.crossMeshB.rotation.y = Math.PI / 2;

    this.updateVisibilityByMode();
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
    this.root.visible = visible;

    if (visible) {
      if (this.root.parent !== this.rig.root) {
        this.rig.root.add(this.root);
      }
      this.rig.sockets.rightHand.add(this.staffGroup);
    } else {
      if (this.root.parent) {
        this.root.parent.remove(this.root);
      }
      this.staffGroup.removeFromParent();
    }
  }

  public setAngleMode(mode: MageViewAngleMode) {
    this.angleMode = mode;
    this.updateVisibilityByMode();
  }

  private updateVisibilityByMode() {
    if (!this.frontMesh || !this.sideMesh || !this.backMesh) return;

    if (this.angleMode === 'cross3d') {
      this.frontMesh.visible = true;
      this.sideMesh.visible = true;
      this.backMesh.visible = false;
      return;
    }

    if (this.angleMode === 'front') {
      this.frontMesh.visible = true;
      this.sideMesh.visible = false;
      this.backMesh.visible = false;
    } else if (this.angleMode === 'side') {
      this.frontMesh.visible = false;
      this.sideMesh.visible = true;
      this.backMesh.visible = false;
    } else if (this.angleMode === 'back') {
      this.frontMesh.visible = false;
      this.sideMesh.visible = false;
      this.backMesh.visible = true;
    }
  }

  public update(camera: THREE.Camera, time: number) {
    if (!this.isVisible || !this.isLoaded) return;

    // Follow Pelvis vertical breathing and bobbing smoothly
    const pelvisY = this.rig.pelvisNode.position.y;
    this.root.position.y = (pelvisY - 1.05) * 0.7;

    // Update dynamic staff crystal VFX
    this.crystalMesh.rotation.y = time * 2.5;
    this.particlesGroup.rotation.y = -time * 2.0;
    this.crystalLight.intensity = 2.4 + Math.sin(time * 5.0) * 0.8;

    // Directional Angle-Based Sprite Switching (Octopath / Retro ARPG style)
    if (this.angleMode === 'auto' && this.frontMesh && this.sideMesh && this.backMesh) {
      // Calculate angle between camera direction and character forward vector
      const camPos = camera.position;
      const charPos = this.rig.root.position;

      const dx = camPos.x - charPos.x;
      const dz = camPos.z - charPos.z;
      const camAngle = Math.atan2(dx, dz); // Angle relative to +Z forward

      const absAngle = Math.abs(camAngle);

      if (absAngle < Math.PI * 0.32) {
        // Front view
        this.frontMesh.visible = true;
        this.sideMesh.visible = false;
        this.backMesh.visible = false;
      } else if (absAngle > Math.PI * 0.68) {
        // Back view
        this.frontMesh.visible = false;
        this.sideMesh.visible = false;
        this.backMesh.visible = true;
      } else {
        // Side view (mirror if viewing from left side vs right side)
        this.frontMesh.visible = false;
        this.sideMesh.visible = true;
        this.backMesh.visible = false;

        // Flip X scale depending on which side the camera is on
        this.sideMesh.scale.x = dx > 0 ? 1 : -1;
      }
    }
  }
}
