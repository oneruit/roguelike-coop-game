import { INVOKER_SPELL_IDS, INVOKER_SPELLS, invokerWeaponId } from '../../game/src/shared/InvokerSpells';
import { GameBalanceState } from '../../game/src/balance/BalanceTypes';

export const TEXTURE_MAP: Record<string, string> = {
  'hero-invoker':'/textures/heroes/hero_invoker_front.png',
  'weapon-invoker_invoke':'/textures/weapons/weapon_invoker_invoke.png',
  ...Object.fromEntries(INVOKER_SPELL_IDS.map(spell => ['weapon-'+invokerWeaponId(spell),'/textures/weapons/weapon_'+invokerWeaponId(spell)+'.png'])),
  // Weapons
  'weapon-fireball': '/textures/weapons/weapon_fireball.png',
  'weapon-bow': '/textures/weapons/weapon_bow.png',
  'weapon-kukri': '/textures/weapons/weapon_kukri.png',
  'weapon-orbiting_barrier': '/textures/weapons/weapon_reaper_scythe.png',
  'weapon-holy_aura': '/textures/weapons/weapon_holy_aura.png',
  'weapon-katana_slash': '/textures/weapons/weapon_katana_slash.png',
  'weapon-whirlwind_slash': '/textures/weapons/weapon_whirlwind_slash.png',
  'weapon-greatsword': '/textures/weapons/weapon_greatsword.png',
  'weapon-flail': '/textures/weapons/weapon_flail.png',
  'weapon-astral_staff': '/textures/weapons/weapon_astral_staff.png',
  'weapon-chakram': '/textures/weapons/weapon_chakram.png',
  'weapon-lightning_strike': '/textures/weapons/weapon_lightning_strike.png',
  'weapon-ice_spike': '/textures/weapons/weapon_ice_spike.png',
  'weapon-assault_rifle': '/textures/weapons/weapon_assault_rifle.png',

  // Heroes
  'hero-ronin': '/textures/heroes/hero_ronin_front.png',
  'hero-valkyrie': '/textures/heroes/hero_valkyrie_front.png',
  'hero-flail': '/textures/heroes/hero_flail_front.png',
  'hero-sorceress': '/textures/heroes/hero_sorceress_front.png',
  'hero-chakram': '/textures/heroes/hero_chakram_front.png',
  'hero-archer': '/textures/heroes/hero_archer_front.png',
  'hero-rocket': '/textures/heroes/hero_rocket_front.png',

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
  'boss-hydra': '/textures/bosses/boss_hydra_front.png',
  'boss-sheriff': '/textures/bosses/boss_sheriff_front.png'
};

export const WEAPON_COLORS: Record<string, string> = {
  invoker_invoke:'#a78bfa',
  ...Object.fromEntries(INVOKER_SPELL_IDS.map(spell => [invokerWeaponId(spell),'#'+INVOKER_SPELLS[spell].color.toString(16).padStart(6,'0')])),
  fireball: '#ef4444',
  bow: '#10b981',
  kukri: '#f59e0b',
  orbiting_barrier: '#8b5cf6',
  holy_aura: '#f97316',
  katana_slash: '#ec4899',
  whirlwind_slash: '#dc2626',
  greatsword: '#6366f1',
  flail: '#78716c',
  astral_staff: '#a855f7',
  chakram: '#06b6d4',
  lightning_strike: '#eab308',
  ice_spike: '#3b82f6',
  assault_rifle: '#f97316'
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
  hydra: '#7c3aed',
  sheriff: '#eab308'
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

export function toSingularCategory(category: string): 'weapon' | 'hero' | 'monster' | 'boss' | 'global' {
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
    case 'global':
    default:
      return 'global';
  }
}

export function getEntityTexture(category: string, id: string): string {
  const singular = toSingularCategory(category);
  const key = `${singular}-${id}`;
  if (TEXTURE_MAP[key]) {
    return TEXTURE_MAP[key];
  }
  switch (singular) {
    case 'hero':
      return `/textures/heroes/hero_${id}_front.png`;
    case 'weapon':
      return `/textures/weapons/weapon_${id}.png`;
    case 'monster':
      return `/textures/monsters/monster_${id}_front.png`;
    case 'boss':
      return `/textures/bosses/boss_${id}_front.png`;
    default:
      return '/textures/weapons/bullet_revolver.png';
  }
}
