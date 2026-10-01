import * as THREE from 'three';
import { ChunkManager } from '../world/ChunkManager';
import { AltarManager } from '../world/AltarManager';
import { ObstacleManager } from '../world/ObstacleManager';
import { TextureManager } from './TextureManager';

export class Engine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public altarManager: AltarManager;
  public obstacleManager: ObstacleManager;
  public chunkManager: ChunkManager;
  private container: HTMLElement;

  private dirLight!: THREE.DirectionalLight;

  // Camera settings for 2.5D
  private cameraOffset = new THREE.Vector3(0, 16, 12);
  private cameraTarget = new THREE.Vector3();

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;

    // 1. Scene with warm dusty sunset desert fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x23140e);
    this.scene.fog = new THREE.FogExp2(0x23140e, 0.016);

    // 2. Camera (2.5D tilted perspective)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 120);
    this.camera.position.copy(this.cameraOffset);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting & Infinite Procedural World
    this.setupLighting();
    this.obstacleManager = new ObstacleManager();
    this.altarManager = new AltarManager(this.scene);
    this.chunkManager = new ChunkManager(this.scene, this.altarManager, this.obstacleManager);
    this.chunkManager.update(new THREE.Vector3(0, 0, 0));

    // Preload & GPU pre-warm all 44 entity textures upfront (zero loading hitch on new monsters!)
    TextureManager.preloadAll(this.renderer);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private setupLighting() {
    // Ambient Light (warm dusty desert glow)
    const ambientLight = new THREE.AmbientLight(0x8a4216, 0.95);
    this.scene.add(ambientLight);

    // Directional Sun Key Light with Shadows
    this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.4);
    this.dirLight.position.set(18, 28, 14);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 70;
    this.dirLight.shadow.camera.left = -28;
    this.dirLight.shadow.camera.right = 28;
    this.dirLight.shadow.camera.top = 28;
    this.dirLight.shadow.camera.bottom = -28;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Hemisphere light: sunset orange sky to rich umber ground
    const hemiLight = new THREE.HemisphereLight(0xfb923c, 0x241209, 0.7);
    this.scene.add(hemiLight);
  }

  public updateCamera(playerPos: THREE.Vector3, dt: number) {
    const targetX = playerPos.x + this.cameraOffset.x;
    const targetY = playerPos.y + this.cameraOffset.y;
    const targetZ = playerPos.z + this.cameraOffset.z;

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, dt * 6);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, dt * 6);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, dt * 6);

    this.cameraTarget.lerp(playerPos, dt * 8);
    this.camera.lookAt(this.cameraTarget.x, this.cameraTarget.y + 0.6, this.cameraTarget.z);

    // Keep sun & shadow camera aligned with player position in the infinite desert
    if (this.dirLight) {
      this.dirLight.position.set(playerPos.x + 18, playerPos.y + 28, playerPos.z + 14);
      this.dirLight.target.position.copy(playerPos);
      this.dirLight.target.updateMatrixWorld();
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }
}
