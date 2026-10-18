export interface SpecialQuestDef {
  id: string;
  category: 'rift_path' | 'weekly';
  title: string;
  desc: string;
  targetText: string;
  targetCount: number;
  icon: string;
  targetAvatar: string;
  steps: string[];
  barColor?: 'cyan' | 'orange' | 'green';
  rewards: {
    bp_xp?: number;
    coins?: number;
  };
  rewardLabel: string;
}

export const SPECIAL_QUESTS_CONFIG: SpecialQuestDef[] = [
  // Путь в Разлом (Еженедельное особое событие)
  {
    id: 'rift_elite_bisons',
    category: 'rift_path',
    title: 'Охота на элитных бизонов',
    desc: 'В глубинах Разлома бродят свирепые Белые бизоны-убийцы, наделённые стихийными аффиксами огня, льда и перегрузки. Уничтожьте 100 элитных бизонов, чтобы снизить ярость Разлома.',
    targetText: 'Уничтожить элитных бизонов',
    targetCount: 100,
    icon: '/textures/monsters/monster_bison_front.png',
    targetAvatar: '/textures/monsters/monster_bison_front.png',
    steps: ['Уничтожить 100 элитных бизонов в Разломе'],
    barColor: 'cyan',
    rewards: {
      bp_xp: 500
    },
    rewardLabel: '+500 Опыта БП'
  },
  // Еженедельные задания
  {
    id: 'weekly_elite_coyotes',
    category: 'weekly',
    title: 'Истребление элитных койотов',
    desc: 'Пустынные койоты рыщут стаями по ночам. Уничтожьте 10 элитных койотов с аурами стихий.',
    targetText: 'Уничтожить элитных койотов',
    targetCount: 10,
    icon: '/textures/monsters/monster_coyote_front.png',
    targetAvatar: '/textures/monsters/monster_coyote_front.png',
    steps: ['Уничтожить 10 элитных койотов в Разломе'],
    barColor: 'orange',
    rewards: {
      bp_xp: 50
    },
    rewardLabel: '+50 Опыта БП'
  },
  {
    id: 'weekly_defeat_bosses',
    category: 'weekly',
    title: 'Покоритель боссов',
    desc: 'Сразитесь с владыками Разлома и одержите победу над 2 ключевыми боссами этапов.',
    targetText: 'Победить боссов',
    targetCount: 2,
    icon: '/textures/bosses/boss_demon_front.png',
    targetAvatar: '/textures/bosses/boss_demon_front.png',
    steps: ['Победить 2 боссов Разлома'],
    barColor: 'green',
    rewards: {
      coins: 500
    },
    rewardLabel: '+500 Монет'
  },
  {
    id: 'weekly_play_invoker',
    category: 'weekly',
    title: 'Мастер стихий: Инвокер',
    desc: 'Возьмите под управление великого мага Инвокера и начните забег в Разломе.',
    targetText: 'Сыграть на Инвокере 1 раз',
    targetCount: 1,
    icon: '/textures/heroes/invoker/portrait.png',
    targetAvatar: '/textures/heroes/invoker/portrait.png',
    steps: ['Сыграть за персонажа Инвокер 1 раз'],
    barColor: 'cyan',
    rewards: {
      bp_xp: 100
    },
    rewardLabel: '+100 Опыта БП'
  }
];

export function getSpecialQuestDef(id: string): SpecialQuestDef | undefined {
  return SPECIAL_QUESTS_CONFIG.find((q) => q.id === id);
}

export function getSpecialQuestsByCategory(category: 'rift_path' | 'weekly'): SpecialQuestDef[] {
  return SPECIAL_QUESTS_CONFIG.filter((q) => q.category === category);
}
