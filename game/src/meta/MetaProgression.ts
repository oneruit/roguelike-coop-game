import { BalanceManager } from '../balance/BalanceManager';
import { TalentBalanceConfig } from '../balance/BalanceTypes';
import { DEFAULT_BALANCE } from '../balance/defaultBalance';

export type MetaBranchId = 'offense' | 'defense' | 'utility';

export interface MetaBranchDef {
  id: MetaBranchId;
  name: string;
  icon: string;
  color: string;
  themeClass: string;
  description: string;
  talentIds: string[];
}

export interface MetaBonuses {
  // Offense
  damageMultiplierBonus: number; // e.g. 0.15 for +15%
  critChanceBonus: number;       // e.g. 0.075 for +7.5%
  critDamageMultBonus: number;   // e.g. 0.35 for +35%
  cooldownReductionBonus: number;// e.g. 0.075 for -7.5% CD
  projectileSpeedBonus: number;  // e.g. 0.20 for +20%
  areaOfEffectBonus: number;     // e.g. 0.15 for +15%
  dotDamageBonus: number;        // e.g. 0.25 for +25%
  bossDamageBonus: number;       // e.g. 0.15 for +15%
  executeDamageBonus: number;    // e.g. 0.20 for +20%
  knockbackBonus: number;        // e.g. 0.25 for +25%

  // Defense
  maxHpBonus: number;            // e.g. 75 for +75 HP
  damageReductionBonus: number;  // e.g. 0.10 for -10% damage taken
  hpRegenBonus: number;          // e.g. 2.5 for +2.5 HP/s
  healEfficiencyBonus: number;   // e.g. 0.30 for +30%
  invulnTimeBonus: number;       // e.g. 0.40 for +0.4s
  dashArmorBonus: number;        // e.g. 0.25 for +25%
  lowHpResilienceBonus: number;  // e.g. 0.20 for +20%
  collisionDamageReductionBonus: number; // e.g. 0.15 for -15%
  thornsBonus: number;           // e.g. 60 thorns
  shieldBarrierBonus: number;    // e.g. 50 shield

  // Utility
  speedMultiplierBonus: number;  // e.g. 0.125 for +12.5% speed
  pickupRadiusBonus: number;     // e.g. 4.0 for +4.0m
  crystalDropBonus: number;      // e.g. 0.25 for +25%
  dashCooldownBonus: number;     // e.g. 0.20 for -20%
  xpGainBonus: number;           // e.g. 0.15 for +15%
  creditsGainBonus: number;      // e.g. 0.25 for +25%
  chestLuckBonus: number;        // e.g. 0.20 for +20%
  potionDropBonus: number;       // e.g. 0.10 for +10%
  rerollCountBonus: number;      // e.g. 2.0 for +2 rerolls
  crystalPulseCooldownBonus: number; // e.g. 30s reduction
}

export interface MetaProgressionSave {
  version: number;
  crystals: number;
  lifetimeCrystals: number;
  upgrades: Record<string, number>; // talentId -> level (0..5)
}

export const META_BRANCHES: Record<MetaBranchId, MetaBranchDef> = {
  offense: {
    id: 'offense',
    name: 'Ветка Могущества',
    icon: '⚔️',
    color: '#f59e0b',
    themeClass: 'branch-offense',
    description: 'Усиливает общий урон, критические удары, скорость снарядов, область поражения и урон по боссам.',
    talentIds: [
      'offense_damage',
      'offense_crit_chance',
      'offense_crit_mult',
      'offense_cooldown',
      'offense_projectile_speed',
      'offense_area',
      'offense_duration',
      'offense_boss_killer',
      'offense_execute',
      'offense_knockback'
    ]
  },
  defense: {
    id: 'defense',
    name: 'Ветка Стойкости',
    icon: '🛡️',
    color: '#10b981',
    themeClass: 'branch-defense',
    description: 'Увеличивает запас здоровья, пассивную регенерацию, броню, шипы, защитные барьеры и время неуязвимости.',
    talentIds: [
      'defense_max_hp',
      'defense_damage_reduction',
      'defense_hp_regen',
      'defense_heal_efficiency',
      'defense_invuln_time',
      'defense_dash_armor',
      'defense_low_hp_resilience',
      'defense_collision_res',
      'defense_thorns',
      'defense_shield_barrier'
    ]
  },
  utility: {
    id: 'utility',
    name: 'Ветка Мастерства',
    icon: '🔮',
    color: '#a855f7',
    themeClass: 'branch-utility',
    description: 'Увеличивает скорость перемещения, радиус магнита, добычу кристаллов и золота, а также дает рероллы.',
    talentIds: [
      'utility_speed',
      'utility_pickup_radius',
      'utility_crystal_drop',
      'utility_dash_cooldown',
      'utility_xp_gain',
      'utility_credits_gain',
      'utility_chest_luck',
      'utility_potion_drop',
      'utility_reroll_count',
      'utility_crystal_magnet'
    ]
  }
};

const STORAGE_KEY = 'rift_crystals_meta_progression_v2';
const LEGACY_STORAGE_KEY = 'rift_crystals_meta_progression_v1';

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
        const rawV2 = localStorage.getItem(STORAGE_KEY);
        if (rawV2) {
          const parsed = JSON.parse(rawV2);
          const cleanUpgrades: Record<string, number> = {};
          if (parsed.upgrades && typeof parsed.upgrades === 'object') {
            for (const [k, v] of Object.entries(parsed.upgrades)) {
              if (typeof v === 'number' && v > 0) {
                cleanUpgrades[k] = Math.min(5, Math.max(0, Math.floor(v)));
              }
            }
          }
          return {
            version: 2,
            crystals: typeof parsed.crystals === 'number' ? Math.max(0, parsed.crystals) : 0,
            lifetimeCrystals: typeof parsed.lifetimeCrystals === 'number' ? Math.max(0, parsed.lifetimeCrystals) : 0,
            upgrades: cleanUpgrades
          };
        }

        // Migrate from legacy v1 (refund spent crystals)
        const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (rawV1) {
          const legacy = JSON.parse(rawV1);
          let refunded = 0;
          const legacyCosts = [10, 25, 50, 80, 120, 180, 260, 360, 500, 700];
          if (legacy.upgrades) {
            for (const key of ['offense', 'defense', 'utility']) {
              const lvl = Number(legacy.upgrades[key]) || 0;
              for (let i = 0; i < lvl; i++) {
                refunded += legacyCosts[i] || 0;
              }
            }
          }
          const totalCrystals = (typeof legacy.crystals === 'number' ? legacy.crystals : 0) + refunded;
          const lifetime = typeof legacy.lifetimeCrystals === 'number' ? legacy.lifetimeCrystals : totalCrystals;
          const migrated: MetaProgressionSave = {
            version: 2,
            crystals: Math.max(0, totalCrystals),
            lifetimeCrystals: Math.max(0, lifetime),
            upgrades: {}
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          return migrated;
        }
      }
    } catch (e) {
      console.warn('[MetaProgression] Failed to load save from localStorage:', e);
    }

    return {
      version: 2,
      crystals: 0,
      lifetimeCrystals: 0,
      upgrades: {}
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

  public getUpgrades(): Record<string, number> {
    return { ...this.state.upgrades };
  }

  public getState(): MetaProgressionSave {
    return {
      version: this.state.version,
      crystals: this.state.crystals,
      lifetimeCrystals: this.state.lifetimeCrystals,
      upgrades: { ...this.state.upgrades }
    };
  }

  public loadExternalState(newState: Partial<MetaProgressionSave>): void {
    if (typeof newState.crystals === 'number') {
      this.state.crystals = Math.max(0, newState.crystals);
    }
    if (typeof newState.lifetimeCrystals === 'number') {
      this.state.lifetimeCrystals = Math.max(0, newState.lifetimeCrystals);
    }
    if (newState.upgrades && typeof newState.upgrades === 'object') {
      this.state.upgrades = { ...newState.upgrades };
    }
    this.saveState();
  }

  public resetAllProgress(): void {
    this.state.crystals = 0;
    this.state.lifetimeCrystals = 0;
    this.state.upgrades = {};
    this.saveState();
  }

  public addCrystals(amount: number): void {
    if (amount <= 0) return;
    this.state.crystals += amount;
    this.state.lifetimeCrystals += amount;
    this.saveState();
  }

  public getTalentConfig(id: string): TalentBalanceConfig | undefined {
    return BalanceManager.getTalentConfig(id) || DEFAULT_BALANCE.talents[id];
  }

  public getBranchTalents(branch: MetaBranchId): TalentBalanceConfig[] {
    const branchDef = META_BRANCHES[branch];
    if (!branchDef) return [];
    return branchDef.talentIds
      .map((id) => this.getTalentConfig(id))
      .filter((t): t is TalentBalanceConfig => Boolean(t));
  }

  public getTalentLevel(id: string): number {
    return this.state.upgrades[id] || 0;
  }

  public getTalentNextCost(id: string): number | null {
    const cfg = this.getTalentConfig(id);
    if (!cfg) return null;
    const currentLevel = this.getTalentLevel(id);
    if (currentLevel >= cfg.maxLevel) return null;
    const costs = cfg.costPerLevel || [15, 35, 75, 140, 240];
    return costs[currentLevel] ?? null;
  }

  public canAffordTalent(id: string): boolean {
    const cost = this.getTalentNextCost(id);
    if (cost === null) return false;
    return this.state.crystals >= cost;
  }

  public upgradeTalent(id: string): boolean {
    const cost = this.getTalentNextCost(id);
    if (cost === null || this.state.crystals < cost) {
      return false;
    }
    this.state.crystals -= cost;
    this.state.upgrades[id] = (this.state.upgrades[id] || 0) + 1;
    this.saveState();
    return true;
  }

  public getTotalSpentCrystals(): number {
    let spent = 0;
    const allTalents = BalanceManager.getAllTalents();
    for (const [id, lvl] of Object.entries(this.state.upgrades)) {
      if (!lvl || lvl <= 0) continue;
      const cfg = allTalents[id] || DEFAULT_BALANCE.talents[id];
      const costs = cfg?.costPerLevel || [15, 35, 75, 140, 240];
      for (let i = 0; i < lvl; i++) {
        spent += costs[i] || 0;
      }
    }
    return spent;
  }

  public getTotalTalentPoints(): number {
    let pts = 0;
    for (const lvl of Object.values(this.state.upgrades)) {
      pts += lvl || 0;
    }
    return pts;
  }

  public respecAll(): number {
    const refunded = this.getTotalSpentCrystals();
    this.state.crystals += refunded;
    this.state.upgrades = {};
    this.saveState();
    return refunded;
  }

  public getBonuses(): MetaBonuses {
    const allTalents = BalanceManager.getAllTalents();
    const bonuses: MetaBonuses = {
      damageMultiplierBonus: 0,
      critChanceBonus: 0,
      critDamageMultBonus: 0,
      cooldownReductionBonus: 0,
      projectileSpeedBonus: 0,
      areaOfEffectBonus: 0,
      dotDamageBonus: 0,
      bossDamageBonus: 0,
      executeDamageBonus: 0,
      knockbackBonus: 0,

      maxHpBonus: 0,
      damageReductionBonus: 0,
      hpRegenBonus: 0,
      healEfficiencyBonus: 0,
      invulnTimeBonus: 0,
      dashArmorBonus: 0,
      lowHpResilienceBonus: 0,
      collisionDamageReductionBonus: 0,
      thornsBonus: 0,
      shieldBarrierBonus: 0,

      speedMultiplierBonus: 0,
      pickupRadiusBonus: 0,
      crystalDropBonus: 0,
      dashCooldownBonus: 0,
      xpGainBonus: 0,
      creditsGainBonus: 0,
      chestLuckBonus: 0,
      potionDropBonus: 0,
      rerollCountBonus: 0,
      crystalPulseCooldownBonus: 0
    };

    for (const [id, lvl] of Object.entries(this.state.upgrades)) {
      if (!lvl || lvl <= 0) continue;
      const cfg = allTalents[id] || DEFAULT_BALANCE.talents[id];
      if (!cfg || !cfg.statKey) continue;
      const totalBonus = lvl * cfg.bonusPerLevel;
      if (cfg.statKey in bonuses) {
        (bonuses as any)[cfg.statKey] += totalBonus;
      }
    }

    return bonuses;
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
