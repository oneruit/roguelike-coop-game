import type { CharacterType } from '../shared/types';

export const LAST_RUN_STORAGE_KEY = 'rift_last_run_summary';

export interface LastRunWeaponData {
  id: string;
  name: string;
  level: number;
  damageDealt: number;
  awakenedGrade?: number;
  icon?: string;
}

export interface LastRunPlayerData {
  name: string;
  charType: CharacterType;
  kills: number;
  damageDealt: number;
  colorCss: string;
  isLocal?: boolean;
}

export interface LastRunData {
  version: number;
  timestamp: number;
  dateFormatted: string;
  isVictory: boolean;
  stageNumber: number;
  biomeName: string;
  seed: number;
  gameTime: number;
  timeFormatted: string;
  heroId: CharacterType;
  heroLevel: number;
  kills: number;
  damageDealt: number;
  creditsEarned: number;
  chestsOpened: number;
  killer?: {
    name: string;
    damage: number;
  };
  weapons: LastRunWeaponData[];
  isCoop: boolean;
  coopPlayers?: LastRunPlayerData[];
}

export class LastRunManager {
  private static readonly CURRENT_VERSION = 1;

  public static hasLastRun(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      const raw = window.localStorage.getItem(LAST_RUN_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed && parsed.heroId && parsed.timestamp);
    } catch {
      return false;
    }
  }

  public static getLastRun(): LastRunData | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(LAST_RUN_STORAGE_KEY);
      if (!raw) return null;
      const parsed: LastRunData = JSON.parse(raw);
      if (!parsed || !parsed.heroId) return null;
      return parsed;
    } catch (err) {
      console.warn('[LastRunManager] Failed to parse last run data:', err);
      return null;
    }
  }

  public static saveLastRun(runData: Omit<LastRunData, 'version'>): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const payload: LastRunData = {
        ...runData,
        version: LastRunManager.CURRENT_VERSION
      };
      window.localStorage.setItem(LAST_RUN_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[LastRunManager] Failed to save last run data:', err);
    }
  }

  public static clearLastRun(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(LAST_RUN_STORAGE_KEY);
    } catch (err) {
      console.warn('[LastRunManager] Failed to clear last run data:', err);
    }
  }

  public static formatDate(timestamp: number): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }
}
