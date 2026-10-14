import {
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial
} from 'three';
import { CharacterType, HeroAnimState, SpriteDirection } from '../../shared/types';
import { CharacterAnimator, getCharacterAnimLayout } from '../../entities/CharacterAnimator';
import { TextureManager, AnimatedCharacterTextures } from '../../core/TextureManager';

export interface PlayerAnimationOptions {
  spriteMesh: Mesh;
  spriteMaterial: MeshBasicMaterial;
  customDepthMaterial?: MeshDepthMaterial;
}

/**
 * Handles sprite direction, sheet animations (IDLE, WALK, ATTACK),
 * texture loading, and damage/status color tints for players.
 * Uses unified CharacterAnimator for all character types.
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

    const idleAttack = (raw.idle_attack || raw.attack).clone();
    const walkAttack = (raw.walk_attack || raw.idle_attack || raw.attack).clone();
    const textures: AnimatedCharacterTextures = {
      idle: raw.idle.clone(),
      walk: raw.walk.clone(),
      idle_attack: idleAttack,
      walk_attack: walkAttack,
      attack: idleAttack
    };
    textures.idle.needsUpdate = true;
    textures.walk.needsUpdate = true;
    textures.idle_attack.needsUpdate = true;
    textures.walk_attack.needsUpdate = true;
    return textures;
  }

  public isAnimatedCharacter(_charType?: CharacterType): boolean {
    return true;
  }

  public loadCharacterTextures(charType: CharacterType): AnimatedCharacterTextures {
    this.animatedTextures = PlayerAnimation.loadTextures(charType);
    this.animator = new CharacterAnimator(
      this.animatedTextures,
      getCharacterAnimLayout(charType)
    );
    this.animator.setDirection(this.currentDir);
    return this.animatedTextures;
  }

  public setDirection(dir: SpriteDirection): void {
    this.currentDir = dir;
    if (this.animator) {
      this.animator.setDirection(dir);
    }
  }

  public triggerAttackAnim(duration: number = 0.5): void {
    this.attackAnimTimer = duration;
    this.animFrameTimer = 0;
    if (this.animator) {
      this.animator.triggerAttack(duration);
    }
  }

  public update(
    dt: number,
    isMoving: boolean,
    _charType: CharacterType,
    spriteMaterial: MeshBasicMaterial,
    customDepthMaterial?: MeshDepthMaterial
  ): void {
    if (!this.animatedTextures || !this.animator) return;

    this.animator.update(dt, isMoving, spriteMaterial, customDepthMaterial);
    this.animState = this.animator.animState;
    this.animFrameTimer = this.animator.animFrameTimer;
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
