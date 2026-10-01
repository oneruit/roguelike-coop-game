import { Peer, type DataConnection } from 'peerjs';
import { CharacterType, HeroAnimState, BuffType } from '../entities/Player';
import { SpriteDirection } from '../core/TextureManager';
import { EnemyType } from '../entities/Enemy';
import { GemType } from '../drops/Gem';
import { packHostSnapshot, unpackHostSnapshot, isBinarySnapshot } from './BinarySnapshot';

const PEERJS_HOST = import.meta.env.VITE_PEERJS_HOST || undefined;
const PEERJS_PORT = import.meta.env.VITE_PEERJS_PORT ? Number(import.meta.env.VITE_PEERJS_PORT) : undefined;
const PEERJS_PATH = import.meta.env.VITE_PEERJS_PATH || undefined;
const PEERJS_KEY = import.meta.env.VITE_PEERJS_KEY || undefined;

const TURN_HOST = import.meta.env.VITE_TURN_HOST || '';
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME || '';
const TURN_PASSWORD = import.meta.env.VITE_TURN_PASSWORD || '';


export type NetRole = 'solo' | 'host' | 'client';

export interface EnemySnapshot {
  id: string;
  type: EnemyType;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  dir: SpriteDirection;
  isImmortal?: boolean;
}

export interface DropSnapshot {
  id: string;
  type: GemType;
  x: number;
  z: number;
}

export interface PlayerStats {
  kills: number;
  damageDealt: number;
  level: number;
  revives: number;
}

export interface NetWeaponInfo {
  id: string;
  name: string;
  icon: string;
  level: number;
}

export interface NetBuffInfo {
  type: BuffType;
  name?: string;
  icon?: string;
  color?: string;
  duration: number;
  maxDuration: number;
}

export interface PlayerNetState {
  id: string;
  x: number;
  z: number;
  dir: SpriteDirection;
  anim: HeroAnimState;
  hp: number;
  maxHp: number;
  level: number;
  xp?: number;
  xpToNextLevel?: number;
  isDowned: boolean;
  charType: CharacterType;
  kills: number;
  damageDealt: number;
  weapons?: NetWeaponInfo[];
  buffs?: NetBuffInfo[];
}

export interface DamageDealtEvent {
  enemyId: string;
  damage: number;
  sourceX: number;
  sourceZ: number;
  isFatal?: boolean;
  attackerId?: string;
}

export interface NetShotInfo {
  x: number;
  y: number;
  z: number;
  dx: number;
  dz: number;
  spd: number;
  lt: number;
  rad: number;
  col: number;
  mag?: boolean;
  orb?: boolean;
  orad?: number;
  ospd?: number;
  ownerId: string;
}

export interface NetEvent {
  type: 'damage_num' | 'altar_captured' | 'boss_spawn' | 'boss_defeat' | 'revive' | 'sound' | 'level_up' | 'xp_gain' | 'shot';
  x?: number;
  z?: number;
  val?: number | string;
  name?: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  altarType?: BuffType;
  buffDuration?: number;
  playerId?: string;
  shot?: NetShotInfo;
}

export interface LobbyPlayerInfo {
  id: string; // 'p1', 'p2', 'p3', 'p4', 'p5'
  name: string;
  hero: CharacterType;
  charType?: CharacterType;
  heroName?: string;
  isHost: boolean;
  isReady: boolean;
  colorHex: number;
  colorCss: string;
}

export const PLAYER_COLORS: Record<string, { hex: number; css: string; name: string }> = {
  p1: { hex: 0xf59e0b, css: '#f59e0b', name: 'Игрок 1 (Хост)' },
  p2: { hex: 0x06b6d4, css: '#06b6d4', name: 'Игрок 2' },
  p3: { hex: 0xa855f7, css: '#a855f7', name: 'Игрок 3' },
  p4: { hex: 0xf97316, css: '#f97316', name: 'Игрок 4' },
  p5: { hex: 0x10b981, css: '#10b981', name: 'Игрок 5' }
};

export const AVAILABLE_SLOT_IDS = ['p2', 'p3', 'p4', 'p5'];

export interface HostSnapshotMessage {
  type: 'HOST_SNAPSHOT';
  players: Record<string, PlayerNetState>; // All players: p1 + all active clients
  stats: Record<string, PlayerStats>; // All player stats
  gameTime: number;
  totalKills: number;
  boss: { hp: number; maxHp: number; isAlive: boolean } | null;
  enemies: EnemySnapshot[];
  drops: DropSnapshot[];
  events: NetEvent[];
  damageTakenByClient?: Record<string, number>; // clientId -> damage taken
  hostPlayer?: PlayerNetState;
  hostStats?: PlayerStats;
  clientStats?: PlayerStats;
  clientDamageTaken?: number;
}

export interface ClientSyncMessage {
  type: 'CLIENT_SYNC';
  clientId: string;
  clientPlayer: PlayerNetState;
  clientStats: PlayerStats;
  damageDealt: DamageDealtEvent[];
  collectedGemIds: string[];
  isRevivingPartner: boolean;
  revivingTargetId?: string;
  shots?: NetShotInfo[];
}

export interface LobbyUpdateMessage {
  type: 'LOBBY_UPDATE';
  players: LobbyPlayerInfo[];
}

export interface GameStartMessage {
  type: 'GAME_START';
  players: LobbyPlayerInfo[];
  seed: number;
}

export interface ReviveActionMessage {
  type: 'REVIVE_ACTION';
  reviverId?: string;
  targetId: string;
  target?: string;
}

export type NetMessage =
  | { type: 'HELLO'; clientId?: string; hero: CharacterType; name?: string }
  | { type: 'HELLO_ACK'; assignedId: string; players: LobbyPlayerInfo[] }
  | { type: 'HERO_SELECT'; playerId: string; hero: CharacterType }
  | { type: 'PLAYER_READY'; playerId: string; isReady: boolean }
  | { type: 'ALTAR_CAPTURED'; altarType: BuffType; playerId: string }
  | LobbyUpdateMessage
  | GameStartMessage
  | HostSnapshotMessage
  | ClientSyncMessage
  | ReviveActionMessage
  | { type: 'DISCONNECT'; playerId: string }
  | { type: 'PING'; timestamp: number; fromId: string }
  | { type: 'PONG'; timestamp: number; fromId: string }
  | { type: 'DEV_ACTION'; action: string; value?: any };

export class NetworkManager {
  public static readonly MAX_PLAYERS = 5;

  public role: NetRole = 'solo';
  public roomCode: string = '';
  public isConnected: boolean = false;
  public myId: string = 'p1';
  public isSlotAssigned: boolean = false;
  public get mySlotId(): string {
    if (this.role === 'host') return 'p1';
    return this.myId || 'p2';
  }
  public set mySlotId(val: string) {
    this.myId = val;
  }
  public myHero: CharacterType = 'ronin';

  // Active lobby roster (1 to 5 players)
  public lobbyPlayers: LobbyPlayerInfo[] = [];

  // Transports
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map(); // Host: guestId -> connection
  private clientConnection: DataConnection | null = null; // Client: connection to host
  private localChannel: BroadcastChannel | null = null;
  private pingInterval: number | null = null;
  private joinRoomResolver: ((ok: boolean) => void) | null = null;

  // Callbacks
  public onLobbyStateChanged?: (players: LobbyPlayerInfo[]) => void;
  public onGameStartReceived?: (msg: GameStartMessage) => void;
  public onHostSnapshotReceived?: (msg: HostSnapshotMessage) => void;
  public onClientSyncReceived?: (msg: ClientSyncMessage) => void;
  public onReviveReceived?: (msg: ReviveActionMessage) => void;
  public onPartnerDisconnected?: (playerId: string) => void;
  public onConnectionStatusChanged?: (status: string, isSuccess: boolean) => void;
  public onDevActionReceived?: (action: string, value?: any) => void;
  public onAltarCapturedReceived?: (altarType: BuffType, fromPlayerId: string) => void;
  public ping: number = 0;

  constructor() {}

  /**
   * Generates a 6-character memorable Western room code like "WEST-48" or "COLT-72"
   */
  public static generateRoomCode(): string {
    const prefixes = ['WEST', 'COLT', 'GOLD', 'WILD', 'SHERIFF', 'RIDER', 'OUTLAW', 'HAWK'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    return `${p}-${num}`;
  }

  /**
   * Host creates a new multiplayer room for up to 5 players.
   */
  public async createRoom(roomCode: string, hero: CharacterType): Promise<boolean> {
    this.reset();
    this.role = 'host';
    this.myId = 'p1';
    this.isSlotAssigned = true;
    this.roomCode = roomCode.toUpperCase().trim();
    this.myHero = hero;

    this.lobbyPlayers = [
      {
        id: 'p1',
        name: 'Командир (Вы)',
        hero: this.myHero,
        charType: this.myHero,
        isHost: true,
        isReady: true,
        colorHex: PLAYER_COLORS.p1.hex,
        colorCss: PLAYER_COLORS.p1.css
      }
    ];

    this.notifyStatus('Создание комнаты и ожидание союзников (до 5 игроков)...', false);

    // 1. Local BroadcastChannel for same-device multi-tab testing
    try {
      this.localChannel = new BroadcastChannel(`wws-room-${this.roomCode}`);
      this.localChannel.onmessage = (event) => {
        const raw = event.data;
        if (raw && typeof raw === 'object' && raw._sender !== this.myId) {
          this.handleRawMessage(raw.payload, raw._sender);
        }
      };
    } catch {
      // BroadcastChannel not available
    }

    // 2. PeerJS for remote WebRTC connections
    const peerId = `wws-coop-${this.roomCode.toLowerCase()}`;
    return new Promise((resolve) => {
      try {
        this.peer = new Peer(peerId, {
          host: PEERJS_HOST,
          port: PEERJS_PORT,
          path: PEERJS_PATH,
          secure: true,
          key: PEERJS_KEY,
          debug: 1,

          config: {
            iceServers: [
              {
                urls: [
                  'stun:stun.l.google.com:19302',
                  'stun:stun1.l.google.com:19302'
                ]
              },
              ...(TURN_HOST
                ? [
                    {
                      urls: [
                        `turn:${TURN_HOST}:3478?transport=udp`,
                        `turn:${TURN_HOST}:3478?transport=tcp`
                      ],
                      username: TURN_USERNAME,
                      credential: TURN_PASSWORD
                    }
                  ]
                : [])
            ]
          }
        });

        this.peer.on('open', () => {
          this.notifyStatus(`Комната ${this.roomCode} создана! Ожидание игроков (1/5)...`, true);
          if (this.onLobbyStateChanged) {
            this.onLobbyStateChanged(this.lobbyPlayers);
          }
          resolve(true);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingGuestConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS Notice:', err.type, err.message);
          if (err.type === 'unavailable-id') {
            this.notifyStatus(`Комната ${this.roomCode} уже существует в сети! Создайте другой код или подключитесь.`, false);
          } else {
            this.notifyStatus(`Комната создана локально. Код: ${this.roomCode}`, true);
          }
          resolve(true);
        });
      } catch (e) {
        console.warn('PeerJS init failed, falling back to local BroadcastChannel:', e);
        this.notifyStatus(`Комната создана локально (Broadcast). Код: ${this.roomCode}`, true);
        resolve(true);
      }
    });
  }

  /**
   * Guest joins an existing room by code.
   */
  public async joinRoom(roomCode: string, hero: CharacterType): Promise<boolean> {
    this.reset();
    this.role = 'client';
    this.roomCode = roomCode.toUpperCase().trim();
    this.myHero = hero;
    this.myId = '';
    this.isSlotAssigned = false;

    this.notifyStatus(`Поиск комнаты ${this.roomCode}...`, false);

    // 1. Setup local BroadcastChannel
    try {
      this.localChannel = new BroadcastChannel(`wws-room-${this.roomCode}`);
      this.localChannel.onmessage = (event) => {
        const raw = event.data;
        if (raw && typeof raw === 'object' && raw._sender !== this.myId) {
          if (raw._target && this.myId && raw._target !== this.myId) {
            return;
          }
          this.handleRawMessage(raw.payload, raw._sender);
        }
      };
      // Send HELLO ping on local channel
      setTimeout(() => {
        this.send({ type: 'HELLO', hero: this.myHero, name: 'Игрок' });
      }, 120);
    } catch {
      // ignore
    }

    // 2. Connect via PeerJS WebRTC
    return new Promise((resolve) => {
      let isResolved = false;
      const doResolve = (success: boolean) => {
        if (!isResolved) {
          isResolved = true;
          this.joinRoomResolver = null;
          resolve(success);
        }
      };
      this.joinRoomResolver = doResolve;

      try {
        const guestPeerId = `wws-guest-${Math.random().toString(36).substring(2, 8)}`;
        this.peer = new Peer(guestPeerId, {
          host: PEERJS_HOST,
          port: PEERJS_PORT,
          path: PEERJS_PATH,
          secure: true,
          key: PEERJS_KEY,
          debug: 1,

          config: {
            iceServers: [
              {
                urls: [
                  'stun:stun.l.google.com:19302',
                  'stun:stun1.l.google.com:19302'
                ]
              },
              ...(TURN_HOST
                ? [
                    {
                      urls: [
                        `turn:${TURN_HOST}:3478?transport=udp`,
                        `turn:${TURN_HOST}:3478?transport=tcp`
                      ],
                      username: TURN_USERNAME,
                      credential: TURN_PASSWORD
                    }
                  ]
                : [])
            ]
          }
        });

        const timeout = setTimeout(() => {
          if (this.isConnected) {
            doResolve(true);
          } else {
            this.notifyStatus('Не удалось подключиться к комнате. Проверьте код комнаты.', false);
            doResolve(false);
          }
        }, 5000);

        this.peer.on('open', () => {
          const targetPeerId = `wws-coop-${this.roomCode.toLowerCase()}`;
          const conn = this.peer!.connect(targetPeerId, { reliable: true });
          this.clientConnection = conn;

          conn.on('open', () => {
            clearTimeout(timeout);
            this.isConnected = true;
            this.notifyStatus(`Подключено к комнате ${this.roomCode}! Ожидание ответа хоста...`, true);
            this.startPingLoop();
            this.send({ type: 'HELLO', hero: this.myHero, name: 'Игрок' });
            doResolve(true);
          });

          conn.on('data', (data) => {
            this.handleRawMessage(data);
          });

          conn.on('close', () => {
            this.handleDisconnect();
          });

          conn.on('error', (err) => {
            console.warn('Connection error:', err);
          });
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS join error:', err);
          if (!this.isConnected) {
            this.notifyStatus(`Ошибка подключения: ${err.message}`, false);
          }
        });
      } catch (e) {
        console.warn('Join error:', e);
        if (!this.isConnected) {
          this.notifyStatus('Ошибка инициализации сети.', false);
          doResolve(false);
        }
      }
    });
  }

  /**
   * Host handles a new guest connecting.
   */
  private handleIncomingGuestConnection(conn: DataConnection) {
    // Check if room is full
    if (this.connections.size >= NetworkManager.MAX_PLAYERS - 1) {
      console.warn('Room is full (max 5 players). Rejecting connection.');
      conn.close();
      return;
    }

    // Allocate next available slot ID
    const assignedId = AVAILABLE_SLOT_IDS.find((id) => !this.connections.has(id)) || `p${this.connections.size + 2}`;
    this.connections.set(assignedId, conn);

    conn.on('open', () => {
      this.isConnected = true;
      this.startPingLoop();
    });

    conn.on('data', (data) => {
      this.handleRawMessage(data, assignedId);
    });

    conn.on('close', () => {
      this.removeGuest(assignedId);
    });

    conn.on('error', (err) => {
      console.warn(`Connection error on ${assignedId}:`, err);
      this.removeGuest(assignedId);
    });
  }

  private removeGuest(assignedId: string) {
    this.connections.delete(assignedId);
    const prevCount = this.lobbyPlayers.length;
    this.lobbyPlayers = this.lobbyPlayers.filter((p) => p.id !== assignedId);

    if (this.lobbyPlayers.length !== prevCount) {
      this.broadcastLobbyUpdate();
      if (this.onPartnerDisconnected) {
        this.onPartnerDisconnected(assignedId);
      }
    }
  }

  private broadcastLobbyUpdate() {
    const msg: LobbyUpdateMessage = {
      type: 'LOBBY_UPDATE',
      players: this.lobbyPlayers
    };
    this.send(msg);
    if (this.onLobbyStateChanged) {
      this.onLobbyStateChanged(this.lobbyPlayers);
    }
  }

  private handleRawMessage(data: unknown, fromId?: string) {
    if (!data) return;

    let msg: NetMessage;
    if (isBinarySnapshot(data)) {
      try {
        msg = unpackHostSnapshot(data as ArrayBuffer | ArrayBufferView);
      } catch (e) {
        console.warn('Failed to unpack binary snapshot:', e);
        return;
      }
    } else if (typeof data === 'string') {
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }
    } else if (typeof data === 'object') {
      msg = data as NetMessage;
    } else {
      return;
    }

    switch (msg.type) {
      case 'PING': {
        this.send({ type: 'PONG', timestamp: msg.timestamp, fromId: this.myId });
        break;
      }

      case 'PONG': {
        const rtt = Math.round(performance.now() - msg.timestamp);
        if (rtt >= 0 && rtt < 10000) {
          this.ping = this.ping === 0 ? rtt : Math.round(this.ping * 0.7 + rtt * 0.3);
        }
        break;
      }

      case 'DEV_ACTION': {
        if (this.onDevActionReceived) {
          this.onDevActionReceived(msg.action, msg.value);
        }
        break;
      }
      case 'HELLO': {
        if (this.role === 'host') {
          // If connection arrived via WebRTC, fromId is the allocated assignedId (e.g. 'p2')
          let guestId = fromId;
          if (!guestId || !AVAILABLE_SLOT_IDS.includes(guestId)) {
            guestId = AVAILABLE_SLOT_IDS.find((id) => !this.lobbyPlayers.some((p) => p.id === id));
          }

          if (!guestId || this.lobbyPlayers.length >= NetworkManager.MAX_PLAYERS) {
            console.warn('Room full or no slot available.');
            return;
          }

          const slotNum = AVAILABLE_SLOT_IDS.indexOf(guestId) + 2;
          const colorInfo = PLAYER_COLORS[guestId] || PLAYER_COLORS.p2;

          // Add or update guest in lobby
          const existing = this.lobbyPlayers.find((p) => p.id === guestId);
          if (existing) {
            existing.hero = msg.hero;
            existing.charType = msg.hero;
          } else {
            this.lobbyPlayers.push({
              id: guestId,
              name: `Игрок ${slotNum}`,
              hero: msg.hero,
              charType: msg.hero,
              isHost: false,
              isReady: false,
              colorHex: colorInfo.hex,
              colorCss: colorInfo.css
            });
          }

          this.isConnected = true;

          // Send HELLO_ACK ONLY to the connecting guest's connection, NOT broadcast to all guests!
          const guestConn = this.connections.get(guestId);
          if (guestConn && guestConn.open) {
            try {
              guestConn.send({
                type: 'HELLO_ACK',
                assignedId: guestId,
                players: this.lobbyPlayers
              });
            } catch (err) {
              console.warn(`Failed to send HELLO_ACK to ${guestId}:`, err);
            }
          }

          if (this.localChannel) {
            try {
              this.localChannel.postMessage({
                _sender: this.myId,
                _target: guestId,
                payload: {
                  type: 'HELLO_ACK',
                  assignedId: guestId,
                  players: this.lobbyPlayers
                }
              });
            } catch {}
          }

          // Broadcast roster update to all existing guests
          this.broadcastLobbyUpdate();
        }
        break;
      }

      case 'HELLO_ACK': {
        if (this.role === 'client') {
          if (!this.isSlotAssigned) {
            this.myId = msg.assignedId;
            this.isSlotAssigned = true;
          } else if (this.myId !== msg.assignedId) {
            // Still update the lobby roster without changing our ID
            this.lobbyPlayers = msg.players;
            if (this.joinRoomResolver) {
              this.joinRoomResolver(true);
            }
            if (this.onLobbyStateChanged) {
              this.onLobbyStateChanged(this.lobbyPlayers);
            }
            break;
          }

          this.lobbyPlayers = msg.players;
          this.isConnected = true;
          if (this.joinRoomResolver) {
            this.joinRoomResolver(true);
          }
          if (this.onLobbyStateChanged) {
            this.onLobbyStateChanged(this.lobbyPlayers);
          }
        }
        break;
      }

      case 'HERO_SELECT': {
        const p = this.lobbyPlayers.find((player) => player.id === msg.playerId);
        if (p) {
          p.hero = msg.hero;
          p.charType = msg.hero;
        }
        if (this.role === 'host') {
          this.broadcastLobbyUpdate();
        } else if (this.onLobbyStateChanged) {
          this.onLobbyStateChanged(this.lobbyPlayers);
        }
        break;
      }

      case 'PLAYER_READY': {
        const p = this.lobbyPlayers.find((player) => player.id === msg.playerId);
        if (p) {
          p.isReady = !!msg.isReady;
        }
        if (this.role === 'host') {
          this.broadcastLobbyUpdate();
        } else if (this.onLobbyStateChanged) {
          this.onLobbyStateChanged(this.lobbyPlayers);
        }
        break;
      }

      case 'ALTAR_CAPTURED': {
        if (this.onAltarCapturedReceived) {
          this.onAltarCapturedReceived(msg.altarType, msg.playerId);
        }
        break;
      }

      case 'LOBBY_UPDATE': {
        this.lobbyPlayers = msg.players;
        this.isConnected = true;
        if (this.joinRoomResolver) {
          this.joinRoomResolver(true);
        }
        if (this.onLobbyStateChanged) {
          this.onLobbyStateChanged(this.lobbyPlayers);
        }
        break;
      }

      case 'GAME_START': {
        this.lobbyPlayers = msg.players;
        if (this.onGameStartReceived) {
          this.onGameStartReceived(msg);
        }
        break;
      }

      case 'HOST_SNAPSHOT': {
        if (this.onHostSnapshotReceived) {
          this.onHostSnapshotReceived(msg);
        }
        break;
      }

      case 'CLIENT_SYNC': {
        if (this.onClientSyncReceived) {
          this.onClientSyncReceived(msg);
        }
        break;
      }

      case 'REVIVE_ACTION': {
        if (this.onReviveReceived) {
          this.onReviveReceived(msg);
        }
        break;
      }

      case 'DISCONNECT': {
        if (this.role === 'host' && msg.playerId) {
          this.removeGuest(msg.playerId);
        } else {
          this.handleDisconnect();
        }
        break;
      }
    }
  }

  /**
   * Broadcasts a network message across active channels (WebRTC and/or BroadcastChannel).
   * Host snapshots are automatically packed into compact binary ArrayBuffers.
   */
  public send(msg: NetMessage) {
    let payload: any = msg;
    if (msg.type === 'HOST_SNAPSHOT') {
      try {
        payload = packHostSnapshot(msg);
      } catch (e) {
        console.warn('Binary pack error, falling back to JSON:', e);
        payload = msg;
      }
    }

    if (this.role === 'host') {
      for (const [id, conn] of this.connections.entries()) {
        if (conn && conn.open) {
          try {
            conn.send(payload);
          } catch (e) {
            console.warn(`Send to ${id} failed:`, e);
          }
        }
      }
    } else if (this.role === 'client') {
      if (this.clientConnection && this.clientConnection.open) {
        try {
          this.clientConnection.send(payload);
        } catch (e) {
          console.warn('Send to host failed:', e);
        }
      }
    }

    // BroadcastChannel for local cross-tab communication
    if (this.localChannel) {
      try {
        this.localChannel.postMessage({ _sender: this.myId, payload });
      } catch {
        // ignore
      }
    }
  }

  public setHero(hero: CharacterType) {
    this.myHero = hero;
    const selfPlayer = this.lobbyPlayers.find((p) => p.id === this.myId);
    if (selfPlayer) {
      selfPlayer.hero = hero;
      selfPlayer.charType = hero;
      selfPlayer.heroName = undefined;
    }
    this.send({ type: 'HERO_SELECT', playerId: this.myId, hero });
    if (this.role === 'host') {
      this.broadcastLobbyUpdate();
    } else {
      if (this.onLobbyStateChanged) {
        this.onLobbyStateChanged(this.lobbyPlayers);
      }
    }
  }

  public setReady(isReady: boolean) {
    const selfPlayer = this.lobbyPlayers.find((p) => p.id === this.myId);
    if (selfPlayer) {
      selfPlayer.isReady = isReady;
    }
    if (this.role === 'host') {
      this.broadcastLobbyUpdate();
    } else {
      this.send({ type: 'PLAYER_READY', playerId: this.mySlotId, isReady });
      if (this.onLobbyStateChanged) {
        this.onLobbyStateChanged(this.lobbyPlayers);
      }
    }
  }

  public notifyAltarCaptured(altarType: BuffType) {
    if (this.role === 'client') {
      this.send({ type: 'ALTAR_CAPTURED', altarType, playerId: this.mySlotId });
    }
  }

  public startGame(seed = Math.floor(Math.random() * 1000000)) {
    if (this.role !== 'host') return;
    const msg: GameStartMessage = {
      type: 'GAME_START',
      players: this.lobbyPlayers,
      seed
    };
    this.send(msg);
    if (this.onGameStartReceived) {
      this.onGameStartReceived(msg);
    }
  }

  private startPingLoop() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected) {
        if (this.role === 'client') {
          this.send({ type: 'PING', timestamp: performance.now(), fromId: this.myId });
        } else if (this.role === 'host' && this.connections.size > 0) {
          this.send({ type: 'PING', timestamp: performance.now(), fromId: 'p1' });
        }
      }
    }, 1000);
  }

  private handleDisconnect() {
    this.isConnected = false;
    if (this.onPartnerDisconnected) {
      this.onPartnerDisconnected('p1');
    }
  }

  private notifyStatus(status: string, isSuccess: boolean) {
    if (this.onConnectionStatusChanged) {
      this.onConnectionStatusChanged(status, isSuccess);
    }
  }

  public reset() {
    this.joinRoomResolver = null;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.role === 'client' && this.clientConnection) {
      try {
        this.send({ type: 'DISCONNECT', playerId: this.myId });
        this.clientConnection.close();
      } catch {
        // ignore
      }
      this.clientConnection = null;
    }

    for (const conn of this.connections.values()) {
      try {
        conn.close();
      } catch {
        // ignore
      }
    }
    this.connections.clear();

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }

    if (this.localChannel) {
      try {
        this.localChannel.close();
      } catch {
        // ignore
      }
      this.localChannel = null;
    }

    this.role = 'solo';
    this.roomCode = '';
    this.isConnected = false;
    this.myId = 'p1';
    this.isSlotAssigned = false;
    this.lobbyPlayers = [];
  }
}
