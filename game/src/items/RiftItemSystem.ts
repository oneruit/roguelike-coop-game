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
  | 'aegis_exoskeleton'
  | 'bio_leech'
  | 'overclock_module'
  // Rare (Редкие / Синие)
  | 'crit_lens'
  | 'heavy_hollowpoint'
  | 'energy_amplifier'
  | 'phase_carapace'
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
    description: '+10% к скорострельности оружий.',
    stackText: '+10% за стак'
  },
  nanite_plating: {
    id: 'nanite_plating',
    name: 'Нано-Броня',
    rarity: 'common',
    icon: '🛡️',
    color: '#94a3b8',
    description: 'Снижает получаемый урон (5% на 1 ур., с угасающей эффективностью до 60% на 20 ур.).',
    stackText: '+снижение урона (макс. 60%)'
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
    description: '+3.0% к шансу нанести критический удар.',
    stackText: '+3.0% шанс за стак'
  },
  aegis_exoskeleton: {
    id: 'aegis_exoskeleton',
    name: 'Экзоскелет «Эгида»',
    rarity: 'uncommon',
    icon: '🛡️',
    color: '#22c55e',
    description: 'Ускоряет перезарядку брони на -0.25 сек и повышает скорость восстановления на +25%.',
    stackText: '-0.25с задержки и +25% скорости за стак (макс. 5)'
  },
  bio_leech: {
    id: 'bio_leech',
    name: 'Био-Пипетка',
    rarity: 'uncommon',
    icon: '🧬',
    color: '#22c55e',
    description: 'Восстанавливает +2 HP и 0.6% от макс. HP при каждом уничтожении врага.',
    stackText: '+2 HP и +0.6% за стак'
  },
  overclock_module: {
    id: 'overclock_module',
    name: 'Модуль Разгона',
    rarity: 'uncommon',
    icon: '⚙️',
    color: '#22c55e',
    description: '+18% к скорости атаки всех оружий героя.',
    stackText: '+18% к скорости за стак'
  },

  // --- Rare (Редкие) ---
  crit_lens: {
    id: 'crit_lens',
    name: 'Линза Критовика',
    rarity: 'rare',
    icon: '🎯',
    color: '#38bdf8',
    description: '+4.0% к шансу критического удара (суммируется вплоть до 100%).',
    stackText: '+4.0% крит. шанс за стак'
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
    description: '+12% к общему урону всех видов оружия героя.',
    stackText: '+12% урон за стак'
  },
  phase_carapace: {
    id: 'phase_carapace',
    name: 'Фазовый Панцирь',
    rarity: 'rare',
    icon: '💠',
    color: '#38bdf8',
    description: 'Увеличивает максимальную емкость брони на +50 (максимум до 350).',
    stackText: '+50 к макс. броне за стак (макс. 350)'
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
    description: 'Предотвращает смертельный урон, замораживая всех монстров и боссов на 5 сек, отталкивая их на 25м и восстанавливая 50% HP. Расходуется по 1 шт. при использовании.',
    stackText: '+1 спасение от гибели за каждый кристалл'
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
    description: '+25% к критическому урону и +10% к общему урону героя.',
    stackText: '+25% крит. урон и +10% урон за стак'
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
  'health_vial'
];

export const UNCOMMON_ITEMS: RiftItemId[] = [
  'crit_visor',
  'aegis_exoskeleton',
  'bio_leech',
  'overclock_module'
];

export const RARE_ITEMS: RiftItemId[] = [
  'crit_lens',
  'heavy_hollowpoint',
  'energy_amplifier',
  'phase_carapace'
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
 * Filters out items whose parameters are already maxed out for the player.
 */
export function rollRiftItemByStage(
  stageNumber: number,
  rng: () => number = Math.random,
  excludeChronos: boolean = false,
  isItemMaxed?: (id: string) => boolean
): RiftItemDef {
  const grade = rollWeaponGrade(stageNumber, rng);
  let items = getItemsByGrade(grade);
  if (excludeChronos && grade === 'legendary') {
    items = items.filter(id => id !== 'chronos_phylactery');
  }
  if (isItemMaxed) {
    const unmaxed = items.filter(id => !isItemMaxed(id));
    if (unmaxed.length > 0) items = unmaxed;
  }
  const id = items[Math.floor(rng() * items.length)];
  return RIFT_ITEMS[id];
}

/**
 * Rolls two distinct item drops from a chest (no duplicates allowed).
 * Filters out items whose parameters are already maxed out for the player.
 */
export function rollChestDropPair(
  stageNumber: number,
  rng: () => number = Math.random,
  excludeChronos: boolean = false,
  isItemMaxed?: (id: string) => boolean,
  chestTier?: 'small' | 'large' | 'legendary'
): [RiftItemDef, RiftItemDef] {
  let item1: RiftItemDef;
  // Large chests grant Phase Carapace to incrementally scale player armor up to 350 max
  if (chestTier === 'large' && isItemMaxed && !isItemMaxed('phase_carapace') && rng() < 0.65) {
    item1 = RIFT_ITEMS['phase_carapace'];
  } else {
    item1 = rollRiftItemByStage(stageNumber, rng, excludeChronos, isItemMaxed);
  }
  const excludeForSecond = excludeChronos || item1.id === 'chronos_phylactery';
  let item2 = rollRiftItemByStage(stageNumber, rng, excludeForSecond, isItemMaxed);
  let attempts = 0;
  while (item2.id === item1.id && attempts < 25) {
    item2 = rollRiftItemByStage(stageNumber, rng, excludeForSecond, isItemMaxed);
    attempts++;
  }
  // Guarantee non-duplicate options
  if (item2.id === item1.id) {
    let candidates = [
      ...COMMON_ITEMS,
      ...UNCOMMON_ITEMS,
      ...RARE_ITEMS,
      ...LEGENDARY_ITEMS
    ].filter(id => id !== item1.id && (!excludeForSecond || id !== 'chronos_phylactery'));
    if (isItemMaxed) {
      const unmaxed = candidates.filter(id => !isItemMaxed(id));
      if (unmaxed.length > 0) candidates = unmaxed;
    }
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
