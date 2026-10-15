import { CharacterType } from '../sim/types';
import { getAssetUrl } from '../utils/assetPath';
import { AssetResolver } from '../utils/AssetResolver';
import { CHAPTERS_CONFIG, getChapterDef, getChapterQuestDef } from './ChapterQuestsConfig';

export interface SidebarQuestItem {
  id: string;
  category: 'daily' | 'weekly';
  title: string;
  icon: string;
  current: number;
  max: number;
  progressPercent: number;
  isComplete: boolean;
  isClaimed: boolean;
  rewardType: 'gem' | 'coin' | 'chest';
  rewardAmount: number;
  rewardIcon: string;
  rewardLabel: string;
}

export interface BattlePassData {
  seasonId: string;
  points: number;
  claimedLevels: number[];
}

export interface ChapterQuestProgress {
  current: number;
  isComplete: boolean;
  isClaimed: boolean;
}

export interface ProgressionData {
  accountLevel: number;
  accountXp: number;
  accountXpToNext: number;
  totalCoinsEarned: number;
  walletCoins: number;
  bossesKilled: number;
  enemiesKilled: number;
  resourcesGathered: number;
  questLeshySteps: [boolean, boolean, boolean];
  questLeshyCompleted: boolean;
  unlockedHeroes: Record<CharacterType, boolean>;
  dailyQuestsProgress: Record<string, { current: number; isClaimed: boolean }>;
  weeklyQuestsProgress: Record<string, { current: number; isClaimed: boolean }>;
  chapterQuestsProgress: Record<string, ChapterQuestProgress>;
  claimedChapterRewards: Record<number, boolean>;
  chapterQuestsReworkVersion?: number;
  battlePass?: BattlePassData;
}

export interface QuestStepItem {
  id: number;
  text: string;
  isDone: boolean;
}

export interface HeroQuestDefinition {
  hero: CharacterType;
  heroName: string;
  heroSubtitle: string;
  weaponIcon: string;
  weaponName: string;
  avatarIcon: string;
  questTitle: string;
  questDesc: string;
  steps: string[];
  rewards: {
    potions: number;
    coins: number;
    rings: number;
    crystals: number;
  };
  unlockConditionHint: string;
}

const STORAGE_KEY = 'rift_progression_save_v2';

export class ProgressionManager {
  private static instance: ProgressionManager | null = null;

  public data: ProgressionData;
  public onProgressionChanged?: () => void;
  public onProgressionReset?: () => void;
  public isTrainingMode: boolean = false;
  private saveListeners: Set<() => void> = new Set();

  // Runtime in-expedition trackers (reset to 0 at the start of each expedition)
  public runCritsCount: number = 0;
  public runMerchantPurchases: number = 0;
  public runForestSurvivalSeconds: number = 0;
  public runBossSpawnTime: number | null = null;
  public runSimultaneousPassives: number = 0;

  private constructor() {
    this.data = this.loadFromStorage();
    this.checkAutoUnlocks();
  }

  public static getInstance(): ProgressionManager {
    if (!ProgressionManager.instance) {
      ProgressionManager.instance = new ProgressionManager();
    }
    return ProgressionManager.instance;
  }

  public resetRunSessionProgress(): void {
    this.runCritsCount = 0;
    this.runMerchantPurchases = 0;
    this.runForestSurvivalSeconds = 0;
    this.runBossSpawnTime = null;
    this.runSimultaneousPassives = 0;
  }

  private getDefaultChapterQuestsProgress(): Record<string, ChapterQuestProgress> {
    const progress: Record<string, ChapterQuestProgress> = {};
    for (const ch of CHAPTERS_CONFIG) {
      for (const q of ch.quests) {
        progress[q.id] = { current: 0, isComplete: false, isClaimed: false };
      }
    }
    return progress;
  }

  private getDefaultData(): ProgressionData {
    return {
      accountLevel: 1,
      accountXp: 0,
      accountXpToNext: 200,
      totalCoinsEarned: 0,
      walletCoins: 0,
      bossesKilled: 0,
      enemiesKilled: 0,
      resourcesGathered: 0,
      questLeshySteps: [false, false, false],
      questLeshyCompleted: false,
      unlockedHeroes: {
        ronin: true,     // Ren (unlocked)
        valkyrie: true,  // Kael (unlocked)
        flail: true,     // Brigitta (unlocked)
        sorceress: true, // Aria (unlocked)
        chakram: true,   // Kira (unlocked)
        rocket: true,    // Rocket Raccoon (unlocked)
        invoker: true,   // Invoker (unlocked)
        necromancer: true, // Mortis (unlocked)
        amazon: true,    // Amazon (unlocked)
        archer: false    // Elf: Locked! (Buy / Achievement)
      },
      dailyQuestsProgress: {
        daily_goblins: { current: 0, isClaimed: false },
        daily_bosses: { current: 0, isClaimed: false }
      },
      weeklyQuestsProgress: {
        weekly_goblins: { current: 0, isClaimed: false },
        weekly_resources: { current: 0, isClaimed: false }
      },
      chapterQuestsProgress: this.getDefaultChapterQuestsProgress(),
      claimedChapterRewards: {
        1: false,
        2: false,
        3: false,
        4: false
      },
      chapterQuestsReworkVersion: 2,
      battlePass: {
        seasonId: 'season_1',
        points: 0,
        claimedLevels: []
      }
    };
  }

  private loadFromStorage(): ProgressionData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const defaults = this.getDefaultData();
        const isReworked = parsed.chapterQuestsReworkVersion === 2;
        return {
          accountLevel: Math.max(1, parsed.accountLevel ?? defaults.accountLevel),
          accountXp: Math.max(0, parsed.accountXp ?? defaults.accountXp),
          accountXpToNext: Math.max(100, parsed.accountXpToNext ?? defaults.accountXpToNext),
          totalCoinsEarned: Math.max(0, parsed.totalCoinsEarned ?? defaults.totalCoinsEarned),
          walletCoins: Math.max(0, parsed.walletCoins ?? defaults.walletCoins),
          bossesKilled: Math.max(0, parsed.bossesKilled ?? defaults.bossesKilled),
          enemiesKilled: Math.max(0, parsed.enemiesKilled ?? defaults.enemiesKilled),
          resourcesGathered: Math.max(0, parsed.resourcesGathered ?? defaults.resourcesGathered),
          questLeshySteps: Array.isArray(parsed.questLeshySteps) && parsed.questLeshySteps.length === 3
            ? [Boolean(parsed.questLeshySteps[0]), Boolean(parsed.questLeshySteps[1]), Boolean(parsed.questLeshySteps[2])]
            : defaults.questLeshySteps,
          questLeshyCompleted: Boolean(parsed.questLeshyCompleted ?? defaults.questLeshyCompleted),
          unlockedHeroes: {
            ronin: true,
            valkyrie: parsed.unlockedHeroes?.valkyrie ?? true,
            flail: parsed.unlockedHeroes?.flail ?? true,
            sorceress: parsed.unlockedHeroes?.sorceress ?? true,
            chakram: parsed.unlockedHeroes?.chakram ?? true,
            rocket: parsed.unlockedHeroes?.rocket ?? true,
            invoker: true,
            necromancer: parsed.unlockedHeroes?.necromancer ?? true,
            amazon: parsed.unlockedHeroes?.amazon ?? true,
            archer: Boolean(parsed.unlockedHeroes?.archer)
          },
          dailyQuestsProgress: isReworked && parsed.dailyQuestsProgress && typeof parsed.dailyQuestsProgress === 'object'
            ? { ...defaults.dailyQuestsProgress, ...parsed.dailyQuestsProgress }
            : defaults.dailyQuestsProgress,
          weeklyQuestsProgress: isReworked && parsed.weeklyQuestsProgress && typeof parsed.weeklyQuestsProgress === 'object'
            ? { ...defaults.weeklyQuestsProgress, ...parsed.weeklyQuestsProgress }
            : defaults.weeklyQuestsProgress,
          chapterQuestsProgress: isReworked && parsed.chapterQuestsProgress && typeof parsed.chapterQuestsProgress === 'object'
            ? { ...defaults.chapterQuestsProgress, ...parsed.chapterQuestsProgress }
            : defaults.chapterQuestsProgress,
          claimedChapterRewards: isReworked && parsed.claimedChapterRewards && typeof parsed.claimedChapterRewards === 'object'
            ? { ...defaults.claimedChapterRewards, ...parsed.claimedChapterRewards }
            : defaults.claimedChapterRewards,
          chapterQuestsReworkVersion: 2,
          battlePass: parsed.battlePass && typeof parsed.battlePass === 'object'
            ? {
                seasonId: typeof parsed.battlePass.seasonId === 'string' ? parsed.battlePass.seasonId : 'season_1',
                points: Math.max(0, Number(parsed.battlePass.points) || 0),
                claimedLevels: Array.isArray(parsed.battlePass.claimedLevels)
                  ? parsed.battlePass.claimedLevels.map(Number).filter((n: number) => !isNaN(n))
                  : []
              }
            : defaults.battlePass
        };
      }
    } catch (e) {
      console.warn('Failed to parse progression save from storage:', e);
    }
    return this.getDefaultData();
  }

  public save() {
    if (this.isTrainingMode) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save progression to storage:', e);
    }
    if (this.onProgressionChanged) {
      this.onProgressionChanged();
    }
    for (const listener of this.saveListeners) {
      try {
        listener();
      } catch (err) {
        console.error('[ProgressionManager] Error in save listener:', err);
      }
    }
  }

  public onSave(listener: () => void): () => void {
    this.saveListeners.add(listener);
    return () => {
      this.saveListeners.delete(listener);
    };
  }

  public getDefaultProgressionData(): ProgressionData {
    return this.getDefaultData();
  }

  public loadExternalData(cloudProg: Partial<ProgressionData>): void {
    if (!cloudProg || typeof cloudProg !== 'object') return;

    if (typeof cloudProg.accountLevel === 'number') {
      this.data.accountLevel = Math.max(cloudProg.accountLevel, this.data.accountLevel);
    }
    if (typeof cloudProg.accountXp === 'number') {
      this.data.accountXp = Math.max(cloudProg.accountXp, this.data.accountXp);
    }
    if (typeof cloudProg.walletCoins === 'number') {
      this.data.walletCoins = Math.max(cloudProg.walletCoins, this.data.walletCoins);
    }
    if (typeof cloudProg.totalCoinsEarned === 'number') {
      this.data.totalCoinsEarned = Math.max(cloudProg.totalCoinsEarned, this.data.totalCoinsEarned);
    }
    if (typeof cloudProg.bossesKilled === 'number') {
      this.data.bossesKilled = Math.max(cloudProg.bossesKilled, this.data.bossesKilled);
    }
    if (typeof cloudProg.enemiesKilled === 'number') {
      this.data.enemiesKilled = Math.max(cloudProg.enemiesKilled, this.data.enemiesKilled);
    }
    if (typeof cloudProg.resourcesGathered === 'number') {
      this.data.resourcesGathered = Math.max(cloudProg.resourcesGathered, this.data.resourcesGathered);
    }
    if (cloudProg.unlockedHeroes && typeof cloudProg.unlockedHeroes === 'object') {
      for (const [k, v] of Object.entries(cloudProg.unlockedHeroes)) {
        if (v) {
          (this.data.unlockedHeroes as any)[k] = true;
        }
      }
    }
    if (cloudProg.battlePass && typeof cloudProg.battlePass === 'object') {
      const bp = this.data.battlePass || { seasonId: 'season_1', points: 0, claimedLevels: [] };
      bp.points = Math.max(cloudProg.battlePass.points || 0, bp.points);
      bp.claimedLevels = Array.from(new Set([...bp.claimedLevels, ...(cloudProg.battlePass.claimedLevels || [])]));
      this.data.battlePass = bp;
    }
    this.save();
  }

  public isHeroUnlocked(hero: CharacterType): boolean {
    if (hero === 'ronin' || hero === 'rocket' || hero === 'invoker' || hero === 'necromancer' || hero === 'amazon') return true; // TODO
    if (hero === 'archer') {
      return Boolean(this.data.unlockedHeroes.archer);
    }
    // Existing base heroes are unlocked by default
    if (hero === 'valkyrie' || hero === 'flail' || hero === 'sorceress' || hero === 'chakram') {
      return this.data.unlockedHeroes[hero] ?? true;
    }
    // For future heroes added to the game, read their unlocked status
    return Boolean(this.data.unlockedHeroes[hero]);
  }

  public unlockHero(hero: CharacterType): boolean {
    if (!this.data.unlockedHeroes[hero]) {
      this.data.unlockedHeroes[hero] = true;
      this.save();
      return true;
    }
    return false;
  }

  public checkAutoUnlocks() {
    let changed = false;

    // Existing heroes are unlocked; only Elf is locked
    if (!this.data.unlockedHeroes.valkyrie) {
      this.data.unlockedHeroes.valkyrie = true;
      changed = true;
    }
    if (!this.data.unlockedHeroes.flail) {
      this.data.unlockedHeroes.flail = true;
      changed = true;
    }
    if (!this.data.unlockedHeroes.sorceress) {
      this.data.unlockedHeroes.sorceress = true;
      changed = true;
    }
    if (!this.data.unlockedHeroes.chakram) {
      this.data.unlockedHeroes.chakram = true;
      changed = true;
    }

    if (changed) {
      this.save();
    }
  }

  public addAccountXp(amount: number) {
    if (this.isTrainingMode || amount <= 0) return;
    this.data.accountXp += amount;

    while (this.data.accountXp >= this.data.accountXpToNext) {
      this.data.accountXp -= this.data.accountXpToNext;
      this.data.accountLevel += 1;
      this.data.accountXpToNext = Math.round(150 + this.data.accountLevel * 100);
    }

    this.checkAutoUnlocks();
    this.save();
  }

  public addCoins(amount: number) {
    if (this.isTrainingMode || amount <= 0) return;
    this.data.totalCoinsEarned += amount;
    this.data.walletCoins += amount;
    this.checkAutoUnlocks();
    this.save();
  }

  public recordBossKilled() {
    if (this.isTrainingMode) return;
    this.data.bossesKilled += 1;
    if (this.data.dailyQuestsProgress?.daily_bosses && !this.data.dailyQuestsProgress.daily_bosses.isClaimed) {
      this.data.dailyQuestsProgress.daily_bosses.current = Math.min(2, this.data.dailyQuestsProgress.daily_bosses.current + 1);
    }
    // Step 3 of Leshy quest can also progress when a boss is defeated
    if (this.data.questLeshySteps[0] && this.data.questLeshySteps[1] && !this.data.questLeshySteps[2]) {
      this.data.questLeshySteps[2] = true;
      this.data.questLeshyCompleted = true;
      this.data.unlockedHeroes.chakram = true;
    }
    this.checkAutoUnlocks();
    this.save();
  }

  public recordEnemyKilled() {
    if (this.isTrainingMode) return;
    this.data.enemiesKilled += 1;
    if (this.data.dailyQuestsProgress?.daily_goblins && !this.data.dailyQuestsProgress.daily_goblins.isClaimed) {
      this.data.dailyQuestsProgress.daily_goblins.current = Math.min(2, this.data.dailyQuestsProgress.daily_goblins.current + 1);
    }
    if (this.data.weeklyQuestsProgress?.weekly_goblins && !this.data.weeklyQuestsProgress.weekly_goblins.isClaimed) {
      this.data.weeklyQuestsProgress.weekly_goblins.current = Math.min(2, this.data.weeklyQuestsProgress.weekly_goblins.current + 1);
    }
    // Step 1 of Leshy quest auto triggers after 10 kills if not done
    if (!this.data.questLeshySteps[0] && this.data.enemiesKilled >= 10) {
      this.data.questLeshySteps[0] = true;
    }
    // Step 2 can auto trigger after 25 kills if not done
    if (this.data.questLeshySteps[0] && !this.data.questLeshySteps[1] && this.data.enemiesKilled >= 25) {
      this.data.questLeshySteps[1] = true;
    }
    this.checkAutoUnlocks();
    this.save();
  }

  public recordResourceGather(amount: number = 1) {
    if (this.isTrainingMode) return;
    this.data.resourcesGathered = (this.data.resourcesGathered ?? 0) + amount;
    if (this.data.weeklyQuestsProgress?.weekly_resources && !this.data.weeklyQuestsProgress.weekly_resources.isClaimed) {
      this.data.weeklyQuestsProgress.weekly_resources.current = Math.min(2, this.data.weeklyQuestsProgress.weekly_resources.current + amount);
    }
    this.save();
  }

  public getDailySidebarQuests(): SidebarQuestItem[] {
    const gobProg = this.data.dailyQuestsProgress?.daily_goblins ?? { current: 0, isClaimed: false };
    const bossProg = this.data.dailyQuestsProgress?.daily_bosses ?? { current: 0, isClaimed: false };

    const gobCurrent = Math.min(2, Math.max(0, gobProg.current));
    const bossCurrent = Math.min(2, Math.max(0, bossProg.current));

    return [
      {
        id: 'daily_goblins',
        category: 'daily',
        title: 'Убить 2 гоблинов',
        icon: getAssetUrl('/textures/quests/ui_quest_slot_goblin.png'),
        current: gobCurrent,
        max: 2,
        progressPercent: Math.min(100, Math.round((gobCurrent / 2) * 100)),
        isComplete: gobCurrent >= 2,
        isClaimed: Boolean(gobProg.isClaimed),
        rewardType: 'gem',
        rewardAmount: 4,
        rewardIcon: getAssetUrl('/textures/quests/ui_quest_slot_gem.png'),
        rewardLabel: '4 изумруда'
      },
      {
        id: 'daily_bosses',
        category: 'daily',
        title: 'Победить 2 боссов',
        icon: getAssetUrl('/textures/quests/ui_quest_slot_boss.png'),
        current: bossCurrent,
        max: 2,
        progressPercent: Math.min(100, Math.round((bossCurrent / 2) * 100)),
        isComplete: bossCurrent >= 2,
        isClaimed: Boolean(bossProg.isClaimed),
        rewardType: 'coin',
        rewardAmount: 2,
        rewardIcon: getAssetUrl('/textures/quests/ui_quest_slot_coin.png'),
        rewardLabel: '2 монеты'
      }
    ];
  }

  public getWeeklySidebarQuests(): SidebarQuestItem[] {
    const gobProg = this.data.weeklyQuestsProgress?.weekly_goblins ?? { current: 0, isClaimed: false };
    const resProg = this.data.weeklyQuestsProgress?.weekly_resources ?? { current: 0, isClaimed: false };

    const gobCurrent = Math.min(2, Math.max(0, gobProg.current));
    const resCurrent = Math.min(2, Math.max(0, resProg.current));

    return [
      {
        id: 'weekly_goblins',
        category: 'weekly',
        title: 'Убить 2 гоблинов',
        icon: getAssetUrl('/textures/quests/ui_quest_slot_goblin.png'),
        current: gobCurrent,
        max: 2,
        progressPercent: Math.min(100, Math.round((gobCurrent / 2) * 100)),
        isComplete: gobCurrent >= 2,
        isClaimed: Boolean(gobProg.isClaimed),
        rewardType: 'gem',
        rewardAmount: 10,
        rewardIcon: getAssetUrl('/textures/quests/ui_quest_slot_gem.png'),
        rewardLabel: '10 изумрудов'
      },
      {
        id: 'weekly_resources',
        category: 'weekly',
        title: 'Собрать 2 ресурса',
        icon: getAssetUrl('/textures/quests/ui_quest_slot_wood.png'),
        current: resCurrent,
        max: 2,
        progressPercent: Math.min(100, Math.round((resCurrent / 2) * 100)),
        isComplete: resCurrent >= 2,
        isClaimed: Boolean(resProg.isClaimed),
        rewardType: 'chest',
        rewardAmount: 1,
        rewardIcon: getAssetUrl('/textures/quests/ui_quest_slot_chest.png'),
        rewardLabel: '1 сундук'
      }
    ];
  }

  public claimSidebarQuest(questId: string): { success: boolean; rewardType: string; amount: number; label: string } | null {
    const all = [...this.getDailySidebarQuests(), ...this.getWeeklySidebarQuests()];
    const target = all.find((q) => q.id === questId);
    if (!target || !target.isComplete || target.isClaimed) return null;

    if (target.category === 'daily') {
      if (!this.data.dailyQuestsProgress[questId]) {
        this.data.dailyQuestsProgress[questId] = { current: target.max, isClaimed: true };
      } else {
        this.data.dailyQuestsProgress[questId].isClaimed = true;
      }
    } else {
      if (!this.data.weeklyQuestsProgress[questId]) {
        this.data.weeklyQuestsProgress[questId] = { current: target.max, isClaimed: true };
      } else {
        this.data.weeklyQuestsProgress[questId].isClaimed = true;
      }
    }

    if (target.rewardType === 'gem') {
      this.addAccountXp(target.rewardAmount * 25);
    } else if (target.rewardType === 'coin') {
      this.addCoins(target.rewardAmount);
    } else if (target.rewardType === 'chest') {
      this.addCoins(100);
      this.addAccountXp(150);
    }

    this.save();
    return { success: true, rewardType: target.rewardType, amount: target.rewardAmount, label: target.rewardLabel };
  }

  public progressLeshyStep(stepIndex: 0 | 1 | 2): boolean {
    if (this.isTrainingMode || stepIndex < 0 || stepIndex > 2) return false;
    this.data.questLeshySteps[stepIndex] = true;
    if (this.data.questLeshySteps[0] && this.data.questLeshySteps[1] && this.data.questLeshySteps[2]) {
      this.data.questLeshyCompleted = true;
      this.data.unlockedHeroes.chakram = true;
    }
    this.save();
    return true;
  }

  public completeLeshyQuest(): boolean {
    if (this.isTrainingMode) return false;
    this.data.questLeshySteps = [true, true, true];
    this.data.questLeshyCompleted = true;
    this.data.unlockedHeroes.chakram = true;
    this.save();
    return true;
  }

  public buyElf(): boolean {
    const cost = 100;
    if (this.data.walletCoins >= cost) {
      this.data.walletCoins -= cost;
      this.data.unlockedHeroes.archer = true;
      this.save();
      return true;
    }
    return false;
  }

  public unlockElfByAchievement(): boolean {
    // Achievement condition: 100 enemies killed or 100 coins collected
    if (this.data.enemiesKilled >= 100 || this.data.totalCoinsEarned >= 100) {
      this.data.unlockedHeroes.archer = true;
      this.save();
      return true;
    }
    return false;
  }

  public canUnlockElfByAchievement(): boolean {
    return this.data.enemiesKilled >= 100 || this.data.totalCoinsEarned >= 100;
  }

  // --- Chapter Quests Tracking & Claiming ---

  public recordMeleeOrSpellKill(count: number = 1): void {
    if (this.isTrainingMode) return;
    const q = this.data.chapterQuestsProgress?.ch1_deadly_debut;
    if (q && !q.isComplete) {
      q.current = Math.min(50, q.current + count);
      if (q.current >= 50) q.isComplete = true;
      this.save();
    }
  }

  public recordXpGemCollected(count: number = 1): void {
    if (this.isTrainingMode) return;
    const q = this.data.chapterQuestsProgress?.ch1_essence_collection;
    if (q && !q.isComplete) {
      q.current = Math.min(100, q.current + count);
      if (q.current >= 100) q.isComplete = true;
      this.save();
    }
  }

  public recordAltarCaptured(count: number = 1): void {
    if (this.isTrainingMode) return;
    const q = this.data.chapterQuestsProgress?.ch1_altar_call;
    if (q && !q.isComplete) {
      q.current = Math.min(1, q.current + count);
      if (q.current >= 1) q.isComplete = true;
      this.save();
    }
  }

  public recordTeleporterBossKilled(): void {
    if (this.isTrainingMode) return;
    let changed = false;
    const q1 = this.data.chapterQuestsProgress?.ch1_veil_breakthrough;
    if (q1 && !q1.isComplete) {
      q1.current = 1;
      q1.isComplete = true;
      changed = true;
    }
    const q2 = this.data.chapterQuestsProgress?.ch2_fall_of_leshy;
    if (q2 && !q2.isComplete) {
      q2.current = 1;
      q2.isComplete = true;
      changed = true;
    }
    if (changed) this.save();
  }

  public recordCrawlerOrCoyoteKilled(count: number = 1): void {
    if (this.isTrainingMode) return;
    const q = this.data.chapterQuestsProgress?.ch2_trail_of_beasts;
    if (q && !q.isComplete) {
      q.current = Math.min(75, q.current + count);
      if (q.current >= 75) q.isComplete = true;
      this.save();
    }
  }

  public recordForestGoldenChestOpened(): void {
    if (this.isTrainingMode) return;
    const q = this.data.chapterQuestsProgress?.ch2_forest_cache;
    if (q && !q.isComplete) {
      q.current = 1;
      q.isComplete = true;
      this.save();
    }
  }

  public recordForestSurvivalTime(seconds: number): void {
    if (this.isTrainingMode) return;
    this.runForestSurvivalSeconds = Math.max(this.runForestSurvivalSeconds, seconds);
    const minutes = Math.min(12, Math.floor(seconds / 60));
    const q = this.data.chapterQuestsProgress?.ch2_cleanse_roots;
    if (q && !q.isComplete) {
      q.current = Math.max(q.current, minutes);
      if (seconds >= 720 || q.current >= 12) {
        q.current = 12;
        q.isComplete = true;
      }
      this.save();
    }
  }

  public recordLeshyDefeated(): void {
    if (this.isTrainingMode) return;
    const q = this.data.chapterQuestsProgress?.ch2_fall_of_leshy;
    if (q && !q.isComplete) {
      q.current = 1;
      q.isComplete = true;
      this.save();
    }
  }

  public recordRunCrit(count: number = 1): void {
    if (this.isTrainingMode) return;
    this.runCritsCount += count;
    const q = this.data.chapterQuestsProgress?.ch3_critical_overload;
    if (q && !q.isComplete) {
      q.current = Math.min(50, this.runCritsCount);
      if (this.runCritsCount >= 50) {
        q.current = 50;
        q.isComplete = true;
      }
      this.save();
    }
  }

  public recordSimultaneousPassives(count: number): void {
    if (this.isTrainingMode) return;
    this.runSimultaneousPassives = Math.max(this.runSimultaneousPassives, count);
    const q = this.data.chapterQuestsProgress?.ch3_energy_symbiosis;
    if (q && !q.isComplete) {
      q.current = Math.min(4, Math.max(q.current, count));
      if (count >= 4) {
        q.current = 4;
        q.isComplete = true;
      }
      this.save();
    }
  }

  public recordMerchantPurchaseInRun(count: number = 1): void {
    if (this.isTrainingMode) return;
    this.runMerchantPurchases += count;
    const q = this.data.chapterQuestsProgress?.ch3_rift_smuggler;
    if (q && !q.isComplete) {
      q.current = Math.min(3, this.runMerchantPurchases);
      if (this.runMerchantPurchases >= 3) {
        q.current = 3;
        q.isComplete = true;
      }
      this.save();
    }
  }

  public recordBossSpawn(gameTime: number): void {
    this.runBossSpawnTime = gameTime;
  }

  public recordBossDefeat(gameTime: number): void {
    if (this.isTrainingMode) return;
    if (this.runBossSpawnTime !== null && (gameTime - this.runBossSpawnTime) <= 90) {
      const q = this.data.chapterQuestsProgress?.ch3_death_of_titan;
      if (q && !q.isComplete) {
        q.current = 1;
        q.isComplete = true;
        this.save();
      }
    }
  }

  public recordRangedKill(count: number = 1): void {
    if (this.isTrainingMode) return;
    const q = this.data.chapterQuestsProgress?.ch4_arrow_hail;
    if (q && !q.isComplete) {
      q.current = Math.min(200, q.current + count);
      if (q.current >= 200) q.isComplete = true;
      this.save();
    }
  }

  public getChapterQuestProgress(questId: string): {
    current: number;
    max: number;
    label: string;
    isComplete: boolean;
    isClaimed: boolean;
  } {
    const def = getChapterQuestDef(questId);
    const maxVal = def?.max ?? 1;

    if (!this.data.chapterQuestsProgress) {
      this.data.chapterQuestsProgress = this.getDefaultChapterQuestsProgress();
    }
    const qData = this.data.chapterQuestsProgress[questId] || { current: 0, isComplete: false, isClaimed: false };

    if (questId === 'ch4_veteran') {
      const lvl = this.data.accountLevel;
      const complete = lvl >= 5;
      return {
        current: Math.min(5, lvl),
        max: 5,
        label: `${Math.min(5, lvl)}/5`,
        isComplete: complete,
        isClaimed: qData.isClaimed
      };
    }

    if (questId === 'ch4_golden_treasury') {
      const coins = this.data.walletCoins;
      const complete = coins >= 500;
      return {
        current: Math.min(500, coins),
        max: 500,
        label: `${Math.min(500, coins)}/500`,
        isComplete: complete,
        isClaimed: qData.isClaimed
      };
    }

    if (questId === 'ch3_critical_overload' && !qData.isComplete) {
      const cur = Math.min(maxVal, this.runCritsCount);
      return {
        current: cur,
        max: maxVal,
        label: `${cur}/${maxVal}`,
        isComplete: cur >= maxVal,
        isClaimed: qData.isClaimed
      };
    }

    if (questId === 'ch3_rift_smuggler' && !qData.isComplete) {
      const cur = Math.min(maxVal, this.runMerchantPurchases);
      return {
        current: cur,
        max: maxVal,
        label: `${cur}/${maxVal}`,
        isComplete: cur >= maxVal,
        isClaimed: qData.isClaimed
      };
    }

    if (questId === 'ch2_cleanse_roots') {
      const cur = Math.min(maxVal, qData.current);
      return {
        current: cur,
        max: maxVal,
        label: `${cur}/${maxVal} мин`,
        isComplete: qData.isComplete || cur >= maxVal,
        isClaimed: qData.isClaimed
      };
    }

    const cur = Math.min(maxVal, qData.current);
    const complete = qData.isComplete || cur >= maxVal;
    return {
      current: cur,
      max: maxVal,
      label: complete ? '✓ Готово' : `${cur}/${maxVal}`,
      isComplete: complete,
      isClaimed: qData.isClaimed
    };
  }

  public claimChapterQuest(questId: string): { success: boolean; coins: number } | null {
    const p = this.getChapterQuestProgress(questId);
    if (!p.isComplete || p.isClaimed) return null;
    const def = getChapterQuestDef(questId);
    if (!def) return null;

    if (!this.data.chapterQuestsProgress[questId]) {
      this.data.chapterQuestsProgress[questId] = { current: def.max, isComplete: true, isClaimed: true };
    } else {
      this.data.chapterQuestsProgress[questId].isComplete = true;
      this.data.chapterQuestsProgress[questId].isClaimed = true;
    }

    if (def.rewards.coins > 0) {
      this.addCoins(def.rewards.coins);
    }
    this.save();
    return { success: true, coins: def.rewards.coins };
  }

  public isChapterComplete(chapter: number): boolean {
    const chDef = getChapterDef(chapter);
    if (!chDef) return false;
    return chDef.quests.every((q) => this.getChapterQuestProgress(q.id).isComplete);
  }

  public isChapterRewardClaimed(chapter: number): boolean {
    return Boolean(this.data.claimedChapterRewards?.[chapter]);
  }

  public claimChapterFinalReward(chapter: number): { success: boolean; coins: number } | null {
    if (!this.isChapterComplete(chapter) || this.isChapterRewardClaimed(chapter)) return null;
    const chDef = getChapterDef(chapter);
    if (!chDef) return null;

    if (!this.data.claimedChapterRewards) {
      this.data.claimedChapterRewards = {};
    }
    this.data.claimedChapterRewards[chapter] = true;
    this.addCoins(chDef.finalRewardCoins);
    this.save();
    return { success: true, coins: chDef.finalRewardCoins };
  }

  public advanceChapterQuestForTest(questId: string): void {
    const def = getChapterQuestDef(questId);
    if (!def) return;
    if (!this.data.chapterQuestsProgress[questId]) {
      this.data.chapterQuestsProgress[questId] = { current: 0, isComplete: false, isClaimed: false };
    }
    const q = this.data.chapterQuestsProgress[questId];
    q.current = def.max;
    q.isComplete = true;
    this.save();
  }

  public resetAllTasksToZero(): void {
    this.data.chapterQuestsProgress = this.getDefaultChapterQuestsProgress();
    this.data.claimedChapterRewards = { 1: false, 2: false, 3: false, 4: false };
    this.data.dailyQuestsProgress = {
      daily_goblins: { current: 0, isClaimed: false },
      daily_bosses: { current: 0, isClaimed: false }
    };
    this.data.weeklyQuestsProgress = {
      weekly_goblins: { current: 0, isClaimed: false },
      weekly_resources: { current: 0, isClaimed: false }
    };
    this.data.resourcesGathered = 0;
    this.data.enemiesKilled = 0;
    this.data.bossesKilled = 0;
    this.resetRunSessionProgress();
    this.save();
  }

  public resetAllProgress() {
    this.data = this.getDefaultData();
    this.resetRunSessionProgress();
    this.save();
    this.onProgressionReset?.();
  }

  public getHeroQuestDefinition(hero: CharacterType): HeroQuestDefinition {
    if (hero === 'invoker') return { hero, heroName:'Инвокер', heroSubtitle:'«Маг стихий»',
      weaponIcon:getAssetUrl('/textures/weapons/weapon_invoker_invoke.png'), weaponName:'Invoke',
      avatarIcon:AssetResolver.getHeroTexture('invoker', 'front'), questTitle:'Маг стихий',
      questDesc:'Инвокер доступен сразу и использует десять случайных заклинаний.', steps:[],
      rewards:{potions:0,coins:0,rings:0,crystals:0}, unlockConditionHint:'Доступен сразу' };
    switch (hero) {
      case 'valkyrie':
        return {
          hero: 'valkyrie',
          heroName: 'Каэла',
          heroSubtitle: '«Стальной вихрь»',
          weaponIcon: getAssetUrl('/textures/weapons/weapon_greatsword.png'),
          weaponName: 'Двуручный меч',
          avatarIcon: AssetResolver.getHeroTexture('valkyrie', 'front'),
          questTitle: 'Испытание ветерана',
          questDesc: 'Каэла признаёт силу только опытных воинов Разлома. Повышайте боевой опыт в экспедициях и докажите своё мастерство.',
          steps: [
            'Сражайтесь в экспедициях и накапливайте боевой опыт.',
            'Достигните 5-го уровня аккаунта (текущий: ' + this.data.accountLevel + '/5).'
          ],
          rewards: {
            potions: 2,
            coins: 1500,
            rings: 2,
            crystals: 18
          },
          unlockConditionHint: 'Открывается после 5 уровня аккаунта'
        };

      case 'flail':
        return {
          hero: 'flail',
          heroName: 'Бригитта',
          heroSubtitle: '«Громовой Цеп»',
          weaponIcon: getAssetUrl('/textures/weapons/weapon_flail.png'),
          weaponName: 'Громовой цеп',
          avatarIcon: AssetResolver.getHeroTexture('flail', 'front'),
          questTitle: 'Золотая лихорадка',
          questDesc: 'Бригитта собирает редкие металлы и монеты для закалки цепей своего сокрушительного оружия. Соберите 100 монет в битвах.',
          steps: [
            'Уничтожайте монстров и собирайте кредиты Разлома.',
            'Соберите 100 монет в экспедициях (собрано: ' + Math.min(100, this.data.totalCoinsEarned) + '/100).'
          ],
          rewards: {
            potions: 2,
            coins: 1000,
            rings: 3,
            crystals: 20
          },
          unlockConditionHint: 'Открывается после сбора 100 монет'
        };

      case 'sorceress':
        return {
          hero: 'sorceress',
          heroName: 'Ария',
          heroSubtitle: '«Звёздный Посох»',
          weaponIcon: getAssetUrl('/textures/weapons/weapon_astral_staff.png'),
          weaponName: 'Звёздный посох',
          avatarIcon: AssetResolver.getHeroTexture('sorceress', 'front'),
          questTitle: 'Охота на Стража Разлома',
          questDesc: 'Звёздная магия подчиняется тем, кто способен сокрушить древних владык Разлома. Сразитесь с боссом и одержите победу.',
          steps: [
            'Активируйте телепорт или дождитесь 5-й минуты экспедиции.',
            'Победите босса Разлома (побеждено: ' + this.data.bossesKilled + '/1).'
          ],
          rewards: {
            potions: 3,
            coins: 2500,
            rings: 3,
            crystals: 30
          },
          unlockConditionHint: 'Открывается после победы над боссом'
        };

      case 'chakram':
        return {
          hero: 'chakram',
          heroName: 'Кира',
          heroSubtitle: '«Танцующий Чакрам»',
          weaponIcon: getAssetUrl('/textures/weapons/weapon_chakram.png'),
          weaponName: 'Танцующий чакрам',
          avatarIcon: AssetResolver.getHeroTexture('chakram', 'front'),
          questTitle: 'Охота на Лешего',
          questDesc: 'Найти следы в чаще. Собрать 3 корня аконита. Победить Лешего.',
          steps: [
            'Найти следы в чаще.',
            'Собрать 3 корня аконита.',
            'Победить Лешего.'
          ],
          rewards: {
            potions: 2,
            coins: 2000,
            rings: 3,
            crystals: 26
          },
          unlockConditionHint: 'Открывается после выполнения задания'
        };

      case 'rocket':
        return {
          hero: 'rocket',
          heroName: 'Ракета',
          heroSubtitle: '«Страж Галактики»',
          weaponIcon: getAssetUrl('/textures/weapons/weapon_assault_rifle.png'),
          weaponName: 'Штурмовая винтовка',
          avatarIcon: AssetResolver.getHeroTexture('rocket', 'front'),
          questTitle: 'Арсенал Енота',
          questDesc: 'Гениальный енот-коммандос из Стражей Галактики с тяжелой штурмовой винтовкой и бешеным темпом стрельбы.',
          steps: [
            'Доступен сразу всем защитникам Рифта.'
          ],
          rewards: {
            potions: 3,
            coins: 1500,
            rings: 3,
            crystals: 30
          },
          unlockConditionHint: 'Разблокирован по умолчанию'
        };

      case 'necromancer':
        return {
          hero: 'necromancer',
          heroName: 'Мортис',
          heroSubtitle: '«Повелитель Нежити»',
          weaponIcon: getAssetUrl('/textures/weapons/weapon_astral_staff.png'),
          weaponName: 'Астральный посох',
          avatarIcon: AssetResolver.getHeroTexture('necromancer', 'front'),
          questTitle: 'Зов Тёмных Душ',
          questDesc: 'Могущественный маг смерти с посохом душ, поражающий врагов тёмной магией.',
          steps: [
            'Доступен сразу всем защитникам Рифта.'
          ],
          rewards: {
            potions: 3,
            coins: 1500,
            rings: 3,
            crystals: 30
          },
          unlockConditionHint: 'Разблокирован по умолчанию'
        };

      case 'amazon':
        return {
          hero: 'amazon',
          heroName: 'Амазонка',
          heroSubtitle: '«Мистическая Воительница»',
          weaponIcon: getAssetUrl('/textures/weapons/weapon_reaper_scythe.png'),
          weaponName: 'Сферы Защиты',
          avatarIcon: AssetResolver.getHeroTexture('amazon', 'front'),
          questTitle: 'Танец Стихий',
          questDesc: 'Грозная воительница джунглей, повелевающая защитными и атакующими магическими сферами.',
          steps: [
            'Доступна сразу всем защитникам Рифта.'
          ],
          rewards: {
            potions: 3,
            coins: 1500,
            rings: 3,
            crystals: 30
          },
          unlockConditionHint: 'Разблокирована по умолчанию'
        };

      case 'archer':
      default:
        return {
          hero: 'archer',
          heroName: 'Эльф',
          heroSubtitle: '«Охотничий Лук»',
          weaponIcon: getAssetUrl('/textures/weapons/weapon_bow.png'),
          weaponName: 'Охотничий лук',
          avatarIcon: AssetResolver.getHeroTexture('archer', 'front'),
          questTitle: 'Контракт Следопыта',
          questDesc: 'Эльфийский мастер стрельбы готов присоединиться к отряду по контракту за 100 монет либо за выдающееся достижение охотника.',
          steps: [
            'Накопите 100 монет в кошельке ИЛИ уничтожьте 100 чудовищ (убито: ' + Math.min(100, this.data.enemiesKilled) + '/100).',
            'Приобретите контракт за 100 монет либо подтвердите охотничье достижение.'
          ],
          rewards: {
            potions: 2,
            coins: 1200,
            rings: 3,
            crystals: 24
          },
          unlockConditionHint: 'Открывается после покупки/достижения'
        };
    }
  }

  public getHeroProgress(hero: CharacterType): { current: number; max: number; label: string; isComplete: boolean } {
    if (this.isHeroUnlocked(hero)) {
      return { current: 1, max: 1, label: '1/1', isComplete: true };
    }

    switch (hero) {
      case 'valkyrie': {
        const lvl = this.data.accountLevel;
        return {
          current: Math.min(5, lvl),
          max: 5,
          label: `${Math.min(5, lvl)}/5`,
          isComplete: lvl >= 5
        };
      }
      case 'flail': {
        const c = this.data.totalCoinsEarned;
        return {
          current: Math.min(100, c),
          max: 100,
          label: `${Math.min(100, c)}/100`,
          isComplete: c >= 100
        };
      }
      case 'sorceress': {
        const b = this.data.bossesKilled;
        return {
          current: Math.min(1, b),
          max: 1,
          label: `${Math.min(1, b)}/1`,
          isComplete: b >= 1
        };
      }
      case 'chakram': {
        const stepsDone = this.data.questLeshySteps.filter(Boolean).length;
        return {
          current: stepsDone,
          max: 3,
          label: `${stepsDone}/3`,
          isComplete: this.data.questLeshyCompleted
        };
      }
      case 'archer': {
        const canAchieve = this.canUnlockElfByAchievement();
        const canAfford = this.data.walletCoins >= 100;
        return {
          current: canAchieve || canAfford ? 1 : 0,
          max: 1,
          label: canAchieve || canAfford ? 'ГОТОВО' : '0/1',
          isComplete: canAchieve || canAfford
        };
      }
      default:
        return { current: 1, max: 1, label: '1/1', isComplete: true };
    }
  }
}
