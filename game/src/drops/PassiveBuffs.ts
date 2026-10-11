export type PassiveBuffId =
  | 'stat_sheriff_star'
  | 'stat_spurs'
  | 'stat_flask'
  | 'stat_lasso'
  | 'stat_amulet'
  | 'stat_vest'
  | 'stat_watch';

export interface PassiveBuffDef {
  id: PassiveBuffId;
  title: string;
  icon: string;
  description: string;
}

export const PASSIVE_BUFFS: Record<PassiveBuffId, PassiveBuffDef> = {
  stat_sheriff_star: {
    id: 'stat_sheriff_star',
    title: 'Звезда Шерифа',
    icon: '⭐',
    description: '+2% к урону ВСЕХ оружий (складывается)'
  },
  stat_spurs: {
    id: 'stat_spurs',
    title: 'Шпоры Скорохода',
    icon: '👢',
    description: '+3% к скорости бега'
  },
  stat_flask: {
    id: 'stat_flask',
    title: 'Фляга с Виски',
    icon: '🍶',
    description: '+30 к максимальному HP и полное исцеление'
  },
  stat_lasso: {
    id: 'stat_lasso',
    title: 'Магнитное Лассо',
    icon: '➰',
    description: '+35% к радиусу притяжения кристаллов'
  },
  stat_amulet: {
    id: 'stat_amulet',
    title: 'Охотничий Амулет',
    icon: '🧿',
    description: '+1.5 HP/сек регенерации'
  },
  stat_vest: {
    id: 'stat_vest',
    title: 'Кожаный Жилет',
    icon: '🦺',
    description: '-1% к получаемому урону от мобов'
  },
  stat_watch: {
    id: 'stat_watch',
    title: 'Карманные Часы',
    icon: '⏱️',
    description: '-1% к времени перезарядки оружий'
  }
};

export const PASSIVE_BUFF_IDS: PassiveBuffId[] = [
  'stat_sheriff_star',
  'stat_spurs',
  'stat_flask',
  'stat_lasso',
  'stat_amulet',
  'stat_vest',
  'stat_watch'
];

/**
 * Deterministically pick a passive buff ID based on seed (or random if no seed provided).
 */
export function getPassiveBuffId(seed?: string): PassiveBuffId {
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % PASSIVE_BUFF_IDS.length;
    return PASSIVE_BUFF_IDS[idx];
  }
  return PASSIVE_BUFF_IDS[Math.floor(Math.random() * PASSIVE_BUFF_IDS.length)];
}
