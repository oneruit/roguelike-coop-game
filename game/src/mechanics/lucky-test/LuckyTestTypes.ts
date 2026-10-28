import { CharacterType } from '../../shared/types/entities';
import { WeaponGrade } from '../../combat/WeaponGrades';

export type LuckyTestDraftStep =
  | 'HERO_REVEAL'
  | 'WEAPON_DRAFT_1'
  | 'WEAPON_DRAFT_2'
  | 'WEAPON_DRAFT_3'
  | 'UPGRADES_REVEAL'
  | 'PASSIVE_DRAFT_1'
  | 'PASSIVE_DRAFT_2'
  | 'PASSIVE_DRAFT_3'
  | 'PASSIVE_DRAFT_4'
  | 'STAGING_READY'
  | 'ARENA_BATTLE'
  | 'MATCH_OVER';

export interface WeaponDraftChoice {
  id: string;
  name: string;
  icon: string;
  iconImage: string;
  description: string;
}

export interface WeaponUpgradeResult {
  weaponId: string;
  weaponName: string;
  newLevel: number;
  grade: WeaponGrade;
  gradeName: string;
  gradeColor: string;
}

export type LuckyPassiveType =
  | 'damage'
  | 'max_hp'
  | 'speed'
  | 'crit_chance'
  | 'crit_damage'
  | 'cooldown_reduction'
  | 'hp_regen'
  | 'damage_reduction';

export interface LuckyPassiveChoice {
  id: string;
  type: LuckyPassiveType;
  title: string;
  icon: string;
  value: number;
  description: string;
  quality: 'good' | 'great' | 'legendary';
}

export interface LuckyTestBuildState {
  hero: CharacterType;
  heroName: string;
  startingWeaponId: string;
  draftedWeaponIds: string[];
  appliedUpgrades: WeaponUpgradeResult[];
  chosenPassives: LuckyPassiveChoice[];
  isReady: boolean;
}
