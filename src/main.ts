import * as THREE from 'three';
import { Engine } from './core/Engine';
import { InputManager } from './core/InputManager';
import { Player, CharacterType } from './entities/Player';
import { EnemyManager, PlayerTargetInfo } from './entities/EnemyManager';
import { Enemy } from './entities/Enemy';
import { DropManager } from './drops/DropManager';
import { Gem } from './drops/Gem';
import { getPassiveBuffId } from './drops/PassiveBuffs';
import { DamageNumberManager } from './combat/DamageNumberManager';
import { Projectile } from './combat/Projectile';
import { HUD, DetailedPlayerResult } from './ui/HUD';
import { DevManager } from './ui/DevManager';
import { DebugHUD } from './ui/DebugHUD';
import { MapManager } from './ui/MapManager';
import { NetworkManager, HostSnapshotMessage, ClientSyncMessage, DamageDealtEvent, PlayerStats, NetEvent, PlayerNetState, PLAYER_COLORS, AVAILABLE_SLOT_IDS, NetShotInfo, getPlayerSlotDisplayName } from './net/NetworkManager';
import { RemotePlayer } from './entities/RemotePlayer';
import { SoundManager } from './core/SoundManager';
import { ALTAR_CONFIGS } from './world/Altar';
import { RoomDirectory } from './net/RoomDirectory';
import { BiomeManager } from './world/BiomeManager';
import { ChestManager } from './world/ChestManager';
import { RiftTeleporter } from './world/RiftTeleporter';
import { RIFT_ITEMS, RiftItemId } from './items/RiftItemSystem';
import { ProgressionManager } from './core/ProgressionManager';
import { TextureManager } from './core/TextureManager';
import { SeededRNG } from './core/SeededRNG';

const SPAWN_OFFSETS: Record<string, [number, number]> = {
  p1: [0, 0],
  p2: [2.5, 0.5],
  p3: [-2.5, 0.5],
  p4: [0.5, 2.5],
  p5: [-0.5, 2.5]
};

enum GameState {
  MAIN_MENU,
  HOST_LOBBY,
  JOIN_LOBBY,
  CHARACTER_SELECT,
  PLAYING,
  PAUSED,
  LEVEL_UP,
  GAME_OVER
}

class Game {
  private engine: Engine;
  private input: InputManager;
  private player: Player;
  private enemyManager: EnemyManager;
  private dropManager: DropManager;
  private damageNumbers: DamageNumberManager;
  private hud: HUD;
  private devManager: DevManager;
  private debugHud: DebugHUD;
  private mapManager: MapManager;
  private net: NetworkManager;
  private roomPollingTimer: number | null = null;
  public isTrainingMode: boolean = false;

  // Performance Telemetry EMA smoothers
  private simTimeEma: number = 0;
  private renderTimeEma: number = 0;
  private frameTimeEma: number = 0;
  private fpsEma: number = 0;

  // Frustum Culling
  private cameraFrustum = new THREE.Frustum();
  private projScreenMatrix = new THREE.Matrix4();

  // Remote Co-op Teammates (up to 4 teammates in 5-player mode)
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private pendingClientHits: DamageDealtEvent[] = [];
  private pendingClientCollectedGems: string[] = [];
  private pendingLocalShots: NetShotInfo[] = [];
  private netSendTimer = 0;
  private partnerReviveTimers: Map<string, number> = new Map();

  // Individual Stats for all players ('p1', 'p2', 'p3', 'p4', 'p5')
  private allPlayerStats: Map<string, PlayerStats> = new Map();
  private recentlyDeadEnemyIds: Set<string> = new Set();
  private lastClientLocalHitTime = 0;
  private pendingDamageToClients: Map<string, number> = new Map();
  private pendingNetworkEvents: NetEvent[] = [];
  private scratchNearbyEnemies: Enemy[] = [];

  private projectiles: Projectile[] = [];
  private gameState: GameState = GameState.MAIN_MENU;
  private gameTime = 0;
  private lastTime = performance.now();
  private pendingLevelUps = 0;
  private isLevelUpActive = false;

  // The Rift Managers
  private biomeManager: BiomeManager;
  private chestManager: ChestManager;
  private riftTeleporter: RiftTeleporter;
  private currentSeed: number | string = 1337;

  constructor() {
    this.engine = new Engine('game-container');
    this.input = new InputManager();
    this.damageNumbers = new DamageNumberManager();
    this.dropManager = new DropManager(this.engine.scene);
    this.enemyManager = new EnemyManager(this.engine.scene, this.dropManager, this.damageNumbers);
    this.player = new Player(this.engine.scene, 'ronin');
    this.net = new NetworkManager();

    this.biomeManager = new BiomeManager();
    this.chestManager = new ChestManager(this.engine.scene);
    this.riftTeleporter = new RiftTeleporter(this.engine.scene, new THREE.Vector3(75, 0, 75));

    this.input.onInteract = () => {
      this.handleInteract();
    };

    this.input.onDash = () => {
      if (this.gameState === GameState.PLAYING) {
        this.player.triggerDash(this.input.moveDirection);
      }
    };

    // Monster killed attribution listener (credits accurate player ID & The Rift economy)
    this.enemyManager.onEnemyKilled = (enemy, killer) => {
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      const hitterId = killer || 'p1';
      const creditsVal = enemy.creditsValue || 3;

      // In co-op mode, each player's credits are their own ("кредиты у каждого игрока свои")
      if (hitterId === myId) {
        this.player.credits += creditsVal;
        ProgressionManager.getInstance().addCoins(creditsVal);
        ProgressionManager.getInstance().recordEnemyKilled();
      } else {
        const remote = this.remotePlayers.get(hitterId);
        if (remote) {
          remote.credits += creditsVal;
        }
      }

      if (this.net.role === 'host') {
        this.pendingNetworkEvents.push({
          type: 'credit_gain',
          val: creditsVal,
          playerId: hitterId,
          killer: hitterId
        });

        const st = this.allPlayerStats.get(hitterId);
        if (st) {
          st.kills++;
        }
      }

      if (hitterId === myId) {
        this.onLocalPlayerEnemyKill(enemy);
      }
      const st = this.allPlayerStats.get(hitterId) || { kills: 0, damageDealt: 0, level: 1, revives: 0 };
      st.kills++;
      this.allPlayerStats.set(hitterId, st);
    };

    // Boss spawn event listener
    this.enemyManager.onBossSpawn = (boss, tier) => {
      this.hud.triggerBossWarning(boss.name, tier);
      if (this.net.role === 'host') {
        this.pendingNetworkEvents.push({
          type: 'boss_spawn',
          name: boss.name,
          val: tier
        });
      }
    };

    // Immortal Boss spawn event listener
    this.enemyManager.onImmortalBossSpawn = (boss) => {
      this.hud.triggerImmortalBossWarning(boss.name);
      if (this.net.role === 'host') {
        this.pendingNetworkEvents.push({
          type: 'boss_spawn',
          name: boss.name,
          val: 'reaper'
        });
      }
    };

    // Boss defeat event listener
    this.enemyManager.onBossDefeat = () => {
      this.hud.resetBossUI();
      ProgressionManager.getInstance().recordBossKilled();
      if (this.net.role === 'host') {
        this.pendingNetworkEvents.push({
          type: 'boss_defeat'
        });
      }
    };

    // Altar capture event listener
    this.engine.altarManager.onAltarCaptured = (altar) => {
      this.hud.triggerAltarNotification(
        altar.config.name,
        altar.config.subtitle,
        altar.config.icon,
        altar.config.colorCss
      );
      if (this.net.role === 'host') {
        this.pendingNetworkEvents.push({
          type: 'altar_captured',
          altarType: altar.config.type,
          name: altar.config.name,
          subtitle: altar.config.subtitle,
          icon: altar.config.icon,
          color: altar.config.colorCss,
          buffDuration: altar.config.buff.duration
        });
      } else if (this.net.role === 'client') {
        this.net.notifyAltarCaptured(altar.config.type);
      }
    };

    // HUD with callbacks
    this.hud = new HUD(
      this.engine.scene,
      (charType: CharacterType, seedInput?: string, isTrainingMode?: boolean, timeOfDay?: 'random' | 'day' | 'night') =>
        this.startSinglePlayerWithHero(charType, seedInput, isTrainingMode, timeOfDay),
      () => this.resumeGame(),
      () => this.restartGame(undefined, false)
    );
    this.hud.onRestartSameSeed = () => this.restartGame(undefined, true);
    this.hud.onToggleDevMode = () => this.toggleDevMode();
    this.hud.onResolutionScaleChanged = (scale: number) => {
      this.engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * scale);
    };
    this.hud.onShadowQualityChanged = (quality: number) => {
      this.engine.setShadowQuality(quality);
    };
    this.hud.onTimeOfDayChanged = (mode: 'day' | 'night') => {
      this.engine.setTimeOfDay(mode);
      this.biomeManager.applyBiomeToScene(this.engine.scene, mode);
    };
    const savedShadowQuality = parseInt(localStorage.getItem('wildwest_shadow_quality') || '1024', 10);
    this.engine.setShadowQuality(savedShadowQuality);

    // Bind terrain elevation and dune rough slowdown to player
    const elevationFn = (x: number, z: number) => this.engine.chunkManager.getElevation(x, z);
    this.player.getElevation = elevationFn;
    this.player.getTerrainSlowFactor = (x: number, z: number) => this.engine.chunkManager.getSlowFactor(x, z);
    this.enemyManager.getElevation = elevationFn;
    this.dropManager.getElevation = elevationFn;

    // Setup Main Menu & Multiplayer HUD triggers
    this.setupMenuNavigation();

    // Dev Manager
    this.devManager = new DevManager(
      this.player,
      this.enemyManager,
      this.dropManager,
      this.engine.scene,
      this.engine.camera,
      (count = 1) => {
        this.pendingLevelUps += count;
        this.triggerLevelUp();
      }
    );
    this.devManager.isHost = () => this.net.role !== 'client';
    this.devManager.isCoop = () => this.player.isCoop;
    this.devManager.onApplySeed = (seed) => {
      this.currentSeed = seed;
      this.restartGame(undefined, true);
      this.devManager.setCurrentSeed(seed);
    };

    // Map Manager (Minimap & Full Desert Map on TAB)
    this.mapManager = new MapManager(
      this.player,
      this.enemyManager,
      this.dropManager,
      this.engine.altarManager,
      this.engine.obstacleManager,
      this.chestManager,
      this.riftTeleporter
    );

    this.mapManager.onStateChange = (isOpen) => {
      // In co-op mode, opening the map must NEVER pause the game!
      const isCoop = this.net.role !== 'solo' || this.player.isCoop;
      if (isCoop) {
        return;
      }

      if (isOpen) {
        if (this.gameState === GameState.PLAYING) {
          this.gameState = GameState.PAUSED;
        }
      } else {
        if (this.gameState === GameState.PAUSED) {
          this.gameState = GameState.PLAYING;
          this.lastTime = performance.now();
        }
      }
    };

    // TAB Key Map Toggle Handler
    this.input.onToggleMap = () => {
      if (this.mapManager.isOpen) {
        this.mapManager.close();
        return;
      }

      if (
        this.isLevelUpActive ||
        this.devManager.getIsOpen() ||
        this.hud.isAnyMenuOpen() ||
        this.gameState === GameState.PAUSED ||
        this.gameState === GameState.MAIN_MENU ||
        this.gameState === GameState.HOST_LOBBY ||
        this.gameState === GameState.JOIN_LOBBY ||
        this.gameState === GameState.CHARACTER_SELECT ||
        this.gameState === GameState.GAME_OVER
      ) {
        return;
      }
      this.mapManager.open();
    };

    // ESC Key Pause Handler
    this.input.onTogglePause = () => {
      if (this.mapManager.isOpen) {
        this.mapManager.close();
        return;
      }

      if (this.devManager.getIsOpen()) {
        this.devManager.toggle();
        return;
      }

      if (this.isLevelUpActive || this.gameState === GameState.GAME_OVER) {
        return;
      }

      const escResult = this.hud.handleEscape();
      if (escResult === 'resume') {
        this.resumeGame();
        return;
      }
      if (escResult === 'handled') {
        if (this.gameState === GameState.CHARACTER_SELECT && !this.hud.isAnyMenuOpen()) {
          this.gameState = GameState.MAIN_MENU;
        } else if (this.gameState === GameState.HOST_LOBBY && !this.hud.isAnyMenuOpen()) {
          this.net.reset();
          this.gameState = GameState.MAIN_MENU;
        } else if (this.gameState === GameState.JOIN_LOBBY && !this.hud.isAnyMenuOpen()) {
          this.stopRoomPolling();
          this.net.reset();
          this.gameState = GameState.MAIN_MENU;
        }
        return;
      }

      if (escResult === 'noop') {
        if (this.gameState === GameState.PLAYING) {
          this.gameState = GameState.PAUSED;
          this.hud.showPause(this.currentSeed);
        } else if (this.gameState === GameState.PAUSED) {
          this.resumeGame();
        }
      }
    };

    // P Key Dev Mode Handler (Host only in Co-op; Training mode only)
    this.input.onToggleDevMode = () => {
      this.toggleDevMode();
    };

    // F3 Key Debug Network / Performance HUD Handler
    this.debugHud = new DebugHUD();
    this.input.onToggleDebugHud = () => {
      this.debugHud.toggle();
    };

    // Setup Network Listeners
    this.setupNetworkCallbacks();
    this.devManager.isHost = () => this.net.role !== 'client';
    this.devManager.isCoop = () => this.net.role !== 'solo';
    this.devManager.onBroadcastDevAction = (action, value) => {
      this.handleHostDevAction(action, value);
    };

    window.addEventListener('beforeunload', () => {
      this.net.reset();
    });

    // Start in Main Menu state
    this.gameState = GameState.MAIN_MENU;
    this.hud.showMainMenu();

    this.initAssetPreloader();

    this.loop();
  }

  private initAssetPreloader() {
    const loaderContainer = document.getElementById('game-loader-container');
    const loaderTitle = document.getElementById('game-loader-title');
    const loaderFill = document.getElementById('game-loader-fill');
    const loaderPercent = document.getElementById('game-loader-percentage');
    const loaderDetails = document.getElementById('game-loader-details');
    const loaderCounter = document.getElementById('game-loader-counter');

    if (!loaderContainer || !loaderFill || !loaderPercent) return;

    TextureManager.preloadAllWithProgress(this.engine.renderer, (loaded, total, item) => {
      const pct = Math.min(100, Math.round((loaded / total) * 100));
      loaderFill.style.width = `${pct}%`;
      loaderPercent.textContent = `${pct}%`;
      if (loaderCounter) {
        loaderCounter.textContent = `${loaded} / ${total}`;
      }
      if (loaderDetails) {
        loaderDetails.textContent = `Загрузка: ${item}`;
      }
    })
      .then(() => {
        loaderFill.style.width = '100%';
        if (loaderTitle) {
          loaderTitle.textContent = 'ВСЕ РЕСУРСЫ И КАРТА ГОТОВЫ';
        }
        if (loaderDetails) {
          loaderDetails.textContent = 'Текстуры, иконки оружия и карта 500x500м загружены';
        }
        this.engine.chunkManager.generateMap(this.currentSeed, this.chestManager, this.riftTeleporter);
        this.mapManager.setSeed(this.currentSeed);
        setTimeout(() => {
          loaderContainer.classList.add('loaded');
        }, 550);
      })
      .catch(() => {
        loaderContainer.classList.add('loaded');
      });
  }

  private setupMenuNavigation() {
    this.hud.onSinglePlayerSelected = () => {
      this.net.reset();
      this.player.isCoop = false;
      this.gameState = GameState.CHARACTER_SELECT;
      this.hud.showCharacterSelect();
    };

    this.hud.onCreateRoomClicked = () => {
      this.openHostLobby();
    };

    this.hud.onJoinRoomClicked = () => {
      this.openJoinLobby();
    };

    this.hud.onReturnToMenu = () => {
      this.returnToMainMenu();
    };

    this.hud.onHostHeroChanged = (hero) => {
      this.player.setCharacter(hero);
      this.net.setHero(hero);
      this.hud.renderHostRoster(this.net.lobbyPlayers);
    };

    this.hud.onGuestHeroChanged = (hero) => {
      this.player.setCharacter(hero);
      if (this.net.isConnected) {
        this.net.setHero(hero);
      }
    };

    this.hud.onHostStartExpedition = (seedInput) => {
      this.startCoopGameAsHost(seedInput);
    };

    this.hud.onHostPasswordChanged = (pwd) => {
      this.net.setPassword(pwd);
    };

    this.hud.onRefreshRoomsClicked = async () => {
      const rooms = await RoomDirectory.fetchRooms();
      this.hud.renderAvailableRooms(rooms);
    };

    this.hud.onGuestConnectClicked = (roomCode, hero, password) => {
      this.connectAsGuest(roomCode, hero, password);
    };

    this.hud.onGuestReadyToggle = (isReady) => {
      this.net.setReady(isReady);
    };
  }

  private async openHostLobby() {
    this.gameState = GameState.HOST_LOBBY;
    const roomCode = NetworkManager.generateRoomCode();
    const hero = this.player.charType || 'ronin';
    this.hud.showHostLobby(roomCode, hero);
    await this.net.createRoom(roomCode, hero);
  }

  private openJoinLobby() {
    this.gameState = GameState.JOIN_LOBBY;
    const nextHero: CharacterType =
      this.player.charType === 'ronin'
        ? 'valkyrie'
        : this.player.charType === 'valkyrie'
        ? 'flail'
        : this.player.charType === 'flail'
        ? 'sorceress'
        : this.player.charType === 'sorceress'
        ? 'chakram'
        : this.player.charType === 'chakram'
        ? 'archer'
        : 'ronin';
    this.hud.showJoinLobby(nextHero);
    this.startRoomPolling();
  }

  private startRoomPolling() {
    this.stopRoomPolling();
    RoomDirectory.fetchRooms().then((rooms) => {
      this.hud.renderAvailableRooms(rooms);
    });

    this.roomPollingTimer = window.setInterval(async () => {
      if (this.gameState === GameState.JOIN_LOBBY && !this.hud.isGuestConnected) {
        const rooms = await RoomDirectory.fetchRooms();
        this.hud.renderAvailableRooms(rooms);
      } else {
        this.stopRoomPolling();
      }
    }, 3500);
  }

  private stopRoomPolling() {
    if (this.roomPollingTimer) {
      clearInterval(this.roomPollingTimer);
      this.roomPollingTimer = null;
    }
  }

  private async connectAsGuest(roomCode: string, hero: CharacterType, password?: string) {
    const upperCode = roomCode.toUpperCase().trim();
    this.hud.setJoinStatus(`Подключение к комнате ${upperCode}...`, false);
    this.player.setCharacter(hero);
    const ok = await this.net.joinRoom(upperCode, hero, password);
    if (ok || this.net.isConnected) {
      this.stopRoomPolling();
      this.hud.setGuestConnectedMode(true);
      if (!this.hud.isGuestReady) {
        this.hud.setJoinStatus(`Подключено к ${upperCode}! Нажмите «ГОТОВ» для подтверждения.`, false);
      }
      this.hud.renderJoinRoster(this.net.lobbyPlayers, this.net.mySlotId);
    } else {
      this.hud.setGuestConnectedMode(false);
      if (!this.hud.isGuestConnected) {
        this.hud.setJoinStatus('Не удалось подключиться. Проверьте код комнаты или пароль!', true);
      }
    }
  }

  private setupNetworkCallbacks() {
    this.net.onJoinRejected = (reason, message) => {
      if (reason === 'WRONG_PASSWORD') {
        this.hud.showPasswordPromptError(message);
      }
      this.hud.setJoinStatus(message, true);
    };

    this.net.onConnectionStatusChanged = (status, isSuccess) => {
      if (this.net.role === 'client') {
        if (!this.net.isConnected || !isSuccess) {
          this.hud.setJoinStatus(status, !isSuccess);
        }
      }
    };

    this.net.onLobbyStateChanged = () => {
      if (this.net.role === 'host') {
        this.hud.renderHostRoster(this.net.lobbyPlayers);
      } else {
        this.hud.renderJoinRoster(this.net.lobbyPlayers, this.net.mySlotId);
      }
    };

    this.net.onGameStartReceived = (msg) => {
      if (this.net.role === 'client') {
        this.startCoopGameAsClient(msg?.seed);
      }
    };

    this.net.onHostSnapshotReceived = (msg) => {
      if (this.net.role === 'client') {
        this.handleHostSnapshot(msg);
      }
    };

    this.net.onClientSyncReceived = (msg) => {
      if (this.net.role === 'host') {
        this.handleClientSync(msg);
      }
    };

    this.net.onChestOpenedReceived = (chestId, playerId, itemId) => {
      const chest = this.chestManager.chests.find(c => c.id === chestId);
      if (chest && !chest.isOpened) {
        this.chestManager.openChest(chest);
        SoundManager.playChestOpen();
      }
      const itemDef = itemId ? RIFT_ITEMS[itemId as RiftItemId] : undefined;
      const playerName = getPlayerSlotDisplayName(playerId || 'p2', false);
      if (itemDef) {
        this.hud.triggerAltarNotification(`${playerName} открыл капсулу`, itemDef.name, itemDef.icon, itemDef.color);
      }
      if (this.net.role === 'host') {
        this.pendingNetworkEvents.push({
          type: 'chest_opened',
          chestId,
          playerId,
          name: itemDef?.name,
          icon: itemDef?.icon,
          color: itemDef?.color
        });
      }
    };

    this.net.onWarpRequestReceived = () => {
      if (this.net.role === 'host' && this.riftTeleporter.state === 'WARP_READY') {
        this.warpToNextStage();
      }
    };

    this.net.onAltarCapturedReceived = (altarType, _fromId) => {
      this.engine.altarManager.applyRemoteCapture(altarType);
      const altar = this.engine.altarManager.altars.find((candidate) => candidate.config.type === altarType);
      const cfg = altar?.config || ALTAR_CONFIGS[altarType];
      if (cfg) {
        this.player.addBuff({ ...cfg.buff, duration: cfg.buff.duration });
        this.hud.triggerAltarNotification(cfg.name, cfg.subtitle, cfg.icon, cfg.colorCss);
        this.pendingNetworkEvents.push({
          type: 'altar_captured',
          altarType: cfg.type,
          name: cfg.name,
          subtitle: cfg.subtitle,
          icon: cfg.icon,
          color: cfg.colorCss,
          buffDuration: cfg.buff.duration
        });
      }
    };

    this.net.onReviveReceived = (msg) => {
      const targetId = msg.targetId || msg.target || '';
      const isTargetHost = targetId === 'p1' || targetId === 'host';
      const isTargetMe = targetId === this.net.mySlotId || (this.net.role === 'host' && isTargetHost);

      if (isTargetMe) {
        if (this.player.isDowned) {
          this.player.revive();
        }
      } else if (targetId) {
        const remote = this.remotePlayers.get(targetId) || (isTargetHost ? this.remotePlayers.get('p1') : undefined);
        if (remote) {
          remote.isDowned = false;
          remote.hp = Math.round(remote.maxHp * 0.45);
          remote.reviveProgress = 0;
          remote.redrawOverhead();
        }
      }

      // If we are host, ensure all clients receive the revive action and event
      if (this.net.role === 'host') {
        const normalizedTarget = isTargetHost ? 'p1' : targetId;
        this.net.send({
          type: 'REVIVE_ACTION',
          targetId: normalizedTarget,
          reviverId: msg.reviverId
        });
        this.pendingNetworkEvents.push({
          type: 'revive',
          targetId: normalizedTarget,
          reviverId: msg.reviverId
        });
        if (msg.reviverId && msg.reviverId !== 'p1' && msg.reviverId !== 'host') {
          const reviverStats = this.allPlayerStats.get(msg.reviverId);
          if (reviverStats) {
            reviverStats.revives++;
          }
        }
      }
    };

    this.net.onPartnerDisconnected = (slotId) => {
      const remote = this.remotePlayers.get(slotId);
      if (remote) {
        remote.destroy(this.engine.scene);
        this.remotePlayers.delete(slotId);
        this.syncMapManagerPartners();
        this.hud.updateTeammates(this.remotePlayers);
        this.enemyManager.activePlayerCount = Math.max(1, 1 + this.remotePlayers.size);
      }
    };

    this.net.onHostDisconnected = () => {
      this.returnToMainMenu();
    };

    this.net.onDevActionReceived = (action, value) => {
      this.handleClientDevAction(action, value);
    };
  }

  private handleHostDevAction(action: string, value?: any) {
    if (this.net.role !== 'host') return;

    // Apply cheat to remote players representation on host
    switch (action) {
      case 'full_heal':
        for (const remote of this.remotePlayers.values()) {
          remote.hp = remote.maxHp;
          remote.isDowned = false;
          remote.reviveProgress = 0;
          remote.redrawOverhead();
        }
        break;
      case 'buff':
        if (value) {
          for (const remote of this.remotePlayers.values()) {
            remote.activeBuffs.set(value.type, { ...value });
          }
        }
        break;
      case 'level_up':
        for (const remote of this.remotePlayers.values()) {
          remote.level += (value || 1);
          remote.redrawOverhead();
        }
        break;
      case 'xp_1000':
        if (typeof value === 'number') {
          for (const remote of this.remotePlayers.values()) {
            remote.gainXp(value);
            remote.redrawOverhead();
          }
        }
        break;
    }

    // Broadcast cheat action to all connected clients in the session
    this.net.send({ type: 'DEV_ACTION', action, value });
  }

  private handleClientDevAction(action: string, value?: any) {
    switch (action) {
      case 'toggle_god':
        this.player.isGodMode = !!value;
        this.player.redrawOverhead();
        break;
      case 'full_heal':
        this.player.fullHeal();
        if (this.player.isDowned) {
          this.player.revive();
        }
        this.player.redrawOverhead();
        break;
      case 'toggle_speed':
        this.player.isSpeedCheat = !!value;
        this.player.recalculateStats();
        break;
      case 'toggle_onehit':
        this.player.isOneHitKill = !!value;
        this.player.recalculateStats();
        break;
      case 'buff':
        if (value) {
          this.player.addBuff({ ...value });
        }
        break;
      case 'time_scale':
        if (typeof value === 'number') {
          this.devManager.timeScale = value;
        }
        break;
      case 'level_up':
        this.pendingLevelUps += (value || 1);
        this.triggerLevelUp();
        break;
      case 'xp_1000':
        if (typeof value === 'number' && value > 0) {
          const lvls = this.player.gainXp(value);
          if (lvls > 0) {
            this.pendingLevelUps += lvls;
            this.triggerLevelUp();
          }
        }
        break;
      case 'all_weapons':
        this.player.giveAllWeapons(this.engine.scene);
        break;
      case 'max_weapons':
        this.player.maxAllWeapons();
        break;
      case 'vacuum':
        this.dropManager.vacuumAll();
        break;
    }
  }

  private syncMapManagerPartners() {
    this.mapManager.partners = Array.from(this.remotePlayers.values());
    this.mapManager.partner = this.mapManager.partners[0] || null;
  }

  private toggleDevMode() {
    if (!this.isTrainingMode) {
      return;
    }
    if (this.net.role === 'client') {
      return;
    }
    this.devManager.toggle();
  }

  private startSinglePlayerWithHero(
    charType: CharacterType,
    seedInput?: string,
    isTrainingMode: boolean = false,
    timeOfDayOption: 'random' | 'day' | 'night' = 'random'
  ) {
    this.isTrainingMode = isTrainingMode;
    ProgressionManager.getInstance().isTrainingMode = isTrainingMode;
    this.hud.setTrainingModeActive(isTrainingMode);

    // Resolve Day / Night lighting
    const chosenTimeOfDay: 'day' | 'night' =
      timeOfDayOption === 'random'
        ? Math.random() < 0.5 ? 'day' : 'night'
        : timeOfDayOption;

    this.engine.setTimeOfDay(chosenTimeOfDay);
    this.biomeManager.applyBiomeToScene(this.engine.scene, chosenTimeOfDay);

    this.net.reset();
    for (const rp of this.remotePlayers.values()) {
      rp.destroy(this.engine.scene);
    }
    this.remotePlayers.clear();
    this.syncMapManagerPartners();
    this.enemyManager.activePlayerCount = 1;

    this.player.isGodMode = false;
    this.player.isSpeedCheat = false;
    this.player.isOneHitKill = false;
    this.player.recalculateStats();
    this.devManager.reset();

    this.player.isCoop = false;
    this.player.displayName = 'Вы';
    this.player.colorCss = '#f59e0b';
    this.player.setCharacter(charType);
    this.player.redrawOverhead();
    this.hud.setCoopBadge(null);
    this.hud.clearTeammates();
    this.hud.hidePartnerHp();

    if (seedInput && seedInput.trim().length > 0) {
      this.currentSeed = seedInput.trim();
    } else {
      this.currentSeed = Math.floor(Math.random() * 1000000);
    }
    this.devManager.setCurrentSeed(this.currentSeed);

    this.restartGame(undefined, true);
  }

  private createRemotePlayer(id: string, name: string, hero: CharacterType, color: number | string): RemotePlayer {
    const remote = new RemotePlayer(this.engine.scene, id, name, hero, color);
    remote.getElevation = (x, z) => this.engine.chunkManager.getElevation(x, z);
    return remote;
  }

  private startCoopGameAsHost(seedInput?: string) {
    if (this.net.role !== 'host') return;
    this.hud.hideHostLobby();

    for (const rp of this.remotePlayers.values()) {
      rp.destroy(this.engine.scene);
    }
    this.remotePlayers.clear();

    const spawnOffsets: Record<string, [number, number]> = {
      p2: [2.5, 0.5],
      p3: [-2.5, 0.5],
      p4: [1.5, 2.0],
      p5: [-1.5, 2.0]
    };

    for (const p of this.net.lobbyPlayers) {
      if (p.id === 'host' || p.id === 'p1' || !AVAILABLE_SLOT_IDS.includes(p.id)) continue;
      const offset = spawnOffsets[p.id] || [2.5, 0.5];
      const hero = p.hero || p.charType || 'valkyrie';
      const color = p.colorCss || p.colorHex || '#06b6d4';
      const remote = this.createRemotePlayer(p.id, getPlayerSlotDisplayName(p.id, false), hero, color);
      const ey = this.engine.chunkManager.getElevation(offset[0], offset[1]);
      remote.position.set(offset[0], ey, offset[1]);
      this.remotePlayers.set(p.id, remote);
    }

    this.enemyManager.activePlayerCount = Math.max(1, this.net.lobbyPlayers.length);
    this.syncMapManagerPartners();
    this.hud.updateTeammates(this.remotePlayers);

    this.player.displayName = 'Игрок 1 (Вы)';
    this.player.colorCss = '#f59e0b';
    this.player.isCoop = true;
    this.player.redrawOverhead();
    this.hud.setCoopBadge(this.net.roomCode);

    if (seedInput && seedInput.trim().length > 0) {
      this.currentSeed = seedInput.trim();
    } else {
      this.currentSeed = Math.floor(Math.random() * 1000000);
    }

    this.restartGame(new THREE.Vector3(0, 0, 0), true);

    const numericSeed = typeof this.currentSeed === 'number'
      ? this.currentSeed
      : SeededRNG.hashString(this.currentSeed.toString());

    // Notify all guests to start with identical seed
    this.net.startGame(numericSeed);
  }

  private startCoopGameAsClient(seed?: number) {
    this.hud.hideJoinLobby();

    for (const rp of this.remotePlayers.values()) {
      rp.destroy(this.engine.scene);
    }
    this.remotePlayers.clear();

    const spawnOffsets: Record<string, [number, number]> = {
      p1: [0, 0],
      host: [0, 0],
      p2: [2.5, 0.5],
      p3: [-2.5, 0.5],
      p4: [1.5, 2.0],
      p5: [-1.5, 2.0]
    };

    for (const p of this.net.lobbyPlayers) {
      if (p.id === this.net.mySlotId) continue;
      if (p.id !== 'host' && p.id !== 'p1' && !AVAILABLE_SLOT_IDS.includes(p.id)) continue;
      const offset = spawnOffsets[p.id] || [0, 0];
      const isP1 = p.id === 'p1' || p.id === 'host';
      const hero = p.hero || p.charType || (isP1 ? 'ronin' : 'valkyrie');
      const color = p.colorCss || p.colorHex || (isP1 ? '#f59e0b' : '#06b6d4');
      const remote = this.createRemotePlayer(p.id, getPlayerSlotDisplayName(p.id, false), hero, color);
      const ey = this.engine.chunkManager.getElevation(offset[0], offset[1]);
      remote.position.set(offset[0], ey, offset[1]);
      this.remotePlayers.set(p.id, remote);
    }

    this.enemyManager.activePlayerCount = Math.max(1, this.net.lobbyPlayers.length);
    this.syncMapManagerPartners();
    this.hud.updateTeammates(this.remotePlayers);

    const myOffset = spawnOffsets[this.net.mySlotId] || [2.5, 0.5];
    const mySlot = this.net.mySlotId || 'p2';
    this.player.displayName = getPlayerSlotDisplayName(mySlot, true);
    this.player.colorCss = PLAYER_COLORS[mySlot]?.css || '#06b6d4';
    this.player.isCoop = true;
    this.player.redrawOverhead();
    this.hud.setCoopBadge(this.net.roomCode);

    this.currentSeed = seed ?? 1337;
    this.restartGame(new THREE.Vector3(myOffset[0], 0, myOffset[1]), true);
  }

  private returnToMainMenu() {
    this.stopRoomPolling();
    this.net.reset();
    for (const rp of this.remotePlayers.values()) {
      rp.destroy(this.engine.scene);
    }
    this.remotePlayers.clear();
    this.syncMapManagerPartners();
    this.hud.clearTeammates();
    this.hud.hidePartnerHp();
    this.hud.setCoopBadge(null);
    this.player.isCoop = false;

    for (const p of this.projectiles) {
      p.destroy(this.engine.scene);
    }
    this.projectiles = [];
    this.enemyManager.clear();
    this.dropManager.clear();
    this.engine.chunkManager.clear();
    this.mapManager.clear();
    this.mapManager.close();

    this.player.reset();
    this.devManager.reset();
    this.player.isGodMode = false;
    this.player.isSpeedCheat = false;
    this.player.isOneHitKill = false;
    this.player.recalculateStats();
    this.allPlayerStats.clear();
    this.recentlyDeadEnemyIds.clear();
    this.pendingDamageToClients.clear();
    this.pendingLevelUps = 0;
    this.isLevelUpActive = false;
    this.hud.resetBossUI();
    this.gameState = GameState.MAIN_MENU;
    this.hud.showMainMenu();
  }

  private resumeGame() {
    if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      this.hud.hidePause();
      this.lastTime = performance.now();
    }
  }

  private triggerLevelUp() {
    if (this.isLevelUpActive) return;
    if (this.pendingLevelUps <= 0) return;

    this.pendingLevelUps--;
    this.isLevelUpActive = true;

    if (this.player.isCoop) {
      // In co-op, non-blocking level up so teammate doesn't freeze!
      // Give a 7s safety shield for the 2-step selection
      this.player.addBuff({
        type: 'invulnerable',
        name: 'Щит выбора',
        icon: 'DEF',
        color: '#f59e0b',
        duration: 7.0,
        maxDuration: 7.0,
        value: 1
      });
      this.hud.showLevelUp(this.player, () => {
        this.isLevelUpActive = false;
        if (this.pendingLevelUps > 0) {
          this.triggerLevelUp();
        }
      });
    } else {
      this.gameState = GameState.LEVEL_UP;
      this.hud.showLevelUp(this.player, () => {
        this.isLevelUpActive = false;
        if (this.pendingLevelUps > 0) {
          this.triggerLevelUp();
        } else {
          this.gameState = GameState.PLAYING;
          this.lastTime = performance.now();
        }
      });
    }
  }

  private spawnCosmeticShot(shot: NetShotInfo) {
    const proj = new Projectile({
      position: new THREE.Vector3(shot.x, shot.y, shot.z),
      direction: new THREE.Vector3(shot.dx, 0, shot.dz),
      speed: shot.spd,
      damage: 0,
      pierce: 9999,
      lifetime: shot.orb ? 999999 : (shot.lt || 2.5),
      radius: shot.rad,
      color: shot.col,
      isMagic: shot.mag,
      isOrbiting: shot.orb,
      isArrow: shot.arr,
      isKukri: shot.kkr,
      isLightning: shot.ltg,
      orbitRadius: shot.orad,
      orbitSpeed: shot.ospd,
      isCosmetic: true,
      ownerId: shot.ownerId
    });
    this.spawnProjectile(proj);
    if (!shot.orb) {
      if (shot.ltg) {
        SoundManager.playLightning();
      } else if (shot.arr) {
        SoundManager.playBowShoot();
      } else if (shot.kkr) {
        SoundManager.playSlash();
      } else {
        SoundManager.playShoot();
      }
    }
  }

  private spawnProjectile = (proj: Projectile) => {
    this.projectiles.push(proj);
    this.engine.scene.add(proj.mesh);

    if (this.player.isCoop && !proj.isCosmetic) {
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      this.pendingLocalShots.push({
        x: proj.position.x,
        y: proj.position.y,
        z: proj.position.z,
        dx: proj.direction.x,
        dz: proj.direction.z,
        spd: proj.speed,
        lt: proj.lifetime,
        rad: proj.radius,
        col: proj.color ?? 0xf59e0b,
        mag: proj.isMagic,
        orb: proj.isOrbiting,
        orad: proj.orbitRadius,
        ospd: proj.orbitSpeed,
        arr: proj.isArrow,
        kkr: proj.isKukri,
        ltg: proj.isLightning,
        ownerId: myId
      });
    }
  };

  private restartGame(pos?: THREE.Vector3, keepSeed: boolean = false) {
    for (const p of this.projectiles) {
      p.destroy(this.engine.scene);
    }
    this.projectiles = [];

    this.enemyManager.clear();
    this.dropManager.clear();
    this.engine.chunkManager.clear();

    if (!keepSeed && this.net.role !== 'client') {
      this.currentSeed = Math.floor(Math.random() * 1000000);
    }
    this.devManager.setCurrentSeed(this.currentSeed);

    const spawnOffsets: Record<string, [number, number]> = {
      p1: [0, 0],
      host: [0, 0],
      p2: [2.5, 0.5],
      p3: [-2.5, 0.5],
      p4: [1.5, 2.0],
      p5: [-1.5, 2.0]
    };
    const myOffset = spawnOffsets[this.net.mySlotId] || (this.net.role === 'client' ? [2.5, 0.5] : [0, 0]);

    // Initialize The Rift Stage 1
    this.biomeManager.reset();
    this.biomeManager.applyBiomeToScene(this.engine.scene, this.engine.timeOfDay);

    if (this.net.role !== 'client') {
      this.engine.chunkManager.generateMap(this.currentSeed, this.chestManager, this.riftTeleporter, 1);
    } else {
      this.engine.chunkManager.generateMap(this.currentSeed, undefined, this.riftTeleporter, 1);
    }

    const spawnY = this.engine.chunkManager.getElevation(myOffset[0], myOffset[1]);
    const initialPos = pos || new THREE.Vector3(myOffset[0], spawnY, myOffset[1]);

    this.player.reset(initialPos);
    this.devManager.reset();
    this.player.isGodMode = false;
    this.player.isSpeedCheat = false;
    this.player.isOneHitKill = false;
    this.player.recalculateStats();

    this.player.credits = 0;
    this.player.riftItems.clear();
    this.player.recalculateStats();
    this.enemyManager.currentStage = 1;
    this.hud.updateStageText(1, this.biomeManager.currentBiome.name);
    this.hud.updateTeleporterHUD(false, 0, false, false);

    this.mapManager.setSeed(this.currentSeed);
    this.mapManager.clear();
    this.mapManager.close();
    this.allPlayerStats.clear();
    this.partnerReviveTimers.clear();
    this.recentlyDeadEnemyIds.clear();
    this.pendingDamageToClients.clear();
    this.pendingLevelUps = 0;
    this.isLevelUpActive = false;
    this.hud.resetBossUI();
    this.gameTime = 0;
    this.gameState = GameState.PLAYING;
    this.lastTime = performance.now();
  }

  private handleInteract() {
    if (this.gameState !== GameState.PLAYING || !this.player.isAlive || this.player.isDowned) {
      return;
    }

    // 1. Check Teleporter interaction
    const teleInteraction = this.riftTeleporter.getInteraction(this.player.position);
    if (teleInteraction.canInteract && teleInteraction.action) {
      if (teleInteraction.action === 'activate') {
        const activated = this.riftTeleporter.activate();
        if (activated) {
          SoundManager.playTeleporterActivate();
          this.enemyManager.spawnTeleporterBoss(this.player.position, this.biomeManager.stageNumber);
          this.hud.triggerBossWarning('ХРАНИТЕЛЬ РАЗЛОМА', this.biomeManager.stageNumber);
          if (this.net.role === 'host') {
            this.pendingNetworkEvents.push({
              type: 'teleporter_activated' as any,
              stage: this.biomeManager.stageNumber
            } as any);
          }
        }
        return;
      }

      if (teleInteraction.action === 'warp') {
        if (this.net.role === 'client') {
          this.net.send({ type: 'WARP_REQUEST' as any });
          return;
        }
        this.warpToNextStage();
        return;
      }
    }

    // 2. Check Chest interaction
    const chestData = this.chestManager.getClosestInteractableChest(
      this.player.position,
      this.gameTime,
      this.biomeManager.stageNumber
    );

    if (chestData) {
      if (this.player.credits >= chestData.cost) {
        this.player.credits -= chestData.cost;
        const item = this.chestManager.openChest(chestData.chest);
        this.player.addRiftItem(item);
        SoundManager.playChestOpen();
        this.damageNumbers.spawnDamage(chestData.chest.position, 0, true, this.engine.camera);
        this.hud.triggerAltarNotification(item.name, item.description, item.icon, item.color);

        if (this.net.role === 'client') {
          this.net.notifyChestOpened(chestData.chest.id, item.id);
        } else if (this.net.role === 'host') {
          this.pendingNetworkEvents.push({
            type: 'chest_opened',
            chestId: chestData.chest.id,
            playerId: 'p1',
            name: item.name,
            icon: item.icon,
            color: item.color
          });
        }
      } else {
        SoundManager.playHit();
      }
    }
  }

  private warpToNextStage() {
    const nextBiome = this.biomeManager.advanceStage();
    this.biomeManager.applyBiomeToScene(this.engine.scene, this.engine.timeOfDay);
    this.enemyManager.currentStage = this.biomeManager.stageNumber;
    this.hud.updateStageText(this.biomeManager.stageNumber, nextBiome.name);

    // Derive deterministic stage seed
    const numBase = typeof this.currentSeed === 'number'
      ? this.currentSeed
      : SeededRNG.hashString(this.currentSeed.toString());
    const stageSeed = numBase + this.biomeManager.stageNumber * 10007;

    // Generate fixed 500x500 map, altars, teleporter, and chests for new stage
    this.engine.chunkManager.generateMap(stageSeed, this.chestManager, this.riftTeleporter, this.biomeManager.stageNumber);
    this.mapManager.setSeed(stageSeed);
    this.mapManager.clear();

    // Reposition host player to start on ground elevation
    const spawnY = this.engine.chunkManager.getElevation(0, 0);
    this.player.position.set(0, spawnY, 0);
    this.player.mesh.position.set(0, spawnY, 0);

    // Revive all downed squad members
    if (this.player.isDowned) {
      this.player.revive(0.5);
    }
    for (const remote of this.remotePlayers.values()) {
      if (remote.isDowned) {
        remote.isDowned = false;
        remote.hp = Math.round(remote.maxHp * 0.5);
        remote.redrawOverhead();
      }
    }

    SoundManager.playTeleporterComplete();
    this.hud.triggerAltarNotification(`ЭТАП ${this.biomeManager.stageNumber}`, nextBiome.name, '🌀', '#38bdf8');

    if (this.net.role === 'host') {
      this.pendingNetworkEvents.push({
        type: 'stage_warp',
        stage: this.biomeManager.stageNumber,
        biomeName: nextBiome.name
      });
    }
  }

  private applyStageTransition(stageNumber: number, biomeName?: string) {
    const nextBiome = this.biomeManager.setStage(stageNumber);
    this.biomeManager.applyBiomeToScene(this.engine.scene, this.engine.timeOfDay);
    this.enemyManager.currentStage = stageNumber;
    this.hud.updateStageText(stageNumber, biomeName || nextBiome.name);

    const numBase = typeof this.currentSeed === 'number'
      ? this.currentSeed
      : SeededRNG.hashString(this.currentSeed.toString());
    const stageSeed = numBase + stageNumber * 10007;

    this.engine.chunkManager.generateMap(stageSeed, undefined, this.riftTeleporter, stageNumber);
    this.mapManager.setSeed(stageSeed);
    this.mapManager.clear();

    // Reposition client player to start on ground elevation
    const myOffset = SPAWN_OFFSETS[this.net.mySlotId] || [2.5, 0.5];
    const spawnY = this.engine.chunkManager.getElevation(myOffset[0], myOffset[1]);
    this.player.position.set(myOffset[0], spawnY, myOffset[1]);
    this.player.mesh.position.set(myOffset[0], spawnY, myOffset[1]);

    if (this.player.isDowned) {
      this.player.revive(0.5);
    }

    SoundManager.playTeleporterComplete();
    this.hud.triggerAltarNotification(`ЭТАП ${stageNumber}`, biomeName || nextBiome.name, '🌀', '#38bdf8');
  }

  private applyCombatProcOnEnemyHit(
    enemy: Enemy,
    baseDamage: number,
    _sourcePos?: THREE.Vector3
  ): { finalDamage: number; isCrit: boolean } {
    let finalDamage = baseDamage;
    let isCrit = false;

    // Item Proc: Crit Visor (Uncommon)
    if (Math.random() < this.player.critChance) {
      finalDamage = Math.round(finalDamage * 2.0);
      isCrit = true;
      SoundManager.playCrit();
    }

    // Item Proc: Pulse Rounds (Common) - chance to inflict extra bleed/burst damage
    const pulseStacks = this.player.getItemStacks('pulse_rounds');
    if (pulseStacks > 0 && Math.random() < Math.min(0.8, pulseStacks * 0.15)) {
      finalDamage = Math.round(finalDamage * 1.8);
      isCrit = true;
    }

    // Item Proc: Chain Lightning Coil (Uncommon)
    const chainStacks = this.player.getItemStacks('chain_lightning');
    if (chainStacks > 0 && Math.random() < 0.25) {
      const maxTargets = 2 + chainStacks;
      const chainDmg = Math.round(finalDamage * (1.2 + chainStacks * 0.3));
      let hitCount = 0;
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      const nearby = this.enemyManager.getNearbyEnemies(enemy.position.x, enemy.position.z, 8.5, this.scratchNearbyEnemies);
      for (const other of nearby) {
        if (other.isAlive && other !== enemy && other.position.distanceTo(enemy.position) <= 8.5) {
          if (this.net.role === 'client') {
            const isChainDead = other.takeDamage(chainDmg, enemy.position, myId);
            this.damageNumbers.spawnDamage(other.position, chainDmg, false, this.engine.camera);
            if (isChainDead) {
              this.player.kills++;
              this.recentlyDeadEnemyIds.add(other.id);
              this.onLocalPlayerEnemyKill(other);
              other.destroy(this.engine.scene);
              const oIdx = this.enemyManager.enemies.indexOf(other);
              if (oIdx !== -1) this.enemyManager.enemies.splice(oIdx, 1);
            }
            this.pendingClientHits.push({
              enemyId: other.id,
              damage: chainDmg,
              sourceX: enemy.position.x,
              sourceZ: enemy.position.z,
              isFatal: isChainDead
            });
          } else {
            this.enemyManager.damageEnemy(other, chainDmg, enemy.position, this.engine.camera, myId);
          }
          hitCount++;
          if (hitCount >= maxTargets) break;
        }
      }
      if (hitCount > 0) {
        SoundManager.playChainLightning();
      }
    }

    return { finalDamage, isCrit };
  }

  private onLocalPlayerEnemyKill(enemy?: Enemy) {
    // Item Proc: Bio-Leech (+5 HP per stack)
    const leechStacks = this.player.getItemStacks('bio_leech');
    if (leechStacks > 0) {
      this.player.heal(leechStacks * 5);
    }

    // Item Proc: Plasma Detonator (AOE explosion on kill)
    const detonatorStacks = this.player.getItemStacks('plasma_detonator');
    if (detonatorStacks > 0 && enemy && enemy.position) {
      SoundManager.playShoot();
      const radius = 4.0 + detonatorStacks * 1.0;
      const baseDmg = 25 * this.player.damageMultiplier;
      const explosionDmg = Math.round(baseDmg * (2.0 + detonatorStacks * 0.5));
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      const nearby = this.enemyManager.getNearbyEnemies(enemy.position.x, enemy.position.z, radius, this.scratchNearbyEnemies);

      for (const other of nearby) {
        if (other.isAlive && other !== enemy && other.position.distanceTo(enemy.position) <= radius) {
          if (this.net.role === 'client') {
            const isDead = other.takeDamage(explosionDmg, enemy.position, myId);
            this.damageNumbers.spawnDamage(other.position, explosionDmg, true, this.engine.camera);
            if (isDead) {
              this.recentlyDeadEnemyIds.add(other.id);
              other.destroy(this.engine.scene);
              const idx = this.enemyManager.enemies.indexOf(other);
              if (idx !== -1) this.enemyManager.enemies.splice(idx, 1);
            }
            this.pendingClientHits.push({
              enemyId: other.id,
              damage: explosionDmg,
              sourceX: enemy.position.x,
              sourceZ: enemy.position.z,
              isFatal: isDead
            });
          } else {
            this.enemyManager.damageEnemy(other, explosionDmg, enemy.position, this.engine.camera, myId);
          }
        }
      }
    }
  }

  private handleHostSnapshot(msg: HostSnapshotMessage) {
    const playersMap = msg.players || (msg.hostPlayer ? { p1: msg.hostPlayer, host: msg.hostPlayer } : {});

    // Sync all remote players from snapshot
    for (const [id, pState] of Object.entries(playersMap)) {
      if (id === this.net.mySlotId) {
        if (this.player.isDowned && pState.reviveProgress !== undefined) {
          this.player.reviveProgress = pState.reviveProgress;
        }
        continue;
      }
      if (id === 'host') continue; // Host is always represented as 'p1'
      if (id !== 'p1' && !AVAILABLE_SLOT_IDS.includes(id)) continue;

      let remote = this.remotePlayers.get(id);
      if (!remote) {
        const pInfo = this.net.lobbyPlayers.find(p => p.id === id);
        const isP1 = id === 'p1' || id === 'host';
        const hero = pState.charType || pInfo?.hero || (isP1 ? 'ronin' : 'valkyrie');
        const color = pInfo?.colorCss || (PLAYER_COLORS[id]?.css || (isP1 ? '#f59e0b' : '#38bdf8'));
        const name = getPlayerSlotDisplayName(id, false);
        remote = this.createRemotePlayer(id, name, hero, color);
        this.remotePlayers.set(id, remote);
        this.syncMapManagerPartners();
      }
      if (pState.level < remote.level) {
        pState.level = remote.level;
      }
      remote.syncState(pState);
      const localReviveTimer = this.partnerReviveTimers.get(id) || 0;
      if (localReviveTimer > 0) {
        remote.reviveProgress = Math.max(remote.reviveProgress, localReviveTimer);
      }
    }

    // Remove any remote players no longer present
    for (const [id, rp] of this.remotePlayers) {
      if (!playersMap[id] || (id !== 'host' && id !== 'p1' && !AVAILABLE_SLOT_IDS.includes(id))) {
        rp.destroy(this.engine.scene);
        this.remotePlayers.delete(id);
        this.syncMapManagerPartners();
      }
    }

    this.gameTime = msg.gameTime;
    if (msg.stage && msg.stage !== this.biomeManager.stageNumber) {
      this.applyStageTransition(msg.stage);
    }
    this.enemyManager.applySnapshot(msg.enemies, this.recentlyDeadEnemyIds);
    this.dropManager.applySnapshot(msg.drops);
    if (msg.chests) {
      this.chestManager.applySnapshot(msg.chests);
    }
    if (msg.teleporter) {
      this.riftTeleporter.applySnapshot(msg.teleporter);
    }
    this.enemyManager.totalKills = msg.totalKills;

    // Authoritative Boss state synchronization
    if (msg.boss === null || (msg.boss && !msg.boss.isAlive)) {
      if (this.enemyManager.activeBoss) {
        this.enemyManager.activeBoss = null;
      }
      this.hud.resetBossUI();
    } else if (msg.boss && this.enemyManager.activeBoss) {
      this.enemyManager.activeBoss.hp = msg.boss.hp;
      this.enemyManager.activeBoss.maxHp = msg.boss.maxHp;
      this.enemyManager.activeBoss.isAlive = msg.boss.isAlive;
    }

    for (const event of msg.events || []) {
      if (event.type === 'boss_spawn') {
        if (event.val === 'reaper' || this.gameTime >= 1800) {
          this.hud.triggerImmortalBossWarning(event.name);
        } else {
          this.hud.triggerBossWarning(event.name, typeof event.val === 'number' ? event.val : undefined);
        }
      } else if (event.type === 'boss_defeat') {
        if (this.enemyManager.activeBoss) {
          this.enemyManager.activeBoss = null;
        }
        this.hud.resetBossUI();
        ProgressionManager.getInstance().recordBossKilled();
      } else if (event.type === 'stage_warp' && typeof event.stage === 'number') {
        this.applyStageTransition(event.stage, event.biomeName);
      } else if (event.type === 'revive') {
        const targetId = event.targetId || '';
        const isTargetHost = targetId === 'p1' || targetId === 'host';
        const isTargetMe = targetId === this.net.mySlotId || (this.net.role === 'host' && isTargetHost);
        if (isTargetMe) {
          if (this.player.isDowned) {
            this.player.revive();
          }
        } else if (targetId) {
          const remote = this.remotePlayers.get(targetId) || (isTargetHost ? this.remotePlayers.get('p1') : undefined);
          if (remote) {
            remote.isDowned = false;
            remote.hp = Math.round(remote.maxHp * 0.45);
            remote.reviveProgress = 0;
            remote.redrawOverhead();
          }
        }
      } else if (event.type === 'altar_captured' && event.altarType) {
        this.engine.altarManager.applyRemoteCapture(event.altarType);
        const altar = this.engine.altarManager.altars.find((candidate) => candidate.config.type === event.altarType);
        if (altar) {
          this.player.addBuff({ ...altar.config.buff, duration: event.buffDuration ?? altar.config.buff.duration });
          this.hud.triggerAltarNotification(
            event.name || altar.config.name,
            event.subtitle || altar.config.subtitle,
            event.icon || altar.config.icon,
            event.color || altar.config.colorCss
          );
        }
      } else if (event.type === 'shot' && event.shot) {
        if (event.shot.ownerId !== this.net.mySlotId) {
          this.spawnCosmeticShot(event.shot);
        }
      } else if (event.type === 'credit_gain' && typeof event.val === 'number') {
        const targetId = event.playerId || event.killer;
        if (targetId === this.net.mySlotId) {
          this.player.credits += event.val;
          ProgressionManager.getInstance().addCoins(event.val);
        } else if (targetId) {
          const remote = this.remotePlayers.get(targetId);
          if (remote) {
            remote.credits += event.val;
          }
        }
      } else if (event.type === 'chest_opened' && event.chestId) {
        const chest = this.chestManager.chests.find(c => c.id === event.chestId);
        if (chest && !chest.isOpened) {
          this.chestManager.openChest(chest);
          SoundManager.playChestOpen();
        }
        if (event.playerId && event.playerId !== this.net.mySlotId && event.name) {
          const playerName = getPlayerSlotDisplayName(event.playerId, false);
          this.hud.triggerAltarNotification(`${playerName} открыл капсулу`, event.name, event.icon || '📦', event.color || '#38bdf8');
        }
      } else if (event.type === 'teleporter_activated') {
        if (this.riftTeleporter.state === 'IDLE') {
          this.riftTeleporter.activate();
          SoundManager.playTeleporterActivate();
          this.hud.triggerBossWarning('ХРАНИТЕЛЬ РАЗЛОМА', event.stage || 1);
        }
      }
    }

    // Apply host authoritative damage if client hasn't caught it locally
    const myDamageTaken = (msg.damageTakenByClient && msg.damageTakenByClient[this.net.mySlotId]) ||
      (this.net.mySlotId === 'p2' ? msg.clientDamageTaken : undefined) || 0;

    if (myDamageTaken > 0 && !this.player.isDowned && this.player.isAlive) {
      const now = performance.now();
      if (now - this.lastClientLocalHitTime > 320) {
        this.lastClientLocalHitTime = now;
        const isVictoryDeath = this.gameTime >= 1800 || (this.enemyManager.activeBoss?.isImmortal ?? false);
        const died = this.player.takeDamage(myDamageTaken, isVictoryDeath);
        SoundManager.playPlayerHurt();
        if (died) {
          this.triggerGameOver(isVictoryDeath);
        }
      }
    }

    // Sync stats from host
    if (msg.stats) {
      for (const [id, st] of Object.entries(msg.stats)) {
        this.allPlayerStats.set(id, st);
      }
      const myStats = msg.stats[this.net.mySlotId];
      if (myStats) {
        this.player.kills = Math.max(this.player.kills, myStats.kills);
        this.player.totalDamageDealt = Math.max(this.player.totalDamageDealt, myStats.damageDealt);
      }
    } else {
      if (msg.hostStats) {
        this.allPlayerStats.set('p1', msg.hostStats);
        this.allPlayerStats.set('host', msg.hostStats);
      }
      if (msg.clientStats) {
        this.allPlayerStats.set('p2', msg.clientStats);
        if (this.net.mySlotId === 'p2') {
          this.player.kills = Math.max(this.player.kills, msg.clientStats.kills);
          this.player.totalDamageDealt = Math.max(this.player.totalDamageDealt, msg.clientStats.damageDealt);
        }
      }
    }
  }

  private handleClientSync(msg: ClientSyncMessage) {
    const clientId = msg.clientId;
    if (!clientId || !AVAILABLE_SLOT_IDS.includes(clientId)) {
      return;
    }

    let remote = this.remotePlayers.get(clientId);
    if (!remote) {
      const pInfo = this.net.lobbyPlayers.find(p => p.id === clientId);
      const hero = msg.clientPlayer.charType || pInfo?.hero || 'valkyrie';
      const color = pInfo?.colorCss || (PLAYER_COLORS[clientId]?.css || '#38bdf8');
      const name = getPlayerSlotDisplayName(clientId, false);
      remote = this.createRemotePlayer(clientId, name, hero, color);
      this.remotePlayers.set(clientId, remote);
      this.syncMapManagerPartners();
    }
    if (msg.clientPlayer.level < remote.level) {
      msg.clientPlayer.level = remote.level;
    }
    remote.syncState(msg.clientPlayer);

    if (msg.clientStats) {
      const st = this.allPlayerStats.get(clientId) || { kills: 0, damageDealt: 0, level: 1, revives: 0 };
      st.kills = Math.max(st.kills, msg.clientStats.kills);
      st.damageDealt = Math.max(st.damageDealt, msg.clientStats.damageDealt);
      st.revives = Math.max(st.revives, msg.clientStats.revives);
      st.level = Math.max(st.level, msg.clientPlayer.level);
      this.allPlayerStats.set(clientId, st);
    }

    // Sync revive progress reported by client
    if (msg.revivingTargetId) {
      const isTargetHost = msg.revivingTargetId === 'p1' || msg.revivingTargetId === 'host';
      const progress = msg.reviveProgress ?? 0;
      if (isTargetHost) {
        if (this.player.isDowned) {
          this.player.reviveProgress = Math.max(this.player.reviveProgress, progress);
        }
      } else {
        const targetRemote = this.remotePlayers.get(msg.revivingTargetId);
        if (targetRemote && targetRemote.isDowned) {
          targetRemote.reviveProgress = Math.max(targetRemote.reviveProgress, progress);
        }
      }
    }

    // Spawn shots fired by client partner and forward to other clients
    if (msg.shots && msg.shots.length > 0) {
      for (const shot of msg.shots) {
        this.spawnCosmeticShot(shot);
        this.pendingNetworkEvents.push({
          type: 'shot',
          shot
        });
      }
    }

    // Apply attacks dealt by guest partner
    for (const hit of msg.damageDealt) {
      const st = this.allPlayerStats.get(clientId);
      if (st) st.damageDealt += hit.damage;
      this.enemyManager.applyRemoteDamage(
        hit.enemyId,
        hit.damage,
        new THREE.Vector3(hit.sourceX, 0, hit.sourceZ),
        this.engine.camera,
        clientId
      );
    }

    // Apply gems collected by guest partner
    for (const gemId of msg.collectedGemIds) {
      const g = this.dropManager.gems.find((gem) => gem.id === gemId);
      if (g) {
        g.destroy(this.engine.scene);
        const idx = this.dropManager.gems.indexOf(g);
        if (idx !== -1) this.dropManager.gems.splice(idx, 1);
      }
    }

    // Apply chests opened by guest partner
    if (msg.openedChestIds && msg.openedChestIds.length > 0) {
      for (const chestId of msg.openedChestIds) {
        const chest = this.chestManager.chests.find((c) => c.id === chestId);
        if (chest && !chest.isOpened) {
          this.chestManager.openChest(chest);
          SoundManager.playChestOpen();
          this.pendingNetworkEvents.push({
            type: 'chest_opened',
            chestId,
            playerId: clientId
          });
        }
      }
    }
  }

  private getEntityCounts(): { total: number; visible: number; simulated: number } {
    let total = 0;
    let visible = 0;
    let simulated = 0;

    // 1. Local Player
    total += 1;
    simulated += 1;
    if (this.cameraFrustum.containsPoint(this.player.position)) {
      visible += 1;
    }

    // 2. Remote Players
    for (const remote of this.remotePlayers.values()) {
      total += 1;
      simulated += 1;
      if (this.cameraFrustum.containsPoint(remote.position)) {
        visible += 1;
      }
    }

    // 3. Enemies
    const enemies = this.enemyManager.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.isAlive) continue;
      total += 1;
      simulated += 1;
      if (enemy.mesh.visible) {
        visible += 1;
      }
    }

    // 4. Projectiles
    const projs = this.projectiles;
    for (let i = 0; i < projs.length; i++) {
      const p = projs[i];
      if (!p.isAlive) continue;
      total += 1;
      simulated += 1;
      if (p.mesh.visible) {
        visible += 1;
      }
    }

    // 5. Drops / Gems
    const gems = this.dropManager.gems;
    for (let i = 0; i < gems.length; i++) {
      const g = gems[i];
      if (g.isCollected) continue;
      total += 1;
      simulated += 1;
      if (g.mesh.visible) {
        visible += 1;
      }
    }

    return { total, visible, simulated };
  }

  private updateProjectileVisuals(frustum: THREE.Frustum) {
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (!p.isAlive) {
        p.mesh.visible = false;
        continue;
      }
      p.updateVisuals(frustum.containsPoint(p.position));
    }
  }

  /**
   * Authoritative Simulation Step (Fixed Timestep 60Hz).
   * Completely decoupled from rendering refresh rate and monitor Hz.
   */
  private updateSimulation(dt: number) {
    if (this.net.role !== 'client') {
      this.gameTime = this.enemyManager.gameTime;
    }

    // 1. Process Input
    this.input.update(this.engine.camera);
    if (this.player.isDowned || !this.player.isAlive) {
      this.input.moveDirection.set(0, 0, 0);
    }

    // 2. Update Player
    this.player.update(
      dt,
      this.input.moveDirection,
      this.enemyManager.enemies,
      this.spawnProjectile,
      this.engine.obstacleManager,
      (enemy, amount, sourcePos) => {
        const { finalDamage, isCrit } = this.applyCombatProcOnEnemyHit(enemy, amount, sourcePos);

        if (this.net.role === 'client') {
          const isDead = enemy.takeDamage(finalDamage, sourcePos, this.net.mySlotId);
          this.damageNumbers.spawnDamage(enemy.position, finalDamage, isCrit || finalDamage > 28, this.engine.camera);
          SoundManager.playHit();
          this.player.totalDamageDealt += finalDamage;

          if (isDead) {
            this.player.kills++;
            this.recentlyDeadEnemyIds.add(enemy.id);
            this.onLocalPlayerEnemyKill(enemy);
            enemy.destroy(this.engine.scene);
            const idx = this.enemyManager.enemies.indexOf(enemy);
            if (idx !== -1) {
              this.enemyManager.enemies.splice(idx, 1);
            }
          }

          // Queue damage event for host
          this.pendingClientHits.push({
            enemyId: enemy.id,
            damage: finalDamage,
            sourceX: sourcePos ? sourcePos.x : this.player.position.x,
            sourceZ: sourcePos ? sourcePos.z : this.player.position.z,
            isFatal: isDead
          });
        } else {
          this.player.totalDamageDealt += finalDamage;
          this.enemyManager.damageEnemy(enemy, finalDamage, sourcePos, this.engine.camera, this.net.mySlotId || 'p1');
        }
      }
    );

    // 3. Update Remote Teammates & Revive Logic
    for (const remote of this.remotePlayers.values()) {
      remote.update(dt);
    }

    // Co-op Revive Proximity Check (allows reviving any downed teammate within 3.5m)
    if (!this.player.isDowned && this.player.isAlive) {
      for (const [id, remote] of this.remotePlayers) {
        if (remote.isDowned) {
          const dist = this.player.position.distanceTo(remote.position);
          if (dist <= 3.5) {
            const currentTimer = (this.partnerReviveTimers.get(id) || 0) + dt / 3.0; // 3 seconds to revive
            this.partnerReviveTimers.set(id, currentTimer);
            remote.reviveProgress = Math.min(1, currentTimer);
            if (currentTimer >= 1.0) {
              this.partnerReviveTimers.set(id, 0);
              remote.isDowned = false;
              remote.reviveProgress = 0;
              remote.hp = Math.round(remote.maxHp * 0.45);
              remote.redrawOverhead();
              this.player.revivesCount++;
              const mySlot = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
              const isTargetHost = id === 'p1' || id === 'host';
              const normalizedTarget = isTargetHost ? 'p1' : id;
              this.net.send({ type: 'REVIVE_ACTION', targetId: normalizedTarget, reviverId: mySlot });
              if (this.net.role === 'host') {
                this.pendingNetworkEvents.push({ type: 'revive', targetId: normalizedTarget, reviverId: mySlot });
              }
            }
          } else {
            const currentTimer = Math.max(0, (this.partnerReviveTimers.get(id) || 0) - dt * 0.8);
            this.partnerReviveTimers.set(id, currentTimer);
            remote.reviveProgress = currentTimer;
          }
        } else {
          this.partnerReviveTimers.set(id, 0);
        }
      }
    }

    // Host Authoritative Revive Check (ensures host-downed and client-to-client revives work even under lag)
    if (this.net.role === 'host') {
      // 1. If host player is downed, check if any alive remote player is reviving host
      if (this.player.isDowned) {
        let hostReviverId = '';
        for (const [id, remote] of this.remotePlayers) {
          if (!remote.isDowned && this.player.position.distanceTo(remote.position) <= 3.5) {
            hostReviverId = id;
            break;
          }
        }
        if (hostReviverId) {
          this.player.reviveProgress = Math.min(1, this.player.reviveProgress + dt / 3.0);
          if (this.player.reviveProgress >= 1.0) {
            this.player.revive();
            this.net.send({ type: 'REVIVE_ACTION', targetId: 'p1', reviverId: hostReviverId });
            this.pendingNetworkEvents.push({ type: 'revive', targetId: 'p1', reviverId: hostReviverId });
            const st = this.allPlayerStats.get(hostReviverId);
            if (st) st.revives++;
          }
        } else if (this.player.reviveProgress > 0) {
          this.player.reviveProgress = Math.max(0, this.player.reviveProgress - dt * 0.8);
        }
      }

      // 2. Check client-to-client revives on host
      for (const [targetId, downedRemote] of this.remotePlayers) {
        if (!downedRemote.isDowned) continue;
        let reviverId = '';
        for (const [otherId, aliveRemote] of this.remotePlayers) {
          if (otherId !== targetId && !aliveRemote.isDowned && downedRemote.position.distanceTo(aliveRemote.position) <= 3.5) {
            reviverId = otherId;
            break;
          }
        }
        if (reviverId) {
          downedRemote.reviveProgress = Math.min(1.0, downedRemote.reviveProgress + dt / 3.0);
          if (downedRemote.reviveProgress >= 1.0) {
            downedRemote.isDowned = false;
            downedRemote.reviveProgress = 0;
            downedRemote.hp = Math.round(downedRemote.maxHp * 0.45);
            downedRemote.redrawOverhead();
            this.net.send({ type: 'REVIVE_ACTION', targetId, reviverId });
            this.pendingNetworkEvents.push({ type: 'revive', targetId, reviverId });
            const st = this.allPlayerStats.get(reviverId);
            if (st) st.revives++;
          }
        }
      }
    }

    // Team wipe check: if all teammates are downed, GAME OVER or VICTORY!
    if (this.player.isCoop) {
      let anyAlive = !this.player.isDowned;
      for (const remote of this.remotePlayers.values()) {
        if (!remote.isDowned) {
          anyAlive = true;
          break;
        }
      }
      if (!anyAlive) {
        const isVictory = this.gameTime >= 1800 || (this.enemyManager.activeBoss?.isImmortal ?? false);
        this.triggerGameOver(isVictory);
      }
    }

    // Infinite procedural chunk generation streaming (tracks all teammates)
    const allPlayerPositions = [this.player.position];
    for (const remote of this.remotePlayers.values()) {
      allPlayerPositions.push(remote.position);
    }
    this.engine.chunkManager.update(allPlayerPositions);

    // Update Ancient Altars simulation (supports up to 5 players in co-op)
    const allAltarPlayers: { position: THREE.Vector3; isAlive: boolean; isDowned?: boolean }[] = [
      { position: this.player.position, isAlive: this.player.isAlive, isDowned: this.player.isDowned }
    ];
    for (const remote of this.remotePlayers.values()) {
      allAltarPlayers.push({
        position: remote.position,
        isAlive: true,
        isDowned: remote.isDowned
      });
    }
    this.engine.altarManager.updateSimulation(
      dt,
      this.player,
      undefined,
      true,
      true,
      allAltarPlayers
    );

    // Update Map & Minimap logic
    this.mapManager.update(dt);

    // The Rift: Update Teleporter, Chests and Interaction Prompts
    const { justCompleted } = this.riftTeleporter.update(dt, allPlayerPositions);
    if (justCompleted) {
      SoundManager.playTeleporterComplete();
      if (this.player.credits > 0) {
        const bonusXp = this.player.credits * 2;
        this.player.gainXp(bonusXp);
        this.player.credits = 0;
      }
      this.hud.triggerAltarNotification('РАЗЛОМ СТАБИЛИЗИРОВАН', 'Активируйте портал для перехода!', '🌀', '#10b981');
    }

    if (this.riftTeleporter.state === 'CHARGING') {
      if (!this.enemyManager.activeBoss || !this.enemyManager.activeBoss.isAlive) {
        this.riftTeleporter.isBossDefeated = true;
      }
    }

    this.chestManager.update(dt);

    const telePrompt = this.riftTeleporter.getInteraction(this.player.position);
    if (telePrompt.canInteract) {
      this.hud.showInteractionPrompt(telePrompt.prompt);
    } else {
      const chestData = this.chestManager.getClosestInteractableChest(
        this.player.position,
        this.gameTime,
        this.biomeManager.stageNumber
      );
      if (chestData) {
        const canAfford = this.player.credits >= chestData.cost;
        const msg = canAfford
          ? `[E] Открыть контейнер (${chestData.cost} ⬡)`
          : `[E] Недостаточно кредитов (${chestData.cost} ⬡, у вас ${this.player.credits} ⬡)`;
        this.hud.showInteractionPrompt(msg);
      } else {
        this.hud.hideInteractionPrompt();
      }
    }

    this.hud.updateTeleporterHUD(
      this.riftTeleporter.state === 'CHARGING',
      this.riftTeleporter.chargeProgress,
      this.riftTeleporter.isPlayerInsideZone,
      this.riftTeleporter.state === 'WARP_READY'
    );

    // 4. Update Enemies Simulation (Host/Solo simulate movement, separation & AI)
    if (this.net.role !== 'client') {
      const allTargets: PlayerTargetInfo[] = [
        {
          id: 'p1',
          position: this.player.position,
          isAlive: this.player.isAlive,
          isDowned: this.player.isDowned
        }
      ];
      for (const [id, remote] of this.remotePlayers) {
        allTargets.push({
          id,
          position: remote.position,
          isAlive: true,
          isDowned: remote.isDowned
        });
      }

      this.enemyManager.update(
        dt,
        this.player.position,
        (damage: number, isImmortalHit?: boolean) => {
          const isVictoryDeath = isImmortalHit || this.gameTime >= 1800;
          const died = this.player.takeDamage(damage, isVictoryDeath);
          if (died) {
            this.triggerGameOver(isVictoryDeath);
          }
        },
        this.engine.obstacleManager,
        allTargets,
        (targetId: string, damage: number, isImmortalHit?: boolean) => {
          const remote = this.remotePlayers.get(targetId);
          if (remote) {
            const isVictoryDeath = isImmortalHit || this.gameTime >= 1800;
            remote.hp = Math.max(0, remote.hp - damage);
            const cur = this.pendingDamageToClients.get(targetId) || 0;
            this.pendingDamageToClients.set(targetId, cur + damage);
            if (isVictoryDeath) {
              remote.isDowned = true;
            }
          }
        }
      );
    } else {
      // Client-side local collision check against enemies
      if (this.player.isAlive && !this.player.isDowned) {
        const now = performance.now();
        if (now - this.lastClientLocalHitTime > 380) {
          const nearby = this.enemyManager.getNearbyEnemies(
            this.player.position.x,
            this.player.position.z,
            3.5,
            this.scratchNearbyEnemies
          );
          for (const enemy of nearby) {
            if (!enemy.isAlive) continue;
            const collisionRadius = (enemy.width + enemy.height) * 0.25 + 0.5;
            const dx = enemy.position.x - this.player.position.x;
            const dz = enemy.position.z - this.player.position.z;
            if (dx * dx + dz * dz < collisionRadius * collisionRadius) {
              this.lastClientLocalHitTime = now;
              const isVictoryDeath = enemy.isImmortal || this.gameTime >= 1800;
              const died = this.player.takeDamage(enemy.damage, isVictoryDeath);
              SoundManager.playPlayerHurt();
              if (died) {
                this.triggerGameOver(isVictoryDeath);
              }
              break;
            }
          }
        }
      }
    }

    // 5. Update Projectiles & Combat Collisions
    this.updateProjectiles(dt);

    // 6. Update Drops (XP Gems)
    const dropCollectors = [
      {
        id: this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2'),
        position: this.player.position,
        pickupRadius: (this.player.isDowned || !this.player.isAlive) ? 0 : this.player.pickupRadius,
        isAlive: this.player.isAlive,
        isDowned: this.player.isDowned,
        onCollect: (xp: number, gem: Gem) => {
          const levelsGained = this.player.gainXp(xp);
          ProgressionManager.getInstance().addAccountXp(Math.max(1, Math.round(xp * 0.25)));
          this.damageNumbers.spawnXp(this.player.position, xp, this.engine.camera);

          // Random mob passive drop collected!
          if (gem.type === 'gold') {
            const buffId = gem.passiveBuffId || getPassiveBuffId(gem.id);
            const toast = this.player.applyPassiveBuff(buffId);
            this.damageNumbers.spawnPassiveBuff(this.player.position, toast, this.engine.camera);
            SoundManager.playBuffExpire();
            this.hud.updatePassivesBar(this.player);
          }

          if (this.net.role === 'client') {
            this.pendingClientCollectedGems.push(gem.id);
          }
          if (levelsGained > 0) {
            this.damageNumbers.spawnLevelUp(this.player.position, this.player.level, this.engine.camera);
            this.pendingLevelUps += levelsGained;
            this.triggerLevelUp();
          }
        }
      }
    ];

    for (const [id, remote] of this.remotePlayers) {
      dropCollectors.push({
        id,
        position: remote.position,
        pickupRadius: remote.isDowned ? 0 : 4.2,
        isAlive: true,
        isDowned: remote.isDowned,
        onCollect: (xp: number) => {
          remote.gainXp(xp);
        }
      });
    }

    this.dropManager.updateWithCollectors(dt, dropCollectors);

    // 7. Multiplayer Network Tick (~25 Hz)
    this.netSendTimer += dt;
    if (this.netSendTimer >= 0.04) {
      this.netSendTimer = 0;
      this.broadcastNetworkState();
    }
  }

  /**
   * Rendering Phase: runs on requestAnimationFrame at display refresh rate.
   * Performs Viewport/Frustum culling: hides everything outside the camera frustum
   * to eliminate off-screen draw calls and matrix computations.
   */
  private updateRendering(rawDt: number, fps: number) {
    // 1. Telemetry updates
    this.devManager.updateTelemetry(fps, this.projectiles.length);
    this.hud.updatePerformance(fps, this.player.isCoop ? this.net.ping : undefined);

    // 2. Camera follow & Frustum update
    this.engine.updateCamera(this.player.position, rawDt);
    this.projScreenMatrix.multiplyMatrices(this.engine.camera.projectionMatrix, this.engine.camera.matrixWorldInverse);
    this.cameraFrustum.setFromProjectionMatrix(this.projScreenMatrix);

    if (this.gameState === GameState.PLAYING) {
      // 3. Viewport / Frustum Culling & Visual Updates (Do NOT draw what is not visible!)
      this.engine.chunkManager.cull(this.cameraFrustum);
      this.enemyManager.updateVisuals(rawDt, this.cameraFrustum, this.player.position);
      this.dropManager.updateVisuals(rawDt, this.cameraFrustum);
      this.updateProjectileVisuals(this.cameraFrustum);
      this.engine.altarManager.updateVisuals(rawDt, this.engine.camera, this.cameraFrustum);

      // 4. Update HUDs
      let teammatesKills = 0;
      for (const [id, st] of this.allPlayerStats) {
        if (id !== this.net.mySlotId && id !== (this.net.role === 'host' ? 'p1' : '')) {
          teammatesKills += st.kills;
        }
      }
      this.hud.updateTeammates(
        this.remotePlayers,
        this.player,
        this.net.mySlotId,
        this.player.isCoop ? this.net.role : 'solo',
        this.net.lobbyPlayers
      );
      this.hud.update(
        this.player,
        this.enemyManager.totalKills,
        this.gameTime,
        this.enemyManager.activeBoss,
        teammatesKills
      );
      this.hud.updatePoeParty(
        this.player,
        this.remotePlayers,
        this.net.mySlotId,
        this.player.isCoop ? this.net.role : 'solo',
        this.net.lobbyPlayers
      );
    }

    // 5. Render Scene via Three.js
    this.engine.render();

    // 6. Update Debug Network / Performance HUD
    if (this.debugHud.getIsOpen()) {
      const netStats = this.net.getDebugStats();
      const counts = this.getEntityCounts();
      this.debugHud.update({
        fps: this.fpsEma,
        frameTime: this.frameTimeEma,
        simulationTime: this.simTimeEma,
        renderingTime: this.renderTimeEma,
        entitiesTotal: counts.total,
        entitiesVisible: counts.visible,
        entitiesSimulated: counts.simulated,
        rtt: netStats.rtt,
        jitter: netStats.jitter,
        packetLoss: netStats.packetLoss,
        connection: netStats.connection,
        route: netStats.route,
        turn: netStats.turn,
        uploadKbps: netStats.uploadKbps,
        downloadKbps: netStats.downloadKbps
      });
    }
  }

  private loop = () => {
    requestAnimationFrame(this.loop);

    const now = performance.now();
    const frameTimeMs = now - this.lastTime;
    const rawDt = Math.min((now - this.lastTime) / 1000, 0.2);
    const fps = rawDt > 0 ? 1 / rawDt : 60;
    this.lastTime = now;

    // Apply Dev Mode timeScale (1x, 2x, 5x)
    const scaledDt = rawDt * this.devManager.timeScale;

    // 1. Simulation Phase (runs smoothly in sync with rendering refresh rate)
    const simStart = performance.now();
    if (this.gameState === GameState.PLAYING) {
      this.updateSimulation(scaledDt);
    } else if (this.gameState === GameState.PAUSED && this.mapManager.isOpen) {
      this.mapManager.update(rawDt);
    }
    const simDuration = performance.now() - simStart;

    // 2. Rendering Phase (at display refresh rate, culls off-screen objects)
    const renderStart = performance.now();
    this.updateRendering(rawDt, fps);
    const renderDuration = performance.now() - renderStart;

    // Smooth telemetry with Exponential Moving Average (EMA)
    this.simTimeEma = this.simTimeEma === 0 ? simDuration : this.simTimeEma * 0.85 + simDuration * 0.15;
    this.renderTimeEma = this.renderTimeEma === 0 ? renderDuration : this.renderTimeEma * 0.85 + renderDuration * 0.15;
    this.frameTimeEma = this.frameTimeEma === 0 ? frameTimeMs : this.frameTimeEma * 0.85 + frameTimeMs * 0.15;
    this.fpsEma = this.fpsEma === 0 ? fps : this.fpsEma * 0.85 + fps * 0.15;
  };

  private broadcastNetworkState() {
    if (this.net.role === 'host' && this.net.isConnected) {
      const mySlot = this.net.mySlotId || 'p1';
      const myNetState: PlayerNetState = {
        id: mySlot,
        x: this.player.position.x,
        z: this.player.position.z,
        dir: this.player.currentDir,
        anim: this.player.animState,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        level: this.player.level,
        xp: this.player.xp,
        xpToNextLevel: this.player.xpToNextLevel,
        credits: this.player.credits,
        isDowned: this.player.isDowned,
        reviveProgress: this.player.reviveProgress,
        charType: this.player.charType,
        kills: this.player.kills,
        damageDealt: Math.round(this.player.totalDamageDealt),
        weapons: this.player.getWeaponsNetState(),
        buffs: this.player.getBuffsNetState(),
        riftItems: Object.fromEntries(this.player.riftItems)
      };

      const allPlayersNetState: Record<string, PlayerNetState> = {
        [mySlot]: myNetState,
        host: myNetState
      };

      for (const [id, remote] of this.remotePlayers) {
        if (!AVAILABLE_SLOT_IDS.includes(id)) continue;
        allPlayersNetState[id] = {
          id,
          x: remote.position.x,
          z: remote.position.z,
          dir: remote.currentDir,
          anim: remote.animState,
          hp: remote.hp,
          maxHp: remote.maxHp,
          level: remote.level,
          xp: remote.xp,
          xpToNextLevel: remote.xpToNextLevel,
          credits: remote.credits,
          isDowned: remote.isDowned,
          reviveProgress: remote.reviveProgress,
          charType: remote.charType,
          kills: this.allPlayerStats.get(id)?.kills || 0,
          damageDealt: this.allPlayerStats.get(id)?.damageDealt || 0,
          weapons: remote.weapons,
          buffs: Array.from(remote.activeBuffs.values()).map(b => ({
            type: b.type,
            name: b.name,
            icon: b.icon,
            color: b.color,
            duration: Math.max(0, b.duration),
            maxDuration: b.maxDuration
          })),
          riftItems: Object.fromEntries(remote.riftItems)
        };
      }

      const myStatsRecord: PlayerStats = {
        kills: this.player.kills,
        damageDealt: Math.round(this.player.totalDamageDealt),
        level: this.player.level,
        revives: this.player.revivesCount
      };

      const allStatsRecord: Record<string, PlayerStats> = {
        [mySlot]: myStatsRecord,
        host: myStatsRecord
      };

      for (const [id, st] of this.allPlayerStats) {
        if (!AVAILABLE_SLOT_IDS.includes(id)) continue;
        allStatsRecord[id] = { ...st };
      }

      const dmgRecord: Record<string, number> = {};
      for (const [id, dmg] of this.pendingDamageToClients) {
        if (AVAILABLE_SLOT_IDS.includes(id) && dmg > 0) dmgRecord[id] = dmg;
      }
      this.pendingDamageToClients.clear();

      // Collect host pending shots
      if (this.pendingLocalShots.length > 0) {
        for (const shot of this.pendingLocalShots.splice(0)) {
          this.pendingNetworkEvents.push({
            type: 'shot',
            shot
          });
        }
      }

      const snapshot: HostSnapshotMessage = {
        type: 'HOST_SNAPSHOT',
        stage: this.biomeManager.stageNumber,
        players: allPlayersNetState,
        stats: allStatsRecord,
        damageTakenByClient: Object.keys(dmgRecord).length > 0 ? dmgRecord : undefined,
        // Fallback backward compatibility fields:
        hostPlayer: allPlayersNetState[mySlot] || allPlayersNetState.host,
        hostStats: allStatsRecord[mySlot] || allStatsRecord.host,
        clientStats: allStatsRecord.p2,
        clientDamageTaken: dmgRecord.p2,
        gameTime: this.gameTime,
        totalKills: this.enemyManager.totalKills,
        boss: this.enemyManager.activeBoss
          ? {
              hp: this.enemyManager.activeBoss.hp,
              maxHp: this.enemyManager.activeBoss.maxHp,
              isAlive: this.enemyManager.activeBoss.isAlive
            }
          : null,
        enemies: this.enemyManager.getSnapshot(),
        drops: this.dropManager.getSnapshot(),
        chests: this.chestManager.getSnapshot(),
        teleporter: this.riftTeleporter.getSnapshot(),
        events: this.pendingNetworkEvents.splice(0)
      };
      this.net.send(snapshot);
    } else if (this.net.role === 'client' && this.net.isConnected) {
      const clientStats: PlayerStats = {
        kills: this.player.kills,
        damageDealt: Math.round(this.player.totalDamageDealt),
        level: this.player.level,
        revives: this.player.revivesCount
      };

      let isReviving = false;
      let revivingTargetId: string | undefined = undefined;
      let highestReviveProgress = 0;
      for (const [tId, t] of this.partnerReviveTimers) {
        if (t > 0) {
          isReviving = true;
          if (t > highestReviveProgress) {
            highestReviveProgress = t;
            const isTargetHost = tId === 'p1' || tId === 'host';
            revivingTargetId = isTargetHost ? 'p1' : tId;
          }
        }
      }

      const sync: ClientSyncMessage = {
        type: 'CLIENT_SYNC',
        clientId: this.net.mySlotId,
        clientPlayer: {
          id: this.net.mySlotId,
          x: this.player.position.x,
          z: this.player.position.z,
          dir: this.player.currentDir,
          anim: this.player.animState,
          hp: this.player.hp,
          maxHp: this.player.maxHp,
          level: this.player.level,
          xp: this.player.xp,
          xpToNextLevel: this.player.xpToNextLevel,
          credits: this.player.credits,
          isDowned: this.player.isDowned,
          reviveProgress: this.player.reviveProgress,
          charType: this.player.charType,
          kills: this.player.kills,
          damageDealt: Math.round(this.player.totalDamageDealt),
          weapons: this.player.getWeaponsNetState(),
          buffs: this.player.getBuffsNetState(),
          riftItems: Object.fromEntries(this.player.riftItems)
        },
        clientStats,
        damageDealt: [...this.pendingClientHits],
        collectedGemIds: [...this.pendingClientCollectedGems],
        shots: this.pendingLocalShots.splice(0),
        isRevivingPartner: isReviving,
        revivingTargetId,
        reviveProgress: highestReviveProgress
      };
      this.pendingClientHits = [];
      this.pendingClientCollectedGems = [];
      this.net.send(sync);
    }
  }

  private triggerGameOver(isVictory: boolean = false) {
    this.gameState = GameState.GAME_OVER;
    const mins = Math.floor(this.gameTime / 60);
    const secs = Math.floor(this.gameTime % 60);
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const myStats: PlayerStats = {
      kills: this.player.kills,
      damageDealt: Math.round(this.player.totalDamageDealt),
      level: this.player.level,
      revives: this.player.revivesCount
    };

    ProgressionManager.getInstance().addAccountXp(50 + Math.floor(this.gameTime / 5));
    ProgressionManager.getInstance().save();

    const allPlayersResults: DetailedPlayerResult[] = [];
    const mySlot = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');

    // Local Player result
    allPlayersResults.push({
      id: mySlot,
      name: getPlayerSlotDisplayName(mySlot, true),
      charType: this.player.charType,
      colorCss: PLAYER_COLORS[mySlot]?.css || '#f59e0b',
      stats: myStats,
      isLocal: true
    });

    // Remote Players results
    for (const [id, remote] of this.remotePlayers) {
      const stats = this.allPlayerStats.get(id) || {
        kills: 0,
        damageDealt: 0,
        level: remote.level,
        revives: 0
      };
      allPlayersResults.push({
        id,
        name: getPlayerSlotDisplayName(id, false),
        charType: remote.charType,
        colorCss: remote.colorCss,
        stats,
        isLocal: false
      });
    }

    this.hud.showGameOver(timeStr, myStats, null, this.player.isCoop, isVictory, this.player.weapons, allPlayersResults);
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      let centerPos = this.player.position;
      if (proj.ownerId && proj.ownerId !== this.net.mySlotId) {
        const rp = this.remotePlayers.get(proj.ownerId);
        if (rp) centerPos = rp.position;
      }
      proj.update(dt, centerPos);

      if (!proj.isAlive) {
        proj.destroy(this.engine.scene);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Cosmetic projectiles (from teammates) fly purely as visual and audio effects
      if (proj.isCosmetic || proj.damage === 0) {
        continue;
      }

      // Check collision with enemies using localized spatial grid search
      const nearbyEnemies = this.enemyManager.getNearbyEnemies(
        proj.position.x,
        proj.position.z,
        proj.radius + 2.5,
        this.scratchNearbyEnemies
      );
      for (const enemy of nearbyEnemies) {
        if (!enemy.isAlive) continue;
        if (proj.hitEnemies.has(enemy.id)) continue;

        const hitDist = proj.radius + (enemy.width + enemy.height) * 0.22;
        const dx = proj.position.x - enemy.position.x;
        if (Math.abs(dx) > hitDist) continue;
        const dz = proj.position.z - enemy.position.z;
        if (Math.abs(dz) > hitDist) continue;

        if (dx * dx + dz * dz <= hitDist * hitDist) {
          proj.hitEnemies.add(enemy.id);
          const baseDmg = proj.damage * this.player.damageMultiplier;
          const { finalDamage, isCrit } = this.applyCombatProcOnEnemyHit(enemy, baseDmg, proj.position);
          const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');

          if (this.net.role === 'client') {
            const isDead = enemy.takeDamage(finalDamage, proj.position, myId);
            this.damageNumbers.spawnDamage(enemy.position, finalDamage, isCrit || finalDamage > 28, this.engine.camera);
            SoundManager.playHit();
            this.player.totalDamageDealt += finalDamage;

            if (isDead) {
              this.player.kills++;
              this.recentlyDeadEnemyIds.add(enemy.id);
              this.onLocalPlayerEnemyKill(enemy);
              enemy.destroy(this.engine.scene);
              const idx = this.enemyManager.enemies.indexOf(enemy);
              if (idx !== -1) {
                this.enemyManager.enemies.splice(idx, 1);
              }
            }

            this.pendingClientHits.push({
              enemyId: enemy.id,
              damage: finalDamage,
              sourceX: proj.position.x,
              sourceZ: proj.position.z,
              isFatal: isDead
            });
          } else {
            this.player.totalDamageDealt += finalDamage;
            this.enemyManager.damageEnemy(enemy, finalDamage, proj.position, this.engine.camera, myId);
          }

          const destroyed = proj.onHit();
          if (destroyed) {
            proj.destroy(this.engine.scene);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
