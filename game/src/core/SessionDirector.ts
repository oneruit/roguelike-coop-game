import { Vector3 } from 'three';
import { Engine } from './Engine';
import { Player, CharacterType } from '../entities/Player';
import { EnemyManager } from '../entities/EnemyManager';
import { DropManager } from '../drops/DropManager';
import { DamageNumberManager } from '../combat/DamageNumberManager';
import { HUD, DetailedPlayerResult } from '../ui/HUD';
import { DevManager } from '../ui/DevManager';
import { MapManager } from '../ui/MapManager';
import {
  NetworkManager,
  PlayerStats,
  PLAYER_COLORS,
  AVAILABLE_SLOT_IDS,
  getPlayerSlotDisplayName
} from '../net/NetworkManager';
import { RemotePlayer } from '../entities/RemotePlayer';
import { BiomeManager } from '../world/BiomeManager';
import { ChestManager } from '../world/ChestManager';
import { RiftTeleporter } from '../world/RiftTeleporter';
import { ProgressionManager } from './ProgressionManager';
import { BattlePassManager } from './BattlePassManager';
import { SoundManager } from './SoundManager';
import { SeededRNG } from './SeededRNG';
import { UpdateNotificationUI } from '../ui/UpdateNotificationUI';
import { AssetPreloader } from './AssetPreloader';
import { CombatDirector } from '../combat/CombatDirector';
import { GameNetworkCoordinator } from '../net/GameNetworkCoordinator';
import { LobbyCoordinator } from '../net/LobbyCoordinator';

export enum GameState {
  MAIN_MENU,
  HOST_LOBBY,
  JOIN_LOBBY,
  CHARACTER_SELECT,
  PLAYING,
  PAUSED,
  LEVEL_UP,
  GAME_OVER
}

export const SPAWN_OFFSETS: Record<string, [number, number]> = {
  p1: [0, 0],
  host: [0, 0],
  p2: [2.5, 0.5],
  p3: [-2.5, 0.5],
  p4: [1.5, 2.0],
  p5: [-1.5, 2.0]
};

export class SessionDirector {
  private engine: Engine;
  private player: Player;
  private enemyManager: EnemyManager;
  private dropManager: DropManager;
  private damageNumbers: DamageNumberManager;
  private hud: HUD;
  private devManager: DevManager;
  private mapManager: MapManager;
  private net: NetworkManager;
  private biomeManager: BiomeManager;
  private chestManager: ChestManager;
  private riftTeleporter: RiftTeleporter;
  private updateUI: UpdateNotificationUI;
  private combatDirector: CombatDirector;
  private netCoordinator: GameNetworkCoordinator;
  public lobbyCoordinator?: LobbyCoordinator;
  private remotePlayers: Map<string, RemotePlayer>;

  public gameState: GameState = GameState.MAIN_MENU;
  public gameTime = 0;
  public currentSeed: number | string = 1337;
  public isTrainingMode = false;
  public pendingLevelUps = 0;
  public isLevelUpActive = false;
  public lastTime = performance.now();

  constructor(
    engine: Engine,
    player: Player,
    enemyManager: EnemyManager,
    dropManager: DropManager,
    damageNumbers: DamageNumberManager,
    hud: HUD,
    devManager: DevManager,
    mapManager: MapManager,
    net: NetworkManager,
    biomeManager: BiomeManager,
    chestManager: ChestManager,
    riftTeleporter: RiftTeleporter,
    updateUI: UpdateNotificationUI,
    combatDirector: CombatDirector,
    netCoordinator: GameNetworkCoordinator,
    remotePlayers: Map<string, RemotePlayer>
  ) {
    this.engine = engine;
    this.player = player;
    this.enemyManager = enemyManager;
    this.dropManager = dropManager;
    this.damageNumbers = damageNumbers;
    this.hud = hud;
    this.devManager = devManager;
    this.mapManager = mapManager;
    this.net = net;
    this.biomeManager = biomeManager;
    this.chestManager = chestManager;
    this.riftTeleporter = riftTeleporter;
    this.updateUI = updateUI;
    this.combatDirector = combatDirector;
    this.netCoordinator = netCoordinator;
    this.remotePlayers = remotePlayers;

    this.wireCoordinatorCallbacks();
  }

  private wireCoordinatorCallbacks(): void {
    this.netCoordinator.onStageTransition = (stage, biomeName) => {
      this.applyStageTransition(stage, biomeName);
    };
    this.netCoordinator.onGameOver = (isVictory) => {
      this.triggerGameOver(isVictory);
    };
    this.netCoordinator.onReturnToMainMenu = () => {
      this.returnToMainMenu();
    };
    this.netCoordinator.onStartCoopGameAsClient = (seed) => {
      this.startCoopGameAsClient(seed);
    };
    this.netCoordinator.onLevelUpTrigger = (count) => {
      this.pendingLevelUps += count;
      this.triggerLevelUp();
    };
    this.netCoordinator.onWarpRequested = () => {
      this.warpToNextStage();
    };
  }

  public toggleDevMode(): void {
    if (!this.isTrainingMode) {
      return;
    }
    if (this.net.role === 'client') {
      return;
    }
    this.devManager.toggle();
  }

  public startSinglePlayerWithHero(
    charType: CharacterType,
    seedInput?: string,
    isTrainingMode: boolean = false,
    timeOfDayOption: 'random' | 'day' | 'night' = 'random'
  ): void {
    try {
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
      this.netCoordinator.syncMapManagerPartners();
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
    } catch (err) {
      console.error('[SessionDirector] Failed to start single player game:', err);
    }
  }

  public startCoopGameAsHost(seedInput?: string): void {
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
      const remote = this.netCoordinator.createRemotePlayer(p.id, getPlayerSlotDisplayName(p.id, false), hero, color);
      const ey = this.engine.chunkManager.getElevation(offset[0], offset[1]);
      remote.position.set(offset[0], ey, offset[1]);
      this.remotePlayers.set(p.id, remote);
    }

    this.enemyManager.activePlayerCount = Math.max(1, this.net.lobbyPlayers.length);
    this.netCoordinator.syncMapManagerPartners();
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

    this.restartGame(new Vector3(0, 0, 0), true);

    const numericSeed = typeof this.currentSeed === 'number'
      ? this.currentSeed
      : SeededRNG.hashString(this.currentSeed.toString());

    // Notify all guests to start with identical seed
    this.net.startGame(numericSeed);
  }

  public startCoopGameAsClient(seed?: number): void {
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
      const remote = this.netCoordinator.createRemotePlayer(p.id, getPlayerSlotDisplayName(p.id, false), hero, color);
      const ey = this.engine.chunkManager.getElevation(offset[0], offset[1]);
      remote.position.set(offset[0], ey, offset[1]);
      this.remotePlayers.set(p.id, remote);
    }

    this.enemyManager.activePlayerCount = Math.max(1, this.net.lobbyPlayers.length);
    this.netCoordinator.syncMapManagerPartners();
    this.hud.updateTeammates(this.remotePlayers);

    const myOffset = spawnOffsets[this.net.mySlotId] || [2.5, 0.5];
    const mySlot = this.net.mySlotId || 'p2';
    this.player.displayName = getPlayerSlotDisplayName(mySlot, true);
    this.player.colorCss = PLAYER_COLORS[mySlot]?.css || '#06b6d4';
    this.player.isCoop = true;
    this.player.redrawOverhead();
    this.hud.setCoopBadge(this.net.roomCode);

    this.currentSeed = seed ?? 1337;
    this.restartGame(new Vector3(myOffset[0], 0, myOffset[1]), true);
  }

  public returnToMainMenu(): void {
    this.lobbyCoordinator?.stopRoomPolling();
    this.net.reset();
    for (const rp of this.remotePlayers.values()) {
      rp.destroy(this.engine.scene);
    }
    this.remotePlayers.clear();
    this.netCoordinator.syncMapManagerPartners();
    this.hud.clearTeammates();
    this.hud.hidePartnerHp();
    this.hud.setCoopBadge(null);
    this.player.isCoop = false;

    this.combatDirector.clear();
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
    this.netCoordinator.allPlayerStats.clear();
    this.combatDirector.recentlyDeadEnemyIds.clear();
    this.netCoordinator.pendingDamageToClients.clear();
    this.pendingLevelUps = 0;
    this.isLevelUpActive = false;
    this.hud.resetBossUI();
    this.gameState = GameState.MAIN_MENU;
    this.updateUI.onRunEnded();
    this.hud.showMainMenu();
  }

  public resumeGame(): void {
    if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      this.hud.hidePause();
      this.lastTime = performance.now();
    }
  }

  public triggerLevelUp(): void {
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

  public restartGame(pos?: Vector3, keepSeed: boolean = false): void {
    try {
      this.combatDirector.clear();
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
      const initialPos = pos || new Vector3(myOffset[0], spawnY, myOffset[1]);

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
      this.netCoordinator.allPlayerStats.clear();
      this.netCoordinator.partnerReviveTimers.clear();
      this.combatDirector.recentlyDeadEnemyIds.clear();
      this.netCoordinator.pendingDamageToClients.clear();
      this.pendingLevelUps = 0;
      this.isLevelUpActive = false;
      this.hud.resetBossUI();
      this.gameTime = 0;
      this.gameState = GameState.PLAYING;
      this.updateUI.setCombatActive(true);
      this.lastTime = performance.now();
    } catch (err) {
      console.error('[SessionDirector] Error restarting game:', err);
    }
  }

  public handleInteract(): void {
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
            this.netCoordinator.pendingNetworkEvents.push({
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
        ProgressionManager.getInstance().recordResourceGather(1);
        this.player.addRiftItem(item);
        SoundManager.playChestOpen();
        this.damageNumbers.spawnDamage(chestData.chest.position, 0, true, this.engine.camera);
        this.hud.triggerAltarNotification(item.name, item.description, item.icon, item.color);

        if (this.net.role === 'client') {
          this.net.notifyChestOpened(chestData.chest.id, item.id);
        } else if (this.net.role === 'host') {
          this.netCoordinator.pendingNetworkEvents.push({
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

  public warpToNextStage(): void {
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
    AssetPreloader.showMapLoadingProgress(`ПЕРЕХОД: ${nextBiome.name.toUpperCase()}`);
    this.engine.chunkManager.generateMap(stageSeed, this.chestManager, this.riftTeleporter, this.biomeManager.stageNumber);
    this.mapManager.setSeed(stageSeed);
    this.mapManager.clear();

    // Reposition host player to start on ground elevation
    const spawnY = this.engine.chunkManager.getElevation(0, 0);
    this.player.position.set(0, spawnY, 0);
    this.player.mesh.position.set(0, spawnY, 0);

    // Revive all downed squad members & reset Chronos Phylactery once-per-stage lethal protection
    this.player.hasChronosReady = true;
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
      this.netCoordinator.pendingNetworkEvents.push({
        type: 'stage_warp',
        stage: this.biomeManager.stageNumber,
        biomeName: nextBiome.name
      });
    }
  }

  public applyStageTransition(stageNumber: number, biomeName?: string): void {
    const nextBiome = this.biomeManager.setStage(stageNumber);
    this.biomeManager.applyBiomeToScene(this.engine.scene, this.engine.timeOfDay);
    this.enemyManager.currentStage = stageNumber;
    this.hud.updateStageText(stageNumber, biomeName || nextBiome.name);

    const numBase = typeof this.currentSeed === 'number'
      ? this.currentSeed
      : SeededRNG.hashString(this.currentSeed.toString());
    const stageSeed = numBase + stageNumber * 10007;
    AssetPreloader.showMapLoadingProgress(`ПЕРЕХОД: ${(biomeName || nextBiome.name).toUpperCase()}`);
    this.engine.chunkManager.generateMap(stageSeed, undefined, this.riftTeleporter, stageNumber);
    this.mapManager.setSeed(stageSeed);
    this.mapManager.clear();

    // Reposition client player to start on ground elevation
    const myOffset = SPAWN_OFFSETS[this.net.mySlotId] || [2.5, 0.5];
    const spawnY = this.engine.chunkManager.getElevation(myOffset[0], myOffset[1]);
    this.player.position.set(myOffset[0], spawnY, myOffset[1]);
    this.player.mesh.position.set(myOffset[0], spawnY, myOffset[1]);

    this.player.hasChronosReady = true;
    if (this.player.isDowned) {
      this.player.revive(0.5);
    }

    SoundManager.playTeleporterComplete();
    this.hud.triggerAltarNotification(`ЭТАП ${stageNumber}`, biomeName || nextBiome.name, '🌀', '#38bdf8');
  }

  public triggerGameOver(isVictory: boolean = false): void {
    this.gameState = GameState.GAME_OVER;
    this.updateUI.onRunEnded();
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

    const bpResult = BattlePassManager.getInstance().addPointsForSurvival(this.gameTime);

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
      const stats = this.netCoordinator.allPlayerStats.get(id) || {
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

    this.hud.showGameOver(timeStr, myStats, null, this.player.isCoop, isVictory, this.player.weapons, allPlayersResults, bpResult);
  }
}
