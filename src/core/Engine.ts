import * as THREE from 'three';
import { ChunkManager } from '../world/ChunkManager';
import { AltarManager } from '../world/AltarManager';
import { ObstacleManager } from '../world/ObstacleManager';

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

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private setupLighting() {
    // Ambient Light (warm dusty desert glow)
    const ambientLight = new THREE.AmbientLight(0x8a4216, 0.95);
    this.scene.add(ambientLight);

    // Directional Sun Key Light with Shadows (1024x1024 default resolution)
    this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.4);
    this.dirLight.position.set(18, 28, 14);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 70;
    this.dirLight.shadow.camera.left = -30;
    this.dirLight.shadow.camera.right = 30;
    this.dirLight.shadow.camera.top = 30;
    this.dirLight.shadow.camera.bottom = -30;
    this.dirLight.shadow.bias = -0.0008;
    this.dirLight.shadow.normalBias = 0.04;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Hemisphere light: sunset orange sky to rich umber ground
    const hemiLight = new THREE.HemisphereLight(0xfb923c, 0x241209, 0.7);
    this.scene.add(hemiLight);
  }

  /**
   * Configures shadow map resolution or disables shadows (0, 512, 1024, 2048).
   */
  public setShadowQuality(resolution: number) {
    if (resolution <= 0) {
      this.renderer.shadowMap.enabled = false;
      this.dirLight.castShadow = false;
    } else {
      this.renderer.shadowMap.enabled = true;
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = resolution;
      this.dirLight.shadow.mapSize.height = resolution;
      if (this.dirLight.shadow.map) {
        this.dirLight.shadow.map.dispose();
        (this.dirLight.shadow.map as any) = null;
      }
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => (m.needsUpdate = true));
        } else {
          obj.material.needsUpdate = true;
        }
      }
    });
  }

  public updateCamera(playerPos: THREE.Vector3, dt: number) {
    const targetX = playerPos.x + this.cameraOffset.x;
    const targetY = playerPos.y + this.cameraOffset.y;
    const targetZ = playerPos.z + this.cameraOffset.z;

    const factor = 1 - Math.exp(-12 * Math.min(dt, 0.1));

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, factor);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, factor);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, factor);

    this.cameraTarget.lerp(playerPos, factor);
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
