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
  sheriffStacks: number;
  watchStacks: number;
  injectorStacks: number;
  critVisorStacks: number;
  cleaveTargets: number;
  damageRuneActive: boolean;
}

export interface ProgressionChartState {
  view: 'weapons' | 'monsters' | 'heroes';
  weaponMetric: 'damage' | 'dps';
  selectedWeapons: Set<string>;
  monsterCategory: 'monsters' | 'bosses';
  monsterMetric: 'hp' | 'damage' | 'speed';
  selectedMonsters: Set<string>;
  selectedBosses: Set<string>;
}
