import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { SoundManager } from '../../../core/SoundManager';
import { AuthManager, AuthUser } from '../../../auth/AuthManager';
import { CloudSyncManager } from '../../../meta/CloudSyncManager';

export interface AuthModalScreenOptions {
  container?: HTMLElement | null;
  onClose?: () => void;
}

/**
 * Modular Auth Modal Screen.
 * Provides local Guest authorization and Google OAuth login via Supabase.
 */
export class AuthModalScreen extends Screen {
  private options: AuthModalScreenOptions;
  private unsubscribeAuth?: () => void;

  constructor(options: AuthModalScreenOptions = {}) {
    const existingModal = options.container || SafeDOM.getElementById('auth-modal');
    super('auth', existingModal);
    this.options = options;

    this.bindElements();
    this.bindEvents();

    this.unsubscribeAuth = AuthManager.getInstance().onAuthStateChanged((user) => {
      this.updateView(user);
    });
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {}

  protected bindEvents(): void {
    // Close button & backdrop
    SafeDOM.query(this.container, '#auth-btn-close')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.closeModal();
    });

    SafeDOM.query(this.container, '#auth-backdrop')?.addEventListener('click', () => {
      this.closeModal();
    });

    // Sign out button
    SafeDOM.query(this.container, '#auth-btn-signout')?.addEventListener('click', async () => {
      SoundManager.playButtonClick();
      this.setStatus('Выход из учетной записи...', 'info');
      await AuthManager.getInstance().signOut();
      this.setStatus('Вы вошли как гость. Данные сохраняются локально.', 'success');
    });

    // Reset cloud progress button
    SafeDOM.query(this.container, '#auth-btn-reset-cloud')?.addEventListener('click', async () => {
      SoundManager.playButtonClick();
      const confirmed = window.confirm(
        'ВНИМАНИЕ: Вы действительно хотите сбросить весь прогресс (кристаллы, таланты и квесты)? Все сохранения будут очищены как на устройстве, так и в облаке.'
      );
      if (!confirmed) return;

      this.setStatus('Сброс игрового прогресса в облаке...', 'info');
      await CloudSyncManager.getInstance().resetCloudProgress();
      this.setStatus('Игровой прогресс успешно сброшен.', 'success');
    });

    // Delete account button
    SafeDOM.query(this.container, '#auth-btn-delete-account')?.addEventListener('click', async () => {
      SoundManager.playButtonClick();
      const confirmed = window.confirm(
        'ВНИМАНИЕ: Вы действительно хотите удалить аккаунт и отвязать профиль? Все сохраненные данные в облаке будут удалены.'
      );
      if (!confirmed) return;

      this.setStatus('Удаление аккаунта и профиля...', 'info');
      await CloudSyncManager.getInstance().deleteAccount();
      this.setStatus('Аккаунт удален. Вы переведены в гостевой режим.', 'success');
    });

    // Guest name edit save
    SafeDOM.query(this.container, '#auth-guest-name-save-btn')?.addEventListener('click', () => {
      const input = SafeDOM.query<HTMLInputElement>(this.container, '#auth-guest-name-input');
      if (input && input.value.trim()) {
        SoundManager.playButtonClick();
        AuthManager.getInstance().setGuestName(input.value.trim());
        this.setStatus('Имя гостя сохранено!', 'success');
      }
    });

    // Enter key in guest name input
    SafeDOM.query<HTMLInputElement>(this.container, '#auth-guest-name-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const input = e.currentTarget as HTMLInputElement;
        if (input.value.trim()) {
          SoundManager.playButtonClick();
          AuthManager.getInstance().setGuestName(input.value.trim());
          this.setStatus('Имя гостя сохранено!', 'success');
        }
      }
    });

    // Google OAuth login
    SafeDOM.query(this.container, '#auth-btn-google-login')?.addEventListener('click', async () => {
      SoundManager.playButtonClick();
      this.setStatus('Перенаправление на страницу входа Google...', 'info');
      const googleBtn = SafeDOM.query<HTMLButtonElement>(this.container, '#auth-btn-google-login');
      if (googleBtn) googleBtn.disabled = true;

      const res = await AuthManager.getInstance().signInWithGoogle();
      if (!res.success) {
        if (googleBtn) googleBtn.disabled = false;
        this.setStatus(res.error || 'Ошибка при входе через Google.', 'error');
      }
    });

    // Fast switch / stay in Guest mode
    SafeDOM.query(this.container, '#auth-btn-play-as-guest')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      AuthManager.getInstance().loginAsGuest();
      this.setStatus('Активирован гостевой режим. Данные сохраняются на этом устройстве.', 'success');
      setTimeout(() => {
        this.closeModal();
      }, 500);
    });
  }

  private setStatus(message: string, type: 'info' | 'success' | 'error'): void {
    const el = SafeDOM.query(this.container, '#auth-status-message');
    if (!el) return;

    if (!message) {
      el.className = 'auth-status-message hidden';
      el.textContent = '';
      return;
    }

    el.className = `auth-status-message ${type}`;
    el.textContent = message;
  }

  public updateView(user: AuthUser): void {
    const avatarEl = SafeDOM.query(this.container, '#auth-profile-avatar');
    const nameEl = SafeDOM.query(this.container, '#auth-profile-name');
    const badgeEl = SafeDOM.query(this.container, '#auth-profile-badge');
    const descEl = SafeDOM.query(this.container, '#auth-profile-desc');
    const sessionEl = SafeDOM.query(this.container, '#auth-profile-session');
    const expiryEl = SafeDOM.query(this.container, '#auth-session-expiry-date');
    const btnSignOut = SafeDOM.query(this.container, '#auth-btn-signout');
    const guestEditRow = SafeDOM.query(this.container, '#auth-guest-edit-row');
    const guestInput = SafeDOM.query<HTMLInputElement>(this.container, '#auth-guest-name-input');
    const googleDivider = SafeDOM.query(this.container, '#auth-divider-google');
    const googleSection = SafeDOM.query(this.container, '#auth-section-google');
    const guestFooter = SafeDOM.query(this.container, '#auth-guest-footer');
    const dangerZone = SafeDOM.query(this.container, '#auth-danger-zone');

    if (user.isGuest) {
      if (avatarEl) avatarEl.textContent = '👤';
      if (nameEl) nameEl.textContent = user.name;
      if (badgeEl) {
        badgeEl.textContent = 'ГОСТЬ (ЛОКАЛЬНО)';
        badgeEl.className = 'auth-badge';
      }
      if (descEl) {
        descEl.textContent = 'Все игровые данные и сохранения хранятся в браузере на этом устройстве.';
      }
      if (sessionEl) sessionEl.classList.add('hidden');
      if (btnSignOut) btnSignOut.classList.add('hidden');
      if (guestEditRow) guestEditRow.classList.remove('hidden');
      if (guestInput) guestInput.value = user.name;
      if (googleDivider) googleDivider.classList.remove('hidden');
      if (googleSection) googleSection.classList.remove('hidden');
      if (guestFooter) guestFooter.classList.add('hidden');
      if (dangerZone) dangerZone.classList.add('hidden');
    } else {
      if (avatarEl) {
        if (user.avatarUrl) {
          avatarEl.innerHTML = `<img src="${user.avatarUrl}" class="auth-profile-avatar-img" alt="avatar" />`;
        } else {
          avatarEl.textContent = user.authType === 'google' ? '🌐' : '👤';
        }
      }
      if (nameEl) nameEl.textContent = user.name || user.email || 'Игрок';
      if (badgeEl) {
        badgeEl.textContent = user.authType === 'google' ? 'GOOGLE АККАУНТ' : 'АККАУНТ (1 МЕСЯЦ)';
        badgeEl.className = `auth-badge ${user.authType === 'google' ? 'auth-badge--google' : 'auth-badge--email'}`;
      }
      if (descEl) {
        descEl.textContent = `Авторизован через ${user.authType === 'google' ? 'Google' : 'аккаунт'} (${user.email || user.name}). Прогресс сохраняется в облаке.`;
      }
      if (sessionEl) {
        sessionEl.classList.remove('hidden');
        if (expiryEl && user.sessionExpiresAt) {
          const expDate = new Date(user.sessionExpiresAt);
          expiryEl.textContent = expDate.toLocaleDateString();
        }
      }
      if (btnSignOut) btnSignOut.classList.remove('hidden');
      if (guestEditRow) guestEditRow.classList.add('hidden');
      if (googleDivider) googleDivider.classList.add('hidden');
      if (googleSection) googleSection.classList.add('hidden');
      if (guestFooter) guestFooter.classList.remove('hidden');
      if (dangerZone) dangerZone.classList.remove('hidden');
    }
  }

  public closeModal(): void {
    this.hide();
    this.options.onClose?.();
  }

  protected onShow(): void {
    const user = AuthManager.getInstance().getUser();
    this.updateView(user);
    this.setStatus('', 'info');
    const googleBtn = SafeDOM.query<HTMLButtonElement>(this.container, '#auth-btn-google-login');
    if (googleBtn) googleBtn.disabled = false;
  }

  protected onHide(): void {}

  public destroy(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
    super.destroy();
  }
}
