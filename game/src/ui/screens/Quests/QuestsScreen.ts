import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { CharacterType } from '../../../entities/Player';
import { ProgressionManager, SidebarQuestItem } from '../../../core/ProgressionManager';
import { getChapterDef } from '../../../core/ChapterQuestsConfig';
import { getSpecialQuestDef, getSpecialQuestsByCategory } from '../../../core/SpecialQuestsConfig';
import { SoundManager } from '../../../core/SoundManager';
import { getAssetUrl } from '../../../utils/assetPath';

export interface ChapterQuestItem {
  id: string;
  chapter: number;
  heroType?: CharacterType;
  title: string;
  icon: string;
  iconBoxClass?: string;
  barColor?: 'purple' | 'cyan' | 'orange' | 'green';
  progressVal: { current: number; max: number; label: string; isComplete: boolean };
  targetAvatar: string;
  desc: string;
  steps: string[];
  rewards: { potions: number; coins: number; chest: number };
}

export interface QuestsScreenOptions {
  container?: HTMLElement | null;
  questsModal?: HTMLElement | null;
  mainMenuModal?: HTMLElement;
  pauseModal: HTMLElement;
  getMainMenuBattlePass?: () => HTMLElement | null;
  isPaused: () => boolean;
  getMenuStack: () => string[];
  pushMenu: (menu: string) => void;
  removeMenu: (menu: string) => void;
  triggerAltarNotification: (name: string, subtitle: string, icon: string, color: string) => void;
  showCharacterSelect?: () => void;
}

export class QuestsScreen extends Screen {
  protected ctx: QuestsScreenOptions;
  public activeQuestHero: CharacterType = 'valkyrie';
  public activeQuestChapter: number = 1;
  public activeQuestId: string = 'ch1_deadly_debut';
  public activeTabType: 'chapter' | 'rift_path' | 'weekly' = 'chapter';
  public isQuestsOpenInMenu: boolean = false;
  public isFromCharSelect: boolean = false;
  private tabsBound: boolean = false;

  constructor(options: QuestsScreenOptions) {
    const existingModal = options.container || options.questsModal || SafeDOM.getElementById('quests-modal');
    super('quests', existingModal);
    this.ctx = options;

    this.bindElements();
    this.bindEvents();
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {}

  protected bindEvents(): void {
    if (this.tabsBound) return;
    this.tabsBound = true;

    const closeBtn = SafeDOM.query(this.container, '#quests-btn-close');
    closeBtn?.addEventListener('click', () => {
      this.hideQuestsModal();
    });

    const backdrop = SafeDOM.query(this.container, '.modal-backdrop');
    backdrop?.addEventListener('click', () => {
      this.hideQuestsModal();
    });

    const chapterTabs = SafeDOM.queryAll<HTMLElement>(this.container, '.quest-chapter-tab[data-chapter]');
    chapterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const ch = parseInt(tab.getAttribute('data-chapter') || '1', 10);
        if (!this.isChapterUnlocked(ch)) {
          SoundManager.playButtonClick();
          this.ctx.triggerAltarNotification('Глава заблокирована', `Сначала завершите все задания Главы ${ch - 1}!`, '🔒', '#f59e0b');
          return;
        }
        SoundManager.playButtonClick();
        this.selectQuestChapter(ch);
      });
    });

    const specialTabs = SafeDOM.queryAll<HTMLElement>(this.container, '.quest-special-tab[data-tab-type]');
    specialTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabType = (tab.getAttribute('data-tab-type') || 'rift_path') as 'rift_path' | 'weekly';
        SoundManager.playButtonClick();
        this.selectSpecialTab(tabType);
      });
    });

    const finalBtn = SafeDOM.query(this.container, '#quest-chapter-final-btn');
    finalBtn?.addEventListener('click', () => {
      const prog = ProgressionManager.getInstance();
      const ch = this.activeQuestChapter;
      const res = prog.claimChapterFinalReward(ch);
      if (res) {
        SoundManager.playLevelUp();
        const chDef = getChapterDef(ch);
        this.ctx.triggerAltarNotification(
          'Глава Завершена!',
          `${chDef?.title}: +${res.coins} 🪙`,
          '👑',
          '#fbbf24'
        );
        this.renderQuestsModal(this.activeQuestId, this.activeQuestChapter);
      }
    });
  }

  public isChapterUnlocked(chapter: number): boolean {
    return ProgressionManager.getInstance().isChapterUnlocked(chapter);
  }

  public toggleQuestsInMainMenu(): void {
    if (!this.container.classList.contains('hidden')) {
      this.hideQuestsModal();
    } else {
      this.showQuestsModal('ch1_deadly_debut', 1, false, 'chapter');
    }
  }

  public selectSpecialTab(tabType: 'rift_path' | 'weekly'): void {
    this.activeTabType = tabType;
    const quests = getSpecialQuestsByCategory(tabType);
    const defaultQuest = quests[0]?.id || (tabType === 'rift_path' ? 'rift_elite_bisons' : 'weekly_elite_coyotes');
    this.activeQuestId = defaultQuest;
    this.renderQuestsModal(defaultQuest, this.activeQuestChapter);
  }

  public selectQuestChapter(chapter: number): void {
    this.activeTabType = 'chapter';
    if (!this.isChapterUnlocked(chapter)) {
      chapter = 1;
    }
    this.activeQuestChapter = chapter;
    const quests = this.getChapterQuests(chapter);
    const defaultQuest = quests[0]?.id || 'ch1_deadly_debut';
    this.activeQuestId = defaultQuest;
    this.renderQuestsModal(defaultQuest, chapter);
  }

  public showQuestsModal(
    selectedQuestId?: string,
    chapter: number = 1,
    fromCharSelect: boolean = false,
    tabType: 'chapter' | 'rift_path' | 'weekly' = 'chapter'
  ): void {
    this.activeTabType = tabType;
    if (tabType === 'rift_path') {
      const quests = getSpecialQuestsByCategory('rift_path');
      this.activeQuestId = selectedQuestId || quests[0]?.id || 'rift_elite_bisons';
    } else if (tabType === 'weekly') {
      const quests = getSpecialQuestsByCategory('weekly');
      this.activeQuestId = selectedQuestId || quests[0]?.id || 'weekly_elite_coyotes';
    } else {
      if (!this.isChapterUnlocked(chapter)) {
        chapter = 1;
      }
      this.activeQuestChapter = chapter;
      const quests = this.getChapterQuests(chapter);
      const targetQuest = quests.some((q) => q.id === selectedQuestId)
        ? (selectedQuestId as string)
        : (quests[0]?.id || 'ch1_deadly_debut');
      this.activeQuestId = targetQuest;
    }

    if (fromCharSelect) {
      this.isFromCharSelect = true;
      this.isQuestsOpenInMenu = false;
    } else if (this.ctx.isPaused() || this.ctx.getMenuStack().includes('pause')) {
      this.ctx.pauseModal.classList.add('hidden');
      this.isFromCharSelect = false;
      this.isQuestsOpenInMenu = false;
    } else {
      this.isFromCharSelect = false;
      this.isQuestsOpenInMenu = true;
    }

    const stack = this.ctx.getMenuStack();
    if (stack[stack.length - 1] !== 'quests') {
      this.ctx.pushMenu('quests');
    }

    this.renderQuestsModal(this.activeQuestId, chapter);
    this.show();
  }

  public hideQuestsModal(): void {
    this.hide();
    this.isQuestsOpenInMenu = false;
    this.ctx.removeMenu('quests');
    if (this.isFromCharSelect) {
      this.isFromCharSelect = false;
      this.ctx.showCharacterSelect?.();
    } else if (this.ctx.isPaused() || this.ctx.getMenuStack().includes('pause')) {
      this.ctx.pauseModal.classList.remove('hidden');
    }
  }

  public getChapterQuests(chapter: number): ChapterQuestItem[] {
    const prog = ProgressionManager.getInstance();
    const chDef = getChapterDef(chapter);
    if (!chDef) return [];

    return chDef.quests.map((q) => {
      const p = prog.getChapterQuestProgress(q.id);
      return {
        id: q.id,
        chapter: q.chapter,
        title: q.title,
        icon: q.icon,
        barColor: q.barColor,
        progressVal: {
          current: p.current,
          max: p.max,
          label: p.label,
          isComplete: p.isComplete
        },
        targetAvatar: q.targetAvatar,
        desc: q.desc,
        steps: q.steps,
        rewards: q.rewards
      };
    });
  }

  public renderQuestsModal(
    selectedQuestId: string = this.activeQuestId,
    chapter: number = this.activeQuestChapter
  ): void {
    if (!this.isChapterUnlocked(chapter)) {
      chapter = 1;
    }
    this.activeQuestChapter = chapter;
    this.activeQuestId = selectedQuestId;
    const prog = ProgressionManager.getInstance();

    const lvlEl = SafeDOM.query(this.container, '#quest-acc-lvl-text');
    if (lvlEl) lvlEl.textContent = `УРОВЕНЬ АККАУНТА: ${prog.data.accountLevel}`;
    const xpEl = SafeDOM.query(this.container, '#quest-acc-xp-text');
    if (xpEl) xpEl.textContent = `(${prog.data.accountXp} / ${prog.data.accountXpToNext} XP)`;
    const coinsEl = SafeDOM.query(this.container, '#quest-acc-coins-text');
    if (coinsEl) coinsEl.textContent = `🪙 ${prog.data.walletCoins}`;

    const chapterTabs = SafeDOM.queryAll<HTMLElement>(this.container, '.quest-chapter-tab[data-chapter]');
    chapterTabs.forEach((tab) => {
      const ch = parseInt(tab.getAttribute('data-chapter') || '1', 10);
      const isUnlocked = this.isChapterUnlocked(ch);
      const tabDef = getChapterDef(ch);
      if (isUnlocked) {
        tab.classList.remove('locked');
        tab.removeAttribute('aria-disabled');
        if (tabDef) tab.title = `${tabDef.title} ${tabDef.subtitle}`;
      } else {
        tab.classList.add('locked');
        tab.setAttribute('aria-disabled', 'true');
        tab.title = `Глава ${ch} (Заблокирована: сначала завершите Главу ${ch - 1})`;
      }
      if (this.activeTabType === 'chapter' && ch === this.activeQuestChapter) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    const specialTabs = SafeDOM.queryAll<HTMLElement>(this.container, '.quest-special-tab[data-tab-type]');
    specialTabs.forEach((tab) => {
      const tType = tab.getAttribute('data-tab-type');
      if (this.activeTabType === tType) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    const headingRoman = SafeDOM.query(this.container, '#quest-chapter-heading-roman');
    const headingSub = SafeDOM.query(this.container, '#quest-chapter-heading-sub');
    const listContainer = SafeDOM.query(this.container, '#quest-items-list');
    const finalLbl = SafeDOM.query(this.container, '.chapter-final-reward-lbl');
    const finalVal = SafeDOM.query(this.container, '#chapter-final-reward-val');
    const finalBtn = SafeDOM.query<HTMLButtonElement>(this.container, '#quest-chapter-final-btn');
    const titleEl = SafeDOM.query(this.container, '#quest-right-title');
    const descEl = SafeDOM.query(this.container, '#quest-right-desc');
    const targetAvatarEl = SafeDOM.query<HTMLImageElement>(this.container, '#quest-target-avatar');
    const stepsContainer = SafeDOM.query(this.container, '#quest-right-steps');
    const rewardsGrid = SafeDOM.query(this.container, '#quest-rewards-grid');
    const statusEl = SafeDOM.query(this.container, '#quest-action-status-text');
    const actionsEl = SafeDOM.query(this.container, '#quest-action-buttons');

    if (this.activeTabType === 'rift_path' || this.activeTabType === 'weekly') {
      const isRift = this.activeTabType === 'rift_path';
      if (headingRoman) {
        headingRoman.textContent = isRift ? 'Событие: «Путь в Разлом»' : 'Еженедельные Задания';
      }
      if (headingSub) {
        headingSub.textContent = isRift ? '(Особое еженедельное испытание)' : '(Испытания текущей недели)';
      }

      const specialQuests = getSpecialQuestsByCategory(this.activeTabType);
      if (!specialQuests.some((q) => q.id === this.activeQuestId)) {
        this.activeQuestId = specialQuests[0]?.id || (isRift ? 'rift_elite_bisons' : 'weekly_elite_coyotes');
      }

      if (listContainer) {
        listContainer.innerHTML = '';
        specialQuests.forEach((q) => {
          const p = prog.getSpecialQuestProgress(q.id);
          const itemEl = document.createElement('div');
          itemEl.className = 'quest-hero-item' + (q.id === this.activeQuestId ? ' active' : '');
          itemEl.setAttribute('data-quest-id', q.id);

          const pct = Math.max(0, Math.min(100, Math.round((p.current / (p.max || 1)) * 100)));
          let barClass = ' bar-cyan';
          if (q.barColor === 'orange') barClass = ' bar-orange';
          else if (q.barColor === 'green') barClass = ' bar-green';
          if (p.isComplete) barClass += ' complete';

          const badgeText = p.isClaimed ? '✓ Забрано' : p.isComplete ? '✓ Готово' : p.label;

          itemEl.innerHTML = `
            <div class="quest-item-icon-box">
              <img src="${getAssetUrl(q.icon)}" class="quest-item-avatar" alt="${q.title}" />
            </div>
            <div class="quest-item-info">
              <div class="quest-item-row-top">
                <div class="quest-item-title" title="${q.title}">${q.title}</div>
                <span class="quest-item-badge${p.isComplete ? ' complete' : ''}">${badgeText}</span>
              </div>
              <div class="quest-item-bar-wrap">
                <div class="quest-item-bar-fill${barClass}" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;

          itemEl.addEventListener('click', () => {
            SoundManager.playButtonClick();
            this.activeQuestId = q.id;
            this.renderQuestsModal(q.id, this.activeQuestChapter);
          });

          listContainer.appendChild(itemEl);
        });
      }

      if (finalLbl) finalLbl.textContent = isRift ? 'СОБЫТИЕ РАЗЛОМА:' : 'ЦИКЛ НЕДЕЛИ:';
      if (finalVal) finalVal.textContent = isRift ? 'ЭКСПЕДИЦИЯ' : `${specialQuests.length} ЗАДАНИЯ`;
      if (finalBtn) {
        finalBtn.disabled = true;
        finalBtn.className = 'quest-chapter-final-btn';
        if (isRift) {
          finalBtn.innerHTML = '⏱ ЗАВЕРШЕНИЕ ЧЕРЕЗ 6 Д. 14 Ч.';
        } else {
          const completedCount = specialQuests.filter((q) => prog.getSpecialQuestProgress(q.id).isComplete).length;
          finalBtn.innerHTML = `⏱ ПРОГРЕСС НЕДЕЛИ: ${completedCount}/${specialQuests.length}`;
        }
      }

      const activeSpecial = getSpecialQuestDef(this.activeQuestId) || specialQuests[0];
      if (!activeSpecial) return;

      if (titleEl) titleEl.textContent = activeSpecial.title;
      if (descEl) descEl.innerHTML = activeSpecial.desc.replace(/\n/g, '<br>');
      if (targetAvatarEl) targetAvatarEl.src = getAssetUrl(activeSpecial.targetAvatar);

      if (stepsContainer) {
        stepsContainer.innerHTML = '';
        const p = prog.getSpecialQuestProgress(activeSpecial.id);
        const isDone = p.isComplete;
        activeSpecial.steps.forEach((stepText, idx) => {
          const stepRow = document.createElement('div');
          stepRow.className = 'quest-step-item' + (isDone ? ' done' : '');
          stepRow.innerHTML = `
            <span class="step-num">${isDone ? '✓' : (idx + 1) + '.'}</span>
            <span class="step-text">${stepText}</span>
            <span class="step-check">${isDone ? '✓' : '○'}</span>
          `;
          stepsContainer.appendChild(stepRow);
        });
      }

      if (rewardsGrid) {
        rewardsGrid.innerHTML = '';
        if (activeSpecial.rewards.bp_xp) {
          const slot = document.createElement('div');
          slot.className = 'reward-slot reward-slot-bp';
          slot.title = `Опыт Боевого Пропуска (+${activeSpecial.rewards.bp_xp} XP)`;
          slot.innerHTML = `
            <img src="${getAssetUrl('/textures/ui/bp_crystal.png')}" class="reward-pixel-icon" alt="БП XP" />
            <span class="reward-slot-badge">+${activeSpecial.rewards.bp_xp} XP</span>
          `;
          rewardsGrid.appendChild(slot);
        }
        if (activeSpecial.rewards.coins) {
          const slot = document.createElement('div');
          slot.className = 'reward-slot reward-slot-pouch';
          slot.title = `Золотые монеты (+${activeSpecial.rewards.coins} 🪙)`;
          slot.innerHTML = `
            <img src="${getAssetUrl('/textures/quests/reward_pouch.png')}" class="reward-pixel-icon" alt="Золото" />
            <span class="reward-slot-badge">${activeSpecial.rewards.coins}</span>
          `;
          rewardsGrid.appendChild(slot);
        }
      }

      if (statusEl && actionsEl) {
        actionsEl.innerHTML = '';
        const p = prog.getSpecialQuestProgress(activeSpecial.id);
        const rewardDesc = activeSpecial.rewards.bp_xp
          ? `+${activeSpecial.rewards.bp_xp} Опыта Боевого Пропуска`
          : `+${activeSpecial.rewards.coins} 🪙 Золота`;

        if (p.isClaimed) {
          statusEl.innerHTML = '<span class="quest-status-success">✓ Задание выполнено! Награда получена.</span>';
          actionsEl.innerHTML = `<div class="quest-btn-unlocked-badge">✓ ВЫПОЛНЕНО</div>`;
        } else if (p.isComplete) {
          statusEl.innerHTML = `<span class="quest-status-ready">🎉 Задание выполнено! Заберите награду: <strong>${rewardDesc}</strong>.</span>`;
          const claimBtn = document.createElement('button');
          claimBtn.className = 'quest-btn-claim';
          claimBtn.type = 'button';
          claimBtn.innerText = `ЗАБРАТЬ НАГРАДУ (${rewardDesc})`;
          claimBtn.addEventListener('click', () => {
            const res = prog.claimSpecialQuest(activeSpecial.id);
            if (res) {
              SoundManager.playLevelUp();
              this.ctx.triggerAltarNotification(
                'Задание Выполнено!',
                `${activeSpecial.title}: ${res.bpXp ? `+${res.bpXp} BP XP` : `+${res.coins} 🪙`}`,
                '🎁',
                '#10b981'
              );
              this.renderQuestsModal(activeSpecial.id, this.activeQuestChapter);
            }
          });
          actionsEl.appendChild(claimBtn);
        } else {
          statusEl.textContent = `Прогресс задания: ${p.label}. Выполняйте условия в Разломе.`;
          const lockedBadge = document.createElement('div');
          lockedBadge.className = 'quest-btn-locked-badge';
          lockedBadge.innerHTML = '<span>🔒</span> <span>В ПРОЦЕССЕ</span>';
          actionsEl.appendChild(lockedBadge);
        }
      }
      return;
    }

    // --- Chapter Quests Tab Logic ---
    const chDef = getChapterDef(this.activeQuestChapter);
    if (headingRoman && chDef) {
      headingRoman.textContent = chDef.title;
    }
    if (headingSub && chDef) {
      headingSub.textContent = chDef.subtitle;
    }

    const quests = this.getChapterQuests(this.activeQuestChapter);
    if (!quests.some((q) => q.id === this.activeQuestId)) {
      this.activeQuestId = quests[0]?.id || 'ch1_deadly_debut';
    }

    // Populate Left Page List
    if (listContainer) {
      listContainer.innerHTML = '';
      quests.forEach((q) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'quest-hero-item' + (q.id === this.activeQuestId ? ' active' : '');
        itemEl.setAttribute('data-quest-id', q.id);

        const pct = Math.max(0, Math.min(100, Math.round((q.progressVal.current / (q.progressVal.max || 1)) * 100)));
        let barClass = '';
        if (q.barColor === 'cyan') barClass = ' bar-cyan';
        else if (q.barColor === 'orange') barClass = ' bar-orange';
        else if (q.barColor === 'green') barClass = ' bar-green';
        if (q.progressVal.isComplete) barClass += ' complete';

        const isComplete = q.progressVal.isComplete;
        const badgeText = isComplete ? '✓ Готово' : q.progressVal.label;

        itemEl.innerHTML = `
          <div class="quest-item-icon-box">
            <img src="${getAssetUrl(q.icon)}" class="quest-item-avatar" alt="${q.title}" />
          </div>
          <div class="quest-item-info">
            <div class="quest-item-row-top">
              <div class="quest-item-title" title="${q.title}">${q.title}</div>
              <span class="quest-item-badge${isComplete ? ' complete' : ''}">${badgeText}</span>
            </div>
            <div class="quest-item-bar-wrap">
              <div class="quest-item-bar-fill${barClass}" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;

        itemEl.addEventListener('click', () => {
          SoundManager.playButtonClick();
          this.activeQuestId = q.id;
          this.renderQuestsModal(q.id, this.activeQuestChapter);
        });

        listContainer.appendChild(itemEl);
      });
    }

    // Populate Chapter Final Reward Card
    if (finalLbl) finalLbl.textContent = 'ФИНАЛЬНАЯ НАГРАДА ГЛАВЫ:';
    if (chDef && finalVal) {
      finalVal.textContent = `${chDef.finalRewardCoins.toLocaleString('ru-RU')} 🪙`;
    }
    if (chDef && finalBtn) {
      const isComplete = prog.isChapterComplete(this.activeQuestChapter);
      const isClaimed = prog.isChapterRewardClaimed(this.activeQuestChapter);
      const completedCount = quests.filter((q) => q.progressVal.isComplete).length;
      const totalCount = quests.length;

      if (isClaimed) {
        finalBtn.disabled = true;
        finalBtn.className = 'quest-chapter-final-btn claimed';
        finalBtn.innerHTML = `✓ НАГРАДА ГЛАВЫ ПОЛУЧЕНА (${chDef.finalRewardCoins.toLocaleString('ru-RU')} 🪙)`;
      } else if (isComplete) {
        finalBtn.disabled = false;
        finalBtn.className = 'quest-chapter-final-btn claimable';
        finalBtn.innerHTML = `🎁 ЗАБРАТЬ НАГРАДУ ГЛАВЫ (+${chDef.finalRewardCoins.toLocaleString('ru-RU')} 🪙)`;
      } else {
        finalBtn.disabled = true;
        finalBtn.className = 'quest-chapter-final-btn';
        finalBtn.innerHTML = `🔒 ЗАВЕРШИТЕ ВСЕ ЗАДАНИЯ ГЛАВЫ (${completedCount}/${totalCount})`;
      }
    }

    // Populate Right Page Details
    const activeQuest = quests.find((q) => q.id === this.activeQuestId) || quests[0];
    if (!activeQuest) return;

    if (titleEl) {
      titleEl.textContent = activeQuest.title;
    }

    if (descEl) {
      descEl.innerHTML = activeQuest.desc.replace(/\n/g, '<br>');
    }

    if (targetAvatarEl) {
      targetAvatarEl.src = getAssetUrl(activeQuest.targetAvatar);
    }

    if (stepsContainer) {
      stepsContainer.innerHTML = '';
      activeQuest.steps.forEach((stepText, idx) => {
        const stepRow = document.createElement('div');
        stepRow.className = 'quest-step-item';
        const isDone = activeQuest.progressVal.isComplete;
        if (isDone) stepRow.classList.add('done');

        stepRow.innerHTML = `
          <span class="step-num">${isDone ? '✓' : (idx + 1) + '.'}</span>
          <span class="step-text">${stepText}</span>
          <span class="step-check">${isDone ? '✓' : '○'}</span>
        `;
        stepsContainer.appendChild(stepRow);
      });
    }

    if (rewardsGrid) {
      rewardsGrid.innerHTML = `
        <div class="reward-slot reward-slot-chest" title="Награда: Сундук">
          <img src="${getAssetUrl('/textures/quests/reward_chest.png')}" class="reward-pixel-icon" alt="Сундук" />
          <span class="reward-slot-badge" id="reward-val-chest">${activeQuest.rewards.chest}</span>
        </div>
        <div class="reward-slot reward-slot-pouch" title="Награда: Мешок золота">
          <img src="${getAssetUrl('/textures/quests/reward_pouch.png')}" class="reward-pixel-icon" alt="Золото" />
          <span class="reward-slot-badge" id="reward-val-coins">${activeQuest.rewards.coins}</span>
        </div>
        <div class="reward-slot reward-slot-potion" title="Награда: Зелье">
          <img src="${getAssetUrl('/textures/quests/reward_potion.png')}" class="reward-pixel-icon" alt="Зелье" />
          <span class="reward-slot-badge" id="reward-val-potions">x${activeQuest.rewards.potions}</span>
        </div>
      `;
    }

    if (statusEl && actionsEl) {
      actionsEl.innerHTML = '';
      const qProg = prog.getChapterQuestProgress(activeQuest.id);

      if (qProg.isClaimed) {
        statusEl.innerHTML = '<span class="quest-status-success">✓ Задание выполнено! Награда получена.</span>';
        actionsEl.innerHTML = `<div class="quest-btn-unlocked-badge">✓ ВЫПОЛНЕНО</div>`;
      } else if (qProg.isComplete) {
        statusEl.innerHTML = `<span class="quest-status-ready">🎉 Задание выполнено! Заберите награду: <strong>${activeQuest.rewards.coins} 🪙</strong>.</span>`;
        const claimBtn = document.createElement('button');
        claimBtn.className = 'quest-btn-claim';
        claimBtn.type = 'button';
        claimBtn.innerText = `ЗАБРАТЬ НАГРАДУ (+${activeQuest.rewards.coins} 🪙)`;
        claimBtn.addEventListener('click', () => {
          const res = prog.claimChapterQuest(activeQuest.id);
          if (res) {
            SoundManager.playLevelUp();
            this.ctx.triggerAltarNotification('Задание Выполнено!', `${activeQuest.title}: +${res.coins} 🪙`, '🎁', '#10b981');
            this.renderQuestsModal(activeQuest.id, this.activeQuestChapter);
          }
        });
        actionsEl.appendChild(claimBtn);
      } else {
        statusEl.textContent = `Прогресс задания: ${activeQuest.progressVal.label}. Завершите условия в Разломе.`;
        const lockedBadge = document.createElement('div');
        lockedBadge.className = 'quest-btn-locked-badge';
        lockedBadge.innerHTML = '<span>🔒</span> <span>В ПРОЦЕССЕ</span>';
        actionsEl.appendChild(lockedBadge);
      }
    }
  }

  public updateCharacterSelectLockStatus(): void {
    const prog = ProgressionManager.getInstance();
    const charCards = SafeDOM.queryAll<HTMLElement>(document.body, '.character-card[data-hero]');
    charCards.forEach((card) => {
      const hero = (card.getAttribute('data-hero') || 'ronin') as CharacterType;
      const isUnlocked = prog.isHeroUnlocked(hero);
      const btnLabel = card.querySelector<HTMLElement>('.char-btn-label');
      let badge = card.querySelector<HTMLElement>('.card-lock-badge');

      if (isUnlocked) {
        card.classList.remove('card-locked');
        if (badge) badge.remove();
        if (btnLabel) btnLabel.textContent = 'ВЫБРАТЬ';
      } else {
        card.classList.add('card-locked');
        const heroProgress = prog.getHeroProgress(hero);
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'card-lock-badge';
          card.appendChild(badge);
        }
        badge.innerHTML = `<span class="lock-icon">🔒</span><span>${heroProgress.label}</span>`;
        if (btnLabel) btnLabel.textContent = '🔒 ЗАБЛОКИРОВАНО';
      }
    });
  }

  public updateMainMenuQuests(): void {
    const dailyContainer = SafeDOM.getElementById('daily-quest-items-list');
    const weeklyContainer = SafeDOM.getElementById('weekly-quest-items-list');
    if (!dailyContainer && !weeklyContainer) {
      return;
    }

    const prog = ProgressionManager.getInstance();
    const dailyQuests = prog.getDailySidebarQuests();
    const weeklyQuests = prog.getWeeklySidebarQuests();

    const renderQuestRow = (q: SidebarQuestItem) => {
      const row = document.createElement('div');
      row.className = `quest-card-item-row ${q.isComplete ? 'completed' : ''} ${q.isComplete && !q.isClaimed ? 'claimable' : ''} ${q.isClaimed ? 'claimed' : ''}`;
      row.setAttribute('data-quest-id', q.id);
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute(
        'title',
        q.isClaimed
          ? `${q.title} — Награда получена ✓`
          : q.isComplete
          ? `${q.title} — Задание выполнено! Нажмите, чтобы забрать: ${q.rewardLabel}`
          : `${q.title} (${q.current}/${q.max}) — Награда: ${q.rewardLabel}`
      );

      const statusBadge = q.isClaimed
        ? '<span class="quest-card-claimed-check" title="Награда получена">✓</span>'
        : q.isComplete
        ? '<span class="quest-card-claim-badge">ЗАБРАТЬ</span>'
        : '';

      row.innerHTML = `
        <div class="quest-card-slot icon-slot">
          <img src="${getAssetUrl(q.icon)}" alt="${q.title}" draggable="false" />
        </div>
        <div class="quest-card-info">
          <div class="quest-card-name">${q.title}</div>
          <div class="quest-card-bar-wrap">
            <div class="quest-card-bar-fill ${q.isComplete ? 'completed' : ''}" style="width: ${q.progressPercent}%;"></div>
            <span class="quest-card-bar-val">${q.current}/${q.max}</span>
          </div>
        </div>
        <div class="quest-card-reward ${q.isComplete && !q.isClaimed ? 'claimable-pulse' : ''}">
          <img src="${getAssetUrl(q.rewardIcon)}" alt="${q.rewardLabel}" draggable="false" />
          <span class="quest-card-reward-val">${q.rewardAmount}</span>
          ${statusBadge}
        </div>
      `;

      row.addEventListener('click', (e) => {
        e.stopPropagation();
        if (q.isComplete && !q.isClaimed) {
          const res = prog.claimSidebarQuest(q.id);
          if (res) {
            SoundManager.playButtonClick();
            this.ctx.triggerAltarNotification('Награда получена!', `${q.title}: +${res.label}`, '🎁', '#f59e0b');
            this.updateMainMenuQuests();
          }
        } else if (q.isClaimed) {
          SoundManager.playButtonClick();
          this.ctx.triggerAltarNotification('Задание завершено', `Награда за «${q.title}» уже получена!`, '✓', '#10b981');
        } else {
          SoundManager.playButtonClick();
          if (q.category === 'daily') {
            this.showQuestsModal('ch1_deadly_debut', 1);
          } else {
            this.showQuestsModal('ch4_arrow_hail', 4);
          }
        }
      });

      return row;
    };

    if (dailyContainer) {
      dailyContainer.innerHTML = '';
      dailyQuests.forEach((q) => {
        dailyContainer.appendChild(renderQuestRow(q));
      });
    }

    if (weeklyContainer) {
      weeklyContainer.innerHTML = '';
      weeklyQuests.forEach((q) => {
        weeklyContainer.appendChild(renderQuestRow(q));
      });
    }
  }
}

// Dev console helpers
if (typeof window !== 'undefined') {
  (window as any).debugAdvanceQuest = (questId: string) => {
    ProgressionManager.getInstance().advanceChapterQuestForTest(questId);
    console.log(`[Quests Debug] Quest ${questId} completed.`);
  };
  (window as any).debugResetQuests = () => {
    ProgressionManager.getInstance().resetAllTasksToZero();
    console.log('[Quests Debug] All quests reset to zero.');
  };
}
