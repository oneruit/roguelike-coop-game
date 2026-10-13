import {
  Texture,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial
} from 'three';
import { CharacterType, HeroAnimState, SpriteDirection } from '../../shared/types';
import { CharacterAnimator, ANIM_LAYOUT_V2 } from '../../entities/CharacterAnimator';
import { TextureManager, AnimatedCharacterTextures } from '../../core/TextureManager';

export interface PlayerAnimationOptions {
  spriteMesh: Mesh;
  spriteMaterial: MeshBasicMaterial;
  customDepthMaterial?: MeshDepthMaterial;
}

/**
 * Handles sprite direction, sheet animations (IDLE, WALK, ATTACK, WALK_ATTACK),
 * texture loading, and damage/status color tints for players.
 */
export class PlayerAnimation {
  public spriteMesh: Mesh;
  public spriteMaterial: MeshBasicMaterial;
  public customDepthMaterial?: MeshDepthMaterial;
  public animatedTextures?: AnimatedCharacterTextures;
  public animator?: CharacterAnimator;

  public animState: HeroAnimState = 'IDLE';
  public currentDir: SpriteDirection = 'front';
  public attackAnimTimer: number = 0;
  public animFrameTimer: number = 0;
  public flashTimer: number = 0;

  constructor(options: PlayerAnimationOptions) {
    this.spriteMesh = options.spriteMesh;
    this.spriteMaterial = options.spriteMaterial;
    this.customDepthMaterial = options.customDepthMaterial;
  }

  public static loadTextures(charType: CharacterType): AnimatedCharacterTextures {
    const raw =
      charType === 'amazon'
        ? TextureManager.loadAmazonTextures()
        : charType === 'invoker'
        ? TextureManager.loadInvokerTextures()
        : charType === 'valkyrie'
        ? TextureManager.loadValkyrieTextures()
        : charType === 'flail'
        ? TextureManager.loadFlailTextures()
        : charType === 'sorceress'
        ? TextureManager.loadSorceressTextures()
        : charType === 'chakram'
        ? TextureManager.loadChakramTextures()
        : charType === 'archer'
        ? TextureManager.loadArcherTextures()
        : charType === 'rocket'
        ? TextureManager.loadRocketTextures()
        : charType === 'necromancer'
        ? TextureManager.loadNecromancerTextures()
        : TextureManager.loadRoninTextures();

    const textures: AnimatedCharacterTextures = {
      idle: raw.idle.clone(),
      walk: raw.walk.clone(),
      attack: raw.attack.clone(),
      walk_attack: raw.walk_attack.clone()
    };
    textures.idle.needsUpdate = true;
    textures.walk.needsUpdate = true;
    textures.attack.needsUpdate = true;
    textures.walk_attack.needsUpdate = true;
    return textures;
  }

  public isAnimatedCharacter(_charType?: CharacterType): boolean {
    return true;
  }

  public loadCharacterTextures(charType: CharacterType): AnimatedCharacterTextures {
    this.animatedTextures = PlayerAnimation.loadTextures(charType);
    if (charType === 'amazon') {
      this.animator = new CharacterAnimator(this.animatedTextures, ANIM_LAYOUT_V2);
    } else {
      this.animator = undefined;
    }
    return this.animatedTextures;
  }

  public setDirection(dir: SpriteDirection): void {
    this.currentDir = dir;
    if (this.animator) {
      this.animator.setDirection(dir);
    }
  }

  public triggerAttackAnim(duration: number = 0.5): void {
    this.attackAnimTimer = Math.max(this.attackAnimTimer, duration);
    if (this.animator) {
      this.animator.triggerAttack(duration);
    }
  }

  public update(
    dt: number,
    isMoving: boolean,
    charType: CharacterType,
    spriteMaterial: MeshBasicMaterial,
    customDepthMaterial?: MeshDepthMaterial
  ): void {
    if (!this.animatedTextures) return;

    if (this.animator) {
      this.animator.update(dt, isMoving, spriteMaterial, customDepthMaterial);
      this.animState = this.animator.animState;
      return;
    }

    const STATE_CONFIG: Record<HeroAnimState, { texture: Texture; cols: number; fps: number }> = {
      IDLE: {
        texture: this.animatedTextures.idle,
        cols: 6,
        fps: 8
      },
      WALK: {
        texture: this.animatedTextures.walk,
        cols: 6,
        fps: 12
      },
      ATTACK: {
        texture: this.animatedTextures.attack,
        cols: 6,
        fps: 16
      },
      WALK_ATTACK: {
        texture: this.animatedTextures.walk_attack,
        cols: 6,
        fps: 14
      }
    };

    const cfg = STATE_CONFIG[this.animState];
    const tex = cfg.texture;

    const img = (tex as any).image as { width?: number; height?: number } | undefined;
    const dynamicCols = (img && img.width && img.height && img.height > 0)
      ? Math.round((img.width / img.height) * 4)
      : cfg.cols;

    this.animFrameTimer += dt * cfg.fps;
    const frameCol = Math.floor(this.animFrameTimer) % dynamicCols;

    const isNewStandard = charType === 'necromancer';
    const DIR_ROW_MAP: Record<SpriteDirection, number> = isNewStandard
      ? { front: 0, back: 1, left: 2, right: 3 }
      : { front: 0, left: 1, right: 2, back: 3 };
    const row = DIR_ROW_MAP[this.currentDir];

    if (spriteMaterial.map !== tex) {
      spriteMaterial.map = tex;
      if (customDepthMaterial) {
        customDepthMaterial.map = tex;
        customDepthMaterial.needsUpdate = true;
      }
    }

    tex.repeat.set(1 / dynamicCols, 1 / 4);
    tex.offset.set(frameCol / dynamicCols, (3 - row) / 4);
  }

  public updateVisualTints(
    dt: number,
    isBurning: boolean,
    isShocked: boolean,
    isSlowed: boolean,
    isGhost: boolean
  ): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.spriteMaterial.color.setHex(0xffffff);
      }
    } else if (isBurning) {
      this.spriteMaterial.color.setHex(0xfb923c); // Blazing orange
    } else if (isShocked) {
      this.spriteMaterial.color.setHex(0x93c5fd); // Electrified light blue
    } else if (isSlowed) {
      this.spriteMaterial.color.setHex(0x67e8f9); // Chilled cyan
    } else {
      this.spriteMaterial.color.setHex(0xffffff);
    }

    this.spriteMaterial.opacity = isGhost ? 0.4 : 1;
  }

  public triggerHitFlash(duration: number = 0.15): void {
    this.flashTimer = duration;
    this.spriteMaterial.color.setHex(0xff4444);
  }
}
