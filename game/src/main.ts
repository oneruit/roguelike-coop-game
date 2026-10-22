import {
  Frustum,
  Matrix4,
  Vector3
} from 'three';
import { Engine } from './core/Engine';
import { InputManager } from './core/InputManager';
import { Player, CharacterType } from './entities/Player';
import { EnemyManager, PlayerTargetInfo } from './entities/EnemyManager';
import { Enemy } from './entities/Enemy';
import { DropManager } from './drops/DropManager';
import { Gem } from './drops/Gem';
import { getPassiveBuffId } from './drops/PassiveBuffs';
import { DamageNumberManager } from './combat/DamageNumberManager';
import { HUD } from './ui/HUD';
import { DevManager } from './ui/DevManager';
import { DebugHUD } from './ui/DebugHUD';
import { MapManager } from './ui/MapManager';
import { NetworkManager } from './net/NetworkManager';
import { RemotePlayer } from './entities/RemotePlayer';
import { SoundManager } from './core/SoundManager';
import { BiomeManager } from './world/BiomeManager';
import { ChestManager } from './world/ChestManager';
import { MobNestManager } from './world/MobNestManager';
import { RiftTeleporter } from './world/RiftTeleporter';
import { ProgressionManager } from './core/ProgressionManager';
import { MetaProgression } from './meta/MetaProgression';
import { BalanceManager } from './balance/BalanceManager';
import { UpdateNotifier } from './core/UpdateNotifier';
import { UpdateNotificationUI } from './ui/UpdateNotificationUI';
import { AssetPreloader } from './core/AssetPreloader';
import { CombatDirector } from './combat/CombatDirector';
import { GameNetworkCoordinator } from './net/GameNetworkCoordinator';
import { SessionDirector, GameState } from './core/SessionDirector';
import { LobbyCoordinator } from './net/LobbyCoordinator';
import { MerchantManager } from './world/MerchantManager';
import { SulfurSmokeManager } from './vfx/SulfurSmokeVfx';
import { GameStateBridge } from './ui/stores/GameStateBridge';
import { initReactUI, disposeReactUI } from './ui/react/mountReactUI';
import { FeatureFlags } from './core/FeatureFlags';

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
  private updateUI: UpdateNotificationUI;
  private biomeManager: BiomeManager;
  private chestManager: ChestManager;
  private riftTeleporter: RiftTeleporter;
  private merchantManager: MerchantManager;
  private mobNestManager: MobNestManager;

  private combatDirector: CombatDirector;
  private netCoordinator: GameNetworkCoordinator;
  private sessionDirector: SessionDirector;
  private lobbyCoordinator: LobbyCoordinator;
  private lastVolatileHitTime: number = 0;

  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private scratchNearbyEnemies: Enemy[] = [];
  private netSendTimer = 0;
  private lastClientLocalHitTime = 0;

  // Frustum Culling
  private cameraFrustum = new Frustum();
  private projScreenMatrix = new Matrix4();

  // Performance Telemetry EMA smoothers
  private simTimeEma: number = 0;
  private renderTimeEma: number = 0;
  private frameTimeEma: number = 0;
  private fpsEma: number = 0;
  private lastTime = performance.now();
  private animFrameId: number = 0;
  private accumulator: number = 0;
  public static readonly FIXED_TIMESTEP: number = 1 / 60;

  constructor() {
    this.engine = new Engine('game-container');
    this.input = new InputManager();
    this.damageNumbers = new DamageNumberManager();
    this.dropManager = new DropManager(this.engine.scene);
    this.enemyManager = new EnemyManager(this.engine.scene, this.dropManager, this.damageNumbers);
    this.enemyManager.camera = this.engine.camera;
    this.enemyManager.onVolatileRingTrigger = (pos, radius, damage) => {
      const now = performance.now();
      const isWithinGracePeriod = now - this.lastVolatileHitTime < 600; // 0.6s grace period against rapid multi-discharge
      const effectiveDamage = isWithinGracePeriod ? Math.max(1, Math.round(damage * 0.25)) : damage;

      const dist = this.player.position.distanceTo(pos);
      if (dist <= radius && this.player.isAlive && !this.player.isDowned) {
        this.lastVolatileHitTime = now;
        this.player.takeDamage(effectiveDamage);
        this.damageNumbers.spawnDamage(this.player.position, effectiveDamage, false, this.engine.camera, false, 1, 1, false);
        SoundManager.playPlayerHurt?.();
      }

      for (const [id, remote] of this.remotePlayers) {
        if (!remote.isDowned && remote.position.distanceTo(pos) <= radius) {
          remote.hp = Math.max(0, remote.hp - effectiveDamage);
          const cur = this.netCoordinator.pendingDamageToClients.get(id) || 0;
          this.netCoordinator.pendingDamageToClients.set(id, cur + effectiveDamage);
          remote.redrawOverhead();
        }
      }
    };
    this.enemyManager.onVortexPullTrigger = (pos, radius, pullSpeed) => {
      if (this.biomeManager.stageNumber >= 5) return;
      const maxPull = Math.min(pullSpeed || 2.8, 2.8);
      const diffX = pos.x - this.player.position.x;
      const diffZ = pos.z - this.player.position.z;
      const dist = Math.sqrt(diffX * diffX + diffZ * diffZ);
      if (dist <= radius && dist > 0.8 && this.player.isAlive && !this.player.isDowned) {
        const pull = Math.min(dist - 0.8, maxPull);
        this.player.position.x += (diffX / dist) * pull;
        this.player.position.z += (diffZ / dist) * pull;
      }
      for (const remote of this.remotePlayers.values()) {
        const rDiffX = pos.x - remote.position.x;
        const rDiffZ = pos.z - remote.position.z;
        const rDist = Math.sqrt(rDiffX * rDiffX + rDiffZ * rDiffZ);
        if (rDist <= radius && rDist > 0.8 && !remote.isDowned) {
          const rPull = Math.min(rDist - 0.8, maxPull);
          remote.position.x += (rDiffX / rDist) * rPull;
          remote.position.z += (rDiffZ / rDist) * rPull;
          remote.redrawOverhead();
        }
      }
    };
    this.player = new Player(this.engine.scene, 'ronin');
    this.net = new NetworkManager();
    UpdateNotifier.getInstance().init();
    this.updateUI = new UpdateNotificationUI();

    this.biomeManager = new BiomeManager();
    this.chestManager = new ChestManager(this.engine.scene);
    this.riftTeleporter = new RiftTeleporter(this.engine.scene, new Vector3(75, 0, 75));
    this.merchantManager = new MerchantManager(this.engine.scene, this.biomeManager);
    this.mobNestManager = new MobNestManager(this.engine.scene);
    this.merchantManager.onMerchantSpawn = () => {
      this.hud.triggerAltarNotification('ТОРГОВЕЦ РАЗЛОМА', 'Таинственный купец прибыл в сектор!', '💰', '#f59e0b');
    };

    this.riftTeleporter.onCloseWarning = (secondsLeft: number) => {
      this.hud.triggerAltarNotification('ПОРТАЛ ЗАКРЫВАЕТСЯ', `До закрытия портала осталось ${secondsLeft} секунд!`, '🌀', '#38bdf8');
    };

    this.riftTeleporter.onCloseExpired = () => {
      SulfurSmokeManager.spawn(this.engine.scene, this.riftTeleporter.position);
      SoundManager.playTeleporterComplete?.();
      this.hud.triggerAltarNotification(
        'РАЗЛОМ ЗАКРЫЛСЯ',
        'Портал исчез! Выживайте на Арене сколько сможете!',
        '💀',
        '#ef4444'
      );
    };

    // Live Game Balance sync with Supabase
    BalanceManager.init()
      .then(() => {
        this.player.syncBalance();
        this.enemyManager.syncBalance();
      })
      .catch(console.warn);

    BalanceManager.addListener((evt) => {
      this.player.syncBalance();
      this.enemyManager.syncBalance();
      this.hud.showBalanceToast(evt.description);
    });

    // Combat Director
    this.combatDirector = new CombatDirector(
      this.engine,
      this.player,
      this.enemyManager,
      this.damageNumbers,
      this.net,
      this.remotePlayers
    );

    // Bind terrain elevation and slow factor
    const elevationFn = (x: number, z: number) => this.engine.chunkManager.getElevation(x, z);
    this.player.getElevation = elevationFn;
    this.player.getTerrainSlowFactor = (x: number, z: number) => this.engine.chunkManager.getSlowFactor(x, z);
    this.enemyManager.getElevation = elevationFn;
    this.dropManager.getElevation = elevationFn;
    this.enemyManager.camera = this.engine.camera;

    // Map Manager
    this.mapManager = new MapManager(
      this.player,
      this.enemyManager,
      this.dropManager,
      this.engine.altarManager,
      this.engine.obstacleManager,
      this.chestManager,
      this.riftTeleporter
    );
    this.mapManager.setMerchantManager(this.merchantManager);
    this.mapManager.setMobNestManager(this.mobNestManager);

    this.mapManager.onStateChange = (isOpen) => {
      const isCoop = this.net.role !== 'solo' || this.player.isCoop;
      if (isCoop) return;

      if (isOpen) {
        if (this.sessionDirector.gameState === GameState.PLAYING) {
          this.sessionDirector.gameState = GameState.PAUSED;
        }
      } else {
        if (this.sessionDirector.gameState === GameState.PAUSED) {
          this.sessionDirector.gameState = GameState.PLAYING;
          this.sessionDirector.lastTime = performance.now();
        }
      }
    };

    // Dev Manager
    this.devManager = new DevManager(
      this.player,
      this.enemyManager,
      this.dropManager,
      this.engine.scene,
      this.engine.camera,
      (count = 1) => {
        this.sessionDirector.pendingLevelUps += count;
        this.sessionDirector.triggerLevelUp();
      }
    );
    this.devManager.isHost = () => this.net.role !== 'client';
    this.devManager.isCoop = () => this.player.isCoop;
    this.devManager.onApplySeed = (seed) => {
      this.sessionDirector.currentSeed = seed;
      this.sessionDirector.restartGame(undefined, true);
      this.devManager.setCurrentSeed(seed);
    };

    // HUD with callbacks
    this.hud = new HUD(
      this.engine.scene,
      (charType: CharacterType, seedInput?: string, isTrainingMode?: boolean, timeOfDay?: 'random' | 'day' | 'night') =>
        this.sessionDirector.startSinglePlayerWithHero(charType, seedInput, isTrainingMode, timeOfDay),
      () => this.sessionDirector.resumeGame(),
      () => this.sessionDirector.restartGame(undefined, false)
    );
    this.enemyManager.hud = this.hud;
    this.player.onDamageTaken = (amount) => this.hud.triggerDamageFlash(amount);
    this.hud.onRestartSameSeed = () => this.sessionDirector.restartGame(undefined, true);
    this.hud.onToggleDevMode = () => this.sessionDirector.toggleDevMode();
    this.hud.onTeleportToRift = () => this.sessionDirector.teleportPlayerToRift();
    this.hud.onSaveRunLater = () => this.sessionDirector.saveCurrentRunAndExit();
    this.hud.onResumeSavedRun = () => this.sessionDirector.resumeSavedRun();
    this.hud.onSurrender = () => this.sessionDirector.surrenderGame();
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
    this.hud.onInventoryToggle = (isOpen) => {
      const isCoop = this.net.role !== 'solo' || this.player.isCoop;
      if (isCoop) return;

      if (isOpen) {
        if (this.sessionDirector.gameState === GameState.PLAYING) {
          this.sessionDirector.gameState = GameState.PAUSED;
        }
      } else {
        if (this.sessionDirector.gameState === GameState.PAUSED) {
          this.sessionDirector.gameState = GameState.PLAYING;
          this.sessionDirector.lastTime = performance.now();
        }
      }
    };
    this.hud.onMerchantToggle = (isOpen) => {
      const isCoop = this.net.role !== 'solo' || this.player.isCoop;
      if (isCoop) return;

      if (isOpen) {
        if (this.sessionDirector.gameState === GameState.PLAYING) {
          this.sessionDirector.gameState = GameState.PAUSED;
        }
      } else {
        if (this.sessionDirector.gameState === GameState.PAUSED) {
          this.sessionDirector.gameState = GameState.PLAYING;
          this.sessionDirector.lastTime = performance.now();
        }
      }
    };
    const savedShadowQuality = parseInt(localStorage.getItem('rift_shadow_quality') || localStorage.getItem('wildwest_shadow_quality') || '1024', 10);
    this.engine.setShadowQuality(savedShadowQuality);

    // Network Coordinator
    this.netCoordinator = new GameNetworkCoordinator(
      this.engine,
      this.player,
      this.enemyManager,
      this.dropManager,
      this.chestManager,
      this.riftTeleporter,
      this.biomeManager,
      this.hud,
      this.mapManager,
      this.devManager,
      this.net,
      this.combatDirector,
      this.remotePlayers
    );

    this.player.onChronosTrigger = (pos) => {
      this.enemyManager.freezeAndKnockbackAll(pos, 5.0, 25.0);
      this.combatDirector.spawnChronosShockwave(pos);
      if (this.net.role !== 'solo') {
        this.netCoordinator.broadcastTimeFreeze(pos);
      }
    };

    // Session Director
    this.sessionDirector = new SessionDirector(
      this.engine,
      this.player,
      this.enemyManager,
      this.dropManager,
      this.damageNumbers,
      this.hud,
      this.devManager,
      this.mapManager,
      this.net,
      this.biomeManager,
      this.chestManager,
      this.riftTeleporter,
      this.updateUI,
      this.combatDirector,
      this.netCoordinator,
      this.remotePlayers,
      this.merchantManager,
      this.mobNestManager
    );

    // Lobby Coordinator
    this.lobbyCoordinator = new LobbyCoordinator(this.hud, this.net, this.player);
    this.sessionDirector.lobbyCoordinator = this.lobbyCoordinator;

    this.lobbyCoordinator.onSinglePlayerSelected = () => {
      this.sessionDirector.gameState = GameState.CHARACTER_SELECT;
      this.hud.showCharacterSelect();
    };
    this.lobbyCoordinator.onHostLobbyOpened = () => {
      this.sessionDirector.gameState = GameState.HOST_LOBBY;
    };
    this.lobbyCoordinator.onJoinLobbyOpened = () => {
      this.sessionDirector.gameState = GameState.JOIN_LOBBY;
    };
    this.lobbyCoordinator.onHostStartExpedition = (seedInput) => {
      this.sessionDirector.startCoopGameAsHost(seedInput);
    };
    this.lobbyCoordinator.onReturnToMenu = () => {
      this.sessionDirector.returnToMainMenu();
    };

    // Dev Manager Network Dev Broadcast
    this.devManager.onBroadcastDevAction = (action, value) => {
      this.netCoordinator.handleHostDevAction(action, value);
    };

    // Debug HUD
    this.debugHud = new DebugHUD();

    // Event listeners
    this.setupEventListeners();

    window.addEventListener('beforeunload', () => {
      this.net.reset();
    });

    // Start in Main Menu
    this.sessionDirector.gameState = GameState.MAIN_MENU;
    this.hud.showMainMenu();

    AssetPreloader.init(this.engine.renderer, () => {
      // ready
    });

    // Initialize React UI and GameStateBridge
    GameStateBridge.getInstance().init();
    GameStateBridge.getInstance().syncGameState('MAIN_MENU');

    const isR3FCanvasActive = FeatureFlags.getInstance().isEnabled('r3f_canvas');
    if (isR3FCanvasActive) {
      this.engine.detachRenderer();
    }

    initReactUI('react-ui-root', {
      scene: this.engine.scene,
      chunkManager: this.engine.chunkManager,
      altarManager: this.engine.altarManager,
      chestManager: this.chestManager,
      portalPosition: this.riftTeleporter.position,
      player: this.player,
      remotePlayers: this.remotePlayers,
      enemyManager: this.enemyManager,
      combatDirector: this.combatDirector,
      getTargetPosition: () => (this.player.renderPosition || this.player.position),
      mainMenuProps: {
        onStartSinglePlayer: () => {
          this.sessionDirector.gameState = GameState.CHARACTER_SELECT;
          this.hud.showCharacterSelect();
          GameStateBridge.getInstance().syncGameState('CHARACTER_SELECT');
        },
        onResumeRun: () => this.sessionDirector.resumeSavedRun(),
        onOpenCoop: () => this.hud.showCoopMenu(),
        onOpenShop: () => this.hud.showShopModal(),
        onOpenQuests: () => this.hud.showQuestsModal(),
        onOpenLeaderboard: () => this.hud.showLeaderboard(),
        onOpenSettings: () => this.hud.showSettings('main')
      },
      settingsProps: {
        onShadowQualityChange: (q) => this.engine.setShadowQuality(q),
        onTimeOfDayChange: (mode) => {
          this.engine.setTimeOfDay(mode);
          this.biomeManager.applyBiomeToScene(this.engine.scene, mode);
        }
      },
      gameOverProps: {
        onRestart: () => this.sessionDirector.restartGame(undefined, false),
        onReturnToMenu: () => this.sessionDirector.returnToMainMenu()
      }
    });

    this.loop();
  }

  private setupEventListeners(): void {
    // Input actions
    this.input.onInteract = () => {
      this.sessionDirector.handleInteract();
    };

    this.input.onTeleportToRift = () => {
      this.sessionDirector.teleportPlayerToRift();
    };

    this.input.onDash = () => {
      if (this.sessionDirector.gameState === GameState.PLAYING) {
        this.player.triggerDash(this.input.moveDirection);
      }
    };

    this.input.onToggleInventory = () => {
      if (
        this.sessionDirector.isRewardChoiceActive ||
        this.mapManager.isOpen ||
        this.devManager.getIsOpen() ||
        this.sessionDirector.gameState === GameState.MAIN_MENU ||
        this.sessionDirector.gameState === GameState.HOST_LOBBY ||
        this.sessionDirector.gameState === GameState.JOIN_LOBBY ||
        this.sessionDirector.gameState === GameState.CHARACTER_SELECT ||
        this.sessionDirector.gameState === GameState.GAME_OVER
      ) {
        return;
      }
      this.hud.toggleInventory(this.player);
    };

    this.input.onToggleMap = () => {
      if (
        this.sessionDirector.isRewardChoiceActive ||
        this.sessionDirector.gameState === GameState.MAIN_MENU ||
        this.sessionDirector.gameState === GameState.HOST_LOBBY ||
        this.sessionDirector.gameState === GameState.JOIN_LOBBY ||
        this.sessionDirector.gameState === GameState.CHARACTER_SELECT ||
        this.sessionDirector.gameState === GameState.GAME_OVER
      ) {
        return;
      }
      this.mapManager.toggleCenterOverlay();
    };

    this.input.onTogglePause = () => {
      if (this.mapManager.isOpen) {
        this.mapManager.close();
        return;
      }
      if (this.devManager.getIsOpen()) {
        this.devManager.toggle();
        return;
      }
      if (this.sessionDirector.isRewardChoiceActive || this.sessionDirector.gameState === GameState.GAME_OVER) {
        return;
      }

      const escResult = this.hud.handleEscape();
      if (escResult === 'resume') {
        this.sessionDirector.resumeGame();
        return;
      }
      if (escResult === 'handled') {
        if (this.sessionDirector.gameState === GameState.CHARACTER_SELECT && !this.hud.isAnyMenuOpen()) {
          this.sessionDirector.returnToMainMenu();
        } else if (this.sessionDirector.gameState === GameState.HOST_LOBBY && !this.hud.isAnyMenuOpen()) {
          this.sessionDirector.returnToMainMenu();
        } else if (this.sessionDirector.gameState === GameState.JOIN_LOBBY && !this.hud.isAnyMenuOpen()) {
          this.sessionDirector.returnToMainMenu();
        }
        return;
      }

      if (escResult === 'noop') {
        if (this.sessionDirector.gameState === GameState.PLAYING) {
          this.sessionDirector.gameState = GameState.PAUSED;
          this.hud.showPause(this.sessionDirector.currentSeed);
        } else if (this.sessionDirector.gameState === GameState.PAUSED) {
          this.sessionDirector.resumeGame();
        }
      }
    };

    this.input.onToggleDevMode = () => {
      this.sessionDirector.toggleDevMode();
    };

    this.input.onToggleDebugHud = () => {
      this.debugHud.toggle();
    };

    // EnemyManager listeners
    this.enemyManager.onEnemyKilled = (enemy, killer) => {
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      const hitterId = killer || 'p1';
      const creditsVal = enemy.creditsValue || 3;

      if (hitterId === myId) {
        this.player.credits += creditsVal;
        ProgressionManager.getInstance().addCoins(creditsVal);
        ProgressionManager.getInstance().recordEnemyKilled();

        if (enemy.type === 'crawler' || enemy.type === 'coyote') {
          ProgressionManager.getInstance().recordCrawlerOrCoyoteKilled();
        }

        if (enemy.eliteAffix) {
          if (enemy.type === 'bison') {
            ProgressionManager.getInstance().recordEliteBisonKilled();
          } else if (enemy.type === 'coyote') {
            ProgressionManager.getInstance().recordEliteCoyoteKilled();
          }
        }

        const wId = enemy.lastSourceWeaponId;
        const isRanged = wId === 'bow' || wId === 'assault_rifle' || wId === 'heavy_colt' ||
          (!wId && (this.player.charType === 'archer' || this.player.charType === 'rocket'));
        if (isRanged) {
          ProgressionManager.getInstance().recordRangedKill();
        } else {
          ProgressionManager.getInstance().recordMeleeOrSpellKill();
        }
      } else {
        const remote = this.remotePlayers.get(hitterId);
        if (remote) remote.credits += creditsVal;
      }

      if (this.net.role === 'host') {
        this.netCoordinator.pendingNetworkEvents.push({
          type: 'credit_gain',
          val: creditsVal,
          playerId: hitterId,
          killer: hitterId
        });
        const st = this.netCoordinator.allPlayerStats.get(hitterId);
        if (st) st.kills++;
      }

      if (hitterId === myId) {
        this.player.kills++;
        this.combatDirector.onLocalPlayerEnemyKill(enemy);
      }
      const st = this.netCoordinator.allPlayerStats.get(hitterId) || { kills: 0, damageDealt: 0, level: 1, revives: 0 };
      st.kills++;
      this.netCoordinator.allPlayerStats.set(hitterId, st);
    };

    this.enemyManager.onBossSpawn = (boss, tier) => {
      ProgressionManager.getInstance().recordBossSpawn(this.sessionDirector.gameTime);
      this.hud.triggerBossWarning(boss.name, tier);
      if (this.net.role === 'host') {
        this.netCoordinator.pendingNetworkEvents.push({
          type: 'boss_spawn',
          name: boss.name,
          val: tier
        });
      }
    };

    this.enemyManager.onImmortalBossSpawn = (boss) => {
      this.hud.triggerImmortalBossWarning(boss.name);
      if (this.net.role === 'host') {
        this.netCoordinator.pendingNetworkEvents.push({
          type: 'boss_spawn',
          name: boss.name,
          val: 'reaper'
        });
      }
    };

    this.enemyManager.onBossDefeat = (boss?: Enemy) => {
      this.hud.resetBossUI();
      ProgressionManager.getInstance().recordBossKilled();
      ProgressionManager.getInstance().recordTeleporterBossKilled();
      ProgressionManager.getInstance().recordLeshyDefeated();
      ProgressionManager.getInstance().recordBossDefeat(this.sessionDirector.gameTime);
      if (this.net.role === 'host') {
        this.netCoordinator.pendingNetworkEvents.push({ type: 'boss_defeat' });
      }
      if (boss?.isStage5FinalBoss) {
        // Defeat if player dies in arena; victory ONLY if entering portal
        this.sessionDirector.isVictoryAchieved = false;
        this.enemyManager.activateEndlessHorde();
        this.riftTeleporter.startStage5CloseTimer(60);
        SoundManager.playVictory?.();
        this.hud.triggerAltarNotification(
          'АРЕНА ВЫЖИВАНИЯ',
          'Босс повержен! Портал закроется через 60 сек. Войдите в Разлом [E] для ПОБЕДЫ или останьтесь выживать!',
          '⚔️',
          '#f59e0b'
        );
      }
    };

    this.enemyManager.onBleedDamage = (enemy, dmg, isDead, hitter, sourceWeaponId) => {
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      if (hitter === myId) {
        this.player.totalDamageDealt += dmg;
        if (sourceWeaponId) {
          this.player.recordWeaponDamage(sourceWeaponId, dmg);
          if (sourceWeaponId === 'blood_bats') {
            this.player.heal(dmg * 0.01);
          }
        }
      }
      if (this.net.role === 'client') {
        this.combatDirector.pendingClientHits.push({
          enemyId: enemy.id,
          damage: dmg,
          sourceX: enemy.position.x,
          sourceZ: enemy.position.z,
          isFatal: isDead
        });
      }
    };

    this.enemyManager.onBurnDamage = (enemy, dmg, isDead, hitter, sourceWeaponId) => {
      const myId = this.net.mySlotId || (this.net.role === 'host' ? 'p1' : 'p2');
      if (hitter === myId) {
        this.player.totalDamageDealt += dmg;
        if (sourceWeaponId) {
          this.player.recordWeaponDamage(sourceWeaponId, dmg);
          if (sourceWeaponId === 'blood_bats') {
            this.player.heal(dmg * 0.01);
          }
        }
      }
      if (this.net.role === 'client') {
        this.combatDirector.pendingClientHits.push({
          enemyId: enemy.id,
          damage: dmg,
          sourceX: enemy.position.x,
          sourceZ: enemy.position.z,
          isFatal: isDead
        });
      }
    };

    // Altar captured
    this.engine.altarManager.onAltarCaptured = (altar) => {
      ProgressionManager.getInstance().recordResourceGather(1);
      ProgressionManager.getInstance().recordAltarCaptured();
      this.hud.triggerAltarNotification(
        altar.config.name,
        altar.config.subtitle,
        altar.config.icon,
        altar.config.colorCss
      );
      if (this.net.role === 'host') {
        this.netCoordinator.pendingNetworkEvents.push({
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

    // Altar of Greed Trial events
    this.engine.altarManager.onGreedTrialStarted = (altar) => {
      this.sessionDirector.startGreedTrial(altar);
    };

    this.engine.altarManager.onGreedTrialCompleted = (altar) => {
      this.sessionDirector.completeGreedTrial(altar);
    };

    // Mob Nests events (Stage 4)
    this.mobNestManager.onNestExploded = (_nest, destroyed, total) => {
      const remaining = total - destroyed;
      if (remaining > 0) {
        this.hud.triggerAltarNotification(
          'ГНЕЗДО БЕЗДНЫ УНИЧТОЖЕНО!',
          `Осталось уничтожить: ${remaining} из ${total}. Орда пробудилась!`,
          '💥',
          '#ef4444'
        );
      } else {
        this.hud.triggerAltarNotification(
          'ВСЕ ГНЕЗДА УНИЧТОЖЕНЫ!',
          'Пространственный Разлом стабилизировался! Босс пробуждается!',
          '🌀',
          '#38bdf8'
        );
      }
    };
  }

  private updateSimulation(dt: number): void {
    if (this.net.role !== 'client') {
      this.sessionDirector.gameTime = this.enemyManager.gameTime;
    }
    this.netCoordinator.gameTime = this.sessionDirector.gameTime;

    // Sync bridge state (throttled)
    GameStateBridge.getInstance().syncPlayerVitals(
      this.player.hp,
      this.player.maxHp,
      this.player.shield,
      this.player.maxShield
    );
    GameStateBridge.getInstance().syncPlayerProgression(
      this.player.xp,
      this.player.xpToNextLevel,
      this.player.level,
      this.player.credits
    );
    GameStateBridge.getInstance().syncGameTime(this.sessionDirector.gameTime);

    if (this.biomeManager?.currentBiome?.id === 'bioluminescent_wilds') {
      ProgressionManager.getInstance().recordForestSurvivalTime(this.sessionDirector.gameTime);
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
      this.combatDirector.spawnProjectile,
      this.engine.obstacleManager,
      (enemy, amount, sourcePos, critChance, critDamage, weaponId) => {
        const { finalDamage, isCrit, critTier } = this.combatDirector.applyCombatProcOnEnemyHit(
          enemy,
          amount,
          sourcePos,
          critChance,
          critDamage
        );

        if (this.net.role === 'client') {
          const isDead = enemy.takeDamage(finalDamage, sourcePos, this.net.mySlotId, weaponId);
          this.damageNumbers.spawnDamage(enemy.position, finalDamage, isCrit, this.engine.camera, false, critTier);
          SoundManager.playHit();
          this.player.totalDamageDealt += finalDamage;
          this.player.recordWeaponDamage(weaponId, finalDamage);

          if (isDead) {
            this.player.kills++;
            this.combatDirector.recentlyDeadEnemyIds.add(enemy.id);
            this.combatDirector.onLocalPlayerEnemyKill(enemy);
            ProgressionManager.getInstance().recordEnemyKilled();
            if (enemy.type === 'crawler' || enemy.type === 'coyote') {
              ProgressionManager.getInstance().recordCrawlerOrCoyoteKilled();
            }
            if (enemy.eliteAffix) {
              if (enemy.type === 'bison') {
                ProgressionManager.getInstance().recordEliteBisonKilled();
              } else if (enemy.type === 'coyote') {
                ProgressionManager.getInstance().recordEliteCoyoteKilled();
              }
            }
            const isRanged = weaponId === 'bow' || weaponId === 'assault_rifle' || weaponId === 'heavy_colt' ||
              (!weaponId && (this.player.charType === 'archer' || this.player.charType === 'rocket'));
            if (isRanged) {
              ProgressionManager.getInstance().recordRangedKill();
            } else {
              ProgressionManager.getInstance().recordMeleeOrSpellKill();
            }
            enemy.destroy(this.engine.scene);
            const idx = this.enemyManager.enemies.indexOf(enemy);
            if (idx !== -1) {
              this.enemyManager.enemies.splice(idx, 1);
            }
          }

          this.combatDirector.pendingClientHits.push({
            enemyId: enemy.id,
            damage: finalDamage,
            sourceX: sourcePos ? sourcePos.x : this.player.position.x,
            sourceZ: sourcePos ? sourcePos.z : this.player.position.z,
            isFatal: isDead
          });
        } else {
          this.player.totalDamageDealt += finalDamage;
          this.player.recordWeaponDamage(weaponId, finalDamage);
          this.enemyManager.damageEnemy(
            enemy,
            finalDamage,
            sourcePos,
            this.engine.camera,
            this.net.mySlotId || 'p1',
            true,
            isCrit,
            critTier,
            1.5,
            weaponId
          );
        }
      }
    );

    // 3. Item procs (e.g. Orbital strike)
    this.combatDirector.updateItemProcs(dt);

    // 4. Remote teammates & Revive logic
    this.netCoordinator.updateRevives(dt);
    if (this.netCoordinator.isTeamWiped()) {
      const isVictory = false;
      this.sessionDirector.triggerGameOver(isVictory);
    }

    // 5. Chunk streaming
    const allPlayerPositions = [this.player.position];
    for (const remote of this.remotePlayers.values()) {
      allPlayerPositions.push(remote.position);
    }
    this.engine.chunkManager.update(allPlayerPositions);

    // 6. Ancient Altars simulation
    const allAltarPlayers: { position: Vector3; isAlive: boolean; isDowned?: boolean }[] = [
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
    this.sessionDirector.updateGreedTrial(dt);

    // 7. Map & Minimap
    this.mapManager.update(dt);

    // 8. The Rift: Teleporter, Chests, Prompts
    // Stage 4 Secret Rift Teleporter: reveals only after all chests on stage 4 are opened
    // Stage 4 Secret Rift Teleporter: reveals only after all 4 mob nests on stage 4 are destroyed
    if (this.biomeManager.stageNumber === 4 && !this.riftTeleporter.mesh.visible) {
      if (this.mobNestManager.isAllNestsDestroyed()) {
        this.riftTeleporter.mesh.visible = true;
        SulfurSmokeManager.spawn(this.engine.scene, this.riftTeleporter.position);
        SoundManager.playTeleporterActivate?.();
        this.hud.triggerAltarNotification('ПРОСТРАНСТВЕННЫЙ РАЗЛОМ', 'Гнезда Бездны уничтожены! Портал стабилизировался!', '🌀', '#38bdf8');
      }
    }

    if (this.riftTeleporter.state === 'CHARGING') {
      if (!this.enemyManager.activeBoss || !this.enemyManager.activeBoss.isAlive) {
        this.riftTeleporter.isBossDefeated = true;
      }
    }

    const { justCompleted, justTouched } = this.riftTeleporter.update(dt, allPlayerPositions);
    if (justCompleted) {
      SoundManager.playTeleporterComplete();
      // Award stage completion bonus XP without deleting credits so player can spend them at the merchant!
      const bonusXp = Math.max(100, Math.round(this.player.credits * 1.5));
      this.player.gainXp(bonusXp);
      this.hud.triggerAltarNotification('РАЗЛОМ СТАБИЛИЗИРОВАН', 'Босс повержен! Активируйте портал для перехода!', '🌀', '#10b981');
    }

    // Touch trigger: walking into closed rift awakens it and summons the boss
    if (justTouched && this.riftTeleporter.state === 'IDLE' && this.sessionDirector) {
      this.sessionDirector.activateRift();
    }

    // 8b. Update Brimstone / Sulfur Smoke animations
    SulfurSmokeManager.update(dt);

    this.chestManager.update(dt);

    // 8c. Mob Nests simulation
    this.mobNestManager.update(
      dt,
      this.player,
      this.remotePlayers,
      this.input.isInteractHeld(),
      this.enemyManager,
      this.damageNumbers,
      this.engine.camera
    );

    // 8b. Merchant simulation & HUD timer
    this.merchantManager.update(dt, (x, z) => this.engine.chunkManager.getElevation(x, z));
    if (this.hud.isMerchantOpen()) {
      this.hud.updateMerchantTimer(this.merchantManager);
    }

    const merchantPrompt = this.merchantManager.getInteraction(this.player.position);
    const nestPrompt = this.mobNestManager.getInteraction(this.player.position);
    if (nestPrompt.prompt) {
      this.hud.showInteractionPrompt(nestPrompt.prompt);
    } else if (merchantPrompt.canInteract) {
      this.hud.showInteractionPrompt(merchantPrompt.prompt);
    } else {
      const isFinalStage = this.biomeManager.stageNumber >= 5;
      const telePrompt = this.riftTeleporter.getInteraction(this.player.position, isFinalStage);
      if (telePrompt.canInteract) {
        this.hud.showInteractionPrompt(telePrompt.prompt);
      } else {
        const chestData = this.chestManager.getClosestInteractableChest(
          this.player.position,
          this.sessionDirector.gameTime,
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
    }


    // 9. Enemies simulation
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
        (damage: number, isImmortalHit?: boolean, attacker?: Enemy) => {
          const isVictoryDeath = Boolean(isImmortalHit);
          const died = this.player.takeDamage(damage, isVictoryDeath, attacker?.name);
          if (!this.player.isGodMode) {
            if (attacker?.eliteAffix === 'blazing') {
              this.player.applyBurn(3.0);
            } else if (attacker?.eliteAffix === 'overloading') {
              this.player.applyShock(5.0);
            } else if (attacker?.eliteAffix === 'glacial') {
              this.player.applySlow(0.65, 3.0);
            }
          }
          if (died) {
            this.sessionDirector.triggerGameOver(isVictoryDeath);
          }
        },
        this.engine.obstacleManager,
        allTargets,
        (targetId: string, damage: number, isImmortalHit?: boolean) => {
          const remote = this.remotePlayers.get(targetId);
          if (remote) {
            const isVictoryDeath = Boolean(isImmortalHit);
            if (!isVictoryDeath && remote.activeBuffs.has('ghost')) return;
            remote.hp = Math.max(0, remote.hp - damage);
            const cur = this.netCoordinator.pendingDamageToClients.get(targetId) || 0;
            this.netCoordinator.pendingDamageToClients.set(targetId, cur + damage);
            if (isVictoryDeath) {
              remote.isDowned = true;
            }
          }
        }
      );
    } else {
      // Client-side control prediction uses the same countdown as the host.
      for (const enemy of this.enemyManager.enemies) enemy.spellControl.update(dt);
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
            if (!enemy.isAlive || !enemy.canAttack) continue;
            const collisionRadius = (enemy.width + enemy.height) * 0.25 + 0.5;
            const dx = enemy.position.x - this.player.position.x;
            const dz = enemy.position.z - this.player.position.z;
            if (dx * dx + dz * dz < collisionRadius * collisionRadius) {
              this.lastClientLocalHitTime = now;
              const isVictoryDeath = Boolean(enemy.isImmortal);
              const died = this.player.takeDamage(enemy.damage, isVictoryDeath, enemy.name);
              if (!this.player.isGodMode) {
                if (enemy.eliteAffix === 'blazing') {
                  this.player.applyBurn(3.0);
                } else if (enemy.eliteAffix === 'overloading') {
                  this.player.applyShock(5.0);
                } else if (enemy.eliteAffix === 'glacial') {
                  this.player.applySlow(0.65, 3.0);
                }
              }
              SoundManager.playPlayerHurt();
              if (died) {
                this.sessionDirector.triggerGameOver(isVictoryDeath);
              }
              break;
            }
          }
        }
      }
    }

    // 10. Update Projectiles
    this.combatDirector.updateProjectiles(dt);

    // 11. Update Drops
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
          if (gem.type === 'blue' || gem.type === 'green') {
            ProgressionManager.getInstance().recordXpGemCollected(1);
          }
          this.damageNumbers.spawnXp(this.player.position, xp, this.engine.camera);

          if (gem.type === 'gold') {
            const buffId = gem.passiveBuffId || getPassiveBuffId(gem.id);
            const toast = this.player.applyPassiveBuff(buffId);
            this.damageNumbers.spawnPassiveBuff(this.player.position, toast, this.engine.camera);
            SoundManager.playBuffExpire();
            this.hud.updatePassivesBar(this.player);
          } else if (gem.type === 'crystal') {
            const count = gem.crystalValue || 1;
            MetaProgression.getInstance().addCrystals(count);
            this.damageNumbers.spawnPassiveBuff(this.player.position, `+${count} 🔮 Кристалл Разлома`, this.engine.camera);
            SoundManager.playItemPickup();
            this.hud.updateCrystalsCounter(MetaProgression.getInstance().getCrystals());
          }

          if (this.net.role === 'client') {
            this.netCoordinator.pendingClientCollectedGems.push(gem.id);
          }
          if (levelsGained > 0) {
            this.damageNumbers.spawnLevelUp(this.player.position, this.player.level, this.engine.camera);
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

    // 12. Multiplayer Network Tick (~25 Hz)
    this.netSendTimer += dt;
    if (this.netSendTimer >= 0.04) {
      this.netSendTimer = 0;
      this.netCoordinator.broadcastNetworkState();
    }
  }

  private updateRendering(rawDt: number, fps: number, alpha: number = 1.0): void {
    this.devManager.updateTelemetry(fps, this.combatDirector.projectiles.length);
    this.hud.updatePerformance(fps, this.player.isCoop ? this.net.ping : undefined);

    if (this.sessionDirector.gameState === GameState.PLAYING) {
      this.player.updateVisuals(alpha);
    }

    this.engine.updateCamera(this.player.renderPosition, rawDt);
    this.projScreenMatrix.multiplyMatrices(this.engine.camera.projectionMatrix, this.engine.camera.matrixWorldInverse);
    this.cameraFrustum.setFromProjectionMatrix(this.projScreenMatrix);

    if (this.sessionDirector.gameState === GameState.PLAYING) {
      this.engine.chunkManager.cull(this.cameraFrustum);
      this.enemyManager.updateVisuals(rawDt, this.cameraFrustum, this.player.renderPosition);
      this.dropManager.updateVisuals(rawDt, this.cameraFrustum);
      this.combatDirector.updateProjectileVisuals(this.cameraFrustum);
      this.engine.altarManager.updateVisuals(rawDt, this.engine.camera, this.cameraFrustum);

      let teammatesKills = 0;
      for (const [id, st] of this.netCoordinator.allPlayerStats) {
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
        this.sessionDirector.gameTime,
        this.enemyManager.activeBoss,
        teammatesKills
      );
      const tpCheck = this.sessionDirector.canTeleportToRift();
      this.hud.updateTeleportButton(tpCheck.canTeleport, tpCheck.reason);
      this.hud.updatePoeParty(
        this.player,
        this.remotePlayers,
        this.net.mySlotId,
        this.player.isCoop ? this.net.role : 'solo',
        this.net.lobbyPlayers
      );

      if (this.sessionDirector.pendingLevelUps > 0 && !this.sessionDirector.isLevelUpActive) {
        this.sessionDirector.triggerLevelUp();
      }
    }

    this.engine.render();

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

  private loop = (): void => {
    this.animFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const frameTimeMs = now - this.lastTime;
    const rawDt = Math.min((now - this.lastTime) / 1000, 0.2);
    const fps = rawDt > 0 ? 1 / rawDt : 60;
    this.lastTime = now;

    const scaledDt = rawDt * this.devManager.timeScale;

    const simStart = performance.now();
    if (this.sessionDirector.gameState === GameState.PLAYING) {
      // Fixed 60 Hz deterministic simulation steps with spiral-of-death clamp
      this.accumulator += scaledDt;
      const MAX_SUB_STEPS = 5;
      let subSteps = 0;
      while (this.accumulator >= Game.FIXED_TIMESTEP && subSteps < MAX_SUB_STEPS) {
        this.updateSimulation(Game.FIXED_TIMESTEP);
        this.accumulator -= Game.FIXED_TIMESTEP;
        subSteps++;
      }
      if (subSteps >= MAX_SUB_STEPS) {
        this.accumulator = 0;
      }
    } else if (this.sessionDirector.gameState === GameState.PAUSED && this.mapManager.isOpen) {
      this.mapManager.update(rawDt);
    }
    const simDuration = performance.now() - simStart;

    const alpha = this.sessionDirector.gameState === GameState.PLAYING
      ? Math.max(0, Math.min(1, this.accumulator / Game.FIXED_TIMESTEP))
      : 1.0;

    const renderStart = performance.now();
    this.updateRendering(rawDt, fps, alpha);
    const renderDuration = performance.now() - renderStart;

    this.simTimeEma = this.simTimeEma === 0 ? simDuration : this.simTimeEma * 0.85 + simDuration * 0.15;
    this.renderTimeEma = this.renderTimeEma === 0 ? renderDuration : this.renderTimeEma * 0.85 + renderDuration * 0.15;
    this.frameTimeEma = this.frameTimeEma === 0 ? frameTimeMs : this.frameTimeEma * 0.85 + frameTimeMs * 0.15;
    this.fpsEma = this.fpsEma === 0 ? fps : this.fpsEma * 0.85 + fps * 0.15;
  };

  private getEntityCounts(): { total: number; visible: number; simulated: number } {
    let total = 0;
    let visible = 0;
    let simulated = 0;

    total += 1;
    simulated += 1;
    if (this.cameraFrustum.containsPoint(this.player.position)) {
      visible += 1;
    }

    for (const remote of this.remotePlayers.values()) {
      total += 1;
      simulated += 1;
      if (this.cameraFrustum.containsPoint(remote.position)) {
        visible += 1;
      }
    }

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

    const projs = this.combatDirector.projectiles;
    for (let i = 0; i < projs.length; i++) {
      const p = projs[i];
      if (!p.isAlive) continue;
      total += 1;
      simulated += 1;
      if (p.mesh.visible) {
        visible += 1;
      }
    }

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

  public destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
    this.engine.detachRenderer();
    disposeReactUI();
    SoundManager.stopAll();
  }
}

const gameInstance = new Game();

// Vite Hot Module Replacement (HMR) clean teardown
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    gameInstance.destroy();
  });
}
