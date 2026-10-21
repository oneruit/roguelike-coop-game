import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { CharacterRig } from './CharacterRig';

/**
 * Loads and displays the authentic watertight 3D mesh generated from the 2D turnaround art.
 * Features PBR materials, Meshopt decompression, turnaround figure extraction (Figure 3 front / Figure 1 back / Figure 2 center),
 * ground alignment, dynamic arcane lighting/particles, and support for Skeletal AnimationMixer (Tripo/Mixamo rigs).
 */
export class MageReal3DSystem {
  private rig: CharacterRig;
  public root: THREE.Group;
  public modelGroup?: THREE.Group;
  private rawScene?: THREE.Group;

  // Arcane VFX
  public crystalLight: THREE.PointLight;
  public particlesGroup: THREE.Group;

  public isLoaded: boolean = false;
  public isVisible: boolean = false;
  private loader: GLTFLoader;

  // Animation state
  private animTime: number = 0;
  public playbackSpeed: number = 1.0;
  public currentAnimState: 'idle' | 'walk' | 'run' | 'attack' = 'idle';

  // Skeletal Animation System (Tripo / Mixamo)
  public mixer?: THREE.AnimationMixer;
  public animations: Map<string, THREE.AnimationAction> = new Map();
  public hasSkeletalAnimations: boolean = false;

  // Turnaround figure isolation configuration (Default is Figure 3 on right side of turnaround)
  public currentFigureIndex: 1 | 2 | 3 = 3;
  public facingRotation: number = Math.PI / 2;

  // Base transform anchors for procedural fallback motion
  private basePosition: THREE.Vector3 = new THREE.Vector3();
  private baseRotation: THREE.Euler = new THREE.Euler();

  constructor(rig: CharacterRig) {
    this.rig = rig;
    this.root = new THREE.Group();
    this.root.name = 'MageReal3DRoot';
    this.root.visible = false;

    // Staff Crystal Dynamic Point Light
    this.crystalLight = new THREE.PointLight(0xa855f7, 3.0, 4.5);
    this.crystalLight.position.set(-0.35, 1.45, 0.25);

    // Orbiting magical energy motes
    this.particlesGroup = new THREE.Group();
    const moteGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const moteMat = new THREE.MeshBasicMaterial({ color: 0xd8b4fe });
    for (let i = 0; i < 5; i++) {
      const mote = new THREE.Mesh(moteGeo, moteMat);
      const angle = (i / 5) * Math.PI * 2;
      mote.position.set(
        -0.35 + Math.cos(angle) * 0.16,
        1.45 + (i % 2 === 0 ? 0.04 : -0.04),
        0.25 + Math.sin(angle) * 0.16
      );
      this.particlesGroup.add(mote);
    }

    this.root.add(this.crystalLight, this.particlesGroup);

    // GLTFLoader setup
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);

    this.loadModel();
  }

  private getModelUrl(): string {
    const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '/';
    return `${base.replace(/\/$/, '')}/models/mage_tripo.glb`;
  }

  /**
   * Slices out a single figure from a multi-figure turnaround 3D model.
   * - Figure 1: Leftmost figure (Z < -0.15)
   * - Figure 2: Center figure (-0.15 <= Z <= 0.15)
   * - Figure 3: Rightmost figure (Z > 0.15)
   */
  public isolateFigure(mesh: THREE.Mesh, figureIdx: 1 | 2 | 3 = this.currentFigureIndex) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const index = geo.index;

    geo.computeBoundingBox();
    const origBox = geo.boundingBox;
    if (!origBox) return;

    const zSpan = origBox.max.z - origBox.min.z;

    // Detect if this is a 3-figure turnaround model (span across Z is large, e.g. > 0.6)
    if (zSpan > 0.6 && origBox.min.z < -0.3) {
      console.log(`[MageReal3DSystem] Multi-figure turnaround detected. Isolating single character (Figure ${figureIdx})...`);
      const newPositions: number[] = [];
      const newNormals: number[] = [];
      const newUVs: number[] = [];
      const newIndices: number[] = [];
      const vertexMap = new Map<number, number>();

      const getOrAddVertex = (oldIdx: number) => {
        if (vertexMap.has(oldIdx)) return vertexMap.get(oldIdx)!;
        const newIdx = newPositions.length / 3;
        newPositions.push(pos.getX(oldIdx), pos.getY(oldIdx), pos.getZ(oldIdx));
        if (norm) newNormals.push(norm.getX(oldIdx), norm.getY(oldIdx), norm.getZ(oldIdx));
        if (uv) newUVs.push(uv.getX(oldIdx), uv.getY(oldIdx));
        vertexMap.set(oldIdx, newIdx);
        return newIdx;
      };

      const isTriangleInFigure = (zA: number, zB: number, zC: number) => {
        if (figureIdx === 1) {
          // Left side of turnaround sheet (Z < -0.15)
          return zA < -0.15 && zB < -0.15 && zC < -0.15;
        } else if (figureIdx === 3) {
          // Right side of turnaround sheet (Z > 0.15)
          return zA > 0.15 && zB > 0.15 && zC > 0.15;
        } else {
          // Center figure (-0.15 <= Z <= 0.15)
          return zA >= -0.15 && zA <= 0.15 && zB >= -0.15 && zB <= 0.15 && zC >= -0.15 && zC <= 0.15;
        }
      };

      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          const iA = index.getX(i);
          const iB = index.getX(i + 1);
          const iC = index.getX(i + 2);
          const zA = pos.getZ(iA);
          const zB = pos.getZ(iB);
          const zC = pos.getZ(iC);

          if (isTriangleInFigure(zA, zB, zC)) {
            newIndices.push(getOrAddVertex(iA), getOrAddVertex(iB), getOrAddVertex(iC));
          }
        }
      }

      if (newIndices.length > 0) {
        const newGeo = new THREE.BufferGeometry();
        newGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
        if (newNormals.length) newGeo.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
        if (newUVs.length) newGeo.setAttribute('uv', new THREE.Float32BufferAttribute(newUVs, 2));
        newGeo.setIndex(newIndices);

        // Center isolated character bounding box to (0, 0, 0) and ground feet
        newGeo.computeBoundingBox();
        const b = newGeo.boundingBox!;
        const center = new THREE.Vector3();
        b.getCenter(center);
        newGeo.translate(-center.x, -b.min.y, -center.z);

        // Rotate so character faces forward (+Z)
        newGeo.rotateY(this.facingRotation);

        mesh.geometry.dispose();
        mesh.geometry = newGeo;
      }
    }
  }

  /**
   * Builds or rebuilds the isolated model from rawScene
   */
  public buildMeshFromRaw() {
    if (!this.rawScene) return;

    // Remove previously rendered modelGroup
    if (this.modelGroup) {
      this.root.remove(this.modelGroup);
    }

    // Clone pristine raw GLTF scene
    this.modelGroup = this.rawScene.clone(true);
    this.modelGroup.name = 'MageTripoMesh';

    // 1. Isolate single character if model contains turnaround duplicates
    this.modelGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        this.isolateFigure(child as THREE.Mesh, this.currentFigureIndex);
      }
    });

    // 2. Calculate Bounding Box to normalize scale and ground position
    const bbox = new THREE.Box3().setFromObject(this.modelGroup);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Normalize height to 1.85m (heroic chibi proportion)
    const targetHeight = 1.85;
    const scale = targetHeight / (size.y || 1);
    this.modelGroup.scale.setScalar(scale);

    // Recompute bbox after scaling to ground feet at y = 0
    const scaledBbox = new THREE.Box3().setFromObject(this.modelGroup);
    const yOffset = -scaledBbox.min.y;
    this.basePosition.set(-center.x * scale, yOffset, -center.z * scale);
    this.baseRotation.set(0, 0, 0);

    this.modelGroup.position.copy(this.basePosition);
    this.modelGroup.rotation.copy(this.baseRotation);

    // 3. Configure PBR Materials and Shadows
    this.modelGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.roughness = Math.max(0.2, mat.roughness ?? 0.7);
          mat.metalness = Math.min(0.6, mat.metalness ?? 0.1);
          if (mat.map) {
            mat.map.magFilter = THREE.NearestFilter;
            mat.map.minFilter = THREE.NearestFilter;
            mat.map.generateMipmaps = false;
          }
        }
      }
    });

    this.root.add(this.modelGroup);
    this.isLoaded = true;
    console.log(`[MageReal3DSystem] Figure ${this.currentFigureIndex} isolated and aligned.`);
  }

  public setFigureIndex(index: 1 | 2 | 3) {
    this.currentFigureIndex = index;
    this.buildMeshFromRaw();
  }

  public toggleRotate180() {
    this.facingRotation = (this.facingRotation + Math.PI) % (Math.PI * 2);
    this.buildMeshFromRaw();
  }

  public rotate90() {
    this.facingRotation = (this.facingRotation + Math.PI / 2) % (Math.PI * 2);
    this.buildMeshFromRaw();
  }

  private loadModel() {
    if (typeof document === 'undefined') {
      // Headless Node environment: dummy group for unit testing
      this.modelGroup = new THREE.Group();
      this.basePosition.set(0, 0, 0);
      this.baseRotation.set(0, 0, 0);
      this.root.add(this.modelGroup);
      this.isLoaded = true;
      return;
    }

    this.loader.load(
      this.getModelUrl(),
      (gltf) => {
        this.rawScene = gltf.scene;

        // Check if model contains skeletal animations (from Tripo Rig or Mixamo)
        if (gltf.animations && gltf.animations.length > 0) {
          this.hasSkeletalAnimations = true;
          this.mixer = new THREE.AnimationMixer(gltf.scene);
          gltf.animations.forEach((clip) => {
            const action = this.mixer!.clipAction(clip);
            this.animations.set(clip.name.toLowerCase(), action);
          });
          console.log(`[MageReal3DSystem] Skeletal animations detected (${gltf.animations.length} clips):`, Array.from(this.animations.keys()));
          this.playSkeletalAnimation(this.currentAnimState);
        }

        this.buildMeshFromRaw();
      },
      undefined,
      (err) => console.warn('[MageReal3DSystem] Error loading model:', err)
    );
  }

  private playSkeletalAnimation(state: 'idle' | 'walk' | 'run' | 'attack') {
    if (!this.mixer || this.animations.size === 0) return;

    // Find best matching animation action
    let targetAction: THREE.AnimationAction | undefined;
    for (const [name, action] of this.animations.entries()) {
      if (name.includes(state)) {
        targetAction = action;
        break;
      }
    }

    // Fallback to first clip if state not found
    if (!targetAction) {
      targetAction = this.animations.values().next().value;
    }

    if (targetAction) {
      targetAction.reset().fadeIn(0.2).play();
    }
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
    this.root.visible = visible;

    if (visible) {
      if (this.root.parent !== this.rig.root) {
        this.rig.root.add(this.root);
      }
    } else {
      if (this.root.parent) {
        this.root.parent.remove(this.root);
      }
    }
  }

  public setAnimationState(state: 'idle' | 'walk' | 'run' | 'attack') {
    this.currentAnimState = state;
    if (this.hasSkeletalAnimations && this.mixer) {
      this.playSkeletalAnimation(state);
    }
  }

  public update(delta: number) {
    if (!this.isVisible) return;
    this.animTime += delta * this.playbackSpeed;

    // Arcane crystal dynamic lighting and particle rotation
    this.crystalLight.intensity = 2.8 + Math.sin(this.animTime * 5.0) * 0.9;
    this.particlesGroup.rotation.y = this.animTime * 2.2;

    if (!this.modelGroup) return;

    // If skeletal animations exist, drive skeleton via AnimationMixer
    if (this.hasSkeletalAnimations && this.mixer) {
      this.mixer.update(delta * this.playbackSpeed);
      return;
    }

    // Fallback: Kinematic sway and stride for static unrigged meshes
    switch (this.currentAnimState) {
      case 'idle': {
        const breath = Math.sin(this.animTime * 2.2);
        const sway = Math.sin(this.animTime * 1.1);
        this.modelGroup.position.y = this.basePosition.y + breath * 0.025;
        this.modelGroup.rotation.y = this.baseRotation.y + sway * 0.04;
        this.modelGroup.rotation.z = this.baseRotation.z + sway * 0.015;
        break;
      }
      case 'walk': {
        const cycle = this.animTime * 4.5;
        const bounce = Math.abs(Math.sin(cycle));
        this.modelGroup.position.y = this.basePosition.y + bounce * 0.04;
        this.modelGroup.rotation.y = this.baseRotation.y + Math.sin(cycle) * 0.08;
        this.modelGroup.rotation.x = this.baseRotation.x + 0.06; // Forward stride lean
        this.modelGroup.rotation.z = this.baseRotation.z - Math.sin(cycle) * 0.03;
        break;
      }
      case 'run': {
        const cycle = this.animTime * 7.5;
        const bounce = Math.abs(Math.sin(cycle));
        this.modelGroup.position.y = this.basePosition.y + bounce * 0.08;
        this.modelGroup.rotation.y = this.baseRotation.y + Math.sin(cycle) * 0.14;
        this.modelGroup.rotation.x = this.baseRotation.x + 0.16; // Strong forward lean
        this.modelGroup.rotation.z = this.baseRotation.z - Math.sin(cycle) * 0.05;
        break;
      }
      case 'attack': {
        const castCycle = Math.sin(this.animTime * 6.0);
        this.modelGroup.position.y = this.basePosition.y + Math.max(0, -castCycle) * 0.06;
        this.modelGroup.rotation.x = this.baseRotation.x - castCycle * 0.15;
        break;
      }
    }
  }
}
