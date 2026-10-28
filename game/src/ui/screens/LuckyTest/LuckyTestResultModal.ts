import { SoundManager } from '../../../core/SoundManager';

export interface LuckyTestResultStats {
  winnerName: string;
  isVictory: boolean;
  matchDurationSec: number;
  playerDamageDealt: number;
  opponentDamageDealt: number;
  playerRemainingHp: number;
  opponentRemainingHp: number;
  topWeaponName?: string;
  topWeaponDamage?: number;
}

export interface LuckyTestResultModalOptions {
  stats: LuckyTestResultStats;
  onRematch: () => void;
  onMainMenu: () => void;
}

export class LuckyTestResultModal {
  private element: HTMLElement | null = null;
  private options: LuckyTestResultModalOptions;

  constructor(options: LuckyTestResultModalOptions) {
    this.options = options;
  }

  public show(): void {
    this.hide();

    const overlay = document.createElement('div');
    overlay.className = 'lucky-modal-overlay';
    overlay.id = 'lucky-result-modal';

    const s = this.options.stats;
    const mins = Math.floor(s.matchDurationSec / 60);
    const secs = Math.floor(s.matchDurationSec % 60).toString().padStart(2, '0');
    const timeFormatted = `${mins}:${secs}`;

    const titleClass = s.isVictory ? 'victory' : 'defeat';
    const titleText = s.isVictory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ!';
    const bannerSubtitle = s.isVictory
      ? `Триумфатор Арены: ${s.winnerName}`
      : `Гладиатор повержен. Победитель: ${s.winnerName}`;

    overlay.innerHTML = `
      <div class="lucky-test-container lucky-result-container ${titleClass}">
        <div class="lucky-result-banner ${titleClass}">
          <div class="lucky-result-trophy">${s.isVictory ? '🏆' : '💀'}</div>
          <h1 class="lucky-result-title ${titleClass}">${titleText}</h1>
          <div class="lucky-result-subtitle">${bannerSubtitle}</div>
        </div>

        <div class="lucky-result-stats-card">
          <div class="lucky-stat-row">
            <span class="lucky-stat-label">⏱️ Время боя:</span>
            <span class="lucky-stat-value">${timeFormatted}</span>
          </div>
          <div class="lucky-stat-row">
            <span class="lucky-stat-label">⚔️ Урон игрока:</span>
            <span class="lucky-stat-value highlight">${Math.round(s.playerDamageDealt)}</span>
          </div>
          <div class="lucky-stat-row">
            <span class="lucky-stat-label">🛡️ Урон соперника:</span>
            <span class="lucky-stat-value">${Math.round(s.opponentDamageDealt)}</span>
          </div>
          <div class="lucky-stat-row">
            <span class="lucky-stat-label">❤️ Оставшееся HP победителя:</span>
            <span class="lucky-stat-value ${s.isVictory ? 'green' : 'red'}">
              ${Math.max(0, Math.round(s.isVictory ? s.playerRemainingHp : s.opponentRemainingHp))} HP
            </span>
          </div>
          ${
            s.topWeaponName
              ? `
          <div class="lucky-stat-row">
            <span class="lucky-stat-label">🔥 Лучшее оружие:</span>
            <span class="lucky-stat-value">${s.topWeaponName} (${Math.round(s.topWeaponDamage || 0)} ур.)</span>
          </div>
          `
              : ''
          }
        </div>

        <div class="lucky-result-actions">
          <button id="btn-lucky-rematch" class="lucky-btn-primary lucky-result-btn">
            🔄 РЕВАНШ (НОВЫЙ ДРАФТ)
          </button>
          <button id="btn-lucky-main-menu" class="lucky-btn-secondary lucky-result-btn">
            🏰 В ГЛАВНОЕ МЕНЮ
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.element = overlay;

    if (s.isVictory) {
      SoundManager.playVictory?.();
    } else {
      SoundManager.playGameOver?.();
    }

    overlay.querySelector('#btn-lucky-rematch')?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      this.hide();
      this.options.onRematch();
    });

    overlay.querySelector('#btn-lucky-main-menu')?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      this.hide();
      this.options.onMainMenu();
    });
  }

  public hide(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    const existing = document.getElementById('lucky-result-modal');
    if (existing) existing.remove();
  }
}
