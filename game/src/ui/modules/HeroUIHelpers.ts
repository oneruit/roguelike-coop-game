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
    assault_rifle: '/textures/weapons/weapon_assault_rifle.png'
  };
  const path = map[weaponId] || `/textures/weapons/weapon_${weaponId}.png`;
  return TextureManager.getWeaponBlobUrl(path);
}
