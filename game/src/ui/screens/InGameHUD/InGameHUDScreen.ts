import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';

export interface InGameHUDScreenOptions {
  container?: HTMLElement | null;
}

/**
 * Base In-Game HUD Screen.
 * Provides modular Screen lifecycle for the in-combat overlay.
 */
export class InGameHUDScreen extends Screen {
  constructor(options?: InGameHUDScreenOptions) {
    const existing = options?.container || SafeDOM.getElementById('in-game-hud');
    super('in-game-hud', existing);
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {}
  protected bindEvents(): void {}
}
