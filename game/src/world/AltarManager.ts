import { type Scene, Sphere, Vector3, type Camera, type Frustum } from 'three';
import { Altar } from './Altar';
import { Player, ActiveBuff } from '../entities/Player';

export class AltarManager {
  private scene: Scene;
  public altars: Altar[] = [];
  public onAltarCaptured?: (altar: Altar, buff: ActiveBuff) => void;
  public isDeclarative = false;
  private altarListeners = new Set<(action: 'add' | 'remove' | 'reset', altar?: Altar) => void>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public addAltarListener(listener: (action: 'add' | 'remove' | 'reset', altar?: Altar) => void): () => void {
    this.altarListeners.add(listener);
    return () => this.altarListeners.delete(listener);
  }

  public setDeclarative(declarative: boolean): void {
    if (this.isDeclarative === declarative) return;
    this.isDeclarative = declarative;
    if (declarative) {
      for (const altar of this.altars) {
        this.scene.remove(altar.mesh);
      }
    } else {
      for (const altar of this.altars) {
        this.scene.add(altar.mesh);
      }
    }
  }

  public registerAltar(altar: Altar) {
    altar.onCaptured = (a, buff) => {
      if (this.onAltarCaptured) {
        this.onAltarCaptured(a, buff);
      }
    };
    this.altars.push(altar);
    if (!this.isDeclarative) {
      this.scene.add(altar.mesh);
    }
    for (const listener of this.altarListeners) {
      listener('add', altar);
    }
  }

  public unregisterAltar(altar: Altar) {
    const idx = this.altars.indexOf(altar);
    if (idx !== -1) {
      this.altars.splice(idx, 1);
      if (!this.isDeclarative) {
        altar.destroy(this.scene);
      }
      for (const listener of this.altarListeners) {
        listener('remove', altar);
      }
    }
  }

  private tempSphere = new Sphere();

  public updateSimulation(
    dt: number,
    player: Player,
    partnerPos?: Vector3,
    isPartnerAlive: boolean = true,
    allowCapture: boolean = true,
    allPlayers?: { position: Vector3; isAlive: boolean; isDowned?: boolean }[]
  ) {
    for (const altar of this.altars) {
      altar.updateSimulation(dt, player, partnerPos, isPartnerAlive, allowCapture, allPlayers);
    }
  }

  public updateVisuals(dt: number, camera: Camera, frustum: Frustum) {
    for (const altar of this.altars) {
      this.tempSphere.center.set(altar.position.x, 2.0, altar.position.z);
      this.tempSphere.radius = 8.0;
      const inFrustum = frustum.intersectsSphere(this.tempSphere);
      altar.updateVisuals(dt, camera, inFrustum);
    }
  }

  public update(
    dt: number,
    player: Player,
    camera: Camera,
    partnerPos?: Vector3,
    isPartnerAlive: boolean = true,
    allowCapture: boolean = true,
    allPlayers?: { position: Vector3; isAlive: boolean; isDowned?: boolean }[]
  ) {
    this.updateSimulation(dt, player, partnerPos, isPartnerAlive, allowCapture, allPlayers);
    for (const altar of this.altars) {
      altar.updateVisuals(dt, camera, true);
    }
  }

  public applyRemoteCapture(type: ActiveBuff['type']) {
    const altar = this.altars.find((candidate) => candidate.config.type === type);
    altar?.applyRemoteCapture();
  }

  public clear() {
    for (const altar of this.altars) {
      if (!this.isDeclarative) {
        altar.destroy(this.scene);
      }
    }
    this.altars = [];
    for (const listener of this.altarListeners) {
      listener('reset');
    }
  }
}
