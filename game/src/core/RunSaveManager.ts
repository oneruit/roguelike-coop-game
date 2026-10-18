import type { CharacterType } from '../shared/types';
import type { WeaponGrade } from '../combat/WeaponGrades';

export const RUN_SAVE_KEY = 'rift_active_run_save';

export interface SavedWeaponData {
  id: string;
  level: number;
  awakenedGrade: number;
  bonusDamage: number;
  cooldownBonus: number;
  upgradeHistory: WeaponGrade[];
}

export interface SavedRunData {
  version: number;
  timestamp: number;
  heroId: CharacterType;
  stageNumber: number;
  seed: number;
  playerPosition?: { x: number; y: number; z: number };
  gameTime: number;
  stageTime: number;
  kills: number;
  credits: number;
  playerHp: number;
  playerMaxHp: number;
  playerLevel: number;
  playerXp: number;
  playerXpToNext: number;
  passives: {
    mightElixirCount: number;
    speedBootsCount: number;
    flaskCount: number;
    magnetCount: number;
    amuletCount: number;
    vestCount: number;
    watchCount: number;
    amplifierCount: number;
  };
  riftItems: Record<string, number>;
  weapons: SavedWeaponData[];
}

export class RunSaveManager {
  public static hasSavedRun(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      const raw = window.localStorage.getItem(RUN_SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed && parsed.heroId && parsed.stageNumber);
    } catch {
      return false;
    }
  }

  public static getSavedRunInfo(): { heroId: CharacterType; stageNumber: number; gameTime: number; timestamp: number } | null {
    if (!this.hasSavedRun()) return null;
    try {
      const raw = window.localStorage.getItem(RUN_SAVE_KEY);
      if (!raw) return null;
      const data: SavedRunData = JSON.parse(raw);
      return {
        heroId: data.heroId,
        stageNumber: data.stageNumber,
        gameTime: data.gameTime,
        timestamp: data.timestamp
      };
    } catch {
      return null;
    }
  }

  public static saveRun(data: SavedRunData): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      window.localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('[RunSaveManager] Failed to save run:', e);
      return false;
    }
  }

  public static loadRun(): SavedRunData | null {
    if (!this.hasSavedRun()) return null;
    try {
      const raw = window.localStorage.getItem(RUN_SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SavedRunData;
    } catch (e) {
      console.warn('[RunSaveManager] Failed to load saved run:', e);
      return null;
    }
  }

  public static clearSavedRun(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(RUN_SAVE_KEY);
    } catch {
      // ignore
    }
  }
}
