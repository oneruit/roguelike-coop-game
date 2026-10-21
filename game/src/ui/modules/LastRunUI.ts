import { Screen } from '../core/Screen';
import { SafeDOM } from '../core/SafeDOM';
import { LastRunManager } from '../../core/LastRunManager';
import { SoundManager } from '../../core/SoundManager';
import { getHeroAvatar, getHeroName, getWeaponIconUrl } from './HeroUIHelpers';

export interface LastRunUIOptions {
  container?: HTMLElement | null;
  onClose?: () => void;
}

export class LastRunUI extends Screen {
  private modal: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private btnClose: HTMLElement | null = null;
  private btnBack: HTMLElement | null = null;
  private btnCopySeed: HTMLElement | null = null;

  private emptyContainer: HTMLElement | null = null;
  private contentContainer: HTMLElement | null = null;

  // Outcome & Killer
  private statusBanner: HTMLElement | null = null;
  private statusBadge: HTMLElement | null = null;
  private dateText: HTMLElement | null = null;
  private killerBox: HTMLElement | null = null;
  private killerNameText: HTMLElement | null = null;
  private killerDamageText: HTMLElement | null = null;

  // Hero identity
  private heroAvatar: HTMLImageElement | null = null;
  private heroNameText: HTMLElement | null = null;
  private heroLevelText: HTMLElement | null = null;
  private stageBiomeText: HTMLElement | null = null;
  private seedText: HTMLElement | null = null;

  // Stats Grid
  private timeText: HTMLElement | null = null;
  private killsText: HTMLElement | null = null;
  private damageText: HTMLElement | null = null;
  private chestsText: HTMLElement | null = null;
  private creditsText: HTMLElement | null = null;
  private stageNumText: HTMLElement | null = null;

  // Weapons & Coop
  private weaponsList: HTMLElement | null = null;
  private coopSection: HTMLElement | null = null;
  private coopList: HTMLElement | null = null;

  private currentLoadedSeed: number = 1337;
  private onCloseCallback?: () => void;

  constructor(options?: LastRunUIOptions) {
    const el = options?.container || SafeDOM.getElementById('last-run-modal');
    super('last-run', el);
    this.modal = el;
    this.onCloseCallback = options?.onClose;

    this.bindElements();
    this.bindEvents();
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {
    if (!this.modal) {
      this.modal = SafeDOM.getElementById('last-run-modal');
    }
    this.backdrop = SafeDOM.query(this.modal, '#last-run-backdrop');
    this.btnClose = SafeDOM.query(this.modal, '#last-run-btn-close');
    this.btnBack = SafeDOM.query(this.modal, '#last-run-btn-back');
    this.btnCopySeed = SafeDOM.query(this.modal, '#last-run-btn-copy-seed');

    this.emptyContainer = SafeDOM.query(this.modal, '#last-run-empty');
    this.contentContainer = SafeDOM.query(this.modal, '#last-run-content');

    this.statusBanner = SafeDOM.query(this.modal, '#last-run-status-banner');
    this.statusBadge = SafeDOM.query(this.modal, '#last-run-status-badge');
    this.dateText = SafeDOM.query(this.modal, '#last-run-date-text');
    this.killerBox = SafeDOM.query(this.modal, '#last-run-killer-box');
    this.killerNameText = SafeDOM.query(this.modal, '#last-run-killer-name');
    this.killerDamageText = SafeDOM.query(this.modal, '#last-run-killer-damage');

    this.heroAvatar = SafeDOM.query(this.modal, '#last-run-hero-avatar') as HTMLImageElement;
    this.heroNameText = SafeDOM.query(this.modal, '#last-run-hero-name');
    this.heroLevelText = SafeDOM.query(this.modal, '#last-run-hero-level');
    this.stageBiomeText = SafeDOM.query(this.modal, '#last-run-stage-biome');
    this.seedText = SafeDOM.query(this.modal, '#last-run-seed');

    this.timeText = SafeDOM.query(this.modal, '#last-run-time');
    this.killsText = SafeDOM.query(this.modal, '#last-run-kills');
    this.damageText = SafeDOM.query(this.modal, '#last-run-damage');
    this.chestsText = SafeDOM.query(this.modal, '#last-run-chests');
    this.creditsText = SafeDOM.query(this.modal, '#last-run-credits');
    this.stageNumText = SafeDOM.query(this.modal, '#last-run-stage-num');

    this.weaponsList = SafeDOM.query(this.modal, '#last-run-weapons-list');
    this.coopSection = SafeDOM.query(this.modal, '#last-run-coop-section');
    this.coopList = SafeDOM.query(this.modal, '#last-run-coop-list');
  }

  protected bindEvents(): void {
    const handleClose = () => {
      SoundManager.playButtonClick?.();
      this.hide();
      this.onCloseCallback?.();
    };

    this.btnClose?.addEventListener('click', handleClose);
    this.btnBack?.addEventListener('click', handleClose);
    this.backdrop?.addEventListener('click', handleClose);

    this.btnCopySeed?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.currentLoadedSeed.toString());
      }
      if (this.btnCopySeed) {
        const originalText = this.btnCopySeed.innerHTML;
        this.btnCopySeed.innerHTML = `✓ Скопировано!`;
        this.btnCopySeed.style.borderColor = '#10b981';
        this.btnCopySeed.style.color = '#a7f3d0';
        setTimeout(() => {
          if (this.btnCopySeed) {
            this.btnCopySeed.innerHTML = originalText;
            this.btnCopySeed.style.borderColor = '#f59e0b';
            this.btnCopySeed.style.color = '#fde68a';
          }
        }, 1500);
      }
    });
  }

  public showLastRun(): void {
    this.render();
    this.show();
  }

  public render(): void {
    const run = LastRunManager.getLastRun();
    if (!run) {
      this.emptyContainer?.classList.remove('hidden');
      this.contentContainer?.classList.add('hidden');
      if (this.btnCopySeed) this.btnCopySeed.style.display = 'none';
      return;
    }

    if (this.btnCopySeed) this.btnCopySeed.style.display = 'inline-block';
    this.emptyContainer?.classList.add('hidden');
    this.contentContainer?.classList.remove('hidden');

    this.currentLoadedSeed = run.seed;

    // 1. Outcome Banner & Killer
    if (this.dateText) {
      this.dateText.innerText = run.dateFormatted || LastRunManager.formatDate(run.timestamp);
    }

    if (run.isVictory) {
      this.statusBanner?.classList.add('victory-banner');
      this.statusBanner?.classList.remove('defeat-banner');
      if (this.statusBadge) {
        this.statusBadge.innerText = 'ПОБЕДА';
        this.statusBadge.className = 'last-run-badge badge-victory';
      }
      this.killerBox?.classList.add('hidden');
    } else {
      this.statusBanner?.classList.add('defeat-banner');
      this.statusBanner?.classList.remove('victory-banner');
      if (this.statusBadge) {
        this.statusBadge.innerText = 'ПОРАЖЕНИЕ';
        this.statusBadge.className = 'last-run-badge badge-defeat';
      }
      this.killerBox?.classList.remove('hidden');
      if (this.killerNameText) {
        this.killerNameText.innerText = run.killer?.name || 'Монстры Разлома';
      }
      if (this.killerDamageText) {
        const dmg = run.killer?.damage ?? 0;
        this.killerDamageText.innerText = dmg > 0 ? `${dmg.toLocaleString('ru-RU')} ед.` : 'Смертельный удар';
      }
    }

    // 2. Hero Card
    if (this.heroAvatar) {
      this.heroAvatar.src = getHeroAvatar(run.heroId);
      this.heroAvatar.alt = getHeroName(run.heroId);
    }
    if (this.heroNameText) {
      this.heroNameText.innerText = getHeroName(run.heroId);
    }
    if (this.heroLevelText) {
      this.heroLevelText.innerText = `Ур. ${run.heroLevel}`;
    }
    if (this.stageBiomeText) {
      this.stageBiomeText.innerText = `Этап ${run.stageNumber}: ${run.biomeName}`;
    }
    if (this.seedText) {
      this.seedText.innerText = `#${run.seed}`;
    }

    // 3. Stats Grid
    if (this.timeText) this.timeText.innerText = run.timeFormatted;
    if (this.killsText) this.killsText.innerText = run.kills.toLocaleString('ru-RU');
    if (this.damageText) this.damageText.innerText = run.damageDealt.toLocaleString('ru-RU');
    if (this.chestsText) this.chestsText.innerText = run.chestsOpened.toLocaleString('ru-RU');
    if (this.creditsText) this.creditsText.innerText = run.creditsEarned.toLocaleString('ru-RU');
    if (this.stageNumText) this.stageNumText.innerText = `${run.stageNumber}`;

    // 4. Weapons Breakdown
    if (this.weaponsList) {
      if (run.weapons && run.weapons.length > 0) {
        const sorted = [...run.weapons].sort((a, b) => (b.damageDealt || 0) - (a.damageDealt || 0));
        const totalWeaponDmg = sorted.reduce((sum, w) => sum + (w.damageDealt || 0), 0);

        this.weaponsList.innerHTML = sorted.map((w, idx) => {
          const iconUrl = getWeaponIconUrl(w.id);
          const dmg = Math.round(w.damageDealt || 0);
          const pct = totalWeaponDmg > 0 ? ((dmg / totalWeaponDmg) * 100).toFixed(1) : '0';
          const isTop = idx === 0 && dmg > 0;

          return `<div class="last-run-weapon-item ${isTop ? 'top-damage' : ''}">
            <div class="last-run-weapon-header">
              <div class="last-run-weapon-identity">
                <img src="${iconUrl}" class="last-run-weapon-icon" alt="${w.name}" onerror="this.style.display='none'" />
                <span class="last-run-weapon-name">${w.name}</span>
                <span class="last-run-weapon-lvl">Ур. ${w.level}</span>
                ${isTop ? '<span class="last-run-weapon-top-tag">ТОП</span>' : ''}
              </div>
              <div class="last-run-weapon-numbers">
                <span class="last-run-weapon-val">${dmg.toLocaleString('ru-RU')}</span>
                <span class="last-run-weapon-pct">${pct}%</span>
              </div>
            </div>
            <div class="last-run-weapon-bar-wrap">
              <div class="last-run-weapon-bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>`;
        }).join('');
      } else {
        this.weaponsList.innerHTML = `<div style="font-size: 12px; color: #64748b; padding: 8px 0;">Нет данных об оружии</div>`;
      }
    }

    // 5. Co-op section
    if (this.coopSection && this.coopList) {
      if (run.isCoop && run.coopPlayers && run.coopPlayers.length > 0) {
        this.coopSection.classList.remove('hidden');
        this.coopList.innerHTML = run.coopPlayers.map(p => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 12px; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="color: ${p.colorCss};">${p.name}</strong>
              <span style="color: #94a3b8;">(${getHeroName(p.charType)})</span>
            </div>
            <div style="display: flex; gap: 12px; font-family: monospace;">
              <span>💀 ${p.kills}</span>
              <span>⚔️ ${p.damageDealt.toLocaleString('ru-RU')}</span>
            </div>
          </div>
        `).join('');
      } else {
        this.coopSection.classList.add('hidden');
      }
    }
  }
}
