import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { SoundManager } from '../../../core/SoundManager';
import { MetaProgression } from '../../../meta/MetaProgression';
import { AuthManager, AuthUser } from '../../../auth/AuthManager';

export interface MainMenuScreenOptions {
  container?: HTMLElement | null;
  onSinglePlayer?: () => void;
  onCoop?: () => void;
  onShop?: () => void;
  onQuests?: () => void;
  onSettings?: () => void;
  onAuth?: () => void;
  onExit?: () => void;
}

/**
 * Modular Main Menu Screen (Dark ARPG Rift UI).
 * Coordinates singleplayer start, multiplayer lobby, quests toggle, talents shop, settings, and exit.
 */
export class MainMenuScreen extends Screen {
  private options: MainMenuScreenOptions;
  private unsubscribeMeta?: () => void;
  private unsubscribeAuth?: () => void;

  constructor(options: MainMenuScreenOptions = {}) {
    const existingModal = options.container || SafeDOM.getElementById('main-menu-modal');
    super('main-menu', existingModal);
    this.options = options;

    this.bindElements();
    this.bindEvents();

    this.unsubscribeMeta = MetaProgression.getInstance().onChange(() => {
      this.updateCrystalsDisplay();
    });

    this.unsubscribeAuth = AuthManager.getInstance().onAuthStateChanged((user) => {
      this.updateAuthDisplay(user);
    });
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

    SafeDOM.query(this.container, '#menu-btn-shop')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.options.onShop?.();
    });

    SafeDOM.query(this.container, '#main-menu-crystals-pill')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.options.onShop?.();
    });

    SafeDOM.query(this.container, '#main-menu-auth-pill')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.options.onAuth?.();
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

  public updateCrystalsDisplay(): void {
    const crystals = MetaProgression.getInstance().getCrystals();
    const countEl = SafeDOM.query(this.container, '#main-menu-crystals-count');
    if (countEl) {
      countEl.textContent = crystals.toLocaleString();
    }
  }

  public updateAuthDisplay(user?: AuthUser): void {
    const activeUser = user || AuthManager.getInstance().getUser();
    const avatarEl = SafeDOM.query(this.container, '#main-menu-auth-avatar');
    const nameEl = SafeDOM.query(this.container, '#main-menu-auth-name');
    const badgeEl = SafeDOM.query(this.container, '#main-menu-auth-badge');

    if (avatarEl) {
      if (activeUser.avatarUrl) {
        avatarEl.innerHTML = `<img src="${activeUser.avatarUrl}" class="auth-pill-avatar-img" alt="avatar" />`;
      } else {
        avatarEl.textContent = activeUser.isGuest ? '👤' : (activeUser.authType === 'google' ? '🌐' : '📧');
      }
    }
    if (nameEl) {
      nameEl.textContent = activeUser.name;
    }
    if (badgeEl) {
      if (activeUser.isGuest) {
        badgeEl.textContent = 'ГОСТЬ';
        badgeEl.className = 'auth-pill-badge';
      } else if (activeUser.authType === 'google') {
        badgeEl.textContent = 'GOOGLE';
        badgeEl.className = 'auth-pill-badge auth-pill-badge--google';
      } else {
        badgeEl.textContent = 'АККАУНТ';
        badgeEl.className = 'auth-pill-badge auth-pill-badge--email';
      }
    }
  }

  protected onShow(): void {
    document.body.classList.add('is-main-menu');
    document.body.classList.remove('is-in-game');
    this.updateCrystalsDisplay();
    this.updateAuthDisplay();
  }

  protected onHide(): void {
    document.body.classList.remove('is-main-menu');
  }

  public destroy(): void {
    if (this.unsubscribeMeta) {
      this.unsubscribeMeta();
    }
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
  }
}
