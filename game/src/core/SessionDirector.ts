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
import { RIFT_ITEMS, type RiftItemDef, type RiftItemId } from '../items/RiftItemSystem';
import { getPassiveBuffId } from '../drops/PassiveBuffs';
import { MerchantManager } from '../world/MerchantManager';
import { FireRingWeapon } from '../combat/weapons/MagicWeapons';
import { SulfurSmokeManager } from '../vfx/SulfurSmokeVfx';
import { MetaProgression } from '../meta/MetaProgression';
import { LeaderboardManager } from './LeaderboardManager';
import { RunSaveManager, type SavedWeaponData, type SavedRunData } from './RunSaveManager';
import { createWeaponInstanceById } from '../combat/WeaponFactory';

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
  public merchantManager: MerchantManager;

  public gameState: GameState = GameState.MAIN_MENU;
  public gameTime = 0;
  public currentSeed: number | string = 1337;
  public isTrainingMode = false;
  public devPausedGame = false;
  public pendingLevelUps = 0;
  public isLevelUpActive = false;
  private isChestChoiceActive = false;
  private rewardChoiceVersion = 0;

  public get isRewardChoiceActive(): boolean {
    return this.isLevelUpActive || this.isChestChoiceActive;
  }
  public isWarping = false;
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
    remotePlayers: Map<string, RemotePlayer>,
    merchantManager: MerchantManager
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
    this.merchantManager = merchantManager;

    this.player.onLevelGained = (levels: number) => {
      this.pendingLevelUps += levels;
      if (!this.isWarping && !this.isRewardChoiceActive && this.gameState === GameState.PLAYING) {
        this.triggerLevelUp();
      }
    };

    this.devManager.onTogglePause = () => {
      if (this.gameState === GameState.PAUSED) {
        this.gameState = GameState.PLAYING;
        this.devPausedGame = false;
        this.lastTime = performance.now();
        return false;
      } else if (this.gameState === GameState.PLAYING) {
        this.gameState = GameState.PAUSED;
        this.devPausedGame = true;
        return true;
      }
      return false;
    };

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
    const isOpen = this.devManager.toggle();
    if (isOpen) {
      if (this.gameState === GameState.PLAYING) {
        this.gameState = GameState.PAUSED;
        this.devPausedGame = true;
      }
      this.devManager.setPauseState(true);
    } else {
      if (this.devPausedGame && this.gameState === GameState.PAUSED) {
        this.gameState = GameState.PLAYING;
        this.devPausedGame = false;
        this.lastTime = performance.now();
      }
      this.devManager.setPauseState(false);
    }
  }

  public startSinglePlayerWithHero(
    charType: CharacterType,
    seedInput?: string,
    isTrainingMode: boolean = false,
    timeOfDayOption: 'random' | 'day' | 'night' = 'random'
  ): void {
    try {
      document.body.classList.remove('is-main-menu');
      document.body.classList.add('is-in-game');
      this.hud.closeAllPreGameModals();
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
      ProgressionManager.getInstance().recordHeroPlayed(charType);
      this.player.redrawOverhead();
      this.hud.setCoopBadge(null);
      this.hud.clearTeammates();
      this.hud.hidePartnerHp();

      if (seedInput && seedInput.trim().length > 0) {
        const trimmed = seedInput.trim();
        const parsed = parseInt(trimmed, 10);
        this.currentSeed = (!isNaN(parsed) && parsed.toString() === trimmed) ? (parsed >>> 0) : trimmed;
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
    document.body.classList.remove('is-main-menu');
    document.body.classList.add('is-in-game');
    this.hud.closeAllPreGameModals();

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
    ProgressionManager.getInstance().recordHeroPlayed(this.player.charType);

    const numericSeed = typeof this.currentSeed === 'number'
      ? this.currentSeed
      : SeededRNG.hashString(this.currentSeed.toString());

    // Notify all guests to start with identical seed
    this.net.startGame(numericSeed);
  }

  public startCoopGameAsClient(seed?: number): void {
    document.body.classList.remove('is-main-menu');
    document.body.classList.add('is-in-game');
    this.hud.closeAllPreGameModals();

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
    ProgressionManager.getInstance().recordHeroPlayed(this.player.charType);
  }

  public surrenderGame(): void {
    if (this.gameState !== GameState.PLAYING && this.gameState !== GameState.PAUSED && this.gameState !== GameState.LEVEL_UP) {
      return;
    }
    this.hud.hidePause();
    this.triggerGameOver(false);
  }

  public returnToMainMenu(): void {
    if ((this.gameState === GameState.PLAYING || this.gameState === GameState.PAUSED || this.gameState === GameState.LEVEL_UP) && this.gameTime > 5) {
      LeaderboardManager.submitScore({
        heroId: this.player.charType,
        stage: this.biomeManager.stageNumber,
        survivalTimeSec: this.gameTime,
        kills: this.player.kills,
        credits: this.player.credits,
        isVictory: false
      }).catch(err => console.warn('[SessionDirector] Leaderboard submit on exit error:', err));
    }
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
    this.merchantManager.reset();

    this.player.reset();
    this.devManager.reset();
    this.devPausedGame = false;
    this.player.isGodMode = false;
    this.player.isSpeedCheat = false;
    this.player.isOneHitKill = false;
    this.player.recalculateStats();
    this.netCoordinator.allPlayerStats.clear();
    this.combatDirector.recentlyDeadEnemyIds.clear();
    this.netCoordinator.pendingDamageToClients.clear();
    this.resetRewardChoices();
    this.hud.resetBossUI();
    this.hud.resetSessionHUD();
    this.gameTime = 0;
    this.isTrainingMode = false;
    ProgressionManager.getInstance().isTrainingMode = false;
    this.hud.setTrainingModeActive(false);
    this.gameState = GameState.MAIN_MENU;
    this.hud?.setInGameHUDVisible?.(false);
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

  private resetRewardChoices(): void {
    this.rewardChoiceVersion++;
    this.pendingLevelUps = 0;
    this.isLevelUpActive = false;
    this.isChestChoiceActive = false;
    this.hud.resetLevelUpState();
    this.hud.hideMerchant?.();
  }

  private finishRewardChoice(): void {
    if (this.isRewardChoiceActive) return;
    if (this.pendingLevelUps > 0) {
      this.triggerLevelUp();
    } else if (!this.player.isCoop && this.gameState === GameState.LEVEL_UP) {
      this.gameState = GameState.PLAYING;
      this.lastTime = performance.now();
    }
  }

  public triggerLevelUp(): void {
    if (this.isRewardChoiceActive || this.isWarping || this.pendingLevelUps <= 0) return;
    if (this.gameState !== GameState.PLAYING && this.gameState !== GameState.LEVEL_UP) return;

    this.pendingLevelUps--;
    this.isLevelUpActive = true;
    const version = this.rewardChoiceVersion;
    let completed = false;

    if (this.player.isCoop) {
      // Keep the shared world running while this player chooses an upgrade.
      this.player.addBuff({
        type: 'invulnerable',
        name: 'Щит выбора',
        icon: 'DEF',
        color: '#f59e0b',
        duration: 7.0,
        maxDuration: 7.0,
        value: 1
      });
    } else {
      this.gameState = GameState.LEVEL_UP;
    }

    this.hud.showLevelUp(this.player, () => {
      if (completed || version !== this.rewardChoiceVersion) return;
      completed = true;
      this.isLevelUpActive = false;
      this.finishRewardChoice();
    });
  }

  public restartGame(pos?: Vector3, keepSeed: boolean = false): void {
    try {
      FireRingWeapon.destroyAll(this.engine.scene);
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
      const numericSeed = typeof this.currentSeed === 'number' ? this.currentSeed : SeededRNG.hashString(String(this.currentSeed));
      this.biomeManager.reset(numericSeed);
      this.enemyManager.resetStageTime();
      this.biomeManager.applyBiomeToScene(this.engine.scene, this.engine.timeOfDay);

      if (this.net.role !== 'client') {
        this.engine.chunkManager.generateMap(this.currentSeed, this.chestManager, this.riftTeleporter, 1, this.biomeManager.currentBiome.id);
      } else {
        this.engine.chunkManager.generateMap(this.currentSeed, undefined, this.riftTeleporter, 1, this.biomeManager.currentBiome.id);
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
      this.chestManager.chronosDroppedInCurrentBiome = false;
      this.player.recalculateStats();
      this.enemyManager.currentStage = 1;
      this.hud.updateStageText(1, this.biomeManager.currentBiome.name);

      this.mapManager.setSeed(this.currentSeed);
      this.mapManager.clear();
      this.mapManager.close();
      this.netCoordinator.allPlayerStats.clear();
      this.netCoordinator.partnerReviveTimers.clear();
      this.combatDirector.recentlyDeadEnemyIds.clear();
      this.netCoordinator.pendingDamageToClients.clear();
      this.resetRewardChoices();
      this.hud.resetBossUI();
      this.merchantManager.reset();
      this.gameTime = 0;
      ProgressionManager.getInstance()?.resetRunSessionProgress?.();
      this.gameState = GameState.PLAYING;
      this.hud?.clearMenuStack?.();
      this.hud?.setInGameHUDVisible?.(true);
      this.updateUI.setCombatActive(true);
      this.lastTime = performance.now();
    } catch (err) {
      console.error('[SessionDirector] Error restarting game:', err);
    }
  }

  public handleInteract(): void {
    if (this.gameState !== GameState.PLAYING || this.isRewardChoiceActive || !this.player.isAlive || this.player.isDowned) {
      return;
    }

    // 0. Check Merchant interaction
    const merchantInteraction = this.merchantManager.getInteraction(this.player.position);
    if (merchantInteraction.canInteract) {
      if (!this.player.isCoop) {
        this.gameState = GameState.PAUSED;
      } else {
        this.player.addBuff({
          type: 'invulnerable',
          name: 'Щит торговли',
          icon: 'DEF',
          color: '#f59e0b',
          duration: 10.0,
          maxDuration: 10.0,
          value: 1.0
        });
      }
      this.hud.showMerchant(this.merchantManager, this.player);
      return;
    }

    // 1. Check Teleporter interaction
    const teleInteraction = this.riftTeleporter.getInteraction(this.player.position);
    if (teleInteraction.canInteract && teleInteraction.action) {
      if (teleInteraction.action === 'activate') {
        this.activateRift();
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
        const items = this.chestManager.openChest(
          chestData.chest,
          this.biomeManager.stageNumber,
          (id) => this.player.isStatMaxedForItem(id)
        );
        SoundManager.playChestOpen();
        this.damageNumbers.spawnDamage(chestData.chest.position, 0, true, this.engine.camera);

        const isForest = this.biomeManager?.currentBiome?.id === 'bioluminescent_wilds';
        const isGoldChest = chestData.chest?.tier === 'large' || chestData.chest?.tier === 'legendary';
        if (isForest && isGoldChest) {
          ProgressionManager.getInstance()?.recordForestGoldenChestOpened?.();
        }

        // Global magnet pull for all XP gems & passive crystals on map
        this.dropManager.attractAllGemsTo(this.player.position);

        // Reserve the reward screen before XP can enqueue a level-up.
        this.isChestChoiceActive = true;
        const version = this.rewardChoiceVersion;
        let completed = false;
        if (!this.player.isCoop) this.gameState = GameState.LEVEL_UP;

        // Bonus XP cache from chest
        const bonusXp = 20 + this.biomeManager.stageNumber * 10;
        this.player.gainXp(bonusXp);

        // Protective safety shockwave: knock back nearby monsters
        for (const enemy of this.enemyManager.enemies) {
          if (!enemy.isAlive) continue;
          const dSq = enemy.position.distanceToSquared(this.player.position);
          if (dSq < 144) {
            const diff = enemy.position.clone().sub(this.player.position);
            diff.y = 0;
            const dist = diff.length();
            if (dist > 0.1) {
              diff.normalize().multiplyScalar(4.0);
              enemy.position.add(diff);
            }
          }
        }

        const onChosen = (chosenItem: RiftItemDef) => {
          if (completed || version !== this.rewardChoiceVersion) return;
          completed = true;
          ProgressionManager.getInstance().recordResourceGather(1);
          this.player.addRiftItem(chosenItem);
          ProgressionManager.getInstance()?.recordSimultaneousPassives?.(this.player?.riftItems?.size ?? 0);
          this.hud.triggerAltarNotification(chosenItem.name, chosenItem.description, chosenItem.icon, chosenItem.color);

          if (this.net.role === 'client') {
            this.net.notifyChestOpened(chestData.chest.id, chosenItem.id);
          } else if (this.net.role === 'host') {
            this.netCoordinator.pendingNetworkEvents.push({
              type: 'chest_opened',
              chestId: chestData.chest.id,
              playerId: 'p1',
              name: chosenItem.name,
              icon: chosenItem.icon,
              color: chosenItem.color
            });
          }

          this.isChestChoiceActive = false;
          this.finishRewardChoice();
        };

        if (this.player.isCoop) {
          this.player.addBuff({
            type: 'invulnerable',
            name: 'Щит выбора',
            icon: 'DEF',
            color: '#f59e0b',
            duration: 8.0,
            maxDuration: 8.0,
            value: 1
          });
        }
        this.hud.showChestChoice(items, this.player, onChosen);
      } else {
        SoundManager.playHit();
      }
    }
  }

  /**
   * Activates the dimensional rift: summons the stage boss directly from the rift
   * and opens the portal into its luminous radiant state.
   */
  public activateRift(): boolean {
    if (this.riftTeleporter.state !== 'IDLE') return false;
    const activated = this.riftTeleporter.activate();
    if (activated) {
      SoundManager.playTeleporterActivate();
      // Boss emerges directly from the dimensional rift!
      this.enemyManager.spawnTeleporterBoss(this.riftTeleporter.position, this.biomeManager.stageNumber);
      this.hud.triggerBossWarning('ХРАНИТЕЛЬ РАЗЛОМА', this.biomeManager.stageNumber);
      if (this.net.role === 'host') {
        this.netCoordinator.pendingNetworkEvents.push({
          type: 'teleporter_activated' as any,
          stage: this.biomeManager.stageNumber
        } as any);
      }
      return true;
    }
    return false;
  }

  public warpToNextStage(): void {
    if (this.isWarping) return;
    this.isWarping = true;
    this.merchantManager.reset();

    // 1. Sulfur Smoke Disappearance Animation at current player position
    const originPos = this.player.position.clone();
    SulfurSmokeManager.spawn(this.engine.scene, originPos, {
      onVanish: () => {
        this.player.mesh.visible = false;
      }
    });

    for (const remote of this.remotePlayers.values()) {
      SulfurSmokeManager.spawn(this.engine.scene, remote.position.clone(), {
        onVanish: () => {
          remote.mesh.visible = false;
        }
      });
    }

    // Delay stage transition slightly so brimstone smoke eruption & vanish is fully seen
    setTimeout(() => {
      // Collect all remaining experience and passives from gems on the map before warp
      const sweptXp = this.dropManager.collectAllRemainingGems((xp, gem) => {
        ProgressionManager.getInstance().addAccountXp(Math.max(1, Math.round(xp * 0.25)));
        if (gem.type === 'gold') {
          const buffId = gem.passiveBuffId || getPassiveBuffId(gem.id);
          const toast = this.player.applyPassiveBuff(buffId);
          this.damageNumbers.spawnPassiveBuff(this.player.position, toast, this.engine.camera);
          this.hud.updatePassivesBar(this.player);
        } else if (gem.type === 'crystal') {
          const count = gem.crystalValue || 1;
          MetaProgression.getInstance().addCrystals(count);
          this.damageNumbers.spawnPassiveBuff(this.player.position, `+${count} 🔮 Кристалл Разлома`, this.engine.camera);
        }
      });
      if (sweptXp > 0) {
        this.player.gainXp(sweptXp);
      }

      const nextBiome = this.biomeManager.advanceStage();
      this.biomeManager.applyBiomeToScene(this.engine.scene, this.engine.timeOfDay);
      this.enemyManager.currentStage = this.biomeManager.stageNumber;
      this.enemyManager.resetStageTime();
      this.hud.updateStageText(this.biomeManager.stageNumber, nextBiome.name);

      // Derive deterministic stage seed
      const numBase = typeof this.currentSeed === 'number'
        ? this.currentSeed
        : SeededRNG.hashString(this.currentSeed.toString());
      const stageSeed = numBase + this.biomeManager.stageNumber * 10007;

      // Generate fixed 500x500 map, altars, teleporter, and chests for new stage
      AssetPreloader.showMapLoadingProgress(`ПЕРЕХОД: ${nextBiome.name.toUpperCase()}`);
      this.engine.chunkManager.generateMap(stageSeed, this.chestManager, this.riftTeleporter, this.biomeManager.stageNumber, nextBiome.id);
      this.mapManager.setSeed(stageSeed);
      this.mapManager.clear();

      // Reposition host player to start on ground elevation
      const spawnY = this.engine.chunkManager.getElevation(0, 0);
      const spawnPos = new Vector3(0, spawnY, 0);
      this.player.position.copy(spawnPos);
      this.player.mesh.position.copy(spawnPos);

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
        this.netCoordinator.pendingNetworkEvents.push({
          type: 'stage_warp',
          stage: this.biomeManager.stageNumber,
          biomeName: nextBiome.name
        });
      }

      // 2. Sulfur Smoke Reappearance Animation at arrival position
      SulfurSmokeManager.spawn(this.engine.scene, spawnPos, {
        onVanish: () => {
          this.player.mesh.visible = true;
        }
      });

      for (const remote of this.remotePlayers.values()) {
        SulfurSmokeManager.spawn(this.engine.scene, remote.position.clone(), {
          onVanish: () => {
            remote.mesh.visible = true;
          }
        });
      }

      setTimeout(() => {
        this.player.mesh.visible = true;
        for (const remote of this.remotePlayers.values()) {
          remote.mesh.visible = true;
        }
        this.isWarping = false;
        if (this.pendingLevelUps > 0 && !this.isLevelUpActive) {
          this.triggerLevelUp();
        }
      }, 500);
    }, 280);
  }

  public applyStageTransition(stageNumber: number, biomeName?: string): void {
    if (this.isWarping) return;
    this.isWarping = true;
    this.merchantManager.reset();

    // 1. Sulfur Smoke Disappearance Animation at client player position
    const originPos = this.player.position.clone();
    SulfurSmokeManager.spawn(this.engine.scene, originPos, {
      onVanish: () => {
        this.player.mesh.visible = false;
      }
    });

    setTimeout(() => {
      // Collect all remaining experience and passives from gems on the map before warp
      const sweptXp = this.dropManager.collectAllRemainingGems((xp, gem) => {
        ProgressionManager.getInstance().addAccountXp(Math.max(1, Math.round(xp * 0.25)));
        if (gem.type === 'gold') {
          const buffId = gem.passiveBuffId || getPassiveBuffId(gem.id);
          const toast = this.player.applyPassiveBuff(buffId);
          this.damageNumbers.spawnPassiveBuff(this.player.position, toast, this.engine.camera);
          this.hud.updatePassivesBar(this.player);
        } else if (gem.type === 'crystal') {
          const count = gem.crystalValue || 1;
          MetaProgression.getInstance().addCrystals(count);
          this.damageNumbers.spawnPassiveBuff(this.player.position, `+${count} 🔮 Кристалл Разлома`, this.engine.camera);
        }
      });
      if (sweptXp > 0) {
        this.player.gainXp(sweptXp);
      }

      const nextBiome = this.biomeManager.setStage(stageNumber);
      this.biomeManager.applyBiomeToScene(this.engine.scene, this.engine.timeOfDay);
      this.enemyManager.currentStage = stageNumber;
      this.enemyManager.resetStageTime();
      this.hud.updateStageText(stageNumber, biomeName || nextBiome.name);

      const numBase = typeof this.currentSeed === 'number'
        ? this.currentSeed
        : SeededRNG.hashString(this.currentSeed.toString());
      const stageSeed = numBase + stageNumber * 10007;
      AssetPreloader.showMapLoadingProgress(`ПЕРЕХОД: ${(biomeName || nextBiome.name).toUpperCase()}`);
      this.engine.chunkManager.generateMap(stageSeed, undefined, this.riftTeleporter, stageNumber, nextBiome.id);
      this.mapManager.setSeed(stageSeed);
      this.mapManager.clear();

      // Reposition client player to start on ground elevation
      const myOffset = SPAWN_OFFSETS[this.net.mySlotId] || [2.5, 0.5];
      const spawnY = this.engine.chunkManager.getElevation(myOffset[0], myOffset[1]);
      const spawnPos = new Vector3(myOffset[0], spawnY, myOffset[1]);
      this.player.position.copy(spawnPos);
      this.player.mesh.position.copy(spawnPos);

      if (this.player.isDowned) {
        this.player.revive(0.5);
      }

      SoundManager.playTeleporterComplete();
      this.hud.triggerAltarNotification(`ЭТАП ${stageNumber}`, biomeName || nextBiome.name, '🌀', '#38bdf8');

      // 2. Sulfur Smoke Reappearance Animation at client arrival position
      SulfurSmokeManager.spawn(this.engine.scene, spawnPos, {
        onVanish: () => {
          this.player.mesh.visible = true;
        }
      });

      setTimeout(() => {
        this.player.mesh.visible = true;
        this.isWarping = false;
        if (this.pendingLevelUps > 0 && !this.isLevelUpActive) {
          this.triggerLevelUp();
        }
      }, 500);
    }, 280);
  }

  public triggerGameOver(isVictory: boolean = false): void {
    this.resetRewardChoices();
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

    // Clear any saved run since this game session has concluded
    RunSaveManager.clearSavedRun();

    // Automatically submit score to Hall of Fame / Leaderboard & DB
    LeaderboardManager.submitScore({
      heroId: this.player.charType,
      stage: this.biomeManager.stageNumber,
      survivalTimeSec: this.gameTime,
      kills: this.player.kills,
      credits: this.player.credits,
      isVictory
    }).catch(err => console.warn('[SessionDirector] Leaderboard submit error:', err));

    this.hud.showGameOver(timeStr, myStats, null, this.player.isCoop, isVictory, this.player.weapons, allPlayersResults, bpResult);
  }

  /**
   * Checks whether the player is allowed to teleport to the dimensional rift.
   * Teleport is available only after the teleporter is opened (state !== 'IDLE')
   * and provided the player is at least two squares (100 meters) away from it.
   */
  public canTeleportToRift(): { canTeleport: boolean; reason?: string } {
    if (!this.player || !this.player.isAlive || this.gameState !== GameState.PLAYING) {
      return { canTeleport: false, reason: 'Забег не активен' };
    }
    if (!this.riftTeleporter || !this.riftTeleporter.mesh.visible) {
      return { canTeleport: false, reason: 'Разлом недоступен на этом этапе' };
    }
    if (!this.riftTeleporter.isOpened) {
      return { canTeleport: false, reason: 'Разлом еще не открыт (активируйте [E])' };
    }

    const dist = this.player.position.distanceTo(this.riftTeleporter.position);
    const pChunkX = Math.floor(this.player.position.x / 50);
    const pChunkZ = Math.floor(this.player.position.z / 50);
    const rChunkX = Math.floor(this.riftTeleporter.position.x / 50);
    const rChunkZ = Math.floor(this.riftTeleporter.position.z / 50);
    const chunkDist = Math.max(Math.abs(pChunkX - rChunkX), Math.abs(pChunkZ - rChunkZ));

    if (dist < 100 && chunkDist < 2) {
      return { canTeleport: false, reason: `Слишком близко к Разлому (${Math.round(dist)}м / нужно минимум 2 квадрата — 100м)` };
    }

    return { canTeleport: true };
  }

  /**
   * Teleports player instantly to the Rift portal with sulfur smoke effects,
   * granting a 1.5s invulnerability shield and advancing game & stage time by 20s.
   * Available strictly after the rift is opened and when at least 2 squares away.
   */
  public teleportPlayerToRift(): boolean {
    const check = this.canTeleportToRift();
    if (!check.canTeleport) {
      this.hud.triggerAltarNotification('ТЕЛЕПОРТ НЕДОСТУПЕН', check.reason || '', '🔒', '#f87171');
      SoundManager.playHit?.();
      return false;
    }

    // 1. Sulfur smoke departure effect
    const originPos = this.player.position.clone();
    SulfurSmokeManager.spawn(this.engine.scene, originPos);

    // 2. Teleport player near the rift (with 1.8m offset to prevent clipping)
    const targetPos = this.riftTeleporter.position.clone();
    targetPos.x += 1.8;
    targetPos.z += 1.8;
    const elevation = this.engine.chunkManager.getElevation(targetPos.x, targetPos.z);
    targetPos.y = elevation;

    this.player.position.copy(targetPos);
    this.player.mesh.position.copy(targetPos);

    // 3. Sulfur smoke arrival effect
    SulfurSmokeManager.spawn(this.engine.scene, targetPos.clone());
    SoundManager.playTeleporterActivate?.();

    // 4. Fast forward time penalty (+20 seconds)
    const timePenalty = 20;
    this.gameTime += timePenalty;
    if (this.enemyManager) {
      this.enemyManager.gameTime += timePenalty;
      this.enemyManager.stageTime += timePenalty;
    }

    // 5. Grant 1.5s invulnerability buffer
    this.player.addBuff({
      type: 'invulnerable',
      name: 'Мерцание Разлома',
      icon: '🛡️',
      color: '#38bdf8',
      duration: 1.5,
      maxDuration: 1.5,
      value: 1
    });

    // 6. Feedback banner
    this.hud.triggerAltarNotification('ТЕЛЕПОРТАЦИЯ К РАЗЛОМУ', '+20 сек. штрафного времени', '🌀', '#38bdf8');

    return true;
  }

  /**
   * Serializes current run state and returns to Main Menu ("Доиграть позднее").
   */
  public saveCurrentRunAndExit(): boolean {
    if (!this.player || !this.player.isAlive || this.gameState === GameState.GAME_OVER) {
      return false;
    }

    const weaponsData: SavedWeaponData[] = this.player.weapons.map(w => ({
      id: w.id,
      level: w.level,
      awakenedGrade: w.awakenedGrade,
      bonusDamage: w.bonusDamage,
      cooldownBonus: w.cooldownBonus,
      upgradeHistory: [...w.upgradeHistory]
    }));

    const riftItemsRecord: Record<string, number> = {};
    for (const [k, v] of this.player.riftItems.entries()) {
      riftItemsRecord[k] = v;
    }

    let numSeed: number;
    if (typeof this.currentSeed === 'number') {
      numSeed = this.currentSeed;
    } else {
      const trimmed = String(this.currentSeed).trim();
      const parsed = parseInt(trimmed, 10);
      if (!isNaN(parsed) && parsed.toString() === trimmed) {
        numSeed = parsed >>> 0 || 1337;
      } else {
        numSeed = SeededRNG.hashString(trimmed || '1337');
      }
    }

    const runData: SavedRunData = {
      version: 1,
      timestamp: Date.now(),
      heroId: this.player.charType,
      stageNumber: this.biomeManager.stageNumber,
      seed: numSeed,
      playerPosition: {
        x: this.player.position.x,
        y: this.player.position.y,
        z: this.player.position.z
      },
      gameTime: this.gameTime,
      stageTime: this.enemyManager.stageTime,
      kills: this.enemyManager.totalKills,
      credits: this.player.credits,
      playerHp: this.player.hp,
      playerMaxHp: this.player.maxHp,
      playerLevel: this.player.level,
      playerXp: this.player.xp,
      playerXpToNext: this.player.xpToNextLevel,
      passives: {
        mightElixirCount: this.player.mightElixirCount,
        speedBootsCount: (this.player as any).speedBootsCount || 0,
        flaskCount: (this.player as any).flaskCount || 0,
        magnetCount: (this.player as any).magnetCount || 0,
        amuletCount: (this.player as any).amuletCount || 0,
        vestCount: (this.player as any).vestCount || 0,
        watchCount: (this.player as any).watchCount || 0,
        amplifierCount: (this.player as any).amplifierCount || 0
      },
      riftItems: riftItemsRecord,
      weapons: weaponsData
    };

    const saved = RunSaveManager.saveRun(runData);
    if (saved) {
      this.returnToMainMenu();
    }
    return saved;
  }

  /**
   * Resumes a previously saved run from localStorage.
   */
  public resumeSavedRun(): boolean {
    const data = RunSaveManager.loadRun();
    if (!data) return false;

    try {
      this.currentSeed = data.seed;
      this.startSinglePlayerWithHero(data.heroId, String(data.seed), false, 'day');
      this.currentSeed = data.seed;
      this.devManager.setCurrentSeed(this.currentSeed);

      this.gameTime = data.gameTime;
      this.enemyManager.gameTime = data.gameTime;
      this.enemyManager.stageTime = data.stageTime;
      this.enemyManager.totalKills = data.kills;
      this.enemyManager.currentStage = data.stageNumber;
      this.biomeManager.currentStageIndex = Math.max(0, data.stageNumber - 1);

      this.player.level = data.playerLevel;
      this.player.xp = data.playerXp;
      this.player.xpToNextLevel = data.playerXpToNext;
      this.player.credits = data.credits;
      this.player.mightElixirCount = data.passives.mightElixirCount;
      (this.player as any).speedBootsCount = data.passives.speedBootsCount;
      (this.player as any).flaskCount = data.passives.flaskCount;
      (this.player as any).magnetCount = data.passives.magnetCount;
      (this.player as any).amuletCount = data.passives.amuletCount;
      (this.player as any).vestCount = data.passives.vestCount;
      (this.player as any).watchCount = data.passives.watchCount;
      (this.player as any).amplifierCount = data.passives.amplifierCount;

      // Recreate weapons
      this.player.weapons = [];
      for (const wData of data.weapons) {
        const weapon = createWeaponInstanceById(wData.id);
        if (weapon) {
          weapon.level = wData.level;
          weapon.awakenedGrade = wData.awakenedGrade;
          weapon.bonusDamage = wData.bonusDamage;
          weapon.cooldownBonus = wData.cooldownBonus;
          weapon.upgradeHistory = [...wData.upgradeHistory];
          weapon.recalculateStats();
          if (typeof (weapon as any).setAttackCallback === 'function') {
            (weapon as any).setAttackCallback(() => this.player.triggerAttackAnim(0.48, weapon.id));
          }
          this.player.weapons.push(weapon);
        }
      }

      // Recreate rift items
      this.player.riftItems.clear();
      for (const [id, count] of Object.entries(data.riftItems)) {
        const def = RIFT_ITEMS[id as RiftItemId];
        if (def) {
          for (let c = 0; c < count; c++) {
            this.player.addRiftItem(def);
          }
        }
      }

      this.player.recalculateStats();
      this.player.hp = Math.min(this.player.maxHp, data.playerHp);

      const currentBiome = this.biomeManager.currentBiome;
      this.biomeManager.applyBiomeToScene(this.engine.scene, this.engine.timeOfDay);
      this.hud.updateStageText(data.stageNumber, currentBiome.name);

      const numSeed = typeof data.seed === 'number' ? data.seed : parseInt(String(data.seed), 10);
      const stageSeed = data.stageNumber === 1
        ? numSeed
        : numSeed + data.stageNumber * 10007;

      this.engine.chunkManager.generateMap(stageSeed, this.chestManager, this.riftTeleporter, data.stageNumber, currentBiome.id);
      this.mapManager.setSeed(stageSeed);
      this.mapManager.clear();

      if (data.playerPosition) {
        const pPos = new Vector3(data.playerPosition.x, data.playerPosition.y, data.playerPosition.z);
        this.player.position.copy(pPos);
        this.player.prevPosition.copy(pPos);
        this.player.renderPosition.copy(pPos);
        this.player.mesh.position.copy(pPos);
        this.engine.snapCamera(pPos);
      }

      this.hud.updatePassivesBar(this.player);
      this.player.redrawOverhead();

      RunSaveManager.clearSavedRun();

      this.hud.triggerAltarNotification('ЗАБЕГ ВОЗОБНОВЛЕН', `Этап ${data.stageNumber} • ${currentBiome.name}`, '💾', '#38bdf8');
      return true;
    } catch (err) {
      console.error('[SessionDirector] Failed to resume run:', err);
      return false;
    }
  }
}
