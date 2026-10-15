import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { CharacterType } from '../../../entities/Player';
import { LobbyPlayerInfo } from '../../../net/NetworkManager';
import { PublicRoomInfo } from '../../../net/RoomDirectory';
import { ProgressionManager } from '../../../core/ProgressionManager';
import { AssetResolver } from '../../../utils/AssetResolver';

export interface LobbyScreenElements {
  hostLobbyModal?: HTMLElement | null;
  hostRoomCodeText?: HTMLElement | null;
  hostPasswordInput?: HTMLInputElement | null;
  hostPasswordBadge?: HTMLElement | null;
  hostPlayersRoster?: HTMLElement | null;
  hostPlayerCount?: HTMLElement | null;
  hostPartnerBox?: HTMLElement | null;
  hostPartnerTitle?: HTMLElement | null;
  hostPartnerDesc?: HTMLElement | null;
  btnHostStart?: HTMLButtonElement | null;

  joinLobbyModal?: HTMLElement | null;
  joinRoomInput?: HTMLInputElement | null;
  joinPasswordInput?: HTMLInputElement | null;
  joinStatusText?: HTMLElement | null;
  btnJoinConnect?: HTMLButtonElement | null;
  btnGuestReady?: HTMLElement | null;
  tabBtnBrowser?: HTMLElement | null;
  tabBtnDirect?: HTMLElement | null;
  tabContentBrowser?: HTMLElement | null;
  tabContentDirect?: HTMLElement | null;
  availableRoomsList?: HTMLElement | null;
  joinRosterSection?: HTMLElement | null;
  joinPlayersRoster?: HTMLElement | null;
  joinPlayerCount?: HTMLElement | null;

  passwordPromptModal?: HTMLElement | null;
  pwdPromptRoomTitle?: HTMLElement | null;
  pwdPromptInput?: HTMLInputElement | null;
  pwdPromptError?: HTMLElement | null;

  settingsModal?: HTMLElement | null;
  pauseModal?: HTMLElement | null;
  coopBadge?: HTMLElement | null;
  coopRoomName?: HTMLElement | null;
}

export interface LobbyScreenOptions {
  elements?: LobbyScreenElements;
  container?: HTMLElement | null;
  hideCoopMenu: () => void;
  hideMainMenu: () => void;
  getMenuStack: () => string[];
  setMenuStack: (stack: string[]) => void;
  pushMenu: (menu: string) => void;
  removeMenu: (menu: string) => void;
}

export class LobbyScreen extends Screen {
  protected ctx: LobbyScreenOptions;

  public hostSelectedHero: CharacterType = 'ronin';
  public guestSelectedHero: CharacterType = 'valkyrie';
  public isGuestConnected: boolean = false;
  public isGuestReady: boolean = false;
  public pendingPasswordRoomCode: string | null = null;

  public onRefreshRoomsClicked?: () => void;
  public onGuestConnectClicked?: (roomCode: string, hero: CharacterType, password?: string) => void;
  public onGuestReadyToggle?: (isReady: boolean) => void;
  public onHostHeroChanged?: (hero: CharacterType) => void;
  public onGuestHeroChanged?: (hero: CharacterType) => void;
  public onHostStartExpedition?: (seedInput?: string) => void;
  public onHostPasswordChanged?: (pwd: string) => void;

  constructor(options: LobbyScreenOptions) {
    const existingModal = options.container || options.elements?.hostLobbyModal || SafeDOM.getElementById('host-lobby-modal');
    super('lobby', existingModal);
    this.ctx = options;

    this.bindElements();
    this.bindEvents();
  }

  protected getTemplate(): string {
    return '';
  }

  protected bindElements(): void {}

  protected bindEvents(): void {}

  public get el(): LobbyScreenElements {
    return this.ctx.elements || {};
  }

  public showHostLobby(roomCode: string, hero: CharacterType): void {
    this.ctx.hideCoopMenu();
    this.ctx.setMenuStack(['coop', 'host_lobby']);
    if (this.el.hostRoomCodeText) {
      this.el.hostRoomCodeText.textContent = roomCode;
    }
    if (!ProgressionManager.getInstance().isHeroUnlocked(hero)) {
      hero = 'ronin';
    }
    this.hostSelectedHero = hero;
    this.updateLobbyHeroesLockStatus();
    const hostHeroOpts = SafeDOM.queryAll<HTMLElement>(document.body, '.lobby-hero-opt[data-host-hero]');
    hostHeroOpts.forEach((opt) => {
      if (opt.getAttribute('data-host-hero') === hero) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });

    const initialHostInfo: LobbyPlayerInfo = {
      id: 'p1',
      name: 'Игрок 1',
      hero: hero,
      charType: hero,
      heroName: this.getHeroName(hero),
      isHost: true,
      isReady: true,
      colorHex: 0xf59e0b,
      colorCss: '#f59e0b'
    };
    if (this.el.hostPasswordInput) {
      this.el.hostPasswordInput.value = '';
    }
    if (this.el.hostPasswordBadge) {
      this.el.hostPasswordBadge.textContent = '🔓 БЕЗ ПАРОЛЯ';
      this.el.hostPasswordBadge.className = 'password-badge open';
    }
    this.renderHostRoster([initialHostInfo]);
    if (this.el.hostLobbyModal) {
      this.el.hostLobbyModal.classList.remove('hidden');
    }
  }

  public hideHostLobby(): void {
    if (this.el.hostLobbyModal) {
      this.el.hostLobbyModal.classList.add('hidden');
    }
    this.ctx.removeMenu('host_lobby');
  }

  public setHostPartnerConnected(connected: boolean, hero?: CharacterType): void {
    if (!this.el.hostPartnerBox || !this.el.hostPartnerTitle || !this.el.hostPartnerDesc || !this.el.btnHostStart) return;

    if (connected) {
      this.el.hostPartnerBox.className = 'partner-status-box connected';
      const heroName =
        hero === 'invoker'
          ? 'Инвокер (Маг стихий)'
          : hero === 'valkyrie'
          ? 'Каэла (Мечница)'
          : hero === 'flail'
          ? 'Бригитта (Цеп)'
          : hero === 'sorceress'
          ? 'Ария (Волшебница)'
          : hero === 'chakram'
          ? 'Кира (Чакрам)'
          : 'Рен (Ронин)';
      this.el.hostPartnerTitle.textContent = `Игрок подключился! (${heroName})`;
      this.el.hostPartnerDesc.textContent = 'Игрок готов к экспедиции! Вы можете начать поход или дождаться остальных.';
      this.el.btnHostStart.disabled = false;
    } else {
      this.el.hostPartnerBox.className = 'partner-status-box waiting';
      this.el.hostPartnerTitle.textContent = 'Ожидание игроков...';
      this.el.hostPartnerDesc.textContent = 'Отправьте код комнаты друзьям. Можно начать поход в любой момент!';
      this.el.btnHostStart.disabled = false;
    }
  }

  public renderHostRoster(lobbyPlayers: LobbyPlayerInfo[]): void {
    if (!this.el.hostPlayersRoster) return;
    const list = lobbyPlayers && lobbyPlayers.length > 0 ? lobbyPlayers : [
      {
        id: 'p1',
        name: 'Игрок 1',
        hero: this.hostSelectedHero,
        charType: this.hostSelectedHero,
        isHost: true,
        isReady: true,
        colorHex: 0xf59e0b,
        colorCss: '#f59e0b'
      }
    ];
    this.renderRosterGrid(this.el.hostPlayersRoster, list, 'p1');
    if (this.el.hostPlayerCount) {
      this.el.hostPlayerCount.textContent = `${list.length}`;
    }
    const countBadge = SafeDOM.getElementById('host-player-count-badge');
    if (countBadge) {
      countBadge.textContent = `${list.length} / 5 ИГРОКОВ`;
    }

    const guests = list.filter(p => !p.isHost && p.id !== 'p1');
    const allGuestsReady = guests.length === 0 || guests.every(p => p.isReady);

    if (this.el.hostPartnerBox && this.el.hostPartnerTitle && this.el.hostPartnerDesc && this.el.btnHostStart) {
      if (list.length > 1) {
        if (allGuestsReady) {
          this.el.hostPartnerBox.className = 'partner-status-box connected';
          this.el.hostPartnerTitle.textContent = `Отряд готов (${list.length}/5)! Все подтвердили готовность.`;
          this.el.hostPartnerDesc.textContent = 'Все игроки готовы! Вы можете выдвигаться в экспедицию.';
          this.el.btnHostStart.disabled = false;
          this.el.btnHostStart.textContent = 'НАЧАТЬ ЭКСПЕДИЦИЮ';
        } else {
          const notReadyCount = guests.filter(p => !p.isReady).length;
          this.el.hostPartnerBox.className = 'partner-status-box waiting';
          this.el.hostPartnerTitle.textContent = `Ожидание подтверждения (${notReadyCount} не готовы)`;
          this.el.hostPartnerDesc.textContent = 'Игроки подключились, но ещё не нажали «ГОТОВ». Дождитесь подтверждения от всех игроков.';
          this.el.btnHostStart.disabled = true;
          this.el.btnHostStart.textContent = 'ОЖИДАНИЕ ГОТОВНОСТИ ИГРОКОВ...';
        }
      } else {
        this.el.hostPartnerBox.className = 'partner-status-box waiting';
        this.el.hostPartnerTitle.textContent = 'Ожидание игроков в отряд...';
        this.el.hostPartnerDesc.textContent = 'Отправьте код комнаты друзьям. Можно начать поход в любой момент!';
        this.el.btnHostStart.disabled = false;
        this.el.btnHostStart.textContent = 'НАЧАТЬ ЭКСПЕДИЦИЮ';
      }
    }
  }

  public renderJoinRoster(lobbyPlayers: LobbyPlayerInfo[], mySlotId: string = 'p2'): void {
    if (this.el.joinRosterSection) {
      this.el.joinRosterSection.classList.remove('hidden');
    }
    if (this.el.joinPlayersRoster) {
      this.renderRosterGrid(this.el.joinPlayersRoster, lobbyPlayers, mySlotId);
    }
    if (this.el.joinPlayerCount) {
      this.el.joinPlayerCount.textContent = `${lobbyPlayers.length}`;
    }
    const countBadge = SafeDOM.getElementById('join-player-count-badge');
    if (countBadge) {
      countBadge.textContent = `${lobbyPlayers.length} / 5 ИГРОКОВ`;
    }
    if (!this.isGuestConnected) {
      this.setGuestConnectedMode(true);
    }
    if (this.isGuestReady) {
      this.setJoinStatus('Вы готовы к походу! Ожидание старта хостом...', false);
    } else {
      const code = this.el.joinRoomInput?.value?.toUpperCase().trim() || '';
      this.setJoinStatus(code ? `Подключено к ${code}! Нажмите «ГОТОВ» для подтверждения.` : 'Подключено к экспедиции! Нажмите «ГОТОВ» для подтверждения.', false);
    }
  }

  public renderRosterGrid(container: HTMLElement, lobbyPlayers: LobbyPlayerInfo[], mySlotId: string = 'p1'): void {
    if (!container) return;
    container.innerHTML = '';

    const slotKeys = ['p1', 'p2', 'p3', 'p4', 'p5'];

    for (let i = 0; i < 5; i++) {
      const slotKey = slotKeys[i];
      const slotNum = i + 1;
      const player = lobbyPlayers.find(p => p.id === slotKey) || (i < lobbyPlayers.length ? lobbyPlayers[i] : null);

      const card = document.createElement('div');
      if (player) {
        const hero = player.hero || player.charType || 'ronin';
        const heroName = this.getHeroName(hero);
        const isHost = player.isHost || player.id === 'p1';
        const isLocal = player.id === mySlotId;
        const displayName = `Игрок ${slotNum}${isLocal ? ' (Вы)' : ''}`;
        const slotTag = isLocal
          ? `ИГРОК ${slotNum} (ВЫ)`
          : isHost
          ? `ИГРОК ${slotNum} (ХОСТ)`
          : `ИГРОК ${slotNum}`;

        const statusHtml = isHost
          ? '<div class="slot-status ready">ХОСТ</div>'
          : player.isReady
          ? '<div class="slot-status ready">ГОТОВ</div>'
          : '<div class="slot-status not-ready">НЕ ГОТОВ</div>';

        card.className = 'roster-slot-card occupied';
        card.style.borderColor = player.colorCss || '#f59e0b';
        card.innerHTML = `
          <div class="slot-tag slot-${player.id}">${slotTag}</div>
          <img src="${this.getHeroAvatar(hero)}" class="slot-avatar" alt="${heroName}" />
          <div class="slot-player-name" style="color: ${player.colorCss};">${displayName}</div>
          <div class="slot-hero-name">${heroName}</div>
          ${statusHtml}
        `;
      } else {
        card.className = 'roster-slot-card empty';
        card.innerHTML = `
          <div class="slot-tag">ИГРОК ${slotNum}</div>
          <div class="slot-empty-icon">+</div>
          <div class="slot-player-name" style="opacity: 0.6;">Свободно</div>
          <div class="slot-hero-name" style="opacity: 0.5;">Слот ${slotNum}</div>
          <div class="slot-status waiting">Ожидание...</div>
        `;
      }
      container.appendChild(card);
    }
  }

  public getHeroIcon(charType: CharacterType): string {
    return charType.toUpperCase();
  }

  public getHeroName(charType: CharacterType): string {
    if (charType === 'invoker') return 'Инвокер «Маг стихий»';
    if (charType === 'necromancer') return 'Мортис «Некромант»';
    if (charType === 'amazon') return 'Амазонка «Воительница»';
    return charType === 'ronin'
      ? 'Рен «Ронин»'
      : charType === 'valkyrie'
      ? 'Каэла «Меч»'
      : charType === 'flail'
      ? 'Бригитта «Цеп»'
      : charType === 'sorceress'
      ? 'Ария «Посох»'
      : charType === 'chakram'
      ? 'Кира «Чакрам»'
      : charType === 'archer'
      ? 'Эльф-лучник «Лук»'
      : 'Ракета «Енот»';
  }

  public getHeroAvatar(charType: CharacterType): string {
    return AssetResolver.getHeroTexture(charType, 'front');
  }

  public updateGuestReadyButtonUI(): void {
    if (!this.el.btnGuestReady) return;
    if (this.isGuestReady) {
      this.el.btnGuestReady.classList.remove('is-not-ready');
      this.el.btnGuestReady.classList.add('is-ready');
      this.el.btnGuestReady.textContent = 'ВЫ ГОТОВЫ (НАЖМИТЕ ДЛЯ ОТМЕНЫ)';
    } else {
      this.el.btnGuestReady.classList.remove('is-ready');
      this.el.btnGuestReady.classList.add('is-not-ready');
      this.el.btnGuestReady.textContent = 'НАЖМИТЕ «ГОТОВ»';
    }
  }

  public setGuestConnectedMode(connected: boolean): void {
    this.isGuestConnected = connected;
    if (this.el.btnGuestReady) {
      if (connected) {
        this.el.btnGuestReady.classList.remove('hidden');
        this.updateGuestReadyButtonUI();
      } else {
        this.el.btnGuestReady.classList.add('hidden');
        this.isGuestReady = false;
      }
    }
    if (this.el.btnJoinConnect) {
      if (connected) {
        this.el.btnJoinConnect.classList.add('hidden');
      } else {
        const isDirect = this.el.tabBtnDirect?.classList.contains('active');
        if (isDirect) {
          this.el.btnJoinConnect.classList.remove('hidden');
        } else {
          this.el.btnJoinConnect.classList.add('hidden');
        }
        this.el.btnJoinConnect.disabled = false;
        this.el.btnJoinConnect.textContent = 'ПОДКЛЮЧИТЬСЯ';
      }
    }
    if (this.el.joinRoomInput) {
      this.el.joinRoomInput.disabled = connected;
    }
    if (this.el.joinPasswordInput) {
      this.el.joinPasswordInput.disabled = connected;
    }

    if (connected) {
      this.hidePasswordPrompt();
      this.el.tabBtnBrowser?.parentElement?.classList.add('hidden');
      this.el.tabContentBrowser?.classList.add('hidden');
      this.el.tabContentDirect?.classList.add('hidden');
    } else {
      this.el.tabBtnBrowser?.parentElement?.classList.remove('hidden');
      const isBrowser = this.el.tabBtnBrowser?.classList.contains('active');
      if (isBrowser) {
        this.el.tabContentBrowser?.classList.remove('hidden');
        this.el.tabContentDirect?.classList.add('hidden');
      } else {
        this.el.tabContentBrowser?.classList.add('hidden');
        this.el.tabContentDirect?.classList.remove('hidden');
      }
    }
  }

  public switchJoinTab(tab: 'browser' | 'direct'): void {
    if (tab === 'browser') {
      this.el.tabBtnBrowser?.classList.add('active');
      this.el.tabBtnDirect?.classList.remove('active');
      this.el.tabContentBrowser?.classList.remove('hidden');
      this.el.tabContentDirect?.classList.add('hidden');
      this.el.btnJoinConnect?.classList.add('hidden');
      this.setJoinStatus('Выберите комнату из списка для подключения', false);
      if (this.onRefreshRoomsClicked) {
        this.onRefreshRoomsClicked();
      }
    } else {
      this.el.tabBtnBrowser?.classList.remove('active');
      this.el.tabBtnDirect?.classList.add('active');
      this.el.tabContentBrowser?.classList.add('hidden');
      this.el.tabContentDirect?.classList.remove('hidden');
      if (!this.isGuestConnected) {
        this.el.btnJoinConnect?.classList.remove('hidden');
      }
      this.setJoinStatus('Введите код комнаты и нажмите «Подключиться»', false);
    }
  }

  public showPasswordPrompt(roomCode: string): void {
    this.pendingPasswordRoomCode = roomCode;
    const stack = this.ctx.getMenuStack();
    if (stack[stack.length - 1] !== 'password_prompt') {
      this.ctx.pushMenu('password_prompt');
    }
    if (this.el.pwdPromptRoomTitle) {
      this.el.pwdPromptRoomTitle.textContent = `КОМНАТА ${roomCode}`;
    }
    if (this.el.pwdPromptInput) {
      this.el.pwdPromptInput.value = '';
    }
    if (this.el.pwdPromptError) {
      this.el.pwdPromptError.classList.add('hidden');
    }
    this.el.passwordPromptModal?.classList.remove('hidden');
    setTimeout(() => this.el.pwdPromptInput?.focus(), 50);
  }

  public hidePasswordPrompt(): void {
    this.pendingPasswordRoomCode = null;
    this.el.passwordPromptModal?.classList.add('hidden');
    if (this.el.pwdPromptError) {
      this.el.pwdPromptError.classList.add('hidden');
    }
    this.ctx.removeMenu('password_prompt');
  }

  public showPasswordPromptError(msg: string = 'Неверный пароль. Попробуйте снова.'): void {
    if (this.el.pwdPromptError) {
      this.el.pwdPromptError.textContent = msg;
      this.el.pwdPromptError.classList.remove('hidden');
    }
    if (this.el.pwdPromptInput) {
      this.el.pwdPromptInput.focus();
      this.el.pwdPromptInput.select();
    }
  }

  public submitPasswordPrompt(): void {
    if (!this.pendingPasswordRoomCode) return;
    const pwd = this.el.pwdPromptInput?.value?.trim() || '';
    const roomCode = this.pendingPasswordRoomCode;
    this.hidePasswordPrompt();
    if (this.el.joinRoomInput) {
      this.el.joinRoomInput.value = roomCode;
    }
    if (this.el.joinPasswordInput) {
      this.el.joinPasswordInput.value = pwd;
    }
    if (this.onGuestConnectClicked) {
      this.onGuestConnectClicked(roomCode, this.guestSelectedHero, pwd);
    }
  }

  public renderAvailableRooms(rooms: PublicRoomInfo[]): void {
    if (!this.el.availableRoomsList) return;
    this.el.availableRoomsList.innerHTML = '';

    if (!rooms || rooms.length === 0) {
      this.el.availableRoomsList.innerHTML = `
        <div class="room-empty-state">
          <div class="room-empty-state-icon">🤠</div>
          <div>Активных экспедиций пока не найдено.</div>
          <div style="font-size: 11px; opacity: 0.7;">Создайте свою или нажмите 🔄 Обновить.</div>
        </div>
      `;
      return;
    }

    const heroNames: Record<string, string> = {
      invoker: 'Инвокер (Стихии)',
      ronin: 'Рен (Вихрь)',
      valkyrie: 'Каэла (Меч)',
      flail: 'Бригитта (Цеп)',
      sorceress: 'Ария (Магия)',
      chakram: 'Кира (Чакрам)'
    };

    for (const r of rooms) {
      const card = document.createElement('div');
      card.className = 'room-browser-card';

      const isFull = r.playerCount >= r.maxPlayers;
      const isPlaying = r.status === 'playing';
      const canJoin = !isFull && !isPlaying;

      const heroName = heroNames[r.hostHero] || 'Рен';
      const secBadgeClass = r.hasPassword ? 'with-password' : 'open';
      const secBadgeText = r.hasPassword ? '🔒 С ПАРОЛЕМ' : '🔓 ОТКРЫТАЯ';
      const statusBadgeClass = r.status === 'playing' ? 'playing' : 'lobby';
      const statusBadgeText = r.status === 'playing' ? '⚔️ В ПОХОДЕ' : '⏳ В ЛОББИ';

      card.innerHTML = `
        <div class="room-card-left">
          <div class="room-host-avatar" title="${heroName}">
            <img src="${this.getHeroAvatar(r.hostHero)}" alt="${heroName}" />
          </div>
          <div class="room-card-info">
            <div class="room-card-title-row">
              <span class="room-card-code">${r.roomCode}</span>
              <span class="room-players-badge">👥 ${r.playerCount}/${r.maxPlayers}</span>
            </div>
            <div class="room-card-badges">
              <span class="room-security-badge ${secBadgeClass}">${secBadgeText}</span>
              <span class="room-status-badge ${statusBadgeClass}">${statusBadgeText}</span>
              <span class="room-card-details">Хост: ${heroName}</span>
            </div>
          </div>
        </div>
        <div class="room-card-actions">
          <button class="room-join-btn" ${canJoin ? '' : 'disabled'}>
            ${isFull ? 'ПОЛНАЯ' : (isPlaying ? 'В ПОХОДЕ' : 'ВОЙТИ')}
          </button>
        </div>
      `;

      const joinBtn = card.querySelector<HTMLButtonElement>('.room-join-btn');
      if (joinBtn && canJoin) {
        joinBtn.addEventListener('click', () => {
          if (r.hasPassword) {
            this.showPasswordPrompt(r.roomCode);
          } else {
            if (this.el.joinRoomInput) {
              this.el.joinRoomInput.value = r.roomCode;
            }
            if (this.el.joinPasswordInput) {
              this.el.joinPasswordInput.value = '';
            }
            if (this.onGuestConnectClicked) {
              this.onGuestConnectClicked(r.roomCode, this.guestSelectedHero, '');
            }
          }
        });
      }

      this.el.availableRoomsList.appendChild(card);
    }
  }

  public showJoinLobby(defaultHero: CharacterType = 'valkyrie'): void {
    this.ctx.hideCoopMenu();
    this.ctx.setMenuStack(['coop', 'join_lobby']);
    if (this.el.joinRoomInput) {
      this.el.joinRoomInput.value = '';
    }
    if (this.el.joinPasswordInput) {
      this.el.joinPasswordInput.value = '';
    }
    this.isGuestReady = false;
    this.isGuestConnected = false;
    this.setGuestConnectedMode(false);
    this.switchJoinTab('browser');
    this.setJoinStatus('Выберите экспедицию из списка или перейдите на вкладку «Ввод по коду»', false);
    if (this.el.joinRosterSection) {
      this.el.joinRosterSection.classList.add('hidden');
    }
    if (!ProgressionManager.getInstance().isHeroUnlocked(defaultHero)) {
      defaultHero = 'ronin';
    }
    this.guestSelectedHero = defaultHero;
    this.updateLobbyHeroesLockStatus();
    const guestHeroOpts = SafeDOM.queryAll<HTMLElement>(document.body, '.lobby-hero-opt[data-guest-hero]');
    guestHeroOpts.forEach((opt) => {
      if (opt.getAttribute('data-guest-hero') === defaultHero) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
    if (this.el.joinLobbyModal) {
      this.el.joinLobbyModal.classList.remove('hidden');
    }
    if (this.onRefreshRoomsClicked) {
      this.onRefreshRoomsClicked();
    }
  }

  public hideJoinLobby(): void {
    this.hidePasswordPrompt();
    this.setGuestConnectedMode(false);
    if (this.el.joinLobbyModal) {
      this.el.joinLobbyModal.classList.add('hidden');
    }
    this.ctx.removeMenu('join_lobby');
  }

  public setJoinStatus(text: string, isError: boolean = false): void {
    if (this.el.joinStatusText) {
      this.el.joinStatusText.textContent = text;
      this.el.joinStatusText.style.color = isError ? '#ef4444' : '#fbbf24';
    }
  }

  public setCoopBadge(roomCode: string | null): void {
    if (!this.el.coopBadge || !this.el.coopRoomName) return;
    if (roomCode) {
      this.el.coopBadge.classList.remove('hidden');
      this.el.coopRoomName.textContent = `КООП: ${roomCode}`;
    } else {
      this.el.coopBadge.classList.add('hidden');
    }
  }

  public updateLobbyHeroesLockStatus(): void {
    const prog = ProgressionManager.getInstance();
    const hostOpts = SafeDOM.queryAll<HTMLElement>(document.body, '.lobby-hero-opt[data-host-hero]');
    hostOpts.forEach((opt) => {
      const hero = opt.getAttribute('data-host-hero') as CharacterType;
      const isUnlocked = prog.isHeroUnlocked(hero);
      if (isUnlocked) {
        opt.classList.remove('locked-hero');
        opt.title = '';
      } else {
        opt.classList.add('locked-hero');
        const def = prog.getHeroQuestDefinition(hero);
        opt.title = `🔒 ${def.unlockConditionHint}`;
      }
    });

    const guestOpts = SafeDOM.queryAll<HTMLElement>(document.body, '.lobby-hero-opt[data-guest-hero]');
    guestOpts.forEach((opt) => {
      const hero = opt.getAttribute('data-guest-hero') as CharacterType;
      const isUnlocked = prog.isHeroUnlocked(hero);
      if (isUnlocked) {
        opt.classList.remove('locked-hero');
        opt.title = '';
      } else {
        opt.classList.add('locked-hero');
        const def = prog.getHeroQuestDefinition(hero);
        opt.title = `🔒 ${def.unlockConditionHint}`;
      }
    });
  }
}
