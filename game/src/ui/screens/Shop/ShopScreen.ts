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
 * Displays 3 branches of 10 persistent upgrades (up to 5 ranks each) for Rift Crystals,
 * shared across all characters.
 */
export class ShopScreen extends Screen {
  private options: ShopScreenOptions;
  private unsubscribeMeta?: () => void;
  private activeBranch: MetaBranchId = 'offense';

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

    // Branch navigation tabs
    const tabButtons = SafeDOM.queryAll(this.container, '.shop-tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const branch = (e.currentTarget as HTMLElement).dataset.branch as MetaBranchId;
        if (branch && branch !== this.activeBranch) {
          SoundManager.playButtonClick();
          this.switchBranch(branch);
        }
      });
    });

    // Respec button
    SafeDOM.query(this.container, '#shop-btn-respec')?.addEventListener('click', () => {
      this.handleRespec();
    });
  }

  private switchBranch(branch: MetaBranchId): void {
    this.activeBranch = branch;
    const tabButtons = SafeDOM.queryAll(this.container, '.shop-tab-btn');
    tabButtons.forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.branch === branch);
    });

    // Update banner description
    const def = META_BRANCHES[branch];
    const bannerDesc = SafeDOM.query(this.container, '#shop-branch-banner-desc');
    if (bannerDesc && def) {
      bannerDesc.textContent = def.description;
    }

    this.renderTalentsList();
  }

  private close(): void {
    this.hide();
    this.options.onClose?.();
  }

  private handleUpgradeTalent(talentId: string): void {
    const meta = MetaProgression.getInstance();
    const success = meta.upgradeTalent(talentId);
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
    const totalPts = meta.getTotalTalentPoints();

    // 1. Crystal Wallet & Total Spent
    const balanceEl = SafeDOM.query(this.container, '#shop-crystal-balance');
    if (balanceEl) balanceEl.textContent = crystals.toLocaleString();

    const spentEl = SafeDOM.query(this.container, '#shop-total-invested');
    if (spentEl) spentEl.textContent = spent.toLocaleString();

    const ptsEl = SafeDOM.query(this.container, '#shop-total-pts');
    if (ptsEl) ptsEl.textContent = `${totalPts} / 150 очков`;

    // 2. Branch points badges
    for (const b of ['offense', 'defense', 'utility'] as MetaBranchId[]) {
      const talents = meta.getBranchTalents(b);
      let branchPts = 0;
      for (const t of talents) {
        branchPts += meta.getTalentLevel(t.id);
      }
      const badge = SafeDOM.query(this.container, `#${b}-branch-pts`);
      if (badge) {
        badge.textContent = `${branchPts} / 50`;
      }
    }

    // 3. Render active branch talents
    this.renderTalentsList();
  }

  private renderTalentsList(): void {
    const container = SafeDOM.query(this.container, '#shop-talents-grid');
    if (!container) return;

    const meta = MetaProgression.getInstance();
    const talents = meta.getBranchTalents(this.activeBranch);
    const crystals = meta.getCrystals();

    container.innerHTML = '';

    for (const t of talents) {
      const level = meta.getTalentLevel(t.id);
      const isMax = level >= t.maxLevel;
      const nextCost = meta.getTalentNextCost(t.id);
      const canAfford = crystals >= (nextCost ?? Infinity);

      const card = document.createElement('div');
      card.className = `shop-talent-card branch-${t.branch} ${isMax ? 'is-maxed' : ''}`;
      card.dataset.talentId = t.id;

      // Pips
      let pipsHtml = '';
      for (let i = 1; i <= t.maxLevel; i++) {
        pipsHtml += `<div class="talent-pip ${i <= level ? 'is-active' : ''}"></div>`;
      }

      // Format bonus descriptions
      const formatVal = (multiplier: number) => {
        const val = multiplier * t.bonusPerLevel;
        if (t.unit === '%') return `+${(val * 100).toFixed(1)}%`;
        return `+${val.toFixed(val % 1 === 0 ? 0 : 1)} ${t.unit || ''}`;
      };

      const curBonusText = level === 0 ? 'Нет активного бонуса' : `${formatVal(level)} эффекта`;
      const nextBonusText = isMax
        ? '✓ МАКСИМАЛЬНЫЙ РАНГ'
        : `Ранг ${level + 1}: ${formatVal(level + 1)}`;

      card.innerHTML = `
        <div class="talent-card-top">
          <span class="talent-icon-box">${t.icon || '⭐'}</span>
          <div class="talent-title-wrap">
            <h4 class="talent-title">${t.name}</h4>
            <span class="talent-level-tag ${isMax ? 'tag-max' : ''}">РАНГ ${level} / ${t.maxLevel}</span>
          </div>
        </div>

        <div class="talent-pips-row">
          ${pipsHtml}
        </div>

        <p class="talent-desc">${t.description}</p>

        <div class="talent-stats-row">
          <div class="talent-stat-box">
            <span class="talent-stat-label">Текущий:</span>
            <span class="talent-stat-val ${level > 0 ? 'is-active' : ''}">${curBonusText}</span>
          </div>
          <div class="talent-stat-box">
            <span class="talent-stat-label">${isMax ? 'Статус:' : 'Следующий:'}</span>
            <span class="talent-stat-val ${isMax ? 'is-max' : 'is-next'}">${nextBonusText}</span>
          </div>
        </div>

        <button class="talent-buy-btn ${isMax ? 'is-max' : ''}" type="button" ${isMax || !canAfford ? 'disabled' : ''}>
          ${
            isMax
              ? '<span class="buy-btn-text">МАКСИМУМ (5/5)</span>'
              : `
                <span class="buy-btn-text">УЛУЧШИТЬ</span>
                <span class="buy-btn-cost">
                  <img src="/textures/ui/bp_crystal.png" class="btn-crystal-icon" alt="🔮" />
                  <span>${nextCost}</span>
                </span>
              `
          }
        </button>
      `;

      const buyBtn = card.querySelector('.talent-buy-btn');
      buyBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleUpgradeTalent(t.id);
      });

      container.appendChild(card);
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
