import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CharacterRig } from './CharacterRig';
import { CharacterModularSystem } from './CharacterModularSystem';
import { CharacterAnimator } from './CharacterAnimator';
import {
  CharacterClass,
  CharacterColors,
  CharacterConfig,
  CharacterEquipmentToggles,
  CharacterMaterialsConfig,
  LightingPreset,
} from './types';

export const DEFAULT_CLASS_CONFIGS: Record<CharacterClass, CharacterConfig> = {
  warrior: {
    classType: 'warrior',
    colors: {
      skin: '#e2b392',
      hair: '#374151',
      primaryArmor: '#4b5563',
      secondaryArmor: '#d97706',
      accent: '#dc2626',
      emissive: '#38bdf8',
    },
    materials: {
      metalness: 0.85,
      roughness: 0.25,
    },
    equipment: {
      showHelmet: true,
      showShoulders: true,
      showCape: true,
      showSecondary: true,
    },
  },
  archer: {
    classType: 'archer',
    colors: {
      skin: '#dfb897',
      hair: '#92400e',
      primaryArmor: '#365314',
      secondaryArmor: '#78350f',
      accent: '#15803d',
      emissive: '#4ade80',
    },
    materials: {
      metalness: 0.2,
      roughness: 0.75,
    },
    equipment: {
      showHelmet: true,
      showShoulders: true,
      showCape: false,
      showSecondary: true,
    },
  },
  mage: {
    classType: 'mage',
    colors: {
      skin: '#f5d0b5',
      hair: '#e2e8f0',
      primaryArmor: '#3730a3',
      secondaryArmor: '#eab308',
      accent: '#6366f1',
      emissive: '#c084fc',
    },
    materials: {
      metalness: 0.1,
      roughness: 0.85,
    },
    equipment: {
      showHelmet: true,
      showShoulders: false,
      showCape: true,
      showSecondary: true,
    },
  },
};

export class CharacterSandboxApp {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  // Character Components
  public rig: CharacterRig;
  public modularSystem: CharacterModularSystem;
  public animator: CharacterAnimator;

  // Active configuration
  public currentClass: CharacterClass = 'warrior';
  public currentConfig: CharacterConfig;

  // Lighting Rig
  public keyLight: THREE.DirectionalLight;
  public fillLight: THREE.HemisphereLight;
  public rimLight: THREE.DirectionalLight;
  public pedestalMesh: THREE.Mesh;

  private clock: THREE.Clock = new THREE.Clock();
  private isDisposed: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.currentConfig = JSON.parse(JSON.stringify(DEFAULT_CLASS_CONFIGS.warrior));

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.05);

    // 2. Camera
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 50);
    this.camera.position.set(0, 1.4, 4.2);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 1.05, 0);
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 8.0;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't go below floor

    // 5. Lighting Setup
    this.fillLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.2);
    this.scene.add(this.fillLight);

    this.keyLight = new THREE.DirectionalLight(0xfffbeb, 2.4);
    this.keyLight.position.set(3, 4.5, 3.5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.bias = -0.0002;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 12;
    this.keyLight.shadow.camera.left = -2;
    this.keyLight.shadow.camera.right = 2;
    this.keyLight.shadow.camera.top = 2.5;
    this.keyLight.shadow.camera.bottom = -0.5;
    this.scene.add(this.keyLight);

    // Rim light from rear-left
    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    this.rimLight.position.set(-3.5, 3.0, -3.0);
    this.scene.add(this.rimLight);

    // 6. Pedestal & Floor
    this.pedestalMesh = this.buildPedestal();
    this.scene.add(this.pedestalMesh);

    // 7. Character Assembly
    this.rig = new CharacterRig(this.currentConfig.colors, this.currentConfig.materials);
    this.modularSystem = new CharacterModularSystem(
      this.rig,
      this.currentConfig.colors,
      this.currentConfig.materials
    );
    this.animator = new CharacterAnimator(this.rig);

    this.scene.add(this.rig.root);
    this.applyClass('warrior');

    // 8. Resize Listener
    window.addEventListener('resize', this.onResize);

    // 9. Start Render Loop
    this.animate();
  }

  private buildPedestal(): THREE.Mesh {
    const group = new THREE.Group();

    // Stone Pedestal
    const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.25, 32);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
      metalness: 0.1,
    });
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = -0.125;
    base.receiveShadow = true;
    group.add(base);

    // Golden Rune Ring
    const runeRingGeo = new THREE.RingGeometry(1.2, 1.45, 32);
    runeRingGeo.rotateX(-Math.PI / 2);
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const runeRing = new THREE.Mesh(runeRingGeo, runeMat);
    runeRing.position.y = 0.005;
    group.add(runeRing);

    return base;
  }

  public applyClass(classType: CharacterClass) {
    this.currentClass = classType;
    this.currentConfig = JSON.parse(JSON.stringify(DEFAULT_CLASS_CONFIGS[classType]));

    this.rig.updateColors(this.currentConfig.colors);
    this.modularSystem.updateColors(this.currentConfig.colors);
    this.modularSystem.updateMaterials(this.currentConfig.materials);
    this.modularSystem.applyClass(classType, this.currentConfig.equipment);

    this.animator.setClass(classType);
    this.animator.setState('idle');

    // Accent rim light per class
    if (classType === 'warrior') {
      this.rimLight.color.set(0xf59e0b); // Warm ember
    } else if (classType === 'archer') {
      this.rimLight.color.set(0x34d399); // Emerald leaf
    } else {
      this.rimLight.color.set(0xa855f7); // Violet arcane
    }
  }

  public setAnimation(state: 'idle' | 'walk' | 'run' | 'attack') {
    this.animator.setState(state);
  }

  public triggerAttack() {
    this.animator.triggerAttack();
  }

  public setPlaybackSpeed(speed: number) {
    this.animator.playbackSpeed = speed;
  }

  public updateColor(slot: keyof CharacterColors, value: string) {
    this.currentConfig.colors[slot] = value;
    this.rig.updateColors(this.currentConfig.colors);
    this.modularSystem.updateColors(this.currentConfig.colors);
  }

  public updateMaterialProperty(prop: keyof CharacterMaterialsConfig, value: number) {
    this.currentConfig.materials[prop] = value;
    this.modularSystem.updateMaterials(this.currentConfig.materials);
  }

  public toggleEquipment(slot: keyof CharacterEquipmentToggles, value: boolean) {
    this.currentConfig.equipment[slot] = value;
    this.modularSystem.applyClass(this.currentClass, this.currentConfig.equipment);
  }

  public toggleWireframe(visible: boolean) {
    this.rig.setDebugVisible(visible);
  }

  public setLightingPreset(preset: LightingPreset) {
    switch (preset) {
      case 'studio':
        this.scene.background = new THREE.Color(0x0f172a);
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.05);
        this.fillLight.color.set(0xe0f2fe);
        this.fillLight.intensity = 1.2;
        this.keyLight.color.set(0xfffbeb);
        this.keyLight.intensity = 2.4;
        break;
      case 'dungeon':
        this.scene.background = new THREE.Color(0x030712);
        this.scene.fog = new THREE.FogExp2(0x030712, 0.12);
        this.fillLight.color.set(0x1e1b4b);
        this.fillLight.intensity = 0.5;
        this.keyLight.color.set(0xf97316); // Torch fire
        this.keyLight.intensity = 3.0;
        break;
      case 'sunset':
        this.scene.background = new THREE.Color(0x2a1215);
        this.scene.fog = new THREE.FogExp2(0x2a1215, 0.06);
        this.fillLight.color.set(0xf43f5e);
        this.fillLight.intensity = 1.0;
        this.keyLight.color.set(0xfbbf24);
        this.keyLight.intensity = 2.8;
        break;
    }
  }

  public resetCamera(view: 'front' | 'close' | 'iso') {
    switch (view) {
      case 'front':
        this.camera.position.set(0, 1.3, 3.8);
        this.controls.target.set(0, 1.05, 0);
        break;
      case 'close':
        this.camera.position.set(0, 1.45, 1.6);
        this.controls.target.set(0, 1.45, 0);
        break;
      case 'iso':
        this.camera.position.set(2.8, 2.5, 2.8);
        this.controls.target.set(0, 1.05, 0);
        break;
    }
    this.controls.update();
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = () => {
    if (this.isDisposed) return;
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();
    this.animator.update(delta);
    this.modularSystem.updateVFX(elapsedTime);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    this.isDisposed = true;
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
