import type { CharacterType } from './types/entities';

/**
 * All exclusive weapon IDs belonging to Invoker.
 */
export const INVOKER_EXCLUSIVE_WEAPONS = [
  'invoker_invoke',
  'invoker_cold_snap',
  'invoker_ghost_walk',
  'invoker_ice_wall',
  'invoker_emp',
  'invoker_tornado',
  'invoker_alacrity',
  'invoker_sun_strike',
  'invoker_forge_spirit',
  'invoker_chaos_meteor',
  'invoker_deafening_blast'
] as const;

/**
 * Unique Character Specification.
 * Defines exclusive weapons, restriction rules, and future expansion properties.
 */
export interface UniqueCharacterConfig {
  /** Identifier of the character */
  readonly charType: CharacterType;
  /** Human-readable character name */
  readonly name: string;
  /** Flag marking this character as having a unique/exclusive skill ecosystem */
  readonly isUnique: boolean;
  /**
   * Weapon IDs that are strictly exclusive to this character.
   * Other characters cannot see, pick, or use these weapons.
   */
  readonly exclusiveWeaponIds: readonly string[];
  /**
   * Whether this character can also use common/generic weapons from the general pool.
   * For unique characters (like Invoker), this is false (cannot pick or use weapons outside their exclusive pool).
   */
  readonly allowGenericWeapons?: boolean;
  /**
   * Optional custom validator for weapon acquisition prerequisites.
   */
  readonly canAcquireExclusiveWeapon?: (
    weaponId: string,
    currentWeapons: readonly { id: string }[]
  ) => boolean;
}

/**
 * Registry of unique characters.
 * Easily extensible for future unique characters.
 */
export const UNIQUE_CHARACTERS: Record<string, UniqueCharacterConfig> = {
  invoker: {
    charType: 'invoker',
    name: 'Инвокер',
    isUnique: true,
    exclusiveWeaponIds: INVOKER_EXCLUSIVE_WEAPONS,
    allowGenericWeapons: false,
    canAcquireExclusiveWeapon: (weaponId, currentWeapons) => {
      // Must have the base Invoke weapon to acquire separate standalone spells
      if (weaponId === 'invoker_invoke') return true;
      return currentWeapons.some(w => w.id === 'invoker_invoke');
    }
  }
};

/**
 * Register a new unique character into the system (for future character additions/mods).
 */
export function registerUniqueCharacter(config: UniqueCharacterConfig): void {
  UNIQUE_CHARACTERS[config.charType] = config;
}

/**
 * Checks if a character is defined as a unique character.
 */
export function isUniqueCharacter(charType: CharacterType): boolean {
  return UNIQUE_CHARACTERS[charType]?.isUnique === true;
}

/**
 * Returns configuration for a unique character, if registered.
 */
export function getUniqueCharacterConfig(charType: CharacterType): UniqueCharacterConfig | undefined {
  return UNIQUE_CHARACTERS[charType];
}

/**
 * Checks whether a given weapon ID is exclusive to any registered unique character.
 */
export function isExclusiveWeapon(weaponId: string): boolean {
  return getExclusiveWeaponOwner(weaponId) !== null;
}

/**
 * Returns the character type that owns the given weapon ID, or null if it's a generic weapon.
 */
export function getExclusiveWeaponOwner(weaponId: string): CharacterType | null {
  for (const config of Object.values(UNIQUE_CHARACTERS)) {
    if (config.exclusiveWeaponIds.includes(weaponId)) {
      return config.charType;
    }
  }
  return null;
}

/**
 * The single source of truth for whether a hero is allowed to acquire or upgrade a weapon.
 * 
 * Rules:
 * 1. If weapon is exclusive to hero X, only hero X can acquire it.
 * 2. If hero is a unique character (e.g. Invoker):
 *    - They can only acquire weapons from their exclusive list.
 *    - They CANNOT acquire generic weapons (bow, katana, etc.) unless allowGenericWeapons is explicitly true.
 *    - Sub-prerequisites (like having invoker_invoke) are evaluated.
 * 3. If hero is a non-unique character (Ronin, Valkyrie, Archer, etc.):
 *    - They CANNOT acquire any exclusive weapon (like invoker_invoke or any invoker spell).
 *    - They can acquire any generic non-exclusive weapon.
 */
export function canCharacterAcquireWeapon(
  charType: CharacterType,
  weaponId: string,
  currentWeapons: readonly { id: string }[] = []
): boolean {
  const exclusiveOwner = getExclusiveWeaponOwner(weaponId);

  // 1. If weapon belongs exclusively to another character, reject
  if (exclusiveOwner !== null && exclusiveOwner !== charType) {
    return false;
  }

  // 2. If character is a unique character
  const uniqueConfig = getUniqueCharacterConfig(charType);
  if (uniqueConfig?.isUnique) {
    // If it's one of their exclusive weapons
    if (uniqueConfig.exclusiveWeaponIds.includes(weaponId)) {
      if (uniqueConfig.canAcquireExclusiveWeapon) {
        return uniqueConfig.canAcquireExclusiveWeapon(weaponId, currentWeapons);
      }
      return true;
    }
    // Generic weapons are rejected unless explicitly allowed
    return uniqueConfig.allowGenericWeapons === true;
  }

  // 3. For non-unique characters, they can acquire any non-exclusive weapon
  return exclusiveOwner === null;
}
