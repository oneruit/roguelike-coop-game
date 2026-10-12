import * as THREE from 'three';
import { PuppetRig, AnimStateName } from './PuppetRig';

class PuppetDemoApp {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private rig!: PuppetRig;

  private canvas!: HTMLCanvasElement;
  private isPaused: boolean = false;
  private clock: THREE.Clock = new THREE.Clock();

  // Camera pan & zoom state
  private zoomLevel: number = 100; // pixels per unit
  private cameraTarget: THREE.Vector2 = new THREE.Vector2(0, 1.2);
  private isDragging: boolean = false;
  private lastMousePos: THREE.Vector2 = new THREE.Vector2();

  constructor() {
    this.canvas = document.getElementById('viewport-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.initThree();
    this.initSceneObjects();
    this.initEventListeners();
    this.initUI();
    this.animate();
  }

  private initThree(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.scene = new THREE.Scene();

    // Ортографическая камера для идеального пиксель-арта без перспективных искажений
    const aspect = width / height;
    const frustumSize = 4.5;
    this.camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    this.camera.position.set(this.cameraTarget.x, this.cameraTarget.y, 10);
    this.camera.lookAt(this.cameraTarget.x, this.cameraTarget.y, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private initSceneObjects(): void {
    // Мягкий свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    // Подставка / Магический пьедестал
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, 0, -0.05);

    // Внутренний круг пьедестала
    const circleGeom = new THREE.CircleGeometry(1.6, 64);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.8
    });
    const pedestalCircle = new THREE.Mesh(circleGeom, circleMat);
    pedestalCircle.rotation.x = -Math.PI * 0.35; // наклон в стиле 2.5D
    pedestalGroup.add(pedestalCircle);

    // Светящееся кольцо пьедестала
    const ringGeom = new THREE.RingGeometry(1.55, 1.62, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = -Math.PI * 0.35;
    pedestalGroup.add(ringMesh);

    // Тень под персонажем
    const shadowGeom = new THREE.CircleGeometry(0.75, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45
    });
    const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    shadowMesh.scale.set(1.2, 0.45, 1);
    shadowMesh.position.set(0, 0.1, -0.02);
    pedestalGroup.add(shadowMesh);

    this.scene.add(pedestalGroup);

    // Загрузка рига персонажа
    this.rig = new PuppetRig();
    this.rig.root.position.set(0, 1.6, 0); // высота персонажа над подставкой
    this.scene.add(this.rig.root);
  }

  private initEventListeners(): void {
    // Вращение / Панорамирование камеры мышью
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.button === 2 || e.shiftKey) {
        // Панорамирование
        this.isDragging = true;
        this.lastMousePos.set(e.clientX, e.clientY);
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = (e.clientX - this.lastMousePos.x) / this.zoomLevel;
        const dy = (e.clientY - this.lastMousePos.y) / this.zoomLevel;
        this.cameraTarget.x -= dx * 0.05;
        this.cameraTarget.y += dy * 0.05;
        this.camera.position.x = this.cameraTarget.x;
        this.camera.position.y = this.cameraTarget.y;
        this.lastMousePos.set(e.clientX, e.clientY);
      }

      // Передаем координаты мыши в риг для Mouse Aiming
      if (this.rig && this.rig.mouseAimEnabled) {
        const rect = this.canvas.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const rayPos = new THREE.Vector3(normX, normY, 0).unproject(this.camera);
        this.rig.targetAimPos.set(rayPos.x, rayPos.y);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Зум колесиком
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      this.camera.zoom = Math.max(0.4, Math.min(6.0, this.camera.zoom * zoomFactor));
      this.camera.updateProjectionMatrix();
    });
  }

  private initUI(): void {
    // Кнопки анимаций
    const stateBtns = document.querySelectorAll<HTMLButtonElement>('.btn-state');
    stateBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const anim = btn.dataset.anim as AnimStateName;
        if (!anim) return;

        stateBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        this.rig.setAnimation(anim);
      });
    });

    // Скорость анимации
    const speedSlider = document.getElementById('slider-speed') as HTMLInputElement;
    const speedVal = document.getElementById('val-speed');
    if (speedSlider && speedVal) {
      speedSlider.addEventListener('input', () => {
        const val = parseFloat(speedSlider.value);
        this.rig.animSpeed = val;
        speedVal.textContent = `${val.toFixed(1)}x`;
      });
    }

    // Глубина дыхания
    const breathSlider = document.getElementById('slider-breath') as HTMLInputElement;
    const breathVal = document.getElementById('val-breath');
    if (breathSlider && breathVal) {
      breathSlider.addEventListener('input', () => {
        const val = parseFloat(breathSlider.value);
        this.rig.breathingDepth = val;
        breathVal.textContent = `${val.toFixed(1)}x`;
      });
    }

    // Ширина шага
    const stepSlider = document.getElementById('slider-step') as HTMLInputElement;
    const stepVal = document.getElementById('val-step');
    if (stepSlider && stepVal) {
      stepSlider.addEventListener('input', () => {
        const val = parseFloat(stepSlider.value);
        this.rig.stepAmplitude = val;
        stepVal.textContent = `${val.toFixed(1)}x`;
      });
    }

    // Жесткость волос
    const hairSlider = document.getElementById('slider-hair') as HTMLInputElement;
    const hairVal = document.getElementById('val-hair');
    if (hairSlider && hairVal) {
      hairSlider.addEventListener('input', () => {
        const val = parseFloat(hairSlider.value);
        this.rig.hairSpringStiffness = val;
        hairVal.textContent = `${val.toFixed(0)}`;
      });
    }

    // Разборка на части (Exploded View)
    const explodeSlider = document.getElementById('slider-explode') as HTMLInputElement;
    const explodeVal = document.getElementById('val-explode');
    if (explodeSlider && explodeVal) {
      explodeSlider.addEventListener('input', () => {
        const val = parseFloat(explodeSlider.value);
        this.rig.explodeFactor = val;
        explodeVal.textContent = `${Math.round(val * 100)}%`;
      });
    }

    // Mouse Aiming IK Toggle
    const aimToggle = document.getElementById('toggle-aim') as HTMLInputElement;
    if (aimToggle) {
      aimToggle.addEventListener('change', () => {
        this.rig.mouseAimEnabled = aimToggle.checked;
      });
    }

    // Debug Rig Toggle
    const debugToggle = document.getElementById('toggle-debug') as HTMLInputElement;
    if (debugToggle) {
      debugToggle.addEventListener('change', () => {
        this.rig.toggleDebugRig(debugToggle.checked);
      });
    }

    // Выбор орба магии
    const orbPills = document.querySelectorAll<HTMLDivElement>('.orb-pill');
    orbPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        orbPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const orbType = pill.dataset.orb as 'purple' | 'cyan' | 'both' | 'none';
        if (orbType) this.rig.activeOrb = orbType;
      });
    });

    // Пауза / Воспроизведение
    const pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement;
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        pauseBtn.textContent = this.isPaused ? '▶ Возобновить' : '⏸ Пауза';
        pauseBtn.classList.toggle('active', this.isPaused);
      });
    }

    // Сброс камеры
    const resetCamBtn = document.getElementById('btn-reset-cam') as HTMLButtonElement;
    if (resetCamBtn) {
      resetCamBtn.addEventListener('click', () => {
        this.cameraTarget.set(0, 1.2);
        this.camera.position.set(0, 1.2, 10);
        this.camera.zoom = 1.0;
        this.camera.updateProjectionMatrix();
      });
    }
  }

  private onWindowResize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const aspect = width / height;
    const frustumSize = 4.5;

    this.camera.left = (-frustumSize * aspect) / 2;
    this.camera.right = (frustumSize * aspect) / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (!this.isPaused && this.rig) {
      this.rig.update(dt);

      // Если текущая анимация вернулась в IDLE после ван-шота (ATTACK, CAST, HIT)
      const activeBtn = document.querySelector<HTMLButtonElement>('.btn-state.active');
      if (activeBtn && activeBtn.dataset.anim !== this.rig.currentAnim) {
        const newBtn = document.querySelector<HTMLButtonElement>(`.btn-state[data-anim="${this.rig.currentAnim}"]`);
        if (newBtn) {
          document.querySelectorAll('.btn-state').forEach((b) => b.classList.remove('active'));
          newBtn.classList.add('active');
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  };
}

// Запуск при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
  new PuppetDemoApp();
});
