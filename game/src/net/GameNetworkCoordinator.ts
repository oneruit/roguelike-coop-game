import { Vector3 } from 'three';
import {
  NetworkManager,
  HostSnapshotMessage,
  ClientSyncMessage,
  PlayerStats,
  NetEvent,
  PlayerNetState,
  PLAYER_COLORS,
  AVAILABLE_SLOT_IDS,
  getPlayerSlotDisplayName
} from './NetworkManager';
import { RemotePlayer } from '../entities/RemotePlayer';
import { Player, CharacterType } from '../entities/Player';
import { EnemyManager } from '../entities/EnemyManager';
import { DropManager } from '../drops/DropManager';
import { ChestManager } from '../world/ChestManager';
import { RiftTeleporter } from '../world/RiftTeleporter';
import { BiomeManager } from '../world/BiomeManager';
import { Engine } from '../core/Engine';
import { HUD } from '../ui/HUD';
import { MapManager } from '../ui/MapManager';
import { DevManager } from '../ui/DevManager';
import { SoundManager } from '../core/SoundManager';
import { ProgressionManager } from '../core/ProgressionManager';
import { ALTAR_CONFIGS } from '../world/Altar';
import { RIFT_ITEMS, RiftItemId } from '../items/RiftItemSystem';
import { CombatDirector } from '../combat/CombatDirector';

export class GameNetworkCoordinator {
  private engine: Engine;
  private player: Player;
  private enemyManager: EnemyManager;
  private dropManager: DropManager;
  private chestManager: ChestManager;
  private riftTeleporter: RiftTeleporter;
  private biomeManager: BiomeManager;
  private hud: HUD;
  private mapManager: MapManager;
  private devManager: DevManager;
  private net: NetworkManager;
  private combatDirector: CombatDirector;

  public remotePlayers: Map<string, RemotePlayer>;
  public partnerReviveTimers: Map<string, number> = new Map();
  public allPlayerStats: Map<string, PlayerStats> = new Map();
  public pendingDamageToClients: Map<string, number> = new Map();
  public pendingNetworkEvents: NetEvent[] = [];
  public pendingClientCollectedGems: string[] = [];

  private lastClientLocalHitTime = 0;
  public gameTime = 0;

  public onStageTransition?: (stage: number, biomeName?: string) => void;
  public onGameOver?: (isVictory: boolean) => void;
  public onReturnToMainMenu?: () => void;
  public onStartCoopGameAsClient?: (seed?: number) => void;
  public onLevelUpTrigger?: (count: number) => void;
  public onWarpRequested?: () => void;

  constructor(
    engine: Engine,
    player: Player,
    enemyManager: EnemyManager,
    dropManager: DropManager,
    chestManager: ChestManager,
    riftTeleporter: RiftTeleporter,
    biomeManager: BiomeManager,
    hud: HUD,
    mapManager: MapManager,
    devManager: DevManager,
    net: NetworkManager,
    combatDirector: CombatDirector,
    remotePlayers: Map<string, RemotePlayer>
  ) {
    this.engine = engine;
    this.player = player;
    this.enemyManager = enemyManager;
    this.dropManager = dropManager;
    this.chestManager = chestManager;
    this.riftTeleporter = riftTeleporter;
    this.biomeManager = biomeManager;
    this.hud = hud;
    this.mapManager = mapManager;
    this.devManager = devManager;
    this.net = net;
    this.combatDirector = combatDirector;
    this.remotePlayers = remotePlayers;

    this.setupNetworkCallbacks();
  }

  public syncMapManagerPartners(): void {
    this.mapManager.partners = Array.from(this.remotePlayers.values());
    this.mapManager.partner = this.mapManager.partners[0] || null;
  }

  public createRemotePlayer(id: string, name: string, hero: CharacterType, color: number | string): RemotePlayer {
    const remote = new RemotePlayer(this.engine.scene, id, name, hero, color);
    remote.getElevation = (x, z) => this.engine.chunkManager.getElevation(x, z);
    return remote;
  }

  private setupNetworkCallbacks(): void {
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
        this.onStartCoopGameAsClient?.(msg?.seed);
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
        this.onWarpRequested?.();
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
      this.onReturnToMainMenu?.();
    };

    this.net.onDevActionReceived = (action, value) => {
      this.handleClientDevAction(action, value);
    };
  }

  public handleHostSnapshot(msg: HostSnapshotMessage): void {
    const playersMap = msg.players || (msg.hostPlayer ? { p1: msg.hostPlayer, host: msg.hostPlayer } : {});

    // Sync all remote players from snapshot
    for (const [id, pState] of Object.entries(playersMap)) {
      if (id === this.net.mySlotId) {
        if (this.player.isDowned && pState.reviveProgress !== undefined) {
          this.player.reviveProgress = pState.reviveProgress;
        }
        continue;
      }
      if (id === 'host') continue;
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

    // Remove stale remotes
    for (const [id, rp] of this.remotePlayers) {
      if (!playersMap[id] || (id !== 'host' && id !== 'p1' && !AVAILABLE_SLOT_IDS.includes(id))) {
        rp.destroy(this.engine.scene);
        this.remotePlayers.delete(id);
        this.syncMapManagerPartners();
      }
    }

    this.gameTime = msg.gameTime;
    if (msg.stage && msg.stage !== this.biomeManager.stageNumber) {
      this.onStageTransition?.(msg.stage);
    }
    this.enemyManager.applySnapshot(msg.enemies, this.combatDirector.recentlyDeadEnemyIds);
    this.dropManager.applySnapshot(msg.drops);
    if (msg.chests) {
      this.chestManager.applySnapshot(msg.chests);
    }
    if (msg.teleporter) {
      this.riftTeleporter.applySnapshot(msg.teleporter);
    }
    this.enemyManager.totalKills = msg.totalKills;

    // Boss sync
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
        this.onStageTransition?.(event.stage, event.biomeName);
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
      } else if (event.type === 'spell_control' && event.enemyId && event.control) {
        if (event.killer !== this.net.mySlotId) {
          this.enemyManager.enemies.find(enemy => enemy.id === event.enemyId)?.applySpellControl(event.control);
        }
      } else if (event.type === 'shot' && event.shot) {
        if (event.shot.ownerId !== this.net.mySlotId) {
          this.combatDirector.spawnCosmeticShot(event.shot);
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
          this.onGameOver?.(isVictoryDeath);
        }
      }
    }

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

  public handleClientSync(msg: ClientSyncMessage): void {
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

    if (msg.shots && msg.shots.length > 0) {
      for (const shot of msg.shots) {
        this.combatDirector.spawnCosmeticShot(shot);
        this.pendingNetworkEvents.push({
          type: 'shot',
          shot
        });
      }
    }

    for (const hit of msg.damageDealt) {
      if (hit.control) {
        this.enemyManager.enemies.find(enemy => enemy.id === hit.enemyId)?.applySpellControl(hit.control);
        this.pendingNetworkEvents.push({type:'spell_control',enemyId:hit.enemyId,control:hit.control,killer:clientId});
      }
      if (!Number.isFinite(hit.damage) || hit.damage <= 0) continue;
      const st = this.allPlayerStats.get(clientId);
      if (st) st.damageDealt += hit.damage;
      this.enemyManager.applyRemoteDamage(
        hit.enemyId,
        hit.damage,
        new Vector3(hit.sourceX, 0, hit.sourceZ),
        this.engine.camera,
        clientId
      );
    }

    for (const gemId of msg.collectedGemIds) {
      const g = this.dropManager.gems.find((gem) => gem.id === gemId);
      if (g) {
        g.destroy(this.engine.scene);
        const idx = this.dropManager.gems.indexOf(g);
        if (idx !== -1) this.dropManager.gems.splice(idx, 1);
      }
    }

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

  public broadcastNetworkState(): void {
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

      this.pendingNetworkEvents.push(...this.combatDirector.pendingSpellControls.splice(0));
      if (this.combatDirector.pendingLocalShots.length > 0) {
        for (const shot of this.combatDirector.pendingLocalShots.splice(0)) {
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
        damageDealt: [...this.combatDirector.pendingClientHits],
        collectedGemIds: [...this.pendingClientCollectedGems],
        shots: this.combatDirector.pendingLocalShots.splice(0),
        isRevivingPartner: isReviving,
        revivingTargetId,
        reviveProgress: highestReviveProgress
      };
      this.combatDirector.pendingClientHits = [];
      this.pendingClientCollectedGems = [];
      this.net.send(sync);
    }
  }

  public handleHostDevAction(action: string, value?: any): void {
    if (this.net.role !== 'host') return;

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

    this.net.send({ type: 'DEV_ACTION', action, value });
  }

  public handleClientDevAction(action: string, value?: any): void {
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
        this.onLevelUpTrigger?.(value || 1);
        break;
      case 'xp_1000':
        if (typeof value === 'number' && value > 0) {
          const lvls = this.player.gainXp(value);
          if (lvls > 0) {
            this.onLevelUpTrigger?.(lvls);
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

  public updateRevives(dt: number): void {
    // 1. Update Remote Teammates animations/states
    for (const remote of this.remotePlayers.values()) {
      remote.update(dt);
    }

    // 2. Co-op Revive Proximity Check (allows reviving any downed teammate within 3.5m)
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

    // 3. Host Authoritative Revive Check (ensures host-downed and client-to-client revives work even under lag)
    if (this.net.role === 'host') {
      // 3a. If host player is downed, check if any alive remote player is reviving host
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

      // 3b. Check client-to-client revives on host
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
  }

  public isTeamWiped(): boolean {
    if (!this.player.isCoop) return false;
    if (!this.player.isDowned) return false;
    for (const remote of this.remotePlayers.values()) {
      if (!remote.isDowned) return false;
    }
    return true;
  }
}

