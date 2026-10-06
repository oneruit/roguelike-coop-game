import * as THREE from 'three';

export type SpriteDirection = 'front' | 'back' | 'left' | 'right';

export interface DirectionalTextures {
  front: THREE.Texture;
  back: THREE.Texture;
  left: THREE.Texture;
  right: THREE.Texture;
}

export interface AnimatedCharacterTextures {
  idle: THREE.Texture;
  walk: THREE.Texture;
  attack: THREE.Texture;
  walk_attack: THREE.Texture;
}

export interface BossTextures {
  walk: THREE.Texture;
  attack: THREE.Texture;
}

export type SwordsmanTextures = AnimatedCharacterTextures;

export class TextureManager {
  private static loader = new THREE.TextureLoader();
  private static cache: Map<string, THREE.Texture> = new Map();
  private static weaponBlobUrls: Map<string, string> = new Map();

  public static readonly WEAPON_ICON_URLS: string[] = [
    '/textures/weapon_astral_staff.png',
    '/textures/weapon_bow.png',
    '/textures/weapon_chakram.png',
    '/textures/weapon_flail.png',
    '/textures/weapon_greatsword.png',
    '/textures/weapon_holy_aura.png',
    '/textures/weapon_katana_slash.png',
    '/textures/weapon_kukri.png',
    '/textures/weapon_lightning_strike.png',
    '/textures/weapon_ice_spike.png',
    '/textures/weapon_fireball.png',
    '/textures/weapon_orbiting_barrier.png',
    '/textures/weapon_reaper_scythe.png',
    '/textures/weapon_whirlwind_slash.png'
  ];

  public static getWeaponBlobUrl(pathOrId: string): string {
    if (!pathOrId) return '';
    if (pathOrId.startsWith('blob:') || pathOrId.startsWith('data:')) {
      return pathOrId;
    }
    const cleanId = pathOrId.replace('/textures/weapon_', '').replace('.png', '');
    const standardPath = `/textures/weapon_${cleanId}.png`;
    return this.weaponBlobUrls.get(standardPath) || this.weaponBlobUrls.get(pathOrId) || pathOrId;
  }

  public static initWeaponBlobs(): void {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    this.WEAPON_ICON_URLS.forEach(async (url) => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          this.weaponBlobUrls.set(url, blobUrl);
          const id = url.replace('/textures/weapon_', '').replace('.png', '');
          this.weaponBlobUrls.set(id, blobUrl);
        }
      } catch {}
    });
  }

  // Shared shadow resources (created once, shared across thousands of entities)
  private static sharedShadowTexture: THREE.CanvasTexture | null = null;
  private static sharedShadowGeometry = new THREE.PlaneGeometry(1, 1);
  private static sharedShadowMaterial: THREE.MeshBasicMaterial | null = null;

  public static load(url: string, renderer?: THREE.WebGLRenderer): THREE.Texture {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    const tex = this.loader.load(url, (loadedTex) => {
      if (renderer) {
        renderer.initTexture(loadedTex);
      }
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    this.cache.set(url, tex);
    return tex;
  }

  public static loadDirectional(basePathWithoutExt: string, renderer?: THREE.WebGLRenderer): DirectionalTextures {
    return {
      front: this.load(`${basePathWithoutExt}_front.png`, renderer),
      back: this.load(`${basePathWithoutExt}_back.png`, renderer),
      left: this.load(`${basePathWithoutExt}_left.png`, renderer),
      right: this.load(`${basePathWithoutExt}_right.png`, renderer)
    };
  }

  public static readonly ALL_ASSET_URLS: string[] = [
    // Weapons & Combat
    '/textures/weapon_astral_staff.png',
    '/textures/weapon_bow.png',
    '/textures/weapon_chakram.png',
    '/textures/weapon_flail.png',
    '/textures/weapon_greatsword.png',
    '/textures/weapon_holy_aura.png',
    '/textures/weapon_katana_slash.png',
    '/textures/weapon_kukri.png',
    '/textures/weapon_lightning_strike.png',
    '/textures/weapon_ice_spike.png',
    '/textures/weapon_fireball.png',
    '/textures/weapon_orbiting_barrier.png',
    '/textures/weapon_whirlwind_slash.png',
    '/textures/weapon_reaper_scythe.png',
    '/textures/bullet_revolver.png',
    '/textures/vfx_lightning.png',
    '/textures/vfx_fire_ring.png',
    '/textures/vfx_ice_spike.png',
    '/textures/vfx_fireball.png',
    '/textures/vfx_scythe.png',

    // Heroes - 6 Playable Characters (Walk, Attack, Idle, Walk-Attack, Front)
    '/textures/hero_ronin_front.png',
    '/textures/hero_ronin_idle.png',
    '/textures/hero_ronin_walk.png',
    '/textures/hero_ronin_attack.png',
    '/textures/hero_ronin_walk_attack.png',

    '/textures/hero_valkyrie_front.png',
    '/textures/hero_valkyrie_idle.png',
    '/textures/hero_valkyrie_walk.png',
    '/textures/hero_valkyrie_attack.png',
    '/textures/hero_valkyrie_walk_attack.png',

    '/textures/hero_flail_front.png',
    '/textures/hero_flail_idle.png',
    '/textures/hero_flail_walk.png',
    '/textures/hero_flail_attack.png',
    '/textures/hero_flail_walk_attack.png',

    '/textures/hero_sorceress_front.png',
    '/textures/hero_sorceress_idle.png',
    '/textures/hero_sorceress_walk.png',
    '/textures/hero_sorceress_attack.png',
    '/textures/hero_sorceress_walk_attack.png',

    '/textures/hero_chakram_front.png',
    '/textures/hero_chakram_idle.png',
    '/textures/hero_chakram_walk.png',
    '/textures/hero_chakram_attack.png',
    '/textures/hero_chakram_walk_attack.png',

    '/textures/hero_archer_front.png',
    '/textures/hero_archer_idle.png',
    '/textures/hero_archer_walk.png',
    '/textures/hero_archer_attack.png',
    '/textures/hero_archer_walk_attack.png',

    // Legacy Hero Avatars
    '/textures/hero_male_front.png',
    '/textures/hero_male_back.png',
    '/textures/hero_male_left.png',
    '/textures/hero_male_right.png',
    '/textures/hero_female_front.png',
    '/textures/hero_female_back.png',
    '/textures/hero_female_left.png',
    '/textures/hero_female_right.png',

    // Bosses
    '/textures/boss_demon_walk.png',
    '/textures/boss_demon_attack.png',
    '/textures/boss_demon_front.png',
    '/textures/boss_demon_back.png',
    '/textures/boss_demon_left.png',
    '/textures/boss_demon_right.png',

    '/textures/boss_hydra_walk.png',
    '/textures/boss_hydra_attack.png',
    '/textures/boss_hydra_front.png',
    '/textures/boss_hydra_back.png',
    '/textures/boss_hydra_left.png',
    '/textures/boss_hydra_right.png',

    '/textures/boss_sheriff_front.png',
    '/textures/boss_sheriff_back.png',
    '/textures/boss_sheriff_left.png',
    '/textures/boss_sheriff_right.png',

    // Monsters (4 Directions)
    '/textures/monster_coyote_front.png',
    '/textures/monster_coyote_back.png',
    '/textures/monster_coyote_left.png',
    '/textures/monster_coyote_right.png',

    '/textures/monster_crawler_front.png',
    '/textures/monster_crawler_back.png',
    '/textures/monster_crawler_left.png',
    '/textures/monster_crawler_right.png',

    '/textures/monster_cactus_front.png',
    '/textures/monster_cactus_back.png',
    '/textures/monster_cactus_left.png',
    '/textures/monster_cactus_right.png',

    '/textures/monster_skeleton_front.png',
    '/textures/monster_skeleton_back.png',
    '/textures/monster_skeleton_left.png',
    '/textures/monster_skeleton_right.png',

    '/textures/monster_ghost_front.png',
    '/textures/monster_ghost_back.png',
    '/textures/monster_ghost_left.png',
    '/textures/monster_ghost_right.png',

    '/textures/monster_scorpion_front.png',
    '/textures/monster_scorpion_back.png',
    '/textures/monster_scorpion_left.png',
    '/textures/monster_scorpion_right.png',

    '/textures/monster_brute_front.png',
    '/textures/monster_brute_back.png',
    '/textures/monster_brute_left.png',
    '/textures/monster_brute_right.png',

    '/textures/monster_bison_front.png',
    '/textures/monster_bison_back.png',
    '/textures/monster_bison_left.png',
    '/textures/monster_bison_right.png',

    // UI & Environment
    '/textures/menu_background.jpg'
  ];

  /**
   * Comprehensive asset preloader with progress callback.
   * Loads and decodes all images into browser cache (preventing UI hitch on weapon/character choice)
   * and compiles/uploads textures to the WebGL GPU memory upfront.
   */
  public static async preloadAllWithProgress(
    renderer?: THREE.WebGLRenderer,
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
          const res = await fetch(url);
          if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            this.weaponBlobUrls.set(url, blobUrl);
            const id = url.replace('/textures/weapon_', '').replace('.png', '');
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
            // 1. Browser DOM Image cache and asynchronous bitmap decoding
            const img = new Image();
            img.src = url;
            if (img.decode) {
              await img.decode().catch(() => {});
            }

            // 2. Three.js Texture cache & GPU texture upload
            await new Promise<void>((resolve) => {
              this.loader.load(
                url,
                (tex) => {
                  tex.colorSpace = THREE.SRGBColorSpace;
                  if (
                    url.includes('_walk.png') ||
                    url.includes('_attack.png') ||
                    url.includes('_idle.png') ||
                    url.includes('bullet_')
                  ) {
                    tex.magFilter = THREE.NearestFilter;
                  } else {
                    tex.magFilter = THREE.LinearFilter;
                  }
                  tex.minFilter = THREE.LinearMipmapLinearFilter;
                  this.cache.set(url, tex);
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
  public static preloadAll(renderer?: THREE.WebGLRenderer) {
    this.preloadAllWithProgress(renderer).catch(() => {});
  }

  public static loadBossTextures(baseName: string, renderer?: THREE.WebGLRenderer): BossTextures {
    const loadPixel = (url: string) => {
      const tex = this.load(url, renderer);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      return tex;
    };

    return {
      walk: loadPixel(`/textures/${baseName}_walk.png`),
      attack: loadPixel(`/textures/${baseName}_attack.png`)
    };
  }

  public static loadAnimatedTextures(baseName: string, renderer?: THREE.WebGLRenderer): AnimatedCharacterTextures {
    const loadPixel = (url: string) => {
      const tex = this.load(url, renderer);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      return tex;
    };

    return {
      idle: loadPixel(`/textures/${baseName}_idle.png`),
      walk: loadPixel(`/textures/${baseName}_walk.png`),
      attack: loadPixel(`/textures/${baseName}_attack.png`),
      walk_attack: loadPixel(`/textures/${baseName}_walk_attack.png`)
    };
  }

  public static loadSwordsmanTextures(renderer?: THREE.WebGLRenderer): SwordsmanTextures {
    return this.loadAnimatedTextures('hero_swordsman', renderer);
  }

  public static loadRoninTextures(renderer?: THREE.WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_ronin', renderer);
  }

  public static loadValkyrieTextures(renderer?: THREE.WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_valkyrie', renderer);
  }

  public static loadFlailTextures(renderer?: THREE.WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_flail', renderer);
  }

  public static loadSorceressTextures(renderer?: THREE.WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_sorceress', renderer);
  }

  public static loadChakramTextures(renderer?: THREE.WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_chakram', renderer);
  }

  public static loadArcherTextures(renderer?: THREE.WebGLRenderer): AnimatedCharacterTextures {
    return this.loadAnimatedTextures('hero_archer', renderer);
  }

  public static getBulletTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
    const tex = this.load('/textures/bullet_revolver.png', renderer);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  private static sharedArrowTexture: THREE.CanvasTexture | null = null;

  public static getArrowTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
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

      this.sharedArrowTexture = new THREE.CanvasTexture(canvas);
      this.sharedArrowTexture.colorSpace = THREE.SRGBColorSpace;
      this.sharedArrowTexture.magFilter = THREE.LinearFilter;
      this.sharedArrowTexture.minFilter = THREE.LinearMipmapLinearFilter;
      if (renderer) {
        renderer.initTexture(this.sharedArrowTexture);
      }
    }
    return this.sharedArrowTexture;
  }

  public static getKukriTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
    const tex = this.load('/textures/weapon_kukri.png', renderer);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  public static getChakramTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
    const tex = this.load('/textures/weapon_chakram.png', renderer);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  public static getLightningTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
    const tex = this.load('/textures/vfx_lightning.png', renderer);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  public static getIceSpikeTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
    const tex = this.load('/textures/vfx_ice_spike.png', renderer);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  public static getFireballTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
    const tex = this.load('/textures/vfx_fireball.png', renderer);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  public static getScytheTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
    const tex = this.load('/textures/vfx_scythe.png', renderer);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  public static getFireRingTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
    const tex = this.load('/textures/vfx_fire_ring.png', renderer);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  /**
   * High-performance contact shadow mesh sharing a single texture and material.
   */
  public static createShadowMesh(radius: number): THREE.Mesh {
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

      this.sharedShadowTexture = new THREE.CanvasTexture(canvas);
      this.sharedShadowTexture.minFilter = THREE.LinearFilter;
      this.sharedShadowMaterial = new THREE.MeshBasicMaterial({
        map: this.sharedShadowTexture,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });
    }

    const shadow = new THREE.Mesh(this.sharedShadowGeometry, this.sharedShadowMaterial!);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    const diameter = radius * 2;
    shadow.scale.set(diameter, diameter, 1);
    return shadow;
  }
}

// Immediately initiate background prefetch of weapon icon blobs
TextureManager.initWeaponBlobs();

