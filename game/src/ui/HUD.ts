import type { Scene } from 'three';
import { Player, CharacterType, ActiveBuff, BuffType } from '../entities/Player';
import { Weapon } from '../combat/Weapon';
import { Enemy } from '../entities/Enemy';
import { PlayerStats, LobbyPlayerInfo } from '../net/NetworkManager';
import { RemotePlayer } from '../entities/RemotePlayer';
import { PublicRoomInfo } from '../net/RoomDirectory';
import { RiftItemId, type RiftItemDef } from '../items/RiftItemSystem';
import { ProgressionManager } from '../core/ProgressionManager';
import { BattlePassManager } from '../core/BattlePassManager';
import { getAssetUrl } from '../utils/assetPath';
import { MerchantManager } from '../world/MerchantManager';

import {
  getHeroIcon,
  getHeroName,
  getHeroAvatar,
  getWeaponIconUrl
} from './modules/HeroUIHelpers';
import { QuestsUI } from './modules/QuestsUI';
import { BattlePassUI } from './modules/BattlePassUI';
import { SettingsUI } from './modules/SettingsUI';
import { LobbyUI } from './modules/LobbyUI';
import { LevelUpUI, type UpgradeOption } from './modules/LevelUpUI';
import { InventoryUI } from './modules/InventoryUI';
import { MerchantAndChestUI } from './modules/MerchantAndChestUI';
import { GameOverUI, type DetailedPlayerResult, BattlePassGameOverResult } from './modules/GameOverUI';
import { InGameOverlayUI } from './modules/InGameOverlayUI';
import { CharacterSelectUI } from './modules/CharacterSelectUI';
import { ScreenManager } from './core/ScreenManager';
import { SafeDOM } from './core/SafeDOM';
import { MainMenuScreen } from './screens/MainMenu/MainMenuScreen';
import { CharacterSelectScreen } from './screens/CharacterSelect/CharacterSelectScreen';
import { ShopScreen } from './screens/Shop/ShopScreen';
import { AuthModalScreen } from './screens/Auth/AuthModalScreen';
import { AuthManager } from '../auth/AuthManager';
import { CloudSyncManager } from '../meta/CloudSyncManager';
import { LeaderboardUI } from './modules/LeaderboardUI';

export type { UpgradeOption, DetailedPlayerResult };
export { getWeaponIconUrl };

export class HUD {
  public isPaused = false;
  public menuStack: string[] = [];
  public currentStageNumber: number = 1;

  private scene: Scene;

  // Main UI Menus & Modals
  private mainMenuModal: HTMLElement;
  private coopModal: HTMLElement;
  private shopModal: HTMLElement;
  private settingsModal: HTMLElement;
  private exitModal: HTMLElement;
  private charSelectModal: HTMLElement;
  private pauseModal: HTMLElement;

  private btnResume: HTMLElement;
  private btnPauseRestart: HTMLElement;
  private btnPauseMenu: HTMLElement;

  // Modular UI Controllers
  private questsUI: QuestsUI;
  private battlePassUI: BattlePassUI;
  private settingsUI: SettingsUI;
  private lobbyUI: LobbyUI;
  private levelUpUI: LevelUpUI;
  private inventoryUI: InventoryUI;
  private merchantAndChestUI: MerchantAndChestUI;
  private gameOverUI: GameOverUI;
  private inGameOverlayUI: InGameOverlayUI;
  private characterSelectUI?: CharacterSelectUI;
  private mainMenuScreen?: MainMenuScreen;
  private shopScreen?: ShopScreen;
  private characterSelectScreen?: CharacterSelectScreen;
  private authModalScreen?: AuthModalScreen;
  private leaderboardUI: LeaderboardUI;

  // Public Callbacks
  public onSinglePlayerSelected?: () => void;
  public onSaveRunLater?: () => void;
  public onResumeSavedRun?: () => void;
  public onTeleportToRift?: () => void;
  public onCreateRoomClicked?: () => void;
  public onJoinRoomClicked?: () => void;
  public onRestartSameSeed?: () => void;
  public onReturnToMenu?: () => void;
  public onToggleDevMode?: () => void;
  public isTrainingModeActive: boolean = false;

  public static readonly MENU_BACKGROUNDS: readonly string[] = [
    '/textures/ui/menu_rift_bg.webp',
    '/textures/ui/menu_background_1.jpg',
    '/textures/ui/menu_background_2.jpg'
  ];

  public static applyRandomMenuBackground() {
    const list = HUD.MENU_BACKGROUNDS;
    if (list.length === 0) return;
    const chosen = list[Math.floor(Math.random() * list.length)];
    const resolvedUrl = getAssetUrl(chosen);
    document.documentElement.style.setProperty('--menu-background-url', `url('${resolvedUrl}')`);
  }

  constructor(
    scene: Scene,
    onSelectHero: (
      charType: CharacterType,
      seedInput?: string,
      isTrainingMode?: boolean,
      timeOfDay?: 'random' | 'day' | 'night'
    ) => void,
    onResume: () => void,
    onRestart: () => void
  ) {
    this.scene = scene;

    // Modals
    const getEl = (id: string) => SafeDOM.getElementById(id) || document.createElement('div');
    this.mainMenuModal = getEl('main-menu-modal');
    document.body.classList.add('is-main-menu');
    document.body.classList.remove('is-in-game');
    HUD.applyRandomMenuBackground();
    this.coopModal = getEl('coop-modal');
    this.shopModal = getEl('shop-modal');
    this.settingsModal = getEl('settings-modal');
    this.exitModal = getEl('exit-modal');
    this.charSelectModal = getEl('character-select-modal');
    this.pauseModal = getEl('pause-modal');

    // Action Buttons
    this.btnResume = getEl('btn-resume');
    this.btnPauseRestart = getEl('btn-pause-restart');
    this.btnPauseMenu = getEl('btn-pause-menu');

    // Initialize Sub-controllers
    this.inGameOverlayUI = new InGameOverlayUI();
    ScreenManager.getInstance().register(this.inGameOverlayUI);

    this.settingsUI = new SettingsUI({
      settingsModal: this.settingsModal,
      pauseModal: this.pauseModal,
      perfOverlay: document.getElementById('perf-overlay'),
      hideMainMenu: () => this.hideMainMenu(),
      showMainMenu: () => this.showMainMenu(),
      showPause: () => this.showPause(),
      isPaused: () => this.isPaused,
      getMenuStack: () => this.menuStack,
      setMenuStack: (stack) => {
        this.menuStack = stack;
      },
      pushMenu: (menu) => {
        if (!this.menuStack.includes(menu)) this.menuStack.push(menu);
      },
      removeMenu: (menu) => {
        this.menuStack = this.menuStack.filter((m) => m !== menu);
      }
    });
    ScreenManager.getInstance().register(this.settingsUI);

    this.questsUI = new QuestsUI({
      questsModal: SafeDOM.getElementById('quests-modal'),
      mainMenuModal: this.mainMenuModal,
      pauseModal: this.pauseModal,
      getMainMenuBattlePass: () => SafeDOM.getElementById('main-menu-battle-pass'),
      isPaused: () => this.isPaused,
      getMenuStack: () => this.menuStack,
      pushMenu: (menu) => {
        if (!this.menuStack.includes(menu)) this.menuStack.push(menu);
      },
      removeMenu: (menu) => {
        this.menuStack = this.menuStack.filter((m) => m !== menu);
      },
      triggerAltarNotification: (name, subtitle, icon, color) => {
        this.inGameOverlayUI.triggerAltarNotification(name, subtitle, icon, color);
      },
      showCharacterSelect: () => this.showCharacterSelect()
    });
    ScreenManager.getInstance().register(this.questsUI);

    this.battlePassUI = new BattlePassUI({
      getBpBarFill: () => SafeDOM.getElementById('bp-bar-fill'),
      getBpRewardsRow: () => SafeDOM.getElementById('bp-rewards-row'),
      getBattlePassModal: () => SafeDOM.getElementById('battle-pass-modal'),
      getBpModalCurLvl: () => SafeDOM.getElementById('bp-modal-cur-lvl'),
      getBpModalCurXp: () => SafeDOM.getElementById('bp-modal-cur-xp'),
      getBpModalTotalXp: () => SafeDOM.getElementById('bp-modal-total-xp'),
      getBpModalBarFill: () => SafeDOM.getElementById('bp-modal-bar-fill'),
      getBtnBpClaimAll: () => SafeDOM.getElementById('btn-bp-claim-all'),
      getBpModalTiersContainer: () => SafeDOM.getElementById('bp-modal-tiers-container'),
      getBtnBpClose: () => SafeDOM.getElementById('btn-close-bp-modal'),
      getBpBackdrop: () => SafeDOM.getElementById('battle-pass-backdrop'),
      getBpHeaderBtn: () => SafeDOM.getElementById('bp-header-btn'),
      getMenuStack: () => this.menuStack,
      pushMenu: (menu) => {
        if (!this.menuStack.includes(menu)) this.menuStack.push(menu);
      },
      removeMenu: (menu) => {
        this.menuStack = this.menuStack.filter((m) => m !== menu);
      },
      showBalanceToast: (msg) => this.inGameOverlayUI.showBalanceToast(msg)
    });

    this.lobbyUI = new LobbyUI({
      elements: {
        hostLobbyModal: SafeDOM.getElementById('host-lobby-modal'),
        hostRoomCodeText: SafeDOM.getElementById('host-room-code'),
        hostPasswordInput: SafeDOM.getElementById<HTMLInputElement>('host-password-input'),
        hostPasswordBadge: SafeDOM.getElementById('host-password-badge'),
        hostPlayersRoster: SafeDOM.getElementById('host-players-roster'),
        hostPlayerCount: SafeDOM.getElementById('host-player-count'),
        hostPartnerBox: SafeDOM.getElementById('host-partner-box'),
        hostPartnerTitle: SafeDOM.getElementById('host-partner-title'),
        hostPartnerDesc: SafeDOM.getElementById('host-partner-desc'),
        btnHostStart: SafeDOM.getElementById<HTMLButtonElement>('btn-host-start'),

        joinLobbyModal: SafeDOM.getElementById('join-lobby-modal'),
        joinRoomInput: SafeDOM.getElementById<HTMLInputElement>('join-room-input'),
        joinPasswordInput: SafeDOM.getElementById<HTMLInputElement>('join-password-input'),
        joinStatusText: SafeDOM.getElementById('join-status-text'),
        btnJoinConnect: SafeDOM.getElementById<HTMLButtonElement>('btn-join-connect'),
        btnGuestReady: SafeDOM.getElementById('btn-guest-ready'),
        tabBtnBrowser: SafeDOM.getElementById('tab-btn-browser'),
        tabBtnDirect: SafeDOM.getElementById('tab-btn-direct'),
        tabContentBrowser: SafeDOM.getElementById('tab-content-browser'),
        tabContentDirect: SafeDOM.getElementById('tab-content-direct'),
        availableRoomsList: SafeDOM.getElementById('available-rooms-list'),
        joinRosterSection: SafeDOM.getElementById('join-roster-section'),
        joinPlayersRoster: SafeDOM.getElementById('join-players-roster'),
        joinPlayerCount: SafeDOM.getElementById('join-player-count'),

        passwordPromptModal: SafeDOM.getElementById('password-prompt-modal'),
        pwdPromptRoomTitle: SafeDOM.getElementById('pwd-prompt-room-title'),
        pwdPromptInput: SafeDOM.getElementById<HTMLInputElement>('pwd-prompt-input'),
        pwdPromptError: SafeDOM.getElementById('pwd-prompt-error'),

        settingsModal: this.settingsModal,
        pauseModal: this.pauseModal,
        coopBadge: SafeDOM.getElementById('coop-badge'),
        coopRoomName: SafeDOM.getElementById('coop-room-name')
      },
      hideCoopMenu: () => this.hideCoopMenu(),
      hideMainMenu: () => this.hideMainMenu(),
      getMenuStack: () => this.menuStack,
      setMenuStack: (stack) => {
        this.menuStack = stack;
      },
      pushMenu: (menu) => {
        if (!this.menuStack.includes(menu)) this.menuStack.push(menu);
      },
      removeMenu: (menu) => {
        this.menuStack = this.menuStack.filter((m) => m !== menu);
      }
    });
    ScreenManager.getInstance().register(this.lobbyUI);

    this.levelUpUI = new LevelUpUI({
      elements: {
        levelUpModal: SafeDOM.getElementById('level-up-modal'),
        levelUpStepIndicator: SafeDOM.getElementById('level-up-step-indicator'),
        levelUpTitle: SafeDOM.getElementById('level-up-title'),
        levelUpRerollContainer: SafeDOM.getElementById('level-up-reroll-container'),
        btnLevelUpReroll: SafeDOM.getElementById<HTMLButtonElement>('btn-level-up-reroll'),
        upgradeCardsContainer: SafeDOM.getElementById('upgrade-cards')
      },
      getScene: () => this.scene,
      getCurrentStageNumber: () => this.currentStageNumber,
      getIsAutoLevelUp: () => this.settingsUI.isAutoLevelUp,
      updateWeaponsBar: (weapons) => this.inGameOverlayUI.updateWeaponsBar(weapons),
      updatePassivesBar: (player) => this.inGameOverlayUI.updatePassivesBar(player)
    });
    ScreenManager.getInstance().register(this.levelUpUI);

    this.inventoryUI = new InventoryUI();
    this.inventoryUI.onMenuPush = (menu) => {
      if (!this.menuStack.includes(menu)) this.menuStack.push(menu);
    };
    this.inventoryUI.onMenuRemove = (menu) => {
      this.menuStack = this.menuStack.filter((m) => m !== menu);
    };
    ScreenManager.getInstance().register(this.inventoryUI);

    this.merchantAndChestUI = new MerchantAndChestUI();
    this.merchantAndChestUI.onMenuPush = (menu) => {
      if (!this.menuStack.includes(menu)) this.menuStack.push(menu);
    };
    this.merchantAndChestUI.onMenuRemove = (menu) => {
      this.menuStack = this.menuStack.filter((m) => m !== menu);
    };
    this.merchantAndChestUI.onItemPurchased = (item, player) => {
      this.inGameOverlayUI.updatePassivesBar(player);
      const creditsEl = document.getElementById('plasma-credits');
      if (creditsEl) {
        creditsEl.innerText = `⬡ ${player.credits}`;
      }
      this.inGameOverlayUI.triggerAltarNotification(`КУПЛЕНО: ${item.name}`, item.description, item.icon, item.color);
    };

    this.gameOverUI = new GameOverUI();
    ScreenManager.getInstance().register(this.gameOverUI);
    this.gameOverUI.onRestartClicked = () => {
      this.hideGameOver();
      onRestart();
    };
    this.gameOverUI.onMenuClicked = () => {
      this.hideGameOver();
      this.onReturnToMenu?.();
      this.showMainMenu();
    };
    this.gameOverUI.onLeaderboardClicked = () => {
      this.showLeaderboard();
    };

    this.leaderboardUI = new LeaderboardUI({
      onClose: () => {
        this.menuStack = this.menuStack.filter((s) => s !== 'leaderboard');
      }
    });
    ScreenManager.getInstance().register(this.leaderboardUI);

    document.getElementById('btn-teleport-to-rift')?.addEventListener('click', () => {
      this.onTeleportToRift?.();
    });

    AuthManager.getInstance().init().then(() => {
      CloudSyncManager.getInstance().init();
    }).catch((err) => {
      console.warn('[HUD] AuthManager initialization error:', err);
    });

    this.authModalScreen = new AuthModalScreen({
      container: SafeDOM.getElementById('auth-modal'),
      onClose: () => {
        this.menuStack = this.menuStack.filter((s) => s !== 'auth');
      }
    });
    ScreenManager.getInstance().register(this.authModalScreen);

    this.settingsUI.onOpenAuth = () => {
      this.showAuthModal();
    };

    this.bindMainMenuListeners();
    this.bindPauseListeners(onResume, onRestart);
    this.bindCharacterSelectListeners(onSelectHero);
    this.setupExitListeners();

    // Progression & Battle Pass change hooks
    ProgressionManager.getInstance().onProgressionChanged = () => {
      this.updateCharacterSelectLockStatus();
      this.updateLobbyHeroesLockStatus();
      if (!document.getElementById('quests-modal')!.classList.contains('hidden')) {
        this.renderQuestsModal();
      }
      this.updateMainMenuQuests();
      this.updateMainMenuBattlePass();
    };

    BattlePassManager.getInstance().onBattlePassChanged = () => {
      this.updateMainMenuBattlePass();
      const bpModal = document.getElementById('battle-pass-modal');
      if (bpModal && !bpModal.classList.contains('hidden')) {
        this.renderBattlePassModal();
      }
    };

    // Initial populate of main menu daily quests, weekly quests and Battle Pass
    this.updateMainMenuQuests();
    this.updateMainMenuBattlePass();

    // In-game HUD starts hidden while in main menu
    this.setInGameHUDVisible(false);

    document.getElementById('quests-btn-close')?.addEventListener('click', () => {
      this.hideQuestsModal();
    });
  }

  // --- Getters / Setters Forwarding ---

  public get cachedPlayer(): Player | null {
    return this.inventoryUI.cachedPlayer;
  }
  public set cachedPlayer(val: Player | null) {
    this.inventoryUI.cachedPlayer = val;
    this.merchantAndChestUI.cachedPlayer = val;
  }

  public get poePartyList(): HTMLElement {
    return this.inGameOverlayUI.poePartyList;
  }

  public get hostSelectedHero(): CharacterType {
    return this.lobbyUI.hostSelectedHero;
  }
  public set hostSelectedHero(val: CharacterType) {
    this.lobbyUI.hostSelectedHero = val;
  }

  public get guestSelectedHero(): CharacterType {
    return this.lobbyUI.guestSelectedHero;
  }
  public set guestSelectedHero(val: CharacterType) {
    this.lobbyUI.guestSelectedHero = val;
  }

  public get isGuestConnected(): boolean {
    return this.lobbyUI.isGuestConnected;
  }
  public get isGuestReady(): boolean {
    return this.lobbyUI.isGuestReady;
  }

  // Forwarding Callbacks

  public get onHostStartExpedition(): ((seed?: string) => void) | undefined {
    return this.lobbyUI.onHostStartExpedition;
  }
  public set onHostStartExpedition(cb: ((seed?: string) => void) | undefined) {
    this.lobbyUI.onHostStartExpedition = cb;
  }

  public get onHostHeroChanged(): ((hero: CharacterType) => void) | undefined {
    return this.lobbyUI.onHostHeroChanged;
  }
  public set onHostHeroChanged(cb: ((hero: CharacterType) => void) | undefined) {
    this.lobbyUI.onHostHeroChanged = cb;
  }

  public get onGuestHeroChanged(): ((hero: CharacterType) => void) | undefined {
    return this.lobbyUI.onGuestHeroChanged;
  }
  public set onGuestHeroChanged(cb: ((hero: CharacterType) => void) | undefined) {
    this.lobbyUI.onGuestHeroChanged = cb;
  }

  public get onGuestConnectClicked(): ((roomCode: string, hero: CharacterType, password?: string) => void) | undefined {
    return this.lobbyUI.onGuestConnectClicked;
  }
  public set onGuestConnectClicked(cb: ((roomCode: string, hero: CharacterType, password?: string) => void) | undefined) {
    this.lobbyUI.onGuestConnectClicked = cb;
  }

  public get onHostPasswordChanged(): ((password: string) => void) | undefined {
    return this.lobbyUI.onHostPasswordChanged;
  }
  public set onHostPasswordChanged(cb: ((password: string) => void) | undefined) {
    this.lobbyUI.onHostPasswordChanged = cb;
  }

  public get onRefreshRoomsClicked(): (() => void) | undefined {
    return this.lobbyUI.onRefreshRoomsClicked;
  }
  public set onRefreshRoomsClicked(cb: (() => void) | undefined) {
    this.lobbyUI.onRefreshRoomsClicked = cb;
  }

  public get onGuestReadyToggle(): ((isReady: boolean) => void) | undefined {
    return this.lobbyUI.onGuestReadyToggle;
  }
  public set onGuestReadyToggle(cb: ((isReady: boolean) => void) | undefined) {
    this.lobbyUI.onGuestReadyToggle = cb;
  }

  public get onInventoryToggle(): ((isOpen: boolean) => void) | undefined {
    return this.inventoryUI.onInventoryToggle;
  }
  public set onInventoryToggle(cb: ((isOpen: boolean) => void) | undefined) {
    this.inventoryUI.onInventoryToggle = cb;
  }

  public get onMerchantToggle(): ((isOpen: boolean) => void) | undefined {
    return this.merchantAndChestUI.onMerchantToggle;
  }
  public set onMerchantToggle(cb: ((isOpen: boolean) => void) | undefined) {
    this.merchantAndChestUI.onMerchantToggle = cb;
  }

  public get onResolutionScaleChanged(): ((scale: number) => void) | undefined {
    return this.settingsUI.onResolutionScaleChanged;
  }
  public set onResolutionScaleChanged(cb: ((scale: number) => void) | undefined) {
    this.settingsUI.onResolutionScaleChanged = cb;
  }

  public get onShadowQualityChanged(): ((quality: number) => void) | undefined {
    return this.settingsUI.onShadowQualityChanged;
  }
  public set onShadowQualityChanged(cb: ((quality: number) => void) | undefined) {
    this.settingsUI.onShadowQualityChanged = cb;
  }

  public get onTimeOfDayChanged(): ((mode: 'day' | 'night') => void) | undefined {
    return this.settingsUI.onTimeOfDayChanged;
  }
  public set onTimeOfDayChanged(cb: ((mode: 'day' | 'night') => void) | undefined) {
    this.settingsUI.onTimeOfDayChanged = cb;
  }

  // --- Main Menu & Navigation Listeners ---

  private bindMainMenuListeners() {
    this.shopScreen = new ShopScreen({
      container: this.shopModal,
      onClose: () => {
        this.showMainMenu();
      }
    });
    ScreenManager.getInstance().register(this.shopScreen);

    this.mainMenuScreen = new MainMenuScreen({
      container: this.mainMenuModal,
      onResumeRun: () => {
        this.hideQuestsModal();
        this.hideMainMenu();
        this.onResumeSavedRun?.();
      },
      onSinglePlayer: () => {
        this.hideQuestsModal();
        this.hideMainMenu();
        this.showCharacterSelect();
        this.onSinglePlayerSelected?.();
      },
      onCoop: () => {
        this.hideQuestsModal();
        this.hideMainMenu();
        this.showCoopMenu();
      },
      onShop: () => {
        this.hideQuestsModal();
        this.showShopModal();
      },
      onQuests: () => {
        this.toggleQuestsInMainMenu();
      },
      onLeaderboard: () => {
        this.showLeaderboard();
      },
      onSettings: () => {
        this.hideQuestsModal();
        this.hideMainMenu();
        this.showSettings('main');
      },
      onAuth: () => {
        this.showAuthModal();
      },
      onExit: () => {
        this.hideQuestsModal();
        this.showExitModal();
      }
    });
    ScreenManager.getInstance().register(this.mainMenuScreen);

    document.getElementById('coop-btn-host')?.addEventListener('click', () => {
      this.hideCoopMenu();
      this.onCreateRoomClicked?.();
    });

    document.getElementById('coop-btn-join')?.addEventListener('click', () => {
      this.hideCoopMenu();
      this.onJoinRoomClicked?.();
    });

    document.getElementById('coop-btn-back')?.addEventListener('click', () => {
      this.handleEscape();
    });
  }

  private bindPauseListeners(onResume: () => void, onRestart: () => void) {
    this.btnResume.addEventListener('click', () => {
      this.hidePause();
      onResume();
    });

    document.getElementById('btn-pause-save-later')?.addEventListener('click', () => {
      this.hidePause();
      this.onSaveRunLater?.();
    });

    document.getElementById('btn-pause-restart-same')?.addEventListener('click', () => {
      if (!this.isTrainingModeActive) return;
      this.hidePause();
      if (this.onRestartSameSeed) {
        this.onRestartSameSeed();
      } else {
        onRestart();
      }
    });

    document.getElementById('btn-pause-copy-seed')?.addEventListener('click', () => {
      const textElem = document.getElementById('pause-seed-text');
      const seedVal = textElem?.textContent?.replace('#', '').trim() || '';
      if (navigator.clipboard && seedVal) {
        navigator.clipboard.writeText(seedVal);
      }
      const btn = document.getElementById('btn-pause-copy-seed');
      if (btn) {
        btn.textContent = '✓ Скопировано';
        setTimeout(() => {
          if (btn) btn.textContent = '📋 Копировать';
        }, 1500);
      }
    });

    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.showSettings('pause');
    });

    const confirmChangeHeroModal = document.getElementById('change-hero-confirm-modal');
    const btnConfirmChangeHero = document.getElementById('btn-confirm-change-hero');
    const btnCancelChangeHero = document.getElementById('btn-cancel-change-hero');

    this.btnPauseRestart.addEventListener('click', () => {
      this.hidePause();
      confirmChangeHeroModal?.classList.remove('hidden');
      if (!this.menuStack.includes('change_hero_confirm')) {
        this.menuStack.push('change_hero_confirm');
      }
    });

    btnCancelChangeHero?.addEventListener('click', () => {
      confirmChangeHeroModal?.classList.add('hidden');
      this.menuStack = this.menuStack.filter((s) => s !== 'change_hero_confirm');
      this.showPause();
    });

    btnConfirmChangeHero?.addEventListener('click', () => {
      confirmChangeHeroModal?.classList.add('hidden');
      this.menuStack = this.menuStack.filter((s) => s !== 'change_hero_confirm');
      // Reset previous world and return to main menu state
      this.onReturnToMenu?.();
      // Show character select
      this.showCharacterSelect();
    });

    this.btnPauseMenu?.addEventListener('click', () => {
      this.hidePause();
      this.onReturnToMenu?.();
      this.showMainMenu();
    });

    document.getElementById('btn-dev-mobile-trigger')?.addEventListener('click', () => {
      this.onToggleDevMode?.();
    });

    document.getElementById('btn-pause-dev')?.addEventListener('click', () => {
      this.hidePause();
      this.onToggleDevMode?.();
    });
  }

  private bindCharacterSelectListeners(
    onSelectHero: (
      charType: CharacterType,
      seedInput?: string,
      isTrainingMode?: boolean,
      timeOfDay?: 'random' | 'day' | 'night'
    ) => void
  ) {
    this.characterSelectScreen = new CharacterSelectScreen({
      container: this.charSelectModal,
      onSelectHero: (hero, seedInput, isTraining, timeOfDay) => {
        this.hideCharacterSelect();
        document.body.classList.remove('is-main-menu');
        document.body.classList.add('is-in-game');
        onSelectHero(hero, seedInput, isTraining, timeOfDay);
      },
      onBack: () => {
        this.handleEscape();
      },
      onShowUnlockQuests: (hero) => {
        this.hideCharacterSelect();
        this.showQuestsModal(hero, 1, true);
      }
    });
    ScreenManager.getInstance().register(this.characterSelectScreen);
    this.characterSelectUI = this.characterSelectScreen;
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
        exitMsg.innerHTML =
          '<strong>Сессия игры завершена.</strong><br>Вы можете безопасно закрыть эту вкладку браузера.';
      }
      if (exitActions) {
        exitActions.innerHTML =
          '<button id="btn-exit-return" class="action-btn modern-back-btn" style="min-width: 160px;">Назад в меню</button>';
        document.getElementById('btn-exit-return')?.addEventListener('click', () => {
          this.handleEscape();
          this.resetExitModal();
        });
      }
    });

    document.getElementById('btn-cancel-exit')?.addEventListener('click', () => {
      this.handleEscape();
      this.resetExitModal();
    });
  }

  private resetExitModal() {
    const exitMsg = document.getElementById('exit-message');
    const exitActions = document.getElementById('exit-actions-row');
    if (exitMsg) {
      exitMsg.innerHTML = 'Вы уверены, что хотите выйти из игры?';
    }
    if (exitActions) {
      exitActions.innerHTML =
        '<button id="btn-confirm-exit" class="action-btn select-btn" style="min-width: 120px; background: rgba(239, 68, 68, 0.25); border-color: #ef4444; color: #fca5a5;">Выйти</button><button id="btn-cancel-exit" class="action-btn modern-back-btn" style="min-width: 120px;">Отмена</button>';
      this.setupExitListeners();
    }
  }

  // --- Modal Navigation Methods ---

  public showMainMenu() {
    this.menuStack = [];
    document.body.classList.remove('is-in-game');
    document.body.classList.add('is-main-menu');
    document.getElementById('change-hero-confirm-modal')?.classList.add('hidden');
    this.hideCoopMenu();
    this.hideSettings();
    this.hideExitModal();
    this.hideHostLobby();
    this.hideJoinLobby();
    this.hidePause();
    this.hideGameOver();
    this.hideLevelUp();
    this.hideCharacterSelect();
    this.hideQuestsModal();
    this.hideBattlePassModal();
    this.hideMerchant();
    this.hideShopModal();
    this.hideLeaderboard();
    this.updateMainMenuQuests();
    this.updateMainMenuBattlePass();
    this.mainMenuScreen?.updateCrystalsDisplay();
    HUD.applyRandomMenuBackground();
    if (this.mainMenuScreen) {
      this.mainMenuScreen.show();
    } else {
      this.mainMenuModal.classList.remove('hidden');
    }
  }

  public hideMainMenu() {
    if (this.mainMenuScreen) {
      this.mainMenuScreen.hide();
    } else {
      this.mainMenuModal.classList.add('hidden');
    }
  }

  public showShopModal() {
    this.hideMainMenu();
    this.hideQuestsModal();
    this.menuStack.push('shop');
    if (this.shopScreen) {
      this.shopScreen.show();
    } else {
      this.shopModal.classList.remove('hidden');
    }
  }

  public hideShopModal() {
    if (this.shopScreen) {
      this.shopScreen.hide();
    } else {
      this.shopModal.classList.add('hidden');
    }
    this.menuStack = this.menuStack.filter((s) => s !== 'shop');
  }

  public updateCrystalsCounter(count: number): void {
    const el = document.getElementById('rift-crystals-count');
    if (el) el.textContent = count.toLocaleString();
    const menuEl = document.getElementById('main-menu-crystals-count');
    if (menuEl) menuEl.textContent = count.toLocaleString();
  }

  public showCoopMenu() {
    this.hideMainMenu();
    this.menuStack = ['coop'];
    this.coopModal.classList.remove('hidden');
  }

  public hideCoopMenu() {
    this.coopModal.classList.add('hidden');
    this.menuStack = this.menuStack.filter((s) => s !== 'coop');
  }

  public showSettings(from: 'main' | 'pause' = 'main') {
    this.settingsUI.showSettings(from);
  }

  public hideSettings() {
    this.settingsUI.hideSettings();
  }

  public activateSettingsTab(tabName: 'video' | 'audio' | 'ui' | 'controls' | 'data') {
    this.settingsUI.activateSettingsTab(tabName);
  }

  public showExitModal() {
    this.resetExitModal();
    if (this.menuStack[this.menuStack.length - 1] !== 'exit') {
      this.menuStack.push('exit');
    }
    this.exitModal.classList.remove('hidden');
  }

  public hideExitModal() {
    this.exitModal.classList.add('hidden');
    this.menuStack = this.menuStack.filter((s) => s !== 'exit');
  }

  public showPause(activeSeed?: number | string) {
    this.isPaused = true;
    this.menuStack = ['pause'];
    if (activeSeed !== undefined) {
      const textElem = document.getElementById('pause-seed-text');
      if (textElem) {
        textElem.textContent = `#${activeSeed}`;
      }
    }
    const btnDev = document.getElementById('btn-pause-dev');
    if (btnDev) {
      btnDev.classList.toggle('hidden', !this.isTrainingModeActive);
    }
    const btnSame = document.getElementById('btn-pause-restart-same');
    if (btnSame) {
      btnSame.classList.toggle('hidden', !this.isTrainingModeActive);
    }
    this.pauseModal.classList.remove('hidden');
  }

  public hidePause() {
    this.isPaused = false;
    this.pauseModal.classList.add('hidden');
    this.menuStack = this.menuStack.filter((s) => s !== 'pause');
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

  public showCharacterSelect() {
    this.updateCharacterSelectLockStatus();
    if (this.isPaused || this.menuStack.includes('pause')) {
      this.pauseModal.classList.add('hidden');
      if (this.menuStack[this.menuStack.length - 1] !== 'char_select') {
        this.menuStack.push('char_select');
      }
    } else {
      this.hideMainMenu();
      this.menuStack = ['char_select'];
    }
    if (this.characterSelectScreen) {
      this.characterSelectScreen.show();
    } else {
      this.charSelectModal.classList.remove('hidden');
      this.characterSelectUI?.startAnimation();
    }
  }

  public hideCharacterSelect() {
    if (this.characterSelectScreen) {
      this.characterSelectScreen.hide();
    } else {
      this.charSelectModal.classList.add('hidden');
      this.characterSelectUI?.stopAnimation();
    }
    this.menuStack = this.menuStack.filter((s) => s !== 'char_select');
  }

  public showAuthModal(): void {
    if (!this.menuStack.includes('auth')) {
      this.menuStack.push('auth');
    }
    this.authModalScreen?.show();
  }

  public hideAuthModal(): void {
    this.authModalScreen?.hide();
    this.menuStack = this.menuStack.filter((s) => s !== 'auth');
  }

  public isAuthModalOpen(): boolean {
    return Boolean(this.authModalScreen?.isVisible());
  }

  public isAnyMenuOpen(): boolean {
    return (
      this.menuStack.length > 0 ||
      !this.mainMenuModal.classList.contains('hidden') ||
      Boolean(this.authModalScreen?.isVisible())
    );
  }

  public handleEscape(): 'resume' | 'handled' | 'noop' {
    if (this.authModalScreen?.isVisible()) {
      this.hideAuthModal();
      return 'handled';
    }

    if (this.menuStack.length === 0) {
      return 'noop';
    }

    const current = this.menuStack.pop();

    switch (current) {
      case 'auth': {
        this.hideAuthModal();
        return 'handled';
      }

      case 'leaderboard': {
        this.hideLeaderboard();
        return 'handled';
      }

      case 'change_hero_confirm': {
        document.getElementById('change-hero-confirm-modal')?.classList.add('hidden');
        this.pauseModal.classList.remove('hidden');
        if (!this.menuStack.includes('pause')) {
          this.menuStack.push('pause');
        }
        return 'handled';
      }

      case 'shop': {
        this.hideShopModal();
        this.showMainMenu();
        return 'handled';
      }

      case 'settings': {
        this.settingsModal.classList.add('hidden');
        const next = this.menuStack[this.menuStack.length - 1];
        if (next === 'pause') {
          this.pauseModal.classList.remove('hidden');
        } else {
          this.showMainMenu();
        }
        return 'handled';
      }

      case 'password_prompt': {
        this.hidePasswordPrompt();
        return 'handled';
      }

      case 'join_lobby': {
        this.hideJoinLobby();
        const next = this.menuStack[this.menuStack.length - 1];
        if (next === 'coop') {
          this.coopModal.classList.remove('hidden');
        } else {
          this.showMainMenu();
        }
        return 'handled';
      }

      case 'host_lobby': {
        this.hideHostLobby();
        const next = this.menuStack[this.menuStack.length - 1];
        if (next === 'coop') {
          this.coopModal.classList.remove('hidden');
        } else {
          this.showMainMenu();
        }
        return 'handled';
      }

      case 'coop': {
        this.hideCoopMenu();
        this.showMainMenu();
        return 'handled';
      }

      case 'exit': {
        this.hideExitModal();
        const next = this.menuStack[this.menuStack.length - 1];
        if (next === 'pause') {
          this.pauseModal.classList.remove('hidden');
        } else {
          this.showMainMenu();
        }
        return 'handled';
      }

      case 'char_select': {
        this.hideCharacterSelect();
        const next = this.menuStack[this.menuStack.length - 1];
        if (next === 'pause') {
          this.pauseModal.classList.remove('hidden');
        } else {
          this.showMainMenu();
        }
        return 'handled';
      }

      case 'quests': {
        this.hideQuestsModal();
        if (this.isPaused || this.menuStack.includes('pause')) {
          this.pauseModal.classList.remove('hidden');
        } else {
          this.showMainMenu();
        }
        return 'handled';
      }

      case 'battle_pass': {
        this.hideBattlePassModal();
        if (this.isPaused || this.menuStack.includes('pause')) {
          this.pauseModal.classList.remove('hidden');
        } else {
          this.showMainMenu();
        }
        return 'handled';
      }

      case 'inventory': {
        this.hideInventory();
        return 'handled';
      }

      case 'merchant': {
        this.hideMerchant();
        return 'handled';
      }

      case 'pause': {
        this.hidePause();
        return 'resume';
      }

      default:
        return 'noop';
    }
  }

  // --- Quests Methods Forwarding ---

  public toggleQuestsInMainMenu() {
    this.questsUI.toggleQuestsInMainMenu();
  }

  public selectQuestChapter(chapter: number) {
    this.questsUI.selectQuestChapter(chapter);
  }

  public showQuestsModal(selectedQuestId: string = 'ch1_deadly_debut', chapter: number = 1, fromCharSelect: boolean = false) {
    this.questsUI.showQuestsModal(selectedQuestId, chapter, fromCharSelect);
  }

  public setInGameHUDVisible(visible: boolean) {
    this.inGameOverlayUI.setInGameHUDVisible(visible);
  }

  public hideQuestsModal() {
    this.questsUI.hideQuestsModal();
  }

  public getChapterQuests(chapter: number) {
    return this.questsUI.getChapterQuests(chapter);
  }

  public renderQuestsModal(selectedQuestId?: string, chapter?: number) {
    this.questsUI.renderQuestsModal(selectedQuestId, chapter);
  }

  public updateCharacterSelectLockStatus() {
    this.questsUI.updateCharacterSelectLockStatus();
  }

  public updateLobbyHeroesLockStatus() {
    this.lobbyUI.updateLobbyHeroesLockStatus();
  }

  public updateMainMenuQuests() {
    this.questsUI.updateMainMenuQuests();
  }

  // --- Battle Pass Methods Forwarding ---

  public updateMainMenuBattlePass() {
    this.battlePassUI.updateMainMenuBattlePass();
  }

  public renderBattlePassModal() {
    this.battlePassUI.renderBattlePassModal();
  }

  public openBattlePassModal() {
    this.battlePassUI.openBattlePassModal();
  }

  public hideBattlePassModal() {
    this.battlePassUI.hideBattlePassModal();
  }

  public handleClaimAllBattlePass() {
    this.battlePassUI.handleClaimAllBattlePass();
  }

  // --- Lobby Methods Forwarding ---

  public showHostLobby(roomCode: string, hero: CharacterType) {
    this.lobbyUI.showHostLobby(roomCode, hero);
  }

  public hideHostLobby() {
    this.lobbyUI.hideHostLobby();
  }

  public setHostPartnerConnected(connected: boolean, hero?: CharacterType) {
    this.lobbyUI.setHostPartnerConnected(connected, hero);
  }

  public renderHostRoster(lobbyPlayers: LobbyPlayerInfo[]) {
    this.lobbyUI.renderHostRoster(lobbyPlayers);
  }

  public renderJoinRoster(lobbyPlayers: LobbyPlayerInfo[], mySlotId: string = 'p2') {
    this.lobbyUI.renderJoinRoster(lobbyPlayers, mySlotId);
  }

  public showPasswordPrompt(roomCode: string) {
    this.lobbyUI.showPasswordPrompt(roomCode);
  }

  public hidePasswordPrompt() {
    this.lobbyUI.hidePasswordPrompt();
  }

  public showPasswordPromptError(msg: string = 'Неверный пароль. Попробуйте снова.') {
    this.lobbyUI.showPasswordPromptError(msg);
  }

  public renderAvailableRooms(rooms: PublicRoomInfo[]) {
    this.lobbyUI.renderAvailableRooms(rooms);
  }

  public showJoinLobby(defaultHero: CharacterType = 'valkyrie') {
    this.lobbyUI.showJoinLobby(defaultHero);
  }

  public hideJoinLobby() {
    this.lobbyUI.hideJoinLobby();
  }

  public setJoinStatus(text: string, isError: boolean = false) {
    this.lobbyUI.setJoinStatus(text, isError);
  }

  public setGuestConnectedMode(connected: boolean) {
    this.lobbyUI.setGuestConnectedMode(connected);
  }

  public updateGuestReadyButtonUI() {
    this.lobbyUI.updateGuestReadyButtonUI();
  }

  public switchJoinTab(tab: 'browser' | 'direct') {
    this.lobbyUI.switchJoinTab(tab);
  }

  // --- Level Up Methods Forwarding ---

  public showLevelUp(player: Player, onSelect: () => void) {
    this.levelUpUI.showLevelUp(player, onSelect);
  }

  public resetLevelUpState(): void {
    this.levelUpUI.resetLevelUpState();
  }

  private hideLevelUp() {
    this.levelUpUI.hideLevelUp();
  }

  // --- Inventory Methods Forwarding ---

  public isInventoryOpen(): boolean {
    return this.inventoryUI.isInventoryOpen();
  }

  public toggleInventory(player?: Player): void {
    this.inventoryUI.toggleInventory(player);
  }

  public showInventory(player: Player): void {
    this.inventoryUI.showInventory(player);
  }

  public hideInventory(): void {
    this.inventoryUI.hideInventory();
  }

  public renderInventory(player: Player): void {
    this.inventoryUI.renderInventory(player);
  }

  // --- Merchant & Chest Methods Forwarding ---

  public isMerchantOpen(): boolean {
    return this.merchantAndChestUI.isMerchantOpen();
  }

  public showMerchant(merchant: MerchantManager, player: Player): void {
    this.merchantAndChestUI.showMerchant(merchant, player);
  }

  public hideMerchant(): void {
    this.merchantAndChestUI.hideMerchant();
  }

  public updateMerchantTimer(merchant: MerchantManager): void {
    this.merchantAndChestUI.updateMerchantTimer(merchant);
  }

  public showChestChoice(
    items: [RiftItemDef, RiftItemDef],
    player: Player,
    onChoose: (item: RiftItemDef) => void
  ): void {
    this.merchantAndChestUI.showChestChoice(items, player, onChoose);
  }

  public hideChestChoice(): void {
    this.merchantAndChestUI.hideChestChoice();
  }

  // --- Game Over Methods Forwarding ---

  public showGameOver(
    timeStr: string,
    playerStats: PlayerStats,
    partnerStats?: PlayerStats | null,
    isCoop: boolean = false,
    isVictory: boolean = false,
    weapons?: Weapon[],
    allPlayersResults?: DetailedPlayerResult[],
    battlePassResult?: BattlePassGameOverResult
  ) {
    this.hideMerchant();
    this.hideInventory();
    this.gameOverUI.showGameOver(
      timeStr,
      playerStats,
      partnerStats,
      isCoop,
      isVictory,
      weapons,
      allPlayersResults,
      battlePassResult
    );
  }

  public hideGameOver() {
    this.gameOverUI.hideGameOver();
    this.updateMainMenuBattlePass();
  }

  // --- Leaderboard Methods Forwarding ---

  public showLeaderboard(): void {
    if (!this.menuStack.includes('leaderboard')) {
      this.menuStack.push('leaderboard');
    }
    this.leaderboardUI.show();
  }

  public hideLeaderboard(): void {
    this.leaderboardUI.hide();
    this.menuStack = this.menuStack.filter((s) => s !== 'leaderboard');
  }

  // --- In-Game Overlay & Overlays Methods Forwarding ---

  public setCoopBadge(roomCode: string | null) {
    this.inGameOverlayUI.setCoopBadge(roomCode);
  }

  public updatePoeParty(
    localPlayer: Player,
    remotePlayers: Map<string, RemotePlayer>,
    mySlotId: string = 'p1',
    role: string = 'solo',
    lobbyPlayers: LobbyPlayerInfo[] = []
  ) {
    this.inGameOverlayUI.updatePoeParty(localPlayer, remotePlayers, mySlotId, role, lobbyPlayers);
  }

  public updateTeammates(
    remotePlayers: Map<string, RemotePlayer>,
    localPlayer?: Player,
    mySlotId: string = 'p1',
    role: string = 'solo',
    lobbyPlayers: LobbyPlayerInfo[] = []
  ) {
    this.inGameOverlayUI.updateTeammates(remotePlayers, localPlayer, mySlotId, role, lobbyPlayers);
  }

  public clearTeammates() {
    this.inGameOverlayUI.clearTeammates();
  }

  public updatePartnerHp(hp: number, maxHp: number, isDowned: boolean) {
    this.inGameOverlayUI.updatePartnerHp(hp, maxHp, isDowned);
  }

  public hidePartnerHp() {
    this.inGameOverlayUI.hidePartnerHp();
  }

  public update(
    player: Player,
    totalKills: number,
    gameTime: number,
    activeBoss: Enemy | null,
    partnerKills?: number
  ) {
    this.cachedPlayer = player;
    this.inGameOverlayUI.update(player, totalKills, gameTime, activeBoss, partnerKills);
  }

  public updateStageText(stageNum: number, biomeName: string) {
    this.currentStageNumber = stageNum;
    this.inGameOverlayUI.updateStageText(stageNum, biomeName);
  }

  public updateTeleportButton(canTeleport: boolean, reason?: string) {
    this.inGameOverlayUI.updateTeleportButton(canTeleport, reason);
  }

  public showInteractionPrompt(text: string) {
    this.inGameOverlayUI.showInteractionPrompt(text);
  }

  public hideInteractionPrompt() {
    this.inGameOverlayUI.hideInteractionPrompt();
  }

  public renderItemInventory(items: Map<RiftItemId, number>) {
    this.inGameOverlayUI.renderItemInventory(items);
  }

  public triggerAltarNotification(name: string, subtitle: string, icon: string, color: string) {
    this.inGameOverlayUI.triggerAltarNotification(name, subtitle, icon, color);
  }

  public showBalanceToast(message: string) {
    this.inGameOverlayUI.showBalanceToast(message);
  }

  public updateBuffsTray(activeBuffs: Map<BuffType, ActiveBuff>) {
    this.inGameOverlayUI.updateBuffsTray(activeBuffs);
  }

  public triggerDamageFlash(damageAmount?: number) {
    this.inGameOverlayUI.triggerDamageFlash(damageAmount);
  }

  public triggerBossWarning(bossName?: string, tier?: number) {
    this.inGameOverlayUI.triggerBossWarning(bossName, tier);
  }

  public triggerImmortalBossWarning(bossName?: string) {
    this.inGameOverlayUI.triggerImmortalBossWarning(bossName);
  }

  public resetBossUI() {
    this.inGameOverlayUI.resetBossUI();
  }

  public resetSessionHUD() {
    this.inGameOverlayUI.resetSessionHUD();
  }

  public updateWeaponsBar(weapons: Weapon[]) {
    this.inGameOverlayUI.updateWeaponsBar(weapons);
  }

  public updatePassivesBar(player: Player) {
    this.inGameOverlayUI.updatePassivesBar(player);
  }

  public updatePerformance(fps: number, pingMs?: number) {
    this.inGameOverlayUI.updatePerformance(fps, pingMs);
  }

  public setTrainingModeActive(active: boolean) {
    this.isTrainingModeActive = active;
    this.inGameOverlayUI.setTrainingModeActive(active);
    const btnDev = document.getElementById('btn-pause-dev');
    if (btnDev) {
      btnDev.classList.toggle('hidden', !active);
    }
    const btnSame = document.getElementById('btn-pause-restart-same');
    if (btnSame) {
      btnSame.classList.toggle('hidden', !active);
    }
  }

  // --- Hero Info Static / Instance Helpers ---

  public getHeroIcon(charType: CharacterType): string {
    return getHeroIcon(charType);
  }

  public getHeroName(charType: CharacterType): string {
    return getHeroName(charType);
  }

  public getHeroAvatar(charType: CharacterType): string {
    return getHeroAvatar(charType);
  }
}
