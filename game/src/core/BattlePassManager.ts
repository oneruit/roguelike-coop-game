import { ProgressionManager, BattlePassData } from './ProgressionManager';
import { getAssetUrl } from '../utils/assetPath';

export interface BattlePassReward {
  level: number;
  name: string;
  description: string;
  icon: string;
  coins: number;
  gems?: number;
  isMilestone?: boolean;
}

export const BP_SEASON_ID = 'season_1';
export const BP_SEASON_TITLE = 'БОЕВОЙ ПРОПУСК';
export const BP_SEASON_SUBTITLE = 'СЕЗОН 1: ТЕНИ ДРЕВНЕГО ЛЕСА';
export const BP_MAX_LEVEL = 15;
export const BP_POINTS_PER_LEVEL = 10;
export const BP_MAX_POINTS = (BP_MAX_LEVEL - 1) * BP_POINTS_PER_LEVEL; // 140 pts to reach Lvl 15

/**
 * Calculates Battle Pass experience points awarded for a run based on survival time:
 * - < 5 minutes (0..299s): 2 points
 * - < 10 minutes (300..599s): 4 points
 * - < 15 minutes (600..899s): 6 points
 * - < 20 minutes (900..1199s): 9 points
 * - < 30 minutes (1200..1799s): 10 points
 * - >= 30 minutes (Victory): 10 points
 */
export function calculateBattlePassPoints(gameTimeSeconds: number): number {
  const safeTime = Math.max(0, gameTimeSeconds);
  const minutes = safeTime / 60;
  if (minutes < 5) return 2;
  if (minutes < 10) return 4;
  if (minutes < 15) return 6;
  if (minutes < 20) return 9;
  return 10; // 20 to 30 mins and 30+ min victory
}

export const BATTLE_PASS_REWARDS: BattlePassReward[] = [
  {
    level: 1,
    name: 'Стартовый запас монет',
    description: '100 золотых монет для начала пути в Разломе',
    icon: '/textures/ui/bp_coin.png',
    coins: 100
  },
  {
    level: 2,
    name: 'Эликсир бодрости',
    description: '150 монет и восстанавливающее зелье',
    icon: '/textures/ui/bp_potion.png',
    coins: 150
  },
  {
    level: 3,
    name: 'Кошель следопыта',
    description: '200 монет в прочном кожаном мешочке',
    icon: '/textures/quests/reward_pouch.png',
    coins: 200
  },
  {
    level: 4,
    name: 'Золотой самородок',
    description: '250 монет и золотой самородок Разлома',
    icon: '/textures/ui/bp_nugget.png',
    coins: 250,
    gems: 5
  },
  {
    level: 5,
    name: 'Мешок золота',
    description: '350 монет странствующего торговца',
    icon: '/textures/quests/reward_pouch.png',
    coins: 350
  },
  {
    level: 6,
    name: 'Кристаллы бездны',
    description: '400 монет и сияющий янтарный кристалл',
    icon: '/textures/ui/bp_crystal.png',
    coins: 400
  },
  {
    level: 7,
    name: 'Свиток древних рун',
    description: '500 монет и манускрипт забытого леса',
    icon: '/textures/quests/quest_icon_resources_ore.png',
    coins: 500
  },
  {
    level: 8,
    name: 'Трофейный скарабей',
    description: '600 монет и реликтовый оберег древних',
    icon: '/textures/quests/ui_quest_slot_boss.png',
    coins: 600
  },
  {
    level: 9,
    name: 'Большой кошель богача',
    description: '750 монет из сокровищницы прерии',
    icon: '/textures/quests/reward_pouch.png',
    coins: 750
  },
  {
    level: 10,
    name: 'Железный сундук тайн',
    description: '1000 монет и редкие драгоценности',
    icon: '/textures/ui/bp_chest_silver.png',
    coins: 1000,
    gems: 15,
    isMilestone: true
  },
  {
    level: 11,
    name: 'Большое зелье силы',
    description: '850 монет и концентрированный эликсир',
    icon: '/textures/ui/bp_potion.png',
    coins: 850
  },
  {
    level: 12,
    name: 'Сверкающий сапфир',
    description: '1000 монет и сапфировый самоцвет Разлома',
    icon: '/textures/ui/bp_crystal.png',
    coins: 1000,
    gems: 20
  },
  {
    level: 13,
    name: 'Тяжёлый мешок сокровищ',
    description: '1200 монет искателя приключений',
    icon: '/textures/quests/reward_pouch.png',
    coins: 1200
  },
  {
    level: 14,
    name: 'Реликвия древнего леса',
    description: '1500 монет и сакральный амулет хранителя чащи',
    icon: '/textures/quests/quest_icon_leshy.png',
    coins: 1500,
    gems: 25
  },
  {
    level: 15,
    name: 'Легендарный ларец леса',
    description: '3000 монет, 50 кристаллов и вечная слава покорителя Разлома!',
    icon: '/textures/ui/bp_chest_wood.png',
    coins: 3000,
    gems: 50,
    isMilestone: true
  }
];

export class BattlePassManager {
  private static instance: BattlePassManager | null = null;
  public onBattlePassChanged?: () => void;

  private constructor() {}

  public static getInstance(): BattlePassManager {
    if (!BattlePassManager.instance) {
      BattlePassManager.instance = new BattlePassManager();
    }
    return BattlePassManager.instance;
  }

  private getData(): BattlePassData {
    const prog = ProgressionManager.getInstance();
    if (!prog.data.battlePass || prog.data.battlePass.seasonId !== BP_SEASON_ID) {
      prog.data.battlePass = {
        seasonId: BP_SEASON_ID,
        points: 0,
        claimedLevels: []
      };
    }
    return prog.data.battlePass;
  }

  public getPoints(): number {
    return Math.max(0, this.getData().points);
  }

  public getLevel(points?: number): number {
    const currentPts = typeof points === 'number' ? points : this.getPoints();
    const calculated = 1 + Math.floor(currentPts / BP_POINTS_PER_LEVEL);
    return Math.min(BP_MAX_LEVEL, Math.max(1, calculated));
  }

  public getPointsInCurrentLevel(): number {
    const pts = this.getPoints();
    if (pts >= BP_MAX_POINTS) {
      return BP_POINTS_PER_LEVEL;
    }
    return pts % BP_POINTS_PER_LEVEL;
  }

  public getProgressPercent(): number {
    const pts = this.getPoints();
    const pct = (pts / BP_MAX_POINTS) * 100;
    return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
  }

  public getClaimedLevels(): number[] {
    return this.getData().claimedLevels || [];
  }

  public isLevelUnlocked(level: number): boolean {
    return this.getLevel() >= level;
  }

  public isLevelClaimed(level: number): boolean {
    return this.getClaimedLevels().includes(level);
  }

  public canClaim(level: number): boolean {
    return this.isLevelUnlocked(level) && !this.isLevelClaimed(level);
  }

  public getRewardForLevel(level: number): BattlePassReward | undefined {
    return BATTLE_PASS_REWARDS.find((r) => r.level === level);
  }

  public getAllRewards(): BattlePassReward[] {
    return BATTLE_PASS_REWARDS;
  }

  public claimReward(level: number): { success: boolean; reward?: BattlePassReward; error?: string } {
    const reward = this.getRewardForLevel(level);
    if (!reward) {
      return { success: false, error: 'Награда для этого уровня не найдена' };
    }

    if (!this.isLevelUnlocked(level)) {
      return { success: false, error: 'Уровень ещё не разблокирован' };
    }

    if (this.isLevelClaimed(level)) {
      return { success: false, error: 'Награда уже получена' };
    }

    const data = this.getData();
    if (!data.claimedLevels.includes(level)) {
      data.claimedLevels.push(level);
      data.claimedLevels.sort((a, b) => a - b);
    }

    const prog = ProgressionManager.getInstance();
    prog.addCoins(reward.coins);
    prog.save();

    this.notifyChanged();
    return { success: true, reward };
  }

  public claimAllAvailable(): { claimedCount: number; totalCoins: number; rewards: BattlePassReward[] } {
    const currentLvl = this.getLevel();
    const data = this.getData();
    let totalCoins = 0;
    const claimedRewards: BattlePassReward[] = [];

    for (let lvl = 1; lvl <= currentLvl; lvl++) {
      if (!data.claimedLevels.includes(lvl)) {
        const reward = this.getRewardForLevel(lvl);
        if (reward) {
          data.claimedLevels.push(lvl);
          totalCoins += reward.coins;
          claimedRewards.push(reward);
        }
      }
    }

    if (claimedRewards.length > 0) {
      data.claimedLevels.sort((a, b) => a - b);
      const prog = ProgressionManager.getInstance();
      prog.addCoins(totalCoins);
      prog.save();
      this.notifyChanged();
    }

    return {
      claimedCount: claimedRewards.length,
      totalCoins,
      rewards: claimedRewards
    };
  }

  public addPointsForSurvival(gameTimeSeconds: number): {
    pointsAwarded: number;
    oldLevel: number;
    newLevel: number;
    leveledUp: boolean;
    oldPoints: number;
    newPoints: number;
  } {
    const pointsAwarded = calculateBattlePassPoints(gameTimeSeconds);
    const data = this.getData();
    const oldPoints = data.points;
    const oldLevel = this.getLevel(oldPoints);

    data.points = Math.max(0, oldPoints + pointsAwarded);
    const newPoints = data.points;
    const newLevel = this.getLevel(newPoints);
    const leveledUp = newLevel > oldLevel;

    const prog = ProgressionManager.getInstance();
    prog.save();

    this.notifyChanged();

    return {
      pointsAwarded,
      oldLevel,
      newLevel,
      leveledUp,
      oldPoints,
      newPoints
    };
  }

  private notifyChanged() {
    if (this.onBattlePassChanged) {
      try {
        this.onBattlePassChanged();
      } catch (e) {
        console.error('Error in onBattlePassChanged callback:', e);
      }
    }
  }

  public getRewardIconUrl(iconPath: string): string {
    return getAssetUrl(iconPath);
  }
}
