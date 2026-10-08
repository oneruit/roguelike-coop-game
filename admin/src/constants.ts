export const TEXTURE_MAP: Record<string, string> = {
  // Weapons
  'weapon-fireball': '/textures/weapon_fireball.png',
  'weapon-bow': '/textures/weapon_bow.png',
  'weapon-kukri': '/textures/weapon_kukri.png',
  'weapon-orbiting_barrier': '/textures/weapon_reaper_scythe.png',
  'weapon-holy_aura': '/textures/weapon_holy_aura.png',
  'weapon-katana_slash': '/textures/weapon_katana_slash.png',
  'weapon-whirlwind_slash': '/textures/weapon_whirlwind_slash.png',
  'weapon-greatsword': '/textures/weapon_greatsword.png',
  'weapon-flail': '/textures/weapon_flail.png',
  'weapon-astral_staff': '/textures/weapon_astral_staff.png',
  'weapon-chakram': '/textures/weapon_chakram.png',
  'weapon-lightning_strike': '/textures/weapon_lightning_strike.png',
  'weapon-ice_spike': '/textures/weapon_ice_spike.png',

  // Heroes
  'hero-ronin': '/textures/hero_ronin_front.png',
  'hero-valkyrie': '/textures/hero_valkyrie_front.png',
  'hero-flail': '/textures/hero_flail_front.png',
  'hero-sorceress': '/textures/hero_sorceress_front.png',
  'hero-chakram': '/textures/hero_chakram_front.png',
  'hero-archer': '/textures/hero_archer_front.png',

  // Monsters
  'monster-coyote': '/textures/monster_coyote_front.png',
  'monster-crawler': '/textures/monster_crawler_front.png',
  'monster-scorpion': '/textures/monster_scorpion_front.png',
  'monster-skeleton': '/textures/monster_skeleton_front.png',
  'monster-ghost': '/textures/monster_ghost_front.png',
  'monster-cactus': '/textures/monster_cactus_front.png',
  'monster-brute': '/textures/monster_brute_front.png',
  'monster-bison': '/textures/monster_bison_front.png',

  // Bosses
  'boss-demon': '/textures/boss_demon_front.png',
  'boss-hydra': '/textures/boss_hydra_front.png',
  'boss-sheriff': '/textures/boss_sheriff_front.png'
};

export const WEAPON_COLORS: Record<string, string> = {
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
  ice_spike: '#3b82f6'
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

export function getEntityTexture(category: string, id: string): string {
  const singular = category.replace(/s$/, '');
  const key = `${singular}-${id}`;
  return TEXTURE_MAP[key] || '/textures/bullet_revolver.png';
}
