import { CharacterType } from '../../entities/Player';
import { ProgressionManager, SidebarQuestItem } from '../../core/ProgressionManager';
import { SoundManager } from '../../core/SoundManager';
import { getAssetUrl } from '../../utils/assetPath';

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

export interface QuestsUIContext {
  questsModal: HTMLElement;
  mainMenuModal: HTMLElement;
  pauseModal: HTMLElement;
  getMainMenuBattlePass: () => HTMLElement | null;
  isPaused: () => boolean;
  getMenuStack: () => string[];
  pushMenu: (menu: string) => void;
  removeMenu: (menu: string) => void;
  triggerAltarNotification: (name: string, subtitle: string, icon: string, color: string) => void;
  showCharacterSelect?: () => void;
}

export class QuestsUI {
  private ctx: QuestsUIContext;
  public activeQuestHero: CharacterType = 'chakram';
  public activeQuestChapter: number = 1;
  public activeQuestId: string = 'chakram';
  public isQuestsOpenInMenu: boolean = false;
  public isFromCharSelect: boolean = false;

  constructor(ctx: QuestsUIContext) {
    this.ctx = ctx;
  }

  public toggleQuestsInMainMenu() {
    if (this.isQuestsOpenInMenu && !this.ctx.questsModal.classList.contains('hidden')) {
      this.hideQuestsModal();
    } else {
      this.showQuestsModal('chakram', 1);
    }
  }

  public selectQuestChapter(chapter: number) {
    this.activeQuestChapter = chapter;
    const quests = this.getChapterQuests(chapter);
    const defaultQuest = quests[0]?.id || 'chakram';
    const targetId = (chapter === 1 && quests.some((q) => q.id === 'chakram')) ? 'chakram' : defaultQuest;
    this.activeQuestId = targetId;
    this.renderQuestsModal(targetId, chapter);
  }

  public showQuestsModal(selectedQuestId: string = 'chakram', chapter: number = 1, fromCharSelect: boolean = false) {
    this.activeQuestChapter = chapter;
    this.activeQuestId = selectedQuestId;
    if (
      selectedQuestId === 'chakram' ||
      selectedQuestId === 'valkyrie' ||
      selectedQuestId === 'flail' ||
      selectedQuestId === 'sorceress' ||
      selectedQuestId === 'archer'
    ) {
      this.activeQuestHero = selectedQuestId as CharacterType;
    }

    if (fromCharSelect) {
      this.isFromCharSelect = true;
      this.isQuestsOpenInMenu = false;
      this.ctx.questsModal.classList.remove('in-main-menu');
      const stack = this.ctx.getMenuStack();
      if (stack[stack.length - 1] !== 'quests') {
        this.ctx.pushMenu('quests');
      }
    } else if (this.ctx.isPaused() || this.ctx.getMenuStack().includes('pause')) {
      this.ctx.pauseModal.classList.add('hidden');
      const stack = this.ctx.getMenuStack();
      if (stack[stack.length - 1] !== 'quests') {
        this.ctx.pushMenu('quests');
      }
      this.ctx.questsModal.classList.remove('in-main-menu');
      this.isQuestsOpenInMenu = false;
    } else {
      this.ctx.mainMenuModal.classList.add('quests-open');
      this.ctx.questsModal.classList.add('in-main-menu');
      this.ctx.getMainMenuBattlePass()?.classList.add('hidden');
      document.getElementById('menu-btn-quests')?.classList.add('active');
      this.isQuestsOpenInMenu = true;
      const stack = this.ctx.getMenuStack();
      if (stack[stack.length - 1] !== 'quests') {
        this.ctx.pushMenu('quests');
      }
    }
    this.renderQuestsModal(selectedQuestId, chapter);
    this.ctx.questsModal.classList.remove('hidden');
  }

  public hideQuestsModal() {
    this.ctx.questsModal.classList.add('hidden');
    this.ctx.questsModal.classList.remove('in-main-menu');
    this.ctx.mainMenuModal.classList.remove('quests-open');
    this.ctx.getMainMenuBattlePass()?.classList.remove('hidden');
    document.getElementById('menu-btn-quests')?.classList.remove('active');
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

    if (chapter === 1) {
      const pVal = prog.getHeroProgress('valkyrie');
      const pSorc = prog.getHeroProgress('sorceress');
      const pChak = prog.getHeroProgress('chakram');

      return [
        {
          id: 'valkyrie',
          chapter: 1,
          heroType: 'valkyrie',
          title: `Глава 1: Пробуждение (${pVal.label})`,
          icon: '/textures/quests/quest_icon_chapter1.png',
          barColor: 'purple',
          progressVal: pVal,
          targetAvatar: '/textures/heroes/hero_valkyrie_front.png',
          desc: 'Каэла признаёт силу только опытных воинов Разлома. Повышайте боевой опыт в экспедициях и докажите своё мастерство.',
          steps: [
            'Сражайтесь в экспедициях и накапливайте боевой опыт.',
            `Достигните 5-го уровня аккаунта (текущий: ${prog.data.accountLevel}/5).`
          ],
          rewards: { potions: 2, coins: 1500, chest: 1 }
        },
        {
          id: 'flail',
          chapter: 1,
          heroType: 'flail',
          title: 'Сбор Ресурсов (5/10)',
          icon: '/textures/quests/quest_icon_resources_wood.png',
          barColor: 'cyan',
          progressVal: { current: 5, max: 10, label: '5/10', isComplete: false },
          targetAvatar: '/textures/heroes/hero_flail_front.png',
          desc: 'Бригитта собирает редкую древесину и ветви в чаще для укрепления лагеря и ковки цепей своего оружия.',
          steps: [
            'Исследуйте лесные чащи и рощи Разлома.',
            'Соберите 10 единиц древней древесины (собрано: 5/10).'
          ],
          rewards: { potions: 2, coins: 1000, chest: 1 }
        },
        {
          id: 'sorceress',
          chapter: 1,
          heroType: 'sorceress',
          title: `Глава на Лешена (${pSorc.label})`,
          icon: '/textures/quests/quest_icon_chapter_leshen.png',
          barColor: 'purple',
          progressVal: pSorc,
          targetAvatar: '/textures/heroes/hero_sorceress_front.png',
          desc: 'Звёздная магия подчиняется тем, кто способен сокрушить древних владык Разлома. Сразитесь с боссом и одержите победу.',
          steps: [
            'Активируйте телепорт или дождитесь 5-й минуты экспедиции.',
            `Победите босса Разлома (побеждено: ${prog.data.bossesKilled}/1).`
          ],
          rewards: { potions: 3, coins: 2500, chest: 1 }
        },
        {
          id: 'chakram',
          chapter: 1,
          heroType: 'chakram',
          title: `Охота на Лешего (${pChak.label})`,
          icon: '/textures/quests/quest_icon_leshy.png',
          iconBoxClass: 'icon-box-leshy',
          barColor: 'purple',
          progressVal: pChak,
          targetAvatar: '/textures/quests/quest_target_leshy.png',
          desc: 'Найти следы в чаще.\nСобрать 3 корня аконита.\nПобедить Лешего.',
          steps: [
            'Найти следы в чаще.',
            'Собрать 3 корня аконита.',
            'Победить Лешего.'
          ],
          rewards: { potions: 2, coins: 2000, chest: 1 }
        },
        {
          id: 'archer',
          chapter: 1,
          heroType: 'archer',
          title: 'Сбор Ресурсов (5/1)',
          icon: '/textures/quests/quest_icon_resources_ore.png',
          barColor: 'orange',
          progressVal: { current: 55, max: 100, label: '55/10', isComplete: false },
          targetAvatar: '/textures/heroes/hero_archer_front.png',
          desc: 'Добыть кристаллическую руду и редкие минералы в шахтах Разлома для наконечников эльфийских стрел.',
          steps: [
            'Разбивайте рудные залежи и собирайте самоцветы.',
            'Накопите минералы для улучшения лука (накоплено: 55/100).'
          ],
          rewards: { potions: 2, coins: 1200, chest: 1 }
        }
      ];
    } else if (chapter === 2) {
      const pChak = prog.getHeroProgress('chakram');
      return [
        {
          id: 'chakram',
          chapter: 2,
          heroType: 'chakram',
          title: `Охота на Лешего (${pChak.label})`,
          icon: '/textures/quests/quest_icon_leshy.png',
          iconBoxClass: 'icon-box-leshy',
          barColor: 'purple',
          progressVal: pChak,
          targetAvatar: '/textures/quests/quest_target_leshy.png',
          desc: 'Найти следы в чаще.\nСобрать 3 корня аконита.\nПобедить Лешего.',
          steps: [
            'Найти следы в чаще.',
            'Собрать 3 корня аконита.',
            'Победить Лешего.'
          ],
          rewards: { potions: 2, coins: 2000, chest: 1 }
        },
        {
          id: 'leshen_tracks',
          chapter: 2,
          title: 'Следы в темной чаще (1/3)',
          icon: '/textures/quests/quest_icon_chapter_leshen.png',
          barColor: 'purple',
          progressVal: {
            current: prog.data.questLeshySteps[0] ? 3 : 1,
            max: 3,
            label: prog.data.questLeshySteps[0] ? '3/3' : '1/3',
            isComplete: prog.data.questLeshySteps[0]
          },
          targetAvatar: '/textures/quests/quest_target_leshy.png',
          desc: 'Пройти по заросшим звериным тропам леса и обнаружить древние капища духов природы.',
          steps: [
            'Обнаружить отпечатки лап у лесного ручья.',
            'Найти следы когтей на стволах вековых сосен.',
            'Зафиксировать ауру Лешего.'
          ],
          rewards: { potions: 1, coins: 1200, chest: 1 }
        },
        {
          id: 'aconite_herbs',
          chapter: 2,
          title: 'Сбор корня аконита (3/3)',
          icon: '/textures/quests/quest_icon_resources_wood.png',
          barColor: 'cyan',
          progressVal: {
            current: prog.data.questLeshySteps[1] ? 3 : 2,
            max: 3,
            label: prog.data.questLeshySteps[1] ? '3/3' : '2/3',
            isComplete: prog.data.questLeshySteps[1]
          },
          targetAvatar: '/textures/quests/quest_target_leshy.png',
          desc: 'Собрать три редких корня аконита для приготовления оберега от древесного проклятия.',
          steps: [
            'Найти корень у мшистого валуна.',
            'Собрать корень на топком болоте.',
            'Добыть корень у подножия древнего дуба.'
          ],
          rewards: { potions: 3, coins: 1600, chest: 1 }
        },
        {
          id: 'purge_woods',
          chapter: 2,
          title: 'Очищение рощи (0/1)',
          icon: '/textures/quests/quest_icon_chapter1.png',
          barColor: 'purple',
          progressVal: {
            current: prog.data.questLeshySteps[2] ? 1 : 0,
            max: 1,
            label: prog.data.questLeshySteps[2] ? '1/1' : '0/1',
            isComplete: prog.data.questLeshySteps[2]
          },
          targetAvatar: '/textures/quests/quest_target_leshy.png',
          desc: 'Очистить священную рощу от проклятия и изгнать порождения тьмы из древнего леса.',
          steps: [
            'Зажечь очистительный алтарь в чаще.',
            'Отразить нападение лесных призраков.',
            'Освятить рощу и победить Лешего.'
          ],
          rewards: { potions: 2, coins: 1800, chest: 1 }
        }
      ];
    } else if (chapter === 3) {
      const pSorc = prog.getHeroProgress('sorceress');
      const pFlail = prog.getHeroProgress('flail');
      const pVal = prog.getHeroProgress('valkyrie');

      return [
        {
          id: 'sorceress',
          chapter: 3,
          heroType: 'sorceress',
          title: `Охота на Стража (${pSorc.label})`,
          icon: '/textures/quests/quest_icon_chapter_leshen.png',
          barColor: 'purple',
          progressVal: pSorc,
          targetAvatar: '/textures/heroes/hero_sorceress_front.png',
          desc: 'Звёздная магия подчиняется тем, кто способен сокрушить древних владык Разлома. Сразитесь с боссом и одержите победу.',
          steps: [
            'Активируйте телепорт или дождитесь 5-й минуты экспедиции.',
            `Победите босса Разлома (побеждено: ${prog.data.bossesKilled}/1).`
          ],
          rewards: { potions: 3, coins: 2500, chest: 1 }
        },
        {
          id: 'flail',
          chapter: 3,
          heroType: 'flail',
          title: `Золотая лихорадка (${pFlail.label})`,
          icon: '/textures/quests/quest_icon_resources_ore.png',
          barColor: 'orange',
          progressVal: pFlail,
          targetAvatar: '/textures/heroes/hero_flail_front.png',
          desc: 'Бригитта собирает редкие металлы и монеты для закалки цепей своего оружия. Соберите 100 монет в битвах.',
          steps: [
            'Уничтожайте монстров и собирайте кредиты Разлома.',
            `Соберите 100 монет в экспедициях (собрано: ${Math.min(100, prog.data.totalCoinsEarned)}/100).`
          ],
          rewards: { potions: 2, coins: 1000, chest: 1 }
        },
        {
          id: 'valkyrie',
          chapter: 3,
          heroType: 'valkyrie',
          title: `Испытание ветерана (${pVal.label})`,
          icon: '/textures/quests/quest_icon_chapter1.png',
          barColor: 'purple',
          progressVal: pVal,
          targetAvatar: '/textures/heroes/hero_valkyrie_front.png',
          desc: 'Каэла признаёт силу только опытных воинов Разлома. Повышайте боевой опыт в экспедициях и докажите своё мастерство.',
          steps: [
            'Сражайтесь в экспедициях и накапливайте боевой опыт.',
            `Достигните 5-го уровня аккаунта (текущий: ${prog.data.accountLevel}/5).`
          ],
          rewards: { potions: 2, coins: 1500, chest: 1 }
        }
      ];
    } else {
      const pArch = prog.getHeroProgress('archer');
      const kills = Math.min(100, prog.data.enemiesKilled);
      const coins = Math.min(500, prog.data.walletCoins);

      return [
        {
          id: 'archer',
          chapter: 4,
          heroType: 'archer',
          title: `Контракт Следопыта (${pArch.label})`,
          icon: '/textures/quests/quest_icon_resources_ore.png',
          barColor: 'orange',
          progressVal: pArch,
          targetAvatar: '/textures/heroes/hero_archer_front.png',
          desc: 'Эльфийский мастер стрельбы готов присоединиться к отряду по контракту за 100 монет либо за охотничье достижение.',
          steps: [
            `Накопите 100 монет в кошельке ИЛИ уничтожьте 100 чудовищ (убито: ${kills}/100).`,
            'Приобретите контракт за 100 монет либо подтвердите охотничье достижение.'
          ],
          rewards: { potions: 2, coins: 1200, chest: 1 }
        },
        {
          id: 'monster_slayer',
          chapter: 4,
          title: `Истребитель чудовищ (${kills}/100)`,
          icon: '/textures/quests/quest_icon_leshy.png',
          barColor: 'purple',
          progressVal: { current: kills, max: 100, label: `${kills}/100`, isComplete: kills >= 100 },
          targetAvatar: '/textures/quests/quest_target_leshy.png',
          desc: 'Защитите рубежи лагеря и уничтожьте 100 опасных чудовищ в экспедициях Разлома.',
          steps: [
            `Уничтожить 50 порождений тьмы (убито: ${Math.min(50, kills)}/50).`,
            `Уничтожить еще 50 чудовищ Разлома (убито: ${Math.max(0, kills - 50)}/50).`
          ],
          rewards: { potions: 3, coins: 2200, chest: 1 }
        },
        {
          id: 'treasury',
          chapter: 4,
          title: `Казна следопытов (${coins}/500)`,
          icon: '/textures/quests/quest_icon_resources_wood.png',
          barColor: 'cyan',
          progressVal: { current: coins, max: 500, label: `${coins}/500`, isComplete: coins >= 500 },
          targetAvatar: '/textures/heroes/hero_flail_front.png',
          desc: 'Накопить состояние в 500 золотых монет в общем кошельке аккаунта.',
          steps: [
            'Побеждать элитных врагов и собирать золотые мешки.',
            `Накопить 500 монет в кошельке (баланс: ${prog.data.walletCoins}/500).`
          ],
          rewards: { potions: 4, coins: 1000, chest: 2 }
        }
      ];
    }
  }

  public renderQuestsModal(
    selectedQuestId: string = this.activeQuestId,
    chapter: number = this.activeQuestChapter
  ) {
    this.activeQuestChapter = chapter;
    this.activeQuestId = selectedQuestId;
    const prog = ProgressionManager.getInstance();

    const lvlEl = document.getElementById('quest-acc-lvl-text');
    if (lvlEl) lvlEl.innerText = `УРОВЕНЬ АККАУНТА: ${prog.data.accountLevel}`;
    const xpEl = document.getElementById('quest-acc-xp-text');
    if (xpEl) xpEl.innerText = `(${prog.data.accountXp} / ${prog.data.accountXpToNext} XP)`;
    const coinsEl = document.getElementById('quest-acc-coins-text');
    if (coinsEl) coinsEl.innerText = `🪙 ${prog.data.walletCoins}`;

    const chapterTabs = document.querySelectorAll<HTMLElement>('.quest-chapter-tab[data-chapter]');
    chapterTabs.forEach((tab) => {
      const ch = parseInt(tab.getAttribute('data-chapter') || '1', 10);
      if (ch === this.activeQuestChapter) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    const quests = this.getChapterQuests(this.activeQuestChapter);
    if (!quests.some((q) => q.id === this.activeQuestId)) {
      this.activeQuestId = quests[0]?.id || 'chakram';
    }

    const listContainer = document.getElementById('quest-items-list');
    if (listContainer) {
      listContainer.innerHTML = '';
      quests.forEach((q) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'quest-hero-item' + (q.id === this.activeQuestId ? ' active' : '');
        itemEl.setAttribute('data-quest-id', q.id);
        if (q.heroType) {
          itemEl.setAttribute('data-quest-hero', q.heroType);
        }

        const pct = Math.max(0, Math.min(100, Math.round((q.progressVal.current / (q.progressVal.max || 1)) * 100)));
        let barClass = '';
        if (q.barColor === 'cyan') barClass = ' bar-cyan';
        else if (q.barColor === 'orange') barClass = ' bar-orange';
        if (q.progressVal.isComplete) barClass += ' complete';

        const iconBoxClass = q.iconBoxClass ? `quest-item-icon-box ${q.iconBoxClass}` : 'quest-item-icon-box';

        itemEl.innerHTML = `
          <div class="${iconBoxClass}">
            <img src="${getAssetUrl(q.icon)}" class="quest-item-avatar" alt="${q.title}" />
          </div>
          <div class="quest-item-info">
            <div class="quest-item-title">${q.title}</div>
            <div class="quest-item-bar-wrap">
              <div class="quest-item-bar-fill${barClass}" style="width: ${pct}%;"></div>
              <span class="quest-item-bar-val">${q.progressVal.label}</span>
            </div>
          </div>
        `;

        itemEl.addEventListener('click', () => {
          SoundManager.playButtonClick();
          this.activeQuestId = q.id;
          if (q.heroType) {
            this.activeQuestHero = q.heroType;
          }
          this.renderQuestsModal(q.id, this.activeQuestChapter);
        });

        listContainer.appendChild(itemEl);
      });
    }

    const activeQuest = quests.find((q) => q.id === this.activeQuestId) || quests[0];
    if (!activeQuest) return;

    if (activeQuest.heroType) {
      this.activeQuestHero = activeQuest.heroType;
    }

    const titleEl = document.getElementById('quest-right-title');
    if (titleEl) {
      titleEl.innerText = activeQuest.title.replace(/\s*\(\d+\/\d+\)$/, '').replace(/\s*\(.*\)$/, '');
    }

    const descEl = document.getElementById('quest-right-desc');
    if (descEl) {
      descEl.innerHTML = activeQuest.desc.replace(/\n/g, '<br>');
    }

    const targetAvatarEl = document.getElementById('quest-target-avatar') as HTMLImageElement | null;
    if (targetAvatarEl) {
      targetAvatarEl.src = getAssetUrl(activeQuest.targetAvatar);
    }

    const stepsContainer = document.getElementById('quest-right-steps');
    if (stepsContainer) {
      stepsContainer.innerHTML = '';
      activeQuest.steps.forEach((stepText, idx) => {
        const stepRow = document.createElement('div');
        stepRow.className = 'quest-step-item';

        let isDone = false;
        if (activeQuest.id === 'chakram') {
          isDone = Boolean(prog.data.questLeshySteps[idx]);
        } else if (activeQuest.heroType && prog.isHeroUnlocked(activeQuest.heroType)) {
          isDone = true;
        } else {
          isDone = activeQuest.progressVal.isComplete;
        }

        if (isDone) stepRow.classList.add('done');

        stepRow.innerHTML = `
          <span class="step-num">${idx + 1}.</span>
          <span class="step-text">${stepText}</span>
          <span class="step-check">${isDone ? '✓' : '○'}</span>
        `;
        stepsContainer.appendChild(stepRow);
      });
    }

    const potEl = document.getElementById('reward-val-potions');
    if (potEl) potEl.innerText = `x${activeQuest.rewards.potions}`;
    const coinEl = document.getElementById('reward-val-coins');
    if (coinEl) coinEl.innerText = String(activeQuest.rewards.coins);
    const chestEl = document.getElementById('reward-val-chest');
    if (chestEl) chestEl.innerText = String(activeQuest.rewards.chest);

    const statusEl = document.getElementById('quest-action-status-text');
    const actionsEl = document.getElementById('quest-action-buttons');
    if (statusEl && actionsEl) {
      actionsEl.innerHTML = '';

      if (activeQuest.heroType) {
        const hero = activeQuest.heroType;
        const isUnlocked = prog.isHeroUnlocked(hero);
        const hDef = prog.getHeroQuestDefinition(hero);

        if (isUnlocked) {
          statusEl.innerText = `Герой ${hDef.heroName} ${hDef.heroSubtitle} успешно разблокирован(а) и доступен(на) в игре!`;
          actionsEl.innerHTML = `<div class="quest-btn-unlocked-badge">✓ РАЗБЛОКИРОВАНО</div>`;
        } else {
          if (hero === 'archer') {
            const canAfford = prog.data.walletCoins >= 100;
            const canAchieve = prog.canUnlockElfByAchievement();

            statusEl.innerText = `Условия: 100 🪙 в кошельке (баланс: ${prog.data.walletCoins} 🪙) ИЛИ 100 убийств монстров (убито: ${prog.data.enemiesKilled}/100)`;

            const buyBtn = document.createElement('button');
            buyBtn.className = 'quest-btn-buy';
            buyBtn.type = 'button';
            buyBtn.innerText = `КУПИТЬ ЗА 100 🪙`;
            buyBtn.disabled = !canAfford;
            buyBtn.title = canAfford ? 'Купить охотника за накопленные монеты' : 'Недостаточно монет в кошельке';
            buyBtn.addEventListener('click', () => {
              if (prog.buyElf()) {
                SoundManager.playLevelUp();
                this.ctx.triggerAltarNotification('Герой Разблокирован!', 'Эльф лучник доступен для игры!', '🏹', '#10b981');
                this.renderQuestsModal('archer', this.activeQuestChapter);
              }
            });
            actionsEl.appendChild(buyBtn);

            if (canAchieve) {
              const achieveBtn = document.createElement('button');
              achieveBtn.className = 'quest-btn-claim';
              achieveBtn.type = 'button';
              achieveBtn.innerText = 'ОТКРЫТЬ ПО ДОСТИЖЕНИЮ';
              achieveBtn.addEventListener('click', () => {
                if (prog.unlockElfByAchievement()) {
                  SoundManager.playLevelUp();
                  this.ctx.triggerAltarNotification('Достижение Выполнено!', 'Эльф лучник разблокирован!', '🏹', '#10b981');
                  this.renderQuestsModal('archer', this.activeQuestChapter);
                }
              });
              actionsEl.appendChild(achieveBtn);
            }
          } else if (hero === 'chakram') {
            const stepsDone = prog.data.questLeshySteps.filter(Boolean).length;
            if (prog.data.questLeshyCompleted || stepsDone === 3) {
              statusEl.innerText = 'Задание «Охота на Лешего» выполнено! Заберите награду.';
              const claimBtn = document.createElement('button');
              claimBtn.className = 'quest-btn-claim';
              claimBtn.type = 'button';
              claimBtn.innerText = 'ЗАБРАТЬ НАГРАДУ / РАЗБЛОКИРОВАТЬ';
              claimBtn.addEventListener('click', () => {
                prog.unlockHero('chakram');
                SoundManager.playLevelUp();
                this.ctx.triggerAltarNotification('Квест Завершён!', 'Кира «Танцующий Чакрам» разблокирована!', '🪃', '#10b981');
                this.renderQuestsModal('chakram', this.activeQuestChapter);
              });
              actionsEl.appendChild(claimBtn);
            } else {
              statusEl.innerText = `Выполнено шагов: ${stepsDone} / 3. Завершите этапы в игре или подтвердите выполнение ниже.`;
              const nextStepIdx = prog.data.questLeshySteps.findIndex((s) => !s);
              if (nextStepIdx >= 0 && nextStepIdx <= 2) {
                const validStepIdx = nextStepIdx as 0 | 1 | 2;
                const stepBtn = document.createElement('button');
                stepBtn.className = 'quest-btn-step';
                stepBtn.type = 'button';
                stepBtn.innerText = `ВЫПОЛНИТЬ ШАГ ${validStepIdx + 1}`;
                stepBtn.addEventListener('click', () => {
                  prog.progressLeshyStep(validStepIdx);
                  SoundManager.playChestOpen();
                  this.renderQuestsModal('chakram', this.activeQuestChapter);
                });
                actionsEl.appendChild(stepBtn);
              }
            }
          } else {
            const p = prog.getHeroProgress(hero);
            if (p.isComplete) {
              statusEl.innerText = 'Условие выполнено! Заберите награду и разблокируйте героя.';
              const claimBtn = document.createElement('button');
              claimBtn.className = 'quest-btn-claim';
              claimBtn.type = 'button';
              claimBtn.innerText = 'ЗАБРАТЬ НАГРАДУ / РАЗБЛОКИРОВАТЬ';
              claimBtn.addEventListener('click', () => {
                prog.unlockHero(hero);
                SoundManager.playLevelUp();
                this.ctx.triggerAltarNotification('Герой Разблокирован!', `${hDef.heroName} доступен(на) для игры!`, '⭐', '#10b981');
                this.renderQuestsModal(hero, this.activeQuestChapter);
              });
              actionsEl.appendChild(claimBtn);
            } else {
              statusEl.innerText = hDef.unlockConditionHint + ` (Текущий прогресс: ${p.label}).`;
            }
          }
        }
      } else {
        if (activeQuest.progressVal.isComplete) {
          statusEl.innerText = 'Задание главы выполнено! Награда получена.';
          actionsEl.innerHTML = `<div class="quest-btn-unlocked-badge">✓ ВЫПОЛНЕНО</div>`;
        } else {
          statusEl.innerText = `Прогресс задания: ${activeQuest.progressVal.label}. Завершите условия в Разломе.`;
          const testStepBtn = document.createElement('button');
          testStepBtn.className = 'quest-btn-claim';
          testStepBtn.type = 'button';
          testStepBtn.innerText = 'ПОДТВЕРДИТЬ ЭТАП';
          testStepBtn.addEventListener('click', () => {
            SoundManager.playLevelUp();
            prog.addCoins(activeQuest.rewards.coins);
            this.ctx.triggerAltarNotification('Задание Главы!', `${activeQuest.title} выполнено!`, '📜', '#a855f7');
            activeQuest.progressVal.isComplete = true;
            this.renderQuestsModal(activeQuest.id, this.activeQuestChapter);
          });
          actionsEl.appendChild(testStepBtn);
        }
      }
    }
  }

  public updateCharacterSelectLockStatus() {
    const prog = ProgressionManager.getInstance();
    const charCards = document.querySelectorAll<HTMLElement>('.character-card[data-hero]');
    charCards.forEach((card) => {
      const hero = (card.getAttribute('data-hero') || 'ronin') as CharacterType;
      const isUnlocked = prog.isHeroUnlocked(hero);
      const btnLabel = card.querySelector<HTMLElement>('.char-btn-label');
      let badge = card.querySelector<HTMLElement>('.card-lock-badge');

      if (isUnlocked) {
        card.classList.remove('card-locked');
        if (badge) badge.remove();
        if (btnLabel) btnLabel.innerText = 'ВЫБРАТЬ';
      } else {
        card.classList.add('card-locked');
        const heroProgress = prog.getHeroProgress(hero);
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'card-lock-badge';
          card.appendChild(badge);
        }
        badge.innerHTML = `<span class="lock-icon">🔒</span><span>${heroProgress.label}</span>`;
        if (btnLabel) btnLabel.innerText = '🔒 ЗАБЛОКИРОВАНО';
      }
    });
  }

  public updateMainMenuQuests() {
    const prog = ProgressionManager.getInstance();
    const dailyQuests = prog.getDailySidebarQuests();
    const weeklyQuests = prog.getWeeklySidebarQuests();

    const dailyContainer = document.getElementById('daily-quest-items-list');
    const weeklyContainer = document.getElementById('weekly-quest-items-list');

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
            this.showQuestsModal('chakram', 1);
          } else {
            this.showQuestsModal('archer', 4);
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
