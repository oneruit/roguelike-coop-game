import { Player, CharacterType, ActiveBuff, BuffType } from '../entities/Player';
import { Weapon, HeavyColtWeapon, DualRevolversWeapon, OrbitingBarrierWeapon, HolyAuraWeapon, KatanaSlashWeapon, WhirlwindSlashWeapon, GreatswordWeapon, FlailWeapon, AstralStaffWeapon, ChakramWeapon } from '../combat/Weapon';
import { SoundManager } from '../core/SoundManager';
import { DamageNumberManager } from '../combat/DamageNumberManager';
import { Enemy } from '../entities/Enemy';
import { PlayerStats, LobbyPlayerInfo, PLAYER_COLORS } from '../net/NetworkManager';
import { RemotePlayer } from '../entities/RemotePlayer';
import * as THREE from 'three';

export interface UpgradeOption {
  id: string;
  title: string;
  icon: string;
  levelTag: string;
  description: string;
  apply: () => void;
}

export interface DetailedPlayerResult {
  id: string;
  name: string;
  charType: CharacterType;
  colorCss: string;
  stats: PlayerStats;
  isLocal: boolean;
}

export class HUD {
  private xpFill: HTMLElement;
  private playerLevel: HTMLElement;
  private timerText: HTMLElement;
  private killCountText: HTMLElement;
  private coopKillsDetail: HTMLElement;
  private myKillsCount: HTMLElement;
  private partnerKillsCount: HTMLElement;
  private hpFill: HTMLElement | null;
  private hpText: HTMLElement | null;
  private weaponsBar: HTMLElement;
  public poePartyList: HTMLElement;

  // Boss HUD
  private bossHpContainer: HTMLElement;
  private bossHpFill: HTMLElement;
  private bossHpText: HTMLElement;
  private bossNameText: HTMLElement | null;
  private bossWarningBanner: HTMLElement;
  private bossWarningText: HTMLElement | null;

  // Altar & Buffs HUD
  private altarBanner: HTMLElement;
  private altarBannerText: HTMLElement;
  private buffsTray: HTMLElement;
  private altarBannerTimeout: number | null = null;

  // Modals
  private mainMenuModal: HTMLElement;
  private coopModal: HTMLElement;
  private settingsModal: HTMLElement;
  private exitModal: HTMLElement;
  private hostLobbyModal: HTMLElement;
  private joinLobbyModal: HTMLElement;
  private guideModal: HTMLElement;
  private charSelectModal: HTMLElement;
  private pauseModal: HTMLElement;
  private settingsFromPause = false;
  private levelUpModal: HTMLElement;
  private levelUpStepIndicator: HTMLElement;
  private levelUpTitle: HTMLElement;
  private upgradeCardsContainer: HTMLElement;
  private gameOverModal: HTMLElement;
  private gameOverCard: HTMLElement;
  private victoryBadge: HTMLElement;
  private gameOverTitle: HTMLElement;
  private gameOverSubtitle: HTMLElement;
  private victoryStatsPrompt: HTMLElement;
  private arsenalItemsList: HTMLElement;
  private soloGameOverStats: HTMLElement;
  private coopGameOverStats: HTMLElement;
  private finalTime: HTMLElement;
  private finalKills: HTMLElement;
  private finalDamage: HTMLElement;
  private finalLevel: HTMLElement;
  private coopFinalTime: HTMLElement;
  private coopP1Kills: HTMLElement;
  private coopP2Kills: HTMLElement;
  private coopP1Damage: HTMLElement;
  private coopP2Damage: HTMLElement;
  private coopP1Level: HTMLElement;
  private coopP2Level: HTMLElement;
  private coopP1Revives: HTMLElement;
  private coopP2Revives: HTMLElement;
  private coopTotalKills: HTMLElement;
  private btnRestart: HTMLElement;
  private btnResume: HTMLElement;
  private btnPauseRestart: HTMLElement;
  private btnPauseMenu: HTMLElement;
  private btnGameOverMenu: HTMLElement;
  private btnCharSelectBack: HTMLElement;

  // Host Lobby elements
  private hostRoomCodeText: HTMLElement;
  private btnCopyCode: HTMLElement;
  private hostPartnerBox: HTMLElement;
  private hostPartnerTitle: HTMLElement;
  private hostPartnerDesc: HTMLElement;
  private btnHostStart: HTMLButtonElement;
  private btnHostBack: HTMLElement;

  private joinRoomInput: HTMLInputElement;
  private joinStatusText: HTMLElement;
  private btnJoinConnect: HTMLButtonElement;
  private btnGuestReady: HTMLButtonElement;
  private btnJoinBack: HTMLElement;
  public isGuestReady: boolean = false;
  public isGuestConnected: boolean = false;
  public onGuestReadyToggle?: (isReady: boolean) => void;

  // Co-op In-game HUD
  private coopBadge: HTMLElement;
  private coopRoomName: HTMLElement;
  private partnerHpContainer: HTMLElement | null;
  private partnerHpFill: HTMLElement | null;
  private partnerHpText: HTMLElement | null;

  // 5-Player Squad elements
  private teammatesHpTray: HTMLElement | null;
  private hostPlayersRoster: HTMLElement;
  private hostPlayerCount: HTMLElement;
  private joinPlayersRoster: HTMLElement;
  private joinPlayerCount: HTMLElement;
  private joinRosterSection: HTMLElement;
  private coopStatsThead: HTMLElement;
  private coopStatsTbody: HTMLElement;

  private scene: THREE.Scene;
  public isPaused = false;
  private bossWarningTimeout: number | null = null;

  // Performance Overlay (FPS & Latency)
  private perfOverlay: HTMLElement | null = null;
  private perfFps: HTMLElement | null = null;
  private perfPing: HTMLElement | null = null;
  private isPerfOverlayEnabled: boolean = true;
  private lastPerfUiUpdate: number = 0;

  // Hero selections in lobby
  public hostSelectedHero: CharacterType = 'ronin';
  public guestSelectedHero: CharacterType = 'valkyrie';

  // Navigation callbacks
  public onSinglePlayerSelected?: () => void;
  public onCreateRoomClicked?: () => void;
  public onJoinRoomClicked?: () => void;
  public onHostStartExpedition?: () => void;
  public onHostHeroChanged?: (hero: CharacterType) => void;
  public onGuestHeroChanged?: (hero: CharacterType) => void;
  public onGuestConnectClicked?: (roomCode: string, hero: CharacterType) => void;
  public onReturnToMenu?: () => void;

  constructor(
    scene: THREE.Scene,
    onSelectHero: (charType: CharacterType) => void,
    onResume: () => void,
    onRestart: () => void
  ) {
    this.scene = scene;

    this.xpFill = document.getElementById('xp-bar-fill')!;
    this.playerLevel = document.getElementById('player-level')!;
    this.timerText = document.getElementById('game-timer')!;
    this.killCountText = document.getElementById('kill-count')!;
    this.coopKillsDetail = document.getElementById('coop-kills-detail')!;
    this.myKillsCount = document.getElementById('my-kills-count')!;
    this.partnerKillsCount = document.getElementById('partner-kills-count')!;
    this.hpFill = document.getElementById('player-hp-fill');
    this.hpText = document.getElementById('player-hp-text');
    this.weaponsBar = document.getElementById('active-weapons-bar')!;
    this.poePartyList = document.getElementById('poe-party-list') || document.createElement('div');

    this.bossHpContainer = document.getElementById('boss-hp-container')!;
    this.bossHpFill = document.getElementById('boss-hp-fill')!;
    this.bossHpText = document.getElementById('boss-hp-text')!;
    this.bossNameText = document.getElementById('boss-name-text');
    this.bossWarningBanner = document.getElementById('boss-warning-banner')!;
    this.bossWarningText = document.getElementById('boss-warning-text');

    this.altarBanner = document.getElementById('altar-notification-banner')!;
    this.altarBannerText = document.getElementById('altar-notification-text')!;
    this.buffsTray = document.getElementById('active-buffs-tray')!;

    // Modals
    this.mainMenuModal = document.getElementById('main-menu-modal')!;
    this.coopModal = document.getElementById('coop-modal')!;
    this.settingsModal = document.getElementById('settings-modal')!;
    this.exitModal = document.getElementById('exit-modal')!;
    this.hostLobbyModal = document.getElementById('host-lobby-modal')!;
    this.joinLobbyModal = document.getElementById('join-lobby-modal')!;
    this.guideModal = document.getElementById('guide-modal')!;
    this.charSelectModal = document.getElementById('character-select-modal')!;
    this.pauseModal = document.getElementById('pause-modal')!;
    this.levelUpModal = document.getElementById('level-up-modal')!;
    this.levelUpStepIndicator = document.getElementById('level-up-step-indicator')!;
    this.levelUpTitle = document.getElementById('level-up-title')!;
    this.upgradeCardsContainer = document.getElementById('upgrade-cards')!;
    this.gameOverModal = document.getElementById('game-over-modal')!;
    this.gameOverCard = document.getElementById('game-over-card')!;
    this.victoryBadge = document.getElementById('victory-badge')!;
    this.gameOverTitle = document.getElementById('game-over-title')!;
    this.gameOverSubtitle = document.getElementById('game-over-subtitle')!;
    this.victoryStatsPrompt = document.getElementById('victory-stats-prompt')!;
    this.arsenalItemsList = document.getElementById('arsenal-items-list')!;
    this.soloGameOverStats = document.getElementById('solo-game-over-stats')!;
    this.coopGameOverStats = document.getElementById('coop-game-over-stats')!;
    this.finalTime = document.getElementById('final-time')!;
    this.finalKills = document.getElementById('final-kills')!;
    this.finalDamage = document.getElementById('final-damage')!;
    this.finalLevel = document.getElementById('final-level')!;
    this.coopFinalTime = document.getElementById('coop-final-time')!;
    this.coopP1Kills = document.getElementById('coop-p1-kills')!;
    this.coopP2Kills = document.getElementById('coop-p2-kills')!;
    this.coopP1Damage = document.getElementById('coop-p1-damage')!;
    this.coopP2Damage = document.getElementById('coop-p2-damage')!;
    this.coopP1Level = document.getElementById('coop-p1-level')!;
    this.coopP2Level = document.getElementById('coop-p2-level')!;
    this.coopP1Revives = document.getElementById('coop-p1-revives')!;
    this.coopP2Revives = document.getElementById('coop-p2-revives')!;
    this.coopTotalKills = document.getElementById('coop-total-kills')!;
    this.btnRestart = document.getElementById('btn-restart')!;
    this.btnResume = document.getElementById('btn-resume')!;
    this.btnPauseRestart = document.getElementById('btn-pause-restart')!;
    this.btnPauseMenu = document.getElementById('btn-pause-menu')!;
    this.btnGameOverMenu = document.getElementById('btn-gameover-menu')!;
    this.btnCharSelectBack = document.getElementById('btn-char-select-back')!;

    // Host Lobby Elements
    this.hostRoomCodeText = document.getElementById('host-room-code')!;
    this.btnCopyCode = document.getElementById('btn-copy-code')!;
    this.hostPartnerBox = document.getElementById('host-partner-box')!;
    this.hostPartnerTitle = document.getElementById('host-partner-title')!;
    this.hostPartnerDesc = document.getElementById('host-partner-desc')!;
    this.btnHostStart = document.getElementById('btn-host-start') as HTMLButtonElement;
    this.btnHostBack = document.getElementById('btn-host-back')!;

    // Join Lobby Elements
    this.joinRoomInput = document.getElementById('join-room-input') as HTMLInputElement;
    this.joinStatusText = document.getElementById('join-status-text')!;
    this.btnJoinConnect = document.getElementById('btn-join-connect') as HTMLButtonElement;
    this.btnGuestReady = document.getElementById('btn-guest-ready') as HTMLButtonElement;
    this.btnJoinBack = document.getElementById('btn-join-back')!;

    // Co-op HUD Elements
    this.coopBadge = document.getElementById('coop-badge')!;
    this.coopRoomName = document.getElementById('coop-room-name')!;
    this.partnerHpContainer = document.getElementById('partner-hp-container');
    this.partnerHpFill = document.getElementById('partner-hp-fill');
    this.partnerHpText = document.getElementById('partner-hp-text');

    // 5-Player Squad elements
    this.teammatesHpTray = document.getElementById('teammates-hp-tray');
    this.hostPlayersRoster = document.getElementById('host-players-roster')!;
    this.hostPlayerCount = document.getElementById('host-player-count')!;
    this.joinPlayersRoster = document.getElementById('join-players-roster')!;
    this.joinPlayerCount = document.getElementById('join-player-count')!;
    this.joinRosterSection = document.getElementById('join-roster-section')!;
    this.coopStatsThead = document.getElementById('coop-stats-thead')!;
    this.coopStatsTbody = document.getElementById('coop-stats-tbody')!;

    // Performance Overlay
    this.perfOverlay = document.getElementById('perf-overlay');
    this.perfFps = document.getElementById('perf-fps');
    this.perfPing = document.getElementById('perf-ping');

    // Bind Main Menu Buttons: Single-player mode, Co-op mode, Settings, Exit
    document.getElementById('menu-btn-single')?.addEventListener('click', () => {
      this.hideMainMenu();
      if (this.onSinglePlayerSelected) {
        this.onSinglePlayerSelected();
      } else {
        this.showCharacterSelect();
      }
    });

    document.getElementById('menu-btn-coop')?.addEventListener('click', () => {
      this.hideMainMenu();
      this.showCoopMenu();
    });

    document.getElementById('menu-btn-settings')?.addEventListener('click', () => {
      this.hideMainMenu();
      this.showSettings('main');
    });

    document.getElementById('menu-btn-exit')?.addEventListener('click', () => {
      this.showExitModal();
    });

    // Co-op Mode Modal Buttons
    document.getElementById('coop-btn-host')?.addEventListener('click', () => {
      this.hideCoopMenu();
      if (this.onCreateRoomClicked) {
        this.onCreateRoomClicked();
      }
    });

    document.getElementById('coop-btn-join')?.addEventListener('click', () => {
      this.hideCoopMenu();
      if (this.onJoinRoomClicked) {
        this.onJoinRoomClicked();
      }
    });

    document.getElementById('coop-btn-back')?.addEventListener('click', () => {
      this.hideCoopMenu();
      this.showMainMenu();
      if (this.onReturnToMenu) this.onReturnToMenu();
    });

    // Settings Controls
    const volumeSlider = document.getElementById('settings-volume') as HTMLInputElement | null;
    const volumeVal = document.getElementById('settings-volume-val');
    const muteCheckbox = document.getElementById('settings-mute') as HTMLInputElement | null;
    const testSoundBtn = document.getElementById('settings-btn-test-sound');
    const dmgNumbersCheckbox = document.getElementById('settings-damage-numbers') as HTMLInputElement | null;
    const fullscreenBtn = document.getElementById('settings-btn-fullscreen');
    const openGuideBtn = document.getElementById('settings-btn-open-guide');
    const settingsBackBtn = document.getElementById('settings-btn-back');

    if (volumeSlider) {
      volumeSlider.addEventListener('input', () => {
        const val = parseInt(volumeSlider.value, 10);
        if (volumeVal) volumeVal.innerText = `${val}%`;
        SoundManager.setVolume(val / 100);
      });
    }

    if (muteCheckbox) {
      muteCheckbox.addEventListener('change', () => {
        SoundManager.setMuted(muteCheckbox.checked);
      });
    }

    testSoundBtn?.addEventListener('click', () => {
      SoundManager.playSlash();
      setTimeout(() => SoundManager.playGem(), 120);
    });

    if (dmgNumbersCheckbox) {
      dmgNumbersCheckbox.addEventListener('change', () => {
        DamageNumberManager.enabled = dmgNumbersCheckbox.checked;
      });
    }

    const perfOverlayCheckbox = document.getElementById('settings-perf-overlay') as HTMLInputElement | null;
    if (perfOverlayCheckbox) {
      const saved = localStorage.getItem('wildwest_show_perf');
      this.isPerfOverlayEnabled = saved !== 'false';
      perfOverlayCheckbox.checked = this.isPerfOverlayEnabled;
      if (this.perfOverlay) {
        this.perfOverlay.style.display = this.isPerfOverlayEnabled ? 'flex' : 'none';
      }
      perfOverlayCheckbox.addEventListener('change', () => {
        this.isPerfOverlayEnabled = perfOverlayCheckbox.checked;
        localStorage.setItem('wildwest_show_perf', this.isPerfOverlayEnabled ? 'true' : 'false');
        if (this.perfOverlay) {
          this.perfOverlay.style.display = this.isPerfOverlayEnabled ? 'flex' : 'none';
        }
      });
    }

    fullscreenBtn?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        fullscreenBtn.innerText = 'Оконный режим';
      } else {
        document.exitFullscreen().catch(() => {});
        fullscreenBtn.innerText = 'Полный экран';
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (fullscreenBtn) {
        fullscreenBtn.innerText = document.fullscreenElement ? 'Оконный режим' : 'Полный экран';
      }
    });

    openGuideBtn?.addEventListener('click', () => {
      this.showGuide();
    });

    settingsBackBtn?.addEventListener('click', () => {
      this.hideSettings();
      if (this.settingsFromPause) {
        this.showPause();
      } else {
        this.showMainMenu();
      }
    });

    // Exit Modal Buttons
    this.setupExitListeners();

    document.getElementById('btn-close-guide')?.addEventListener('click', () => {
      this.hideGuide();
    });

    // Host Lobby Hero Selector
    const hostHeroOpts = document.querySelectorAll<HTMLElement>('.lobby-hero-opt[data-host-hero]');
    hostHeroOpts.forEach((opt) => {
      opt.addEventListener('click', () => {
        hostHeroOpts.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        const hero = opt.getAttribute('data-host-hero') as CharacterType;
        this.hostSelectedHero = hero;
        if (this.onHostHeroChanged) {
          this.onHostHeroChanged(hero);
        }
      });
    });

    // Copy Room Code Button
    this.btnCopyCode.addEventListener('click', () => {
      const code = this.hostRoomCodeText.innerText.trim();
      navigator.clipboard?.writeText(code).then(() => {
        const origText = this.btnCopyCode.innerText;
        this.btnCopyCode.innerText = 'Скопировано!';
        setTimeout(() => {
          this.btnCopyCode.innerText = origText;
        }, 2000);
      });
    });

    // Host Start Expedition Button
    this.btnHostStart.addEventListener('click', () => {
      if (this.onHostStartExpedition) {
        this.onHostStartExpedition();
      }
    });

    this.btnHostBack.addEventListener('click', () => {
      this.hideHostLobby();
      this.showCoopMenu();
      if (this.onReturnToMenu) this.onReturnToMenu();
    });

    // Guest Lobby Hero Selector
    const guestHeroOpts = document.querySelectorAll<HTMLElement>('.lobby-hero-opt[data-guest-hero]');
    guestHeroOpts.forEach((opt) => {
      opt.addEventListener('click', () => {
        guestHeroOpts.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        this.guestSelectedHero = opt.getAttribute('data-guest-hero') as CharacterType;
        if (this.onGuestHeroChanged) {
          this.onGuestHeroChanged(this.guestSelectedHero);
        }
      });
    });

    // Guest Join Connect Button
    this.btnJoinConnect.addEventListener('click', () => {
      const code = this.joinRoomInput.value.trim().toUpperCase();
      if (!code) {
        this.setJoinStatus('Пожалуйста, введите код комнаты!', true);
        return;
      }
      this.btnJoinConnect.disabled = true;
      this.btnJoinConnect.innerText = '⏳ Подключение...';
      if (this.onGuestConnectClicked) {
        this.onGuestConnectClicked(code, this.guestSelectedHero);
      }
    });

    this.joinRoomInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.btnJoinConnect.click();
      }
    });

    this.btnGuestReady?.addEventListener('click', () => {
      this.isGuestReady = !this.isGuestReady;
      this.updateGuestReadyButtonUI();
      if (this.isGuestReady) {
        this.setJoinStatus('Вы готовы к походу! Ожидание старта командиром...', false);
      } else {
        const code = this.joinRoomInput.value.toUpperCase().trim();
        this.setJoinStatus(code ? `Подключено к ${code}! Нажмите «ГОТОВ» для подтверждения.` : 'Подключено к экспедиции! Нажмите «ГОТОВ» для подтверждения.', false);
      }
      if (this.onGuestReadyToggle) {
        this.onGuestReadyToggle(this.isGuestReady);
      }
    });

    this.btnJoinBack.addEventListener('click', () => {
      this.hideJoinLobby();
      this.showCoopMenu();
      if (this.onReturnToMenu) this.onReturnToMenu();
    });

    // Character Select Back Button
    this.btnCharSelectBack?.addEventListener('click', () => {
      this.hideCharacterSelect();
      this.showMainMenu();
      if (this.onReturnToMenu) this.onReturnToMenu();
    });

    // Bind Character Select Buttons
    const charCards = document.querySelectorAll('.character-card');
    charCards.forEach((card) => {
      card.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const hero = (target.getAttribute('data-hero') || 'ronin') as CharacterType;
        this.hideCharacterSelect();
        onSelectHero(hero);
      });
    });

    // Pause Resume & Settings & Restart & Menu
    this.btnResume.addEventListener('click', () => {
      this.hidePause();
      onResume();
    });

    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.hidePause();
      this.showSettings('pause');
    });

    this.btnPauseRestart.addEventListener('click', () => {
      this.hidePause();
      this.showCharacterSelect();
    });

    this.btnPauseMenu?.addEventListener('click', () => {
      this.hidePause();
      this.showMainMenu();
      if (this.onReturnToMenu) this.onReturnToMenu();
    });

    this.btnRestart.addEventListener('click', () => {
      this.hideGameOver();
      onRestart();
    });

    this.btnGameOverMenu?.addEventListener('click', () => {
      this.hideGameOver();
      this.showMainMenu();
      if (this.onReturnToMenu) this.onReturnToMenu();
    });
  }

  private setupExitListeners() {
    const exitMsg = document.getElementById('exit-message');
    const exitActions = document.getElementById('exit-actions-row');

    document.getElementById('btn-confirm-exit')?.addEventListener('click', () => {
      try {
        window.close();
      } catch {
        // ignore if blocked by browser
      }
      if (exitMsg) {
        exitMsg.innerHTML = '<strong>Сессия игры завершена.</strong><br>Вы можете безопасно закрыть эту вкладку браузера.<br><span style="font-size:12px;color:#a89f91;">Game session finished. You can now close this tab.</span>';
      }
      if (exitActions) {
        exitActions.innerHTML = '<button id="btn-exit-return" class="action-btn">Назад в меню / Return</button>';
        document.getElementById('btn-exit-return')?.addEventListener('click', () => {
          this.hideExitModal();
          this.showMainMenu();
          this.resetExitModal();
        });
      }
    });

    document.getElementById('btn-cancel-exit')?.addEventListener('click', () => {
      this.hideExitModal();
      this.showMainMenu();
      this.resetExitModal();
    });
  }

  private resetExitModal() {
    const exitMsg = document.getElementById('exit-message');
    const exitActions = document.getElementById('exit-actions-row');
    if (exitMsg) {
      exitMsg.innerHTML = 'Вы уверены, что хотите выйти из игры?<br><span style="font-size: 13px; color: #a89f91;">Are you sure you want to exit the game?</span>';
    }
    if (exitActions) {
      exitActions.innerHTML = '<button id="btn-confirm-exit" class="action-btn exit-btn-danger">Выйти / Exit</button><button id="btn-cancel-exit" class="action-btn secondary-btn">Отмена / Cancel</button>';
      this.setupExitListeners();
    }
  }

  public showMainMenu() {
    this.hideCoopMenu();
    this.hideSettings();
    this.hideExitModal();
    this.hideHostLobby();
    this.hideJoinLobby();
    this.hidePause();
    this.hideGameOver();
    this.hideLevelUp();
    this.hideGuide();
    this.mainMenuModal.classList.remove('hidden');
  }

  public hideMainMenu() {
    this.mainMenuModal.classList.add('hidden');
  }

  public showCoopMenu() {
    this.coopModal.classList.remove('hidden');
  }

  public hideCoopMenu() {
    this.coopModal.classList.add('hidden');
  }

  public showSettings(from: 'main' | 'pause' = 'main') {
    this.settingsFromPause = (from === 'pause');
    this.settingsModal.classList.remove('hidden');
  }

  public hideSettings() {
    this.settingsModal.classList.add('hidden');
  }

  public showExitModal() {
    this.resetExitModal();
    this.exitModal.classList.remove('hidden');
  }

  public hideExitModal() {
    this.exitModal.classList.add('hidden');
  }

  public showHostLobby(roomCode: string, hero: CharacterType) {
    this.hostRoomCodeText.innerText = roomCode;
    this.hostSelectedHero = hero;
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
      name: 'Командир (Вы)',
      hero: hero,
      charType: hero,
      heroName: this.getHeroName(hero),
      isHost: true,
      isReady: true,
      colorHex: 0xf59e0b,
      colorCss: '#f59e0b'
    };
    this.renderHostRoster([initialHostInfo]);
    this.hostLobbyModal.classList.remove('hidden');
  }

  public hideHostLobby() {
    this.hostLobbyModal.classList.add('hidden');
  }

  public setHostPartnerConnected(connected: boolean, hero?: CharacterType) {
    if (connected) {
      this.hostPartnerBox.className = 'partner-status-box connected';
      const heroName =
        hero === 'valkyrie'
          ? 'Каэла (Мечница)'
          : hero === 'flail'
          ? 'Бригитта (Цеп)'
          : hero === 'sorceress'
          ? 'Ария (Волшебница)'
          : hero === 'chakram'
          ? 'Кира (Чакрам)'
          : 'Рен (Ронин)';
      this.hostPartnerTitle.innerText = `Напарник подключился! (${heroName})`;
      this.hostPartnerDesc.innerText = 'Стрелок готов к экспедиции! Вы можете начать поход или дождаться остальных.';
      this.btnHostStart.disabled = false;
    } else {
      this.hostPartnerBox.className = 'partner-status-box waiting';
      this.hostPartnerTitle.innerText = 'Ожидание стрелков отряда...';
      this.hostPartnerDesc.innerText = 'Отправьте код комнаты друзьям. Можно начать поход в любой момент!';
      this.btnHostStart.disabled = false;
    }
  }

  public renderHostRoster(lobbyPlayers: LobbyPlayerInfo[]) {
    const list = lobbyPlayers && lobbyPlayers.length > 0 ? lobbyPlayers : [
      {
        id: 'p1',
        name: 'Командир (Вы)',
        hero: this.hostSelectedHero,
        charType: this.hostSelectedHero,
        isHost: true,
        isReady: true,
        colorHex: 0xf59e0b,
        colorCss: '#f59e0b'
      }
    ];
    this.renderRosterGrid(this.hostPlayersRoster, list);
    if (this.hostPlayerCount) {
      this.hostPlayerCount.innerText = `${list.length}`;
    }
    const countBadge = document.getElementById('host-player-count-badge');
    if (countBadge) {
      countBadge.innerText = `${list.length} / 5 СТРЕЛКОВ`;
    }

    const guests = list.filter(p => !p.isHost && p.id !== 'p1');
    const allGuestsReady = guests.length === 0 || guests.every(p => p.isReady);

    if (list.length > 1) {
      if (allGuestsReady) {
        this.hostPartnerBox.className = 'partner-status-box connected';
        this.hostPartnerTitle.innerText = `Отряд готов (${list.length}/5)! Все подтвердили готовность.`;
        this.hostPartnerDesc.innerText = 'Все стрелки готовы! Вы можете выдвигаться в экспедицию.';
        this.btnHostStart.disabled = false;
        this.btnHostStart.innerText = 'НАЧАТЬ ЭКСПЕДИЦИЮ';
      } else {
        const notReadyCount = guests.filter(p => !p.isReady).length;
        this.hostPartnerBox.className = 'partner-status-box waiting';
        this.hostPartnerTitle.innerText = `Ожидание подтверждения (${notReadyCount} не готовы)`;
        this.hostPartnerDesc.innerText = 'Игроки подключились, но ещё не нажали «ГОТОВ». Дождитесь подтверждения от всех стрелков.';
        this.btnHostStart.disabled = true;
        this.btnHostStart.innerText = 'ОЖИДАНИЕ ГОТОВНОСТИ ИГРОКОВ...';
      }
    } else {
      this.hostPartnerBox.className = 'partner-status-box waiting';
      this.hostPartnerTitle.innerText = 'Ожидание напарников в отряд...';
      this.hostPartnerDesc.innerText = 'Отправьте код комнаты друзьям. Можно начать поход в любой момент!';
      this.btnHostStart.disabled = false;
      this.btnHostStart.innerText = 'НАЧАТЬ ЭКСПЕДИЦИЮ';
    }
  }

  public renderJoinRoster(lobbyPlayers: LobbyPlayerInfo[]) {
    if (this.joinRosterSection) {
      this.joinRosterSection.classList.remove('hidden');
    }
    this.renderRosterGrid(this.joinPlayersRoster, lobbyPlayers);
    if (this.joinPlayerCount) {
      this.joinPlayerCount.innerText = `${lobbyPlayers.length}`;
    }
    const countBadge = document.getElementById('join-player-count-badge');
    if (countBadge) {
      countBadge.innerText = `${lobbyPlayers.length} / 5 СТРЕЛКОВ`;
    }
    if (!this.isGuestConnected) {
      this.setGuestConnectedMode(true);
    }
    if (this.isGuestReady) {
      this.setJoinStatus('Вы готовы к походу! Ожидание старта командиром...', false);
    } else {
      const code = this.joinRoomInput.value.toUpperCase().trim();
      this.setJoinStatus(code ? `Подключено к ${code}! Нажмите «ГОТОВ» для подтверждения.` : 'Подключено к экспедиции! Нажмите «ГОТОВ» для подтверждения.', false);
    }
  }

  private renderRosterGrid(container: HTMLElement, lobbyPlayers: LobbyPlayerInfo[]) {
    if (!container) return;
    container.innerHTML = '';

    const slotLabels = ['ИГРОК 1 (ХОСТ)', 'ИГРОК 2', 'ИГРОК 3', 'ИГРОК 4', 'ИГРОК 5'];
    const slotKeys = ['p1', 'p2', 'p3', 'p4', 'p5'];

    for (let i = 0; i < 5; i++) {
      const slotKey = slotKeys[i];
      const slotLabel = slotLabels[i];
      const player = lobbyPlayers.find(p => p.id === slotKey) || (i < lobbyPlayers.length ? lobbyPlayers[i] : null);

      const card = document.createElement('div');
      if (player) {
        const hero = player.hero || player.charType || 'ronin';
        const heroName = this.getHeroName(hero);
        const isHost = player.isHost || player.id === 'p1';
        const statusHtml = isHost
          ? '<div class="slot-status ready">ХОСТ</div>'
          : player.isReady
          ? '<div class="slot-status ready">ГОТОВ</div>'
          : '<div class="slot-status not-ready">НЕ ГОТОВ</div>';

        card.className = 'roster-slot-card occupied';
        card.style.borderColor = player.colorCss;
        card.innerHTML = `
          <div class="slot-tag slot-${player.id}">${slotLabel}</div>
          <img src="${this.getHeroAvatar(hero)}" class="slot-avatar" alt="${heroName}" />
          <div class="slot-player-name" style="color: ${player.colorCss};">${player.name}</div>
          <div class="slot-hero-name">${heroName}</div>
          ${statusHtml}
        `;
      } else {
        card.className = 'roster-slot-card empty';
        card.innerHTML = `
          <div class="slot-tag">${slotLabel}</div>
          <div class="slot-empty-icon">+</div>
          <div class="slot-player-name" style="opacity: 0.6;">Свободно</div>
          <div class="slot-hero-name" style="opacity: 0.5;">Слот ${i + 1}</div>
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
    return charType === 'ronin'
      ? 'Рен «Ронин»'
      : charType === 'valkyrie'
      ? 'Каэла «Меч»'
      : charType === 'flail'
      ? 'Бригитта «Цеп»'
      : charType === 'sorceress'
      ? 'Ария «Посох»'
      : 'Кира «Чакрам»';
  }

  public getHeroAvatar(charType: CharacterType): string {
    return charType === 'ronin'
      ? '/textures/hero_ronin_front.png'
      : charType === 'valkyrie'
      ? '/textures/hero_valkyrie_front.png'
      : charType === 'flail'
      ? '/textures/hero_flail_front.png'
      : charType === 'sorceress'
      ? '/textures/hero_sorceress_front.png'
      : '/textures/hero_chakram_front.png';
  }

  public updateGuestReadyButtonUI() {
    if (!this.btnGuestReady) return;
    if (this.isGuestReady) {
      this.btnGuestReady.classList.remove('is-not-ready');
      this.btnGuestReady.classList.add('is-ready');
      this.btnGuestReady.innerText = 'ВЫ ГОТОВЫ (НАЖМИТЕ ДЛЯ ОТМЕНЫ)';
    } else {
      this.btnGuestReady.classList.remove('is-ready');
      this.btnGuestReady.classList.add('is-not-ready');
      this.btnGuestReady.innerText = 'НАЖМИТЕ «ГОТОВ»';
    }
  }

  public setGuestConnectedMode(connected: boolean) {
    this.isGuestConnected = connected;
    if (this.btnGuestReady) {
      if (connected) {
        this.btnGuestReady.classList.remove('hidden');
        this.updateGuestReadyButtonUI();
      } else {
        this.btnGuestReady.classList.add('hidden');
        this.isGuestReady = false;
      }
    }
    if (this.btnJoinConnect) {
      if (connected) {
        this.btnJoinConnect.classList.add('hidden');
      } else {
        this.btnJoinConnect.classList.remove('hidden');
        this.btnJoinConnect.disabled = false;
        this.btnJoinConnect.innerText = 'ПОДКЛЮЧИТЬСЯ';
      }
    }
    if (this.joinRoomInput) {
      this.joinRoomInput.disabled = connected;
    }
  }

  public showJoinLobby(defaultHero: CharacterType = 'valkyrie') {
    this.joinRoomInput.value = '';
    this.isGuestReady = false;
    this.isGuestConnected = false;
    this.setGuestConnectedMode(false);
    this.setJoinStatus('Введите код комнаты хоста и нажмите «Подключиться»', false);
    if (this.joinRosterSection) {
      this.joinRosterSection.classList.add('hidden');
    }
    this.guestSelectedHero = defaultHero;
    const guestHeroOpts = document.querySelectorAll<HTMLElement>('.lobby-hero-opt[data-guest-hero]');
    guestHeroOpts.forEach((opt) => {
      if (opt.getAttribute('data-guest-hero') === defaultHero) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
    this.joinLobbyModal.classList.remove('hidden');
  }

  public hideJoinLobby() {
    this.setGuestConnectedMode(false);
    this.joinLobbyModal.classList.add('hidden');
  }

  public setJoinStatus(text: string, isError: boolean = false) {
    this.joinStatusText.innerText = text;
    this.joinStatusText.style.color = isError ? '#ef4444' : '#fbbf24';
  }

  public showGuide() {
    this.guideModal.classList.remove('hidden');
  }

  public hideGuide() {
    this.guideModal.classList.add('hidden');
  }

  public setCoopBadge(roomCode: string | null) {
    if (roomCode) {
      this.coopBadge.classList.remove('hidden');
      this.coopRoomName.innerText = `КООП: ${roomCode}`;
    } else {
      this.coopBadge.classList.add('hidden');
    }
  }

  public updatePoeParty(
    localPlayer: Player,
    remotePlayers: Map<string, RemotePlayer>,
    mySlotId: string = 'p1',
    role: string = 'solo',
    lobbyPlayers: LobbyPlayerInfo[] = []
  ) {
    if (!this.poePartyList) return;

    // Collect all party members
    const members: {
      id: string;
      name: string;
      hero: CharacterType;
      colorCss: string;
      hp: number;
      maxHp: number;
      level: number;
      xp: number;
      xpToNextLevel: number;
      isDowned: boolean;
      reviveProgress: number;
      isLocal: boolean;
      hasInvuln: boolean;
      weapons: { id: string; name: string; icon: string; level: number }[];
      buffs: { type: BuffType; icon: string; duration: number }[];
    }[] = [];

    // 1. Local Player
    const localRoleName =
      role === 'host'
        ? 'Командир (Вы)'
        : role === 'client'
        ? `Стрелок ${mySlotId.toUpperCase()} (Вы)`
        : 'Вы';
    const localColor = (PLAYER_COLORS[mySlotId]?.css) || '#f59e0b';
    const localBuffs: { type: BuffType; icon: string; duration: number }[] = [];
    for (const b of localPlayer.activeBuffs.values()) {
      localBuffs.push({ type: b.type, icon: b.icon, duration: b.duration });
    }

    members.push({
      id: mySlotId || 'p1',
      name: localRoleName,
      hero: localPlayer.charType,
      colorCss: localColor,
      hp: localPlayer.hp,
      maxHp: localPlayer.maxHp,
      level: localPlayer.level,
      xp: localPlayer.xp,
      xpToNextLevel: localPlayer.xpToNextLevel,
      isDowned: localPlayer.isDowned,
      reviveProgress: localPlayer.reviveProgress,
      isLocal: true,
      hasInvuln: localPlayer.hasBuff('invulnerable'),
      weapons: localPlayer.weapons.map(w => ({ id: w.id, name: w.name, icon: w.icon, level: w.level })),
      buffs: localBuffs
    });

    // 2. Remote Teammates
    for (const [id, rp] of remotePlayers) {
      const pInfo = lobbyPlayers.find(p => p.id === id);
      const rpBuffs: { type: BuffType; icon: string; duration: number }[] = [];
      for (const b of rp.activeBuffs.values()) {
        rpBuffs.push({ type: b.type, icon: b.icon, duration: b.duration });
      }

      members.push({
        id,
        name: pInfo?.name || rp.name,
        hero: rp.charType,
        colorCss: rp.colorCss,
        hp: rp.hp,
        maxHp: rp.maxHp,
        level: rp.level,
        xp: rp.xp,
        xpToNextLevel: rp.xpToNextLevel,
        isDowned: rp.isDowned,
        reviveProgress: rp.reviveProgress,
        isLocal: false,
        hasInvuln: rp.activeBuffs.has('invulnerable'),
        weapons: rp.weapons,
        buffs: rpBuffs
      });
    }

    const currentIds = new Set<string>();

    for (const m of members) {
      currentIds.add(m.id);
      let el = this.poePartyList.querySelector<HTMLElement>(`.poe-party-member[data-player-id="${m.id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = `poe-party-member ${m.isLocal ? 'is-local' : ''}`;
        el.setAttribute('data-player-id', m.id);
        el.innerHTML = `
          <div class="poe-portrait-box">
            <img class="poe-portrait-img" src="${this.getHeroAvatar(m.hero)}" alt="${this.getHeroName(m.hero)}" />
            <div class="poe-swirl-crest" style="border-color: ${m.colorCss};">${m.id.toUpperCase()}</div>
            <div class="poe-downed-skull hidden">†</div>
          </div>
          <div class="poe-member-content">
            <div class="poe-name-row">
              <span class="poe-member-name" style="color: ${m.colorCss};">${m.name}</span>
              <span class="poe-class-tag">${this.getHeroName(m.hero)}</span>
              <span class="poe-level-tag">L${m.level}</span>
            </div>
            <div class="poe-hp-frame">
              <div class="poe-hp-track">
                <div class="poe-hp-fill" style="width: 100%;"></div>
                <div class="poe-hp-glass-shine"></div>
                <span class="poe-hp-text">100 / 100</span>
                <div class="poe-downed-badge hidden">РАНЕН!</div>
              </div>
            </div>
            <div class="poe-xp-frame" title="Прогресс опыта">
              <div class="poe-xp-fill" style="width: 0%;"></div>
            </div>
            <div class="poe-meta-row">
              <div class="poe-member-weapons"></div>
              <div class="poe-member-buffs"></div>
            </div>
          </div>
        `;
        this.poePartyList.appendChild(el);
      }

      // Update avatar if changed
      const imgEl = el.querySelector<HTMLImageElement>('.poe-portrait-img');
      const expectedAvatar = this.getHeroAvatar(m.hero);
      if (imgEl && imgEl.getAttribute('src') !== expectedAvatar) {
        imgEl.src = expectedAvatar;
      }

      // Update name & class & level
      const nameEl = el.querySelector<HTMLElement>('.poe-member-name');
      if (nameEl && nameEl.innerText !== m.name) {
        nameEl.innerText = m.name;
        nameEl.style.color = m.colorCss;
      }

      const classEl = el.querySelector<HTMLElement>('.poe-class-tag');
      const expectedClass = this.getHeroName(m.hero);
      if (classEl && classEl.innerText !== expectedClass) {
        classEl.innerText = expectedClass;
      }

      const lvlEl = el.querySelector<HTMLElement>('.poe-level-tag');
      if (lvlEl && lvlEl.innerText !== `L${m.level}`) {
        lvlEl.innerText = `L${m.level}`;
      }

      // Update HP
      const hpPct = Math.max(0, Math.min(100, (m.hp / (m.maxHp || 100)) * 100));
      const hpFillEl = el.querySelector<HTMLElement>('.poe-hp-fill');
      if (hpFillEl) {
        hpFillEl.style.width = `${hpPct}%`;
      }
      const hpTextEl = el.querySelector<HTMLElement>('.poe-hp-text');
      if (hpTextEl) {
        hpTextEl.innerText = `${Math.ceil(m.hp)} / ${m.maxHp}`;
      }

      // Invulnerable frame glow
      const hpFrameEl = el.querySelector<HTMLElement>('.poe-hp-frame');
      if (hpFrameEl) {
        if (m.hasInvuln) {
          hpFrameEl.classList.add('is-invulnerable');
        } else {
          hpFrameEl.classList.remove('is-invulnerable');
        }
      }

      // Downed / Reviving status
      const skullEl = el.querySelector<HTMLElement>('.poe-downed-skull');
      const downedBadgeEl = el.querySelector<HTMLElement>('.poe-downed-badge');
      if (m.isDowned) {
        if (!el.classList.contains('is-downed')) el.classList.add('is-downed');
        skullEl?.classList.remove('hidden');
        downedBadgeEl?.classList.remove('hidden');
        if (downedBadgeEl) {
          if (m.reviveProgress > 0) {
            downedBadgeEl.classList.add('reviving');
            downedBadgeEl.innerText = `ПОДЪЁМ ${Math.round(m.reviveProgress * 100)}%`;
          } else {
            downedBadgeEl.classList.remove('reviving');
            downedBadgeEl.innerText = 'РАНЕН!';
          }
        }
      } else {
        if (el.classList.contains('is-downed')) el.classList.remove('is-downed');
        skullEl?.classList.add('hidden');
        downedBadgeEl?.classList.add('hidden');
      }

      // Update XP Progress Bar
      const xpPct = Math.max(0, Math.min(100, (m.xp / (m.xpToNextLevel || 10)) * 100));
      const xpFillEl = el.querySelector<HTMLElement>('.poe-xp-fill');
      if (xpFillEl) {
        xpFillEl.style.width = `${xpPct}%`;
      }

      // Update weapons row
      const weaponsRow = el.querySelector<HTMLElement>('.poe-member-weapons');
      if (weaponsRow) {
        let weaponsHtml = '';
        for (const w of m.weapons) {
          weaponsHtml += `<span class="poe-weapon-pill" title="${w.name} (Ур. ${w.level})"><span class="pill-icon">${w.icon}</span><span class="pill-lvl">L${w.level}</span></span>`;
        }
        if (weaponsRow.innerHTML !== weaponsHtml) {
          weaponsRow.innerHTML = weaponsHtml;
        }
      }

      // Update buffs row
      const buffsRow = el.querySelector<HTMLElement>('.poe-member-buffs');
      if (buffsRow) {
        let buffsHtml = '';
        for (const b of m.buffs) {
          const sec = Math.ceil(b.duration);
          buffsHtml += `<span class="poe-buff-pill" title="Баф алтаря (${sec}с)"><span class="pill-icon">${b.icon}</span><span class="pill-sec">${sec}с</span></span>`;
        }
        if (buffsRow.innerHTML !== buffsHtml) {
          buffsRow.innerHTML = buffsHtml;
        }
      }
    }

    // Remove any members who left
    const allRendered = Array.from(this.poePartyList.querySelectorAll<HTMLElement>('.poe-party-member'));
    for (const card of allRendered) {
      const pid = card.getAttribute('data-player-id');
      if (pid && !currentIds.has(pid)) {
        card.remove();
      }
    }
  }

  public updateTeammates(
    remotePlayers: Map<string, RemotePlayer>,
    localPlayer?: Player,
    mySlotId: string = 'p1',
    role: string = 'solo',
    lobbyPlayers: LobbyPlayerInfo[] = []
  ) {
    if (localPlayer) {
      this.updatePoeParty(localPlayer, remotePlayers, mySlotId, role, lobbyPlayers);
    }
  }

  public clearTeammates() {
    if (this.teammatesHpTray) this.teammatesHpTray.innerHTML = '';
    if (this.poePartyList) {
      const remoteCards = Array.from(this.poePartyList.querySelectorAll<HTMLElement>('.poe-party-member:not(.is-local)'));
      for (const card of remoteCards) {
        card.remove();
      }
    }
  }

  public updatePartnerHp(hp: number, maxHp: number, isDowned: boolean) {
    if (this.partnerHpContainer) {
      this.partnerHpContainer.classList.remove('hidden');
      const pct = Math.max(0, Math.min(100, (hp / (maxHp || 100)) * 100));
      if (this.partnerHpFill) this.partnerHpFill.style.width = `${pct}%`;
      if (this.partnerHpText) {
        if (isDowned) {
          this.partnerHpText.innerText = 'РАНЕН!';
          this.partnerHpText.style.color = '#ef4444';
        } else {
          this.partnerHpText.innerText = `${Math.ceil(hp)} / ${maxHp}`;
          this.partnerHpText.style.color = '#e0f2fe';
        }
      }
    }
  }

  public hidePartnerHp() {
    if (this.partnerHpContainer) {
      this.partnerHpContainer.classList.add('hidden');
    }
    this.clearTeammates();
  }

  public showCharacterSelect() {
    this.charSelectModal.classList.remove('hidden');
  }

  public hideCharacterSelect() {
    this.charSelectModal.classList.add('hidden');
  }

  public showPause() {
    this.isPaused = true;
    this.pauseModal.classList.remove('hidden');
  }

  public hidePause() {
    this.isPaused = false;
    this.pauseModal.classList.add('hidden');
  }

  public togglePause(onResume: () => void, onPause: () => void) {
    if (this.isPaused) {
      this.hidePause();
      onResume();
    } else {
      this.showPause();
      onPause();
    }
  }

  public update(
    player: Player,
    totalKills: number,
    gameTime: number,
    activeBoss: Enemy | null,
    partnerKills?: number
  ) {
    // XP Bar
    const xpPercent = Math.min(100, Math.max(0, (player.xp / player.xpToNextLevel) * 100));
    this.xpFill.style.width = `${xpPercent}%`;
    this.playerLevel.innerText = `${player.level}`;

    // Timer
    const mins = Math.floor(gameTime / 60);
    const secs = Math.floor(gameTime % 60);
    this.timerText.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Kills
    this.killCountText.innerText = `${totalKills}`;

    if (player.isCoop && partnerKills !== undefined) {
      this.coopKillsDetail.classList.remove('hidden');
      this.myKillsCount.innerText = `${player.kills}`;
      this.partnerKillsCount.innerText = `${partnerKills}`;
    } else {
      this.coopKillsDetail.classList.add('hidden');
    }

    // HP Bar
    const hpPercent = Math.min(100, Math.max(0, (player.hp / player.maxHp) * 100));
    if (this.hpFill) {
      this.hpFill.style.width = `${hpPercent}%`;
    }
    if (this.hpText) {
      this.hpText.innerText = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    }

    // In single player, keep PoE party list updated with local player
    if (!player.isCoop && this.poePartyList) {
      this.updatePoeParty(player, new Map(), 'p1', 'solo');
    }

    // Active Weapons Bar
    this.updateWeaponsBar(player.weapons);

    // Active Shrine Buffs Tray
    this.updateBuffsTray(player.activeBuffs);

    // Boss Bar
    if (activeBoss && activeBoss.isAlive) {
      this.bossHpContainer.classList.remove('hidden');
      if (this.bossNameText) {
        this.bossNameText.innerText = activeBoss.name.toUpperCase();
      }
      if (activeBoss.isImmortal) {
        this.bossHpFill.style.width = '100%';
        this.bossHpFill.style.background = 'linear-gradient(90deg, #7e22ce, #c084fc)';
        this.bossHpText.innerText = 'БЕССМЕРТЕН (∞)';
      } else {
        const bossHpPercent = Math.min(100, Math.max(0, (activeBoss.hp / activeBoss.maxHp) * 100));
        this.bossHpFill.style.width = `${bossHpPercent}%`;
        this.bossHpFill.style.background = 'linear-gradient(90deg, #b91c1c, #ef4444)';
        this.bossHpText.innerText = `${Math.max(0, Math.ceil(activeBoss.hp))} / ${activeBoss.maxHp}`;
      }
    } else {
      this.bossHpContainer.classList.add('hidden');
    }
  }

  public triggerAltarNotification(name: string, subtitle: string, _icon: string, color: string) {
    if (this.altarBannerTimeout !== null) {
      window.clearTimeout(this.altarBannerTimeout);
      this.altarBannerTimeout = null;
    }

    this.altarBannerText.innerText = `${name.toUpperCase()} ЗАХВАЧЕН! ${subtitle}`;
    this.altarBannerText.style.color = color;
    this.altarBanner.style.borderColor = color;
    this.altarBanner.style.boxShadow = 'none';
    this.altarBanner.classList.remove('hidden');

    this.altarBannerTimeout = window.setTimeout(() => {
      this.altarBanner.classList.add('hidden');
      this.altarBannerTimeout = null;
    }, 3800);
  }

  public updateBuffsTray(activeBuffs: Map<BuffType, ActiveBuff>) {
    if (activeBuffs.size === 0) {
      if (this.buffsTray.children.length > 0) {
        this.buffsTray.innerHTML = '';
      }
      return;
    }

    const currentTypes = new Set<string>();

    for (const buff of activeBuffs.values()) {
      currentTypes.add(buff.type);
      const secs = Math.max(1, Math.ceil(buff.duration));
      const pct = Math.max(0, Math.min(100, (buff.duration / buff.maxDuration) * 100));
      // Blinks starting from 3 seconds remaining until expiration
      const isExpiring = buff.duration <= 3.0 && buff.duration > 0;

      let slot = this.buffsTray.querySelector<HTMLElement>(`[data-buff-type="${buff.type}"]`);
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'buff-slot';
        slot.setAttribute('data-buff-type', buff.type);
        slot.style.borderColor = buff.color;
        slot.style.boxShadow = `0 0 12px ${buff.color}60`;
        slot.innerHTML = `
          <div class="buff-icon-wrap">
            <span class="buff-icon">${buff.icon}</span>
          </div>
          <div class="buff-timer">${secs}с</div>
          <div class="buff-progress-track">
            <div class="buff-progress-fill" style="width: ${pct}%; background-color: ${buff.color};"></div>
          </div>
        `;
        this.buffsTray.appendChild(slot);
      }

      slot.title = `${buff.name} (${secs}с)`;

      // Update timer text
      const timerEl = slot.querySelector<HTMLElement>('.buff-timer');
      if (timerEl && timerEl.innerText !== `${secs}с`) {
        timerEl.innerText = `${secs}с`;
      }

      // Update progress bar
      const fillEl = slot.querySelector<HTMLElement>('.buff-progress-fill');
      if (fillEl) {
        fillEl.style.width = `${pct}%`;
      }

      // Toggle expiring blinking state
      if (isExpiring) {
        if (!slot.classList.contains('buff-expiring')) {
          slot.classList.add('buff-expiring');
        }
      } else {
        if (slot.classList.contains('buff-expiring')) {
          slot.classList.remove('buff-expiring');
        }
      }
    }

    // Remove any slots for buffs that have expired/disappeared
    const slots = Array.from(this.buffsTray.querySelectorAll<HTMLElement>('.buff-slot'));
    for (const slot of slots) {
      const type = slot.getAttribute('data-buff-type');
      if (type && !currentTypes.has(type)) {
        slot.remove();
      }
    }
  }

  public triggerBossWarning(bossName?: string, tier?: number) {
    if (this.bossWarningTimeout !== null) {
      window.clearTimeout(this.bossWarningTimeout);
      this.bossWarningTimeout = null;
    }
    const name = bossName || (tier ? `КРОВАВЫЙ ШЕРИФ (УР. ${tier})` : 'КРОВАВЫЙ ШЕРИФ');
    if (this.bossWarningText) {
      this.bossWarningText.innerText = `ВНИМАНИЕ: ПОЯВИЛСЯ БОСС «${name.toUpperCase()}»!`;
      this.bossWarningText.style.color = '#fbbf24';
    }
    this.bossWarningBanner.style.borderColor = '#d97706';
    this.bossWarningBanner.style.boxShadow = '0 0 35px rgba(217, 119, 6, 0.6)';
    this.bossWarningBanner.classList.remove('hidden');
    SoundManager.playLevelUp(); // dramatic alert
    this.bossWarningTimeout = window.setTimeout(() => {
      this.bossWarningBanner.classList.add('hidden');
      this.bossWarningTimeout = null;
    }, 4500);
  }

  public triggerImmortalBossWarning(bossName?: string) {
    if (this.bossWarningTimeout !== null) {
      window.clearTimeout(this.bossWarningTimeout);
      this.bossWarningTimeout = null;
    }
    const name = bossName || 'БЕССМЕРТНЫЙ ЖНЕЦ ПРЕРИИ';
    if (this.bossWarningText) {
      this.bossWarningText.innerText = `НАСТУПИЛА ПОЛНОЧЬ (30 МИНУТ): ПОЯВИЛСЯ ${name.toUpperCase()}! СМЕРТЬ НЕИЗБЕЖНА!`;
      this.bossWarningText.style.color = '#e9d5ff';
    }
    this.bossWarningBanner.style.borderColor = '#a855f7';
    this.bossWarningBanner.style.boxShadow = '0 0 45px rgba(168, 85, 247, 0.85)';
    this.bossWarningBanner.classList.remove('hidden');
    SoundManager.playReaperSpawn();
    this.bossWarningTimeout = window.setTimeout(() => {
      this.bossWarningBanner.classList.add('hidden');
      this.bossWarningTimeout = null;
    }, 5500);
  }

  public resetBossUI() {
    if (this.bossWarningTimeout !== null) {
      window.clearTimeout(this.bossWarningTimeout);
      this.bossWarningTimeout = null;
    }
    this.bossWarningBanner.classList.add('hidden');
    this.bossHpContainer.classList.add('hidden');

    if (this.altarBannerTimeout !== null) {
      window.clearTimeout(this.altarBannerTimeout);
      this.altarBannerTimeout = null;
    }
    this.altarBanner.classList.add('hidden');
    this.buffsTray.innerHTML = '';
  }

  private updateWeaponsBar(weapons: Weapon[]) {
    const currentWeaponIds = new Set<string>();
    for (const weapon of weapons) {
      currentWeaponIds.add(weapon.id);
      let slot = this.weaponsBar.querySelector<HTMLElement>(`[data-weapon-id="${weapon.id}"]`);
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'weapon-slot';
        slot.setAttribute('data-weapon-id', weapon.id);
        slot.title = `${weapon.name} (Ур. ${weapon.level})`;
        slot.innerHTML = `
          <span class="weapon-icon">${weapon.icon}</span>
          <span class="weapon-level">lvl ${weapon.level}</span>
        `;
        this.weaponsBar.appendChild(slot);
      } else {
        const lvlEl = slot.querySelector<HTMLElement>('.weapon-level');
        if (lvlEl && lvlEl.innerText !== `lvl ${weapon.level}`) {
          lvlEl.innerText = `lvl ${weapon.level}`;
          slot.title = `${weapon.name} (Ур. ${weapon.level})`;
        }
      }
    }

    // Remove any slots for weapons no longer held
    const slots = Array.from(this.weaponsBar.querySelectorAll<HTMLElement>('.weapon-slot'));
    for (const slot of slots) {
      const id = slot.getAttribute('data-weapon-id');
      if (id && !currentWeaponIds.has(id)) {
        slot.remove();
      }
    }
  }

  public showLevelUp(player: Player, onSelect: () => void) {
    SoundManager.playLevelUp();
    this.levelUpModal.classList.remove('hidden');

    const weaponOptions = this.generateWeaponOptions(player);

    if (weaponOptions.length > 0) {
      // Step 1: Choose 1 Active Weapon / Upgrade
      this.renderWeaponStep(weaponOptions, () => {
        // Step 2: Choose 1 Passive Skill
        this.renderPassiveStep(player, onSelect);
      });
    } else {
      // All 5 weapons are maxed at level 20: proceed directly to passive step
      this.renderPassiveStep(player, onSelect);
    }
  }

  private renderWeaponStep(options: UpgradeOption[], onNextStep: () => void) {
    if (this.levelUpStepIndicator) {
      this.levelUpStepIndicator.innerHTML = 'ШАГ 1 ИЗ 2 &bull; ВЫБОР ОРУЖИЯ';
      this.levelUpStepIndicator.style.color = '#fbbf24';
    }
    if (this.levelUpTitle) {
      this.levelUpTitle.innerText = 'ВЫБЕРИТЕ ОРУЖИЕ';
    }

    this.upgradeCardsContainer.innerHTML = '';
    for (const opt of options) {
      const card = document.createElement('div');
      card.className = 'upgrade-card card-weapon-step';
      card.innerHTML = `
        <div class="card-icon">${opt.icon}</div>
        <div class="card-title">${opt.title}</div>
        <div class="card-level-tag">${opt.levelTag}</div>
        <div class="card-description">${opt.description}</div>
      `;

      card.addEventListener('click', () => {
        opt.apply();
        SoundManager.playShoot();
        onNextStep();
      });

      this.upgradeCardsContainer.appendChild(card);
    }
  }

  private renderPassiveStep(player: Player, onFinished: () => void) {
    if (this.levelUpStepIndicator) {
      this.levelUpStepIndicator.innerHTML = 'ШАГ 2 ИЗ 2 &bull; ПАССИВНЫЙ НАВЫК';
      this.levelUpStepIndicator.style.color = '#38bdf8';
    }
    if (this.levelUpTitle) {
      this.levelUpTitle.innerText = 'ВЫБЕРИТЕ ПАССИВНЫЙ НАВЫК';
    }

    this.upgradeCardsContainer.innerHTML = '';
    const passiveOptions = this.generatePassiveOptions(player);

    for (const opt of passiveOptions) {
      const card = document.createElement('div');
      card.className = 'upgrade-card card-passive-step';
      card.innerHTML = `
        <div class="card-icon">${opt.icon}</div>
        <div class="card-title">${opt.title}</div>
        <div class="card-level-tag passive-tag">${opt.levelTag}</div>
        <div class="card-description">${opt.description}</div>
      `;

      card.addEventListener('click', () => {
        opt.apply();
        SoundManager.playBuffExpire();
        this.hideLevelUp();
        onFinished();
      });

      this.upgradeCardsContainer.appendChild(card);
    }
  }

  private hideLevelUp() {
    this.levelUpModal.classList.add('hidden');
  }

  public showGameOver(
    timeStr: string,
    playerStats: PlayerStats,
    partnerStats?: PlayerStats | null,
    isCoop: boolean = false,
    isVictory: boolean = false,
    weapons?: Weapon[],
    allPlayersResults?: DetailedPlayerResult[]
  ) {
    if (isVictory) {
      SoundManager.playVictory();
      this.gameOverCard.classList.add('victory-mode');
      this.victoryBadge.classList.remove('hidden');
      this.victoryStatsPrompt.classList.remove('hidden');
      this.gameOverTitle.innerText = 'ВЫ ПОБЕДИЛИ!';
      this.gameOverTitle.className = 'death-title victory-title';
      this.gameOverSubtitle.innerText =
        'Вы выдержали легендарные 30 минут в беспощадной пустыне! Бессмертный Жнец забрал вашу душу, но легенда о вас будет жить вечно!';
      this.gameOverSubtitle.className = 'death-subtitle victory-subtitle';
      this.btnRestart.innerText = 'Начать новую экспедицию';
    } else {
      SoundManager.playGameOver();
      this.gameOverCard.classList.remove('victory-mode');
      this.victoryBadge.classList.add('hidden');
      this.victoryStatsPrompt.classList.add('hidden');
      this.gameOverTitle.innerText = 'ВЫ ПОГИБЛИ';
      this.gameOverTitle.className = 'death-title';
      this.gameOverSubtitle.innerText = 'Пустыня не прощает ошибок...';
      this.gameOverSubtitle.className = 'death-subtitle';
      this.btnRestart.innerText = 'Возродиться';
    }

    if (weapons && weapons.length > 0 && this.arsenalItemsList) {
      this.arsenalItemsList.innerHTML = weapons
        .map(
          (w) =>
            `<div class="arsenal-tag"><span class="tag-icon">${w.icon}</span><span class="tag-name">${w.name}</span><span class="tag-lvl">lvl ${w.level}</span></div>`
        )
        .join('');
    }

    if (isCoop && ((allPlayersResults && allPlayersResults.length > 0) || partnerStats)) {
      this.soloGameOverStats.classList.add('hidden');
      this.coopGameOverStats.classList.remove('hidden');
      this.coopFinalTime.innerText = timeStr;

      if (allPlayersResults && allPlayersResults.length > 0) {
        let maxKills = 0;
        let maxDamage = 0;
        let totalTeamKills = 0;
        for (const p of allPlayersResults) {
          if (p.stats.kills > maxKills) maxKills = p.stats.kills;
          if (p.stats.damageDealt > maxDamage) maxDamage = p.stats.damageDealt;
          totalTeamKills += p.stats.kills;
        }

        let theadHtml = '<tr><th>Параметр</th>';
        for (const p of allPlayersResults) {
          theadHtml += `<th style="color: ${p.colorCss};">${p.name}</th>`;
        }
        theadHtml += '</tr>';
        if (this.coopStatsThead) this.coopStatsThead.innerHTML = theadHtml;

        let tbodyHtml = '';

        // Row 1: Kills
        tbodyHtml += '<tr><td>Убийств</td>';
        for (const p of allPlayersResults) {
          const isMvp = p.stats.kills === maxKills && maxKills > 0;
          tbodyHtml += `<td class="${isMvp ? 'mvp-cell' : ''}">${p.stats.kills}${isMvp ? ' [MVP]' : ''}</td>`;
        }
        tbodyHtml += '</tr>';

        // Row 2: Damage
        tbodyHtml += '<tr><td>Урон</td>';
        for (const p of allPlayersResults) {
          const isMvp = p.stats.damageDealt === maxDamage && maxDamage > 0;
          tbodyHtml += `<td class="${isMvp ? 'mvp-cell' : ''}">${Math.round(p.stats.damageDealt)}${isMvp ? ' [MAX]' : ''}</td>`;
        }
        tbodyHtml += '</tr>';

        // Row 3: Level
        tbodyHtml += '<tr><td>Уровень</td>';
        for (const p of allPlayersResults) {
          tbodyHtml += `<td>${p.stats.level}</td>`;
        }
        tbodyHtml += '</tr>';

        // Row 4: Revives
        tbodyHtml += '<tr><td>Спасений</td>';
        for (const p of allPlayersResults) {
          tbodyHtml += `<td>${p.stats.revives}</td>`;
        }
        tbodyHtml += '</tr>';

        // Row 5: Total Team Kills
        tbodyHtml += `<tr class="total-row"><td>Врагов команды</td><td colspan="${allPlayersResults.length}">${totalTeamKills}</td></tr>`;

        if (this.coopStatsTbody) this.coopStatsTbody.innerHTML = tbodyHtml;
      } else if (partnerStats) {
        this.coopP1Kills.innerText = `${playerStats.kills}`;
        this.coopP2Kills.innerText = `${partnerStats.kills}`;
        this.coopP1Damage.innerText = `${Math.round(playerStats.damageDealt)}`;
        this.coopP2Damage.innerText = `${Math.round(partnerStats.damageDealt)}`;
        this.coopP1Level.innerText = `${playerStats.level}`;
        this.coopP2Level.innerText = `${partnerStats.level}`;
        this.coopP1Revives.innerText = `${playerStats.revives}`;
        this.coopP2Revives.innerText = `${partnerStats.revives}`;
        this.coopTotalKills.innerText = `${playerStats.kills + partnerStats.kills}`;
      }
    } else {
      this.soloGameOverStats.classList.remove('hidden');
      this.coopGameOverStats.classList.add('hidden');

      this.finalTime.innerText = timeStr;
      this.finalKills.innerText = `${playerStats.kills}`;
      this.finalDamage.innerText = `${Math.round(playerStats.damageDealt)}`;
      this.finalLevel.innerText = `${playerStats.level}`;
    }

    this.gameOverModal.classList.remove('hidden');
  }

  public hideGameOver() {
    this.gameOverModal.classList.add('hidden');
  }

  private generateWeaponOptions(player: Player): UpgradeOption[] {
    const pool: UpgradeOption[] = [];

    // 1. Existing weapon upgrades (up to maxLevel 20)
    for (const weapon of player.weapons) {
      if (weapon.level < weapon.maxLevel) {
        pool.push({
          id: `upgrade_${weapon.id}`,
          title: `Улучшение: ${weapon.name}`,
          icon: weapon.icon,
          levelTag: `УРОВЕНЬ ${weapon.level + 1}`,
          description: weapon.getNextUpgradeDescription(),
          apply: () => weapon.upgrade()
        });
      }
    }

    // 2. New western weapons if player has less than 5 weapons
    if (player.weapons.length < 5) {
      const hasColt = player.weapons.some(w => w.id === 'heavy_colt');
      if (!hasColt) {
        pool.push({
          id: 'new_heavy_colt',
          title: 'Новое: Тяжелый Кольт',
          icon: '🔫',
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Тяжелые крупнокалиберные пули с мощным пробитием и отбросом',
          apply: () => player.weapons.push(new HeavyColtWeapon())
        });
      }

      const hasRevolvers = player.weapons.some(w => w.id === 'dual_revolvers');
      if (!hasRevolvers) {
        pool.push({
          id: 'new_dual_revolvers',
          title: 'Новое: Парные Револьверы',
          icon: '⚔️',
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Беглый скорострельный град пуль по ближайшим врагам',
          apply: () => player.weapons.push(new DualRevolversWeapon())
        });
      }

      const hasOrbs = player.weapons.some(w => w.id === 'orbiting_barrier');
      if (!hasOrbs) {
        pool.push({
          id: 'new_orbiting_barrier',
          title: 'Новое: Священные Подковы',
          icon: '🧲',
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Призывает защитный вихрь из золотых подков вокруг вас',
          apply: () => player.weapons.push(new OrbitingBarrierWeapon())
        });
      }

      const hasAura = player.weapons.some(w => w.id === 'holy_aura');
      if (!hasAura) {
        pool.push({
          id: 'new_holy_aura',
          title: 'Новое: Огненный Периметр',
          icon: '🔥',
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Окружает героя кольцом дикого огня, сжигающего монстров',
          apply: () => {
            const aura = new HolyAuraWeapon();
            aura.initVisual(this.scene, player.position);
            player.weapons.push(aura);
          }
        });
      }

      const hasKatana = player.weapons.some(w => w.id === 'katana_slash');
      if (!hasKatana) {
        pool.push({
          id: 'new_katana_slash',
          title: 'Новое: Рассекающий Клинок',
          icon: '🗡️',
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Рассекает окружающих врагов смертоносным круговым ударом',
          apply: () => player.weapons.push(new KatanaSlashWeapon(() => player.triggerAttackAnim(0.48)))
        });
      }

      const hasWhirlwind = player.weapons.some(w => w.id === 'whirlwind_slash');
      if (!hasWhirlwind) {
        pool.push({
          id: 'new_whirlwind_slash',
          title: 'Новое: Багровый Вихрь',
          icon: '🌪️',
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Шквал стремительных багровых рассекающих ударов с повышенной скоростью',
          apply: () => player.weapons.push(new WhirlwindSlashWeapon(() => player.triggerAttackAnim(0.42)))
        });
      }

      const hasGreatsword = player.weapons.some(w => w.id === 'greatsword');
      if (!hasGreatsword) {
        pool.push({
          id: 'new_greatsword',
          title: 'Новое: Двуручный Меч',
          icon: '⚔️',
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Тяжёлый круговой размах гигантского клинка с колоссальным уроном и радиусом',
          apply: () => player.weapons.push(new GreatswordWeapon(() => player.triggerAttackAnim(0.5)))
        });
      }

      const hasFlail = player.weapons.some(w => w.id === 'flail');
      if (!hasFlail) {
        pool.push({
          id: 'new_flail',
          title: 'Новое: Боевой Цеп',
          icon: '⛓️',
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Сокрушительный вихрь тяжёлого шипастого цепа, отбрасывающего монстров',
          apply: () => player.weapons.push(new FlailWeapon(() => player.triggerAttackAnim(0.45)))
        });
      }

      const hasStaff = player.weapons.some(w => w.id === 'astral_staff');
      if (!hasStaff) {
        pool.push({
          id: 'new_astral_staff',
          title: 'Новое: Звёздный Посох',
          icon: '🔮',
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Магический посох, запускающий скоростные пробивающие звёздные снаряды',
          apply: () => player.weapons.push(new AstralStaffWeapon(() => player.triggerAttackAnim(0.48)))
        });
      }

      const hasChakram = player.weapons.some(w => w.id === 'chakram');
      if (!hasChakram) {
        pool.push({
          id: 'new_chakram',
          title: 'Новое: Танцующий Чакрам',
          icon: '🪃',
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Бросок вращающегося клинка по дуге с возвращением бумерангом и повторным рассечением',
          apply: () => player.weapons.push(new ChakramWeapon(() => player.triggerAttackAnim(0.42)))
        });
      }
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  private generatePassiveOptions(player: Player): UpgradeOption[] {
    const pool: UpgradeOption[] = [];

    pool.push({
      id: 'stat_sheriff_star',
      title: 'Звезда Шерифа',
      icon: '⭐',
      levelTag: 'ПАССИВНЫЙ НАВЫК',
      description: '+2% к урону ВСЕХ оружий и способностей (складывается)',
      apply: () => {
        player.addSheriffStarBonus(1.02);
      }
    });

    pool.push({
      id: 'stat_spurs',
      title: 'Шпоры Скорохода',
      icon: '👢',
      levelTag: 'ПАССИВНЫЙ НАВЫК',
      description: '+15% к скорости бега по прерии',
      apply: () => {
        player.addSpeedBonus(1.15);
      }
    });

    pool.push({
      id: 'stat_flask',
      title: 'Фляга с Виски',
      icon: '🍶',
      levelTag: 'ПАССИВНЫЙ НАВЫК',
      description: '+30 к максимальному HP и полное исцеление',
      apply: () => {
        player.maxHp += 30;
        player.heal(player.maxHp);
      }
    });

    pool.push({
      id: 'stat_lasso',
      title: 'Магнитное Лассо',
      icon: '➰',
      levelTag: 'ПАССИВНЫЙ НАВЫК',
      description: '+35% к дальности притяжения кристаллов опыта',
      apply: () => {
        player.pickupRadius *= 1.35;
      }
    });

    pool.push({
      id: 'stat_amulet',
      title: 'Охотничий Амулет',
      icon: '🧿',
      levelTag: 'ПАССИВНЫЙ НАВЫК',
      description: '+1.5 HP регенерации каждую секунду (складывается)',
      apply: () => {
        player.addHpRegen(1.5);
      }
    });

    pool.push({
      id: 'stat_vest',
      title: 'Кожаный Жилет',
      icon: '🦺',
      levelTag: 'ПАССИВНЫЙ НАВЫК',
      description: '-10% к получаемому урону от монстров (до 70%)',
      apply: () => {
        player.addDamageReduction(0.10);
      }
    });

    pool.push({
      id: 'stat_watch',
      title: 'Карманные Часы',
      icon: '⏱️',
      levelTag: 'ПАССИВНЫЙ НАВЫК',
      description: '+8% к скорости атаки всех оружий (-8% перезарядки)',
      apply: () => {
        player.addCooldownReduction(0.08);
      }
    });

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  /**
   * Updates top-right performance overlay with current FPS and Latency / Ping
   */
  public updatePerformance(fps: number, pingMs?: number) {
    if (!this.perfOverlay || !this.isPerfOverlayEnabled) return;

    const now = performance.now();
    if (now - this.lastPerfUiUpdate < 250) return; // limit UI redraw to 4 times per second
    this.lastPerfUiUpdate = now;

    if (this.perfFps) {
      const roundedFps = Math.round(fps);
      this.perfFps.innerText = `${roundedFps} FPS`;
      this.perfFps.className = 'perf-badge perf-fps';
      if (roundedFps < 30) {
        this.perfFps.classList.add('fps-low');
      } else if (roundedFps < 50) {
        this.perfFps.classList.add('fps-mid');
      }
    }

    if (this.perfPing) {
      if (pingMs !== undefined) {
        this.perfPing.classList.remove('hidden');
        const roundedPing = Math.round(pingMs);
        this.perfPing.innerText = `Ping: ${roundedPing} ms`;
        this.perfPing.className = 'perf-badge perf-ping';
        if (roundedPing > 140) {
          this.perfPing.classList.add('ping-high');
        } else if (roundedPing > 70) {
          this.perfPing.classList.add('ping-medium');
        } else {
          this.perfPing.classList.add('ping-good');
        }
      } else {
        this.perfPing.classList.add('hidden');
      }
    }
  }
}
