import { Vector3 } from 'three';
import { ObstacleManager } from '../../world/ObstacleManager';
import { SpriteDirection } from '../../shared/types';

export interface PlayerMotorOptions {
  dashDuration?: number;
  maxDashCooldown?: number;
  collisionRadius?: number;
  mapBound?: number;
}

/**
 * Handles physics, movement calculations, terrain interactions,
 * tactical dash mechanics, and map boundary constraints for the Player.
 */
export class PlayerMotor {
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public dashDuration: number = 0.22;
  public dashCooldown: number = 0;
  public maxDashCooldown: number = 2.5;
  public dashDirection: Vector3 = new Vector3();

  public isMoving: boolean = false;
  public isTerrainSlowed: boolean = false;
  public currentDir: SpriteDirection = 'front';
  public animTimer: number = 0;

  public collisionRadius: number = 0.45;
  public mapBound: number = 218;

  constructor(options?: PlayerMotorOptions) {
    if (options?.dashDuration !== undefined) this.dashDuration = options.dashDuration;
    if (options?.maxDashCooldown !== undefined) this.maxDashCooldown = options.maxDashCooldown;
    if (options?.collisionRadius !== undefined) this.collisionRadius = options.collisionRadius;
    if (options?.mapBound !== undefined) this.mapBound = options.mapBound;
  }

  /**
   * Attempts to trigger a tactical dash in moveDir or facing direction.
   * Returns true if dash succeeded, false if on cooldown.
   */
  public triggerDash(
    moveDir: Vector3,
    fallbackDir?: SpriteDirection
  ): boolean {
    if (this.dashCooldown > 0 || this.isDashing) return false;

    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.dashCooldown = this.maxDashCooldown;

    if (moveDir.lengthSq() > 0.01) {
      this.dashDirection.copy(moveDir).normalize();
    } else {
      const dir = fallbackDir || this.currentDir;
      const x = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const z = dir === 'back' ? -1 : 1;
      this.dashDirection.set(x, 0, z).normalize();
    }
    return true;
  }

  /**
   * Updates dash timers and applies dash displacement.
   */
  public updateDash(
    dt: number,
    position: Vector3,
    speed: number,
    obstacleManager?: ObstacleManager
  ): { isDashing: boolean; justEnded: boolean } {
    let justEnded = false;

    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      position.addScaledVector(this.dashDirection, speed * 2.5 * dt);

      if (obstacleManager) {
        obstacleManager.resolveEntityCollision(position, this.collisionRadius);
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        justEnded = true;
      }
    }

    return { isDashing: this.isDashing, justEnded };
  }

  /**
   * Calculates standard movement, rough terrain slowdown, obstacle collision resolution,
   * direction changes, and world boundary clamping.
   */
  public updateMovement(
    dt: number,
    position: Vector3,
    moveDir: Vector3,
    speed: number,
    movementMultiplier: number,
    obstacleManager?: ObstacleManager,
    getTerrainSlowFactor?: (x: number, z: number) => number,
    isAttackingInvoker: boolean = false
  ): {
    isMoving: boolean;
    newDir: SpriteDirection;
    terrainSlow: number;
  } {
    const isMoving = moveDir.lengthSq() > 0.01;
    this.isMoving = isMoving;

    const terrainSlow = getTerrainSlowFactor ? getTerrainSlowFactor(position.x, position.z) : 1.0;
    this.isTerrainSlowed = terrainSlow < 0.99;

    let dir = this.currentDir;

    if (isMoving) {
      const effectiveSpeed = speed * terrainSlow * movementMultiplier;
      position.addScaledVector(moveDir, effectiveSpeed * dt);
      this.animTimer += dt * 12 * terrainSlow;

      if (Math.abs(moveDir.x) >= Math.abs(moveDir.z)) {
        dir = moveDir.x < 0 ? 'left' : 'right';
      } else {
        dir = moveDir.z < 0 ? 'back' : 'front';
      }

      if (!isAttackingInvoker) {
        this.currentDir = dir;
      }
    } else {
      this.animTimer += dt * 3;
    }

    // Resolve obstacles
    if (obstacleManager) {
      obstacleManager.resolveEntityCollision(position, this.collisionRadius);
    }

    // Clamp map boundaries
    position.x = Math.max(-this.mapBound, Math.min(this.mapBound, position.x));
    position.z = Math.max(-this.mapBound, Math.min(this.mapBound, position.z));
    position.y = 0;

    return { isMoving, newDir: dir, terrainSlow };
  }

  public reset(_pos?: Vector3): void {
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.isMoving = false;
    this.isTerrainSlowed = false;
    this.currentDir = 'front';
    this.animTimer = 0;
  }
}
