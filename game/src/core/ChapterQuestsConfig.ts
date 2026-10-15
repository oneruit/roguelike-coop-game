import { AssetResolver } from '../utils/AssetResolver';

export interface ChapterQuestDef {
  id: string;
  chapter: 1 | 2 | 3 | 4;
  questNumber: number;
  title: string;
  desc: string;
  steps: string[];
  max: number;
  icon: string;
  targetAvatar: string;
  barColor: 'purple' | 'cyan' | 'orange' | 'green';
  rewards: { potions: number; coins: number; chest: number };
}

export interface ChapterDef {
  chapter: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  finalRewardCoins: number;
  quests: ChapterQuestDef[];
}

export const CHAPTERS_CONFIG: ChapterDef[] = [
  {
    chapter: 1,
    title: 'Глава I: «Пробуждение в Разломе»',
    subtitle: '(Обучение и базовые механики)',
    finalRewardCoins: 2000,
    quests: [
      {
        id: 'ch1_deadly_debut',
        chapter: 1,
        questNumber: 1,
        title: '1 «Смертоносный дебют»',
        desc: 'Уничтожить 50 мобов оружием ближнего боя или заклинанием.',
        steps: ['Уничтожить 50 мобов оружием ближнего боя или заклинанием.'],
        max: 50,
        icon: '/textures/weapons/weapon_greatsword.png',
        targetAvatar: AssetResolver.getHeroTexture('valkyrie', 'front'),
        barColor: 'purple',
        rewards: { potions: 1, coins: 200, chest: 1 }
      },
      {
        id: 'ch1_essence_collection',
        chapter: 1,
        questNumber: 2,
        title: '2 «Сбор эссенции»',
        desc: 'Накопить 100 самоцветов опыта (синих/зелёных).',
        steps: ['Собрать 100 самоцветов опыта (синих или зелёных) в экспедиции.'],
        max: 100,
        icon: '/textures/quests/ui_quest_slot_gem.png',
        targetAvatar: '/textures/quests/ui_quest_slot_gem.png',
        barColor: 'cyan',
        rewards: { potions: 1, coins: 200, chest: 1 }
      },
      {
        id: 'ch1_altar_call',
        chapter: 1,
        questNumber: 3,
        title: '3 «Зов алтаря»',
        desc: 'Захватить 1 алтарь силы.',
        steps: ['Найти и захватить 1 алтарь силы в Разломе.'],
        max: 1,
        icon: '/textures/quests/quest_icon_chapter1.png',
        targetAvatar: '/textures/quests/quest_icon_chapter1.png',
        barColor: 'green',
        rewards: { potions: 1, coins: 300, chest: 1 }
      },
      {
        id: 'ch1_veil_breakthrough',
        chapter: 1,
        questNumber: 4,
        title: '4 «Прорыв через завесу»',
        desc: 'Активировать Телепорт и победить первого Босса.',
        steps: [
          'Активировать древний Телепорт Разлома.',
          'Победить первого призванного Босса.'
        ],
        max: 1,
        icon: '/textures/quests/quest_icon_chapter_leshen.png',
        targetAvatar: '/textures/quests/ui_quest_slot_boss.png',
        barColor: 'orange',
        rewards: { potions: 2, coins: 500, chest: 1 }
      }
    ]
  },
  {
    chapter: 2,
    title: 'Глава II: «Тени Древнего Леса»',
    subtitle: '(Биолюминесцентные дебри)',
    finalRewardCoins: 2500,
    quests: [
      {
        id: 'ch2_trail_of_beasts',
        chapter: 2,
        questNumber: 1,
        title: '1 «По следу тварей»',
        desc: 'Уничтожить 75 быстрых ползунов (crawler) и пустынных койотов (coyote).',
        steps: ['Уничтожить 75 быстрых ползунов (crawler) и койотов (coyote).'],
        max: 75,
        icon: '/textures/monsters/monster_crawler_front.png',
        targetAvatar: '/textures/monsters/monster_crawler_front.png',
        barColor: 'purple',
        rewards: { potions: 1, coins: 300, chest: 1 }
      },
      {
        id: 'ch2_forest_cache',
        chapter: 2,
        questNumber: 2,
        title: '2 «Тайники чащи»',
        desc: 'Найти и открыть золотой сундук в лесу.',
        steps: ['Найти и открыть золотой сундук в чаще леса.'],
        max: 1,
        icon: '/textures/quests/reward_chest.png',
        targetAvatar: '/textures/quests/reward_chest.png',
        barColor: 'cyan',
        rewards: { potions: 1, coins: 300, chest: 1 }
      },
      {
        id: 'ch2_cleanse_roots',
        chapter: 2,
        questNumber: 3,
        title: '3 «Очищение корней»',
        desc: 'Продержаться 12 минут в биоме леса.',
        steps: ['Продержаться 12 минут в биоме леса (Биолюминесцентные дебри).'],
        max: 12,
        icon: '/textures/quests/quest_icon_resources_wood.png',
        targetAvatar: '/textures/quests/quest_icon_resources_wood.png',
        barColor: 'green',
        rewards: { potions: 2, coins: 400, chest: 1 }
      },
      {
        id: 'ch2_fall_of_leshy',
        chapter: 2,
        questNumber: 4,
        title: '4 «Падение Древнего Лешего»',
        desc: 'Сокрушить Лешего в битве у телепорта.',
        steps: ['Активировать телепорт в чаще.', 'Сокрушить Лешего в битве у телепорта.'],
        max: 1,
        icon: '/textures/quests/quest_icon_leshy.png',
        targetAvatar: '/textures/quests/quest_target_leshy.png',
        barColor: 'orange',
        rewards: { potions: 2, coins: 500, chest: 1 }
      }
    ]
  },
  {
    chapter: 3,
    title: 'Глава III: «Технологии Заброшенного Сектора»',
    subtitle: '(Сектор 7 и артефакты)',
    finalRewardCoins: 3000,
    quests: [
      {
        id: 'ch3_critical_overload',
        chapter: 3,
        questNumber: 1,
        title: '1 «Критическая перегрузка»',
        desc: 'Нанести 50 критических ударов за одну экспедицию.',
        steps: ['Нанести 50 критических ударов за одну экспедицию.'],
        max: 50,
        icon: '/textures/weapons/weapon_assault_rifle.png',
        targetAvatar: AssetResolver.getHeroTexture('rocket', 'front'),
        barColor: 'purple',
        rewards: { potions: 1, coins: 400, chest: 1 }
      },
      {
        id: 'ch3_energy_symbiosis',
        chapter: 3,
        questNumber: 2,
        title: '2 «Энергетический симбиоз»',
        desc: 'Собрать 4 уникальных пассивных предмета одновременно.',
        steps: ['Собрать 4 уникальных пассивных предмета одновременно в инвентаре.'],
        max: 4,
        icon: '/textures/quests/reward_potion.png',
        targetAvatar: AssetResolver.getHeroTexture('sorceress', 'front'),
        barColor: 'cyan',
        rewards: { potions: 2, coins: 400, chest: 1 }
      },
      {
        id: 'ch3_rift_smuggler',
        chapter: 3,
        questNumber: 3,
        title: '3 «Контрабандист Разлома»',
        desc: 'Совершить 3 покупки у Торговца за один забег.',
        steps: ['Совершить 3 покупки у Торговца за один забег.'],
        max: 3,
        icon: '/textures/quests/reward_pouch.png',
        targetAvatar: AssetResolver.getHeroTexture('flail', 'front'),
        barColor: 'green',
        rewards: { potions: 2, coins: 500, chest: 1 }
      },
      {
        id: 'ch3_death_of_titan',
        chapter: 3,
        questNumber: 4,
        title: '4 «Смерть титана»',
        desc: 'Победить Босса менее чем за 90 секунд с момента призыва.',
        steps: ['Победить Босса менее чем за 90 секунд с момента призыва.'],
        max: 1,
        icon: '/textures/quests/ui_quest_slot_boss.png',
        targetAvatar: '/textures/quests/ui_quest_slot_boss.png',
        barColor: 'orange',
        rewards: { potions: 2, coins: 500, chest: 1 }
      }
    ]
  },
  {
    chapter: 4,
    title: 'Глава IV: «Охотничьи контракты»',
    subtitle: '(Мастерство и высокий уровень)',
    finalRewardCoins: 5000,
    quests: [
      {
        id: 'ch4_arrow_hail',
        chapter: 4,
        questNumber: 1,
        title: '1 «Град стрел»',
        desc: 'Уничтожить 200 монстров дальнобойным оружием (Лук / Ракеты).',
        steps: ['Уничтожить 200 монстров дальнобойным оружием (Лук / Ракеты).'],
        max: 200,
        icon: '/textures/weapons/weapon_bow.png',
        targetAvatar: AssetResolver.getHeroTexture('archer', 'front'),
        barColor: 'purple',
        rewards: { potions: 2, coins: 800, chest: 1 }
      },
      {
        id: 'ch4_veteran',
        chapter: 4,
        questNumber: 2,
        title: '2 «Ветеран экспедиций»',
        desc: 'Достичь 5-го уровня аккаунта.',
        steps: ['Достичь 5-го уровня аккаунта.'],
        max: 5,
        icon: '/textures/quests/quest_icon_chapter1.png',
        targetAvatar: AssetResolver.getHeroTexture('valkyrie', 'front'),
        barColor: 'cyan',
        rewards: { potions: 2, coins: 800, chest: 1 }
      },
      {
        id: 'ch4_golden_treasury',
        chapter: 4,
        questNumber: 3,
        title: '3 «Золотая казна»',
        desc: 'Накопить 500 монет в кошельке аккаунта.',
        steps: ['Накопить 500 монет в кошельке аккаунта.'],
        max: 500,
        icon: '/textures/quests/ui_quest_slot_coin.png',
        targetAvatar: '/textures/quests/reward_pouch.png',
        barColor: 'orange',
        rewards: { potions: 3, coins: 1000, chest: 2 }
      }
    ]
  }
];

export function getChapterDef(chapter: number): ChapterDef | undefined {
  return CHAPTERS_CONFIG.find((c) => c.chapter === chapter);
}

export function getChapterQuestDef(questId: string): ChapterQuestDef | undefined {
  for (const ch of CHAPTERS_CONFIG) {
    const q = ch.quests.find((item) => item.id === questId);
    if (q) return q;
  }
  return undefined;
}
