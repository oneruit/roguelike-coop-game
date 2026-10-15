import { INVOKER_SPELL_IDS, INVOKER_SPELLS, invokerWeaponId } from '../../game/src/shared/InvokerSpells';
import { GameBalanceState } from '../../game/src/balance/BalanceTypes';

export const TEXTURE_MAP: Record<string, string> = {
  'weapon-invoker_invoke':'/textures/weapons/weapon_invoker_invoke.png',
  ...Object.fromEntries(INVOKER_SPELL_IDS.map(spell => ['weapon-'+invokerWeaponId(spell),'/textures/weapons/weapon_'+invokerWeaponId(spell)+'.png'])),
  // Weapons
  'weapon-fireball': '/textures/weapons/weapon_fireball.png',
  'weapon-bow': '/textures/weapons/weapon_bow.png',
  'weapon-kukri': '/textures/weapons/weapon_kukri.png',
  'weapon-reaper_scythe': '/textures/weapons/weapon_reaper_scythe.png',
  'weapon-fire_ring': '/textures/weapons/weapon_fire_ring.png',
  'weapon-katana_slash': '/textures/weapons/weapon_katana_slash.png',
  'weapon-whirlwind_slash': '/textures/weapons/weapon_whirlwind_slash.png',
  'weapon-greatsword': '/textures/weapons/weapon_greatsword.png',
  'weapon-flail': '/textures/weapons/weapon_flail.png',
  'weapon-astral_staff': '/textures/weapons/weapon_astral_staff.png',
  'weapon-chakram': '/textures/weapons/weapon_chakram.png',
  'weapon-lightning_strike': '/textures/weapons/weapon_lightning_strike.png',
  'weapon-ice_spike': '/textures/weapons/weapon_ice_spike.png',
  'weapon-assault_rifle': '/textures/weapons/weapon_assault_rifle.png',
  'weapon-poison_puddle': '/textures/weapons/weapon_poison_puddle.png',

  // Heroes
  'hero-ronin': '/textures/heroes/ronin/front.png',
  'hero-valkyrie': '/textures/heroes/valkyrie/front.png',
  'hero-flail': '/textures/heroes/flail/front.png',
  'hero-sorceress': '/textures/heroes/sorceress/front.png',
  'hero-chakram': '/textures/heroes/chakram/front.png',
  'hero-archer': '/textures/heroes/archer/front.png',
  'hero-rocket': '/textures/heroes/rocket/front.png',
  'hero-necromancer': '/textures/heroes/necromancer/front.png',
  'hero-amazon': '/textures/heroes/amazon/front.png',
  'hero-invoker': '/textures/heroes/invoker/front.png',

  // Monsters
  'monster-coyote': '/textures/monsters/monster_coyote_front.png',
  'monster-crawler': '/textures/monsters/monster_crawler_front.png',
  'monster-scorpion': '/textures/monsters/monster_scorpion_front.png',
  'monster-skeleton': '/textures/monsters/monster_skeleton_front.png',
  'monster-ghost': '/textures/monsters/monster_ghost_front.png',
  'monster-cactus': '/textures/monsters/monster_cactus_front.png',
  'monster-brute': '/textures/monsters/monster_brute_front.png',
  'monster-bison': '/textures/monsters/monster_bison_front.png',

  // Bosses
  'boss-boss': '/textures/bosses/boss_demon_front.png',
  'boss-demon': '/textures/bosses/boss_demon_front.png',
  'boss-hydra': '/textures/bosses/boss_hydra_front.png'
};

export const WEAPON_COLORS: Record<string, string> = {
  invoker_invoke:'#a78bfa',
  ...Object.fromEntries(INVOKER_SPELL_IDS.map(spell => [invokerWeaponId(spell),'#'+INVOKER_SPELLS[spell].color.toString(16).padStart(6,'0')])),
  fireball: '#ef4444',
  bow: '#10b981',
  kukri: '#f59e0b',
  reaper_scythe: '#8b5cf6',
  fire_ring: '#f97316',
  katana_slash: '#ec4899',
  whirlwind_slash: '#dc2626',
  greatsword: '#6366f1',
  flail: '#78716c',
  astral_staff: '#a855f7',
  chakram: '#06b6d4',
  lightning_strike: '#eab308',
  ice_spike: '#3b82f6',
  assault_rifle: '#f97316',
  poison_puddle: '#22c55e'
};

export const MONSTER_COLORS: Record<string, string> = {
  coyote: '#94a3b8',
  crawler: '#10b981',
  cactus: '#84cc16',
  skeleton: '#cbd5e1',
  ghost: '#a78bfa',
  scorpion: '#f97316',
  brute: '#b45309',
  bison: '#ef4444',
  boss: '#dc2626',
  hydra: '#7c3aed'
};

export function getWeaponColor(id: string): string {
  if (WEAPON_COLORS[id]) return WEAPON_COLORS[id];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

export function getMonsterColor(id: string): string {
  if (MONSTER_COLORS[id]) return MONSTER_COLORS[id];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`;
}

export function toSingularCategory(category: string): 'weapon' | 'hero' | 'monster' | 'boss' | 'global' | 'passive' | 'item' | 'talent' {
  switch (category) {
    case 'weapons':
    case 'weapon':
      return 'weapon';
    case 'heroes':
    case 'hero':
      return 'hero';
    case 'monsters':
    case 'monster':
      return 'monster';
    case 'bosses':
    case 'boss':
      return 'boss';
    case 'passives':
    case 'passive':
      return 'passive';
    case 'items':
    case 'item':
      return 'item';
    case 'talents':
    case 'talent':
      return 'talent';
    case 'global':
    default:
      return 'global';
  }
}

export function toPluralCategory(category: string): keyof GameBalanceState {
  switch (category) {
    case 'weapon':
    case 'weapons':
      return 'weapons';
    case 'hero':
    case 'heroes':
      return 'heroes';
    case 'monster':
    case 'monsters':
      return 'monsters';
    case 'boss':
    case 'bosses':
      return 'bosses';
    case 'passive':
    case 'passives':
      return 'passives';
    case 'item':
    case 'items':
      return 'items';
    case 'talent':
    case 'talents':
      return 'talents';
    case 'global':
    default:
      return 'global';
  }
}

export function getEntityTexture(category: string, id: string): string {
  const singular = toSingularCategory(category);
  const cleanId = (id || '').trim().toLowerCase().replace(/\s+/g, '_');
  const key = `${singular}-${cleanId}`;
  let rawPath = TEXTURE_MAP[key] || TEXTURE_MAP[`${singular}-${id}`];
  if (!rawPath) {
    switch (singular) {
      case 'hero':
        rawPath = `/textures/heroes/${cleanId}/front.png`;
        break;
      case 'weapon':
        rawPath = `/textures/weapons/weapon_${cleanId}.png`;
        break;
      case 'monster':
        rawPath = `/textures/monsters/monster_${cleanId}_front.png`;
        break;
      case 'boss':
        rawPath = `/textures/bosses/boss_${cleanId}_front.png`;
        break;
      default:
        rawPath = '/textures/vfx/vfx_bullet.png';
        break;
    }
  }

  const base = (import.meta.env?.BASE_URL || '/').trim();
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
  return `${cleanBase}${cleanPath}`;
}
