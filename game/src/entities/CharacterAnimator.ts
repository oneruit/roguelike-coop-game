import { MeshBasicMaterial, MeshDepthMaterial, Texture } from 'three';
import { AnimatedCharacterTextures, SpriteDirection } from '../core/TextureManager';
import { CharacterType, HeroAnimState } from '../shared/types/entities';

/**
 * Grid layout specification for directional spritesheets.
 */
export interface CharacterAnimLayout {
  cols: number;
  rows: number;
  rowMap: Record<SpriteDirection, number>;
}

/**
 * State configuration for animation timing and playback.
 */
export interface CharacterAnimStateConfig {
  fps: number;
  loop?: boolean;
}

/**
 * V2 Pipeline Standard Layout:
 * Row 0: FRONT (Лицо)
 * Row 1: BACK (Спина)
 * Row 2: RIGHT (Правая сторона)
 * Row 3: LEFT (Левая сторона)
 * 6 frames per row.
 */
export const ANIM_LAYOUT_V2: CharacterAnimLayout = {
  cols: 6,
  rows: 4,
  rowMap: {
    front: 0,
    back: 1,
    right: 2,
    left: 3
  }
};

/**
 * Necromancer / Transition Layout:
 * Row 0: FRONT, Row 1: BACK, Row 2: LEFT, Row 3: RIGHT
 */
export const ANIM_LAYOUT_NECROMANCER: CharacterAnimLayout = {
  cols: 6,
  rows: 4,
  rowMap: {
    front: 0,
    back: 1,
    left: 2,
    right: 3
  }
};

/**
 * Legacy 4x4 Standard:
 * Row 0: FRONT, Row 1: LEFT, Row 2: RIGHT, Row 3: BACK
 */
export const ANIM_LAYOUT_LEGACY: CharacterAnimLayout = {
  cols: 4,
  rows: 4,
  rowMap: {
    front: 0,
    left: 1,
    right: 2,
    back: 3
  }
};

/**
 * Resolves standard row layouts for all playable characters.
 */
export function getCharacterAnimLayout(charType: CharacterType): CharacterAnimLayout {
  switch (charType) {
    case 'necromancer':
    case 'amazon':
    case 'valkyrie':
    case 'sorceress':
    case 'chakram':
    case 'flail':
    case 'ronin':
    case 'archer':
      return ANIM_LAYOUT_V2;
    case 'invoker':
    case 'rocket':
    default:
      return ANIM_LAYOUT_LEGACY;
  }
}

/**
 * Modular Character Animator
 * Handles directional sprite state machines, UV repeat/offset calculations,
 * and Three.js material bindings across 4 animation states:
 * - IDLE: состояние покоя
 * - WALK: состояние движения
 * - IDLE_ATTACK: состояние атаки в покое
 * - WALK_ATTACK: атака в движении
 */
export class CharacterAnimator {
  public animState: HeroAnimState = 'IDLE';
  public currentDir: SpriteDirection = 'front';
  public animFrameTimer: number = 0;
  public attackAnimTimer: number = 0;

  private stateConfigs: Record<HeroAnimState, CharacterAnimStateConfig> = {
    IDLE: { fps: 8, loop: true },
    WALK: { fps: 12, loop: true },
    IDLE_ATTACK: { fps: 16, loop: false },
    WALK_ATTACK: { fps: 16, loop: false }
  };

  constructor(
    public textures: AnimatedCharacterTextures,
    public layout: CharacterAnimLayout = ANIM_LAYOUT_V2,
    customConfigs?: Partial<Record<HeroAnimState, CharacterAnimStateConfig>>
  ) {
    if (customConfigs) {
      this.stateConfigs = { ...this.stateConfigs, ...customConfigs };
    }
  }

  public setDirection(dir: SpriteDirection): void {
    this.currentDir = dir;
  }

  public triggerAttack(duration: number = 0.5): void {
    this.attackAnimTimer = duration;
    const cols = this.layout.cols || 6;
    const targetFps = Math.max(8, cols / Math.max(0.05, duration));
    this.stateConfigs.IDLE_ATTACK.fps = targetFps;
    this.stateConfigs.WALK_ATTACK.fps = targetFps;
    if (this.animState !== 'IDLE_ATTACK' && this.animState !== 'WALK_ATTACK') {
      this.animFrameTimer = 0;
    }
  }

  public setState(state: HeroAnimState): void {
    if (this.animState !== state) {
      this.animState = state;
      this.animFrameTimer = 0;
    }
  }

  public getActiveTexture(): Texture {
    switch (this.animState) {
      case 'IDLE_ATTACK':
        return this.textures.idle_attack ?? this.textures.attack ?? this.textures.idle;
      case 'WALK_ATTACK':
        return this.textures.walk_attack ?? this.textures.idle_attack ?? this.textures.attack ?? this.textures.walk;
      case 'WALK':
        return this.textures.walk;
      case 'IDLE':
      default:
        return this.textures.idle;
    }
  }

  /**
   * Advances the animation timer and maps UV coordinates on the target material.
   */
  public update(
    dt: number,
    isMoving: boolean,
    targetMaterial: MeshBasicMaterial,
    depthMaterial?: MeshDepthMaterial,
    forcedState?: HeroAnimState
  ): void {
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer -= dt;
    }

    if (forcedState) {
      let state = forcedState;
      if ((state as string) === 'ATTACK') {
        state = isMoving ? 'WALK_ATTACK' : 'IDLE_ATTACK';
      }
      this.setState(state);
    } else {
      const isAttacking = this.attackAnimTimer > 0;
      let nextState: HeroAnimState = 'IDLE';
      if (isAttacking && isMoving) {
        nextState = 'WALK_ATTACK';
      } else if (isAttacking) {
        nextState = 'IDLE_ATTACK';
      } else if (isMoving) {
        nextState = 'WALK';
      } else {
        nextState = 'IDLE';
      }
      this.setState(nextState);
    }

    const cfg = this.stateConfigs[this.animState];
    const tex = this.getActiveTexture();

    // Dynamically detect column count from texture aspect ratio if image is loaded
    const img = (tex as any).image as { width?: number; height?: number } | undefined;
    const dynamicCols = img && img.width && img.height && img.height > 0
      ? Math.round((img.width / img.height) * this.layout.rows)
      : this.layout.cols;

    this.animFrameTimer += dt * cfg.fps;

    const frameCol = cfg.loop !== false
      ? Math.floor(this.animFrameTimer) % dynamicCols
      : Math.min(Math.floor(this.animFrameTimer), dynamicCols - 1);

    const row = this.layout.rowMap[this.currentDir] ?? 0;

    if (targetMaterial.map !== tex) {
      targetMaterial.map = tex;
      if (depthMaterial) {
        depthMaterial.map = tex;
        depthMaterial.needsUpdate = true;
      }
    }

    // Three.js UV repeat and offset mapping
    // Y is flipped in OpenGL texture space: (rows - 1 - row) / rows
    tex.repeat.set(1 / dynamicCols, 1 / this.layout.rows);
    tex.offset.set(frameCol / dynamicCols, (this.layout.rows - 1 - row) / this.layout.rows);
  }
}
