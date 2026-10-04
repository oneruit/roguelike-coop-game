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

    // Preload revolver bullet, arrow, kukri and all weapon textures
    this.getBulletTexture(renderer);
    this.getArrowTexture(renderer);
    this.getKukriTexture(renderer);
    this.getChakramTexture(renderer);

    const weaponUrls = [
      '/textures/weapon_chakram.png',
      '/textures/weapon_bow.png',
      '/textures/weapon_kukri.png',
      '/textures/weapon_katana_slash.png',
      '/textures/weapon_greatsword.png',
      '/textures/weapon_flail.png',
      '/textures/weapon_astral_staff.png',
      '/textures/weapon_orbiting_barrier.png',
      '/textures/weapon_holy_aura.png',
      '/textures/weapon_whirlwind_slash.png'
    ];
    for (const url of weaponUrls) {
      this.load(url, renderer);
    }

    // Preload Ronin, Valkyrie, Flail, Sorceress, Chakram and Archer hero sprite sheets
    this.loadRoninTextures(renderer);
    this.loadValkyrieTextures(renderer);
    this.loadFlailTextures(renderer);
    this.loadSorceressTextures(renderer);
    this.loadChakramTextures(renderer);
    this.loadArcherTextures(renderer);
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
