import { GameBalanceState } from './BalanceTypes';

export const DEFAULT_BALANCE: GameBalanceState = {
  weapons: {
    fireball: {
      id: 'fireball',
      name: 'Огненный Шар',
      icon: '☄️',
      damage: 55,
      cooldown: 1.35,
      damagePerLevel: 10,
      maxLevel: 20,
      range: 22,
      explosionRadius: 2.5,
      fallSpeed: 28,
      count: 1,
      notes: 'Падающий с неба огненный метеор с детонацией'
    },
    bow: {
      id: 'bow',
      name: 'Охотничий Лук',
      icon: '🏹',
      damage: 26,
      cooldown: 0.85,
      damagePerLevel: 6,
      maxLevel: 20,
      speed: 24,
      pierce: 2,
      count: 1,
      notes: 'Высокоскоростные стрелы с пробитием'
    },
    kukri: {
      id: 'kukri',
      name: 'Нож Кукри',
      icon: '🔪',
      damage: 12,
      cooldown: 0.65,
      damagePerLevel: 3,
      maxLevel: 20,
      count: 2,
      pierce: 1,
      notes: 'Серийные броски вращающихся клинков'
    },
    orbiting_barrier: {
      id: 'orbiting_barrier',
      name: 'Коса Жнеца',
      icon: '🌙',
      damage: 4,
      cooldown: 0.0,
      damagePerLevel: 1,
      maxLevel: 20,
      bleedDps: 8,
      bleedDuration: 3.0,
      orbitRadius: 2.5,
      orbitSpeed: 3.8,
      count: 2,
      notes: 'Вращающиеся косы со стакающимся кровотечением'
    },
    holy_aura: {
      id: 'holy_aura',
      name: 'Огненное Кольцо',
      icon: '🔥',
      damage: 16,
      cooldown: 0.50,
      damagePerLevel: 4,
      maxLevel: 20,
      explosionRadius: 3.5,
      notes: 'Анимированная аура пламени с периодическим тиком'
    },
    katana_slash: {
      id: 'katana_slash',
      name: 'Рассекающий Клинок',
      icon: '🗡️',
      damage: 25,
      cooldown: 0.60,
      damagePerLevel: 6,
      maxLevel: 20,
      explosionRadius: 3.8,
      notes: 'Дуговой силовой рубящий удар'
    },
    whirlwind_slash: {
      id: 'whirlwind_slash',
      name: 'Багровый Вихрь',
      icon: '🌪️',
      damage: 16,
      cooldown: 0.42,
      damagePerLevel: 4,
      maxLevel: 20,
      explosionRadius: 3.6,
      notes: 'Быстрый парный вихревой круговой взмах'
    },
    greatsword: {
      id: 'greatsword',
      name: 'Двуручный Меч',
      icon: '⚔️',
      damage: 32,
      cooldown: 0.70,
      damagePerLevel: 7,
      maxLevel: 20,
      explosionRadius: 4.2,
      notes: 'Тяжелый круговой удар с огромной зоной поражения'
    },
    flail: {
      id: 'flail',
      name: 'Боевой Цеп',
      icon: '⛓️',
      damage: 20,
      cooldown: 0.52,
      damagePerLevel: 5,
      maxLevel: 20,
      explosionRadius: 3.9,
      knockback: 0.35,
      notes: 'Физический контроль толпы с сильным отбросом мобов'
    },
    astral_staff: {
      id: 'astral_staff',
      name: 'Звёздный Посох',
      icon: '🔮',
      damage: 22,
      cooldown: 0.65,
      damagePerLevel: 5,
      maxLevel: 20,
      range: 22,
      speed: 16,
      count: 1,
      pierce: 2,
      notes: 'Магические астральные сферы веером'
    },
    chakram: {
      id: 'chakram',
      name: 'Танцующий Чакрам',
      icon: '🪃',
      damage: 20,
      cooldown: 0.70,
      damagePerLevel: 4,
      maxLevel: 20,
      range: 20,
      speed: 14.5,
      count: 1,
      notes: 'Возвращающийся бумеранг по эллиптической дуге'
    },
    lightning_strike: {
      id: 'lightning_strike',
      name: 'Удар Молнии',
      icon: '⚡',
      damage: 45,
      cooldown: 1.20,
      damagePerLevel: 8,
      maxLevel: 20,
      range: 22,
      splashRadius: 2.4,
      count: 1,
      notes: 'Грозовой вертикальный разряд с небес с АОЕ сплешем'
    },
    ice_spike: {
      id: 'ice_spike',
      name: 'Ледяной Шип',
      icon: '🧊',
      damage: 38,
      cooldown: 1.10,
      damagePerLevel: 7,
      maxLevel: 20,
      range: 18,
      splashRadius: 2.0,
      count: 1,
      notes: 'Пронзающие ледяные пики из-под земли'
    },
    turret: {
      id: 'turret',
      name: 'Авто-Турель',
      icon: '🏗️',
      damage: 16,
      cooldown: 4.0,
      damagePerLevel: 4,
      maxLevel: 20,
      range: 14,
      count: 1,
      notes: 'Стационарная автоматическая турель, ведущая скорострельный огонь'
    }
  },
  heroes: {
    ronin: {
      id: 'ronin',
      name: 'Рен (Ронин)',
      maxHp: 115,
      baseSpeed: 8.6,
      damageMultiplier: 1.35,
      startingWeapon: 'whirlwind_slash',
      role: 'Сбалансированный боец ближнего боя'
    },
    valkyrie: {
      id: 'valkyrie',
      name: 'Каэла (Валькирия)',
      maxHp: 135,
      baseSpeed: 8.2,
      damageMultiplier: 1.45,
      startingWeapon: 'greatsword',
      role: 'Сверхживучий танк с максимальным уроном'
    },
    flail: {
      id: 'flail',
      name: 'Бригитта',
      maxHp: 125,
      baseSpeed: 8.5,
      damageMultiplier: 1.40,
      startingWeapon: 'flail',
      role: 'Контроль толпы и сильное отбрасывание'
    },
    sorceress: {
      id: 'sorceress',
      name: 'Ария (Чародейка)',
      maxHp: 105,
      baseSpeed: 8.8,
      damageMultiplier: 1.30,
      startingWeapon: 'astral_staff',
      role: 'Дальнобойный маг с пробивающими зарядами'
    },
    chakram: {
      id: 'chakram',
      name: 'Кира',
      maxHp: 115,
      baseSpeed: 8.7,
      damageMultiplier: 1.35,
      startingWeapon: 'chakram',
      role: 'Мобильный скирмишер с рикошетящими бумерангами'
    },
    archer: {
      id: 'archer',
      name: 'Эльф лучник',
      maxHp: 110,
      baseSpeed: 8.9,
      damageMultiplier: 1.35,
      startingWeapon: 'bow',
      role: 'Сверхбыстрый снайпер с дальнобойными стрелами'
    },
    torbjorn: {
      id: 'torbjorn',
      name: 'Торбьорн (Инженер)',
      maxHp: 130,
      baseSpeed: 8.3,
      damageMultiplier: 1.35,
      startingWeapon: 'turret',
      role: 'Мастер-оружейник, строит автоматические турели'
    }
  },
  monsters: {
    coyote: {
      id: 'coyote',
      name: 'Кровожадный койот',
      hp: 48,
      speed: 5.4,
      damage: 8,
      gemType: 'blue',
      description: 'Стартовый стайный моб, бежит напрямую к герою'
    },
    crawler: {
      id: 'crawler',
      name: 'Ползучая тварь',
      hp: 40,
      speed: 6.0,
      damage: 10,
      gemType: 'blue',
      description: 'Быстрый преследователь с низким HP'
    },
    cactus: {
      id: 'cactus',
      name: 'Кактусовый зомби',
      hp: 88,
      speed: 3.5,
      damage: 14,
      gemType: 'blue',
      description: 'Медленный плотный зомби'
    },
    skeleton: {
      id: 'skeleton',
      name: 'Бандит-скелет',
      hp: 110,
      speed: 3.8,
      damage: 16,
      gemType: 'green',
      description: 'Среднеуровневый костяной боец'
    },
    ghost: {
      id: 'ghost',
      name: 'Призрак ковбоя',
      hp: 140,
      speed: 4.0,
      damage: 18,
      gemType: 'green',
      description: 'Пролетает сквозь любые препятствия'
    },
    scorpion: {
      id: 'scorpion',
      name: 'Скорпион-ползун',
      hp: 190,
      speed: 3.2,
      damage: 22,
      gemType: 'green',
      description: 'Крепкий танк первой линии'
    },
    brute: {
      id: 'brute',
      name: 'Пустынный громила',
      hp: 350,
      speed: 2.6,
      damage: 28,
      gemType: 'green',
      description: 'Тяжёлый бронированный монстр'
    },
    bison: {
      id: 'bison',
      name: 'Белый бизон-убийца',
      hp: 720,
      speed: 4.8,
      damage: 35,
      gemType: 'red',
      description: 'Быстрый смертоносный танк (чардж-атаки)'
    }
  },
  bosses: {
    boss: {
      id: 'boss',
      name: 'Кровавый демон',
      hp: 7600,
      speed: 2.4,
      damage: 45,
      description: 'Базовый 5-минутный босс 1 тира'
    },
    hydra: {
      id: 'hydra',
      name: 'Трехглавая гидра',
      hp: 28000,
      speed: 2.3,
      damage: 65,
      description: 'Древняя трехглавая гидра 2 тира'
    }
  },
  global: {
    dashCooldown: 2.5,
    dashDuration: 0.22,
    baseCritChance: 0.05,
    baseCritDamageMult: 2.0,
    basePickupRadius: 3.5,
    maxArmorReduction: 0.75,
    goldGemChanceNormal: 0.01,
    goldGemChanceBoss: 0.40
  }
};
