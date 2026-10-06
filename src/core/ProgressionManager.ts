import { CharacterType } from '../sim/types';

export interface ProgressionData {
  accountLevel: number;
  accountXp: number;
  accountXpToNext: number;
  totalCoinsEarned: number;
  walletCoins: number;
  bossesKilled: number;
  enemiesKilled: number;
  questLeshySteps: [boolean, boolean, boolean];
  questLeshyCompleted: boolean;
  unlockedHeroes: Record<CharacterType, boolean>;
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
      questLeshySteps: [true, true, true],
      questLeshyCompleted: true,
      unlockedHeroes: {
        ronin: true,     // Ren (unlocked)
        valkyrie: true,  // Kael (unlocked)
        flail: true,     // Brigitta (unlocked)
        sorceress: true, // Aria (unlocked)
        chakram: true,   // Kira (unlocked)
        archer: false    // Elf: Locked! (Buy / Achievement)
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
          }
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
          weaponIcon: '/textures/weapon_greatsword.png',
          weaponName: 'Двуручный меч',
          avatarIcon: '/textures/hero_valkyrie_front.png',
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
          weaponIcon: '/textures/weapon_flail.png',
          weaponName: 'Громовой цеп',
          avatarIcon: '/textures/hero_flail_front.png',
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
          weaponIcon: '/textures/weapon_astral_staff.png',
          weaponName: 'Звёздный посох',
          avatarIcon: '/textures/hero_sorceress_front.png',
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
          weaponIcon: '/textures/weapon_chakram.png',
          weaponName: 'Танцующий чакрам',
          avatarIcon: '/textures/hero_chakram_front.png',
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
          weaponIcon: '/textures/weapon_bow.png',
          weaponName: 'Охотничий лук',
          avatarIcon: '/textures/hero_archer_front.png',
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
