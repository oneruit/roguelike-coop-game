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

  public timeOfDay: 'day' | 'night' | 'cycle' = 'day';
  private cycleTimer: number = 0;
  private readonly CYCLE_DURATION: number = 180; // 3 minutes full day/night cycle

  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;

  private sunOffset = new THREE.Vector3(18, 28, 14);
  private moonOffset = new THREE.Vector3(-14, 26, -14);
  private currentLightOffset = new THREE.Vector3(18, 28, 14);

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
    const savedTime = (localStorage.getItem('settings_time_of_day') as 'day' | 'night' | 'cycle') || 'day';
    this.setTimeOfDay(savedTime);

    this.obstacleManager = new ObstacleManager();
    this.altarManager = new AltarManager(this.scene);
    this.chunkManager = new ChunkManager(this.scene, this.altarManager, this.obstacleManager);
    this.chunkManager.update(new THREE.Vector3(0, 0, 0));

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private setupLighting() {
    // Ambient Light
    this.ambientLight = new THREE.AmbientLight(0x8a5530, 0.95);
    this.scene.add(this.ambientLight);

    // Directional Sun / Moon Key Light with Shadows (1024x1024 default resolution)
    this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.45);
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

    // Hemisphere light
    this.hemiLight = new THREE.HemisphereLight(0xfb923c, 0x241209, 0.70);
    this.scene.add(this.hemiLight);
  }

  /**
   * Switches lighting between Day (Sun), Night (Moon), and dynamic Day/Night Cycle.
   */
  public setTimeOfDay(mode: 'day' | 'night' | 'cycle') {
    this.timeOfDay = mode;
    try {
      localStorage.setItem('settings_time_of_day', mode);
    } catch {}

    if (mode === 'day') {
      this.currentLightOffset.copy(this.sunOffset);
      this.dirLight.color.setHex(0xffedd5);
      this.dirLight.intensity = 1.45;
      this.ambientLight.color.setHex(0x8a5530);
      this.ambientLight.intensity = 0.95;
      this.hemiLight.color.setHex(0xfb923c);
      this.hemiLight.groundColor.setHex(0x241209);
      this.hemiLight.intensity = 0.70;
      this.scene.background = new THREE.Color(0x23140e);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0x23140e);
        this.scene.fog.density = 0.016;
      }
    } else if (mode === 'night') {
      this.currentLightOffset.copy(this.moonOffset);
      // Soft silvery-cyan moonlight
      this.dirLight.color.setHex(0xa5cbf5);
      this.dirLight.intensity = 1.20;
      // Bright cool moonlight ambient for clear readability
      this.ambientLight.color.setHex(0x2b3d63);
      this.ambientLight.intensity = 0.95;
      this.hemiLight.color.setHex(0x38bdf8);
      this.hemiLight.groundColor.setHex(0x111827);
      this.hemiLight.intensity = 0.65;
      // Deep midnight indigo sky
      this.scene.background = new THREE.Color(0x0c1322);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0x0c1322);
        this.scene.fog.density = 0.015;
      }
    }
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

    // Dynamic Day/Night Cycle interpolation
    if (this.timeOfDay === 'cycle') {
      this.cycleTimer = (this.cycleTimer + dt) % this.CYCLE_DURATION;
      // 0 = pure night, 1 = pure day
      const t = (Math.sin((this.cycleTimer / this.CYCLE_DURATION) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      this.currentLightOffset.lerpVectors(this.moonOffset, this.sunOffset, t);

      // Smooth color transitions
      const daySunColor = new THREE.Color(0xffedd5);
      const nightMoonColor = new THREE.Color(0xa5cbf5);
      this.dirLight.color.copy(nightMoonColor).lerp(daySunColor, t);
      this.dirLight.intensity = THREE.MathUtils.lerp(1.20, 1.45, t);

      const dayAmb = new THREE.Color(0x8a5530);
      const nightAmb = new THREE.Color(0x2b3d63);
      this.ambientLight.color.copy(nightAmb).lerp(dayAmb, t);

      const dayHemiSky = new THREE.Color(0xfb923c);
      const nightHemiSky = new THREE.Color(0x38bdf8);
      this.hemiLight.color.copy(nightHemiSky).lerp(dayHemiSky, t);

      const dayHemiGnd = new THREE.Color(0x241209);
      const nightHemiGnd = new THREE.Color(0x111827);
      this.hemiLight.groundColor.copy(nightHemiGnd).lerp(dayHemiGnd, t);

      const dayBg = new THREE.Color(0x23140e);
      const nightBg = new THREE.Color(0x0c1322);
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.copy(nightBg).lerp(dayBg, t);
      }
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.copy(nightBg).lerp(dayBg, t);
      }
    }

    // Keep sun/moon & shadow camera aligned with player position
    if (this.dirLight) {
      this.dirLight.position.set(
        playerPos.x + this.currentLightOffset.x,
        playerPos.y + this.currentLightOffset.y,
        playerPos.z + this.currentLightOffset.z
      );
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
