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
import { SoundManager } from '../core/SoundManager';
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

  // Public Callbacks
  public onSinglePlayerSelected?: () => void;
  public onCreateRoomClicked?: () => void;
  public onJoinRoomClicked?: () => void;
  public onRestartSameSeed?: () => void;
  public onReturnToMenu?: () => void;
  public onToggleDevMode?: () => void;
  public isTrainingModeActive: boolean = false;

  public static readonly MENU_BACKGROUNDS: readonly string[] = [
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
    this.mainMenuModal = document.getElementById('main-menu-modal')!;
    document.body.classList.add('is-main-menu');
    document.body.classList.remove('is-in-game');
    HUD.applyRandomMenuBackground();
    this.coopModal = document.getElementById('coop-modal')!;
    this.settingsModal = document.getElementById('settings-modal')!;
    this.exitModal = document.getElementById('exit-modal')!;
    this.charSelectModal = document.getElementById('character-select-modal')!;
    this.pauseModal = document.getElementById('pause-modal')!;

    // Action Buttons
    this.btnResume = document.getElementById('btn-resume')!;
    this.btnPauseRestart = document.getElementById('btn-pause-restart')!;
    this.btnPauseMenu = document.getElementById('btn-pause-menu')!;

    // Initialize Sub-controllers
    this.inGameOverlayUI = new InGameOverlayUI();

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

    this.questsUI = new QuestsUI({
      questsModal: document.getElementById('quests-modal')!,
      mainMenuModal: this.mainMenuModal,
      pauseModal: this.pauseModal,
      getMainMenuBattlePass: () => document.getElementById('main-menu-battle-pass'),
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

    this.battlePassUI = new BattlePassUI({
      getBpBarFill: () => document.getElementById('bp-bar-fill'),
      getBpRewardsRow: () => document.getElementById('bp-rewards-row'),
      getBattlePassModal: () => document.getElementById('battle-pass-modal'),
      getBpModalCurLvl: () => document.getElementById('bp-modal-cur-lvl'),
      getBpModalCurXp: () => document.getElementById('bp-modal-cur-xp'),
      getBpModalTotalXp: () => document.getElementById('bp-modal-total-xp'),
      getBpModalBarFill: () => document.getElementById('bp-modal-bar-fill'),
      getBtnBpClaimAll: () => document.getElementById('btn-bp-claim-all'),
      getBpModalTiersContainer: () => document.getElementById('bp-modal-tiers-container'),
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
        hostLobbyModal: document.getElementById('host-lobby-modal')!,
        hostRoomCodeText: document.getElementById('host-room-code')!,
        hostPasswordInput: document.getElementById('host-password-input') as HTMLInputElement | null,
        hostPasswordBadge: document.getElementById('host-password-badge'),
        hostPlayersRoster: document.getElementById('host-players-roster')!,
        hostPlayerCount: document.getElementById('host-player-count'),
        hostPartnerBox: document.getElementById('host-partner-box')!,
        hostPartnerTitle: document.getElementById('host-partner-title')!,
        hostPartnerDesc: document.getElementById('host-partner-desc')!,
        btnHostStart: document.getElementById('btn-host-start') as HTMLButtonElement,

        joinLobbyModal: document.getElementById('join-lobby-modal')!,
        joinRoomInput: document.getElementById('join-room-input') as HTMLInputElement,
        joinPasswordInput: document.getElementById('join-password-input') as HTMLInputElement | null,
        joinStatusText: document.getElementById('join-status-text')!,
        btnJoinConnect: document.getElementById('btn-join-connect') as HTMLButtonElement | null,
        btnGuestReady: document.getElementById('btn-guest-ready'),
        tabBtnBrowser: document.getElementById('tab-btn-browser'),
        tabBtnDirect: document.getElementById('tab-btn-direct'),
        tabContentBrowser: document.getElementById('tab-content-browser'),
        tabContentDirect: document.getElementById('tab-content-direct'),
        availableRoomsList: document.getElementById('available-rooms-list'),
        joinRosterSection: document.getElementById('join-roster-section'),
        joinPlayersRoster: document.getElementById('join-players-roster')!,
        joinPlayerCount: document.getElementById('join-player-count'),

        passwordPromptModal: document.getElementById('password-prompt-modal'),
        pwdPromptRoomTitle: document.getElementById('pwd-prompt-room-title'),
        pwdPromptInput: document.getElementById('pwd-prompt-input') as HTMLInputElement | null,
        pwdPromptError: document.getElementById('pwd-prompt-error'),

        settingsModal: this.settingsModal,
        pauseModal: this.pauseModal,
        coopBadge: document.getElementById('coop-badge')!,
        coopRoomName: document.getElementById('coop-room-name')!
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

    this.levelUpUI = new LevelUpUI({
      elements: {
        levelUpModal: document.getElementById('level-up-modal')!,
        levelUpStepIndicator: document.getElementById('level-up-step-indicator')!,
        levelUpTitle: document.getElementById('level-up-title')!,
        levelUpRerollContainer: document.getElementById('level-up-reroll-container'),
        btnLevelUpReroll: document.getElementById('btn-level-up-reroll') as HTMLButtonElement | null,
        upgradeCardsContainer: document.getElementById('upgrade-cards')!
      },
      getScene: () => this.scene,
      getCurrentStageNumber: () => this.currentStageNumber,
      getIsAutoLevelUp: () => this.settingsUI.isAutoLevelUp,
      updateWeaponsBar: (weapons) => this.inGameOverlayUI.updateWeaponsBar(weapons),
      updatePassivesBar: (player) => this.inGameOverlayUI.updatePassivesBar(player)
    });

    this.inventoryUI = new InventoryUI();
    this.inventoryUI.onMenuPush = (menu) => {
      if (!this.menuStack.includes(menu)) this.menuStack.push(menu);
    };
    this.inventoryUI.onMenuRemove = (menu) => {
      this.menuStack = this.menuStack.filter((m) => m !== menu);
    };

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
    this.gameOverUI.onRestartClicked = () => {
      this.hideGameOver();
      onRestart();
    };
    this.gameOverUI.onMenuClicked = () => {
      this.hideGameOver();
      this.onReturnToMenu?.();
      this.showMainMenu();
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
    document.getElementById('menu-btn-single')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.hideQuestsModal();
      this.hideMainMenu();
      this.showCharacterSelect();
      this.onSinglePlayerSelected?.();
    });

    document.getElementById('menu-btn-coop')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.hideQuestsModal();
      this.hideMainMenu();
      this.showCoopMenu();
    });

    document.getElementById('menu-btn-quests')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.toggleQuestsInMainMenu();
    });

    document.getElementById('menu-btn-settings')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.hideQuestsModal();
      this.hideMainMenu();
      this.showSettings('main');
    });

    document.getElementById('menu-btn-exit')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.hideQuestsModal();
      this.showExitModal();
    });

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
    this.characterSelectUI = new CharacterSelectUI({
      modal: this.charSelectModal,
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
    this.updateMainMenuQuests();
    this.updateMainMenuBattlePass();
    HUD.applyRandomMenuBackground();
    this.mainMenuModal.classList.remove('hidden');
  }

  public hideMainMenu() {
    this.mainMenuModal.classList.add('hidden');
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
    this.charSelectModal.classList.remove('hidden');
    this.characterSelectUI?.startAnimation();
  }

  public hideCharacterSelect() {
    this.charSelectModal.classList.add('hidden');
    this.menuStack = this.menuStack.filter((s) => s !== 'char_select');
    this.characterSelectUI?.stopAnimation();
  }

  public isAnyMenuOpen(): boolean {
    return this.menuStack.length > 0 || !this.mainMenuModal.classList.contains('hidden');
  }

  public handleEscape(): 'resume' | 'handled' | 'noop' {
    if (this.menuStack.length === 0) {
      return 'noop';
    }

    const current = this.menuStack.pop();

    switch (current) {
      case 'change_hero_confirm': {
        document.getElementById('change-hero-confirm-modal')?.classList.add('hidden');
        this.pauseModal.classList.remove('hidden');
        if (!this.menuStack.includes('pause')) {
          this.menuStack.push('pause');
        }
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
    const hud = document.getElementById('in-game-hud');
    if (hud) {
      if (visible) {
        hud.classList.remove('hidden');
      } else {
        hud.classList.add('hidden');
      }
    }
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
