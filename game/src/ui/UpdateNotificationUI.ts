import { UpdateNotifier, VersionInfo } from '../core/UpdateNotifier';

/**
 * Handles the visual presentation of the game update notification.
 * Designed to be non-intrusive (never pauses the game, doesn't capture gameplay keystrokes,
 * auto-collapses during combat, and re-expands when the run finishes).
 */
export class UpdateNotificationUI {
  private container: HTMLElement;
  private banner: HTMLElement;
  private pill: HTMLElement;
  private newVersionText: HTMLElement;
  private bannerMessage: HTMLElement;
  private pillText: HTMLElement;
  private btnReload: HTMLElement;
  private btnDismiss: HTMLElement;

  private mainMenuVersionTag: HTMLElement | null = null;
  private mainMenuVersionText: HTMLElement | null = null;

  private autoMinimizeTimeout: number | null = null;
  private hasUpdate: boolean = false;
  private latestVersion: VersionInfo | null = null;
  private isCombatActive: boolean = false;

  constructor() {
    this.container = document.getElementById('game-update-container')!;
    this.banner = document.getElementById('game-update-banner')!;
    this.pill = document.getElementById('game-update-pill')!;
    this.newVersionText = document.getElementById('update-new-version-text')!;
    this.bannerMessage = document.getElementById('update-banner-message')!;
    this.pillText = document.getElementById('update-pill-text')!;
    this.btnReload = document.getElementById('btn-update-reload')!;
    this.btnDismiss = document.getElementById('btn-update-dismiss')!;

    this.mainMenuVersionTag = document.getElementById('main-menu-version-tag');
    this.mainMenuVersionText = document.getElementById('main-menu-version-text');

    this.initMainMenuVersion();
    this.bindEvents();

    const notifier = UpdateNotifier.getInstance();
    notifier.addListener((newVer, currentVer) => {
      this.handleUpdateAvailable(newVer, currentVer);
    });
  }

  private initMainMenuVersion(): void {
    const notifier = UpdateNotifier.getInstance();
    if (this.mainMenuVersionText) {
      this.mainMenuVersionText.textContent = `v${notifier.currentVersion.version}`;
    }
    if (this.mainMenuVersionTag) {
      this.mainMenuVersionTag.title = `Версия клиента: v${notifier.currentVersion.version}`;
    }
  }

  private bindEvents(): void {
    // Reload button
    this.btnReload.addEventListener('click', (e) => {
      e.stopPropagation();
      this.preventFocusLoss(this.btnReload);
      this.triggerUpdate();
    });

    // Dismiss / minimize button
    this.btnDismiss.addEventListener('click', (e) => {
      e.stopPropagation();
      this.preventFocusLoss(this.btnDismiss);
      this.minimize();
    });

    // Minimized pill click expands back to full banner or quick update
    this.pill.addEventListener('click', (e) => {
      e.stopPropagation();
      this.preventFocusLoss(this.pill);
      this.expand();
    });

    // Cancel auto-minimize if mouse hovers over the banner
    this.banner.addEventListener('mouseenter', () => {
      this.clearAutoMinimizeTimer();
    });

    // Resume auto-minimize when mouse leaves banner during combat
    this.banner.addEventListener('mouseleave', () => {
      if (this.isCombatActive && this.hasUpdate) {
        this.scheduleAutoMinimize(6000);
      }
    });

    // Main menu version tag click triggers update if available
    this.mainMenuVersionTag?.addEventListener('click', () => {
      if (this.hasUpdate) {
        this.triggerUpdate();
      }
    });
  }

  /**
   * Prevents UI buttons from capturing keyboard focus (e.g. Space to dash, WASD to move).
   */
  private preventFocusLoss(element: HTMLElement): void {
    window.setTimeout(() => {
      element.blur();
    }, 0);
  }

  private handleUpdateAvailable(newVer: VersionInfo, _currentVer: VersionInfo): void {
    this.hasUpdate = true;
    this.latestVersion = newVer;

    const verLabel = newVer.version ? `v${newVer.version}` : 'Новый патч';
    this.newVersionText.textContent = verLabel;
    this.pillText.textContent = `Патч ${verLabel}`;

    // Update main menu badge
    if (this.mainMenuVersionTag) {
      this.mainMenuVersionTag.classList.add('update-available');
      this.mainMenuVersionTag.title = `Вышло обновление ${verLabel}! Нажмите, чтобы перезагрузить игру.`;
      this.mainMenuVersionTag.innerHTML = `
        <span class="pill-pulse-dot"></span>
        <span>Доступен патч <strong>${verLabel}</strong></span>
        <span class="update-badge-pill">Обновить ↻</span>
      `;
    }

    // Show banner container
    this.container.classList.remove('hidden');
    this.expand();

    // If currently in combat, schedule auto-minimize so vision and combat flow are not hindered
    if (this.isCombatActive) {
      this.scheduleAutoMinimize(12000);
    }
  }

  /**
   * Called by Game / HUD when entering gameplay.
   */
  public setCombatActive(active: boolean): void {
    this.isCombatActive = active;
    if (active && this.hasUpdate) {
      // Auto minimize after 10s if shown during active battle
      this.scheduleAutoMinimize(10000);
    }
  }

  /**
   * Called when player dies, wins, or returns to main menu (peaceful phase).
   * Re-expands the banner with a run-completion reminder.
   */
  public onRunEnded(): void {
    this.isCombatActive = false;
    this.clearAutoMinimizeTimer();

    if (this.hasUpdate) {
      this.bannerMessage.textContent = 'Забег завершен! Рекомендуем обновить страницу для применения нового патча.';
      this.expand();
    }
  }

  public expand(): void {
    this.clearAutoMinimizeTimer();
    this.pill.classList.add('hidden');
    this.banner.classList.remove('hidden');
  }

  public minimize(): void {
    this.clearAutoMinimizeTimer();
    this.banner.classList.add('hidden');
    this.pill.classList.remove('hidden');
  }

  private scheduleAutoMinimize(delayMs: number): void {
    this.clearAutoMinimizeTimer();
    this.autoMinimizeTimeout = window.setTimeout(() => {
      this.minimize();
    }, delayMs);
  }

  private clearAutoMinimizeTimer(): void {
    if (this.autoMinimizeTimeout !== null) {
      window.clearTimeout(this.autoMinimizeTimeout);
      this.autoMinimizeTimeout = null;
    }
  }

  private triggerUpdate(): void {
    this.btnReload.innerHTML = '<span class="update-btn-icon">⏳</span><span>Обновление...</span>';
    (this.btnReload as HTMLButtonElement).disabled = true;
    UpdateNotifier.getInstance().applyUpdate();
  }

  public getHasUpdate(): boolean {
    return this.hasUpdate;
  }

  public getLatestVersion(): VersionInfo | null {
    return this.latestVersion;
  }
}
