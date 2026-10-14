import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { SoundManager } from '../../../core/SoundManager';
import { AuthManager, AuthUser } from '../../../auth/AuthManager';

export interface AuthModalScreenOptions {
  container?: HTMLElement | null;
  onClose?: () => void;
}

/**
 * Modular Auth Modal Screen.
 * Provides Guest authorization and Supabase Email OTP login with 1-month session.
 */
export class AuthModalScreen extends Screen {
  private options: AuthModalScreenOptions;
  private unsubscribeAuth?: () => void;
  private resendIntervalId: number | null = null;
  private resendSecondsLeft = 0;
  private pendingEmail: string = '';

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
      this.resetOtpForm();
    });

    // Guest name edit
    SafeDOM.query(this.container, '#auth-guest-name-save-btn')?.addEventListener('click', () => {
      const input = SafeDOM.query<HTMLInputElement>(this.container, '#auth-guest-name-input');
      if (input && input.value.trim()) {
        SoundManager.playButtonClick();
        AuthManager.getInstance().setGuestName(input.value.trim());
        this.setStatus('Имя гостя обновлено!', 'success');
      }
    });

    // Step 1: Send OTP
    SafeDOM.query(this.container, '#auth-btn-send-otp')?.addEventListener('click', () => {
      this.handleSendOtp();
    });

    // Enter key in email input
    SafeDOM.query<HTMLInputElement>(this.container, '#auth-email-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSendOtp();
      }
    });

    // Step 2: Verify OTP
    SafeDOM.query(this.container, '#auth-btn-verify-otp')?.addEventListener('click', () => {
      this.handleVerifyOtp();
    });

    // Enter key in OTP input
    SafeDOM.query<HTMLInputElement>(this.container, '#auth-otp-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleVerifyOtp();
      }
    });

    // Resend OTP
    SafeDOM.query(this.container, '#auth-btn-resend-otp')?.addEventListener('click', () => {
      if (this.resendSecondsLeft <= 0 && this.pendingEmail) {
        this.handleSendOtp(this.pendingEmail);
      }
    });

    // Change email (back to step 1)
    SafeDOM.query(this.container, '#auth-btn-change-email')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.resetOtpForm();
    });

    // Fast switch to Guest
    SafeDOM.query(this.container, '#auth-btn-play-as-guest')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      AuthManager.getInstance().loginAsGuest();
      this.setStatus('Активирован гостевой режим. Данные сохраняются на этом устройстве.', 'success');
      setTimeout(() => {
        this.closeModal();
      }, 600);
    });
  }

  private async handleSendOtp(targetEmail?: string): Promise<void> {
    const emailInput = SafeDOM.query<HTMLInputElement>(this.container, '#auth-email-input');
    const email = targetEmail || emailInput?.value || '';

    if (!email.trim()) {
      this.setStatus('Пожалуйста, введите ваш email.', 'error');
      return;
    }

    const sendBtn = SafeDOM.query<HTMLButtonElement>(this.container, '#auth-btn-send-otp');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'ОТПРАВКА КОДА...';
    }

    this.setStatus('Отправка одноразового кода на почту...', 'info');

    const result = await AuthManager.getInstance().sendOtp(email);

    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'ПОЛУЧИТЬ ОДНОРАЗОВЫЙ КОД';
    }

    if (!result.success) {
      this.setStatus(result.error || 'Не удалось отправить код подтверждения.', 'error');
      return;
    }

    this.pendingEmail = email.trim();
    this.setStatus('Одноразовый код успешно отправлен на вашу почту!', 'success');

    // Switch to Step 2: OTP
    const secEmail = SafeDOM.query(this.container, '#auth-section-email');
    const secOtp = SafeDOM.query(this.container, '#auth-section-otp');
    const targetEmailLabel = SafeDOM.query(this.container, '#auth-sent-target-email');

    if (secEmail) secEmail.classList.add('hidden');
    if (secOtp) secOtp.classList.remove('hidden');
    if (targetEmailLabel) targetEmailLabel.textContent = this.pendingEmail;

    const otpInput = SafeDOM.query<HTMLInputElement>(this.container, '#auth-otp-input');
    if (otpInput) {
      otpInput.value = '';
      otpInput.focus();
    }

    this.startResendTimer(60);
  }

  private async handleVerifyOtp(): Promise<void> {
    const otpInput = SafeDOM.query<HTMLInputElement>(this.container, '#auth-otp-input');
    const token = otpInput?.value || '';

    if (!token.trim() || token.trim().length < 6) {
      this.setStatus('Введите полный 6-значный код подтверждения.', 'error');
      return;
    }

    const verifyBtn = SafeDOM.query<HTMLButtonElement>(this.container, '#auth-btn-verify-otp');
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'ПРОВЕРКА КОДА...';
    }

    this.setStatus('Проверка кода и активация сессии...', 'info');

    const result = await AuthManager.getInstance().verifyOtp(this.pendingEmail, token);

    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'ПОДТВЕРДИТЬ И ВОЙТИ';
    }

    if (!result.success) {
      this.setStatus(result.error || 'Неверный или просроченный код.', 'error');
      return;
    }

    SoundManager.playButtonClick();
    this.setStatus('✅ Вход выполнен успешно! Сессия сохранена на 1 месяц.', 'success');
    this.stopResendTimer();

    setTimeout(() => {
      this.closeModal();
    }, 1200);
  }

  private startResendTimer(seconds: number): void {
    this.stopResendTimer();
    this.resendSecondsLeft = seconds;
    const resendBtn = SafeDOM.query<HTMLButtonElement>(this.container, '#auth-btn-resend-otp');
    const timerSpan = SafeDOM.query(this.container, '#auth-resend-timer');

    if (resendBtn) resendBtn.disabled = true;
    if (timerSpan) timerSpan.textContent = `${this.resendSecondsLeft}`;

    this.resendIntervalId = window.setInterval(() => {
      this.resendSecondsLeft--;
      if (timerSpan) timerSpan.textContent = `${this.resendSecondsLeft}`;

      if (this.resendSecondsLeft <= 0) {
        this.stopResendTimer();
        if (resendBtn) {
          resendBtn.disabled = false;
          resendBtn.textContent = 'Отправить код повторно';
        }
      }
    }, 1000);
  }

  private stopResendTimer(): void {
    if (this.resendIntervalId !== null) {
      clearInterval(this.resendIntervalId);
      this.resendIntervalId = null;
    }
  }

  private resetOtpForm(): void {
    this.stopResendTimer();
    const secEmail = SafeDOM.query(this.container, '#auth-section-email');
    const secOtp = SafeDOM.query(this.container, '#auth-section-otp');
    if (secEmail) secEmail.classList.remove('hidden');
    if (secOtp) secOtp.classList.add('hidden');

    const otpInput = SafeDOM.query<HTMLInputElement>(this.container, '#auth-otp-input');
    if (otpInput) otpInput.value = '';

    const emailInput = SafeDOM.query<HTMLInputElement>(this.container, '#auth-email-input');
    if (emailInput && !this.pendingEmail) {
      emailInput.value = '';
    }
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
    const guestFooter = SafeDOM.query(this.container, '#auth-guest-footer');

    if (user.isGuest) {
      if (avatarEl) avatarEl.textContent = '👤';
      if (nameEl) nameEl.textContent = user.name;
      if (badgeEl) {
        badgeEl.textContent = 'ГОСТЬ (ЛОКАЛЬНО)';
        badgeEl.className = 'auth-badge';
      }
      if (descEl) {
        descEl.textContent = 'Все игровые данные и прогресс хранятся локально на этом устройстве.';
      }
      if (sessionEl) sessionEl.classList.add('hidden');
      if (btnSignOut) btnSignOut.classList.add('hidden');
      if (guestEditRow) guestEditRow.classList.remove('hidden');
      if (guestInput) guestInput.value = user.name;
      if (guestFooter) guestFooter.classList.add('hidden');
    } else {
      if (avatarEl) avatarEl.textContent = '📧';
      if (nameEl) nameEl.textContent = user.email || user.name;
      if (badgeEl) {
        badgeEl.textContent = 'АККАУНТ (1 МЕСЯЦ)';
        badgeEl.className = 'auth-badge auth-badge--email';
      }
      if (descEl) {
        descEl.textContent = `Авторизован через электронную почту (${user.email}).`;
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
      if (guestFooter) guestFooter.classList.remove('hidden');
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
    this.resetOtpForm();
  }

  protected onHide(): void {
    this.stopResendTimer();
  }

  public destroy(): void {
    this.stopResendTimer();
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
    super.destroy();
  }
}
