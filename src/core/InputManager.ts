import * as THREE from 'three';

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  public moveDirection = new THREE.Vector3();
  public mouseWorldPosition = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  public onTogglePause?: () => void;
  public onToggleDevMode?: () => void;
  public onToggleMap?: () => void;
  public onToggleDebugHud?: () => void;
  public onInteract?: () => void;
  public onDash?: () => void;

  constructor() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys[e.code] = true;

    if (e.code === 'KeyE' || e.code === 'KeyF') {
      if (this.onInteract) {
        this.onInteract();
      }
    }

    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (this.onDash) {
        this.onDash();
      }
    }

    if (e.code === 'F3' || e.key === 'F3') {
      e.preventDefault();
      if (this.onToggleDebugHud) {
        this.onToggleDebugHud();
      }
      return;
    }

    if (e.code === 'Tab') {
      e.preventDefault();
      if (this.onToggleMap) {
        this.onToggleMap();
      }
      return;
    }

    if (e.code === 'Escape') {
      if (this.onTogglePause) {
        this.onTogglePause();
      }
    }

    if (e.code === 'KeyP') {
      if (this.onToggleDevMode) {
        this.onToggleDevMode();
      }
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
  }

  private onMouseMove(e: MouseEvent) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  public update(camera: THREE.Camera) {
    let dx = 0;
    let dz = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) dz -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dz += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    this.moveDirection.set(dx, 0, dz);
    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
    }

    this.raycaster.setFromCamera(this.mouse, camera);
    this.raycaster.ray.intersectPlane(this.groundPlane, this.mouseWorldPosition);
  }
}
