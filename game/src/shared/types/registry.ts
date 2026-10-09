/**
 * Canonical Registries for Binary Protocols, Validation, and Serialization
 * Serves as the single source of truth for ordered enum values across client and server.
 */

import { CharacterType, EnemyType, GemType, HeroAnimState, SpriteDirection } from './entities';

export const SLOTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;
export type SlotId = typeof SLOTS[number];

export const DIRECTIONS: readonly SpriteDirection[] = ['front', 'back', 'left', 'right'] as const;

export const ANIM_STATES: readonly HeroAnimState[] = ['IDLE', 'WALK', 'ATTACK', 'WALK_ATTACK'] as const;

export const CHARACTERS: readonly CharacterType[] = [
  'ronin',
  'valkyrie',
  'flail',
  'sorceress',
  'chakram',
  'archer',
  'rocket'
] as const;

export const CHEST_TIERS = ['small', 'large', 'legendary'] as const;
export type ChestTier = typeof CHEST_TIERS[number];

export const ENEMIES: readonly EnemyType[] = [
  'coyote',
  'crawler',
  'cactus',
  'skeleton',
  'ghost',
  'scorpion',
  'brute',
  'bison',
  'boss',
  'hydra'
] as const;

export const GEMS: readonly GemType[] = ['blue', 'green', 'red', 'gold'] as const;

export const BUFF_TYPES: readonly string[] = ['damage', 'speed', 'regen', 'invulnerable'] as const;
