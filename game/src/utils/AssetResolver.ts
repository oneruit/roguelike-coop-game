import { getAssetUrl } from './assetPath';

export type HeroTextureAction = 'idle' | 'walk' | 'attack' | 'front' | 'portrait' | 'walk_attack';
export type BiomeTextureElement = 'surface' | 'tree';

/**
 * Centralized Asset Resolver
 * Handles structured and legacy asset URLs with transparent fallback and base path handling.
 */
export class AssetResolver {
  /**
   * Get hero texture URL for a given action.
   * Path: /textures/heroes/<heroId>/<action>.png
   */
  public static getHeroTexture(heroId: string, action: HeroTextureAction = 'front'): string {
    const cleanId = (heroId || '').toLowerCase().trim();
    return getAssetUrl(`/textures/heroes/${cleanId}/${action}.png`);
  }

  /**
   * Get biome texture URL.
   * Path: /textures/biomes/<biomeId>/surface.jpg or tree.png
   */
  public static getBiomeTexture(biomeId: string, element: BiomeTextureElement = 'surface'): string {
    const cleanId = (biomeId || '').toLowerCase().trim();
    const ext = element === 'surface' ? 'jpg' : 'png';
    return getAssetUrl(`/textures/biomes/${cleanId}/${element}.${ext}`);
  }

  /**
   * Get weapon icon URL.
   * Path: /textures/weapons/weapon_<weaponId>.png
   */
  public static getWeaponIcon(weaponId: string): string {
    const cleanId = (weaponId || '').toLowerCase().trim().replace(/^weapon_/, '');
    return getAssetUrl(`/textures/weapons/weapon_${cleanId}.png`);
  }

  /**
   * Normalizes legacy URLs to modular structure if applicable.
   */
  public static normalizeTextureUrl(url: string): string {
    if (!url) return url;
    
    // Match legacy hero path: /textures/heroes/hero_<id>_<action>.png
    const heroMatch = url.match(/\/textures\/heroes\/hero_([a-z0-9_]+)_(idle|walk|attack|front|portrait|walk_attack)\.png/i);
    if (heroMatch) {
      const [, heroId, action] = heroMatch;
      return `/textures/heroes/${heroId}/${action}.png`;
    }

    // Match legacy biome path: /textures/biomes/biome_<id>.jpg
    const biomeMatch = url.match(/\/textures\/biomes\/biome_([a-z0-9_]+)\.jpg/i);
    if (biomeMatch) {
      const [, biomeId] = biomeMatch;
      return `/textures/biomes/${biomeId}/surface.jpg`;
    }

    return url;
  }
}
