import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CharacterRig } from './CharacterRig';

/**
 * 3D Skinned Skeletal Mesh System for Anime Warrior Girl.
 * Loads Mixamo-rigged FBX files (Idle, Walk, Attack), calibrates humanoid scale and ground alignment,
 * and manages smooth state transitions via Three.js AnimationMixer.
 */
export class AnimeWarrior3DSystem {
  private rig: CharacterRig;
  public root: THREE.Group;
  public modelGroup?: THREE.Group;

  // Animation System
  public mixer?: THREE.AnimationMixer;
  public actions: Map<string, THREE.AnimationAction> = new Map();
  public currentActionName: 'idle' | 'walk' | 'attack' = 'idle';
  public playbackSpeed: number = 1.0;

  // State
  public isLoaded: boolean = false;
  public isVisible: boolean = false;

  private loader: FBXLoader = new FBXLoader();

  constructor(rig: CharacterRig) {
    this.rig = rig;
    this.root = new THREE.Group();
    this.root.name = 'AnimeWarrior3DRoot';
    this.root.visible = false;

    this.loadCharacter();
  }

  private getModelUrl(fileName: string): string {
    const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '/';
    return `${base.replace(/\/$/, '')}/models/anime-warrior/${fileName}`;
  }

  private loadCharacter() {
    if (typeof document === 'undefined') {
      // Headless Node environment: initialize dummy group for unit testing
      this.modelGroup = new THREE.Group();
      this.modelGroup.name = 'AnimeWarriorDummy';
      this.root.add(this.modelGroup);
      this.isLoaded = true;
      return;
    }

    // 1. Load Base Character with Idle animation
    this.loader.load(
      this.getModelUrl('idle.fbx'),
      (fbx) => {
        this.setupModel(fbx);
        this.isLoaded = true;

        // 2. Load Walking animation
        this.loader.load(
          this.getModelUrl('walk.fbx'),
          (walkFbx) => {
            if (walkFbx.animations.length > 0 && this.mixer) {
              const walkClip = walkFbx.animations[0];
              walkClip.name = 'walk';
              const walkAction = this.mixer.clipAction(walkClip);
              this.actions.set('walk', walkAction);
            }
          },
          undefined,
          (err) => console.warn('[AnimeWarrior3DSystem] Failed to load walk.fbx:', err)
        );

        // 3. Load Attack animation
        this.loader.load(
          this.getModelUrl('attack.fbx'),
          (attackFbx) => {
            if (attackFbx.animations.length > 0 && this.mixer) {
              const attackClip = attackFbx.animations[0];
              attackClip.name = 'attack';
              const attackAction = this.mixer.clipAction(attackClip);
              attackAction.setLoop(THREE.LoopOnce, 1);
              attackAction.clampWhenFinished = true;
              this.actions.set('attack', attackAction);
            }
          },
          undefined,
          (err) => console.warn('[AnimeWarrior3DSystem] Failed to load attack.fbx:', err)
        );
      },
      undefined,
      (err) => console.error('[AnimeWarrior3DSystem] Failed to load idle.fbx:', err)
    );
  }

  private setupModel(fbx: THREE.Group) {
    this.modelGroup = fbx;
    this.modelGroup.name = 'AnimeWarriorMeshGroup';

    // Calibrate scale to match humanoid rig height (~2.05 meters)
    const rawBox = new THREE.Box3().setFromObject(fbx);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);

    const targetHeight = 2.05;
    const scaleFactor = rawSize.y > 0 ? targetHeight / rawSize.y : 0.01;
    this.modelGroup.scale.setScalar(scaleFactor);

    // Ground anchor (feet on floor / pedestal)
    const scaledBox = new THREE.Box3().setFromObject(this.modelGroup);
    this.modelGroup.position.y = -scaledBox.min.y;

    // Enable shadows and calibrate materials
    this.modelGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mat = mesh.material as any;
          if (mat.roughness !== undefined) mat.roughness = 0.55;
          if (mat.metalness !== undefined) mat.metalness = 0.15;
        }
      }
    });

    this.root.add(this.modelGroup);

    // Setup AnimationMixer
    this.mixer = new THREE.AnimationMixer(this.modelGroup);

    if (fbx.animations.length > 0) {
      const idleClip = fbx.animations[0];
      idleClip.name = 'idle';
      const idleAction = this.mixer.clipAction(idleClip);
      this.actions.set('idle', idleAction);
      idleAction.play();
      this.currentActionName = 'idle';
    }

    // Return to idle automatically when attack animation finishes
    this.mixer.addEventListener('finished', (e: any) => {
      if (e.action === this.actions.get('attack')) {
        this.playAnimation('idle', 0.25);
      }
    });
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
    this.root.visible = visible;

    if (visible) {
      if (this.root.parent !== this.rig.root) {
        this.rig.root.add(this.root);
      }
    } else {
      this.root.removeFromParent();
    }
  }

  public playAnimation(name: 'idle' | 'walk' | 'attack', fadeDuration = 0.25) {
    if (!this.mixer) return;
    if (this.currentActionName === name && name !== 'attack') return;

    const currentAction = this.actions.get(this.currentActionName);
    const nextAction = this.actions.get(name);
    if (!nextAction) return;

    nextAction.reset();

    if (name === 'attack') {
      nextAction.setLoop(THREE.LoopOnce, 1);
      nextAction.clampWhenFinished = true;
    } else {
      nextAction.setLoop(THREE.LoopRepeat, Infinity);
    }

    if (currentAction && currentAction !== nextAction) {
      currentAction.crossFadeTo(nextAction, fadeDuration, true);
    }
    nextAction.play();
    this.currentActionName = name;
  }

  public triggerAttack() {
    this.playAnimation('attack', 0.15);
  }

  public setAnimationState(state: 'idle' | 'walk' | 'run' | 'attack') {
    if (state === 'attack') {
      this.triggerAttack();
    } else if (state === 'run' || state === 'walk') {
      this.playAnimation('walk', 0.25);
    } else {
      this.playAnimation('idle', 0.25);
    }
  }

  public update(delta: number) {
    if (!this.isVisible || !this.mixer) return;
    this.mixer.update(delta * this.playbackSpeed);
  }
}
