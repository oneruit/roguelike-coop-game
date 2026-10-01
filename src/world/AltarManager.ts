import * as THREE from 'three';
import { Altar } from './Altar';
import { Player, ActiveBuff } from '../entities/Player';

export class AltarManager {
  private scene: THREE.Scene;
  public altars: Altar[] = [];
  public onAltarCaptured?: (altar: Altar, buff: ActiveBuff) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public registerAltar(altar: Altar) {
    altar.onCaptured = (a, buff) => {
      if (this.onAltarCaptured) {
        this.onAltarCaptured(a, buff);
      }
    };
    this.altars.push(altar);
    this.scene.add(altar.mesh);
  }

  public unregisterAltar(altar: Altar) {
    const idx = this.altars.indexOf(altar);
    if (idx !== -1) {
      this.altars.splice(idx, 1);
      altar.destroy(this.scene);
    }
  }

  public update(
    dt: number,
    player: Player,
    camera: THREE.Camera,
    partnerPos?: THREE.Vector3,
    isPartnerAlive: boolean = true,
    allowCapture: boolean = true,
    allPlayers?: { position: THREE.Vector3; isAlive: boolean; isDowned?: boolean }[]
  ) {
    for (const altar of this.altars) {
      altar.update(dt, player, camera, partnerPos, isPartnerAlive, allowCapture, allPlayers);
    }
  }

  public applyRemoteCapture(type: ActiveBuff['type']) {
    const altar = this.altars.find((candidate) => candidate.config.type === type);
    altar?.applyRemoteCapture();
  }

  public clear() {
    for (const altar of this.altars) {
      altar.destroy(this.scene);
    }
    this.altars = [];
  }
}
