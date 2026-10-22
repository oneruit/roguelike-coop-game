import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';

export type VampirePaletteName = 'crimson' | 'violet' | 'emerald' | 'frost' | 'gold';

export interface VampirePaletteConfig {
  name: VampirePaletteName;
  label: string;
  primaryColor: number;
  wingColor: number;
  accentColor: number;
  lightColor: number;
  moteColor: number;
}

export const VAMPIRE_PALETTES: Record<VampirePaletteName, VampirePaletteConfig> = {
  crimson: {
    name: 'crimson',
    label: 'Кровавая Луна (Crimson)',
    primaryColor: 0xffffff,
    wingColor: 0xffebee,
    accentColor: 0xef4444,
    lightColor: 0xef4444,
    moteColor: 0xf87171,
  },
  violet: {
    name: 'violet',
    label: 'Суккуб Бездны (Void Violet)',
    primaryColor: 0xf3e8ff,
    wingColor: 0xd8b4fe,
    accentColor: 0xa855f7,
    lightColor: 0xa855f7,
    moteColor: 0xc084fc,
  },
  emerald: {
    name: 'emerald',
    label: 'Токсичный Нефрит (Emerald)',
    primaryColor: 0xecfdf5,
    wingColor: 0xa7f3d0,
    accentColor: 0x10b981,
    lightColor: 0x10b981,
    moteColor: 0x34d399,
  },
  frost: {
    name: 'frost',
    label: 'Ледяная Графиня (Frost)',
    primaryColor: 0xf0f9ff,
    wingColor: 0xbae6fd,
    accentColor: 0x38bdf8,
    lightColor: 0x38bdf8,
    moteColor: 0x7dd3fc,
  },
  gold: {
    name: 'gold',
    label: 'Солнечная Царица (Solar Gold)',
    primaryColor: 0xfffbeb,
    wingColor: 0xfde68a,
    accentColor: 0xf59e0b,
    lightColor: 0xf59e0b,
    moteColor: 0xfbbf24,
  },
};

export interface VampireCutoutToggles {
  wings: boolean;
  skirt: boolean;
  legs: boolean;
  arms: boolean;
  aura: boolean;
}

/**
 * Skeletal Cutout / Paperdoll Rig for the Vampire / Succubus character.
 * Assembles segmented pixel-art parts onto CharacterRig joints with
 * procedural wing-flapping, hovering, skirt sway, and real-time palette tinting.
 */
export class VampireCutoutRig {
  private rig: CharacterRig;
  public root: THREE.Group;

  // Cutout Meshes
  public headMesh?: THREE.Mesh;
  public torsoMesh?: THREE.Mesh;
  public skirtMesh?: THREE.Mesh;
  public legsMesh?: THREE.Mesh;
  public leftArmMesh?: THREE.Mesh;
  public rightArmMesh?: THREE.Mesh;
  public leftWingMesh?: THREE.Mesh;
  public rightWingMesh?: THREE.Mesh;

  // Wing Pivot Nodes for independent procedural flapping
  public leftWingPivot: THREE.Group;
  public rightWingPivot: THREE.Group;

  // Materials for live procedural palette tinting
  private materials: {
    head?: THREE.MeshStandardMaterial;
    torso?: THREE.MeshStandardMaterial;
    skirt?: THREE.MeshStandardMaterial;
    legs?: THREE.MeshStandardMaterial;
    leftArm?: THREE.MeshStandardMaterial;
    rightArm?: THREE.MeshStandardMaterial;
    leftWing?: THREE.MeshStandardMaterial;
    rightWing?: THREE.MeshStandardMaterial;
  } = {};

  // Blood & Vampiric Aura VFX
  public bloodLight: THREE.PointLight;
  public motesGroup: THREE.Group;
  private moteMeshes: THREE.Mesh[] = [];

  // Current State
  public isLoaded: boolean = false;
  public isVisible: boolean = false;
  public currentPalette: VampirePaletteName = 'crimson';
  public toggles: VampireCutoutToggles = {
    wings: true,
    skirt: true,
    legs: true,
    arms: true,
    aura: true,
  };

  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();

  constructor(rig: CharacterRig) {
    this.rig = rig;
    this.root = new THREE.Group();
    this.root.name = 'VampireCutoutRigRoot';
    this.root.visible = false;

    // Wing pivots attached to chest/scapula
    this.leftWingPivot = new THREE.Group();
    this.leftWingPivot.name = 'Vampire_LeftWingPivot';
    this.leftWingPivot.position.set(0.18, 0.12, -0.06);

    this.rightWingPivot = new THREE.Group();
    this.rightWingPivot.name = 'Vampire_RightWingPivot';
    this.rightWingPivot.position.set(-0.18, 0.12, -0.06);

    // Vampiric Aura Light
    this.bloodLight = new THREE.PointLight(0xef4444, 2.5, 4.0);
    this.bloodLight.position.set(0, 0.15, 0.1);

    // Orbiting Blood Motes
    this.motesGroup = new THREE.Group();
    this.motesGroup.name = 'Vampire_AuraMotes';
    const moteGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const moteMat = new THREE.MeshBasicMaterial({ color: 0xf87171 });

    for (let i = 0; i < 5; i++) {
      const mote = new THREE.Mesh(moteGeo, moteMat.clone());
      const angle = (i / 5) * Math.PI * 2;
      const radius = 0.35 + (i % 2 === 0 ? 0.1 : -0.05);
      mote.position.set(
        Math.cos(angle) * radius,
        (i - 2) * 0.12,
        Math.sin(angle) * radius
      );
      this.motesGroup.add(mote);
      this.moteMeshes.push(mote);
    }

    this.loadTextures();
  }

  private getTextureUrl(fileName: string): string {
    const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '/';
    return `${base.replace(/\/$/, '')}/textures/character-lab/cutouts/vampire/${fileName}`;
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
      'head.png',
      'torso.png',
      'skirt.png',
      'legs.png',
      'arm_left.png',
      'arm_right.png',
      'wing_left.png',
      'wing_right.png',
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
            this.setPalette(this.currentPalette);
          }
        },
        undefined,
        (err) => console.warn(`[VampireCutoutRig] Failed loading ${file}:`, err)
      );
    });
  }

  private buildMeshes(textures: Record<string, THREE.Texture>) {
    const createMat = (tex?: THREE.Texture) =>
      new THREE.MeshStandardMaterial({
        map: tex || null,
        transparent: true,
        alphaTest: 0.35,
        side: THREE.DoubleSide,
        roughness: 0.82,
        metalness: 0.08,
      });

    const S = 0.0033; // Scale factor from sprite pixels to 3D world meters

    // 1. Head (225x192) - attached to headNode
    this.materials.head = createMat(textures['head']);
    const headGeo = new THREE.PlaneGeometry(225 * S, 192 * S);
    this.headMesh = new THREE.Mesh(headGeo, this.materials.head);
    this.headMesh.name = 'Vampire_Head';
    this.headMesh.position.set(0, 0.18, 0.05);
    this.headMesh.castShadow = true;

    // 2. Torso (116x140) - attached to chestNode
    this.materials.torso = createMat(textures['torso']);
    const torsoGeo = new THREE.PlaneGeometry(116 * S, 140 * S);
    this.torsoMesh = new THREE.Mesh(torsoGeo, this.materials.torso);
    this.torsoMesh.name = 'Vampire_Torso';
    this.torsoMesh.position.set(0, 0.04, 0.04);
    this.torsoMesh.castShadow = true;

    // 3. Skirt / Train (246x240) - attached to pelvisNode
    this.materials.skirt = createMat(textures['skirt']);
    const skirtGeo = new THREE.PlaneGeometry(246 * S, 240 * S);
    this.skirtMesh = new THREE.Mesh(skirtGeo, this.materials.skirt);
    this.skirtMesh.name = 'Vampire_Skirt';
    this.skirtMesh.position.set(0, -0.22, 0.04);
    this.skirtMesh.castShadow = true;

    // 4. Legs & High Boots (126x322) - attached to pelvisNode
    this.materials.legs = createMat(textures['legs']);
    const legsGeo = new THREE.PlaneGeometry(126 * S, 322 * S);
    // Pivot at hip top
    legsGeo.translate(0, -161 * S, 0);
    this.legsMesh = new THREE.Mesh(legsGeo, this.materials.legs);
    this.legsMesh.name = 'Vampire_Legs';
    this.legsMesh.position.set(0, 0, 0.02);
    this.legsMesh.castShadow = true;

    // 5. Left Arm (80x160) - attached to leftArm joint
    this.materials.leftArm = createMat(textures['arm_left']);
    const lArmGeo = new THREE.PlaneGeometry(80 * S, 160 * S);
    lArmGeo.translate(0, -80 * S, 0);
    this.leftArmMesh = new THREE.Mesh(lArmGeo, this.materials.leftArm);
    this.leftArmMesh.name = 'Vampire_LeftArm';
    this.leftArmMesh.position.set(0.04, 0, 0.05);
    this.leftArmMesh.castShadow = true;

    // 6. Right Arm (80x160) - attached to rightArm joint
    this.materials.rightArm = createMat(textures['arm_right']);
    const rArmGeo = new THREE.PlaneGeometry(80 * S, 160 * S);
    rArmGeo.translate(0, -80 * S, 0);
    this.rightArmMesh = new THREE.Mesh(rArmGeo, this.materials.rightArm);
    this.rightArmMesh.name = 'Vampire_RightArm';
    this.rightArmMesh.position.set(-0.04, 0, 0.05);
    this.rightArmMesh.castShadow = true;

    // 7. Left Bat Wing (110x230) - attached to leftWingPivot
    this.materials.leftWing = createMat(textures['wing_left']);
    const lWingGeo = new THREE.PlaneGeometry(110 * S, 230 * S);
    // Pivot at wing root (bottom-inner corner)
    lWingGeo.translate(55 * S, 115 * S, 0);
    this.leftWingMesh = new THREE.Mesh(lWingGeo, this.materials.leftWing);
    this.leftWingMesh.name = 'Vampire_LeftWing';
    this.leftWingMesh.castShadow = true;
    this.leftWingPivot.add(this.leftWingMesh);

    // 8. Right Bat Wing (103x230) - attached to rightWingPivot
    this.materials.rightWing = createMat(textures['wing_right']);
    const rWingGeo = new THREE.PlaneGeometry(103 * S, 230 * S);
    // Pivot at wing root (bottom-inner corner)
    rWingGeo.translate(-51.5 * S, 115 * S, 0);
    this.rightWingMesh = new THREE.Mesh(rWingGeo, this.materials.rightWing);
    this.rightWingMesh.name = 'Vampire_RightWing';
    this.rightWingMesh.castShadow = true;
    this.rightWingPivot.add(this.rightWingMesh);

    // Attach VFX to chest
    this.rig.chestNode.add(this.leftWingPivot);
    this.rig.chestNode.add(this.rightWingPivot);
    this.rig.chestNode.add(this.bloodLight);
    this.rig.chestNode.add(this.motesGroup);
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;

    if (visible) {
      if (this.headMesh) this.rig.headNode.add(this.headMesh);
      if (this.torsoMesh) this.rig.chestNode.add(this.torsoMesh);
      if (this.skirtMesh && this.toggles.skirt) this.rig.pelvisNode.add(this.skirtMesh);
      if (this.legsMesh && this.toggles.legs) this.rig.pelvisNode.add(this.legsMesh);
      if (this.leftArmMesh && this.toggles.arms) this.rig.leftArm.add(this.leftArmMesh);
      if (this.rightArmMesh && this.toggles.arms) this.rig.rightArm.add(this.rightArmMesh);

      if (this.toggles.wings) {
        this.rig.chestNode.add(this.leftWingPivot);
        this.rig.chestNode.add(this.rightWingPivot);
      }
      if (this.toggles.aura) {
        this.rig.chestNode.add(this.bloodLight);
        this.rig.chestNode.add(this.motesGroup);
      }
    } else {
      this.headMesh?.removeFromParent();
      this.torsoMesh?.removeFromParent();
      this.skirtMesh?.removeFromParent();
      this.legsMesh?.removeFromParent();
      this.leftArmMesh?.removeFromParent();
      this.rightArmMesh?.removeFromParent();
      this.leftWingPivot.removeFromParent();
      this.rightWingPivot.removeFromParent();
      this.bloodLight.removeFromParent();
      this.motesGroup.removeFromParent();
    }
  }

  public setToggle(part: keyof VampireCutoutToggles, enabled: boolean) {
    this.toggles[part] = enabled;
    if (!this.isVisible) return;

    switch (part) {
      case 'wings':
        if (enabled) {
          this.rig.chestNode.add(this.leftWingPivot);
          this.rig.chestNode.add(this.rightWingPivot);
        } else {
          this.leftWingPivot.removeFromParent();
          this.rightWingPivot.removeFromParent();
        }
        break;
      case 'skirt':
        if (enabled && this.skirtMesh) {
          this.rig.pelvisNode.add(this.skirtMesh);
        } else {
          this.skirtMesh?.removeFromParent();
        }
        break;
      case 'legs':
        if (enabled && this.legsMesh) {
          this.rig.pelvisNode.add(this.legsMesh);
        } else {
          this.legsMesh?.removeFromParent();
        }
        break;
      case 'arms':
        if (enabled) {
          if (this.leftArmMesh) this.rig.leftArm.add(this.leftArmMesh);
          if (this.rightArmMesh) this.rig.rightArm.add(this.rightArmMesh);
        } else {
          this.leftArmMesh?.removeFromParent();
          this.rightArmMesh?.removeFromParent();
        }
        break;
      case 'aura':
        if (enabled) {
          this.rig.chestNode.add(this.bloodLight);
          this.rig.chestNode.add(this.motesGroup);
        } else {
          this.bloodLight.removeFromParent();
          this.motesGroup.removeFromParent();
        }
        break;
    }
  }

  public setPalette(paletteName: VampirePaletteName) {
    this.currentPalette = paletteName;
    const cfg = VAMPIRE_PALETTES[paletteName];
    if (!cfg) return;

    // Apply color tinting to materials
    if (this.materials.leftWing) this.materials.leftWing.color.setHex(cfg.wingColor);
    if (this.materials.rightWing) this.materials.rightWing.color.setHex(cfg.wingColor);
    if (this.materials.torso) this.materials.torso.color.setHex(cfg.primaryColor);
    if (this.materials.skirt) this.materials.skirt.color.setHex(cfg.accentColor);

    // Apply aura light & particles
    this.bloodLight.color.setHex(cfg.lightColor);
    this.moteMeshes.forEach((mote) => {
      (mote.material as THREE.MeshBasicMaterial).color.setHex(cfg.moteColor);
    });
  }

  public update(time: number, animState: string = 'idle', playbackSpeed: number = 1.0) {
    if (!this.isVisible) return;

    // 1. Procedural Wing Flapping & Breathing
    const isMoving = animState === 'walk' || animState === 'run';
    const flapFreq = isMoving ? 7.0 * playbackSpeed : 2.5 * playbackSpeed;
    const flapAmp = isMoving ? 0.35 : 0.16;

    const flapAngle = Math.sin(time * flapFreq) * flapAmp;
    const flapTwist = Math.cos(time * flapFreq) * (flapAmp * 0.3);

    this.leftWingPivot.rotation.y = flapAngle - 0.1;
    this.leftWingPivot.rotation.z = -flapTwist * 0.5;

    this.rightWingPivot.rotation.y = -flapAngle + 0.1;
    this.rightWingPivot.rotation.z = flapTwist * 0.5;

    // 2. Procedural Skirt Swaying
    if (this.skirtMesh) {
      const sway = Math.sin(time * (isMoving ? 6.0 : 3.0) * playbackSpeed) * (isMoving ? 0.12 : 0.04);
      this.skirtMesh.rotation.z = sway;
      this.skirtMesh.rotation.x = Math.sin(time * 3.5) * 0.03;
    }

    // 3. Head Gothic Micro-Tilt
    if (this.headMesh) {
      this.headMesh.rotation.z = Math.sin(time * 2.2) * 0.02;
    }

    // 4. Aura Light Modulation & Orbiting Blood Motes
    if (this.toggles.aura) {
      this.bloodLight.intensity = 2.0 + Math.sin(time * 4.5) * 0.7;
      this.motesGroup.rotation.y = time * 1.8;
      this.moteMeshes.forEach((mote, i) => {
        mote.position.y = (i - 2) * 0.12 + Math.sin(time * 3.0 + i) * 0.04;
      });
    }
  }
}
