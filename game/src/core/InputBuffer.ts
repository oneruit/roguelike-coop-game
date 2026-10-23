/**
 * High-performance, zero-React input buffer for game actions and continuous directional movement.
 * Buffers discrete key/click actions between ticks so inputs are never lost during frame pauses or low tick rates.
 */

export type InputActionType =
  | 'interact'
  | 'dash'
  | 'teleport_to_rift'
  | 'toggle_inventory'
  | 'toggle_map'
  | 'toggle_pause'
  | 'toggle_dev_mode'
  | 'toggle_debug_hud'
  | 'toggle_dps_meter'
  | 'cast_ability_1'
  | 'cast_ability_2'
  | 'cast_ability_3';

export interface BufferedInputAction {
  type: InputActionType;
  timestamp: number;
  payload?: any;
}

export class InputBuffer {
  private static instance: InputBuffer | null = null;
  private actionQueue: BufferedInputAction[] = [];
  private moveVector = { x: 0, z: 0 };
  private aimPosition = { x: 0, z: 0 };

  public static getInstance(): InputBuffer {
    if (!InputBuffer.instance) {
      InputBuffer.instance = new InputBuffer();
    }
    return InputBuffer.instance;
  }

  /**
   * Resets singleton instance (useful for unit testing).
   */
  public static resetInstance(): void {
    InputBuffer.instance = null;
  }

  /**
   * Pushes a discrete action into the queue.
   */
  public queueAction(type: InputActionType, payload?: any): void {
    this.actionQueue.push({
      type,
      timestamp: performance.now(),
      payload
    });
  }

  /**
   * Consumes and removes all pending actions at the start of a simulation tick.
   */
  public consumeActions(): BufferedInputAction[] {
    if (this.actionQueue.length === 0) return [];
    const actions = this.actionQueue;
    this.actionQueue = [];
    return actions;
  }

  /**
   * Consumes and removes the earliest action of a specific type.
   */
  public consumeAction(type: InputActionType): BufferedInputAction | undefined {
    const idx = this.actionQueue.findIndex((a) => a.type === type);
    if (idx !== -1) {
      const [action] = this.actionQueue.splice(idx, 1);
      return action;
    }
    return undefined;
  }

  /**
   * Checks if a specific action is queued without consuming it.
   */
  public hasAction(type: InputActionType): boolean {
    return this.actionQueue.some((a) => a.type === type);
  }

  /**
   * Sets continuous 2D move vector on XZ plane.
   */
  public setMoveVector(x: number, z: number): void {
    this.moveVector.x = x;
    this.moveVector.z = z;
  }

  /**
   * Returns current continuous move vector.
   */
  public getMoveVector(): { x: number; z: number } {
    return this.moveVector;
  }

  /**
   * Sets current mouse/aim world position on XZ plane.
   */
  public setAimPosition(x: number, z: number): void {
    this.aimPosition.x = x;
    this.aimPosition.z = z;
  }

  /**
   * Returns current aim world position.
   */
  public getAimPosition(): { x: number; z: number } {
    return this.aimPosition;
  }

  /**
   * Clears all queued actions and resets vectors.
   */
  public clear(): void {
    this.actionQueue = [];
    this.moveVector = { x: 0, z: 0 };
    this.aimPosition = { x: 0, z: 0 };
  }
}
