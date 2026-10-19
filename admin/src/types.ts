export interface TableSort {
  col: string;
  dir: 'asc' | 'desc';
}

export interface AdminConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  adminKey: string;
}

export interface SimulationSlot {
  enabled: boolean;
  weaponId: string;
  level: number;
  tier?: number; // 3 (Base x1.0), 2 (Awakened x2.0), 1 (Master x3.0)
}

export interface SimulationState {
  slots: SimulationSlot[];
  hero: string;
  amplifierStacks: number;
  mightElixirStacks: number;
  watchStacks: number;
  injectorStacks: number;
  critVisorStacks: number;
  critDamageStacks?: number;
  critChanceStacks?: number;
  bioInjectorStacks?: number;
  cleaveTargets: number;
  damageRuneActive: boolean;
  bossTarget?: boolean;
}

export interface ProgressionChartState {
  view: 'weapons' | 'monsters' | 'heroes';
  weaponMetric: 'damage' | 'dps';
  weaponGrade?: 'common' | 'uncommon' | 'rare' | 'legendary';
  weaponTier?: 'tier3' | 'tier2' | 'tier1' | 'all';
  selectedWeapons: Set<string>;
  monsterCategory: 'monsters' | 'bosses';
  monsterMetric: 'hp' | 'damage' | 'speed';
  selectedMonsters: Set<string>;
  selectedBosses: Set<string>;
  monsterTimeLimit?: number;
}

export interface LeaderboardEntry {
  id?: string;
  playerId: string;
  playerName: string;
  heroId: string;
  stage: number;
  survivalTimeSec: number;
  kills: number;
  credits: number;
  score: number;
  isVictory: boolean;
  createdAt?: string;
}

