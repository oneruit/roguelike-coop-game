/**
 * Shared Entity Types & Definitions
 * Platform-agnostic core types used across client, server, and simulation layers.
 */

export type CharacterType = 'ronin' | 'valkyrie' | 'flail' | 'sorceress' | 'chakram' | 'archer' | 'rocket';

export type HeroAnimState = 'IDLE' | 'WALK' | 'ATTACK' | 'WALK_ATTACK';

export type SpriteDirection = 'front' | 'back' | 'left' | 'right';

export type BuffType = 'damage' | 'speed' | 'regen' | 'invulnerable';

export type GemType = 'blue' | 'green' | 'red' | 'gold';

export type EnemyType =
  | 'coyote'
  | 'crawler'
  | 'cactus'
  | 'skeleton'
  | 'ghost'
  | 'scorpion'
  | 'brute'
  | 'bison'
  | 'boss'
  | 'hydra';

export interface ActiveBuff {
  type: BuffType;
  name: string;
  icon: string;
  color: string;
  duration: number;
  maxDuration: number;
  value: number;
}

export interface PlayerStats {
  kills: number;
  damageDealt: number;
  level: number;
  revives: number;
}

export type ItemRarity = 'common' | 'uncommon' | 'legendary' | 'boss';

export type RiftItemId =
  // Common
  | 'kinetic_injector'
  | 'nanite_plating'
  | 'adrenaline_dart'
  | 'pulse_rounds'
  | 'health_vial'
  // Uncommon
  | 'chain_lightning'
  | 'plasma_detonator'
  | 'crit_visor'
  | 'aegis_battery'
  | 'bio_leech'
  // Legendary
  | 'singularity_core'
  | 'orbital_strike'
  | 'chronos_phylactery'
  // Boss
  | 'golem_core'
  | 'molten_scale';
