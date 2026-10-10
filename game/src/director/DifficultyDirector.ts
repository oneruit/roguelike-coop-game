export interface DifficultyTier {
  name: string;
  nameEn: string;
  minTime: number; // in seconds
  color: string;
}

export const DIFFICULTY_TIERS: DifficultyTier[] = [
  { name: 'ЛЕГКО', nameEn: 'EASY', minTime: 0, color: '#22c55e' },
  { name: 'НОРМАЛЬНО', nameEn: 'NORMAL', minTime: 180, color: '#38bdf8' },
  { name: 'СЛОЖНО', nameEn: 'HARD', minTime: 360, color: '#f59e0b' },
  { name: 'БЕЗУМИЕ', nameEn: 'INSANE', minTime: 540, color: '#f97316' },
  { name: 'НЕВОЗМОЖНО', nameEn: 'IMPOSSIBLE', minTime: 780, color: '#ef4444' },
  { name: 'Я ВИЖУ ТЕБЯ', nameEn: 'I SEE YOU', minTime: 1080, color: '#a855f7' },
  { name: 'КОНЕЦ МИРА', nameEn: 'THE RIFT AWAKENS', minTime: 1200, color: '#ec4899' },
  { name: 'БЕСКОНЕЧНЫЙ РАЗЛОМ', nameEn: 'ENDLESS RIFT', minTime: 1500, color: '#8b5cf6' },
  { name: 'АПОКАЛИПСИС', nameEn: 'APOCALYPSE', minTime: 1800, color: '#f43f5e' },
  { name: 'СИНГУЛЯРНОСТЬ', nameEn: 'SINGULARITY', minTime: 2400, color: '#e11d48' },
  { name: 'ХАОС БЕЗДНЫ', nameEn: 'VOID CHAOS', minTime: 3000, color: '#9333ea' }
];

export class DifficultyDirector {
  /**
   * Returns the current difficulty tier definition based on elapsed game time (in seconds).
   */
  public static getCurrentTier(gameTime: number): DifficultyTier {
    for (let i = DIFFICULTY_TIERS.length - 1; i >= 0; i--) {
      if (gameTime >= DIFFICULTY_TIERS[i].minTime) {
        return DIFFICULTY_TIERS[i];
      }
    }
    return DIFFICULTY_TIERS[0];
  }

  /**
   * Returns progress fraction [0..1] towards the next difficulty tier.
   */
  public static getTierProgress(gameTime: number): number {
    for (let i = 0; i < DIFFICULTY_TIERS.length - 1; i++) {
      const cur = DIFFICULTY_TIERS[i];
      const next = DIFFICULTY_TIERS[i + 1];
      if (gameTime >= cur.minTime && gameTime < next.minTime) {
        return (gameTime - cur.minTime) / (next.minTime - cur.minTime);
      }
    }
    return 1.0;
  }

  /**
   * Computes the global difficulty coefficient D(t, players, stage).
   * Scales infinitely without flattening.
   */
  public static getDifficultyCoefficient(gameTime: number, playerCount: number = 1, stage: number = 1): number {
    const timeMinutes = gameTime / 60;
    const timeFactor = 1 + 0.08 * timeMinutes;
    const coopFactor = 1 + 0.35 * Math.max(0, playerCount - 1);
    const stageFactor = Math.pow(1.15, Math.max(0, stage - 1));

    return timeFactor * coopFactor * stageFactor;
  }

  /**
   * Biome Overstay Multiplier: if players stay longer than 5 minutes (300s) on a non-final biome,
   * monsters gain +20% HP and +15% damage per extra minute.
   */
  public static getBiomeOverstayMultiplier(stageTime: number, isFinalStage: boolean = false): { hpMult: number; dmgMult: number; extraMinutes: number } {
    if (isFinalStage || stageTime <= 300) {
      return { hpMult: 1.0, dmgMult: 1.0, extraMinutes: 0 };
    }
    const extraMinutes = (stageTime - 300) / 60;
    return {
      hpMult: 1.0 + extraMinutes * 0.20,
      dmgMult: 1.0 + extraMinutes * 0.15,
      extraMinutes
    };
  }

  /**
   * Computes dynamic chest cost scaled by time and stage.
   */
  public static getScaledChestCost(baseCost: number, gameTime: number, stage: number = 1): number {
    const timeScale = Math.pow(1 + gameTime / 300, 0.75);
    const stageScale = Math.pow(1.1, Math.max(0, stage - 1));
    return Math.round(baseCost * timeScale * stageScale);
  }

  /**
   * Probability of an enemy spawning as an Elite variant (0% up to 45%).
   */
  public static getEliteSpawnChance(gameTime: number, stage: number = 1): number {
    const baseChance = (gameTime / 1200) * 0.35 + (stage - 1) * 0.05;
    return Math.min(0.45, Math.max(0, baseChance));
  }
}
