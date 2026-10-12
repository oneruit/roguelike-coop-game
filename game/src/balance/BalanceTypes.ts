export type BalanceCategory = 'weapon' | 'hero' | 'monster' | 'boss' | 'global' | 'passive' | 'item';

export interface WeaponBalanceConfig {
  id: string;
  name: string;
  icon: string;
  damage: number;
  cooldown: number;
  damagePerLevel: number;
  maxLevel: number;
  range?: number;
  speed?: number;
  pierce?: number;
  count?: number;
  explosionRadius?: number;
  fallSpeed?: number;
  knockback?: number;
  bleedDps?: number;
  bleedDuration?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
  splashRadius?: number;
  notes?: string;
}

export interface HeroBalanceConfig {
  id: string;
  name: string;
  maxHp: number;
  baseSpeed: number;
  damageMultiplier: number;
  startingWeapon: string;
  role?: string;
}

export interface MonsterBalanceConfig {
  id: string;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  gemType?: 'blue' | 'green' | 'red' | 'gold';
  description?: string;
}

export interface BossBalanceConfig {
  id: string;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  description?: string;
}

export interface PassiveBalanceConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  baseValue: number;
  perStackValue: number;
  maxValue?: number;
  scalingType: 'additive' | 'diminishing' | 'multiplicative';
  notes?: string;
}

export interface ItemBalanceConfig {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'boss';
  icon: string;
  color: string;
  description: string;
  stackText: string;
  baseValue?: number;
  scaling?: string;
  notes?: string;
}

export interface GlobalBalanceConfig {
  dashCooldown: number;
  dashDuration: number;
  baseCritChance: number;
  baseCritDamageMult: number;
  basePickupRadius: number;
  maxArmorReduction: number;
  goldGemChanceNormal: number;
  goldGemChanceBoss: number;
  merchantSpawnInterval: number;
  merchantStayDuration: number;
  merchantPriceCommon: number;
  merchantPriceUncommon: number;
  merchantPriceRare: number;
  merchantPriceLegendary: number;
  merchantPriceBoss: number;
  merchantPriceWeaponUpgrade: number;
}

export interface GameBalanceState {
  weapons: Record<string, WeaponBalanceConfig>;
  heroes: Record<string, HeroBalanceConfig>;
  monsters: Record<string, MonsterBalanceConfig>;
  bosses: Record<string, BossBalanceConfig>;
  passives: Record<string, PassiveBalanceConfig>;
  items: Record<string, ItemBalanceConfig>;
  global: GlobalBalanceConfig;
}

export interface BalanceRow<T = any> {
  id: string;
  category: BalanceCategory;
  key: string;
  name: string;
  description?: string;
  data: T;
  version: number;
  updated_at: string;
  updated_by?: string;
}

export interface BalanceChangeEvent {
  category: BalanceCategory;
  key: string;
  name: string;
  description: string;
  data: unknown;
  timestamp: number;
}
