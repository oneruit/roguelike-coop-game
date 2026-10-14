import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { SoundManager } from '../../../core/SoundManager';
import {
  MetaProgression,
  META_BRANCHES,
  MetaBranchId
} from '../../../meta/MetaProgression';

export interface ShopScreenOptions {
  container?: HTMLElement | null;
  onClose?: () => void;
}

/**
 * Modular Shop / Meta Progression Screen.
 * Displays 3 branches of 10 persistent upgrades for Rift Crystals, shared across all characters.
 */
export class ShopScreen extends Screen {
  private options: ShopScreenOptions;
  private unsubscribeMeta?: () => void;

  constructor(options: ShopScreenOptions = {}) {
    const existingModal = options.container || SafeDOM.getElementById('shop-modal');
    super('shop', existingModal);
    this.options = options;

    this.bindElements();
    this.bindEvents();

    this.unsubscribeMeta = MetaProgression.getInstance().onChange(() => {
      if (this.isVisible()) {
        this.updateUI();
      }
    });
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {}

  protected bindEvents(): void {
    // Close / Back buttons
    SafeDOM.query(this.container, '#shop-btn-close')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.close();
    });

    SafeDOM.query(this.container, '#shop-btn-back')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.close();
    });

    // Upgrade buttons
    const branches: MetaBranchId[] = ['offense', 'defense', 'utility'];
    for (const b of branches) {
      SafeDOM.query(this.container, `#btn-upgrade-${b}`)?.addEventListener('click', () => {
        this.handleUpgrade(b);
      });
    }

    // Respec button
    SafeDOM.query(this.container, '#shop-btn-respec')?.addEventListener('click', () => {
      this.handleRespec();
    });
  }

  private close(): void {
    this.hide();
    this.options.onClose?.();
  }

  private handleUpgrade(branch: MetaBranchId): void {
    const meta = MetaProgression.getInstance();
    const success = meta.upgradeBranch(branch);
    if (success) {
      SoundManager.playLevelUp();
      this.updateUI();
    } else {
      SoundManager.playButtonClick();
    }
  }

  private handleRespec(): void {
    const meta = MetaProgression.getInstance();
    const spent = meta.getTotalSpentCrystals();
    if (spent <= 0) {
      alert('У вас пока нет активных улучшений для сброса.');
      return;
    }

    if (confirm(`Сбросить все таланты и вернуть ${spent} Кристаллов Разлома (100% возврат)?`)) {
      meta.respecAll();
      SoundManager.playReroll();
      this.updateUI();
    }
  }

  public updateUI(): void {
    if (!this.container) return;

    const meta = MetaProgression.getInstance();
    const crystals = meta.getCrystals();
    const spent = meta.getTotalSpentCrystals();

    // 1. Crystal Wallet & Total Spent
    const balanceEl = SafeDOM.query(this.container, '#shop-crystal-balance');
    if (balanceEl) balanceEl.textContent = crystals.toLocaleString();

    const spentEl = SafeDOM.query(this.container, '#shop-total-invested');
    if (spentEl) spentEl.textContent = spent.toLocaleString();

    // 2. Update each branch
    const branches: MetaBranchId[] = ['offense', 'defense', 'utility'];
    for (const b of branches) {
      const def = META_BRANCHES[b];
      const level = meta.getUpgradeLevel(b);
      const nextCost = meta.getNextTierCost(b);
      const isMax = level >= 10;

      // Level text
      const levelText = SafeDOM.query(this.container, `#${b}-level-text`);
      if (levelText) levelText.textContent = `${level}`;

      // Pips (10 pips)
      const pipsContainer = SafeDOM.query(this.container, `#${b}-pips`);
      if (pipsContainer) {
        let pipsHtml = '';
        for (let i = 1; i <= 10; i++) {
          const isActive = i <= level;
          pipsHtml += `<div class="shop-pip ${isActive ? 'is-active' : ''}"></div>`;
        }
        pipsContainer.innerHTML = pipsHtml;
      }

      // Current Bonus text
      const curBonusEl = SafeDOM.query(this.container, `#${b}-cur-bonus`);
      if (curBonusEl) {
        if (level === 0) {
          curBonusEl.textContent = 'Нет активных бонусов';
          curBonusEl.style.color = '#64748b';
        } else {
          const curTierInfo = def.tiers[level - 1];
          curBonusEl.textContent = curTierInfo ? curTierInfo.description : 'Максимальный эффект';
          curBonusEl.style.color = '#f1f5f9';
        }
      }

      // Next Bonus preview text
      const nextBonusEl = SafeDOM.query(this.container, `#${b}-next-bonus`);
      if (nextBonusEl) {
        if (isMax) {
          nextBonusEl.textContent = '✓ Достигнут максимум';
          nextBonusEl.style.color = '#10b981';
        } else {
          const nextTierInfo = def.tiers[level];
          nextBonusEl.textContent = nextTierInfo ? `${nextTierInfo.title}: ${nextTierInfo.description}` : '—';
          nextBonusEl.style.color = '#38bdf8';
        }
      }

      // Upgrade Button
      const btn = SafeDOM.query<HTMLButtonElement>(this.container, `#btn-upgrade-${b}`);
      const costWrap = SafeDOM.query(this.container, `#${b}-cost-wrap`);
      const costText = SafeDOM.query(this.container, `#${b}-cost-text`);
      const btnText = btn?.querySelector('.btn-text');

      if (btn) {
        if (isMax) {
          btn.disabled = true;
          if (btnText) btnText.textContent = 'МАКСИМУМ (10/10)';
          if (costWrap) (costWrap as HTMLElement).style.display = 'none';
        } else {
          const canAfford = crystals >= (nextCost ?? Infinity);
          btn.disabled = !canAfford;
          if (btnText) btnText.textContent = 'УЛУЧШИТЬ';
          if (costWrap) (costWrap as HTMLElement).style.display = 'flex';
          if (costText) costText.textContent = `${nextCost ?? 0}`;
        }
      }
    }
  }

  protected onShow(): void {
    this.updateUI();
  }

  protected onHide(): void {}

  public destroy(): void {
    if (this.unsubscribeMeta) {
      this.unsubscribeMeta();
    }
  }
}
