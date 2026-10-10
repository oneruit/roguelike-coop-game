import { selectWeaponUpgradeOptions, canRerollWeaponOptions, filterAndShuffleForReroll } from './selectWeaponUpgradeOptions';
import { InvokerInvokeWeapon, InvokerSpellWeapon } from '../combat/InvokerWeapons';
import { INVOKER_SPELL_IDS, INVOKER_SPELLS, invokerWeaponId } from '../shared/InvokerSpells';
import { canCharacterAcquireWeapon } from '../shared/UniqueCharacters';
import { Player, CharacterType, ActiveBuff, BuffType } from '../entities/Player';
import { Weapon, BowWeapon, KukriWeapon, OrbitingBarrierWeapon, HolyAuraWeapon, KatanaSlashWeapon, WhirlwindSlashWeapon, GreatswordWeapon, FlailWeapon, AstralStaffWeapon, ChakramWeapon, LightningStrikeWeapon, IceSpikeWeapon, FireballWeapon, AssaultRifleWeapon } from '../combat/Weapon';
import { Projectile } from '../combat/Projectile';
import { SoundManager } from '../core/SoundManager';
import { DamageNumberManager } from '../combat/DamageNumberManager';
import { Enemy } from '../entities/Enemy';
import { PlayerStats, LobbyPlayerInfo, PLAYER_COLORS, getPlayerSlotNumber } from '../net/NetworkManager';
import { RemotePlayer } from '../entities/RemotePlayer';
import { PublicRoomInfo } from '../net/RoomDirectory';
import { DifficultyDirector } from '../director/DifficultyDirector';
import { RiftItemId, RIFT_ITEMS } from '../items/RiftItemSystem';
import { ProgressionManager, SidebarQuestItem } from '../core/ProgressionManager';
import {
  BattlePassManager,
  BP_MAX_LEVEL,
  BP_POINTS_PER_LEVEL,
  BP_MAX_POINTS
} from '../core/BattlePassManager';
import { TextureManager } from '../core/TextureManager';
import type { Scene } from 'three';

export interface UpgradeOption {
  id: string;
  title: string;
  icon: string;
  iconImage?: string;
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

export function getWeaponIconUrl(weaponId: string): string {
  const map: Record<string, string> = {
    chakram: '/textures/weapons/weapon_chakram.png',
    bow: '/textures/weapons/weapon_bow.png',
    kukri: '/textures/weapons/weapon_kukri.png',
    katana_slash: '/textures/weapons/weapon_katana_slash.png',
    greatsword: '/textures/weapons/weapon_greatsword.png',
    flail: '/textures/weapons/weapon_flail.png',
    astral_staff: '/textures/weapons/weapon_astral_staff.png',
    orbiting_barrier: '/textures/weapons/weapon_orbiting_barrier.png',
    holy_aura: '/textures/weapons/weapon_holy_aura.png',
    whirlwind_slash: '/textures/weapons/weapon_whirlwind_slash.png',
    lightning_strike: '/textures/weapons/weapon_lightning_strike.png',
    ice_spike: '/textures/weapons/weapon_ice_spike.png',
    fireball: '/textures/weapons/weapon_fireball.png',
    assault_rifle: '/textures/weapons/weapon_assault_rifle.png'
  };
  const path = map[weaponId] || `/textures/weapons/weapon_${weaponId}.png`;
  return TextureManager.getWeaponBlobUrl(path);
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

  // The Rift HUD Elements
  private stageText: HTMLElement | null;
  private plasmaCreditsText: HTMLElement | null;
  private diffTierLabel: HTMLElement | null;
  private diffBarFill: HTMLElement | null;
  private teleporterEventContainer: HTMLElement | null;
  private teleporterStatusText: HTMLElement | null;
  private teleporterZoneText: HTMLElement | null;
  private teleporterBarFill: HTMLElement | null;
  private interactionPrompt: HTMLElement | null;
  private interactionPromptText: HTMLElement | null;
  private itemInventoryTray: HTMLElement | null;
  private dashCooldownBadge: HTMLElement | null;
  private dashCooldownText: HTMLElement | null;

  // Screen Damage Flash & Low HP Vignette
  private damageFlashLayer: HTMLElement | null;
  private lowHpVignetteLayer: HTMLElement | null;
  private damageFlashTimeout: number | null = null;

  // Altar & Buffs HUD
  private altarBanner: HTMLElement;
  private altarBannerText: HTMLElement;
  private buffsTray: HTMLElement;
  private passivesBar: HTMLElement | null;
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
  private questsModal: HTMLElement;
  private activeQuestHero: CharacterType = 'chakram';
  private activeQuestChapter: number = 1;
  private activeQuestId: string = 'chakram';
  private isQuestsOpenInMenu: boolean = false;
  private pauseModal: HTMLElement;
  private settingsFromPause = false;
  private menuStack: (
    | 'pause'
    | 'settings'
    | 'guide'
    | 'exit'
    | 'coop'
    | 'host_lobby'
    | 'join_lobby'
    | 'password_prompt'
    | 'char_select'
    | 'quests'
    | 'battle_pass'
  )[] = [];
  public onResolutionScaleChanged?: (scale: number) => void;
  public onShadowQualityChanged?: (quality: number) => void;
  public onTimeOfDayChanged?: (mode: 'day' | 'night') => void;
  public isTrainingModeActive: boolean = false;
  public onToggleDevMode?: () => void;
  public isAutoLevelUp = false;
  private levelUpKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private levelUpModal: HTMLElement;
  private levelUpStepIndicator: HTMLElement;
  private levelUpTitle: HTMLElement;
  private levelUpRerollContainer: HTMLElement | null = null;
  private btnLevelUpReroll: HTMLButtonElement | null = null;
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

  // Battle Pass elements
  private mainMenuBattlePass: HTMLElement | null = null;
  private bpHeaderBtn: HTMLElement | null = null;
  private bpBarFill: HTMLElement | null = null;
  private bpRewardsRow: HTMLElement | null = null;

  private battlePassModal: HTMLElement | null = null;
  private btnCloseBpModal: HTMLElement | null = null;
  private bpModalCurLvl: HTMLElement | null = null;
  private bpModalCurXp: HTMLElement | null = null;
  private bpModalTotalXp: HTMLElement | null = null;
  private bpModalBarFill: HTMLElement | null = null;
  private btnBpClaimAll: HTMLElement | null = null;
  private bpModalTiersContainer: HTMLElement | null = null;

  private gameOverBpBox: HTMLElement | null = null;
  private gameOverBpPointsGained: HTMLElement | null = null;
  private gameOverBpReason: HTMLElement | null = null;
  private gameOverBpLevelBadge: HTMLElement | null = null;
  private gameOverBpBarFill: HTMLElement | null = null;
  private gameOverBpXpText: HTMLElement | null = null;
  private gameOverBpLevelup: HTMLElement | null = null;

  // Host Lobby elements
  private hostRoomCodeText: HTMLElement;
  private btnCopyCode: HTMLElement;
  private hostPartnerBox: HTMLElement;
  private hostPartnerTitle: HTMLElement;
  private hostPartnerDesc: HTMLElement;
  private btnHostStart: HTMLButtonElement;
  private btnHostBack: HTMLElement;
  private hostPasswordInput: HTMLInputElement;
  private hostPasswordBadge: HTMLElement;
  private btnToggleHostPwd: HTMLElement | null;

  // Join Lobby elements
  private joinRoomInput: HTMLInputElement;
  private joinPasswordInput: HTMLInputElement | null;
  private joinStatusText: HTMLElement;
  private btnJoinConnect: HTMLButtonElement;
  private btnGuestReady: HTMLButtonElement;
  private btnJoinBack: HTMLElement;
  private tabBtnBrowser: HTMLElement | null;
  private tabBtnDirect: HTMLElement | null;
  private tabContentBrowser: HTMLElement | null;
  private tabContentDirect: HTMLElement | null;
  private btnRefreshRooms: HTMLElement | null;
  private availableRoomsList: HTMLElement | null;
  public isGuestReady: boolean = false;
  public isGuestConnected: boolean = false;
  public onGuestReadyToggle?: (isReady: boolean) => void;

  // Password Prompt Modal
  private passwordPromptModal: HTMLElement | null;
  private pwdPromptRoomTitle: HTMLElement | null;
  private pwdPromptInput: HTMLInputElement | null;
  private btnTogglePromptPwd: HTMLElement | null;
  private pwdPromptError: HTMLElement | null;
  private btnPwdPromptSubmit: HTMLButtonElement | null;
  private btnPwdPromptCancel: HTMLElement | null;
  private pendingPasswordRoomCode: string | null = null;

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

  private scene: Scene;
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
  public onHostStartExpedition?: (seedInput?: string) => void;
  public onRestartSameSeed?: () => void;
  public onHostHeroChanged?: (hero: CharacterType) => void;
  public onGuestHeroChanged?: (hero: CharacterType) => void;
  public onGuestConnectClicked?: (roomCode: string, hero: CharacterType, password?: string) => void;
  public onHostPasswordChanged?: (password: string) => void;
  public onRefreshRoomsClicked?: () => void;
  public onReturnToMenu?: () => void;

  public static readonly MENU_BACKGROUNDS: readonly string[] = [
    '/textures/ui/menu_background_1.jpg',
    '/textures/ui/menu_background_2.png'
  ];

  public static applyRandomMenuBackground() {
    const list = HUD.MENU_BACKGROUNDS;
    if (list.length === 0) return;
    const chosen = list[Math.floor(Math.random() * list.length)];
    document.documentElement.style.setProperty('--menu-background-url', `url('${chosen}')`);
  }

  constructor(
    scene: Scene,
    onSelectHero: (charType: CharacterType, seedInput?: string, isTrainingMode?: boolean, timeOfDay?: 'random' | 'day' | 'night') => void,
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
    this.passivesBar = document.getElementById('active-passives-bar');

    // The Rift Elements
    this.stageText = document.getElementById('stage-text');
    this.plasmaCreditsText = document.getElementById('plasma-credits');
    this.diffTierLabel = document.getElementById('diff-tier-label');
    this.diffBarFill = document.getElementById('diff-bar-fill');
    this.teleporterEventContainer = document.getElementById('teleporter-event-container');
    this.teleporterStatusText = document.getElementById('teleporter-status-text');
    this.teleporterZoneText = document.getElementById('teleporter-zone-text');
    this.teleporterBarFill = document.getElementById('teleporter-bar-fill');
    this.interactionPrompt = document.getElementById('interaction-prompt');
    this.interactionPromptText = document.getElementById('interaction-prompt-text');
    this.itemInventoryTray = document.getElementById('item-inventory-tray');
    this.dashCooldownBadge = document.getElementById('dash-cooldown-badge');
    this.dashCooldownText = document.getElementById('dash-cooldown-text');

    // Screen Damage & Low HP Vignette
    this.damageFlashLayer = document.getElementById('damage-flash-layer');
    this.lowHpVignetteLayer = document.getElementById('low-hp-vignette-layer');

    // Modals
    this.mainMenuModal = document.getElementById('main-menu-modal')!;
    HUD.applyRandomMenuBackground();
    this.coopModal = document.getElementById('coop-modal')!;
    this.settingsModal = document.getElementById('settings-modal')!;
    this.exitModal = document.getElementById('exit-modal')!;
    this.hostLobbyModal = document.getElementById('host-lobby-modal')!;
    this.joinLobbyModal = document.getElementById('join-lobby-modal')!;
    this.guideModal = document.getElementById('guide-modal')!;
    this.charSelectModal = document.getElementById('character-select-modal')!;
    this.questsModal = document.getElementById('quests-modal')!;
    this.pauseModal = document.getElementById('pause-modal')!;
    this.levelUpModal = document.getElementById('level-up-modal')!;
    this.levelUpStepIndicator = document.getElementById('level-up-step-indicator')!;
    this.levelUpTitle = document.getElementById('level-up-title')!;
    this.levelUpRerollContainer = document.getElementById('level-up-reroll-container');
    this.btnLevelUpReroll = document.getElementById('btn-level-up-reroll') as HTMLButtonElement | null;
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

    // Battle Pass Elements
    this.mainMenuBattlePass = document.getElementById('main-menu-battle-pass');
    this.bpHeaderBtn = document.getElementById('bp-header-btn');
    this.bpBarFill = document.getElementById('bp-bar-fill');
    this.bpRewardsRow = document.getElementById('bp-rewards-row');

    this.battlePassModal = document.getElementById('battle-pass-modal');
    this.btnCloseBpModal = document.getElementById('btn-close-bp-modal');
    this.bpModalCurLvl = document.getElementById('bp-modal-cur-lvl');
    this.bpModalCurXp = document.getElementById('bp-modal-cur-xp');
    this.bpModalTotalXp = document.getElementById('bp-modal-total-xp');
    this.bpModalBarFill = document.getElementById('bp-modal-bar-fill');
    this.btnBpClaimAll = document.getElementById('btn-bp-claim-all');
    this.bpModalTiersContainer = document.getElementById('bp-modal-tiers-container');

    this.gameOverBpBox = document.getElementById('game-over-battle-pass');
    this.gameOverBpPointsGained = document.getElementById('game-over-bp-points-gained');
    this.gameOverBpReason = document.getElementById('game-over-bp-reason');
    this.gameOverBpLevelBadge = document.getElementById('game-over-bp-level-badge');
    this.gameOverBpBarFill = document.getElementById('game-over-bp-bar-fill');
    this.gameOverBpXpText = document.getElementById('game-over-bp-xp-text');
    this.gameOverBpLevelup = document.getElementById('game-over-bp-levelup');

    // Host Lobby Elements
    this.hostRoomCodeText = document.getElementById('host-room-code')!;
    this.btnCopyCode = document.getElementById('btn-copy-code')!;
    this.hostPartnerBox = document.getElementById('host-partner-box')!;
    this.hostPartnerTitle = document.getElementById('host-partner-title')!;
    this.hostPartnerDesc = document.getElementById('host-partner-desc')!;
    this.btnHostStart = document.getElementById('btn-host-start') as HTMLButtonElement;
    this.btnHostBack = document.getElementById('btn-host-back')!;
    this.hostPasswordInput = document.getElementById('host-password-input') as HTMLInputElement;
    this.hostPasswordBadge = document.getElementById('host-password-badge')!;
    this.btnToggleHostPwd = document.getElementById('btn-toggle-host-pwd');

    // Join Lobby Elements
    this.joinRoomInput = document.getElementById('join-room-input') as HTMLInputElement;
    this.joinPasswordInput = document.getElementById('join-password-input') as HTMLInputElement | null;
    this.joinStatusText = document.getElementById('join-status-text')!;
    this.btnJoinConnect = document.getElementById('btn-join-connect') as HTMLButtonElement;
    this.btnGuestReady = document.getElementById('btn-guest-ready') as HTMLButtonElement;
    this.btnJoinBack = document.getElementById('btn-join-back')!;
    this.tabBtnBrowser = document.getElementById('tab-btn-browser');
    this.tabBtnDirect = document.getElementById('tab-btn-direct');
    this.tabContentBrowser = document.getElementById('tab-content-browser');
    this.tabContentDirect = document.getElementById('tab-content-direct');
    this.btnRefreshRooms = document.getElementById('btn-refresh-rooms');
    this.availableRoomsList = document.getElementById('available-rooms-list');

    // Password Prompt Modal
    this.passwordPromptModal = document.getElementById('password-prompt-modal');
    this.pwdPromptRoomTitle = document.getElementById('pwd-prompt-room-title');
    this.pwdPromptInput = document.getElementById('pwd-prompt-input') as HTMLInputElement | null;
    this.btnTogglePromptPwd = document.getElementById('btn-toggle-prompt-pwd');
    this.pwdPromptError = document.getElementById('pwd-prompt-error');
    this.btnPwdPromptSubmit = document.getElementById('btn-pwd-prompt-submit') as HTMLButtonElement | null;
    this.btnPwdPromptCancel = document.getElementById('btn-pwd-prompt-cancel');

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
    // Bind Main Menu Buttons: Single-player mode, Co-op mode, Settings, Exit
    document.getElementById('menu-btn-single')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.hideQuestsModal();
      this.hideMainMenu();
      this.showCharacterSelect();
      if (this.onSinglePlayerSelected) {
        this.onSinglePlayerSelected();
      }
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

    // Right-side Daily & Weekly quest headers in main menu
    document.getElementById('daily-quests-header')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.showQuestsModal('chakram', 1);
    });

    document.getElementById('weekly-quests-header')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.showQuestsModal('archer', 4);
    });

    document.getElementById('quests-btn-back')?.addEventListener('click', () => {
      this.hideQuestsModal();
    });

    document.getElementById('quests-btn-close')?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.hideQuestsModal();
    });

    // Chapter tabs listeners
    const chapterTabs = document.querySelectorAll<HTMLElement>('.quest-chapter-tab[data-chapter]');
    chapterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        SoundManager.playButtonClick();
        const ch = parseInt(tab.getAttribute('data-chapter') || '1', 10);
        this.selectQuestChapter(ch);
      });
    });

    // Progression change listener to keep UI reactive
    ProgressionManager.getInstance().onProgressionChanged = () => {
      this.updateCharacterSelectLockStatus();
      this.updateLobbyHeroesLockStatus();
      if (!this.questsModal.classList.contains('hidden')) {
        this.renderQuestsModal(this.activeQuestHero);
      }
      this.updateMainMenuQuests();
      this.updateMainMenuBattlePass();
    };

    // Battle Pass listeners & change hook
    this.bpHeaderBtn?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.openBattlePassModal();
    });
    this.btnCloseBpModal?.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.hideBattlePassModal();
    });
    document.getElementById('battle-pass-backdrop')?.addEventListener('click', () => {
      this.hideBattlePassModal();
    });
    this.btnBpClaimAll?.addEventListener('click', () => {
      this.handleClaimAllBattlePass();
    });

    BattlePassManager.getInstance().onBattlePassChanged = () => {
      this.updateMainMenuBattlePass();
      if (this.battlePassModal && !this.battlePassModal.classList.contains('hidden')) {
        this.renderBattlePassModal();
      }
    };

    // Initial populate of main menu daily quests, weekly quests and Battle Pass
    this.updateMainMenuQuests();
    this.updateMainMenuBattlePass();

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
      this.handleEscape();
    });

    // Settings Controls
    const volumeSlider = document.getElementById('settings-volume') as HTMLInputElement | null;
    const volumeVal = document.getElementById('settings-volume-val');
    const muteCheckbox = document.getElementById('settings-mute') as HTMLInputElement | null;
    const testSoundBtn = document.getElementById('settings-btn-test-sound');
    const dmgNumbersCheckbox = document.getElementById('settings-damage-numbers') as HTMLInputElement | null;
    const xpNumbersCheckbox = document.getElementById('settings-xp-numbers') as HTMLInputElement | null;
    const autoLevelupCheckbox = document.getElementById('settings-auto-levelup') as HTMLInputElement | null;
    const vfxOpacitySlider = document.getElementById('settings-vfx-opacity') as HTMLInputElement | null;
    const vfxOpacityVal = document.getElementById('settings-vfx-opacity-val');
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

    if (vfxOpacitySlider) {
      const savedVfx = localStorage.getItem('wildwest_vfx_opacity');
      const initialVfx = savedVfx !== null ? parseInt(savedVfx, 10) : 100;
      vfxOpacitySlider.value = String(initialVfx);
      if (vfxOpacityVal) vfxOpacityVal.innerText = `${initialVfx}%`;
      const normVal = initialVfx / 100;
      Projectile.setVfxOpacity(normVal);
      HolyAuraWeapon.setVfxOpacity(normVal);

      vfxOpacitySlider.addEventListener('input', () => {
        const val = parseInt(vfxOpacitySlider.value, 10);
        if (vfxOpacityVal) vfxOpacityVal.innerText = `${val}%`;
        const nVal = val / 100;
        Projectile.setVfxOpacity(nVal);
        HolyAuraWeapon.setVfxOpacity(nVal);
        localStorage.setItem('wildwest_vfx_opacity', String(val));
      });
    }

    if (dmgNumbersCheckbox) {
      const savedDmg = localStorage.getItem('wildwest_show_damage');
      const dmgEnabled = savedDmg !== 'false';
      dmgNumbersCheckbox.checked = dmgEnabled;
      DamageNumberManager.damageEnabled = dmgEnabled;
      dmgNumbersCheckbox.addEventListener('change', () => {
        DamageNumberManager.damageEnabled = dmgNumbersCheckbox.checked;
        localStorage.setItem('wildwest_show_damage', dmgNumbersCheckbox.checked ? 'true' : 'false');
      });
    }

    if (xpNumbersCheckbox) {
      const savedXp = localStorage.getItem('wildwest_show_xp');
      const xpEnabled = savedXp !== 'false';
      xpNumbersCheckbox.checked = xpEnabled;
      DamageNumberManager.xpEnabled = xpEnabled;
      xpNumbersCheckbox.addEventListener('change', () => {
        DamageNumberManager.xpEnabled = xpNumbersCheckbox.checked;
        localStorage.setItem('wildwest_show_xp', xpNumbersCheckbox.checked ? 'true' : 'false');
      });
    }

    if (autoLevelupCheckbox) {
      const savedAuto = localStorage.getItem('wildwest_auto_levelup');
      this.isAutoLevelUp = savedAuto === 'true'; // Default is disabled (false)
      autoLevelupCheckbox.checked = this.isAutoLevelUp;
      autoLevelupCheckbox.addEventListener('change', () => {
        this.isAutoLevelUp = autoLevelupCheckbox.checked;
        localStorage.setItem('wildwest_auto_levelup', this.isAutoLevelUp ? 'true' : 'false');
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

    // Settings Tabs switching
    const settingsTabBtns = document.querySelectorAll<HTMLButtonElement>('.settings-tab-btn');
    settingsTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as 'video' | 'audio' | 'ui' | 'controls' | 'data' | null;
        if (tab) {
          this.activateSettingsTab(tab);
        }
      });
    });

    const resolutionSelect = document.getElementById('settings-resolution') as HTMLSelectElement | null;
    if (resolutionSelect) {
      resolutionSelect.addEventListener('change', () => {
        const scale = parseFloat(resolutionSelect.value) || 1;
        if (this.onResolutionScaleChanged) {
          this.onResolutionScaleChanged(scale);
        }
      });
    }

    const shadowQualitySelect = document.getElementById('settings-shadow-quality') as HTMLSelectElement | null;
    if (shadowQualitySelect) {
      const savedQuality = localStorage.getItem('wildwest_shadow_quality') || '1024';
      shadowQualitySelect.value = savedQuality;
      shadowQualitySelect.addEventListener('change', () => {
        const val = parseInt(shadowQualitySelect.value, 10);
        localStorage.setItem('wildwest_shadow_quality', String(val));
        if (this.onShadowQualityChanged) {
          this.onShadowQualityChanged(val);
        }
      });
    }

    const clearDataBtn = document.getElementById('settings-btn-clear-data') as HTMLButtonElement | null;
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => {
        const confirmClear = window.confirm(
          'Вы действительно хотите удалить все сохранённые данные игры?\n\n' +
          'Это действие безвозвратно сбросит уровень аккаунта, открытых героев, золото, выполненные квесты и настройки.'
        );
        if (confirmClear) {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (e) {
            console.error('Failed to clear storage:', e);
          }
          window.location.reload();
        }
      });
    }

    openGuideBtn?.addEventListener('click', () => {
      this.showGuide();
    });

    settingsBackBtn?.addEventListener('click', () => {
      this.handleEscape();
    });

    // Exit Modal Buttons
    this.setupExitListeners();

    document.getElementById('btn-close-guide')?.addEventListener('click', () => {
      this.handleEscape();
    });

    // Host Lobby Hero Selector
    const hostHeroOpts = document.querySelectorAll<HTMLElement>('.lobby-hero-opt[data-host-hero]');
    hostHeroOpts.forEach((opt) => {
      opt.addEventListener('click', () => {
        const hero = opt.getAttribute('data-host-hero') as CharacterType;
        if (!ProgressionManager.getInstance().isHeroUnlocked(hero)) {
          this.triggerAltarNotification('Герой заблокирован', 'Откройте в книге заданий!', '🔒', '#a855f7');
          return;
        }
        hostHeroOpts.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
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
      this.handleEscape();
    });

    // Guest Lobby Hero Selector
    const guestHeroOpts = document.querySelectorAll<HTMLElement>('.lobby-hero-opt[data-guest-hero]');
    guestHeroOpts.forEach((opt) => {
      opt.addEventListener('click', () => {
        const hero = opt.getAttribute('data-guest-hero') as CharacterType;
        if (!ProgressionManager.getInstance().isHeroUnlocked(hero)) {
          this.triggerAltarNotification('Герой заблокирован', 'Откройте в книге заданий!', '🔒', '#a855f7');
          return;
        }
        guestHeroOpts.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        this.guestSelectedHero = hero;
        if (this.onGuestHeroChanged) {
          this.onGuestHeroChanged(this.guestSelectedHero);
        }
      });
    });

    // Host Password Input & visibility toggle
    this.hostPasswordInput?.addEventListener('input', () => {
      const pwd = this.hostPasswordInput.value.trim();
      if (pwd) {
        this.hostPasswordBadge.innerText = '🔒 С ПАРОЛЕМ';
        this.hostPasswordBadge.className = 'password-badge locked';
      } else {
        this.hostPasswordBadge.innerText = '🔓 БЕЗ ПАРОЛЯ';
        this.hostPasswordBadge.className = 'password-badge open';
      }
      if (this.onHostPasswordChanged) {
        this.onHostPasswordChanged(pwd);
      }
    });

    this.btnToggleHostPwd?.addEventListener('click', () => {
      if (this.hostPasswordInput.type === 'password') {
        this.hostPasswordInput.type = 'text';
      } else {
        this.hostPasswordInput.type = 'password';
      }
    });

    this.btnTogglePromptPwd?.addEventListener('click', () => {
      if (this.pwdPromptInput && this.pwdPromptInput.type === 'password') {
        this.pwdPromptInput.type = 'text';
      } else if (this.pwdPromptInput) {
        this.pwdPromptInput.type = 'password';
      }
    });

    // Join Tabs Switcher
    this.tabBtnBrowser?.addEventListener('click', () => {
      this.switchJoinTab('browser');
    });

    this.tabBtnDirect?.addEventListener('click', () => {
      this.switchJoinTab('direct');
    });

    this.btnRefreshRooms?.addEventListener('click', () => {
      if (this.onRefreshRoomsClicked) {
        this.onRefreshRoomsClicked();
      }
    });

    // Password Prompt Actions
    this.btnPwdPromptCancel?.addEventListener('click', () => {
      this.hidePasswordPrompt();
    });

    this.btnPwdPromptSubmit?.addEventListener('click', () => {
      this.submitPasswordPrompt();
    });

    this.pwdPromptInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.submitPasswordPrompt();
      }
    });

    // Guest Join Connect Button
    this.btnJoinConnect.addEventListener('click', () => {
      const code = this.joinRoomInput.value.trim().toUpperCase();
      if (!code) {
        this.setJoinStatus('Пожалуйста, введите код комнаты!', true);
        return;
      }
      const pwd = this.joinPasswordInput?.value?.trim() || undefined;
      this.btnJoinConnect.disabled = true;
      this.btnJoinConnect.innerText = '⏳ Подключение...';
      if (this.onGuestConnectClicked) {
        this.onGuestConnectClicked(code, this.guestSelectedHero, pwd);
      }
    });

    this.joinRoomInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.btnJoinConnect.click();
      }
    });

    this.joinPasswordInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.btnJoinConnect.click();
      }
    });

    this.btnGuestReady?.addEventListener('click', () => {
      this.isGuestReady = !this.isGuestReady;
      this.updateGuestReadyButtonUI();
      if (this.isGuestReady) {
        this.setJoinStatus('Вы готовы к походу! Ожидание старта хостом...', false);
      } else {
        const code = this.joinRoomInput.value.toUpperCase().trim();
        this.setJoinStatus(code ? `Подключено к ${code}! Нажмите «ГОТОВ» для подтверждения.` : 'Подключено к экспедиции! Нажмите «ГОТОВ» для подтверждения.', false);
      }
      if (this.onGuestReadyToggle) {
        this.onGuestReadyToggle(this.isGuestReady);
      }
    });

    this.btnJoinBack.addEventListener('click', () => {
      this.handleEscape();
    });

    // Character Select Back Button
    this.btnCharSelectBack?.addEventListener('click', () => {
      this.handleEscape();
    });

    // Bind Character Select Buttons
    const charCards = document.querySelectorAll('.character-card');
    charCards.forEach((card) => {
      card.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const hero = (target.getAttribute('data-hero') || 'ronin') as CharacterType;
        if (!ProgressionManager.getInstance().isHeroUnlocked(hero)) {
          this.hideCharacterSelect();
          this.showQuestsModal(hero);
          return;
        }
        const trainingCheckbox = document.getElementById('training-mode-toggle') as HTMLInputElement | null;
        const isTraining = Boolean(trainingCheckbox?.checked);
        const timeOfDaySelect = document.getElementById('select-time-of-day') as HTMLSelectElement | null;
        const timeOfDay = (timeOfDaySelect?.value as 'random' | 'day' | 'night') || 'random';

        this.hideCharacterSelect();
        onSelectHero(hero, undefined, isTraining, timeOfDay);
      });
    });

    // Mobile & Pause Dev Mode Buttons
    document.getElementById('btn-dev-mobile-trigger')?.addEventListener('click', () => {
      this.onToggleDevMode?.();
    });

    document.getElementById('btn-pause-dev')?.addEventListener('click', () => {
      this.hidePause();
      this.onToggleDevMode?.();
    });

    // Pause Resume & Settings & Restart & Menu
    this.btnResume.addEventListener('click', () => {
      this.hidePause();
      onResume();
    });

    document.getElementById('btn-pause-restart-same')?.addEventListener('click', () => {
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
      exitMsg.innerHTML = 'Вы уверены, что хотите выйти из игры?<br><span style="font-size: 13px; color: #a89f91;">Are you sure you want to exit the game?</span>';
    }
    if (exitActions) {
      exitActions.innerHTML = '<button id="btn-confirm-exit" class="action-btn exit-btn-danger">Выйти / Exit</button><button id="btn-cancel-exit" class="action-btn secondary-btn">Отмена / Cancel</button>';
      this.setupExitListeners();
    }
  }

  public showMainMenu() {
    this.menuStack = [];
    this.hideCoopMenu();
    this.hideSettings();
    this.hideExitModal();
    this.hideHostLobby();
    this.hideJoinLobby();
    this.hidePause();
    this.hideGameOver();
    this.hideLevelUp();
    this.hideGuide();
    this.hideCharacterSelect();
    this.hideQuestsModal();
    this.hideBattlePassModal();
    this.updateMainMenuQuests();
    this.updateMainMenuBattlePass();
    HUD.applyRandomMenuBackground();
    this.mainMenuModal.classList.remove('hidden');
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
          <img src="${q.icon}" alt="${q.title}" draggable="false" />
        </div>
        <div class="quest-card-info">
          <div class="quest-card-name">${q.title}</div>
          <div class="quest-card-bar-wrap">
            <div class="quest-card-bar-fill ${q.isComplete ? 'completed' : ''}" style="width: ${q.progressPercent}%;"></div>
            <span class="quest-card-bar-val">${q.current}/${q.max}</span>
          </div>
        </div>
        <div class="quest-card-reward ${q.isComplete && !q.isClaimed ? 'claimable-pulse' : ''}">
          <img src="${q.rewardIcon}" alt="${q.rewardLabel}" draggable="false" />
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
            this.triggerAltarNotification('Награда получена!', `${q.title}: +${res.label}`, '🎁', '#f59e0b');
            this.updateMainMenuQuests();
          }
        } else if (q.isClaimed) {
          SoundManager.playButtonClick();
          this.triggerAltarNotification('Задание завершено', `Награда за «${q.title}» уже получена!`, '✓', '#10b981');
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

  public updateMainMenuBattlePass() {
    const bp = BattlePassManager.getInstance();
    const curLevel = bp.getLevel();
    const progressPct = bp.getProgressPercent();

    // 1. Progress Bar Fill
    const barFill = this.bpBarFill || document.getElementById('bp-bar-fill');
    if (barFill) {
      barFill.style.width = `${progressPct}%`;
    }

    // 2. Milestones reached state
    const m1 = document.querySelector('.bp-milestone.bp-m-lvl1');
    const m10 = document.querySelector('.bp-milestone.bp-m-lvl10');
    const m15 = document.querySelector('.bp-milestone.bp-m-lvl15');
    if (m1) m1.classList.toggle('reached', curLevel >= 1);
    if (m10) m10.classList.toggle('reached', curLevel >= 10);
    if (m15) m15.classList.toggle('reached', curLevel >= 15);

    // 3. Rewards Row
    const rowContainer = this.bpRewardsRow || document.getElementById('bp-rewards-row');
    if (!rowContainer) return;
    rowContainer.innerHTML = '';

    // Slot 0: Free pass badge card
    const freeSlot = document.createElement('div');
    freeSlot.className = 'bp-slot-card bp-slot-free';
    freeSlot.setAttribute('role', 'button');
    freeSlot.setAttribute('tabindex', '0');
    freeSlot.setAttribute('title', 'Бесплатный боевой пропуск 1-го сезона активен для всех игроков');
    freeSlot.innerHTML = `
      <div class="bp-slot-box bp-slot-free-box">
        <img src="/textures/ui/bp_badge_free.png" class="bp-slot-img bp-badge-img" alt="Бесплатно" />
      </div>
      <span class="bp-free-ribbon">БЕСПЛАТНО</span>
    `;
    freeSlot.addEventListener('click', () => {
      SoundManager.playButtonClick();
      this.openBattlePassModal();
    });
    rowContainer.appendChild(freeSlot);

    // Visible rewards: levels 1 to 6 (or scrolling sliding window for higher levels)
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
            this.showBalanceToast(`Получена награда ур. ${reward.level}: ${res.reward.name} (+${res.reward.coins} монет)!`);
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

    if (this.bpModalCurLvl) {
      this.bpModalCurLvl.innerText = curLevel >= BP_MAX_LEVEL ? '15 (МАКС)' : curLevel.toString();
    }
    if (this.bpModalCurXp) {
      this.bpModalCurXp.innerText = curLevel >= BP_MAX_LEVEL ? `${BP_POINTS_PER_LEVEL} / ${BP_POINTS_PER_LEVEL} ОП` : `${ptsInLvl} / ${BP_POINTS_PER_LEVEL} ОП`;
    }
    if (this.bpModalTotalXp) {
      this.bpModalTotalXp.innerText = `Всего: ${curPts} / ${BP_MAX_POINTS} ОП`;
    }
    if (this.bpModalBarFill) {
      this.bpModalBarFill.style.width = `${progressPct}%`;
    }

    const container = this.bpModalTiersContainer || document.getElementById('bp-modal-tiers-container');
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
        btnHtml = `<button class="bp-tier-btn claim-now select-btn">ЗАБРАТЬ</button>`;
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
            this.showBalanceToast(`Получена награда ур. ${reward.level}: ${res.reward.name} (+${res.reward.coins} монет)!`);
            this.renderBattlePassModal();
            this.updateMainMenuBattlePass();
          }
        });
      }

      container.appendChild(card);
    }

    if (this.btnBpClaimAll) {
      this.btnBpClaimAll.classList.toggle('hidden', !hasAnyClaimable);
    }
  }

  public openBattlePassModal() {
    this.renderBattlePassModal();
    if (this.menuStack[this.menuStack.length - 1] !== 'battle_pass') {
      this.menuStack.push('battle_pass');
    }
    this.battlePassModal?.classList.remove('hidden');
  }

  public hideBattlePassModal() {
    this.menuStack = this.menuStack.filter((s) => s !== 'battle_pass');
    this.battlePassModal?.classList.add('hidden');
  }

  public handleClaimAllBattlePass() {
    const bp = BattlePassManager.getInstance();
    const res = bp.claimAllAvailable();
    if (res.claimedCount > 0) {
      SoundManager.playChestOpen();
      this.showBalanceToast(`Забрано ${res.claimedCount} наград: +${res.totalCoins} монет!`);
      this.renderBattlePassModal();
      this.updateMainMenuBattlePass();
    } else {
      this.showBalanceToast('Нет доступных наград для получения');
    }
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
    this.settingsFromPause = (from === 'pause') || this.isPaused || this.menuStack.includes('pause');
    if (this.settingsFromPause) {
      this.pauseModal.classList.add('hidden');
      if (!this.menuStack.includes('pause')) {
        this.menuStack.push('pause');
      }
      if (this.menuStack[this.menuStack.length - 1] !== 'settings') {
        this.menuStack.push('settings');
      }
    } else {
      this.hideMainMenu();
      this.menuStack = ['settings'];
    }

    const backBtn = document.getElementById('settings-btn-back');
    if (backBtn) {
      backBtn.innerText = this.settingsFromPause ? '← Назад в меню паузы' : '← Назад в главное меню';
    }

    this.activateSettingsTab('video');
    this.settingsModal.classList.remove('hidden');
  }

  public hideSettings() {
    this.settingsModal.classList.add('hidden');
    this.menuStack = this.menuStack.filter((s) => s !== 'settings');
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

  public showHostLobby(roomCode: string, hero: CharacterType) {
    this.hideCoopMenu();
    this.menuStack = ['coop', 'host_lobby'];
    this.hostRoomCodeText.innerText = roomCode;
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
    if (this.hostPasswordInput) {
      this.hostPasswordInput.value = '';
    }
    if (this.hostPasswordBadge) {
      this.hostPasswordBadge.innerText = '🔓 БЕЗ ПАРОЛЯ';
      this.hostPasswordBadge.className = 'password-badge open';
    }
    this.renderHostRoster([initialHostInfo]);
    this.hostLobbyModal.classList.remove('hidden');
  }

  public hideHostLobby() {
    this.hostLobbyModal.classList.add('hidden');
    this.menuStack = this.menuStack.filter((s) => s !== 'host_lobby');
  }

  public setHostPartnerConnected(connected: boolean, hero?: CharacterType) {
    if (connected) {
      this.hostPartnerBox.className = 'partner-status-box connected';
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
      this.hostPartnerTitle.innerText = `Игрок подключился! (${heroName})`;
      this.hostPartnerDesc.innerText = 'Игрок готов к экспедиции! Вы можете начать поход или дождаться остальных.';
      this.btnHostStart.disabled = false;
    } else {
      this.hostPartnerBox.className = 'partner-status-box waiting';
      this.hostPartnerTitle.innerText = 'Ожидание игроков...';
      this.hostPartnerDesc.innerText = 'Отправьте код комнаты друзьям. Можно начать поход в любой момент!';
      this.btnHostStart.disabled = false;
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
    this.renderRosterGrid(this.hostPlayersRoster, list, 'p1');
    if (this.hostPlayerCount) {
      this.hostPlayerCount.innerText = `${list.length}`;
    }
    const countBadge = document.getElementById('host-player-count-badge');
    if (countBadge) {
      countBadge.innerText = `${list.length} / 5 ИГРОКОВ`;
    }

    const guests = list.filter(p => !p.isHost && p.id !== 'p1');
    const allGuestsReady = guests.length === 0 || guests.every(p => p.isReady);

    if (list.length > 1) {
      if (allGuestsReady) {
        this.hostPartnerBox.className = 'partner-status-box connected';
        this.hostPartnerTitle.innerText = `Отряд готов (${list.length}/5)! Все подтвердили готовность.`;
        this.hostPartnerDesc.innerText = 'Все игроки готовы! Вы можете выдвигаться в экспедицию.';
        this.btnHostStart.disabled = false;
        this.btnHostStart.innerText = 'НАЧАТЬ ЭКСПЕДИЦИЮ';
      } else {
        const notReadyCount = guests.filter(p => !p.isReady).length;
        this.hostPartnerBox.className = 'partner-status-box waiting';
        this.hostPartnerTitle.innerText = `Ожидание подтверждения (${notReadyCount} не готовы)`;
        this.hostPartnerDesc.innerText = 'Игроки подключились, но ещё не нажали «ГОТОВ». Дождитесь подтверждения от всех игроков.';
        this.btnHostStart.disabled = true;
        this.btnHostStart.innerText = 'ОЖИДАНИЕ ГОТОВНОСТИ ИГРОКОВ...';
      }
    } else {
      this.hostPartnerBox.className = 'partner-status-box waiting';
      this.hostPartnerTitle.innerText = 'Ожидание игроков в отряд...';
      this.hostPartnerDesc.innerText = 'Отправьте код комнаты друзьям. Можно начать поход в любой момент!';
      this.btnHostStart.disabled = false;
      this.btnHostStart.innerText = 'НАЧАТЬ ЭКСПЕДИЦИЮ';
    }
  }

  public renderJoinRoster(lobbyPlayers: LobbyPlayerInfo[], mySlotId: string = 'p2') {
    if (this.joinRosterSection) {
      this.joinRosterSection.classList.remove('hidden');
    }
    this.renderRosterGrid(this.joinPlayersRoster, lobbyPlayers, mySlotId);
    if (this.joinPlayerCount) {
      this.joinPlayerCount.innerText = `${lobbyPlayers.length}`;
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
      const code = this.joinRoomInput.value.toUpperCase().trim();
      this.setJoinStatus(code ? `Подключено к ${code}! Нажмите «ГОТОВ» для подтверждения.` : 'Подключено к экспедиции! Нажмите «ГОТОВ» для подтверждения.', false);
    }
  }

  private renderRosterGrid(container: HTMLElement, lobbyPlayers: LobbyPlayerInfo[], mySlotId: string = 'p1') {
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
        const isDirect = this.tabBtnDirect?.classList.contains('active');
        if (isDirect) {
          this.btnJoinConnect.classList.remove('hidden');
        } else {
          this.btnJoinConnect.classList.add('hidden');
        }
        this.btnJoinConnect.disabled = false;
        this.btnJoinConnect.innerText = 'ПОДКЛЮЧИТЬСЯ';
      }
    }
    if (this.joinRoomInput) {
      this.joinRoomInput.disabled = connected;
    }
    if (this.joinPasswordInput) {
      this.joinPasswordInput.disabled = connected;
    }

    if (connected) {
      this.hidePasswordPrompt();
      this.tabBtnBrowser?.parentElement?.classList.add('hidden');
      this.tabContentBrowser?.classList.add('hidden');
      this.tabContentDirect?.classList.add('hidden');
    } else {
      this.tabBtnBrowser?.parentElement?.classList.remove('hidden');
      const isBrowser = this.tabBtnBrowser?.classList.contains('active');
      if (isBrowser) {
        this.tabContentBrowser?.classList.remove('hidden');
        this.tabContentDirect?.classList.add('hidden');
      } else {
        this.tabContentBrowser?.classList.add('hidden');
        this.tabContentDirect?.classList.remove('hidden');
      }
    }
  }

  public switchJoinTab(tab: 'browser' | 'direct') {
    if (tab === 'browser') {
      this.tabBtnBrowser?.classList.add('active');
      this.tabBtnDirect?.classList.remove('active');
      this.tabContentBrowser?.classList.remove('hidden');
      this.tabContentDirect?.classList.add('hidden');
      this.btnJoinConnect?.classList.add('hidden');
      this.setJoinStatus('Выберите комнату из списка для подключения', false);
      if (this.onRefreshRoomsClicked) {
        this.onRefreshRoomsClicked();
      }
    } else {
      this.tabBtnBrowser?.classList.remove('active');
      this.tabBtnDirect?.classList.add('active');
      this.tabContentBrowser?.classList.add('hidden');
      this.tabContentDirect?.classList.remove('hidden');
      if (!this.isGuestConnected) {
        this.btnJoinConnect?.classList.remove('hidden');
      }
      this.setJoinStatus('Введите код комнаты и нажмите «Подключиться»', false);
    }
  }

  public showPasswordPrompt(roomCode: string) {
    this.pendingPasswordRoomCode = roomCode;
    if (this.menuStack[this.menuStack.length - 1] !== 'password_prompt') {
      this.menuStack.push('password_prompt');
    }
    if (this.pwdPromptRoomTitle) {
      this.pwdPromptRoomTitle.innerText = `КОМНАТА ${roomCode}`;
    }
    if (this.pwdPromptInput) {
      this.pwdPromptInput.value = '';
    }
    if (this.pwdPromptError) {
      this.pwdPromptError.classList.add('hidden');
    }
    this.passwordPromptModal?.classList.remove('hidden');
    setTimeout(() => this.pwdPromptInput?.focus(), 50);
  }

  public hidePasswordPrompt() {
    this.pendingPasswordRoomCode = null;
    this.passwordPromptModal?.classList.add('hidden');
    if (this.pwdPromptError) {
      this.pwdPromptError.classList.add('hidden');
    }
    this.menuStack = this.menuStack.filter((s) => s !== 'password_prompt');
  }

  public showPasswordPromptError(msg: string = 'Неверный пароль. Попробуйте снова.') {
    if (this.pwdPromptError) {
      this.pwdPromptError.innerText = msg;
      this.pwdPromptError.classList.remove('hidden');
    }
    if (this.pwdPromptInput) {
      this.pwdPromptInput.focus();
      this.pwdPromptInput.select();
    }
  }

  private submitPasswordPrompt() {
    if (!this.pendingPasswordRoomCode) return;
    const pwd = this.pwdPromptInput?.value?.trim() || '';
    const roomCode = this.pendingPasswordRoomCode;
    this.hidePasswordPrompt();
    this.joinRoomInput.value = roomCode;
    if (this.joinPasswordInput) {
      this.joinPasswordInput.value = pwd;
    }
    if (this.onGuestConnectClicked) {
      this.onGuestConnectClicked(roomCode, this.guestSelectedHero, pwd);
    }
  }

  public renderAvailableRooms(rooms: PublicRoomInfo[]) {
    if (!this.availableRoomsList) return;
    this.availableRoomsList.innerHTML = '';

    if (!rooms || rooms.length === 0) {
      this.availableRoomsList.innerHTML = `
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
            this.joinRoomInput.value = r.roomCode;
            if (this.joinPasswordInput) {
              this.joinPasswordInput.value = '';
            }
            if (this.onGuestConnectClicked) {
              this.onGuestConnectClicked(r.roomCode, this.guestSelectedHero, '');
            }
          }
        });
      }

      this.availableRoomsList.appendChild(card);
    }
  }

  public showJoinLobby(defaultHero: CharacterType = 'valkyrie') {
    this.hideCoopMenu();
    this.menuStack = ['coop', 'join_lobby'];
    this.joinRoomInput.value = '';
    if (this.joinPasswordInput) {
      this.joinPasswordInput.value = '';
    }
    this.isGuestReady = false;
    this.isGuestConnected = false;
    this.setGuestConnectedMode(false);
    this.switchJoinTab('browser');
    this.setJoinStatus('Выберите экспедицию из списка или перейдите на вкладку «Ввод по коду»', false);
    if (this.joinRosterSection) {
      this.joinRosterSection.classList.add('hidden');
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
    this.joinLobbyModal.classList.remove('hidden');
    if (this.onRefreshRoomsClicked) {
      this.onRefreshRoomsClicked();
    }
  }

  public hideJoinLobby() {
    this.hidePasswordPrompt();
    this.setGuestConnectedMode(false);
    this.joinLobbyModal.classList.add('hidden');
    this.menuStack = this.menuStack.filter((s) => s !== 'join_lobby');
  }

  public setJoinStatus(text: string, isError: boolean = false) {
    this.joinStatusText.innerText = text;
    this.joinStatusText.style.color = isError ? '#ef4444' : '#fbbf24';
  }

  public showGuide() {
    if (!this.settingsModal.classList.contains('hidden')) {
      this.settingsModal.classList.add('hidden');
      if (this.menuStack[this.menuStack.length - 1] !== 'guide') {
        this.menuStack.push('guide');
      }
    } else if (!this.pauseModal.classList.contains('hidden')) {
      this.pauseModal.classList.add('hidden');
      if (this.menuStack[this.menuStack.length - 1] !== 'guide') {
        this.menuStack.push('guide');
      }
    } else {
      this.hideMainMenu();
      this.menuStack = ['guide'];
    }
    this.guideModal.classList.remove('hidden');
  }

  public hideGuide() {
    this.guideModal.classList.add('hidden');
    this.menuStack = this.menuStack.filter((s) => s !== 'guide');
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
    _lobbyPlayers: LobbyPlayerInfo[] = []
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
      credits?: number;
      weapons: { id: string; name: string; icon: string; level: number }[];
      buffs: { type: BuffType; icon: string; duration: number }[];
      items: { id: string; count: number }[];
    }[] = [];

    // 1. Local Player
    const localSlotNum = getPlayerSlotNumber(mySlotId);
    const localDisplayName = role === 'solo' ? 'Игрок 1 (Вы)' : `Игрок ${localSlotNum} (Вы)`;
    const localColor = (PLAYER_COLORS[mySlotId]?.css) || '#f59e0b';
    const localBuffs: { type: BuffType; icon: string; duration: number }[] = [];
    for (const b of localPlayer.activeBuffs.values()) {
      localBuffs.push({ type: b.type, icon: b.icon, duration: b.duration });
    }

    members.push({
      id: mySlotId || 'p1',
      name: localDisplayName,
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
      credits: localPlayer.credits,
      weapons: localPlayer.weapons.map(w => ({ id: w.id, name: w.name, icon: w.icon, level: w.level })),
      buffs: localBuffs,
      items: Array.from(localPlayer.riftItems.entries()).map(([id, count]) => ({ id, count }))
    });

    // 2. Remote Teammates
    for (const [id, rp] of remotePlayers) {
      const rpBuffs: { type: BuffType; icon: string; duration: number }[] = [];
      for (const b of rp.activeBuffs.values()) {
        rpBuffs.push({ type: b.type, icon: b.icon, duration: b.duration });
      }
      const remoteSlotNum = getPlayerSlotNumber(id);
      const remoteDisplayName = `Игрок ${remoteSlotNum}`;

      members.push({
        id,
        name: remoteDisplayName,
        hero: rp.charType,
        colorCss: rp.colorCss,
        hp: rp.hp,
        maxHp: rp.maxHp,
        level: rp.level,
        xp: rp.xp,
        xpToNextLevel: rp.xpToNextLevel,
        credits: rp.credits,
        isDowned: rp.isDowned,
        reviveProgress: rp.reviveProgress,
        isLocal: false,
        hasInvuln: rp.activeBuffs.has('invulnerable'),
        weapons: rp.weapons,
        buffs: rpBuffs,
        items: Array.from(rp.riftItems.entries()).map(([itemId, count]) => ({ id: itemId, count }))
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
              <span class="poe-credits-tag" style="margin-left: 6px; font-size: 11px; color: #fbbf24; font-weight: bold;">⚡ ${m.credits ?? 0}</span>
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
              <div class="poe-member-items"></div>
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

      const creditsEl = el.querySelector<HTMLElement>('.poe-credits-tag');
      if (creditsEl && creditsEl.innerText !== `⚡ ${m.credits ?? 0}`) {
        creditsEl.innerText = `⚡ ${m.credits ?? 0}`;
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

      // Update items row
      const itemsRow = el.querySelector<HTMLElement>('.poe-member-items');
      if (itemsRow) {
        let itemsHtml = '';
        for (const it of m.items) {
          const def = RIFT_ITEMS[it.id as RiftItemId];
          if (def) {
            itemsHtml += `<span class="poe-item-pill" title="${def.name}: ${def.description}"><span class="pill-icon">${def.icon}</span><span class="pill-lvl">x${it.count}</span></span>`;
          }
        }
        if (itemsRow.innerHTML !== itemsHtml) {
          itemsRow.innerHTML = itemsHtml;
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
  }

  public hideCharacterSelect() {
    this.charSelectModal.classList.add('hidden');
    this.menuStack = this.menuStack.filter((s) => s !== 'char_select');
  }

  public toggleQuestsInMainMenu() {
    if (this.isQuestsOpenInMenu && !this.questsModal.classList.contains('hidden')) {
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

  public showQuestsModal(selectedQuestId: string = 'chakram', chapter: number = 1) {
    this.activeQuestChapter = chapter;
    this.activeQuestId = selectedQuestId;
    if (selectedQuestId === 'chakram' || selectedQuestId === 'valkyrie' || selectedQuestId === 'flail' || selectedQuestId === 'sorceress' || selectedQuestId === 'archer') {
      this.activeQuestHero = selectedQuestId as CharacterType;
    }

    if (this.isPaused || this.menuStack.includes('pause')) {
      this.pauseModal.classList.add('hidden');
      if (this.menuStack[this.menuStack.length - 1] !== 'quests') {
        this.menuStack.push('quests');
      }
      this.questsModal.classList.remove('in-main-menu');
      this.isQuestsOpenInMenu = false;
    } else {
      this.mainMenuModal.classList.add('quests-open');
      this.questsModal.classList.add('in-main-menu');
      this.mainMenuBattlePass?.classList.add('hidden');
      document.getElementById('menu-btn-quests')?.classList.add('active');
      this.isQuestsOpenInMenu = true;
      if (this.menuStack[this.menuStack.length - 1] !== 'quests') {
        this.menuStack.push('quests');
      }
    }
    this.renderQuestsModal(selectedQuestId, chapter);
    this.questsModal.classList.remove('hidden');
  }

  public hideQuestsModal() {
    this.questsModal.classList.add('hidden');
    this.questsModal.classList.remove('in-main-menu');
    this.mainMenuModal.classList.remove('quests-open');
    this.mainMenuBattlePass?.classList.remove('hidden');
    document.getElementById('menu-btn-quests')?.classList.remove('active');
    this.isQuestsOpenInMenu = false;
    this.menuStack = this.menuStack.filter((s) => s !== 'quests');
  }

  public getChapterQuests(chapter: number): Array<{
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
  }> {
    const prog = ProgressionManager.getInstance();

    if (chapter === 1) {
      // Глава I: Пробуждение (5 quests matching concept screenshot)
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
      // Глава II: Охота на Лешего
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
      // Глава III: Стражи Разлома
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
      // Глава IV: Контракты Охотников
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

  public renderQuestsModal(selectedQuestId: string = this.activeQuestId, chapter: number = this.activeQuestChapter) {
    this.activeQuestChapter = chapter;
    this.activeQuestId = selectedQuestId;
    const prog = ProgressionManager.getInstance();

    // 1. Account Info Badge in header
    const lvlEl = document.getElementById('quest-acc-lvl-text');
    if (lvlEl) lvlEl.innerText = `УРОВЕНЬ АККАУНТА: ${prog.data.accountLevel}`;
    const xpEl = document.getElementById('quest-acc-xp-text');
    if (xpEl) xpEl.innerText = `(${prog.data.accountXp} / ${prog.data.accountXpToNext} XP)`;
    const coinsEl = document.getElementById('quest-acc-coins-text');
    if (coinsEl) coinsEl.innerText = `🪙 ${prog.data.walletCoins}`;

    // 2. Update Chapter Tabs sidebar (.quest-chapter-tab)
    const chapterTabs = document.querySelectorAll<HTMLElement>('.quest-chapter-tab[data-chapter]');
    chapterTabs.forEach((tab) => {
      const ch = parseInt(tab.getAttribute('data-chapter') || '1', 10);
      if (ch === this.activeQuestChapter) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // 3. Left Page: Quest Items List for current Chapter
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
            <img src="${q.icon}" class="quest-item-avatar" alt="${q.title}" />
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

    // 4. Right Page: Selected Quest Details
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

    // Target avatar portrait (Leshy for chakram quest, or hero avatar)
    const targetAvatarEl = document.getElementById('quest-target-avatar') as HTMLImageElement | null;
    if (targetAvatarEl) {
      targetAvatarEl.src = activeQuest.targetAvatar;
    }

    // Steps checklist
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

    // Rewards
    const potEl = document.getElementById('reward-val-potions');
    if (potEl) potEl.innerText = `x${activeQuest.rewards.potions}`;
    const coinEl = document.getElementById('reward-val-coins');
    if (coinEl) coinEl.innerText = String(activeQuest.rewards.coins);
    const chestEl = document.getElementById('reward-val-chest');
    if (chestEl) chestEl.innerText = String(activeQuest.rewards.chest);

    // Status & Action buttons
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
                this.triggerAltarNotification('Герой Разблокирован!', 'Эльф лучник доступен для игры!', '🏹', '#10b981');
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
                  this.triggerAltarNotification('Достижение Выполнено!', 'Эльф лучник разблокирован!', '🏹', '#10b981');
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
                this.triggerAltarNotification('Квест Завершён!', 'Кира «Танцующий Чакрам» разблокирована!', '🪃', '#10b981');
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
            // Valkyrie, Flail, Sorceress
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
                this.triggerAltarNotification('Герой Разблокирован!', `${hDef.heroName} доступен(на) для игры!`, '⭐', '#10b981');
                this.renderQuestsModal(hero, this.activeQuestChapter);
              });
              actionsEl.appendChild(claimBtn);
            } else {
              statusEl.innerText = hDef.unlockConditionHint + ` (Текущий прогресс: ${p.label}).`;
            }
          }
        }
      } else {
        // Non-hero chapter quests
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
            this.triggerAltarNotification('Задание Главы!', `${activeQuest.title} выполнено!`, '📜', '#a855f7');
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

  public showPause(activeSeed?: number | string) {
    this.isPaused = true;
    this.menuStack = ['pause'];
    if (activeSeed !== undefined) {
      const textElem = document.getElementById('pause-seed-text');
      if (textElem) {
        textElem.textContent = `#${activeSeed}`;
      }
    }
    this.pauseModal.classList.remove('hidden');
  }

  public hidePause() {
    this.isPaused = false;
    this.pauseModal.classList.add('hidden');
    this.menuStack = this.menuStack.filter((s) => s !== 'pause');
  }

  public activateSettingsTab(tabName: 'video' | 'audio' | 'ui' | 'controls' | 'data') {
    const tabs: ('video' | 'audio' | 'ui' | 'controls' | 'data')[] = ['video', 'audio', 'ui', 'controls', 'data'];
    for (const t of tabs) {
      const btn = document.getElementById(`settings-tab-btn-${t}`);
      const pane = document.getElementById(`settings-tab-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
      if (pane) {
        if (t === tabName) {
          pane.classList.remove('hidden');
        } else {
          pane.classList.add('hidden');
        }
      }
    }
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
      case 'guide': {
        this.guideModal.classList.add('hidden');
        const next = this.menuStack[this.menuStack.length - 1];
        if (next === 'settings') {
          this.settingsModal.classList.remove('hidden');
        } else if (next === 'pause') {
          this.pauseModal.classList.remove('hidden');
        } else {
          this.showMainMenu();
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

      case 'pause': {
        this.hidePause();
        return 'resume';
      }

      default:
        return 'noop';
    }
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

    // Screen Low HP Vignette (< 30% of max HP)
    if (this.lowHpVignetteLayer) {
      const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
      if (player.isAlive && !player.isDowned && hpRatio <= 0.30) {
        this.lowHpVignetteLayer.classList.add('active');
        if (hpRatio <= 0.15) {
          this.lowHpVignetteLayer.classList.add('critical');
        } else {
          this.lowHpVignetteLayer.classList.remove('critical');
        }
      } else {
        this.lowHpVignetteLayer.classList.remove('active');
        this.lowHpVignetteLayer.classList.remove('critical');
      }
    }

    // In single player, keep PoE party list updated with local player
    if (!player.isCoop && this.poePartyList) {
      this.updatePoeParty(player, new Map(), 'p1', 'solo');
    }

    // Active Weapons Bar
    this.updateWeaponsBar(player.weapons);

    // Active Passives Bar
    this.updatePassivesBar(player);

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

    // --- The Rift: Credits, Difficulty, Items, Dash HUD ---
    if (this.plasmaCreditsText) {
      this.plasmaCreditsText.innerText = `⬡ ${player.credits}`;
    }

    // Difficulty Meter
    const tier = DifficultyDirector.getCurrentTier(gameTime);
    const progress = DifficultyDirector.getTierProgress(gameTime);
    if (this.diffTierLabel) {
      this.diffTierLabel.innerText = tier.name;
      this.diffTierLabel.style.color = tier.color;
    }
    if (this.diffBarFill) {
      this.diffBarFill.style.width = `${Math.round(progress * 100)}%`;
      this.diffBarFill.style.backgroundColor = tier.color;
    }

    // Tactical Dash Badge
    if (this.dashCooldownText) {
      if (player.dashCooldown > 0) {
        this.dashCooldownText.innerText = `${player.dashCooldown.toFixed(1)}s`;
        this.dashCooldownBadge?.classList.add('cooling-down');
      } else {
        this.dashCooldownText.innerText = 'РЫВОК';
        this.dashCooldownBadge?.classList.remove('cooling-down');
      }
    }

    // Item Inventory Tray
    this.renderItemInventory(player.riftItems);
  }

  public updateStageText(stageNum: number, biomeName: string) {
    if (this.stageText) {
      this.stageText.innerText = `${stageNum}: ${biomeName.toUpperCase()}`;
    }
  }

  public updateTeleporterHUD(isCharging: boolean, progress: number, isPlayerInside: boolean, isWarpReady: boolean) {
    if (!this.teleporterEventContainer) return;

    if (!isCharging && !isWarpReady) {
      this.teleporterEventContainer.classList.add('hidden');
      return;
    }

    this.teleporterEventContainer.classList.remove('hidden');

    if (isWarpReady) {
      if (this.teleporterStatusText) this.teleporterStatusText.innerText = 'РАЗЛОМ СТАБИЛИЗИРОВАН!';
      if (this.teleporterZoneText) {
        this.teleporterZoneText.innerText = 'ГОТОВ К ПЕРЕХОДУ [E]';
        this.teleporterZoneText.style.color = '#10b981';
      }
      if (this.teleporterBarFill) {
        this.teleporterBarFill.style.width = '100%';
        this.teleporterBarFill.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      }
      return;
    }

    const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
    if (this.teleporterStatusText) this.teleporterStatusText.innerText = `ЗАРЯДКА: ${pct}%`;
    if (this.teleporterBarFill) {
      this.teleporterBarFill.style.width = `${pct}%`;
      this.teleporterBarFill.style.background = 'linear-gradient(90deg, #4f46e5, #818cf8)';
    }

    if (this.teleporterZoneText) {
      if (isPlayerInside) {
        this.teleporterZoneText.innerText = 'В ЗОНЕ';
        this.teleporterZoneText.style.color = '#10b981';
      } else {
        this.teleporterZoneText.innerText = 'ВНЕ ЗОНЫ (ПАУЗА)';
        this.teleporterZoneText.style.color = '#f43f5e';
      }
    }
  }

  public showInteractionPrompt(text: string) {
    if (this.interactionPrompt && this.interactionPromptText) {
      this.interactionPromptText.innerText = text;
      this.interactionPrompt.classList.remove('hidden');
    }
  }

  public hideInteractionPrompt() {
    if (this.interactionPrompt) {
      this.interactionPrompt.classList.add('hidden');
    }
  }

  private lastRenderedItemsKey = '';
  public renderItemInventory(items: Map<RiftItemId, number>) {
    if (!this.itemInventoryTray) return;

    let key = '';
    for (const [id, count] of items) {
      key += `${id}:${count},`;
    }
    if (key === this.lastRenderedItemsKey) return;
    this.lastRenderedItemsKey = key;

    this.itemInventoryTray.innerHTML = '';
    for (const [id, count] of items) {
      const def = RIFT_ITEMS[id];
      if (!def) continue;

      const card = document.createElement('div');
      card.className = `rift-item-card ${def.rarity}`;
      card.title = `${def.name} (${def.description})`;
      card.innerHTML = `
        <span>${def.icon}</span>
        ${count > 1 ? `<span class="item-stack-badge">x${count}</span>` : ''}
      `;
      this.itemInventoryTray.appendChild(card);
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

  public showBalanceToast(message: string) {
    let container = document.getElementById('balance-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'balance-toast-container';
      container.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid #f59e0b;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.35);
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
    `;
    toast.innerHTML = `<span style="color:#f59e0b; font-size:18px;">⚡</span> <span>${message}</span>`;
    container.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      window.setTimeout(() => toast.remove(), 300);
    }, 4500);
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

  public triggerDamageFlash(_damageAmount?: number) {
    if (!this.damageFlashLayer) return;
    this.damageFlashLayer.classList.remove('hit-flash');
    void this.damageFlashLayer.offsetWidth; // Force CSS reflow to re-trigger transition
    this.damageFlashLayer.classList.add('hit-flash');

    if (this.damageFlashTimeout !== null) {
      window.clearTimeout(this.damageFlashTimeout);
    }
    this.damageFlashTimeout = window.setTimeout(() => {
      this.damageFlashLayer?.classList.remove('hit-flash');
      this.damageFlashTimeout = null;
    }, 45);
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
    if (this.passivesBar) {
      this.passivesBar.innerHTML = '';
    }
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
        const iconUrl = TextureManager.getWeaponBlobUrl(weapon.iconImage || getWeaponIconUrl(weapon.id));
        slot.innerHTML = `
          <img src="${iconUrl}" class="weapon-icon-img" alt="${weapon.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'" />
          <span class="weapon-icon" style="display:none">${weapon.icon}</span>
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
    if (this.isAutoLevelUp) {
      const weaponOptions = this.generateWeaponOptions(player);
      if (weaponOptions.length > 0) {
        weaponOptions[0].apply();
      } else {
        // All 5 weapons are maxed at level 20: provide fallback reward
        player.maxHp += 50;
        player.heal(player.maxHp);
        player.redrawOverhead();
      }
      this.updateWeaponsBar(player.weapons);
      this.updatePassivesBar(player);
      SoundManager.playLevelUp();
      this.hideLevelUp();
      setTimeout(() => onSelect(), 30);
      return;
    }

    SoundManager.playLevelUp();
    this.levelUpModal.classList.remove('hidden');

    const weaponOptions = this.generateWeaponOptions(player);

    if (weaponOptions.length > 0) {
      this.renderWeaponStep(player, weaponOptions, () => {
        this.hideLevelUp();
        onSelect();
      });
    } else {
      // All 5 weapons are maxed at level 20: provide fallback reward
      const fallbackOption: UpgradeOption = {
        id: 'max_arsenal_reward',
        title: 'Эликсир Героя',
        icon: '💖',
        levelTag: 'АРСЕНАЛ МАКСИМАЛЕН',
        description: 'Все 5 оружий прокачаны на максимум! Восстанавливает здоровье и дарует +50 к максимальному HP.',
        apply: () => {
          player.maxHp += 50;
          player.heal(player.maxHp);
          player.redrawOverhead();
        }
      };
      this.renderWeaponStep(player, [fallbackOption], () => {
        this.hideLevelUp();
        onSelect();
      });
    }
  }

  private renderWeaponStep(
    player: Player,
    options: UpgradeOption[],
    onChosen: () => void,
    isRerolled: boolean = false
  ) {
    const canReroll = canRerollWeaponOptions(options);

    if (this.levelUpStepIndicator) {
      this.levelUpStepIndicator.innerHTML = 'ПОВЫШЕНИЕ УРОВНЯ';
      this.levelUpStepIndicator.style.color = '#fbbf24';
    }
    if (this.levelUpTitle) {
      this.levelUpTitle.innerText = canReroll
        ? 'ВЫБЕРИТЕ ОРУЖИЕ [1 - 3] ИЛИ РЕРОЛ [R]'
        : 'ВЫБЕРИТЕ ОРУЖИЕ [1 - 3]';
    }

    if (this.levelUpRerollContainer) {
      if (canReroll) {
        this.levelUpRerollContainer.classList.remove('hidden');
      } else {
        this.levelUpRerollContainer.classList.add('hidden');
      }
    }

    this.upgradeCardsContainer.innerHTML = '';
    let chosen = false;

    if (this.levelUpKeyHandler) {
      window.removeEventListener('keydown', this.levelUpKeyHandler);
      this.levelUpKeyHandler = null;
    }

    const selectOptionByIndex = (index: number) => {
      if (chosen || index < 0 || index >= options.length) return;
      chosen = true;
      if (this.levelUpKeyHandler) {
        window.removeEventListener('keydown', this.levelUpKeyHandler);
        this.levelUpKeyHandler = null;
      }
      if (this.btnLevelUpReroll) {
        this.btnLevelUpReroll.onclick = null;
      }
      options[index].apply();
      SoundManager.playShoot();
      onChosen();
    };

    const handleReroll = () => {
      if (chosen) return;
      if (!canRerollWeaponOptions(options)) return;
      SoundManager.playReroll();
      const currentIds = new Set(options.map(opt => opt.id));
      const newOptions = this.generateWeaponOptions(player, currentIds);
      if (newOptions.length > 0) {
        this.renderWeaponStep(player, newOptions, onChosen, true);
      }
    };

    if (this.btnLevelUpReroll) {
      this.btnLevelUpReroll.onclick = canReroll ? () => handleReroll() : null;
    }

    options.forEach((opt, idx) => {
      const card = document.createElement('div');
      card.className = `character-card upgrade-card card-weapon-step${isRerolled ? ' rerolled' : ''}`;
      const iconHtml = opt.iconImage
        ? `<div class="char-portrait-wrapper upgrade-icon-wrapper"><img src="${opt.iconImage}" class="char-portrait card-icon-img" alt="${opt.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'" /><div class="card-icon" style="display:none">${opt.icon}</div></div>`
        : `<div class="char-portrait-wrapper upgrade-icon-wrapper"><div class="card-icon">${opt.icon}</div></div>`;
      card.innerHTML = `
        <div class="card-hotkey-badge">[${idx + 1}]</div>
        ${iconHtml}
        <div class="char-name card-title">${opt.title}</div>
        <div class="char-type card-level-tag">${opt.levelTag}</div>
        <div class="char-perks card-perks-box">
          <div class="perk-tag card-description">${opt.description}</div>
        </div>
        <button class="action-btn select-btn upgrade-select-btn"><span class="btn-hotkey">[${idx + 1}]</span> ВЫБРАТЬ</button>
      `;

      card.addEventListener('click', () => {
        selectOptionByIndex(idx);
      });

      this.upgradeCardsContainer.appendChild(card);
    });

    this.levelUpKeyHandler = (e: KeyboardEvent) => {
      if (chosen) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (this.levelUpModal.classList.contains('hidden')) return;

      if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1') {
        e.preventDefault();
        selectOptionByIndex(0);
      } else if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2') {
        e.preventDefault();
        selectOptionByIndex(1);
      } else if (e.code === 'Digit3' || e.code === 'Numpad3' || e.key === '3') {
        e.preventDefault();
        selectOptionByIndex(2);
      } else if (canReroll && (e.code === 'KeyR' || e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К')) {
        e.preventDefault();
        handleReroll();
      }
    };

    window.addEventListener('keydown', this.levelUpKeyHandler);
  }

  private hideLevelUp() {
    if (this.levelUpKeyHandler) {
      window.removeEventListener('keydown', this.levelUpKeyHandler);
      this.levelUpKeyHandler = null;
    }
    if (this.btnLevelUpReroll) {
      this.btnLevelUpReroll.onclick = null;
    }
    this.levelUpRerollContainer?.classList.add('hidden');
    this.levelUpModal.classList.add('hidden');
  }

  public showGameOver(
    timeStr: string,
    playerStats: PlayerStats,
    partnerStats?: PlayerStats | null,
    isCoop: boolean = false,
    isVictory: boolean = false,
    weapons?: Weapon[],
    allPlayersResults?: DetailedPlayerResult[],
    battlePassResult?: {
      pointsAwarded: number;
      oldLevel: number;
      newLevel: number;
      leveledUp: boolean;
      oldPoints: number;
      newPoints: number;
    }
  ) {
    if (isVictory) {
      SoundManager.playVictory();
      this.gameOverCard.classList.add('victory-mode');
      this.victoryBadge.classList.remove('hidden');
      this.victoryStatsPrompt.classList.remove('hidden');
      this.gameOverTitle.innerText = 'ВЫ ПОБЕДИЛИ!';
      this.gameOverTitle.className = 'death-title modern-menu-title victory-title';
      this.gameOverSubtitle.innerText =
        'Вы выдержали легендарные 30 минут в беспощадной пустыне! Бессмертный Жнец забрал вашу душу, но легенда о вас будет жить вечно!';
      this.gameOverSubtitle.className = 'death-subtitle menu-tagline-modern victory-subtitle';
      this.btnRestart.innerText = 'Начать новую экспедицию';
    } else {
      SoundManager.playGameOver();
      this.gameOverCard.classList.remove('victory-mode');
      this.victoryBadge.classList.add('hidden');
      this.victoryStatsPrompt.classList.add('hidden');
      this.gameOverTitle.innerText = 'ВЫ ПОГИБЛИ';
      this.gameOverTitle.className = 'death-title modern-menu-title';
      this.gameOverSubtitle.innerText = 'Пустыня не прощает ошибок...';
      this.gameOverSubtitle.className = 'death-subtitle menu-tagline-modern';
      this.btnRestart.innerText = 'Возродиться';
    }

    if (weapons && weapons.length > 0 && this.arsenalItemsList) {
      this.arsenalItemsList.innerHTML = weapons
        .map((w) => {
          const iconUrl = getWeaponIconUrl(w.id);
          return `<div class="arsenal-tag">
            <img src="${iconUrl}" class="arsenal-icon-img" alt="${w.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'" />
            <span class="tag-icon" style="display:none">${w.icon}</span>
            <span class="tag-name">${w.name}</span>
            <span class="tag-lvl">L${w.level}</span>
          </div>`;
        })
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

    if (this.gameOverBpBox) {
      const bp = BattlePassManager.getInstance();
      const ptsAwarded = battlePassResult ? battlePassResult.pointsAwarded : 0;
      const currentLevel = battlePassResult ? battlePassResult.newLevel : bp.getLevel();
      const currentPtsInLvl = bp.getPointsInCurrentLevel();
      const fillPct = currentLevel >= BP_MAX_LEVEL ? 100 : (currentPtsInLvl / BP_POINTS_PER_LEVEL) * 100;

      if (this.gameOverBpPointsGained) {
        this.gameOverBpPointsGained.innerText = `+${ptsAwarded} ОП`;
      }
      if (this.gameOverBpReason) {
        let ruleHint = 'выживание в бою';
        if (ptsAwarded === 20) ruleHint = 'до 5 мин: +20 ОП';
        else if (ptsAwarded === 50) ruleHint = 'до 10 мин: +50 ОП';
        else if (ptsAwarded === 100) ruleHint = 'до 15 мин: +100 ОП';
        else if (ptsAwarded === 150) ruleHint = 'до 20 мин: +150 ОП';
        else if (ptsAwarded === 200) ruleHint = 'до 30 мин / победа: +200 ОП';
        this.gameOverBpReason.innerText = `Выживание: ${timeStr} (${ruleHint})`;
      }
      if (this.gameOverBpLevelBadge) {
        this.gameOverBpLevelBadge.innerText = currentLevel >= BP_MAX_LEVEL ? 'МАКС. УРОВЕНЬ' : `Ур. ${currentLevel}`;
      }
      if (this.gameOverBpBarFill) {
        this.gameOverBpBarFill.style.width = `${fillPct}%`;
      }
      if (this.gameOverBpXpText) {
        this.gameOverBpXpText.innerText = currentLevel >= BP_MAX_LEVEL ? `${BP_POINTS_PER_LEVEL} / ${BP_POINTS_PER_LEVEL} ОП (МАКС)` : `${currentPtsInLvl} / ${BP_POINTS_PER_LEVEL} ОП`;
      }
      if (this.gameOverBpLevelup) {
        if (battlePassResult && battlePassResult.leveledUp) {
          this.gameOverBpLevelup.classList.remove('hidden');
        } else {
          this.gameOverBpLevelup.classList.add('hidden');
        }
      }
      this.gameOverBpBox.classList.remove('hidden');
    }

    this.gameOverModal.classList.remove('hidden');
  }

  public hideGameOver() {
    this.gameOverModal.classList.add('hidden');
    this.updateMainMenuBattlePass();
  }

  private generateWeaponOptions(player: Player, excludeIds?: ReadonlySet<string>): UpgradeOption[] {
    const pool: UpgradeOption[] = [];

    // 1. Existing weapon upgrades (up to maxLevel 20)
    for (const weapon of player.weapons) {
      if (weapon.level < weapon.maxLevel && canCharacterAcquireWeapon(player.charType, weapon.id, player.weapons)) {
        pool.push({
          id: `upgrade_${weapon.id}`,
          title: `Улучшение: ${weapon.name}`,
          icon: weapon.icon,
          iconImage: weapon.iconImage || getWeaponIconUrl(weapon.id),
          levelTag: `УРОВЕНЬ ${weapon.level + 1}`,
          description: weapon.getNextUpgradeDescription(),
          apply: () => weapon.upgrade()
        });
      }
    }

    // 2. New weapons if player has less than 5 weapons
    if (player.weapons.length < 5) {
      // 2a. Character-specific / Invoker spells
      const invokerWeapons = [null, ...INVOKER_SPELL_IDS] as const;
      for (const spell of invokerWeapons) {
        const id = spell ? invokerWeaponId(spell) : 'invoker_invoke';
        if (!canCharacterAcquireWeapon(player.charType, id, player.weapons)) continue;
        if (player.weapons.some(weapon => weapon.id === id)) continue;
        const def = spell ? INVOKER_SPELLS[spell] : null;
        pool.push({
          id: 'new_' + id,
          title: 'Новое: ' + (def?.name ?? 'Invoke'),
          icon: def?.icon ?? '🔮',
          iconImage: getWeaponIconUrl(id),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: def?.description ?? 'Каждая атака случайно выбирает одно из десяти заклинаний Инвокера.',
          apply: () => {
            if (!canCharacterAcquireWeapon(player.charType, id, player.weapons)) return;
            const triggerAttack = () => player.triggerAttackAnim(0.5);
            player.weapons.push(spell
              ? new InvokerSpellWeapon(spell, triggerAttack)
              : new InvokerInvokeWeapon(triggerAttack));
            player.recalculateStats();
          }
        });
      }

      // 2b. General arsenal (only for characters allowed to use generic weapons)
      const canUseGenericWeapons = canCharacterAcquireWeapon(player.charType, 'bow', player.weapons);
      if (canUseGenericWeapons) {
        const hasBow = player.weapons.some(w => w.id === 'bow' || w.id === 'heavy_colt');
      if (!hasBow) {
        pool.push({
          id: 'new_bow',
          title: 'Новое: Охотничий Лук',
          icon: '🏹',
          iconImage: getWeaponIconUrl('bow'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Острые дальнобойные стрелы с мощным пробитием нескольких врагов',
          apply: () => {
            player.weapons.push(new BowWeapon(() => player.triggerAttackAnim(0.40)));
            player.recalculateStats();
          }
        });
      }

      const hasKukri = player.weapons.some(w => w.id === 'kukri' || w.id === 'dual_revolvers');
      if (!hasKukri) {
        pool.push({
          id: 'new_kukri',
          title: 'Новое: Нож Кукри',
          icon: '🔪',
          iconImage: getWeaponIconUrl('kukri'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Стремительные броски изогнутых клинков кукри в ближайших врагов',
          apply: () => {
            player.weapons.push(new KukriWeapon());
            player.recalculateStats();
          }
        });
      }

      const hasOrbs = player.weapons.some(w => w.id === 'orbiting_barrier');
      if (!hasOrbs) {
        pool.push({
          id: 'new_orbiting_barrier',
          title: 'Новое: Коса Жнеца',
          icon: '🌙',
          iconImage: getWeaponIconUrl('orbiting_barrier'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Призывает смертоносные косы, вращающиеся вокруг героя, наносящие прямой урон и накладывающие стакающееся кровотечение',
          apply: () => {
            player.weapons.push(new OrbitingBarrierWeapon());
            player.recalculateStats();
          }
        });
      }

      const hasAura = player.weapons.some(w => w.id === 'holy_aura');
      if (!hasAura) {
        pool.push({
          id: 'new_holy_aura',
          title: 'Новое: Огненное Кольцо',
          icon: '🔥',
          iconImage: getWeaponIconUrl('holy_aura'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Окружает героя анимированным кольцом дикого огня, сжигающего монстров',
          apply: () => {
            const aura = new HolyAuraWeapon();
            aura.initVisual(this.scene, player.position);
            player.weapons.push(aura);
            player.recalculateStats();
          }
        });
      }

      const hasKatana = player.weapons.some(w => w.id === 'katana_slash');
      if (!hasKatana) {
        pool.push({
          id: 'new_katana_slash',
          title: 'Новое: Рассекающий Клинок',
          icon: '🗡️',
          iconImage: getWeaponIconUrl('katana_slash'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Рассекает окружающих врагов смертоносным круговым ударом',
          apply: () => {
            player.weapons.push(new KatanaSlashWeapon(() => player.triggerAttackAnim(0.48)));
            player.recalculateStats();
          }
        });
      }

      const hasWhirlwind = player.weapons.some(w => w.id === 'whirlwind_slash');
      if (!hasWhirlwind) {
        pool.push({
          id: 'new_whirlwind_slash',
          title: 'Новое: Багровый Вихрь',
          icon: '🌪️',
          iconImage: getWeaponIconUrl('whirlwind_slash'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Шквал стремительных багровых рассекающих ударов с повышенной скоростью',
          apply: () => {
            player.weapons.push(new WhirlwindSlashWeapon(() => player.triggerAttackAnim(0.42)));
            player.recalculateStats();
          }
        });
      }

      const hasGreatsword = player.weapons.some(w => w.id === 'greatsword');
      if (!hasGreatsword) {
        pool.push({
          id: 'new_greatsword',
          title: 'Новое: Двуручный Меч',
          icon: '⚔️',
          iconImage: getWeaponIconUrl('greatsword'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Тяжёлый круговой размах гигантского клинка с колоссальным уроном и радиусом',
          apply: () => {
            player.weapons.push(new GreatswordWeapon(() => player.triggerAttackAnim(0.5)));
            player.recalculateStats();
          }
        });
      }

      const hasFlail = player.weapons.some(w => w.id === 'flail');
      if (!hasFlail) {
        pool.push({
          id: 'new_flail',
          title: 'Новое: Боевой Цеп',
          icon: '⛓️',
          iconImage: getWeaponIconUrl('flail'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Сокрушительный вихрь тяжёлого шипастого цепа, отбрасывающего монстров',
          apply: () => {
            player.weapons.push(new FlailWeapon(() => player.triggerAttackAnim(0.45)));
            player.recalculateStats();
          }
        });
      }

      const hasStaff = player.weapons.some(w => w.id === 'astral_staff');
      if (!hasStaff) {
        pool.push({
          id: 'new_astral_staff',
          title: 'Новое: Звёздный Посох',
          icon: '🔮',
          iconImage: getWeaponIconUrl('astral_staff'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Магический посох, запускающий скоростные пробивающие звёздные снаряды',
          apply: () => {
            player.weapons.push(new AstralStaffWeapon(() => player.triggerAttackAnim(0.48)));
            player.recalculateStats();
          }
        });
      }

      const hasChakram = player.weapons.some(w => w.id === 'chakram');
      if (!hasChakram) {
        pool.push({
          id: 'new_chakram',
          title: 'Новое: Танцующий Чакрам',
          icon: '🪃',
          iconImage: getWeaponIconUrl('chakram'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Бросок вращающегося клинка по дуге с возвращением бумерангом и повторным рассечением',
          apply: () => {
            player.weapons.push(new ChakramWeapon(() => player.triggerAttackAnim(0.42)));
            player.recalculateStats();
          }
        });
      }

      const hasLightning = player.weapons.some(w => w.id === 'lightning_strike');
      if (!hasLightning) {
        pool.push({
          id: 'new_lightning_strike',
          title: 'Новое: Удар Молнии',
          icon: '⚡',
          iconImage: getWeaponIconUrl('lightning_strike'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Призывает сокрушительные грозовые молнии с небес, поражающие монстров электрическим взрывом сверху',
          apply: () => {
            player.weapons.push(new LightningStrikeWeapon(() => player.triggerAttackAnim(0.40)));
            player.recalculateStats();
          }
        });
      }

      const hasIceSpike = player.weapons.some(w => w.id === 'ice_spike');
      if (!hasIceSpike) {
        pool.push({
          id: 'new_ice_spike',
          title: 'Новое: Ледяной Шип',
          icon: '🧊',
          iconImage: getWeaponIconUrl('ice_spike'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Ледяной шип вырывается из-под земли и пронзает монстров снизу ледяным всплеском',
          apply: () => {
            player.weapons.push(new IceSpikeWeapon(() => player.triggerAttackAnim(0.38)));
            player.recalculateStats();
          }
        });
      }

      const hasFireball = player.weapons.some(w => w.id === 'fireball');
      if (!hasFireball) {
        pool.push({
          id: 'new_fireball',
          title: 'Новое: Огненный Шар',
          icon: '☄️',
          iconImage: getWeaponIconUrl('fireball'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Огненный шар падает сверху с небес и детонирует огненным взрывом по области',
          apply: () => {
            player.weapons.push(new FireballWeapon(() => player.triggerAttackAnim(0.42)));
            player.recalculateStats();
          }
        });
      }

      const hasRifle = player.weapons.some(w => w.id === 'assault_rifle');
      if (!hasRifle) {
        pool.push({
          id: 'new_assault_rifle',
          title: 'Новое: Штурмовая Винтовка',
          icon: '🔫',
          iconImage: getWeaponIconUrl('assault_rifle'),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: 'Скорострельная автоматическая винтовка, ведущая непрерывный огонь очередями пуль',
          apply: () => {
            player.weapons.push(new AssaultRifleWeapon(() => player.triggerAttackAnim(0.20)));
            player.recalculateStats();
          }
        });
      }
      }
    }

    const shuffled = filterAndShuffleForReroll(pool, excludeIds);
    return selectWeaponUpgradeOptions(shuffled, player.charType);
  }

  public updatePassivesBar(player: Player) {
    if (!this.passivesBar) return;

    const passivesList = [
      {
        id: 'stat_sheriff_star',
        icon: '⭐',
        count: player.sheriffStarCount,
        title: 'Звезда Шерифа',
        desc: `+${Math.round((player.passiveDamageMultiplier - 1) * 100)}% к урону всех оружий`
      },
      {
        id: 'stat_spurs',
        icon: '👢',
        count: player.spursCount,
        title: 'Шпоры Скорохода',
        desc: `x${player.passiveSpeedMultiplier.toFixed(2)} к скорости бега`
      },
      {
        id: 'stat_flask',
        icon: '🍶',
        count: player.flaskCount,
        title: 'Фляга с Виски',
        desc: `+${player.flaskCount * 30} к макс HP (${player.maxHp} HP)`
      },
      {
        id: 'stat_lasso',
        icon: '➰',
        count: player.lassoCount,
        title: 'Магнитное Лассо',
        desc: `${player.pickupRadius.toFixed(1)}м радиус магнита`
      },
      {
        id: 'stat_amulet',
        icon: '🧿',
        count: player.amuletCount,
        title: 'Охотничий Амулет',
        desc: `+${(player.amuletCount * 1.5).toFixed(1)} HP/с (всего +${player.passiveHpRegen.toFixed(1)} HP/с)`
      },
      {
        id: 'stat_vest',
        icon: '🦺',
        count: player.vestCount,
        title: 'Кожаный Жилет',
        desc: `-${Math.round(player.passiveDamageReduction * 100)}% получаемого урона`
      },
      {
        id: 'stat_watch',
        icon: '⏱️',
        count: player.watchCount,
        title: 'Карманные Часы',
        desc: `-${Math.min(70, player.watchCount * 8)}% к перезарядке (всего -${Math.round((1 - player.passiveCooldownMultiplier) * 100)}%)`
      }
    ];

    const activeList = passivesList.filter(p => p.count > 0);
    const activeIds = new Set(activeList.map(p => p.id));

    for (const p of activeList) {
      let slot = this.passivesBar.querySelector<HTMLElement>(`[data-passive-id="${p.id}"]`);
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'passive-slot';
        slot.setAttribute('data-passive-id', p.id);
        slot.innerHTML = `
          <span class="passive-icon">${p.icon}</span>
          <span class="passive-count">x${p.count}</span>
        `;
        this.passivesBar.appendChild(slot);
      } else {
        const countEl = slot.querySelector<HTMLElement>('.passive-count');
        if (countEl && countEl.innerText !== `x${p.count}`) {
          countEl.innerText = `x${p.count}`;
        }
      }
      slot.title = `${p.title} (x${p.count})\n${p.desc}`;
    }

    const slots = Array.from(this.passivesBar.querySelectorAll<HTMLElement>('.passive-slot'));
    for (const slot of slots) {
      const id = slot.getAttribute('data-passive-id');
      if (id && !activeIds.has(id)) {
        slot.remove();
      }
    }
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

  /**
   * Toggles visibility of on-screen dev console buttons based on training mode state
   */
  public setTrainingModeActive(active: boolean) {
    this.isTrainingModeActive = active;
    const mobileDevBtn = document.getElementById('btn-dev-mobile-trigger');
    const pauseDevBtn = document.getElementById('btn-pause-dev');
    if (active) {
      mobileDevBtn?.classList.remove('hidden');
      pauseDevBtn?.classList.remove('hidden');
    } else {
      mobileDevBtn?.classList.add('hidden');
      pauseDevBtn?.classList.add('hidden');
    }
  }
}
