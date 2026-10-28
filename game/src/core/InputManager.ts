import { Vector3, Vector2, Raycaster, Plane, type Camera } from 'three';
import { InputBuffer } from './InputBuffer';

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  public moveDirection = new Vector3();
  public mouseWorldPosition = new Vector3();
  private raycaster = new Raycaster();
  private mouse = new Vector2();
  private groundPlane = new Plane(new Vector3(0, 1, 0), 0);

  public onTogglePause?: () => void;
  public onToggleDevMode?: () => void;
  public onToggleMap?: () => void;
  public onToggleDebugHud?: () => void;
  public onToggleInventory?: () => void;
  public onToggleDpsMeter?: () => void;
  public onInteract?: () => void;
  public onDash?: () => void;
  public onTeleportToRift?: () => void;
  public onToggleAimMode?: () => void;

  constructor() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  private onKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    this.keys[e.code] = true;
    const inputBuffer = InputBuffer.getInstance();

    if (e.code === 'KeyE' || e.code === 'KeyF') {
      inputBuffer.queueAction('interact');
      if (this.onInteract) {
        this.onInteract();
      }
    }

    if (e.code === 'KeyT') {
      inputBuffer.queueAction('teleport_to_rift');
      if (this.onTeleportToRift) {
        this.onTeleportToRift();
      }
    }

    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      inputBuffer.queueAction('dash');
      if (this.onDash) {
        this.onDash();
      }
    }

    if (e.code === 'KeyZ') {
      if (this.onToggleAimMode) {
        this.onToggleAimMode();
      }
    }

    if (e.code === 'KeyI' || e.code === 'KeyC') {
      inputBuffer.queueAction('toggle_inventory');
      if (this.onToggleInventory) {
        this.onToggleInventory();
      }
    }

    if (e.code === 'F3' || e.key === 'F3') {
      e.preventDefault();
      inputBuffer.queueAction('toggle_debug_hud');
      if (this.onToggleDebugHud) {
        this.onToggleDebugHud();
      }
      return;
    }

    if (e.code === 'Tab' || e.key === 'Tab') {
      e.preventDefault();
      inputBuffer.queueAction('toggle_map');
      if (this.onToggleMap) {
        this.onToggleMap();
      }
      return;
    }

    if (e.code === 'Escape') {
      inputBuffer.queueAction('toggle_pause');
      if (this.onTogglePause) {
        this.onTogglePause();
      }
    }

    if (e.code === 'KeyQ') {
      inputBuffer.queueAction('toggle_dps_meter');
      if (this.onToggleDpsMeter) {
        this.onToggleDpsMeter();
      }
    }

    if (e.code === 'KeyP') {
      inputBuffer.queueAction('toggle_dev_mode');
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

  public update(camera: Camera) {
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

    const inputBuffer = InputBuffer.getInstance();
    inputBuffer.setMoveVector(this.moveDirection.x, this.moveDirection.z);
    inputBuffer.setAimPosition(this.mouseWorldPosition.x, this.mouseWorldPosition.z);
  }
  public isKeyDown(code: string): boolean {
    return !!this.keys[code];
  }

  public isInteractHeld(): boolean {
    return !!(this.keys['KeyE'] || this.keys['KeyF']);
  }
}
