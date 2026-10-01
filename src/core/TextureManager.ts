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

  /**
   * Preloads all entity sprite sheets upfront to eliminate mid-game texture loading hitch.
   */
  public static preloadAll(renderer?: THREE.WebGLRenderer) {
    const prefixes = [
      '/textures/monster_coyote',
      '/textures/monster_crawler',
      '/textures/monster_cactus',
      '/textures/monster_skeleton',
      '/textures/monster_ghost',
      '/textures/monster_scorpion',
      '/textures/monster_brute',
      '/textures/monster_bison',
      '/textures/boss_sheriff',
      '/textures/boss_demon',
      '/textures/boss_hydra'
    ];

    for (const prefix of prefixes) {
      this.loadDirectional(prefix, renderer);
    }

    // Preload animated Boss textures
    this.loadBossTextures('boss_demon', renderer);
    this.loadBossTextures('boss_hydra', renderer);

    // Preload revolver bullet and weapon chakram sprite
    this.getBulletTexture(renderer);
    this.getChakramTexture(renderer);

    // Preload Ronin, Valkyrie, Flail, Sorceress and Chakram hero sprite sheets
    this.loadRoninTextures(renderer);
    this.loadValkyrieTextures(renderer);
    this.loadFlailTextures(renderer);
    this.loadSorceressTextures(renderer);
    this.loadChakramTextures(renderer);
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

  public static getBulletTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
    const tex = this.load('/textures/bullet_revolver.png', renderer);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  public static getChakramTexture(renderer?: THREE.WebGLRenderer): THREE.Texture {
    const tex = this.load('/textures/weapon_chakram.png', renderer);
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
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);

      this.sharedShadowTexture = new THREE.CanvasTexture(canvas);
      this.sharedShadowTexture.minFilter = THREE.LinearFilter;
      this.sharedShadowMaterial = new THREE.MeshBasicMaterial({
        map: this.sharedShadowTexture,
        transparent: true,
        depthWrite: false
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
