import { rollWeaponGrade, type WeaponGrade } from '../combat/WeaponGrades';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'boss';

export type RiftItemId =
  // Common (Обычные / Белые)
  | 'kinetic_injector'
  | 'nanite_plating'
  | 'adrenaline_dart'
  | 'pulse_rounds'
  | 'health_vial'
  // Uncommon (Необычные / Зелёные)
  | 'chain_lightning'
  | 'plasma_detonator'
  | 'crit_visor'
  | 'aegis_battery'
  | 'bio_leech'
  | 'overclock_module'
  // Rare (Редкие / Синие)
  | 'crit_lens'
  | 'heavy_hollowpoint'
  | 'energy_amplifier'
  // Legendary (Легендарные / Оранжевые)
  | 'singularity_core'
  | 'orbital_strike'
  | 'chronos_phylactery'
  | 'titan_heart'
  | 'void_catalyst'
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
  // --- Common (Обычные) ---
  kinetic_injector: {
    id: 'kinetic_injector',
    name: 'Кинетический Ускоритель',
    rarity: 'common',
    icon: '⚡',
    color: '#94a3b8',
    description: '+15% к скорострельности оружий.',
    stackText: '+15% за стак'
  },
  nanite_plating: {
    id: 'nanite_plating',
    name: 'Нано-Броня',
    rarity: 'common',
    icon: '🛡️',
    color: '#94a3b8',
    description: 'Снижает входящий урон на 4 ед. (не ниже 1).',
    stackText: '+4 снижения урона за стак'
  },
  adrenaline_dart: {
    id: 'adrenaline_dart',
    name: 'Стимулятор Сердца',
    rarity: 'common',
    icon: '💉',
    color: '#94a3b8',
    description: '+12% к скорости перемещения.',
    stackText: '+12% к скорости за стак'
  },
  pulse_rounds: {
    id: 'pulse_rounds',
    name: 'Импульсный Патрон',
    rarity: 'common',
    icon: '🩸',
    color: '#94a3b8',
    description: '15% шанс наложить кровотечение (наносит 180% урона за 3 сек).',
    stackText: '+15% шанс за стак'
  },
  health_vial: {
    id: 'health_vial',
    name: 'Био-Инжектор',
    rarity: 'common',
    icon: '🧪',
    color: '#94a3b8',
    description: '+2.5 HP/сек пассивной регенерации.',
    stackText: '+2.5 HP/сек за стак'
  },

  // --- Uncommon (Необычные) ---
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
    description: '+2.4% к шансу нанести критический удар.',
    stackText: '+2.4% шанс за стак'
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
  overclock_module: {
    id: 'overclock_module',
    name: 'Модуль Разгона',
    rarity: 'uncommon',
    icon: '⚙️',
    color: '#22c55e',
    description: '+10% к скорости атаки всех оружий героя.',
    stackText: '+10% к скорости за стак'
  },

  // --- Rare (Редкие) ---
  crit_lens: {
    id: 'crit_lens',
    name: 'Линза Критовика',
    rarity: 'rare',
    icon: '🎯',
    color: '#38bdf8',
    description: '+3% к шансу критического удара (суммируется вплоть до 100%).',
    stackText: '+3% крит. шанс за стак'
  },
  heavy_hollowpoint: {
    id: 'heavy_hollowpoint',
    name: 'Тяжёлый Наконечник',
    rarity: 'rare',
    icon: '💥',
    color: '#38bdf8',
    description: '+20% к критическому урону (суммируется вплоть до 1000%).',
    stackText: '+20% крит. урон за стак'
  },
  energy_amplifier: {
    id: 'energy_amplifier',
    name: 'Квантовый Резонатор',
    rarity: 'rare',
    icon: '⚡',
    color: '#38bdf8',
    description: '+18% к общему урону всех видов оружия героя.',
    stackText: '+18% урон за стак'
  },

  // --- Legendary (Легендарные) ---
  singularity_core: {
    id: 'singularity_core',
    name: 'Ядро Сингулярности',
    rarity: 'legendary',
    icon: '🕳️',
    color: '#f59e0b',
    description: 'Каждое 10-е убийство создает гравитационную воронку, затягивающую мобов и взрывающуюся на 600% урона.',
    stackText: '-2 к требуемым убийствам и +200% урона за стак'
  },
  orbital_strike: {
    id: 'orbital_strike',
    name: 'Орбитальный Удар',
    rarity: 'legendary',
    icon: '🛰️',
    color: '#f59e0b',
    description: 'Каждые 12 сек орбитальный спутник выжигает мощнейшего врага лучом на 800% урона.',
    stackText: '-2 сек перезарядка за стак'
  },
  chronos_phylactery: {
    id: 'chronos_phylactery',
    name: 'Кристалл Времени',
    rarity: 'legendary',
    icon: '⏳',
    color: '#f59e0b',
    description: 'Предотвращает смертельный урон, замораживая время вокруг на 3 сек и восстанавливая 50% HP (раз за стадию).',
    stackText: '+25% исцеления за стак'
  },
  titan_heart: {
    id: 'titan_heart',
    name: 'Сердце Титана',
    rarity: 'legendary',
    icon: '🫀',
    color: '#f59e0b',
    description: '+150 к максимальному здоровью и +15 HP/сек регенерации.',
    stackText: '+150 HP и +15 HP/сек за стак'
  },
  void_catalyst: {
    id: 'void_catalyst',
    name: 'Катализатор Бездны',
    rarity: 'legendary',
    icon: '🔮',
    color: '#f59e0b',
    description: '+40% к критическому урону и +15% к общему урону героя.',
    stackText: '+40% крит. урон и +15% урон за стак'
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
  'crit_visor',
  'bio_leech',
  'overclock_module'
];

export const RARE_ITEMS: RiftItemId[] = [
  'crit_lens',
  'heavy_hollowpoint',
  'energy_amplifier'
];

export const LEGENDARY_ITEMS: RiftItemId[] = [
  'chronos_phylactery',
  'titan_heart',
  'void_catalyst'
];

export const BOSS_ITEMS: RiftItemId[] = [
  'golem_core',
  'molten_scale'
];

export function getItemsByGrade(grade: WeaponGrade): RiftItemId[] {
  switch (grade) {
    case 'legendary': return LEGENDARY_ITEMS;
    case 'rare': return RARE_ITEMS;
    case 'uncommon': return UNCOMMON_ITEMS;
    default: return COMMON_ITEMS;
  }
}

/**
 * Rolls an item drop based on stage/biome probabilities.
 */
export function rollRiftItemByStage(
  stageNumber: number,
  rng: () => number = Math.random
): RiftItemDef {
  const grade = rollWeaponGrade(stageNumber, rng);
  const items = getItemsByGrade(grade);
  const id = items[Math.floor(rng() * items.length)];
  return RIFT_ITEMS[id];
}

/**
 * Rolls two distinct item drops from a chest (no duplicates allowed).
 */
export function rollChestDropPair(
  stageNumber: number,
  rng: () => number = Math.random
): [RiftItemDef, RiftItemDef] {
  const item1 = rollRiftItemByStage(stageNumber, rng);
  let item2 = rollRiftItemByStage(stageNumber, rng);
  let attempts = 0;
  while (item2.id === item1.id && attempts < 25) {
    item2 = rollRiftItemByStage(stageNumber, rng);
    attempts++;
  }
  // Guarantee non-duplicate options
  if (item2.id === item1.id) {
    const candidates = [
      ...COMMON_ITEMS,
      ...UNCOMMON_ITEMS,
      ...RARE_ITEMS,
      ...LEGENDARY_ITEMS
    ].filter(id => id !== item1.id);
    if (candidates.length > 0) {
      const fallbackId = candidates[Math.floor(rng() * candidates.length)];
      item2 = RIFT_ITEMS[fallbackId];
    }
  }
  return [item1, item2];
}

/**
 * Legacy weights roller kept for backwards compatibility.
 */
export function rollRiftItem(weights: { common: number; uncommon: number; rare?: number; legendary: number; boss?: number }): RiftItemDef {
  const rareWeight = weights.rare ?? 0;
  const total = weights.common + weights.uncommon + rareWeight + weights.legendary + (weights.boss ?? 0);
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

  if (roll < rareWeight) {
    const id = RARE_ITEMS[Math.floor(Math.random() * RARE_ITEMS.length)];
    return RIFT_ITEMS[id];
  }
  roll -= rareWeight;

  if (roll < weights.legendary) {
    const id = LEGENDARY_ITEMS[Math.floor(Math.random() * LEGENDARY_ITEMS.length)];
    return RIFT_ITEMS[id];
  }

  const bossId = BOSS_ITEMS[Math.floor(Math.random() * BOSS_ITEMS.length)];
  return RIFT_ITEMS[bossId];
}
