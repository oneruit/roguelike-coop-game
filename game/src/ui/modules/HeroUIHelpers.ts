import { CharacterType } from '../../entities/Player';
import { TextureManager } from '../../core/TextureManager';

export function getHeroIcon(charType: CharacterType): string {
  return charType.toUpperCase();
}

export function getHeroName(charType: CharacterType): string {
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
  if (charType === 'invoker') return TextureManager.getAssetUrl('/textures/heroes/hero_invoker_front.png');
  if (charType === 'necromancer') return TextureManager.getAssetUrl('/textures/heroes/hero_necromancer_front.png');
  if (charType === 'amazon') return TextureManager.getAssetUrl('/textures/heroes/hero_amazon_front.png');
  const avatar = charType === 'ronin'
    ? '/textures/heroes/hero_ronin_front.png'
    : charType === 'valkyrie'
    ? '/textures/heroes/hero_valkyrie_front.png'
    : charType === 'flail'
    ? '/textures/heroes/hero_flail_front.png'
    : charType === 'sorceress'
    ? '/textures/heroes/hero_sorceress_front.png'
    : charType === 'chakram'
    ? '/textures/heroes/hero_chakram_front.png'
    : charType === 'archer'
    ? '/textures/heroes/hero_archer_front.png'
    : '/textures/heroes/hero_raccoon_front.png';
  return TextureManager.getAssetUrl(avatar);
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
    orbiting_barrier: '/textures/weapons/weapon_orbiting_barrier.png',
    holy_aura: '/textures/weapons/weapon_holy_aura.png',
    whirlwind_slash: '/textures/weapons/weapon_whirlwind_slash.png',
    lightning_strike: '/textures/weapons/weapon_lightning_strike.png',
    ice_spike: '/textures/weapons/weapon_ice_spike.png',
    fireball: '/textures/weapons/weapon_fireball.png',
    assault_rifle: '/textures/weapons/weapon_assault_rifle.png'
  };
  const path = map[weaponId] || `/textures/weapons/weapon_${weaponId}.png`;
  return TextureManager.getWeaponBlobUrl(path);
}
