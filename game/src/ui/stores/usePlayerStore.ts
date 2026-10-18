import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface WeaponSlotData {
  id: string;
  name: string;
  level: number;
  icon?: string;
  rarity?: string;
}

export interface ActiveBuffData {
  id: string;
  name: string;
  duration: number;
  maxDuration: number;
  icon?: string;
}

export interface ActiveBossData {
  name: string;
  tier: string | number;
  hp: number;
  maxHp: number;
  hpPercent: number;
}

export interface PlayerStoreState {
  // Continuous throttled stats (10-20 Hz updates)
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  xp: number;
  maxXp: number;
  level: number;
  credits: number;
  kills: number;
  charType: string;

  // Immediate discrete states (0 ms latency)
  isAlive: boolean;
  isDowned: boolean;
  damageFlashAmount: number;
  interactionPrompt: string | null;
  activeBoss: ActiveBossData | null;
  weapons: WeaponSlotData[];
  activeBuffs: ActiveBuffData[];

  // Continuous setters (batched/throttled)
  setHp: (hp: number, maxHp: number) => void;
  setShield: (shield: number, maxShield: number) => void;
  setXp: (xp: number, maxXp: number, level: number) => void;
  setCredits: (credits: number) => void;
  setKills: (kills: number) => void;
  setCharType: (charType: string) => void;

  // Immediate discrete setters
  setAlive: (isAlive: boolean) => void;
  setDowned: (isDowned: boolean) => void;
  triggerDamageFlash: (amount: number) => void;
  setInteractionPrompt: (prompt: string | null) => void;
  setActiveBoss: (boss: ActiveBossData | null) => void;
  setWeapons: (weapons: WeaponSlotData[]) => void;
  setActiveBuffs: (buffs: ActiveBuffData[]) => void;

  // Reset
  resetPlayerStats: () => void;
}

/**
 * Throttler helper to limit high-frequency state updates to ~15 Hz (66ms).
 */
class ThrottledUpdateBuffer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: Partial<PlayerStoreState> = {};
  private readonly intervalMs = 66; // ~15 Hz

  public queue(partial: Partial<PlayerStoreState>, apply: (state: Partial<PlayerStoreState>) => void) {
    Object.assign(this.pending, partial);
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null;
        const toApply = { ...this.pending };
        this.pending = {};
        apply(toApply);
      }, this.intervalMs);
    }
  }

  public flush(apply: (state: Partial<PlayerStoreState>) => void) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (Object.keys(this.pending).length > 0) {
      const toApply = { ...this.pending };
      this.pending = {};
      apply(toApply);
    }
  }
}

const throttler = new ThrottledUpdateBuffer();

/**
 * Player store featuring dual-frequency updates:
 * - Continuous meters (HP, shields, XP, credits) are throttled at 15 Hz to prevent React re-render thrashing.
 * - Discrete events (death, boss spawns, level-up, damage flash) update with 0ms latency.
 */
export const usePlayerStore = create<PlayerStoreState>()(
  subscribeWithSelector((set) => ({
    hp: 100,
    maxHp: 100,
    shield: 0,
    maxShield: 0,
    xp: 0,
    maxXp: 100,
    level: 1,
    credits: 0,
    kills: 0,
    charType: 'ronin',

    isAlive: true,
    isDowned: false,
    damageFlashAmount: 0,
    interactionPrompt: null,
    activeBoss: null,
    weapons: [],
    activeBuffs: [],

    setHp: (hp, maxHp) => throttler.queue({ hp, maxHp }, set),
    setShield: (shield, maxShield) => throttler.queue({ shield, maxShield }, set),
    setXp: (xp, maxXp, level) => throttler.queue({ xp, maxXp, level }, set),
    setCredits: (credits) => throttler.queue({ credits }, set),
    setKills: (kills) => throttler.queue({ kills }, set),
    setCharType: (charType) => set({ charType }),

    setAlive: (isAlive) => {
      throttler.flush(set);
      set({ isAlive });
    },
    setDowned: (isDowned) => {
      throttler.flush(set);
      set({ isDowned });
    },
    triggerDamageFlash: (amount) => set({ damageFlashAmount: amount }),
    setInteractionPrompt: (prompt) => set({ interactionPrompt: prompt }),
    setActiveBoss: (boss) => set({ activeBoss: boss }),
    setWeapons: (weapons) => set({ weapons }),
    setActiveBuffs: (buffs) => set({ activeBuffs: buffs }),

    resetPlayerStats: () => {
      throttler.flush(set);
      set({
        hp: 100,
        maxHp: 100,
        shield: 0,
        maxShield: 0,
        xp: 0,
        maxXp: 100,
        level: 1,
        credits: 0,
        kills: 0,
        isAlive: true,
        isDowned: false,
        damageFlashAmount: 0,
        interactionPrompt: null,
        activeBoss: null,
        weapons: [],
        activeBuffs: []
      });
    }
  }))
);
