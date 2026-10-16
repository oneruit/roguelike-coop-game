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
}

export interface SimulationState {
  slots: SimulationSlot[];
  hero: string;
  amplifierStacks: number;
  mightElixirStacks: number;
  watchStacks: number;
  injectorStacks: number;
  critVisorStacks: number;
  cleaveTargets: number;
  damageRuneActive: boolean;
}

export interface ProgressionChartState {
  view: 'weapons' | 'monsters' | 'heroes';
  weaponMetric: 'damage' | 'dps';
  weaponGrade?: 'common' | 'uncommon' | 'rare' | 'legendary';
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

