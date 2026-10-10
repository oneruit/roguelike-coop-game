export type WeaponGrade = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface WeaponGradeConfig {
  id: WeaponGrade;
  name: string;
  nameEn: string;
  color: string;
  borderColor: string;
  bgGradient: string;
  glowColor: string;
  badgeBg: string;
  damageMultiplierBonus: number;
  critChanceBonus: number;
  critDamageBonus: number;
  cooldownReductionBonus: number;
}

export const WEAPON_GRADES: Record<WeaponGrade, WeaponGradeConfig> = {
  common: {
    id: 'common',
    name: 'Обычный',
    nameEn: 'Common',
    color: '#94a3b8',
    borderColor: '#64748b',
    bgGradient: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
    glowColor: 'rgba(148, 163, 184, 0.3)',
    badgeBg: '#334155',
    damageMultiplierBonus: 1.0,
    critChanceBonus: 0.0,
    critDamageBonus: 0.0,
    cooldownReductionBonus: 0.0
  },
  uncommon: {
    id: 'uncommon',
    name: 'Необычный',
    nameEn: 'Uncommon',
    color: '#10b981',
    borderColor: '#059669',
    bgGradient: 'linear-gradient(135deg, rgba(6, 78, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%)',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    badgeBg: '#065f46',
    damageMultiplierBonus: 1.5,
    critChanceBonus: 0.05,
    critDamageBonus: 0.05,
    cooldownReductionBonus: 0.04
  },
  rare: {
    id: 'rare',
    name: 'Редкий',
    nameEn: 'Rare',
    color: '#38bdf8',
    borderColor: '#0284c7',
    bgGradient: 'linear-gradient(135deg, rgba(12, 74, 110, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%)',
    glowColor: 'rgba(56, 189, 248, 0.5)',
    badgeBg: '#0369a1',
    damageMultiplierBonus: 2.2,
    critChanceBonus: 0.15,
    critDamageBonus: 0.15,
    cooldownReductionBonus: 0.08
  },
  legendary: {
    id: 'legendary',
    name: 'Легендарный',
    nameEn: 'Legendary',
    color: '#fbbf24',
    borderColor: '#d97706',
    bgGradient: 'linear-gradient(135deg, rgba(120, 53, 15, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    badgeBg: '#b45309',
    damageMultiplierBonus: 3.5,
    critChanceBonus: 0.35,
    critDamageBonus: 0.25,
    cooldownReductionBonus: 0.15
  }
};

export interface BiomeGradeChances {
  common: number;
  uncommon: number;
  rare: number;
  legendary: number;
}

export const BIOME_GRADE_CHANCES: Record<number, BiomeGradeChances> = {
  1: { common: 0.65, uncommon: 0.25, rare: 0.09, legendary: 0.01 }, // Stage 1: Ashen Wastes
  2: { common: 0.40, uncommon: 0.35, rare: 0.20, legendary: 0.05 }, // Stage 2: Derelict Sector 7
  3: { common: 0.20, uncommon: 0.35, rare: 0.32, legendary: 0.13 }, // Stage 3: Bioluminescent Wilds
  4: { common: 0.10, uncommon: 0.25, rare: 0.40, legendary: 0.25 }  // Stage 4+: Volcanic Caldera
};

export function getBiomeGradeChances(stageNumber: number): BiomeGradeChances {
  const stage = Math.max(1, Math.min(4, Math.floor(stageNumber || 1)));
  return BIOME_GRADE_CHANCES[stage] || BIOME_GRADE_CHANCES[4];
}

export function rollWeaponGrade(stageNumber: number, rng: () => number = Math.random): WeaponGrade {
  const chances = getBiomeGradeChances(stageNumber);
  const r = rng();
  if (r < chances.legendary) return 'legendary';
  if (r < chances.legendary + chances.rare) return 'rare';
  if (r < chances.legendary + chances.rare + chances.uncommon) return 'uncommon';
  return 'common';
}

export function getGradeTier(grade: WeaponGrade): number {
  switch (grade) {
    case 'legendary': return 4;
    case 'rare': return 3;
    case 'uncommon': return 2;
    default: return 1;
  }
}

export function getGradeLabel(grade: WeaponGrade): string {
  return WEAPON_GRADES[grade]?.name ?? 'Обычный';
}

export function getGradeColor(grade: WeaponGrade): string {
  return WEAPON_GRADES[grade]?.color ?? '#94a3b8';
}
