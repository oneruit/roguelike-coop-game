import { INVOKER_SPELL_IDS, INVOKER_SPELLS, invokerWeaponId, INVOKE_BASE_DAMAGE, INVOKE_DAMAGE_PER_LEVEL } from '../shared/InvokerSpells';
import { GameBalanceState } from './BalanceTypes';

export const DEFAULT_BALANCE: GameBalanceState = {
  weapons: {
    invoker_invoke: {
      id: 'invoker_invoke', name: 'Invoke — Случайное заклинание', icon: '🔮', damage: INVOKE_BASE_DAMAGE,
      cooldown: 1.4, damagePerLevel: INVOKE_DAMAGE_PER_LEVEL, maxLevel: 12, range: 22,
      notes: 'При каждом срабатывании равновероятно выбирает одно из десяти заклинаний Инвокера.'
    },
    ...Object.fromEntries(INVOKER_SPELL_IDS.map(spell => {
      const def = INVOKER_SPELLS[spell];
      const id = invokerWeaponId(spell);
      return [id, {
        id, name: def.name, icon: def.icon, damage: def.damage, cooldown: def.cooldown,
        damagePerLevel: def.damage === 0 ? 0 : 8, maxLevel: 12, range: 22,
        explosionRadius: def.radius, notes: def.description
      }];
    })),
    fireball: {
      id: 'fireball',
      name: 'Огненный Шар',
      icon: '☄️',
      damage: 52,
      cooldown: 1.35,
      damagePerLevel: 14,
      maxLevel: 12,
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
      damage: 25,
      cooldown: 0.85,
      damagePerLevel: 8,
      maxLevel: 12,
      speed: 24,
      pierce: 2,
      count: 1,
      notes: 'Высокоскоростные стрелы с пробитием'
    },
    kukri: {
      id: 'kukri',
      name: 'Нож Кукри',
      icon: '🔪',
      damage: 11,
      cooldown: 0.65,
      damagePerLevel: 4,
      maxLevel: 12,
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
      damagePerLevel: 2,
      maxLevel: 12,
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
      damage: 15,
      cooldown: 0.50,
      damagePerLevel: 6,
      maxLevel: 12,
      explosionRadius: 3.5,
      notes: 'Анимированная аура пламени с периодическим тиком'
    },
    katana_slash: {
      id: 'katana_slash',
      name: 'Рассекающий Клинок',
      icon: '🗡️',
      damage: 24,
      cooldown: 0.60,
      damagePerLevel: 8,
      maxLevel: 12,
      explosionRadius: 3.8,
      notes: 'Дуговой силовой рубящий удар'
    },
    whirlwind_slash: {
      id: 'whirlwind_slash',
      name: 'Багровый Вихрь',
      icon: '🌪️',
      damage: 15,
      cooldown: 0.42,
      damagePerLevel: 6,
      maxLevel: 12,
      explosionRadius: 3.6,
      notes: 'Быстрый парный вихревой круговой взмах'
    },
    greatsword: {
      id: 'greatsword',
      name: 'Двуручный Меч',
      icon: '⚔️',
      damage: 30,
      cooldown: 0.70,
      damagePerLevel: 10,
      maxLevel: 12,
      explosionRadius: 4.2,
      notes: 'Тяжелый круговой удар с огромной зоной поражения'
    },
    flail: {
      id: 'flail',
      name: 'Боевой Цеп',
      icon: '⛓️',
      damage: 19,
      cooldown: 0.52,
      damagePerLevel: 7,
      maxLevel: 12,
      explosionRadius: 3.9,
      knockback: 0.35,
      notes: 'Физический контроль толпы с сильным отбросом мобов'
    },
    astral_staff: {
      id: 'astral_staff',
      name: 'Звёздный Посох',
      icon: '🔮',
      damage: 21,
      cooldown: 0.65,
      damagePerLevel: 7,
      maxLevel: 12,
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
      damage: 19,
      cooldown: 0.70,
      damagePerLevel: 6,
      maxLevel: 12,
      range: 20,
      speed: 14.5,
      count: 1,
      notes: 'Возвращающийся бумеранг по эллиптической дуге'
    },
    lightning_strike: {
      id: 'lightning_strike',
      name: 'Удар Молнии',
      icon: '⚡',
      damage: 42,
      cooldown: 1.20,
      damagePerLevel: 12,
      maxLevel: 12,
      range: 22,
      splashRadius: 2.4,
      count: 1,
      notes: 'Грозовой вертикальный разряд с небес с АОЕ сплешем'
    },
    ice_spike: {
      id: 'ice_spike',
      name: 'Ледяной Шип',
      icon: '🧊',
      damage: 36,
      cooldown: 1.10,
      damagePerLevel: 10,
      maxLevel: 12,
      range: 18,
      splashRadius: 2.0,
      count: 1,
      notes: 'Пронзающие ледяные пики из-под земли'
    },
    assault_rifle: {
      id: 'assault_rifle',
      name: 'Штурмовая Винтовка',
      icon: '🔫',
      damage: 13,
      cooldown: 0.18,
      damagePerLevel: 4,
      maxLevel: 12,
      speed: 32,
      pierce: 1,
      count: 1,
      notes: 'Скорострельная автоматическая винтовка с ураганным темпом стрельбы'
    }
  },
  heroes: {
    invoker: { id:'invoker', name:'Инвокер', maxHp:100, baseSpeed:8.5, damageMultiplier:3.0,
      startingWeapon:'invoker_invoke', role:'Маг десяти случайных заклинаний: урон, контроль и усиления' },
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
    rocket: {
      id: 'rocket',
      name: 'Ракета (Енот)',
      maxHp: 105,
      baseSpeed: 9.1,
      damageMultiplier: 1.35,
      startingWeapon: 'assault_rifle',
      role: 'Сверхбыстрый коммандос с автоматической винтовкой'
    },
    necromancer: {
      id: 'necromancer',
      name: 'Мортис (Некромант)',
      maxHp: 110,
      baseSpeed: 8.6,
      damageMultiplier: 1.40,
      startingWeapon: 'astral_staff',
      role: 'Маг смерти: дальнобойные мистические снаряды и контроль поля боя'
    },
    amazon: {
      id: 'amazon',
      name: 'Амазонка',
      maxHp: 120,
      baseSpeed: 9.0,
      damageMultiplier: 1.35,
      startingWeapon: 'orbiting_barrier',
      role: 'Мистическая воительница: парящие защитные и атакующие магические сферы'
    }
  },
  monsters: {
    coyote: {
      id: 'coyote',
      name: 'Кровожадный койот',
      hp: 52,
      speed: 5.4,
      damage: 10,
      gemType: 'blue',
      description: 'Стартовый стайный моб, бежит напрямую к герою'
    },
    crawler: {
      id: 'crawler',
      name: 'Ползучая тварь',
      hp: 45,
      speed: 6.0,
      damage: 12,
      gemType: 'blue',
      description: 'Быстрый преследователь с низким HP'
    },
    cactus: {
      id: 'cactus',
      name: 'Кактусовый зомби',
      hp: 95,
      speed: 3.5,
      damage: 16,
      gemType: 'blue',
      description: 'Медленный плотный зомби'
    },
    skeleton: {
      id: 'skeleton',
      name: 'Бандит-скелет',
      hp: 120,
      speed: 3.8,
      damage: 18,
      gemType: 'green',
      description: 'Среднеуровневый костяной боец'
    },
    ghost: {
      id: 'ghost',
      name: 'Призрак ковбоя',
      hp: 150,
      speed: 4.0,
      damage: 20,
      gemType: 'green',
      description: 'Пролетает сквозь любые препятствия'
    },
    scorpion: {
      id: 'scorpion',
      name: 'Скорпион-ползун',
      hp: 210,
      speed: 3.2,
      damage: 25,
      gemType: 'green',
      description: 'Крепкий танк первой линии'
    },
    brute: {
      id: 'brute',
      name: 'Пустынный громила',
      hp: 380,
      speed: 2.6,
      damage: 32,
      gemType: 'green',
      description: 'Тяжёлый бронированный монстр'
    },
    bison: {
      id: 'bison',
      name: 'Белый бизон-убийца',
      hp: 800,
      speed: 4.8,
      damage: 40,
      gemType: 'red',
      description: 'Быстрый смертоносный танк (чардж-атаки)'
    }
  },
  bosses: {
    boss: {
      id: 'boss',
      name: 'Кровавый демон',
      hp: 8200,
      speed: 2.4,
      damage: 55,
      description: 'Базовый 5-минутный босс 1 тира'
    },
    hydra: {
      id: 'hydra',
      name: 'Трехглавая гидра',
      hp: 30000,
      speed: 2.3,
      damage: 75,
      description: 'Древняя трехглавая гидра 2 тира'
    }
  },
  passives: {
    stat_sheriff_star: {
      id: 'stat_sheriff_star',
      name: 'Звезда Шерифа',
      icon: '⭐',
      description: '+2% к урону всех оружий',
      baseValue: 2,
      perStackValue: 2,
      scalingType: 'additive',
      notes: 'Аддитивное масштабирование: 100 стаков = +200%, без ограничения'
    },
    stat_spurs: {
      id: 'stat_spurs',
      name: 'Ковбойские Шпоры',
      icon: '👢',
      description: '+3% к скорости передвижения (макс. 2.5x)',
      baseValue: 3,
      perStackValue: 3,
      maxValue: 250,
      scalingType: 'multiplicative',
      notes: 'Мультипликативный множитель скорости: x1.03 за стак, потолок x2.5'
    },
    stat_flask: {
      id: 'stat_flask',
      name: 'Походная Фляга',
      icon: '🍶',
      description: '+30 к максимальному здоровью и мгновенное исцеление',
      baseValue: 30,
      perStackValue: 30,
      scalingType: 'additive',
      notes: 'Увеличивает макс. HP и сразу восполняет текущее здоровье'
    },
    stat_lasso: {
      id: 'stat_lasso',
      name: 'Магнитное Лассо',
      icon: '➰',
      description: '+35% к радиусу притяжения кристаллов',
      baseValue: 35,
      perStackValue: 35,
      maxValue: 25,
      scalingType: 'multiplicative',
      notes: '4.2м * 1.35^n, максимальный радиус ограничен 25 метрами'
    },
    stat_amulet: {
      id: 'stat_amulet',
      name: 'Охотничий Амулет',
      icon: '🧿',
      description: '+1 HP/сек пассивной регенерации',
      baseValue: 1,
      perStackValue: 1,
      scalingType: 'additive',
      notes: '+1 HP/сек за каждый полученный амулет без лимита'
    },
    stat_vest: {
      id: 'stat_vest',
      name: 'Кожаный Жилет',
      icon: '🦺',
      description: '-2% к получаемому урону (угасающая эффективность до 70% на 300 ур.)',
      baseValue: 2,
      perStackValue: 2,
      maxValue: 70,
      scalingType: 'diminishing',
      notes: '1 уровень = 2%, на 300 уровне = 70% (максимальный лимит 70%)'
    },
    stat_watch: {
      id: 'stat_watch',
      name: 'Карманные Часы',
      icon: '⏱️',
      description: '+1% к ускорению перезарядки оружий (макс. 25%)',
      baseValue: 1,
      perStackValue: 1,
      maxValue: 25,
      scalingType: 'additive',
      notes: 'Снижает КД на 1% за стак до жесткого капа 25%'
    }
  },
  items: {
    kinetic_injector: {
      id: 'kinetic_injector',
      name: 'Кинетический Ускоритель',
      rarity: 'common',
      icon: '⚡',
      color: '#94a3b8',
      description: '+15% к скорострельности оружий',
      stackText: '+15% за стак',
      baseValue: 15,
      scaling: '0.85^n множитель перезарядки'
    },
    nanite_plating: {
      id: 'nanite_plating',
      name: 'Нано-Броня',
      rarity: 'common',
      icon: '🛡️',
      color: '#94a3b8',
      description: 'Снижает входящий урон (5% на 1 ур., до 60% на 20 ур.)',
      stackText: '+снижение урона (макс. 60%)',
      baseValue: 5,
      scaling: 'Угасающая эффективность до 60% на 20 ур.'
    },
    adrenaline_dart: {
      id: 'adrenaline_dart',
      name: 'Стимулятор Сердца',
      rarity: 'common',
      icon: '💉',
      color: '#94a3b8',
      description: '+12% к скорости перемещения',
      stackText: '+12% к скорости за стак',
      baseValue: 12,
      scaling: '+12% за стак'
    },
    pulse_rounds: {
      id: 'pulse_rounds',
      name: 'Импульсный Патрон',
      rarity: 'common',
      icon: '🩸',
      color: '#94a3b8',
      description: '15% шанс наложить кровотечение (180% урона за 3 сек)',
      stackText: '+15% шанс за стак',
      baseValue: 15,
      scaling: '+15% шанс кровотечения за стак'
    },
    health_vial: {
      id: 'health_vial',
      name: 'Био-Инжектор',
      rarity: 'common',
      icon: '🧪',
      color: '#94a3b8',
      description: '+2.5 HP/сек пассивной регенерации',
      stackText: '+2.5 HP/сек за стак',
      baseValue: 2.5,
      scaling: '+2.5 HP/сек за стак'
    },
    chain_lightning: {
      id: 'chain_lightning',
      name: 'Тесла-Катушка',
      rarity: 'uncommon',
      icon: '🌩️',
      color: '#22c55e',
      description: '25% шанс выпустить цепную молнию по 3 врагам на 160% урона',
      stackText: '+2 цели и +30% урона за стак',
      baseValue: 25,
      scaling: '+2 цели и +30% урона'
    },
    plasma_detonator: {
      id: 'plasma_detonator',
      name: 'Плазменный Детонатор',
      rarity: 'uncommon',
      icon: '💥',
      color: '#22c55e',
      description: 'Уничтожение врага вызывает детонацию радиусом 4м на 200% базового урона',
      stackText: '+1м радиус и +50% урона за стак',
      baseValue: 200,
      scaling: '+1м радиус и +50% урона'
    },
    crit_visor: {
      id: 'crit_visor',
      name: 'Очки Снайпера',
      rarity: 'uncommon',
      icon: '🎯',
      color: '#22c55e',
      description: '+2.4% к шансу нанести критический удар',
      stackText: '+2.4% шанс за стак',
      baseValue: 2.4,
      scaling: '+2.4% шанс крита за стак'
    },
    aegis_battery: {
      id: 'aegis_battery',
      name: 'Гипер-Щит Защиты',
      rarity: 'uncommon',
      icon: '💠',
      color: '#22c55e',
      description: 'Постоянно генерирует энергощит до +35 HP, восстанавливающийся вне боя',
      stackText: '+35 макс. емкости щита за стак',
      baseValue: 35,
      scaling: '+35 к емкости щита'
    },
    bio_leech: {
      id: 'bio_leech',
      name: 'Био-Пипетка',
      rarity: 'uncommon',
      icon: '🧬',
      color: '#22c55e',
      description: 'Восстанавливает +2 HP при каждом уничтожении врага',
      stackText: '+2 HP за стак',
      baseValue: 2,
      scaling: '+2 HP за уничтожение'
    },
    overclock_module: {
      id: 'overclock_module',
      name: 'Модуль Разгона',
      rarity: 'uncommon',
      icon: '⚙️',
      color: '#22c55e',
      description: '+10% к скорости атаки всех оружий героя',
      stackText: '+10% к скорости за стак',
      baseValue: 10,
      scaling: '0.90^n множитель перезарядки'
    },
    crit_lens: {
      id: 'crit_lens',
      name: 'Линза Критовика',
      rarity: 'rare',
      icon: '🔍',
      color: '#3b82f6',
      description: '+3.0% к шансу нанести критический удар (макс. 100%)',
      stackText: '+3.0% шанс за стак',
      baseValue: 3.0,
      scaling: '+3% шанс крита за стак'
    },
    heavy_hollowpoint: {
      id: 'heavy_hollowpoint',
      name: 'Экспансивные Пули',
      rarity: 'rare',
      icon: '🪓',
      color: '#3b82f6',
      description: '+20% к множителю критического урона (макс. 1000%)',
      stackText: '+20% множитель за стак',
      baseValue: 20,
      scaling: '+20% крит. множитель за стак'
    },
    energy_amplifier: {
      id: 'energy_amplifier',
      name: 'Усилитель Энергии',
      rarity: 'rare',
      icon: '🔋',
      color: '#3b82f6',
      description: '+18% ко всему наносимому урону героя',
      stackText: '+18% урона за стак',
      baseValue: 18,
      scaling: '+18% урон за стак'
    },
    singularity_core: {
      id: 'singularity_core',
      name: 'Ядро Сингулярности',
      rarity: 'legendary',
      icon: '🌀',
      color: '#f97316',
      description: 'Каждые 10 убийств (-2/стак, мин 3) стягивает врагов и наносит 600% (+200%/стак) урона',
      stackText: '-2 к требуемым убийствам и +200% урона',
      baseValue: 600,
      scaling: '-2 убийства, +200% урона'
    },
    orbital_strike: {
      id: 'orbital_strike',
      name: 'Орбитальный Удар',
      rarity: 'legendary',
      icon: '🛰️',
      color: '#f97316',
      description: 'Каждые 12 сек (-1.5с/стак, мин 4с) бьёт ионный луч радиусом 4.5м на 850% (+250%/стак) урона',
      stackText: '-1.5с к КД и +250% урона',
      baseValue: 850,
      scaling: '-1.5с КД, +250% урона'
    },
    chronos_phylactery: {
      id: 'chronos_phylactery',
      name: 'Хронос-Филактерия',
      rarity: 'legendary',
      icon: '⏳',
      color: '#f97316',
      description: 'При получении смертельного урона замораживает время на 3.5с и восстанавливает 50% HP',
      stackText: '+1с заморозки и +20% HP за стак',
      baseValue: 50,
      scaling: 'Спасение от гибели 1 раз за уровень'
    },
    titan_heart: {
      id: 'titan_heart',
      name: 'Сердце Титана',
      rarity: 'legendary',
      icon: '🫀',
      color: '#f97316',
      description: '+15 HP/сек регенерации здоровья и +150 макс. HP',
      stackText: '+15 HP/сек и +150 HP за стак',
      baseValue: 15,
      scaling: '+15 HP/сек реген, +150 макс. HP'
    },
    void_catalyst: {
      id: 'void_catalyst',
      name: 'Катализатор Бездны',
      rarity: 'legendary',
      icon: '🌌',
      color: '#f97316',
      description: '+40% к критическому урону и +15% к шансу крита',
      stackText: '+40% крит. урона и +15% шанс за стак',
      baseValue: 40,
      scaling: '+40% крит. урон, +15% шанс крита'
    },
    golem_core: {
      id: 'golem_core',
      name: 'Сердце Голема',
      rarity: 'boss',
      icon: '🗿',
      color: '#eab308',
      description: 'Увеличивает максимальное здоровье на 100 HP и даёт +10% сопротивления урону',
      stackText: '+100 HP и +10% брони за стак',
      baseValue: 100,
      scaling: '+100 HP и +10% брони'
    },
    molten_scale: {
      id: 'molten_scale',
      name: 'Чешуя Саламандры',
      rarity: 'boss',
      icon: '🐉',
      color: '#eab308',
      description: 'Каждые 3 сек обжигает окружающих врагов в радиусе 5м на 120 DPS',
      stackText: '+40 DPS за стак',
      baseValue: 120,
      scaling: '+40 DPS за стак'
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
    goldGemChanceBoss: 0.40,
    merchantSpawnInterval: 180,
    merchantStayDuration: 120,
    merchantPriceCommon: 40,
    merchantPriceUncommon: 80,
    merchantPriceRare: 150,
    merchantPriceLegendary: 300,
    merchantPriceBoss: 500
  }
};
