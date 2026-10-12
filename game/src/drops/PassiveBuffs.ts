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
    description: '+3% к скорости бега (с угасающей эффективностью до x3 на 300 ур., макс. x3)'
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
    description: '+10% к радиусу магнита (базовый 10м, с угасающей эффективностью до 50м на 300 ур., макс. 50м)'
  },
  stat_amulet: {
    id: 'stat_amulet',
    title: 'Охотничий Амулет',
    icon: '🧿',
    description: '+1 HP/сек регенерации (без лимита)'
  },
  stat_vest: {
    id: 'stat_vest',
    title: 'Кожаный Жилет',
    icon: '🦺',
    description: '-2% к получаемому урону от мобов (с угасающей эффективностью до 70% на 300 ур., макс. 70%)'
  },
  stat_watch: {
    id: 'stat_watch',
    title: 'Карманные Часы',
    icon: '⏱️',
    description: '-1% к времени перезарядки оружий (с угасающей эффективностью до 30% на 300 ур., макс. 30%)'
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
 * Optionally excludes passives that are already maxed out for the player.
 */
export function getPassiveBuffId(
  seed?: string,
  filterPredicate?: (id: PassiveBuffId) => boolean
): PassiveBuffId {
  const pool = filterPredicate ? PASSIVE_BUFF_IDS.filter(filterPredicate) : PASSIVE_BUFF_IDS;
  const available = pool.length > 0 ? pool : PASSIVE_BUFF_IDS;

  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % available.length;
    return available[idx];
  }
  return available[Math.floor(Math.random() * available.length)];
}
