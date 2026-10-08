import {
  Texture,
  TextureLoader,
  CanvasTexture,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  SRGBColorSpace,
  LinearFilter,
  NearestFilter,
  LinearMipmapLinearFilter,
  type WebGLRenderer
} from 'three';
import { getAssetUrl } from '../utils/assetPath';

export type { SpriteDirection } from '../shared/types';

export interface DirectionalTextures {
  front: Texture;
  back: Texture;
  left: Texture;
  right: Texture;
}

export interface AnimatedCharacterTextures {
  idle: Texture;
  walk: Texture;
  attack: Texture;
  walk_attack: Texture;
}

export interface BossTextures {
  walk: Texture;
  attack: Texture;
}

export type SwordsmanTextures = AnimatedCharacterTextures;

export class TextureManager {
  private static loader = new TextureLoader();
  private static cache: Map<string, Texture> = new Map();
  private static weaponBlobUrls: Map<string, string> = new Map();

  public static getAssetUrl(path: string): string {
    return getAssetUrl(path);
  }

  public static normalizeTextureUrl(url: string): string {
    if (!url || !url.startsWith('/textures/')) return url;
    const rel = url.substring('/textures/'.length);
    if (rel.includes('/')) return url;

    if (rel.startsWith('hero_')) return `/textures/heroes/${rel}`;
    if (rel.startsWith('monster_')) return `/textures/monsters/${rel}`;
    if (rel.startsWith('boss_')) return `/textures/bosses/${rel}`;
    if (rel.startsWith('weapon_') || rel === 'bullet_revolver.png') return `/textures/weapons/${rel}`;
    if (rel.startsWith('vfx_')) return `/textures/vfx/${rel}`;
    if (rel.startsWith('quest_') || rel.startsWith('reward_') || rel.startsWith('ui_quest')) return `/textures/quests/${rel}`;
    if (rel === 'game_logo_rift.png' || rel === 'menu_background.jpg') return `/textures/ui/${rel}`;
    if (rel.startsWith('test_')) return `/textures/test/${rel}`;

    return url;
  }

  public static readonly WEAPON_ICON_URLS: string[] = [
    '/textures/weapons/weapon_astral_staff.png',
    '/textures/weapons/weapon_bow.png',
    '/textures/weapons/weapon_chakram.png',
    '/textures/weapons/weapon_flail.png',
    '/textures/weapons/weapon_greatsword.png',
    '/textures/weapons/weapon_holy_aura.png',
    '/textures/weapons/weapon_katana_slash.png',
    '/textures/weapons/weapon_kukri.png',
    '/textures/weapons/weapon_lightning_strike.png',
    '/textures/weapons/weapon_ice_spike.png',
    '/textures/weapons/weapon_fireball.png',
    '/textures/weapons/weapon_orbiting_barrier.png',
    '/textures/weapons/weapon_reaper_scythe.png',
    '/textures/weapons/weapon_whirlwind_slash.png'
  ];

  public static getWeaponBlobUrl(pathOrId: string): string {
    if (!pathOrId) return '';
    if (pathOrId.startsWith('blob:') || pathOrId.startsWith('data:')) {
      return pathOrId;
    }
    const cleanId = pathOrId.replace(/.*\/textures\/(?:weapons\/)?weapon_/, '').replace('.png', '');
    const standardPath = `/textures/weapons/weapon_${cleanId}.png`;
    const resolvedPath = getAssetUrl(standardPath);
    return (
      this.weaponBlobUrls.get(standardPath) ||
      this.weaponBlobUrls.get(resolvedPath) ||
      this.weaponBlobUrls.get(cleanId) ||
      this.weaponBlobUrls.get(pathOrId) ||
      resolvedPath
    );
  }

  public static initWeaponBlobs(): void {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    this.WEAPON_ICON_URLS.forEach(async (url) => {
      try {
        const resolvedUrl = getAssetUrl(url);
        const res = await fetch(resolvedUrl);
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          this.weaponBlobUrls.set(url, blobUrl);
          this.weaponBlobUrls.set(resolvedUrl, blobUrl);
          const id = url.replace(/.*\/textures\/weapons\/weapon_/, '').replace('.png', '');
          this.weaponBlobUrls.set(id, blobUrl);
        }
      } catch {}
    });
  }

  // Shared shadow resources (created once, shared across thousands of entities)
  private static sharedShadowTexture: CanvasTexture | null = null;
  private static sharedShadowGeometry = new PlaneGeometry(1, 1);
  private static sharedShadowMaterial: MeshBasicMaterial | null = null;

  public static load(url: string, renderer?: WebGLRenderer): Texture {
    const normalizedUrl = TextureManager.normalizeTextureUrl(url);
    const resolvedUrl = getAssetUrl(normalizedUrl);
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    if (this.cache.has(normalizedUrl)) {
      return this.cache.get(normalizedUrl)!;
    }
    if (this.cache.has(resolvedUrl)) {
      return this.cache.get(resolvedUrl)!;
    }

    const tex = this.loader.load(resolvedUrl, (loadedTex) => {
      if (renderer) {
        renderer.initTexture(loadedTex);
      }
    });
    tex.colorSpace = SRGBColorSpace;
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearMipmapLinearFilter;
    this.cache.set(url, tex);
    this.cache.set(normalizedUrl, tex);
    this.cache.set(resolvedUrl, tex);
    return tex;
  }

  public static loadDirectional(basePathWithoutExt: string, renderer?: WebGLRenderer): DirectionalTextures {
    return {
      front: this.load(`${basePathWithoutExt}_front.png`, renderer),
      back: this.load(`${basePathWithoutExt}_back.png`, renderer),
      left: this.load(`${basePathWithoutExt}_left.png`, renderer),
      right: this.load(`${basePathWithoutExt}_right.png`, renderer)
    };
  }

  public static readonly ALL_ASSET_URLS: string[] = [
    // Weapons & Combat
    '/textures/weapons/weapon_astral_staff.png',
    '/textures/weapons/weapon_bow.png',
    '/textures/weapons/weapon_chakram.png',
    '/textures/weapons/weapon_flail.png',
    '/textures/weapons/weapon_greatsword.png',
    '/textures/weapons/weapon_holy_aura.png',
    '/textures/weapons/weapon_katana_slash.png',
    '/textures/weapons/weapon_kukri.png',
    '/textures/weapons/weapon_lightning_strike.png',
    '/textures/weapons/weapon_ice_spike.png',
    '/textures/weapons/weapon_fireball.png',
    '/textures/weapons/weapon_orbiting_barrier.png',
    '/textures/weapons/weapon_whirlwind_slash.png',
    '/textures/weapons/weapon_reaper_scythe.png',
    '/textures/weapons/bullet_revolver.png',
    '/textures/vfx/vfx_lightning.png',
    '/textures/vfx/vfx_fire_ring.png',
    '/textures/vfx/vfx_ice_spike.png',
    '/textures/vfx/vfx_fireball.png',
    '/textures/vfx/vfx_scythe.png',

    // Heroes - 6 Playable Characters (Walk, Attack, Idle, Walk-Attack, Front)
    '/textures/heroes/hero_ronin_front.png',
    '/textures/heroes/hero_ronin_idle.png',
    '/textures/heroes/hero_ronin_walk.png',
    '/textures/heroes/hero_ronin_attack.png',
    '/textures/heroes/hero_ronin_walk_attack.png',

    '/textures/heroes/hero_valkyrie_front.png',
    '/textures/heroes/hero_valkyrie_idle.png',
    '/textures/heroes/hero_valkyrie_walk.png',
    '/textures/heroes/hero_valkyrie_attack.png',
    '/textures/heroes/hero_valkyrie_walk_attack.png',

    '/textures/heroes/hero_flail_front.png',
    '/textures/heroes/hero_flail_idle.png',
    '/textures/heroes/hero_flail_walk.png',
    '/textures/heroes/hero_flail_attack.png',
    '/textures/heroes/hero_flail_walk_attack.png',

    '/textures/heroes/hero_sorceress_front.png',
    '/textures/heroes/hero_sorceress_idle.png',
    '/textures/heroes/hero_sorceress_walk.png',
    '/textures/heroes/hero_sorceress_attack.png',
    '/textures/heroes/hero_sorceress_walk_attack.png',

    '/textures/heroes/hero_chakram_front.png',
    '/textures/heroes/hero_chakram_idle.png',
    '/textures/heroes/hero_chakram_walk.png',
    '/textures/heroes/hero_chakram_attack.png',
    '/textures/heroes/hero_chakram_walk_attack.png',

    '/textures/heroes/hero_archer_front.png',
    '/textures/heroes/hero_archer_idle.png',
    '/textures/heroes/hero_archer_walk.png',
    '/textures/heroes/hero_archer_attack.png',
    '/textures/heroes/hero_archer_walk_attack.png',

    // Legacy Hero Avatars
    '/textures/heroes/hero_male_front.png',
    '/textures/heroes/hero_male_back.png',
    '/textures/heroes/hero_male_left.png',
    '/textures/heroes/hero_male_right.png',
    '/textures/heroes/hero_female_front.png',
    '/textures/heroes/hero_female_back.png',
    '/textures/heroes/hero_female_left.png',
    '/textures/heroes/hero_female_right.png',

    // Bosses
    '/textures/bosses/boss_demon_walk.png',
    '/textures/bosses/boss_demon_attack.png',
    '/textures/bosses/boss_demon_front.png',
    '/textures/bosses/boss_demon_back.png',
    '/textures/bosses/boss_demon_left.png',
    '/textures/bosses/boss_demon_right.png',

    '/textures/bosses/boss_hydra_walk.png',
    '/textures/bosses/boss_hydra_attack.png',
    '/textures/bosses/boss_hydra_front.png',
    '/textures/bosses/boss_hydra_back.png',
    '/textures/bosses/boss_hydra_left.png',
    '/textures/bosses/boss_hydra_right.png',

    '/textures/bosses/boss_sheriff_front.png',
    '/textures/bosses/boss_sheriff_back.png',
    '/textures/bosses/boss_sheriff_left.png',
    '/textures/bosses/boss_sheriff_right.png',

    // Monsters (4 Directions)
    '/textures/monsters/monster_coyote_front.png',
    '/textures/monsters/monster_coyote_back.png',
    '/textures/monsters/monster_coyote_left.png',
    '/textures/monsters/monster_coyote_right.png',

    '/textures/monsters/monster_crawler_front.png',
    '/textures/monsters/monster_crawler_back.png',
    '/textures/monsters/monster_crawler_left.png',
    '/textures/monsters/monster_crawler_right.png',

    '/textures/monsters/monster_cactus_front.png',
    '/textures/monsters/monster_cactus_back.png',
    '/textures/monsters/monster_cactus_left.png',
    '/textures/monsters/monster_cactus_right.png',

    '/textures/monsters/monster_skeleton_front.png',
    '/textures/monsters/monster_skeleton_back.png',
    '/textures/monsters/monster_skeleton_left.png',
    '/textures/monsters/monster_skeleton_right.png',

    '/textures/monsters/monster_ghost_front.png',
    '/textures/monsters/monster_ghost_back.png',
    '/textures/monsters/monster_ghost_left.png',
    '/textures/monsters/monster_ghost_right.png',

    '/textures/monsters/monster_scorpion_front.png',
    '/textures/monsters/monster_scorpion_back.png',
    '/textures/monsters/monster_scorpion_left.png',
    '/textures/monsters/monster_scorpion_right.png',

    '/textures/monsters/monster_brute_front.png',
    '/textures/monsters/monster_brute_back.png',
    '/textures/monsters/monster_brute_left.png',
    '/textures/monsters/monster_brute_right.png',

    '/textures/monsters/monster_bison_front.png',
    '/textures/monsters/monster_bison_back.png',
    '/textures/monsters/monster_bison_left.png',
    '/textures/monsters/monster_bison_right.png',

    // UI & Environment
    '/textures/ui/menu_background.jpg'
  ];

  /**
   * Comprehensive asset preloader with progress callback.
   * Loads and decodes all images into browser cache (preventing UI hitch on weapon/character choice)
   * and compiles/uploads textures to the WebGL GPU memory upfront.
   */
  public static async preloadAllWithProgress(
    renderer?: WebGLRenderer,
    onProgress?: (loaded: number, total: number, item: string) => void
  ): Promise<void> {
    const urls = this.ALL_ASSET_URLS;
    const total = urls.length + 2; // +2 for procedural arrow and shadow
    let loaded = 0;

    const report = (item: string) => {
      loaded++;
      if (onProgress) {
        onProgress(loaded, total, item);
      }
    };

    // Preload procedural textures
    this.getArrowTexture(renderer);
    report('arrow_texture');
    this.createShadowMesh(1.0);
    report('shadow_texture');

    // Preload and convert all weapon icons to memory Blob URLs (completely avoids 304 network requests)
    await Promise.all(
      this.WEAPON_ICON_URLS.map(async (url) => {
        try {
          const resolvedUrl = getAssetUrl(url);
          const res = await fetch(resolvedUrl);
          if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            this.weaponBlobUrls.set(url, blobUrl);
            this.weaponBlobUrls.set(resolvedUrl, blobUrl);
            const id = url.replace(/^.*weapon_/, '').replace('.png', '');
            this.weaponBlobUrls.set(id, blobUrl);
          }
        } catch {
          // Graceful fallback
        }
      })
    );

    // Concurrently load and decode images in batches of 6
    const batchSize = 6;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (url) => {
          try {
            const resolvedUrl = getAssetUrl(url);
            // 1. Browser DOM Image cache and asynchronous bitmap decoding
            const img = new Image();
            img.src = resolvedUrl;
            if (img.decode) {
              await img.decode().catch(() => {});
            }

            // 2. Three.js Texture cache & GPU texture upload
            await new Promise<void>((resolve) => {
              this.loader.load(
                resolvedUrl,
                (tex) => {
                  tex.colorSpace = SRGBColorSpace;
                  if (
                    url.includes('_walk.png') ||
                    url.includes('_attack.png') ||
                    url.includes('_idle.png') ||
                    url.includes('bullet_')
                  ) {
                    tex.magFilter = NearestFilter;
                  } else {
                    tex.magFilter = LinearFilter;
                  }
                  tex.minFilter = LinearMipmapLinearFilter;
                  this.cache.set(url, tex);
                  this.cache.set(resolvedUrl, tex);
                  if (renderer) {
                    try {
                      renderer.initTexture(tex);
                    } catch {}
                  }
                  resolve();
                },
                undefined,
                () => {
                  resolve();
                }
              );
            });
          } catch {
            // Graceful fallback
          } finally {
            const fileName = url.substring(url.lastIndexOf('/') + 1);
            report(fileName);
          }
        })
      );
    }
  }

  /**
   * Preloads all entity sprite sheets upfront to eliminate mid-game texture loading hitch.
   */
  public static preloadAll(renderer?: WebGLRenderer) {
    this.preloadAllWithProgress(renderer).catch(() => {});
  }

  public static loadBossTextures(baseName: string, renderer?: WebGLRenderer): BossTextures {
    const loadPixel = (url: string) => {
      const tex = this.load(url, renderer);
      tex.magFilter = NearestFilter;
      tex.minFilter = LinearMipmapLinearFilter;
      return tex;
    };

    return {
      walk: loadPixel(`/textures/bosses/${baseName}_walk.png`),
      attack: loadPixel(`/textures/bosses/${baseName}_attack.png`)
    };
  }

  public static loadAnimatedTextures(baseName: string, renderer?: WebGLRenderer): AnimatedCharacterTextures {
    const loadPixel = (url: string) => {
      const tex = this.load(url, renderer);
      tex.magFilter = NearestFilter;
      tex.minFilter = LinearMipmapLinearFilter;
      return tex;
    };

    return {
      idle: loadPixel(`/textures/heroes/${baseName}_idle.png`),
      walk: loadPixel(`/textures/heroes/${baseName}_walk.png`),
      attack: loadPixel(`/textures/heroes/${baseName}_attack.png`),
      walk_attack: loadPixel(`/textures/heroes/${baseName}_walk_attack.png`)
    };
  }

  public static loadSwordsmanTextures(renderer?: WebGLRenderer): SwordsmanTextures {
    return this.loadAnimatedTextures('hero_swordsman', renderer);
  }

  public static loadRoninTextures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_ronin', renderer);
  }

  public static loadValkyrieTextures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_valkyrie', renderer);
  }

  public static loadFlailTextures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_flail', renderer);
  }

  public static loadSorceressTextures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_sorceress', renderer);
  }

  public static loadChakramTextures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_chakram', renderer);
  }

  public static loadArcherTextures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_archer', renderer);
  }

  public static getBulletTexture(renderer?: WebGLRenderer): Texture {
    const tex = this.load('/textures/weapons/bullet_revolver.png', renderer);
    tex.magFilter = NearestFilter;
    tex.minFilter = LinearMipmapLinearFilter;
    return tex;
  }

  private static sharedArrowTexture: CanvasTexture | null = null;

  public static getArrowTexture(renderer?: WebGLRenderer): Texture {
    if (!this.sharedArrowTexture) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;

      ctx.clearRect(0, 0, 128, 32);

      // 1. Wooden Shaft
      const woodGrad = ctx.createLinearGradient(0, 14, 0, 18);
      woodGrad.addColorStop(0, '#d97706');
      woodGrad.addColorStop(0.5, '#b45309');
      woodGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = woodGrad;
      ctx.fillRect(16, 14, 86, 4);

      // 2. Fletchings (Feathers) at back (X = 14 to 44)
      ctx.fillStyle = '#dc2626';
      // Top feather
      ctx.beginPath();
      ctx.moveTo(14, 14);
      ctx.lineTo(24, 4);
      ctx.lineTo(44, 14);
      ctx.closePath();
      ctx.fill();

      // Bottom feather
      ctx.beginPath();
      ctx.moveTo(14, 18);
      ctx.lineTo(24, 28);
      ctx.lineTo(44, 18);
      ctx.closePath();
      ctx.fill();

      // Feather quill stripes
      ctx.strokeStyle = '#fef2f2';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(22, 14); ctx.lineTo(26, 7);
      ctx.moveTo(30, 14); ctx.lineTo(33, 8);
      ctx.moveTo(22, 18); ctx.lineTo(26, 25);
      ctx.moveTo(30, 18); ctx.lineTo(33, 24);
      ctx.stroke();

      // Nock (end of arrow)
      ctx.fillStyle = '#451a03';
      ctx.fillRect(10, 14, 6, 4);

      // 3. Metallic Arrowhead (X = 98 to 124)
      const metalGrad = ctx.createLinearGradient(0, 6, 0, 26);
      metalGrad.addColorStop(0, '#f8fafc');
      metalGrad.addColorStop(0.4, '#cbd5e1');
      metalGrad.addColorStop(1, '#475569');

      ctx.fillStyle = metalGrad;
      ctx.beginPath();
      ctx.moveTo(124, 16); // Sharp arrow tip
      ctx.lineTo(98, 6);   // Top barb
      ctx.lineTo(104, 16); // Center notch
      ctx.lineTo(98, 26);  // Bottom barb
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      this.sharedArrowTexture = new CanvasTexture(canvas);
      this.sharedArrowTexture.colorSpace = SRGBColorSpace;
      this.sharedArrowTexture.magFilter = LinearFilter;
      this.sharedArrowTexture.minFilter = LinearMipmapLinearFilter;
      if (renderer) {
        renderer.initTexture(this.sharedArrowTexture);
      }
    }
    return this.sharedArrowTexture;
  }

  public static getKukriTexture(renderer?: WebGLRenderer): Texture {
    const tex = this.load('/textures/weapons/weapon_kukri.png', renderer);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearMipmapLinearFilter;
    return tex;
  }

  public static getChakramTexture(renderer?: WebGLRenderer): Texture {
    const tex = this.load('/textures/weapons/weapon_chakram.png', renderer);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearMipmapLinearFilter;
    return tex;
  }

  public static getLightningTexture(renderer?: WebGLRenderer): Texture {
    const tex = this.load('/textures/vfx/vfx_lightning.png', renderer);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearMipmapLinearFilter;
    return tex;
  }

  public static getIceSpikeTexture(renderer?: WebGLRenderer): Texture {
    const tex = this.load('/textures/vfx/vfx_ice_spike.png', renderer);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearMipmapLinearFilter;
    return tex;
  }

  public static getFireballTexture(renderer?: WebGLRenderer): Texture {
    const tex = this.load('/textures/vfx/vfx_fireball.png', renderer);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearMipmapLinearFilter;
    return tex;
  }

  public static getScytheTexture(renderer?: WebGLRenderer): Texture {
    const tex = this.load('/textures/vfx/vfx_scythe.png', renderer);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearMipmapLinearFilter;
    return tex;
  }

  public static getFireRingTexture(renderer?: WebGLRenderer): Texture {
    const tex = this.load('/textures/vfx/vfx_fire_ring.png', renderer);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearMipmapLinearFilter;
    return tex;
  }

  /**
   * High-performance contact shadow mesh sharing a single texture and material.
   */
  public static createShadowMesh(radius: number): Mesh {
    if (!this.sharedShadowTexture) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const cx = 64;
      const cy = 64;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
      grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.18)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1.0, 0.65);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      this.sharedShadowTexture = new CanvasTexture(canvas);
      this.sharedShadowTexture.minFilter = LinearFilter;
      this.sharedShadowMaterial = new MeshBasicMaterial({
        map: this.sharedShadowTexture,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });
    }

    const shadow = new Mesh(this.sharedShadowGeometry, this.sharedShadowMaterial!);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    const diameter = radius * 2;
    shadow.scale.set(diameter, diameter, 1);
    return shadow;
  }
}

// Immediately initiate background prefetch of weapon icon blobs
TextureManager.initWeaponBlobs();

