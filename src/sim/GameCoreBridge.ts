import { GameCore } from './GameCore';
import { SimPlayerInput, SimEvent, SimSnapshot, CharacterType } from './types';
import { SimVec3 } from './math/SimVector';

export type SimMode = 'local_host' | 'dedicated_client';

export interface GameCoreBridgeOptions {
  seed?: number;
  isCoop?: boolean;
  tickRate?: number;
  onEvent?: (event: SimEvent) => void;
}

/**
 * GameCoreBridge
 *
 * Bridges the headless authoritative GameCore simulation with the client presentation layer.
 *
 * - When running in 'local_host' (Solo or Peer-to-Peer Co-op Host):
 *   Runs GameCore locally in browser, updates simulation at desired tick rate, and provides
 *   authoritative snapshots to broadcast to remote clients.
 *
 * - When running in 'dedicated_client':
 *   Relays player inputs to the remote dedicated server via WebSocket/WebRTC, and consumes
 *   server snapshots.
 */
export class GameCoreBridge {
  public mode: SimMode = 'local_host';
  public core: GameCore | null = null;
  public onEvent?: (event: SimEvent) => void;

  constructor(options: GameCoreBridgeOptions = {}) {
    this.onEvent = options.onEvent;
    this.core = new GameCore({
      seed: options.seed ?? 1337,
      isCoop: options.isCoop ?? false,
      tickRate: options.tickRate ?? 30
    });
  }

  public initLocalHost(localPlayerId: string = 'host', charType: CharacterType = 'ronin', isCoop: boolean = false) {
    this.mode = 'local_host';
    this.core = new GameCore({
      seed: Math.floor(Math.random() * 100000),
      isCoop,
      tickRate: 30
    });
    this.core.addPlayer(localPlayerId, charType, new SimVec3(0, 0, 0));
  }

  public addRemotePlayer(id: string, charType: CharacterType) {
    if (this.core) {
      this.core.addPlayer(id, charType);
    }
  }

  public removeRemotePlayer(id: string) {
    if (this.core) {
      this.core.removePlayer(id);
    }
  }

  public sendInput(playerId: string, input: SimPlayerInput) {
    if (this.core) {
      this.core.setPlayerInput(playerId, input);
    }
  }

  public selectUpgrade(playerId: string, weaponId: string) {
    if (this.core) {
      this.core.upgradePlayerWeapon(playerId, weaponId);
    }
  }

  public revivePlayer(reviverId: string, targetId: string) {
    if (this.core) {
      this.core.revivePlayer(reviverId, targetId);
    }
  }

  public step(dt: number): { events: SimEvent[]; snapshot: SimSnapshot | null } {
    if (this.core && this.mode === 'local_host') {
      const events = this.core.tick(dt);
      if (this.onEvent) {
        for (const ev of events) {
          this.onEvent(ev);
        }
      }
      const snapshot = this.core.getSnapshot();
      return { events, snapshot };
    }

    return { events: [], snapshot: null };
  }

  public getSnapshot(): SimSnapshot | null {
    return this.core ? this.core.getSnapshot() : null;
  }
}
