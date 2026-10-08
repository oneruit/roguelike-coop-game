import { CharacterType } from '../sim/types';
import { getAssetUrl } from '../utils/assetPath';

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
  public isTrainingMode: boolean = false;

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

  private getDefaultData(): ProgressionData {
    return {
      accountLevel: 1,
      accountXp: 0,
      accountXpToNext: 200,
      totalCoinsEarned: 0,
      walletCoins: 0,
      bossesKilled: 0,
      enemiesKilled: 0,
      resourcesGathered: 2,
      questLeshySteps: [true, true, true],
      questLeshyCompleted: true,
      unlockedHeroes: {
        ronin: true,     // Ren (unlocked)
        valkyrie: true,  // Kael (unlocked)
        flail: true,     // Brigitta (unlocked)
        sorceress: true, // Aria (unlocked)
        chakram: true,   // Kira (unlocked)
        archer: false    // Elf: Locked! (Buy / Achievement)
      },
      dailyQuestsProgress: {
        daily_goblins: { current: 2, isClaimed: false },
        daily_bosses: { current: 2, isClaimed: false }
      },
      weeklyQuestsProgress: {
        weekly_goblins: { current: 2, isClaimed: false },
        weekly_resources: { current: 2, isClaimed: false }
      }
    };
  }

  private loadFromStorage(): ProgressionData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const defaults = this.getDefaultData();
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
            archer: Boolean(parsed.unlockedHeroes?.archer)
          },
          dailyQuestsProgress: parsed.dailyQuestsProgress && typeof parsed.dailyQuestsProgress === 'object'
            ? { ...defaults.dailyQuestsProgress, ...parsed.dailyQuestsProgress }
            : defaults.dailyQuestsProgress,
          weeklyQuestsProgress: parsed.weeklyQuestsProgress && typeof parsed.weeklyQuestsProgress === 'object'
            ? { ...defaults.weeklyQuestsProgress, ...parsed.weeklyQuestsProgress }
            : defaults.weeklyQuestsProgress
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
  }

  public isHeroUnlocked(hero: CharacterType): boolean {
    if (hero === 'ronin') return true;
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
    const gobProg = this.data.dailyQuestsProgress?.daily_goblins ?? { current: 2, isClaimed: false };
    const bossProg = this.data.dailyQuestsProgress?.daily_bosses ?? { current: 2, isClaimed: false };

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
    const gobProg = this.data.weeklyQuestsProgress?.weekly_goblins ?? { current: 2, isClaimed: false };
    const resProg = this.data.weeklyQuestsProgress?.weekly_resources ?? { current: 2, isClaimed: false };

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

  public resetAllProgress() {
    this.data = this.getDefaultData();
    this.save();
  }

  public getHeroQuestDefinition(hero: CharacterType): HeroQuestDefinition {
    switch (hero) {
      case 'valkyrie':
        return {
          hero: 'valkyrie',
          heroName: 'Каэла',
          heroSubtitle: '«Стальной вихрь»',
          weaponIcon: getAssetUrl('/textures/weapons/weapon_greatsword.png'),
          weaponName: 'Двуручный меч',
          avatarIcon: getAssetUrl('/textures/heroes/hero_valkyrie_front.png'),
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
          avatarIcon: getAssetUrl('/textures/heroes/hero_flail_front.png'),
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
          avatarIcon: getAssetUrl('/textures/heroes/hero_sorceress_front.png'),
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
          avatarIcon: getAssetUrl('/textures/heroes/hero_chakram_front.png'),
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

      case 'archer':
      default:
        return {
          hero: 'archer',
          heroName: 'Эльф',
          heroSubtitle: '«Охотничий Лук»',
          weaponIcon: getAssetUrl('/textures/weapons/weapon_bow.png'),
          weaponName: 'Охотничий лук',
          avatarIcon: getAssetUrl('/textures/heroes/hero_archer_front.png'),
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
