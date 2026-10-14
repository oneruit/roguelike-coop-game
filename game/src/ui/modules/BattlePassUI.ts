import {
  BattlePassManager,
  BP_MAX_LEVEL,
  BP_POINTS_PER_LEVEL,
  BP_MAX_POINTS
} from '../../core/BattlePassManager';
import { SoundManager } from '../../core/SoundManager';
import { getAssetUrl } from '../../utils/assetPath';

export interface BattlePassUIContext {
  getBpBarFill: () => HTMLElement | null;
  getBpRewardsRow: () => HTMLElement | null;
  getBattlePassModal: () => HTMLElement | null;
  getBpModalCurLvl: () => HTMLElement | null;
  getBpModalCurXp: () => HTMLElement | null;
  getBpModalTotalXp: () => HTMLElement | null;
  getBpModalBarFill: () => HTMLElement | null;
  getBtnBpClaimAll: () => HTMLElement | null;
  getBpModalTiersContainer: () => HTMLElement | null;
  getBtnBpClose?: () => HTMLElement | null;
  getBpBackdrop?: () => HTMLElement | null;
  getBpHeaderBtn?: () => HTMLElement | null;
  getMenuStack: () => string[];
  pushMenu: (menu: string) => void;
  removeMenu: (menu: string) => void;
  showBalanceToast: (msg: string) => void;
}

export class BattlePassUI {
  private ctx: BattlePassUIContext;

  constructor(ctx: BattlePassUIContext) {
    this.ctx = ctx;
    this.bindListeners();
  }

  public bindListeners() {
    const claimAllBtn = this.ctx.getBtnBpClaimAll() || document.getElementById('btn-bp-claim-all');
    claimAllBtn?.addEventListener('click', () => {
      this.handleClaimAllBattlePass();
    });

    const closeBtn = this.ctx.getBtnBpClose?.() || document.getElementById('btn-close-bp-modal');
    closeBtn?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.hideBattlePassModal();
    });

    const backdrop = this.ctx.getBpBackdrop?.() || document.getElementById('battle-pass-backdrop');
    backdrop?.addEventListener('click', () => {
      this.hideBattlePassModal();
    });

    const headerBtn = this.ctx.getBpHeaderBtn?.() || document.getElementById('bp-header-btn');
    headerBtn?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.openBattlePassModal();
    });
  }

  public updateMainMenuBattlePass() {
    const bp = BattlePassManager.getInstance();
    const curLevel = bp.getLevel();
    const progressPct = bp.getProgressPercent();

    const barFill = this.ctx.getBpBarFill() || document.getElementById('bp-bar-fill');
    if (barFill) {
      barFill.style.width = `${progressPct}%`;
      barFill.style.opacity = progressPct > 0 ? '1' : '0';
    }

    const m10 = document.querySelector('.bp-milestone.bp-m-lvl10');
    const m15 = document.querySelector('.bp-milestone.bp-m-lvl15');
    if (m10) m10.classList.toggle('reached', curLevel >= 10);
    if (m15) m15.classList.toggle('reached', curLevel >= 15);

    const rowContainer = this.ctx.getBpRewardsRow() || document.getElementById('bp-rewards-row');
    if (!rowContainer) return;
    rowContainer.innerHTML = '';

    const freeSlot = document.createElement('div');
    freeSlot.className = 'bp-slot-card bp-slot-free';
    freeSlot.setAttribute('role', 'button');
    freeSlot.setAttribute('tabindex', '0');
    freeSlot.setAttribute('title', 'Бесплатный боевой пропуск 1-го сезона активен для всех игроков');
    freeSlot.innerHTML = `
      <div class="bp-slot-box bp-slot-free-box">
        <img src="${getAssetUrl('/textures/ui/bp_badge_free.png')}" class="bp-slot-img bp-badge-img" alt="Бесплатно" />
      </div>
      <span class="bp-free-ribbon">БЕСПЛАТНО</span>
    `;
    freeSlot.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.openBattlePassModal();
    });
    rowContainer.appendChild(freeSlot);

    const allRewards = bp.getAllRewards();
    let startLvl = 1;
    if (curLevel > 6) {
      startLvl = Math.min(curLevel - 2, BP_MAX_LEVEL - 5);
    }
    const visibleRewards = allRewards.slice(startLvl - 1, startLvl - 1 + 6);

    for (const reward of visibleRewards) {
      const isUnlocked = bp.isLevelUnlocked(reward.level);
      const isClaimed = bp.isLevelClaimed(reward.level);
      const canClaim = bp.canClaim(reward.level);

      const slot = document.createElement('div');
      slot.className = `bp-slot-card ${canClaim ? 'claimable' : ''} ${isClaimed ? 'claimed' : isUnlocked ? 'unlocked' : 'locked'}`;
      slot.setAttribute('data-level', reward.level.toString());
      slot.setAttribute('role', 'button');
      slot.setAttribute('tabindex', '0');

      const tooltip = isClaimed
        ? `Уровень ${reward.level}: ${reward.name} — Награда получена ✓`
        : canClaim
        ? `Уровень ${reward.level}: ${reward.name} — Нажмите, чтобы забрать (+${reward.coins} монет)!`
        : `Уровень ${reward.level}: ${reward.name} (+${reward.coins} монет) [Требуется уровень ${reward.level}]`;
      slot.setAttribute('title', tooltip);

      const statusBadge = isClaimed
        ? '<span class="bp-slot-check-badge" title="Получено">✓</span>'
        : canClaim
        ? '<span class="bp-slot-claim-sparkle" title="Забрать">!</span>'
        : '<span class="bp-slot-lock-badge" title="Заблокировано"><svg viewBox="0 0 24 24" width="12" height="12" fill="#cbd5e1"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg></span>';

      slot.innerHTML = `
        <div class="bp-slot-box">
          <img src="${bp.getRewardIconUrl(reward.icon)}" class="bp-slot-img" alt="${reward.name}" onerror="this.style.opacity='0.2'" />
          ${statusBadge}
        </div>
        <span class="bp-slot-lvl">${reward.level}</span>
      `;

      slot.addEventListener('click', () => {
        if (canClaim) {
          const res = bp.claimReward(reward.level);
          if (res.success && res.reward) {
            SoundManager.playChestOpen();
            this.ctx.showBalanceToast(`Получена награда ур. ${reward.level}: ${res.reward.name} (+${res.reward.coins} монет)!`);
            this.updateMainMenuBattlePass();
          }
        } else {
          SoundManager.playButtonClick();
          this.openBattlePassModal();
        }
      });

      rowContainer.appendChild(slot);
    }
  }

  public renderBattlePassModal() {
    const bp = BattlePassManager.getInstance();
    const curLevel = bp.getLevel();
    const curPts = bp.getPoints();
    const ptsInLvl = bp.getPointsInCurrentLevel();
    const progressPct = bp.getProgressPercent();

    const curLvlEl = this.ctx.getBpModalCurLvl();
    if (curLvlEl) {
      curLvlEl.innerText = curLevel >= BP_MAX_LEVEL ? '15 (МАКС)' : curLevel.toString();
    }
    const curXpEl = this.ctx.getBpModalCurXp();
    if (curXpEl) {
      curXpEl.innerText = curLevel >= BP_MAX_LEVEL ? `${BP_POINTS_PER_LEVEL} / ${BP_POINTS_PER_LEVEL} ОП` : `${ptsInLvl} / ${BP_POINTS_PER_LEVEL} ОП`;
    }
    const totalXpEl = this.ctx.getBpModalTotalXp();
    if (totalXpEl) {
      totalXpEl.innerText = `Всего: ${curPts} / ${BP_MAX_POINTS} ОП`;
    }
    const barFill = this.ctx.getBpModalBarFill();
    if (barFill) {
      barFill.style.width = `${progressPct}%`;
      barFill.style.opacity = progressPct > 0 ? '1' : '0';
    }

    const container = this.ctx.getBpModalTiersContainer() || document.getElementById('bp-modal-tiers-container');
    if (!container) return;
    container.innerHTML = '';

    const allRewards = bp.getAllRewards();
    let hasAnyClaimable = false;

    for (const reward of allRewards) {
      const isUnlocked = bp.isLevelUnlocked(reward.level);
      const isClaimed = bp.isLevelClaimed(reward.level);
      const canClaim = bp.canClaim(reward.level);
      if (canClaim) hasAnyClaimable = true;

      const card = document.createElement('div');
      card.className = `bp-tier-card ${canClaim ? 'claimable' : ''} ${isClaimed ? 'claimed' : isUnlocked ? 'unlocked' : 'locked'}`;

      let btnHtml = '';
      if (isClaimed) {
        btnHtml = `<button class="bp-tier-btn claimed" disabled>Получено ✓</button>`;
      } else if (canClaim) {
        btnHtml = `<button class="bp-tier-btn claim-now">ЗАБРАТЬ</button>`;
      } else {
        btnHtml = `<button class="bp-tier-btn locked" disabled>Требуется ур. ${reward.level}</button>`;
      }

      card.innerHTML = `
        <div class="bp-tier-lvl-badge">УРОВЕНЬ ${reward.level}</div>
        <div class="bp-tier-icon-wrap">
          <img src="${bp.getRewardIconUrl(reward.icon)}" class="bp-tier-img" alt="${reward.name}" />
        </div>
        <div class="bp-tier-rewards-col">
          <span class="bp-tier-reward-coin">💰 +${reward.coins} монет</span>
          ${reward.gems ? `<span class="bp-tier-reward-gem">💎 +${reward.gems} крист.</span>` : ''}
        </div>
        <div class="bp-tier-info">
          <div class="bp-tier-title">${reward.name}</div>
          <div class="bp-tier-desc">${reward.description}</div>
        </div>
        <div class="bp-tier-action">
          ${btnHtml}
        </div>
      `;

      if (canClaim) {
        const claimBtn = card.querySelector<HTMLButtonElement>('.bp-tier-btn.claim-now');
        claimBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          const res = bp.claimReward(reward.level);
          if (res.success && res.reward) {
            SoundManager.playChestOpen();
            this.ctx.showBalanceToast(`Получена награда ур. ${reward.level}: ${res.reward.name} (+${res.reward.coins} монет)!`);
            this.renderBattlePassModal();
            this.updateMainMenuBattlePass();
          }
        });
      }

      container.appendChild(card);
    }

    const claimAllBtn = this.ctx.getBtnBpClaimAll();
    if (claimAllBtn) {
      claimAllBtn.classList.toggle('hidden', !hasAnyClaimable);
    }
  }

  public openBattlePassModal() {
    this.renderBattlePassModal();
    const stack = this.ctx.getMenuStack();
    if (stack[stack.length - 1] !== 'battle_pass') {
      this.ctx.pushMenu('battle_pass');
    }
    this.ctx.getBattlePassModal()?.classList.remove('hidden');
  }

  public hideBattlePassModal() {
    this.ctx.removeMenu('battle_pass');
    this.ctx.getBattlePassModal()?.classList.add('hidden');
  }

  public handleClaimAllBattlePass() {
    const bp = BattlePassManager.getInstance();
    const res = bp.claimAllAvailable();
    if (res.claimedCount > 0) {
      SoundManager.playChestOpen();
      this.ctx.showBalanceToast(`Забрано ${res.claimedCount} наград: +${res.totalCoins} монет!`);
      this.renderBattlePassModal();
      this.updateMainMenuBattlePass();
    } else {
      this.ctx.showBalanceToast('Нет доступных наград для получения');
    }
  }
}
