import { SoundManager } from '../../../core/SoundManager';
import { LuckyTestBuildState } from '../../../mechanics/lucky-test/LuckyTestTypes';

export interface LuckyTestReadyModalOptions {
  playerBuild: LuckyTestBuildState;
  opponentBuild: LuckyTestBuildState;
  isVsBot: boolean;
  onFightStart: () => void;
}

export class LuckyTestReadyModal {
  private element: HTMLElement | null = null;
  private options: LuckyTestReadyModalOptions;
  private isPlayerReady: boolean = false;
  private isOpponentReady: boolean = false;
  private countdownTimer: any = null;

  constructor(options: LuckyTestReadyModalOptions) {
    this.options = options;
    this.isOpponentReady = options.isVsBot; // Bot is ready immediately
  }

  public show(): void {
    this.hide();

    const overlay = document.createElement('div');
    overlay.className = 'lucky-modal-overlay';
    overlay.id = 'lucky-ready-modal';

    const pBuild = this.options.playerBuild;
    const oppBuild = this.options.opponentBuild;

    overlay.innerHTML = `
      <div class="lucky-test-container lucky-ready-container">
        <div class="lucky-test-header">
          <h2 class="lucky-test-title">АРЕНА ГЛАДИАТОРОВ • ПОДТВЕРЖДЕНИЕ</h2>
          <div class="lucky-test-step-badge">ОЖИДАНИЕ ГОТОВНОСТИ БОЙЦОВ</div>
        </div>

        <div class="lucky-ready-combatants">
          <!-- Player 1 Card -->
          <div class="lucky-ready-card" id="ready-card-p1">
            <div class="lucky-ready-badge" id="badge-p1-status">ОЖИДАНИЕ...</div>
            <div class="lucky-ready-hero-name">${pBuild.heroName} (Вы)</div>
            <div class="lucky-ready-weapons-title">ОРУЖИЕ (${[pBuild.startingWeaponId, ...pBuild.draftedWeaponIds].length}):</div>
            <div class="lucky-ready-weapons-list">
              ${[pBuild.startingWeaponId, ...pBuild.draftedWeaponIds]
                .map(id => {
                  const upCount = pBuild.appliedUpgrades.filter(u => u.weaponId === id).length;
                  const lvl = Math.min(4, 1 + upCount);
                  return `<span class="lucky-ready-pill">${id} (ур. ${lvl})</span>`;
                })
                .join('')}
            </div>
            <div class="lucky-ready-passives-title">ПАССИВКИ (${pBuild.chosenPassives.length}):</div>
            <div class="lucky-ready-passives-list">
              ${pBuild.chosenPassives.map(p => `<span class="lucky-ready-pill quality-${p.quality}">${p.title}</span>`).join('')}
            </div>
          </div>

          <div class="lucky-ready-vs">VS</div>

          <!-- Opponent / Bot Card -->
          <div class="lucky-ready-card ready" id="ready-card-p2">
            <div class="lucky-ready-badge ready" id="badge-p2-status">
              ${this.isOpponentReady ? 'ГОТОВ! ✓' : 'ОЖИДАНИЕ...'}
            </div>
            <div class="lucky-ready-hero-name">
              ${this.options.isVsBot ? `Гладиатор AI (${oppBuild.heroName})` : oppBuild.heroName}
            </div>
            <div class="lucky-ready-weapons-title">ОРУЖИЕ (${[oppBuild.startingWeaponId, ...oppBuild.draftedWeaponIds].length}):</div>
            <div class="lucky-ready-weapons-list">
              ${[oppBuild.startingWeaponId, ...oppBuild.draftedWeaponIds]
                .map(id => {
                  const upCount = oppBuild.appliedUpgrades.filter(u => u.weaponId === id).length;
                  const lvl = Math.min(4, 1 + upCount);
                  return `<span class="lucky-ready-pill">${id} (ур. ${lvl})</span>`;
                })
                .join('')}
            </div>
            <div class="lucky-ready-passives-title">ПАССИВКИ (${oppBuild.chosenPassives.length}):</div>
            <div class="lucky-ready-passives-list">
              ${oppBuild.chosenPassives.map(p => `<span class="lucky-ready-pill quality-${p.quality}">${p.title}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="lucky-ready-action-row">
          <div id="lucky-ready-countdown" class="lucky-ready-countdown" style="display: none;">3</div>
          <button id="btn-lucky-confirm-ready" class="lucky-btn-primary lucky-ready-btn">
            ⚔️ ГОТОВ К БОЮ!
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.element = overlay;

    const btn = overlay.querySelector('#btn-lucky-confirm-ready') as HTMLButtonElement | null;
    btn?.addEventListener('click', () => {
      if (this.isPlayerReady) return;
      this.isPlayerReady = true;

      SoundManager.playButtonClick?.();
      btn.style.display = 'none';

      const p1Badge = overlay.querySelector('#badge-p1-status');
      if (p1Badge) {
        p1Badge.textContent = 'ГОТОВ! ✓';
        p1Badge.classList.add('ready');
      }
      overlay.querySelector('#ready-card-p1')?.classList.add('ready');

      this.checkStartCountdown();
    });
  }

  public setOpponentReady(isReady: boolean): void {
    this.isOpponentReady = isReady;
    if (!this.element) return;
    const p2Badge = this.element.querySelector('#badge-p2-status');
    if (p2Badge) {
      p2Badge.textContent = isReady ? 'ГОТОВ! ✓' : 'ОЖИДАНИЕ...';
      if (isReady) p2Badge.classList.add('ready');
      else p2Badge.classList.remove('ready');
    }
    const card = this.element.querySelector('#ready-card-p2');
    if (isReady) card?.classList.add('ready');
    else card?.classList.remove('ready');

    this.checkStartCountdown();
  }

  private checkStartCountdown(): void {
    if (!this.isPlayerReady || !this.isOpponentReady) return;
    if (this.countdownTimer) return;

    const countdownEl = this.element?.querySelector('#lucky-ready-countdown') as HTMLElement | null;
    if (countdownEl) countdownEl.style.display = 'block';

    let count = 3;
    if (countdownEl) countdownEl.textContent = count.toString();
    SoundManager.playLevelUp?.();

    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        if (countdownEl) countdownEl.textContent = count.toString();
        SoundManager.playHit?.();
      } else if (count === 0) {
        if (countdownEl) countdownEl.textContent = 'В БОЙ!';
        SoundManager.playLevelUp?.();
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.hide();
        this.options.onFightStart();
      }
    }, 900);
  }

  public hide(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    const existing = document.getElementById('lucky-ready-modal');
    if (existing) existing.remove();
  }
}
