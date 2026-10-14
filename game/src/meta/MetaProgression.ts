export type MetaBranchId = 'offense' | 'defense' | 'utility';

export interface MetaBranchTierInfo {
  tier: number;
  cost: number;
  title: string;
  description: string;
}

export interface MetaBranchDef {
  id: MetaBranchId;
  name: string;
  icon: string;
  color: string;
  themeClass: string;
  description: string;
  maxTier: number;
  tiers: MetaBranchTierInfo[];
}

export interface MetaBonuses {
  damageMultiplierBonus: number; // e.g. 0.30 for +30%
  critChanceBonus: number;       // e.g. 0.10 for +10%
  critDamageMultBonus: number;   // e.g. 0.35 for +35%
  cooldownReductionBonus: number;// e.g. 0.06 for -6% CD
  maxHpBonus: number;            // e.g. 100 for +100 HP
  damageReductionBonus: number;  // e.g. 0.10 for -10% damage taken
  hpRegenBonus: number;          // e.g. 3.5 for +3.5 HP/s
  speedMultiplierBonus: number;  // e.g. 0.20 for +20% movement speed
  pickupRadiusBonus: number;     // e.g. 5.0 for +5m pickup radius
  crystalDropBonus: number;      // e.g. 0.30 for +30% crystal drop rate
}

export interface MetaProgressionSave {
  version: number;
  crystals: number;
  lifetimeCrystals: number;
  upgrades: Record<MetaBranchId, number>;
}

export const UPGRADE_TIER_COSTS: readonly number[] = [
  10, 25, 50, 80, 120, 180, 260, 360, 500, 700
] as const;

export const META_BRANCHES: Record<MetaBranchId, MetaBranchDef> = {
  offense: {
    id: 'offense',
    name: 'Ветка Могущества',
    icon: '⚔️',
    color: '#f59e0b',
    themeClass: 'branch-offense',
    description: 'Усиливает общий урон, шанс и силу критического удара, а также ускоряет перезарядку всего арсенала.',
    maxTier: 10,
    tiers: [
      { tier: 1, cost: 10, title: 'Заточка лезвий I', description: '+3% к общему урону всех оружий' },
      { tier: 2, cost: 25, title: 'Заточка лезвий II', description: '+6% к общему урону всех оружий' },
      { tier: 3, cost: 50, title: 'Точный прицел I', description: '+9% к общему урону, +1% к шансу критического удара' },
      { tier: 4, cost: 80, title: 'Точный прицел II', description: '+12% к общему урону, +2% к шансу критического удара' },
      { tier: 5, cost: 120, title: 'Гневливый раскол I', description: '+15% к урону, +3% шанс крита, +5% крит. урона' },
      { tier: 6, cost: 180, title: 'Гневливый раскол II', description: '+18% к урону, +4% шанс крита, +10% крит. урона' },
      { tier: 7, cost: 260, title: 'Гневливый раскол III', description: '+21% к урону, +5% шанс крита, +15% крит. урона' },
      { tier: 8, cost: 360, title: 'Жнец Разлома I', description: '+24% к урону, +6% шанс крита, +20% крит. урона, -2% КД' },
      { tier: 9, cost: 500, title: 'Жнец Разлома II', description: '+27% к урону, +7% шанс крита, +25% крит. урона, -4% КД' },
      { tier: 10, cost: 700, title: 'Триумф Могущества', description: '+30% к урону, +10% шанс крита, +35% крит. урона, -6% КД' }
    ]
  },
  defense: {
    id: 'defense',
    name: 'Ветка Стойкости',
    icon: '🛡️',
    color: '#10b981',
    themeClass: 'branch-defense',
    description: 'Увеличивает запас здоровья, пассивную регенерацию и снижает весь входящий урон.',
    maxTier: 10,
    tiers: [
      { tier: 1, cost: 10, title: 'Закалка I', description: '+10 к максимальному HP, -1% получаемого урона' },
      { tier: 2, cost: 25, title: 'Закалка II', description: '+20 к максимальному HP, -2% получаемого урона' },
      { tier: 3, cost: 50, title: 'Живительная кровь I', description: '+30 к HP, -3% урона, +0.3 HP/сек регенерации' },
      { tier: 4, cost: 80, title: 'Живительная кровь II', description: '+40 к HP, -4% урона, +0.6 HP/сек регенерации' },
      { tier: 5, cost: 120, title: 'Каменная кожа I', description: '+50 к HP, -5% урона, +1.0 HP/сек регенерации' },
      { tier: 6, cost: 180, title: 'Каменная кожа II', description: '+60 к HP, -6% урона, +1.5 HP/сек регенерации' },
      { tier: 7, cost: 260, title: 'Каменная кожа III', description: '+70 к HP, -7% урона, +2.0 HP/сек регенерации' },
      { tier: 8, cost: 360, title: 'Бастион Бездны I', description: '+80 к HP, -8% урона, +2.5 HP/сек регенерации' },
      { tier: 9, cost: 500, title: 'Бастион Бездны II', description: '+90 к HP, -9% урона, +2.8 HP/сек регенерации' },
      { tier: 10, cost: 700, title: 'Нерушимая Твердыня', description: '+100 к HP, -10% урона, +3.5 HP/сек регенерации' }
    ]
  },
  utility: {
    id: 'utility',
    name: 'Ветка Мастерства',
    icon: '🔮',
    color: '#a855f7',
    themeClass: 'branch-utility',
    description: 'Увеличивает скорость передвижения, радиус сбора кристаллов и шанс выпадения Кристаллов Разлома с врагов.',
    maxTier: 10,
    tiers: [
      { tier: 1, cost: 10, title: 'Легкая поступь I', description: '+2% к скорости бега, +0.5м к радиусу магнита' },
      { tier: 2, cost: 25, title: 'Легкая поступь II', description: '+4% к скорости, +1.0м магнита, +3% шанс кристаллов' },
      { tier: 3, cost: 50, title: 'Глаз Разлома I', description: '+6% к скорости, +1.5м магнита, +6% шанс кристаллов' },
      { tier: 4, cost: 80, title: 'Глаз Разлома II', description: '+8% к скорости, +2.0м магнита, +9% шанс кристаллов' },
      { tier: 5, cost: 120, title: 'Алхимия Бездны I', description: '+10% к скорости, +2.5м магнита, +12% шанс кристаллов' },
      { tier: 6, cost: 180, title: 'Алхимия Бездны II', description: '+12% к скорости, +3.0м магнита, +15% шанс кристаллов' },
      { tier: 7, cost: 260, title: 'Алхимия Бездны III', description: '+14% к скорости, +3.5м магнита, +18% шанс кристаллов' },
      { tier: 8, cost: 360, title: 'Повелитель Потока I', description: '+16% к скорости, +4.0м магнита, +22% шанс кристаллов' },
      { tier: 9, cost: 500, title: 'Повелитель Потока II', description: '+18% к скорости, +4.5м магнита, +26% шанс кристаллов' },
      { tier: 10, cost: 700, title: 'Владыка Разлома', description: '+20% к скорости, +5.0м магнита, +30% шанс кристаллов' }
    ]
  }
};

const STORAGE_KEY = 'rift_crystals_meta_progression_v1';

export class MetaProgression {
  private static instance: MetaProgression | null = null;
  private state: MetaProgressionSave;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.state = this.loadState();
  }

  public static getInstance(): MetaProgression {
    if (!MetaProgression.instance) {
      MetaProgression.instance = new MetaProgression();
    }
    return MetaProgression.instance;
  }

  private loadState(): MetaProgressionSave {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            version: 1,
            crystals: typeof parsed.crystals === 'number' ? Math.max(0, parsed.crystals) : 0,
            lifetimeCrystals: typeof parsed.lifetimeCrystals === 'number' ? Math.max(0, parsed.lifetimeCrystals) : 0,
            upgrades: {
              offense: Math.min(10, Math.max(0, Number(parsed.upgrades?.offense) || 0)),
              defense: Math.min(10, Math.max(0, Number(parsed.upgrades?.defense) || 0)),
              utility: Math.min(10, Math.max(0, Number(parsed.upgrades?.utility) || 0))
            }
          };
        }
      }
    } catch (e) {
      console.warn('[MetaProgression] Failed to load save from localStorage:', e);
    }

    return {
      version: 1,
      crystals: 0,
      lifetimeCrystals: 0,
      upgrades: {
        offense: 0,
        defense: 0,
        utility: 0
      }
    };
  }

  private saveState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.warn('[MetaProgression] Failed to save state to localStorage:', e);
    }
    this.notify();
  }

  public getCrystals(): number {
    return this.state.crystals;
  }

  public getLifetimeCrystals(): number {
    return this.state.lifetimeCrystals;
  }

  public addCrystals(amount: number): void {
    if (amount <= 0) return;
    this.state.crystals += amount;
    this.state.lifetimeCrystals += amount;
    this.saveState();
  }

  public getUpgradeLevel(branch: MetaBranchId): number {
    return this.state.upgrades[branch] || 0;
  }

  public getNextTierCost(branch: MetaBranchId): number | null {
    const currentLevel = this.getUpgradeLevel(branch);
    if (currentLevel >= 10) return null;
    return UPGRADE_TIER_COSTS[currentLevel] ?? null;
  }

  public canAffordUpgrade(branch: MetaBranchId): boolean {
    const cost = this.getNextTierCost(branch);
    if (cost === null) return false;
    return this.state.crystals >= cost;
  }

  public upgradeBranch(branch: MetaBranchId): boolean {
    const cost = this.getNextTierCost(branch);
    if (cost === null || this.state.crystals < cost) {
      return false;
    }
    this.state.crystals -= cost;
    this.state.upgrades[branch] = (this.state.upgrades[branch] || 0) + 1;
    this.saveState();
    return true;
  }

  public getTotalSpentCrystals(): number {
    let spent = 0;
    for (const b of ['offense', 'defense', 'utility'] as MetaBranchId[]) {
      const lvl = this.state.upgrades[b] || 0;
      for (let i = 0; i < lvl; i++) {
        spent += UPGRADE_TIER_COSTS[i] || 0;
      }
    }
    return spent;
  }

  public respecAll(): number {
    const refunded = this.getTotalSpentCrystals();
    this.state.crystals += refunded;
    this.state.upgrades.offense = 0;
    this.state.upgrades.defense = 0;
    this.state.upgrades.utility = 0;
    this.saveState();
    return refunded;
  }

  public getBonuses(): MetaBonuses {
    const offLvl = this.state.upgrades.offense || 0;
    const defLvl = this.state.upgrades.defense || 0;
    const utiLvl = this.state.upgrades.utility || 0;

    // Offense formulas:
    // Damage: +3% per level
    // Crit chance: 0 for lvl 0..2, +1% per level starting at lvl 3 (+1%..+10% at lvl 10)
    // Crit damage: 0 for lvl 0..4, +5% per level at lvl 5..7 (+5%, +10%, +15%), +20%, +25%, +35% at lvl 10
    // Cooldown reduction: 0 for lvl 0..7, 0.02 at lvl 8, 0.04 at lvl 9, 0.06 at lvl 10
    const damageMultiplierBonus = offLvl * 0.03;
    const critChanceBonus = offLvl >= 10 ? 0.10 : offLvl >= 3 ? (offLvl - 2) * 0.01 : 0;
    let critDamageMultBonus = 0;
    if (offLvl >= 10) critDamageMultBonus = 0.35;
    else if (offLvl >= 9) critDamageMultBonus = 0.25;
    else if (offLvl >= 8) critDamageMultBonus = 0.20;
    else if (offLvl >= 5) critDamageMultBonus = (offLvl - 4) * 0.05;
    const cooldownReductionBonus = offLvl >= 10 ? 0.06 : offLvl >= 9 ? 0.04 : offLvl >= 8 ? 0.02 : 0;

    // Defense formulas:
    // Max HP: +10 HP per level (up to +100 HP)
    // Damage reduction: +1% per level (up to -10% damage taken)
    // HP regen: 0 for lvl 0..2, 0.3, 0.6, 1.0, 1.5, 2.0, 2.5, 2.8, 3.5 at lvl 10
    const maxHpBonus = defLvl * 10;
    const damageReductionBonus = defLvl * 0.01;
    let hpRegenBonus = 0;
    if (defLvl >= 10) hpRegenBonus = 3.5;
    else if (defLvl >= 9) hpRegenBonus = 2.8;
    else if (defLvl >= 8) hpRegenBonus = 2.5;
    else if (defLvl >= 7) hpRegenBonus = 2.0;
    else if (defLvl >= 6) hpRegenBonus = 1.5;
    else if (defLvl >= 5) hpRegenBonus = 1.0;
    else if (defLvl >= 4) hpRegenBonus = 0.6;
    else if (defLvl >= 3) hpRegenBonus = 0.3;

    // Utility formulas:
    // Movement speed: +2% per level (up to +20%)
    // Pickup radius: +0.5m per level (up to +5.0m)
    // Crystal drop bonus: 0 for lvl 0..1, +3% per level starting at lvl 2 (up to +30%)
    const speedMultiplierBonus = utiLvl * 0.02;
    const pickupRadiusBonus = utiLvl * 0.5;
    const crystalDropBonus = utiLvl >= 10 ? 0.30 : utiLvl >= 2 ? (utiLvl - 1) * 0.03 : 0;

    return {
      damageMultiplierBonus,
      critChanceBonus,
      critDamageMultBonus,
      cooldownReductionBonus,
      maxHpBonus,
      damageReductionBonus,
      hpRegenBonus,
      speedMultiplierBonus,
      pickupRadiusBonus,
      crystalDropBonus
    };
  }

  public onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[MetaProgression] Error in change listener:', err);
      }
    }
  }
}
