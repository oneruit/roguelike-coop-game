import { CharacterType } from '../../entities/Player';
import { TextureManager } from '../../core/TextureManager';
import { AssetResolver } from '../../utils/AssetResolver';
import { DEFAULT_BALANCE } from '../../balance/defaultBalance';

export function getHeroIcon(charType: CharacterType): string {
  return charType.toUpperCase();
}

export function getHeroName(charType: CharacterType): string {
  const balanceHero = DEFAULT_BALANCE.heroes[charType];
  if (balanceHero?.name) {
    return balanceHero.name;
  }
  if (charType === 'invoker') return 'Инвокер «Маг стихий»';
  if (charType === 'necromancer') return 'Мортис «Некромант»';
  if (charType === 'amazon') return 'Амазонка «Воительница»';
  return charType === 'ronin'
    ? 'Рен «Ронин»'
    : charType === 'valkyrie'
    ? 'Каэла «Меч»'
    : charType === 'flail'
    ? 'Бригитта «Цеп»'
    : charType === 'sorceress'
    ? 'Ария «Посох»'
    : charType === 'chakram'
    ? 'Кира «Чакрам»'
    : charType === 'archer'
    ? 'Эльф-лучник «Лук»'
    : 'Ракета «Енот»';
}

export function getHeroAvatar(charType: CharacterType): string {
  return AssetResolver.getHeroTexture(charType, 'front');
}

export interface HeroAbility {
  name: string;
  icon?: string;
}

export interface HeroDetails {
  title: string;
  role: string;
  passiveTrait: {
    name: string;
    icon?: string;
  };
  activeAbilities: HeroAbility[];
  difficulty: 'Низкая' | 'Средняя' | 'Высокая' | 'Экстремальная';
  difficultyPercent: number;
}

export function getHeroDetails(charType: CharacterType): HeroDetails {
  const detailsMap: Record<CharacterType, HeroDetails> = {
    ronin: {
      title: 'РЕН — КЛИНОК ПУСТОТЫ',
      role: 'Класс: Воин / Маг',
      passiveTrait: { name: 'Слияние с Бездной', icon: 'rift_attunement' },
      activeAbilities: [
        { name: 'Удар Пустоты' },
        { name: 'Рывок Бездны' },
        { name: 'Нова Разлома' },
        { name: 'Багровый Разрез' }
      ],
      difficulty: 'Высокая',
      difficultyPercent: 85
    },
    sorceress: {
      title: 'АРИЯ — ЧАРОДЕЙКА ПУСТОТЫ',
      role: 'Класс: Боевой Маг',
      passiveTrait: { name: 'Астральный Резонанс', icon: 'astral_resonance' },
      activeAbilities: [
        { name: 'Звёздная Стрела' },
        { name: 'Шаг Сквозь Разлом' },
        { name: 'Кольцо Пустоты' },
        { name: 'Сверхновая' }
      ],
      difficulty: 'Средняя',
      difficultyPercent: 65
    },
    archer: {
      title: 'ЛУЧНИЦА — ЭЛЬФ-СЛЕДОПЫТ',
      role: 'Класс: Лучница / Следопыт',
      passiveTrait: { name: 'Орлиный Взор', icon: 'eagle_eye' },
      activeAbilities: [
        { name: 'Пронзающая Стрела' },
        { name: 'Тактический Отскок' },
        { name: 'Град Стрел' },
        { name: 'Шквальный Выстрел' }
      ],
      difficulty: 'Средняя',
      difficultyPercent: 60
    },
    necromancer: {
      title: 'МОРТИС — НЕКРОМАНТ',
      role: 'Класс: Маг Смерти / Жнец',
      passiveTrait: { name: 'Жатва Душ', icon: 'soul_harvest' },
      activeAbilities: [
        { name: 'Костяное Копьё' },
        { name: 'Проклятие Тлена' },
        { name: 'Кольцо Мертвецов' },
        { name: 'Призрачный Взрыв' }
      ],
      difficulty: 'Высокая',
      difficultyPercent: 85
    },
    valkyrie: {
      title: 'КАЭЛА — ВАЛЬКИРИЯ',
      role: 'Класс: Паладин / Страж',
      passiveTrait: { name: 'Благословение Битвы', icon: 'valhalla_blessing' },
      activeAbilities: [
        { name: 'Раскалывающий Меч' },
        { name: 'Щитовой Рывок' },
        { name: 'Вихрь Стали' },
        { name: 'Кара Небес' }
      ],
      difficulty: 'Низкая',
      difficultyPercent: 40
    },
    flail: {
      title: 'БРИГИТТА — БЕРСЕРК',
      role: 'Класс: Воительница Авангарда',
      passiveTrait: { name: 'Несокрушимость', icon: 'unstoppable' },
      activeAbilities: [
        { name: 'Тяжёлый Замах' },
        { name: 'Дробящий Рывок' },
        { name: 'Сотрясение Земли' },
        { name: 'Боевой Клич' }
      ],
      difficulty: 'Низкая',
      difficultyPercent: 45
    },
    chakram: {
      title: 'КИРА — ТЕНЬ ЧАКРАМА',
      role: 'Класс: Скирмишер / Тень',
      passiveTrait: { name: 'Инерция Лезвий', icon: 'blade_momentum' },
      activeAbilities: [
        { name: 'Танцующий Клинок' },
        { name: 'Теневой Шаг' },
        { name: 'Шквал Рикошетов' },
        { name: 'Веер Лезвий' }
      ],
      difficulty: 'Средняя',
      difficultyPercent: 60
    },
    amazon: {
      title: 'АМАЗОНКА — ЖНИЦА',
      role: 'Класс: Мистическая Воительница',
      passiveTrait: { name: 'Сферы Пустоты', icon: 'void_spheres' },
      activeAbilities: [
        { name: 'Коса Жнеца' },
        { name: 'Орбитальный Всплеск' },
        { name: 'Мистический Рывок' },
        { name: 'Вихрь Сфер' }
      ],
      difficulty: 'Высокая',
      difficultyPercent: 75
    },
    invoker: {
      title: 'ИНВОКЕР — МАГ СТИХИЙ',
      role: 'Класс: Высший Архимаг',
      passiveTrait: { name: 'Стихийный Синтез', icon: 'elemental_synthesis' },
      activeAbilities: [
        { name: 'Случайное Заклинание' },
        { name: 'Метеоритный Дождь' },
        { name: 'Ледяная Стена' },
        { name: 'Импульс Разлома' }
      ],
      difficulty: 'Экстремальная',
      difficultyPercent: 95
    },
    rocket: {
      title: 'РАКЕТА — КОММАНДОС',
      role: 'Класс: Артиллерист / Стрелок',
      passiveTrait: { name: 'Тяжёлый Калибр', icon: 'heavy_munitions' },
      activeAbilities: [
        { name: 'Штурмовая Очередь' },
        { name: 'Осколочная Граната' },
        { name: 'Тактический Перекат' },
        { name: 'Орбитальный Удар' }
      ],
      difficulty: 'Высокая',
      difficultyPercent: 80
    }
  };

  return detailsMap[charType] || detailsMap.ronin;
}

export function getWeaponIconUrl(weaponId: string): string {
  const map: Record<string, string> = {
    chakram: '/textures/weapons/weapon_chakram.png',
    bow: '/textures/weapons/weapon_bow.png',
    kukri: '/textures/weapons/weapon_kukri.png',
    katana_slash: '/textures/weapons/weapon_katana_slash.png',
    greatsword: '/textures/weapons/weapon_greatsword.png',
    flail: '/textures/weapons/weapon_flail.png',
    astral_staff: '/textures/weapons/weapon_astral_staff.png',
    reaper_scythe: '/textures/weapons/weapon_reaper_scythe.png',
    fire_ring: '/textures/weapons/weapon_fire_ring.png',
    whirlwind_slash: '/textures/weapons/weapon_whirlwind_slash.png',
    lightning_strike: '/textures/weapons/weapon_lightning_strike.png',
    ice_spike: '/textures/weapons/weapon_ice_spike.png',
    fireball: '/textures/weapons/weapon_fireball.png',
    assault_rifle: '/textures/weapons/weapon_assault_rifle.png',
    poison_puddle: '/textures/weapons/weapon_poison_puddle.png'
  };
  const path = map[weaponId] || `/textures/weapons/weapon_${weaponId}.png`;
  return TextureManager.getWeaponBlobUrl(path);
}

