/**
 * Granular runtime feature flag registry and kill-switch system.
 * Supports environment defaults, localStorage persistence, and URL query overrides.
 */

export type FeatureFlagKey =
  | 'react_main_menu'
  | 'react_hud'
  | 'react_modals'
  | 'r3f_canvas'
  | 'r3f_world'
  | 'r3f_entities';

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  description: string;
  defaultValue: boolean;
}

export const FEATURE_FLAG_DEFINITIONS: Record<FeatureFlagKey, FeatureFlagDefinition> = {
  react_main_menu: {
    key: 'react_main_menu',
    description: 'Use React-based Main Menu & Auth modals instead of legacy HTML partials',
    defaultValue: false
  },
  react_hud: {
    key: 'react_hud',
    description: 'Use React-based In-Game HUD overlay instead of legacy DOM elements',
    defaultValue: false
  },
  react_modals: {
    key: 'react_modals',
    description: 'Use React-based gameplay modals (Level Up, Inventory, Shop, Quests, GameOver)',
    defaultValue: false
  },
  r3f_canvas: {
    key: 'r3f_canvas',
    description: 'Mount React Three Fiber Canvas with unified render loop instead of imperative Engine.ts',
    defaultValue: false
  },
  r3f_world: {
    key: 'r3f_world',
    description: 'Render world chunks and environment props via declarative R3F components',
    defaultValue: false
  },
  r3f_entities: {
    key: 'r3f_entities',
    description: 'Render player, remote co-op teammates, and enemies using R3F entity components',
    defaultValue: false
  }
};

const STORAGE_KEY = 'rift_feature_flags';

export class FeatureFlags {
  private static instance: FeatureFlags | null = null;
  private overrides: Map<FeatureFlagKey, boolean> = new Map();
  private listeners: Set<(key: FeatureFlagKey, value: boolean) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
    this.loadFromUrl();
  }

  /**
   * Returns singleton instance of FeatureFlags.
   */
  public static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags();
    }
    return FeatureFlags.instance;
  }

  /**
   * Resets singleton instance (useful for unit tests).
   */
  public static resetInstance(): void {
    FeatureFlags.instance = null;
  }

  /**
   * Checks if a given feature flag is enabled.
   */
  public isEnabled(key: FeatureFlagKey): boolean {
    if (this.overrides.has(key)) {
      return this.overrides.get(key)!;
    }
    return FEATURE_FLAG_DEFINITIONS[key]?.defaultValue ?? false;
  }

  /**
   * Sets a runtime override for a feature flag.
   */
  public setFlag(key: FeatureFlagKey, enabled: boolean, persist = true): void {
    this.overrides.set(key, enabled);
    if (persist) {
      this.saveToStorage();
    }
    this.notifyListeners(key, enabled);
  }

  /**
   * Clears override for a specific flag, restoring its default value.
   */
  public clearFlag(key: FeatureFlagKey): void {
    this.overrides.delete(key);
    this.saveToStorage();
    this.notifyListeners(key, this.isEnabled(key));
  }

  /**
   * Resets all flags to default values and clears persistence.
   */
  public resetToDefaults(): void {
    this.overrides.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in restricted sandbox
    }
    for (const key of Object.keys(FEATURE_FLAG_DEFINITIONS) as FeatureFlagKey[]) {
      this.notifyListeners(key, this.isEnabled(key));
    }
  }

  /**
   * Returns snapshot of all feature flag states.
   */
  public getAllFlags(): Record<FeatureFlagKey, boolean> {
    const result = {} as Record<FeatureFlagKey, boolean>;
    for (const key of Object.keys(FEATURE_FLAG_DEFINITIONS) as FeatureFlagKey[]) {
      result[key] = this.isEnabled(key);
    }
    return result;
  }

  /**
   * Subscribes to feature flag change events.
   */
  public addListener(listener: (key: FeatureFlagKey, value: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(key: FeatureFlagKey, value: boolean): void {
    for (const listener of this.listeners) {
      try {
        listener(key, value);
      } catch (err) {
        console.warn(`[FeatureFlags] Listener error for flag ${key}:`, err);
      }
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [key, val] of Object.entries(parsed)) {
          if (key in FEATURE_FLAG_DEFINITIONS && typeof val === 'boolean') {
            this.overrides.set(key as FeatureFlagKey, val);
          }
        }
      }
    } catch {
      // Ignore parse or access issues
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const data: Record<string, boolean> = {};
      for (const [key, val] of this.overrides.entries()) {
        data[key] = val;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore write issues
    }
  }

  private loadFromUrl(): void {
    try {
      if (typeof window === 'undefined' || !window.location || !window.location.search) return;
      const params = new URLSearchParams(window.location.search);

      // Support ?flags=react_hud,react_modals
      const commaSeparated = params.get('flags');
      if (commaSeparated) {
        if (commaSeparated === 'all' || commaSeparated === '1' || commaSeparated === 'true') {
          for (const key of Object.keys(FEATURE_FLAG_DEFINITIONS) as FeatureFlagKey[]) {
            this.overrides.set(key, true);
          }
        } else {
          const requested = commaSeparated.split(',').map((s) => s.trim());
          for (const flag of requested) {
            if (flag in FEATURE_FLAG_DEFINITIONS) {
              this.overrides.set(flag as FeatureFlagKey, true);
            }
          }
        }
      }

      // Support individual query flags ?react_hud=true or ?react_hud=1
      for (const key of Object.keys(FEATURE_FLAG_DEFINITIONS) as FeatureFlagKey[]) {
        if (params.has(key)) {
          const val = params.get(key);
          const enabled = val === '1' || val === 'true' || val === '';
          this.overrides.set(key, enabled);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }
}
