import { useGameStore, type GameStateEnum } from './useGameStore';
import { usePlayerStore } from './usePlayerStore';
import { useUIModalStore } from './useUIModalStore';
import { UIEventBus } from '../core/UIEventBus';

export interface MinimapEntityCoord {
  x: number;
  z: number;
  type: 'enemy' | 'boss' | 'chest' | 'altar' | 'rift' | 'merchant' | 'teammate';
  color?: string;
}

export interface MinimapSnapshot {
  playerX: number;
  playerZ: number;
  entities: MinimapEntityCoord[];
}

export type MinimapListener = (snapshot: MinimapSnapshot) => void;

/**
 * GameStateBridge decouples headless game simulation from the UI stores.
 * - Routes continuous stats through throttled channels.
 * - Routes critical game events (level-up, death, game over) immediately.
 * - Provides non-React high-frequency fast-path streams for minimap rendering.
 */
export class GameStateBridge {
  private static instance: GameStateBridge | null = null;
  private minimapListeners: Set<MinimapListener> = new Set();
  private eventUnsubscribers: Array<() => void> = [];

  public static getInstance(): GameStateBridge {
    if (!GameStateBridge.instance) {
      GameStateBridge.instance = new GameStateBridge();
    }
    return GameStateBridge.instance;
  }

  public init(): void {
    this.cleanup();

    // Subscribe to UIEventBus events
    const unsubModalOpen = UIEventBus.on('modal:open', (modalId: any) => {
      useUIModalStore.getState().openModal(modalId);
    });
    this.eventUnsubscribers.push(unsubModalOpen);

    const unsubModalClose = UIEventBus.on('modal:close', (modalId: any) => {
      useUIModalStore.getState().closeModal(modalId);
    });
    this.eventUnsubscribers.push(unsubModalClose);
  }

  public cleanup(): void {
    for (const unsub of this.eventUnsubscribers) {
      unsub();
    }
    this.eventUnsubscribers = [];
    this.minimapListeners.clear();
  }

  // --- Fast Path Minimap Stream (Non-React) ---
  public subscribeMinimap(listener: MinimapListener): () => void {
    this.minimapListeners.add(listener);
    return () => this.minimapListeners.delete(listener);
  }

  public emitMinimapSnapshot(snapshot: MinimapSnapshot): void {
    for (const listener of this.minimapListeners) {
      listener(snapshot);
    }
  }

  // --- Immediate Game State Events ---
  public syncGameState(state: GameStateEnum): void {
    useGameStore.getState().setGameState(state);
  }

  public syncGameTime(time: number): void {
    useGameStore.getState().setGameTime(time);
  }

  // --- Throttled Player Stats Updates ---
  public syncPlayerVitals(hp: number, maxHp: number, shield: number, maxShield: number): void {
    const playerStore = usePlayerStore.getState();
    playerStore.setHp(hp, maxHp);
    playerStore.setShield(shield, maxShield);
  }

  public syncPlayerProgression(xp: number, maxXp: number, level: number, credits: number): void {
    const playerStore = usePlayerStore.getState();
    playerStore.setXp(xp, maxXp, level);
    playerStore.setCredits(credits);
  }

  // --- Immediate Player Events ---
  public onPlayerDeath(isVictory: boolean): void {
    usePlayerStore.getState().setAlive(false);
    useGameStore.getState().setVictory(isVictory);
    useGameStore.getState().setGameState('GAME_OVER');
    useUIModalStore.getState().openModal('game_over');
  }

  public onPlayerDowned(isDowned: boolean): void {
    usePlayerStore.getState().setDowned(isDowned);
  }

  public onDamageFlash(amount: number): void {
    usePlayerStore.getState().triggerDamageFlash(amount);
  }
}
