export type UIEventListener<T = any> = (payload: T) => void;

/**
 * Lightweight, zero-dependency UI Event Bus for decoupled cross-module communication.
 */
export class UIEventBus {
  private static listeners: Map<string, Set<UIEventListener>> = new Map();

  public static on<T = any>(event: string, listener: UIEventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  public static off<T = any>(event: string, listener: UIEventListener<T>): void {
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
        console.error(`[UIEventBus] Error in event listener for "${event}":`, err);
      }
    });
  }

  public static clear(): void {
    this.listeners.clear();
  }
}
