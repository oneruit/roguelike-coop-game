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
  btnHostBack?: HTMLElement | null;
  btnCopyCode?: HTMLElement | null;
  btnToggleHostPwd?: HTMLElement | null;

  joinLobbyModal?: HTMLElement | null;
  joinRoomInput?: HTMLInputElement | null;
  joinPasswordInput?: HTMLInputElement | null;
  joinStatusText?: HTMLElement | null;
  btnJoinConnect?: HTMLButtonElement | null;
  btnGuestReady?: HTMLElement | null;
  btnJoinBack?: HTMLElement | null;
  tabBtnBrowser?: HTMLElement | null;
  tabBtnDirect?: HTMLElement | null;
  tabContentBrowser?: HTMLElement | null;
  tabContentDirect?: HTMLElement | null;
  btnRefreshRooms?: HTMLElement | null;
  availableRoomsList?: HTMLElement | null;
  joinRosterSection?: HTMLElement | null;
  joinPlayersRoster?: HTMLElement | null;
  joinPlayerCount?: HTMLElement | null;

  passwordPromptModal?: HTMLElement | null;
  pwdPromptRoomTitle?: HTMLElement | null;
  pwdPromptInput?: HTMLInputElement | null;
  pwdPromptError?: HTMLElement | null;
  btnPwdPromptSubmit?: HTMLElement | null;
  btnPwdPromptCancel?: HTMLElement | null;
  btnTogglePromptPwd?: HTMLElement | null;

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
  showCoopMenu?: () => void;
  showMainMenu?: () => void;
  getMenuStack: () => string[];
  setMenuStack: (stack: string[]) => void;
  pushMenu: (menu: string) => void;
  removeMenu: (menu: string) => void;
  onReturnToMenu?: () => void;
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
  public onReturnToMenu?: () => void;

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

  protected bindElements(): void {
    const el = this.ctx.elements || {};

    el.hostLobbyModal = el.hostLobbyModal || SafeDOM.getElementById('host-lobby-modal');
    el.hostRoomCodeText = el.hostRoomCodeText || SafeDOM.getElementById('host-room-code');
    el.hostPasswordInput = el.hostPasswordInput || SafeDOM.getElementById<HTMLInputElement>('host-password-input');
    el.hostPasswordBadge = el.hostPasswordBadge || SafeDOM.getElementById('host-password-badge');
    el.hostPlayersRoster = el.hostPlayersRoster || SafeDOM.getElementById('host-players-roster');
    el.hostPlayerCount = el.hostPlayerCount || SafeDOM.getElementById('host-player-count');
    el.hostPartnerBox = el.hostPartnerBox || SafeDOM.getElementById('host-partner-box');
    el.hostPartnerTitle = el.hostPartnerTitle || SafeDOM.getElementById('host-partner-title');
    el.hostPartnerDesc = el.hostPartnerDesc || SafeDOM.getElementById('host-partner-desc');
    el.btnHostStart = el.btnHostStart || SafeDOM.getElementById<HTMLButtonElement>('btn-host-start');
    el.btnHostBack = el.btnHostBack || SafeDOM.getElementById('btn-host-back');
    el.btnCopyCode = el.btnCopyCode || SafeDOM.getElementById('btn-copy-code');
    el.btnToggleHostPwd = el.btnToggleHostPwd || SafeDOM.getElementById('btn-toggle-host-pwd');

    el.joinLobbyModal = el.joinLobbyModal || SafeDOM.getElementById('join-lobby-modal');
    el.joinRoomInput = el.joinRoomInput || SafeDOM.getElementById<HTMLInputElement>('join-room-input');
    el.joinPasswordInput = el.joinPasswordInput || SafeDOM.getElementById<HTMLInputElement>('join-password-input');
    el.joinStatusText = el.joinStatusText || SafeDOM.getElementById('join-status-text');
    el.btnJoinConnect = el.btnJoinConnect || SafeDOM.getElementById<HTMLButtonElement>('btn-join-connect');
    el.btnGuestReady = el.btnGuestReady || SafeDOM.getElementById('btn-guest-ready');
    el.btnJoinBack = el.btnJoinBack || SafeDOM.getElementById('btn-join-back');
    el.tabBtnBrowser = el.tabBtnBrowser || SafeDOM.getElementById('tab-btn-browser');
    el.tabBtnDirect = el.tabBtnDirect || SafeDOM.getElementById('tab-btn-direct');
    el.tabContentBrowser = el.tabContentBrowser || SafeDOM.getElementById('tab-content-browser');
    el.tabContentDirect = el.tabContentDirect || SafeDOM.getElementById('tab-content-direct');
    el.btnRefreshRooms = el.btnRefreshRooms || SafeDOM.getElementById('btn-refresh-rooms');
    el.availableRoomsList = el.availableRoomsList || SafeDOM.getElementById('available-rooms-list');
    el.joinRosterSection = el.joinRosterSection || SafeDOM.getElementById('join-roster-section');
    el.joinPlayersRoster = el.joinPlayersRoster || SafeDOM.getElementById('join-players-roster');
    el.joinPlayerCount = el.joinPlayerCount || SafeDOM.getElementById('join-player-count');

    el.passwordPromptModal = el.passwordPromptModal || SafeDOM.getElementById('password-prompt-modal');
    el.pwdPromptRoomTitle = el.pwdPromptRoomTitle || SafeDOM.getElementById('pwd-prompt-room-title');
    el.pwdPromptInput = el.pwdPromptInput || SafeDOM.getElementById<HTMLInputElement>('pwd-prompt-input');
    el.pwdPromptError = el.pwdPromptError || SafeDOM.getElementById('pwd-prompt-error');
    el.btnPwdPromptSubmit = el.btnPwdPromptSubmit || SafeDOM.getElementById('btn-pwd-prompt-submit');
    el.btnPwdPromptCancel = el.btnPwdPromptCancel || SafeDOM.getElementById('btn-pwd-prompt-cancel');
    el.btnTogglePromptPwd = el.btnTogglePromptPwd || SafeDOM.getElementById('btn-toggle-prompt-pwd');

    el.coopBadge = el.coopBadge || SafeDOM.getElementById('coop-badge');
    el.coopRoomName = el.coopRoomName || SafeDOM.getElementById('coop-room-name');

    this.ctx.elements = el;
  }

  protected bindEvents(): void {
    // 1. Copy Room Code
    this.el.btnCopyCode?.addEventListener('click', () => {
      const code = this.el.hostRoomCodeText?.textContent?.trim() || '';
      if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          const btn = this.el.btnCopyCode;
          if (btn) {
            const originalText = btn.textContent || 'Скопировать';
            btn.textContent = '✓ Скопировано!';
            setTimeout(() => {
              if (btn) btn.textContent = originalText;
            }, 2000);
          }
        });
      }
    });

    // 2. Host Start Expedition
    this.el.btnHostStart?.addEventListener('click', () => {
      if (this.onHostStartExpedition) {
        this.onHostStartExpedition();
      }
    });

    // 3. Host Return to Menu
    this.el.btnHostBack?.addEventListener('click', () => {
      this.hideHostLobby();
      if (this.ctx.showCoopMenu) {
        this.ctx.showCoopMenu();
      }
      this.ctx.onReturnToMenu?.();
      this.onReturnToMenu?.();
    });

    // 4. Host Password Input & Visibility
    this.el.hostPasswordInput?.addEventListener('input', () => {
      const val = this.el.hostPasswordInput?.value?.trim() || '';
      if (this.el.hostPasswordBadge) {
        if (val) {
          this.el.hostPasswordBadge.textContent = '🔒 ЗАЩИЩЕНА';
          this.el.hostPasswordBadge.className = 'password-badge protected';
        } else {
          this.el.hostPasswordBadge.textContent = '🔓 БЕЗ ПАРОЛЯ';
          this.el.hostPasswordBadge.className = 'password-badge open';
        }
      }
      this.onHostPasswordChanged?.(val);
    });

    this.el.btnToggleHostPwd?.addEventListener('click', () => {
      if (this.el.hostPasswordInput) {
        const isPwd = this.el.hostPasswordInput.type === 'password';
        this.el.hostPasswordInput.type = isPwd ? 'text' : 'password';
      }
    });

    // 5. Host Hero Selector
    const hostHeroOpts = this.queryHeroOptions('.lobby-hero-opt[data-host-hero]');
    hostHeroOpts.forEach((opt) => {
      opt.addEventListener('click', () => {
        const hero = opt.getAttribute('data-host-hero') as CharacterType;
        if (!ProgressionManager.getInstance().isHeroUnlocked(hero)) {
          return;
        }
        hostHeroOpts.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        this.hostSelectedHero = hero;
        this.onHostHeroChanged?.(hero);
      });
    });

    // 6. Guest Navigation Tabs
    this.el.tabBtnBrowser?.addEventListener('click', () => {
      this.switchJoinTab('browser');
    });

    this.el.tabBtnDirect?.addEventListener('click', () => {
      this.switchJoinTab('direct');
    });

    // 7. Refresh Rooms
    this.el.btnRefreshRooms?.addEventListener('click', () => {
      this.onRefreshRoomsClicked?.();
    });

    // 8. Guest Connect Action
    const handleGuestConnect = () => {
      const code = this.el.joinRoomInput?.value?.trim().toUpperCase() || '';
      const pwd = this.el.joinPasswordInput?.value?.trim() || '';
      if (!code) {
        this.setJoinStatus('Пожалуйста, введите код комнаты!', true);
        return;
      }
      if (this.el.btnJoinConnect) {
        this.el.btnJoinConnect.disabled = true;
        this.el.btnJoinConnect.textContent = '⏳ Подключение...';
      }
      this.onGuestConnectClicked?.(code, this.guestSelectedHero, pwd);
    };

    this.el.btnJoinConnect?.addEventListener('click', handleGuestConnect);
    this.el.joinRoomInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleGuestConnect();
    });
    this.el.joinPasswordInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleGuestConnect();
    });

    // 9. Guest Ready Button
    this.el.btnGuestReady?.addEventListener('click', () => {
      this.isGuestReady = !this.isGuestReady;
      this.updateGuestReadyButtonUI();
      this.onGuestReadyToggle?.(this.isGuestReady);
      if (this.isGuestReady) {
        this.setJoinStatus('Вы готовы к походу! Ожидание старта хостом...', false);
      } else {
        this.setJoinStatus('Нажмите «ГОТОВ» для подтверждения готовности к походу.', false);
      }
    });

    // 10. Guest Return to Menu
    this.el.btnJoinBack?.addEventListener('click', () => {
      this.hideJoinLobby();
      if (this.ctx.showCoopMenu) {
        this.ctx.showCoopMenu();
      }
      this.ctx.onReturnToMenu?.();
      this.onReturnToMenu?.();
    });

    // 11. Guest Hero Selector
    const guestHeroOpts = this.queryHeroOptions('.lobby-hero-opt[data-guest-hero]');
    guestHeroOpts.forEach((opt) => {
      opt.addEventListener('click', () => {
        const hero = opt.getAttribute('data-guest-hero') as CharacterType;
        if (!ProgressionManager.getInstance().isHeroUnlocked(hero)) {
          return;
        }
        guestHeroOpts.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        this.guestSelectedHero = hero;
        this.onGuestHeroChanged?.(hero);
      });
    });

    // 12. Password Prompt Modal
    this.el.btnPwdPromptSubmit?.addEventListener('click', () => {
      this.submitPasswordPrompt();
    });

    this.el.btnPwdPromptCancel?.addEventListener('click', () => {
      this.hidePasswordPrompt();
    });

    this.el.pwdPromptInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.submitPasswordPrompt();
      }
    });

    this.el.btnTogglePromptPwd?.addEventListener('click', () => {
      if (this.el.pwdPromptInput) {
        const isPwd = this.el.pwdPromptInput.type === 'password';
        this.el.pwdPromptInput.type = isPwd ? 'text' : 'password';
      }
    });
  }

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
    const hostHeroOpts = this.queryHeroOptions('.lobby-hero-opt[data-host-hero]');
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
    if (typeof document === 'undefined') return;

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
    if (charType === 'vampire') return 'Кармилла «Вампир»';
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
      chakram: 'Кира (Чакрам)',
      vampire: 'Кармилла (Вампир)'
    };

    if (typeof document === 'undefined') return;

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
    const guestHeroOpts = this.queryHeroOptions('.lobby-hero-opt[data-guest-hero]');
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
    const hostOpts = this.queryHeroOptions('.lobby-hero-opt[data-host-hero]');
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

    const guestOpts = this.queryHeroOptions('.lobby-hero-opt[data-guest-hero]');
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

  private queryHeroOptions(selector: string): HTMLElement[] {
    if (typeof document === 'undefined' || !document.body) return [];
    return SafeDOM.queryAll<HTMLElement>(document.body, selector);
  }
}
