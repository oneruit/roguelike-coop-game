import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { SoundManager } from '../../../core/SoundManager';

export interface MainMenuScreenOptions {
  container?: HTMLElement | null;
  onSinglePlayer?: () => void;
  onCoop?: () => void;
  onQuests?: () => void;
  onSettings?: () => void;
  onExit?: () => void;
}

/**
 * Modular Main Menu Screen (Dark ARPG Rift UI).
 * Coordinates singleplayer start, multiplayer lobby, quests toggle, settings, and exit.
 */
export class MainMenuScreen extends Screen {
  private options: MainMenuScreenOptions;

  constructor(options: MainMenuScreenOptions = {}) {
    const existingModal = options.container || SafeDOM.getElementById('main-menu-modal');
    super('main-menu', existingModal);
    this.options = options;

    this.bindElements();
    this.bindEvents();
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {}

  protected bindEvents(): void {
    SafeDOM.query(this.container, '#menu-btn-single')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.options.onSinglePlayer?.();
    });

    SafeDOM.query(this.container, '#menu-btn-coop')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.options.onCoop?.();
    });

    SafeDOM.query(this.container, '#menu-btn-quests')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.options.onQuests?.();
    });

    SafeDOM.query(this.container, '#menu-btn-settings')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.options.onSettings?.();
    });

    SafeDOM.query(this.container, '#menu-btn-exit')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.options.onExit?.();
    });
  }

  protected onShow(): void {
    document.body.classList.add('is-main-menu');
    document.body.classList.remove('is-in-game');
  }

  protected onHide(): void {
    document.body.classList.remove('is-main-menu');
  }
}
