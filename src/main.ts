import * as THREE from 'three';
import { Engine } from './core/Engine';
import { InputManager } from './core/InputManager';
import { Player, CharacterType } from './entities/Player';
import { EnemyManager, PlayerTargetInfo } from './entities/EnemyManager';
import { DropManager } from './drops/DropManager';
import { Gem } from './drops/Gem';
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

  private projectiles: Projectile[] = [];
  private gameState: GameState = GameState.MAIN_MENU;
  private gameTime = 0;
  private lastTime = performance.now();
  private pendingLevelUps = 0;
  private isLevelUpActive = false;

  constructor() {
    this.engine = new Engine('game-container');
    this.input = new InputManager();
    this.damageNumbers = new DamageNumberManager();
    this.dropManager = new DropManager(this.engine.scene);
    this.enemyManager = new EnemyManager(this.engine.scene, this.dropManager, this.damageNumbers);
    this.player = new Player(this.engine.scene, 'ronin');
    this.net = new NetworkManager();

    // Monster killed attribution listener (credits accurate player ID)
    this.enemyManager.onEnemyKilled = (_enemy, killer) => {
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      const hitterId = killer || 'p1';
      if (hitterId === myId) {
        this.player.kills++;
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
      (charType: CharacterType) => this.startSinglePlayerWithHero(charType),
      () => this.resumeGame(),
      () => this.restartGame()
    );

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
    this.devManager.onBroadcastDevAction = (action, value) => {
      this.handleHostDevAction(action, value);
    };

    // Map Manager (Minimap & Full Desert Map on TAB)
    this.mapManager = new MapManager(
      this.player,
      this.enemyManager,
      this.dropManager,
      this.engine.altarManager,
      this.engine.obstacleManager
    );

    this.mapManager.onStateChange = (isOpen) => {
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
      if (
        this.devManager.getIsOpen() ||
        this.gameState === GameState.MAIN_MENU ||
        this.gameState === GameState.HOST_LOBBY ||
        this.gameState === GameState.JOIN_LOBBY ||
        this.gameState === GameState.CHARACTER_SELECT ||
        this.gameState === GameState.GAME_OVER
      ) {
        return;
      }
      this.mapManager.toggle();
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

      if (this.gameState === GameState.PLAYING) {
        this.gameState = GameState.PAUSED;
        this.hud.showPause();
      } else if (this.gameState === GameState.PAUSED) {
        this.gameState = GameState.PLAYING;
        this.hud.hidePause();
        this.lastTime = performance.now();
      }
    };

    // P Key Dev Mode Handler
    this.input.onToggleDevMode = () => {
      this.devManager.toggle();
    };

    // F3 Key Debug Network / Performance HUD Handler
    this.debugHud = new DebugHUD();
    this.input.onToggleDebugHud = () => {
      this.debugHud.toggle();
    };

    // Setup Network Listeners
    this.setupNetworkCallbacks();
    window.addEventListener('beforeunload', () => {
      this.net.reset();
    });

    // Start in Main Menu state
    this.gameState = GameState.MAIN_MENU;
    this.hud.showMainMenu();

    this.loop();
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

    this.hud.onHostStartExpedition = () => {
      this.startCoopGameAsHost();
    };

    this.hud.onGuestConnectClicked = (roomCode, hero) => {
      this.connectAsGuest(roomCode, hero);
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
        : 'ronin';
    this.hud.showJoinLobby(nextHero);
  }

  private async connectAsGuest(roomCode: string, hero: CharacterType) {
    const upperCode = roomCode.toUpperCase().trim();
    this.hud.setJoinStatus(`Подключение к комнате ${upperCode}...`, false);
    this.player.setCharacter(hero);
    const ok = await this.net.joinRoom(upperCode, hero);
    if (ok || this.net.isConnected) {
      this.hud.setGuestConnectedMode(true);
      if (!this.hud.isGuestReady) {
        this.hud.setJoinStatus(`Подключено к ${upperCode}! Нажмите «ГОТОВ» для подтверждения.`, false);
      }
      this.hud.renderJoinRoster(this.net.lobbyPlayers, this.net.mySlotId);
    } else {
      this.hud.setGuestConnectedMode(false);
      this.hud.setJoinStatus('Не удалось подключиться. Проверьте код комнаты!', true);
    }
  }

  private setupNetworkCallbacks() {
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

    this.net.onGameStartReceived = () => {
      if (this.net.role === 'client') {
        this.startCoopGameAsClient();
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
      if (targetId === this.net.mySlotId || (this.net.role === 'host' && (targetId === 'p1' || targetId === 'host'))) {
        this.player.revive();
      } else if (targetId) {
        const remote = this.remotePlayers.get(targetId);
        if (remote) {
          remote.isDowned = false;
          remote.reviveProgress = 0;
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
    if (action === 'full_heal') {
      for (const remote of this.remotePlayers.values()) {
        remote.hp = remote.maxHp;
        remote.isDowned = false;
        remote.reviveProgress = 0;
      }
    }
    this.net.send({ type: 'DEV_ACTION', action, value });
  }

  private handleClientDevAction(action: string, value?: any) {
    switch (action) {
      case 'toggle_god':
        this.player.isGodMode = !!value;
        break;
      case 'full_heal':
        this.player.fullHeal();
        if (this.player.isDowned) {
          this.player.revive();
        }
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
          this.player.addBuff(value);
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
          this.pendingLevelUps += value;
          this.triggerLevelUp();
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

  private startSinglePlayerWithHero(charType: CharacterType) {
    this.net.reset();
    for (const rp of this.remotePlayers.values()) {
      rp.destroy(this.engine.scene);
    }
    this.remotePlayers.clear();
    this.syncMapManagerPartners();
    this.enemyManager.activePlayerCount = 1;

    this.player.isCoop = false;
    this.player.setCharacter(charType);
    this.hud.setCoopBadge(null);
    this.hud.clearTeammates();
    this.hud.hidePartnerHp();
    this.restartGame();
  }

  private startCoopGameAsHost() {
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
      const remote = new RemotePlayer(this.engine.scene, p.id, getPlayerSlotDisplayName(p.id, false), hero, color);
      remote.position.set(offset[0], 0, offset[1]);
      this.remotePlayers.set(p.id, remote);
    }

    this.enemyManager.activePlayerCount = Math.max(1, this.net.lobbyPlayers.length);
    this.syncMapManagerPartners();
    this.hud.updateTeammates(this.remotePlayers);

    this.player.isCoop = true;
    this.hud.setCoopBadge(this.net.roomCode);
    this.restartGame(new THREE.Vector3(0, 0, 0));

    // Notify all guests to start
    this.net.startGame();
  }

  private startCoopGameAsClient() {
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
      const remote = new RemotePlayer(this.engine.scene, p.id, getPlayerSlotDisplayName(p.id, false), hero, color);
      remote.position.set(offset[0], 0, offset[1]);
      this.remotePlayers.set(p.id, remote);
    }

    this.enemyManager.activePlayerCount = Math.max(1, this.net.lobbyPlayers.length);
    this.syncMapManagerPartners();
    this.hud.updateTeammates(this.remotePlayers);

    const myOffset = spawnOffsets[this.net.mySlotId] || [2.5, 0.5];
    this.player.isCoop = true;
    this.hud.setCoopBadge(this.net.roomCode);
    this.restartGame(new THREE.Vector3(myOffset[0], 0, myOffset[1]));
  }

  private returnToMainMenu() {
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
      orbitRadius: shot.orad,
      orbitSpeed: shot.ospd,
      isCosmetic: true,
      ownerId: shot.ownerId
    });
    this.spawnProjectile(proj);
    if (!shot.orb) {
      SoundManager.playShoot();
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
        ownerId: myId
      });
    }
  };

  private restartGame(pos?: THREE.Vector3) {
    for (const p of this.projectiles) {
      p.destroy(this.engine.scene);
    }
    this.projectiles = [];

    this.enemyManager.clear();
    this.dropManager.clear();
    this.engine.chunkManager.clear();

    const spawnOffsets: Record<string, [number, number]> = {
      p1: [0, 0],
      host: [0, 0],
      p2: [2.5, 0.5],
      p3: [-2.5, 0.5],
      p4: [1.5, 2.0],
      p5: [-1.5, 2.0]
    };
    const myOffset = spawnOffsets[this.net.mySlotId] || (this.net.role === 'client' ? [2.5, 0.5] : [0, 0]);
    const initialPos = pos || new THREE.Vector3(myOffset[0], 0, myOffset[1]);

    this.player.reset(initialPos);
    this.engine.chunkManager.update(this.player.position);
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

  private handleHostSnapshot(msg: HostSnapshotMessage) {
    const playersMap = msg.players || (msg.hostPlayer ? { p1: msg.hostPlayer, host: msg.hostPlayer } : {});

    // Sync all remote players from snapshot
    for (const [id, pState] of Object.entries(playersMap)) {
      if (id === this.net.mySlotId) continue; // local player
      if (id !== 'host' && id !== 'p1' && !AVAILABLE_SLOT_IDS.includes(id)) continue;

      let remote = this.remotePlayers.get(id);
      if (!remote) {
        const pInfo = this.net.lobbyPlayers.find(p => p.id === id);
        const isP1 = id === 'p1' || id === 'host';
        const hero = pState.charType || pInfo?.hero || (isP1 ? 'ronin' : 'valkyrie');
        const color = pInfo?.colorCss || (PLAYER_COLORS[id]?.css || (isP1 ? '#f59e0b' : '#38bdf8'));
        const name = getPlayerSlotDisplayName(id, false);
        remote = new RemotePlayer(this.engine.scene, id, name, hero, color);
        this.remotePlayers.set(id, remote);
        this.syncMapManagerPartners();
      }
      const prevLvl = remote.level;
      const prevXp = remote.xp;
      if (pState.level < remote.level) {
        pState.level = remote.level;
      }
      remote.syncState(pState);
      if (remote.level > prevLvl && prevLvl > 0) {
        this.damageNumbers.spawnLevelUp(remote.position, remote.level, this.engine.camera);
        SoundManager.playLevelUp();
      } else if (remote.xp > prevXp && prevXp > 0 && remote.level === prevLvl) {
        this.damageNumbers.spawnXp(remote.position, remote.xp - prevXp, this.engine.camera);
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
    this.enemyManager.applySnapshot(msg.enemies, this.recentlyDeadEnemyIds);
    this.dropManager.applySnapshot(msg.drops);
    this.enemyManager.totalKills = msg.totalKills;

    for (const event of msg.events || []) {
      if (event.type === 'boss_spawn') {
        if (event.val === 'reaper' || this.gameTime >= 1800) {
          this.hud.triggerImmortalBossWarning(event.name);
        } else {
          this.hud.triggerBossWarning(event.name, typeof event.val === 'number' ? event.val : undefined);
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
      remote = new RemotePlayer(this.engine.scene, clientId, name, hero, color);
      this.remotePlayers.set(clientId, remote);
      this.syncMapManagerPartners();
    }
    const prevLvl = remote.level;
    const prevXp = remote.xp;
    if (msg.clientPlayer.level < remote.level) {
      msg.clientPlayer.level = remote.level;
    }
    remote.syncState(msg.clientPlayer);
    if (remote.level > prevLvl && prevLvl > 0) {
      this.damageNumbers.spawnLevelUp(remote.position, remote.level, this.engine.camera);
      SoundManager.playLevelUp();
    } else if (remote.xp > prevXp && prevXp > 0 && remote.level === prevLvl) {
      this.damageNumbers.spawnXp(remote.position, remote.xp - prevXp, this.engine.camera);
    }

    if (msg.clientStats) {
      const st = this.allPlayerStats.get(clientId) || { kills: 0, damageDealt: 0, level: 1, revives: 0 };
      st.kills = Math.max(st.kills, msg.clientStats.kills);
      st.damageDealt = Math.max(st.damageDealt, msg.clientStats.damageDealt);
      st.revives = Math.max(st.revives, msg.clientStats.revives);
      st.level = Math.max(st.level, msg.clientPlayer.level);
      this.allPlayerStats.set(clientId, st);
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
        if (this.net.role === 'client') {
          const isDead = enemy.takeDamage(amount, sourcePos, this.net.mySlotId);
          this.damageNumbers.spawnDamage(enemy.position, amount, amount > 28, this.engine.camera);
          SoundManager.playHit();
          this.player.totalDamageDealt += amount;

          if (isDead) {
            this.player.kills++;
            this.recentlyDeadEnemyIds.add(enemy.id);
            enemy.destroy(this.engine.scene);
            const idx = this.enemyManager.enemies.indexOf(enemy);
            if (idx !== -1) {
              this.enemyManager.enemies.splice(idx, 1);
            }
          }

          // Queue damage event for host
          this.pendingClientHits.push({
            enemyId: enemy.id,
            damage: amount,
            sourceX: sourcePos ? sourcePos.x : this.player.position.x,
            sourceZ: sourcePos ? sourcePos.z : this.player.position.z,
            isFatal: isDead
          });
        } else {
          this.player.totalDamageDealt += amount;
          this.enemyManager.damageEnemy(enemy, amount, sourcePos, this.engine.camera, this.net.mySlotId || 'p1');
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
              this.player.revivesCount++;
              this.net.send({ type: 'REVIVE_ACTION', targetId: id });
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
          for (const enemy of this.enemyManager.enemies) {
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
          this.damageNumbers.spawnXp(this.player.position, xp, this.engine.camera);
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
        onCollect: (xp: number, _gem: Gem) => {
          if (this.net.role === 'host') {
            this.damageNumbers.spawnXp(remote.position, xp, this.engine.camera);
          }
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
      this.enemyManager.updateVisuals(rawDt, this.cameraFrustum);
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
        isDowned: this.player.isDowned,
        charType: this.player.charType,
        kills: this.player.kills,
        damageDealt: Math.round(this.player.totalDamageDealt),
        weapons: this.player.getWeaponsNetState(),
        buffs: this.player.getBuffsNetState()
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
          isDowned: remote.isDowned,
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
          }))
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
      for (const t of this.partnerReviveTimers.values()) {
        if (t > 0) { isReviving = true; break; }
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
          isDowned: this.player.isDowned,
          charType: this.player.charType,
          kills: this.player.kills,
          damageDealt: Math.round(this.player.totalDamageDealt),
          weapons: this.player.getWeaponsNetState(),
          buffs: this.player.getBuffsNetState()
        },
        clientStats,
        damageDealt: [...this.pendingClientHits],
        collectedGemIds: [...this.pendingClientCollectedGems],
        shots: this.pendingLocalShots.splice(0),
        isRevivingPartner: isReviving
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

      // Check collision with enemies
      for (const enemy of this.enemyManager.enemies) {
        if (!enemy.isAlive) continue;
        if (proj.hitEnemies.has(enemy.id)) continue;

        const hitDist = proj.radius + (enemy.width + enemy.height) * 0.22;
        const dx = proj.position.x - enemy.position.x;
        if (Math.abs(dx) > hitDist) continue;
        const dz = proj.position.z - enemy.position.z;
        if (Math.abs(dz) > hitDist) continue;

        if (dx * dx + dz * dz <= hitDist * hitDist) {
          proj.hitEnemies.add(enemy.id);
          const dmg = proj.damage * this.player.damageMultiplier;
          const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');

          if (this.net.role === 'client') {
            const isDead = enemy.takeDamage(dmg, proj.position, myId);
            this.damageNumbers.spawnDamage(enemy.position, dmg, dmg > 28, this.engine.camera);
            SoundManager.playHit();
            this.player.totalDamageDealt += dmg;

            if (isDead) {
              this.player.kills++;
              this.recentlyDeadEnemyIds.add(enemy.id);
              enemy.destroy(this.engine.scene);
              const idx = this.enemyManager.enemies.indexOf(enemy);
              if (idx !== -1) {
                this.enemyManager.enemies.splice(idx, 1);
              }
            }

            this.pendingClientHits.push({
              enemyId: enemy.id,
              damage: dmg,
              sourceX: proj.position.x,
              sourceZ: proj.position.z,
              isFatal: isDead
            });
          } else {
            this.player.totalDamageDealt += dmg;
            this.enemyManager.damageEnemy(enemy, dmg, proj.position, this.engine.camera, myId);
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
