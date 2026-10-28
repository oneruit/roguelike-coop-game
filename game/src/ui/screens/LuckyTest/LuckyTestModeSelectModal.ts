import { SoundManager } from '../../../core/SoundManager';

export interface LuckyTestModeSelectOptions {
  onSoloVsBot: () => void;
  onPvPNetwork: () => void;
  onCancel: () => void;
}

/**
 * Entry selection modal for Lucky Test: Choose between Solo vs AI Bot or Network PvP Duel.
 */
export class LuckyTestModeSelectModal {
  private element: HTMLElement | null = null;
  private options: LuckyTestModeSelectOptions;

  constructor(options: LuckyTestModeSelectOptions) {
    this.options = options;
  }

  public show(): void {
    this.hide();

    const overlay = document.createElement('div');
    overlay.className = 'lucky-modal-overlay';
    overlay.id = 'lucky-mode-select-modal';
    overlay.innerHTML = `
      <div class="lucky-test-container lucky-mode-container">
        <div class="lucky-test-header">
          <h2 class="lucky-test-title">LUCKY TEST • АРЕНА ГЛАДИАТОРОВ</h2>
          <div class="lucky-test-step-badge">ВЫБОР РЕЖИМА БОЯ</div>
        </div>
        <div class="lucky-mode-options">
          <div class="lucky-mode-card" id="lucky-mode-bot">
            <div class="lucky-mode-icon">🤖</div>
            <div class="lucky-mode-card-title">ДУЭЛЬ С AI-БОТОМ</div>
            <div class="lucky-mode-card-desc">
              Одиночное испытание против гладиатора под управлением AI со случайным сбалансированным драфтом, 4 видами оружия и пассивками.
            </div>
            <button class="lucky-btn-primary lucky-mode-btn">ИГРАТЬ С БОТОМ</button>
          </div>

          <div class="lucky-mode-card" id="lucky-mode-pvp">
            <div class="lucky-mode-icon">⚔️</div>
            <div class="lucky-mode-card-title">СЕТЕВАЯ ДУЭЛЬ (PvP)</div>
            <div class="lucky-mode-card-desc">
              Сразитесь 1 на 1 по сети с другим игроком через PeerJS комнату. Оба проходят драфт и выходят на Арену.
            </div>
            <button class="lucky-btn-primary lucky-mode-btn">СОЗДАТЬ / ВОЙТИ В КОМНАТУ</button>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <button id="lucky-mode-cancel" class="lucky-btn-secondary">
            ✕ В ГЛАВНОЕ МЕНЮ
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.element = overlay;

    overlay.querySelector('#lucky-mode-bot')?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      this.hide();
      this.options.onSoloVsBot();
    });

    overlay.querySelector('#lucky-mode-pvp')?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      this.hide();
      this.options.onPvPNetwork();
    });

    overlay.querySelector('#lucky-mode-cancel')?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      this.hide();
      this.options.onCancel();
    });
  }

  public hide(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    const existing = document.getElementById('lucky-mode-select-modal');
    if (existing) existing.remove();
  }
}
