export type GameEventListener<T = any> = (payload: T) => void;

export interface PlayerDamagePayload {
  currentHp: number;
  maxHp: number;
  damage: number;
  isLocal: boolean;
}

export interface PlayerHealPayload {
  currentHp: number;
  maxHp: number;
  amount: number;
  isLocal: boolean;
}

export interface PlayerLevelUpPayload {
  newLevel: number;
  levelsGained: number;
  isLocal: boolean;
}

export interface PlayerXpPayload {
  xp: number;
  xpToNextLevel: number;
  level: number;
}

export interface PlayerDeathPayload {
  isLocal: boolean;
  kills: number;
  damageDealt: number;
}

export interface BossSpawnPayload {
  name: string;
  maxHp: number;
}

export interface BossHpPayload {
  currentHp: number;
  maxHp: number;
  name?: string;
}

export interface AltarNotificationPayload {
  name: string;
  subtitle: string;
  icon: string;
  color: string;
}

/**
 * High-performance, decoupled event bus for gameplay systems and UI synchronization.
 * Breaks tight coupling between game entities (Player, Enemies, World) and UI screens.
 */
export class GameEventBus {
  private static listeners: Map<string, Set<GameEventListener>> = new Map();

  public static on<T = any>(event: string, listener: GameEventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  public static off<T = any>(event: string, listener: GameEventListener<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public static emit<T = any>(event: string, payload?: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error(`[GameEventBus] Error in listener for event "${event}":`, err);
      }
    });
  }

  public static clear(): void {
    this.listeners.clear();
  }
}
