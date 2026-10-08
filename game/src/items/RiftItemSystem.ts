export type ItemRarity = 'common' | 'uncommon' | 'legendary' | 'boss';

export type RiftItemId =
  // Common (Белые)
  | 'kinetic_injector'
  | 'nanite_plating'
  | 'adrenaline_dart'
  | 'pulse_rounds'
  | 'health_vial'
  // Uncommon (Зелёные)
  | 'chain_lightning'
  | 'plasma_detonator'
  | 'crit_visor'
  | 'aegis_battery'
  | 'bio_leech'
  // Legendary (Красные)
  | 'singularity_core'
  | 'orbital_strike'
  | 'chronos_phylactery'
  // Boss (Жёлтые)
  | 'golem_core'
  | 'molten_scale';

export interface RiftItemDef {
  id: RiftItemId;
  name: string;
  rarity: ItemRarity;
  icon: string;
  color: string;
  description: string;
  stackText: string;
}

export const RIFT_ITEMS: Record<RiftItemId, RiftItemDef> = {
  // --- Common (Белые) ---
  kinetic_injector: {
    id: 'kinetic_injector',
    name: 'Кинетический Ускоритель',
    rarity: 'common',
    icon: '⚡',
    color: '#e2e8f0',
    description: '+15% к скорострельности оружий.',
    stackText: '+15% за стак'
  },
  nanite_plating: {
    id: 'nanite_plating',
    name: 'Нано-Броня',
    rarity: 'common',
    icon: '🛡️',
    color: '#e2e8f0',
    description: 'Снижает входящий урон на 4 ед. (не ниже 1).',
    stackText: '+4 снижения урона за стак'
  },
  adrenaline_dart: {
    id: 'adrenaline_dart',
    name: 'Стимулятор Сердца',
    rarity: 'common',
    icon: '💉',
    color: '#e2e8f0',
    description: '+12% к скорости перемещения.',
    stackText: '+12% к скорости за стак'
  },
  pulse_rounds: {
    id: 'pulse_rounds',
    name: 'Импульсный Патрон',
    rarity: 'common',
    icon: '🩸',
    color: '#e2e8f0',
    description: '15% шанс наложить кровотечение (наносит 180% урона за 3 сек).',
    stackText: '+15% шанс за стак'
  },
  health_vial: {
    id: 'health_vial',
    name: 'Био-Инжектор',
    rarity: 'common',
    icon: '🧪',
    color: '#e2e8f0',
    description: '+2.5 HP/сек пассивной регенерации.',
    stackText: '+2.5 HP/сек за стак'
  },

  // --- Uncommon (Зелёные) ---
  chain_lightning: {
    id: 'chain_lightning',
    name: 'Тесла-Катушка',
    rarity: 'uncommon',
    icon: '🌩️',
    color: '#22c55e',
    description: '25% шанс при попадании выпустить цепную молнию по 3 врагам на 160% урона.',
    stackText: '+2 цели и +30% урона за стак'
  },
  plasma_detonator: {
    id: 'plasma_detonator',
    name: 'Плазменный Детонатор',
    rarity: 'uncommon',
    icon: '💥',
    color: '#22c55e',
    description: 'Уничтожение врага вызывает детонацию радиусом 4м на 200% базового урона.',
    stackText: '+1м радиус и +50% урона за стак'
  },
  crit_visor: {
    id: 'crit_visor',
    name: 'Очки Снайпера',
    rarity: 'uncommon',
    icon: '🎯',
    color: '#22c55e',
    description: '+12% шанс нанести критический удар (200% урона).',
    stackText: '+12% шанс за стак'
  },
  aegis_battery: {
    id: 'aegis_battery',
    name: 'Гипер-Щит Защиты',
    rarity: 'uncommon',
    icon: '💠',
    color: '#22c55e',
    description: 'Постоянно генерирует энергощит до +35 HP, восстанавливающийся вне боя.',
    stackText: '+35 макс. емкости щита за стак'
  },
  bio_leech: {
    id: 'bio_leech',
    name: 'Био-Пипетка',
    rarity: 'uncommon',
    icon: '🧬',
    color: '#22c55e',
    description: 'Восстанавливает +5 HP при каждом уничтожении врага.',
    stackText: '+5 HP за стак'
  },

  // --- Legendary (Красные) ---
  singularity_core: {
    id: 'singularity_core',
    name: 'Ядро Сингулярности',
    rarity: 'legendary',
    icon: '🕳️',
    color: '#ef4444',
    description: 'Каждое 10-е убийство создает гравитационную воронку, затягивающую мобов и взрывающуюся на 600% урона.',
    stackText: '-2 к требуемым убийствам и +200% урона за стак'
  },
  orbital_strike: {
    id: 'orbital_strike',
    name: 'Орбитальный Удар',
    rarity: 'legendary',
    icon: '🛰️',
    color: '#ef4444',
    description: 'Каждые 12 сек орбитальный спутник выжигает мощнейшего врага лучом на 800% урона.',
    stackText: '-2 сек перезарядка за стак'
  },
  chronos_phylactery: {
    id: 'chronos_phylactery',
    name: 'Кристалл Времени',
    rarity: 'legendary',
    icon: '⏳',
    color: '#ef4444',
    description: 'Предотвращает смертельный урон, замораживая время вокруг на 3 сек и восстанавливая 50% HP (раз за стадию).',
    stackText: '+25% исцеления за стак'
  },

  // --- Boss (Жёлтые) ---
  golem_core: {
    id: 'golem_core',
    name: 'Око Титана',
    rarity: 'boss',
    icon: '👁️',
    color: '#eab308',
    description: 'Периодически выстреливает разрушительный кинетический луч, оглушающий врагов.',
    stackText: '+50% урона луча за стак'
  },
  molten_scale: {
    id: 'molten_scale',
    name: 'Огненная Чешуя',
    rarity: 'boss',
    icon: '🔥',
    color: '#eab308',
    description: 'Оставляет за персонажем пламенный след, наносящий урон всем преследователям.',
    stackText: '+40% урона огня за стак'
  }
};

export const COMMON_ITEMS: RiftItemId[] = [
  'kinetic_injector',
  'nanite_plating',
  'adrenaline_dart',
  'pulse_rounds',
  'health_vial'
];

export const UNCOMMON_ITEMS: RiftItemId[] = [
  'chain_lightning',
  'plasma_detonator',
  'crit_visor',
  'aegis_battery',
  'bio_leech'
];

export const LEGENDARY_ITEMS: RiftItemId[] = [
  'singularity_core',
  'orbital_strike',
  'chronos_phylactery'
];

export const BOSS_ITEMS: RiftItemId[] = [
  'golem_core',
  'molten_scale'
];

/**
 * Rolls an item drop based on chest rarity weights.
 */
export function rollRiftItem(weights: { common: number; uncommon: number; legendary: number; boss?: number }): RiftItemDef {
  const total = weights.common + weights.uncommon + weights.legendary + (weights.boss ?? 0);
  let roll = Math.random() * total;

  if (roll < weights.common) {
    const id = COMMON_ITEMS[Math.floor(Math.random() * COMMON_ITEMS.length)];
    return RIFT_ITEMS[id];
  }
  roll -= weights.common;

  if (roll < weights.uncommon) {
    const id = UNCOMMON_ITEMS[Math.floor(Math.random() * UNCOMMON_ITEMS.length)];
    return RIFT_ITEMS[id];
  }
  roll -= weights.uncommon;

  if (roll < weights.legendary) {
    const id = LEGENDARY_ITEMS[Math.floor(Math.random() * LEGENDARY_ITEMS.length)];
    return RIFT_ITEMS[id];
  }

  const bossId = BOSS_ITEMS[Math.floor(Math.random() * BOSS_ITEMS.length)];
  return RIFT_ITEMS[bossId];
}
