import { CharacterType } from '../../entities/Player';
import { LobbyPlayerInfo } from '../../net/NetworkManager';
import { PublicRoomInfo } from '../../net/RoomDirectory';
import { ProgressionManager } from '../../core/ProgressionManager';
import { TextureManager } from '../../core/TextureManager';

export interface LobbyUIElements {
  hostLobbyModal: HTMLElement;
  hostRoomCodeText: HTMLElement;
  hostPasswordInput: HTMLInputElement | null;
  hostPasswordBadge: HTMLElement | null;
  hostPlayersRoster: HTMLElement;
  hostPlayerCount: HTMLElement | null;
  hostPartnerBox: HTMLElement;
  hostPartnerTitle: HTMLElement;
  hostPartnerDesc: HTMLElement;
  btnHostStart: HTMLButtonElement;

  joinLobbyModal: HTMLElement;
  joinRoomInput: HTMLInputElement;
  joinPasswordInput: HTMLInputElement | null;
  joinStatusText: HTMLElement;
  btnJoinConnect: HTMLButtonElement | null;
  btnGuestReady: HTMLElement | null;
  tabBtnBrowser: HTMLElement | null;
  tabBtnDirect: HTMLElement | null;
  tabContentBrowser: HTMLElement | null;
  tabContentDirect: HTMLElement | null;
  availableRoomsList: HTMLElement | null;
  joinRosterSection: HTMLElement | null;
  joinPlayersRoster: HTMLElement;
  joinPlayerCount: HTMLElement | null;

  passwordPromptModal: HTMLElement | null;
  pwdPromptRoomTitle: HTMLElement | null;
  pwdPromptInput: HTMLInputElement | null;
  pwdPromptError: HTMLElement | null;

  guideModal: HTMLElement;
  settingsModal: HTMLElement;
  pauseModal: HTMLElement;
  coopBadge: HTMLElement;
  coopRoomName: HTMLElement;
}

export interface LobbyUIContext {
  elements: LobbyUIElements;
  hideCoopMenu: () => void;
  hideMainMenu: () => void;
  getMenuStack: () => string[];
  setMenuStack: (stack: string[]) => void;
  pushMenu: (menu: string) => void;
  removeMenu: (menu: string) => void;
}

export class LobbyUI {
  private ctx: LobbyUIContext;

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

  constructor(ctx: LobbyUIContext) {
    this.ctx = ctx;
  }

  private get el(): LobbyUIElements {
    return this.ctx.elements;
  }

  public showHostLobby(roomCode: string, hero: CharacterType) {
    this.ctx.hideCoopMenu();
    this.ctx.setMenuStack(['coop', 'host_lobby']);
    this.el.hostRoomCodeText.innerText = roomCode;
    if (!ProgressionManager.getInstance().isHeroUnlocked(hero)) {
      hero = 'ronin';
    }
    this.hostSelectedHero = hero;
    this.updateLobbyHeroesLockStatus();
    const hostHeroOpts = document.querySelectorAll<HTMLElement>('.lobby-hero-opt[data-host-hero]');
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
      this.el.hostPasswordBadge.innerText = '🔓 БЕЗ ПАРОЛЯ';
      this.el.hostPasswordBadge.className = 'password-badge open';
    }
    this.renderHostRoster([initialHostInfo]);
    this.el.hostLobbyModal.classList.remove('hidden');
  }

  public hideHostLobby() {
    this.el.hostLobbyModal.classList.add('hidden');
    this.ctx.removeMenu('host_lobby');
  }

  public setHostPartnerConnected(connected: boolean, hero?: CharacterType) {
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
      this.el.hostPartnerTitle.innerText = `Игрок подключился! (${heroName})`;
      this.el.hostPartnerDesc.innerText = 'Игрок готов к экспедиции! Вы можете начать поход или дождаться остальных.';
      this.el.btnHostStart.disabled = false;
    } else {
      this.el.hostPartnerBox.className = 'partner-status-box waiting';
      this.el.hostPartnerTitle.innerText = 'Ожидание игроков...';
      this.el.hostPartnerDesc.innerText = 'Отправьте код комнаты друзьям. Можно начать поход в любой момент!';
      this.el.btnHostStart.disabled = false;
    }
  }

  public renderHostRoster(lobbyPlayers: LobbyPlayerInfo[]) {
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
      this.el.hostPlayerCount.innerText = `${list.length}`;
    }
    const countBadge = document.getElementById('host-player-count-badge');
    if (countBadge) {
      countBadge.innerText = `${list.length} / 5 ИГРОКОВ`;
    }

    const guests = list.filter(p => !p.isHost && p.id !== 'p1');
    const allGuestsReady = guests.length === 0 || guests.every(p => p.isReady);

    if (list.length > 1) {
      if (allGuestsReady) {
        this.el.hostPartnerBox.className = 'partner-status-box connected';
        this.el.hostPartnerTitle.innerText = `Отряд готов (${list.length}/5)! Все подтвердили готовность.`;
        this.el.hostPartnerDesc.innerText = 'Все игроки готовы! Вы можете выдвигаться в экспедицию.';
        this.el.btnHostStart.disabled = false;
        this.el.btnHostStart.innerText = 'НАЧАТЬ ЭКСПЕДИЦИЮ';
      } else {
        const notReadyCount = guests.filter(p => !p.isReady).length;
        this.el.hostPartnerBox.className = 'partner-status-box waiting';
        this.el.hostPartnerTitle.innerText = `Ожидание подтверждения (${notReadyCount} не готовы)`;
        this.el.hostPartnerDesc.innerText = 'Игроки подключились, но ещё не нажали «ГОТОВ». Дождитесь подтверждения от всех игроков.';
        this.el.btnHostStart.disabled = true;
        this.el.btnHostStart.innerText = 'ОЖИДАНИЕ ГОТОВНОСТИ ИГРОКОВ...';
      }
    } else {
      this.el.hostPartnerBox.className = 'partner-status-box waiting';
      this.el.hostPartnerTitle.innerText = 'Ожидание игроков в отряд...';
      this.el.hostPartnerDesc.innerText = 'Отправьте код комнаты друзьям. Можно начать поход в любой момент!';
      this.el.btnHostStart.disabled = false;
      this.el.btnHostStart.innerText = 'НАЧАТЬ ЭКСПЕДИЦИЮ';
    }
  }

  public renderJoinRoster(lobbyPlayers: LobbyPlayerInfo[], mySlotId: string = 'p2') {
    if (this.el.joinRosterSection) {
      this.el.joinRosterSection.classList.remove('hidden');
    }
    this.renderRosterGrid(this.el.joinPlayersRoster, lobbyPlayers, mySlotId);
    if (this.el.joinPlayerCount) {
      this.el.joinPlayerCount.innerText = `${lobbyPlayers.length}`;
    }
    const countBadge = document.getElementById('join-player-count-badge');
    if (countBadge) {
      countBadge.innerText = `${lobbyPlayers.length} / 5 ИГРОКОВ`;
    }
    if (!this.isGuestConnected) {
      this.setGuestConnectedMode(true);
    }
    if (this.isGuestReady) {
      this.setJoinStatus('Вы готовы к походу! Ожидание старта хостом...', false);
    } else {
      const code = this.el.joinRoomInput.value.toUpperCase().trim();
      this.setJoinStatus(code ? `Подключено к ${code}! Нажмите «ГОТОВ» для подтверждения.` : 'Подключено к экспедиции! Нажмите «ГОТОВ» для подтверждения.', false);
    }
  }

  public renderRosterGrid(container: HTMLElement, lobbyPlayers: LobbyPlayerInfo[], mySlotId: string = 'p1') {
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
        card.style.borderColor = player.colorCss;
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
    if (charType === 'invoker') return TextureManager.getAssetUrl('/textures/heroes/hero_invoker_front.png');
    if (charType === 'necromancer') return TextureManager.getAssetUrl('/textures/heroes/hero_necromancer_front.png');
    if (charType === 'amazon') return TextureManager.getAssetUrl('/textures/heroes/hero_amazon_front.png');
    const avatar = charType === 'ronin'
      ? '/textures/heroes/hero_ronin_front.png'
      : charType === 'valkyrie'
      ? '/textures/heroes/hero_valkyrie_front.png'
      : charType === 'flail'
      ? '/textures/heroes/hero_flail_front.png'
      : charType === 'sorceress'
      ? '/textures/heroes/hero_sorceress_front.png'
      : charType === 'chakram'
      ? '/textures/heroes/hero_chakram_front.png'
      : charType === 'archer'
      ? '/textures/heroes/hero_archer_front.png'
      : '/textures/heroes/hero_rocket_front.png';
    return TextureManager.getAssetUrl(avatar);
  }

  public updateGuestReadyButtonUI() {
    if (!this.el.btnGuestReady) return;
    if (this.isGuestReady) {
      this.el.btnGuestReady.classList.remove('is-not-ready');
      this.el.btnGuestReady.classList.add('is-ready');
      this.el.btnGuestReady.innerText = 'ВЫ ГОТОВЫ (НАЖМИТЕ ДЛЯ ОТМЕНЫ)';
    } else {
      this.el.btnGuestReady.classList.remove('is-ready');
      this.el.btnGuestReady.classList.add('is-not-ready');
      this.el.btnGuestReady.innerText = 'НАЖМИТЕ «ГОТОВ»';
    }
  }

  public setGuestConnectedMode(connected: boolean) {
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
        this.el.btnJoinConnect.innerText = 'ПОДКЛЮЧИТЬСЯ';
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

  public switchJoinTab(tab: 'browser' | 'direct') {
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

  public showPasswordPrompt(roomCode: string) {
    this.pendingPasswordRoomCode = roomCode;
    const stack = this.ctx.getMenuStack();
    if (stack[stack.length - 1] !== 'password_prompt') {
      this.ctx.pushMenu('password_prompt');
    }
    if (this.el.pwdPromptRoomTitle) {
      this.el.pwdPromptRoomTitle.innerText = `КОМНАТА ${roomCode}`;
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

  public hidePasswordPrompt() {
    this.pendingPasswordRoomCode = null;
    this.el.passwordPromptModal?.classList.add('hidden');
    if (this.el.pwdPromptError) {
      this.el.pwdPromptError.classList.add('hidden');
    }
    this.ctx.removeMenu('password_prompt');
  }

  public showPasswordPromptError(msg: string = 'Неверный пароль. Попробуйте снова.') {
    if (this.el.pwdPromptError) {
      this.el.pwdPromptError.innerText = msg;
      this.el.pwdPromptError.classList.remove('hidden');
    }
    if (this.el.pwdPromptInput) {
      this.el.pwdPromptInput.focus();
      this.el.pwdPromptInput.select();
    }
  }

  public submitPasswordPrompt() {
    if (!this.pendingPasswordRoomCode) return;
    const pwd = this.el.pwdPromptInput?.value?.trim() || '';
    const roomCode = this.pendingPasswordRoomCode;
    this.hidePasswordPrompt();
    this.el.joinRoomInput.value = roomCode;
    if (this.el.joinPasswordInput) {
      this.el.joinPasswordInput.value = pwd;
    }
    if (this.onGuestConnectClicked) {
      this.onGuestConnectClicked(roomCode, this.guestSelectedHero, pwd);
    }
  }

  public renderAvailableRooms(rooms: PublicRoomInfo[]) {
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
            this.el.joinRoomInput.value = r.roomCode;
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

  public showJoinLobby(defaultHero: CharacterType = 'valkyrie') {
    this.ctx.hideCoopMenu();
    this.ctx.setMenuStack(['coop', 'join_lobby']);
    this.el.joinRoomInput.value = '';
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
    const guestHeroOpts = document.querySelectorAll<HTMLElement>('.lobby-hero-opt[data-guest-hero]');
    guestHeroOpts.forEach((opt) => {
      if (opt.getAttribute('data-guest-hero') === defaultHero) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
    this.el.joinLobbyModal.classList.remove('hidden');
    if (this.onRefreshRoomsClicked) {
      this.onRefreshRoomsClicked();
    }
  }

  public hideJoinLobby() {
    this.hidePasswordPrompt();
    this.setGuestConnectedMode(false);
    this.el.joinLobbyModal.classList.add('hidden');
    this.ctx.removeMenu('join_lobby');
  }

  public setJoinStatus(text: string, isError: boolean = false) {
    this.el.joinStatusText.innerText = text;
    this.el.joinStatusText.style.color = isError ? '#ef4444' : '#fbbf24';
  }

  public showGuide() {
    if (!this.el.settingsModal.classList.contains('hidden')) {
      this.el.settingsModal.classList.add('hidden');
      const stack = this.ctx.getMenuStack();
      if (stack[stack.length - 1] !== 'guide') {
        this.ctx.pushMenu('guide');
      }
    } else if (!this.el.pauseModal.classList.contains('hidden')) {
      this.el.pauseModal.classList.add('hidden');
      const stack = this.ctx.getMenuStack();
      if (stack[stack.length - 1] !== 'guide') {
        this.ctx.pushMenu('guide');
      }
    } else {
      this.ctx.hideMainMenu();
      this.ctx.setMenuStack(['guide']);
    }
    this.el.guideModal.classList.remove('hidden');
  }

  public hideGuide() {
    this.el.guideModal.classList.add('hidden');
    this.ctx.removeMenu('guide');
  }

  public setCoopBadge(roomCode: string | null) {
    if (roomCode) {
      this.el.coopBadge.classList.remove('hidden');
      this.el.coopRoomName.innerText = `КООП: ${roomCode}`;
    } else {
      this.el.coopBadge.classList.add('hidden');
    }
  }

  public updateLobbyHeroesLockStatus() {
    const prog = ProgressionManager.getInstance();
    const hostOpts = document.querySelectorAll<HTMLElement>('.lobby-hero-opt[data-host-hero]');
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

    const guestOpts = document.querySelectorAll<HTMLElement>('.lobby-hero-opt[data-guest-hero]');
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
