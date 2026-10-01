import { CharacterType } from '../entities/Player';

export interface PublicRoomInfo {
  roomCode: string;
  hostHero: CharacterType;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  status: 'lobby' | 'playing';
  updatedAt: number;
  createdAt: number;
}

export class RoomDirectory {
  private static STORAGE_KEY = 'wws_active_rooms';
  private static CHANNEL_NAME = 'wws-rooms-directory';
  private static NTFY_TOPIC = 'wws-wildwest-rooms-v1';

  private static localChannel: BroadcastChannel | null = null;
  private static heartbeatTimer: any = null;
  private static currentHostRoom: PublicRoomInfo | null = null;
  private static onRoomsUpdatedCallbacks: Set<(rooms: PublicRoomInfo[]) => void> = new Set();
  private static cachedRooms: Map<string, PublicRoomInfo> = new Map();
  private static isInitialized = false;

  public static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.localChannel = new BroadcastChannel(this.CHANNEL_NAME);
        this.localChannel.onmessage = (event) => {
          const data = event.data;
          if (!data || typeof data !== 'object') return;
          if (data.type === 'ANNOUNCE' && data.room) {
            this.cachedRooms.set(data.room.roomCode, data.room);
            this.notifyListeners();
          } else if (data.type === 'CLOSE' && data.roomCode) {
            this.cachedRooms.delete(data.roomCode);
            this.notifyListeners();
          } else if (data.type === 'QUERY') {
            if (this.currentHostRoom) {
              this.localChannel?.postMessage({
                type: 'ANNOUNCE',
                room: this.currentHostRoom
              });
            }
          }
        };
      }
    } catch {
      // BroadcastChannel not supported in current environment
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === this.STORAGE_KEY) {
          this.loadFromStorage();
          this.notifyListeners();
        }
      });
    }
  }

  public static onRoomsUpdated(callback: (rooms: PublicRoomInfo[]) => void): () => void {
    this.init();
    this.onRoomsUpdatedCallbacks.add(callback);
    // Send initial snapshot immediately
    callback(this.getActiveRoomsList());
    return () => {
      this.onRoomsUpdatedCallbacks.delete(callback);
    };
  }

  private static notifyListeners() {
    const list = this.getActiveRoomsList();
    for (const cb of this.onRoomsUpdatedCallbacks) {
      try {
        cb(list);
      } catch (err) {
        console.warn('Room update callback error:', err);
      }
    }
  }

  public static startHosting(room: PublicRoomInfo, getUpdatedState?: () => Partial<PublicRoomInfo>) {
    this.init();
    this.currentHostRoom = { ...room, updatedAt: Date.now() };
    this.announce(this.currentHostRoom);

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.currentHostRoom) {
        if (getUpdatedState) {
          Object.assign(this.currentHostRoom, getUpdatedState());
        }
        this.currentHostRoom.updatedAt = Date.now();
        this.announce(this.currentHostRoom);
      }
    }, 4000);
  }

  public static updateHosting(update: Partial<PublicRoomInfo>) {
    if (!this.currentHostRoom) return;
    Object.assign(this.currentHostRoom, update);
    this.currentHostRoom.updatedAt = Date.now();
    this.announce(this.currentHostRoom);
  }

  public static stopHosting() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.currentHostRoom) {
      const code = this.currentHostRoom.roomCode;
      this.currentHostRoom = null;
      this.broadcastClose(code);
    }
  }

  private static announce(room: PublicRoomInfo) {
    this.cachedRooms.set(room.roomCode, { ...room });

    // 1. BroadcastChannel (instant for other tabs on same machine)
    try {
      this.localChannel?.postMessage({
        type: 'ANNOUNCE',
        room
      });
    } catch {}

    // 2. localStorage
    try {
      const map = this.readStorageMap();
      map[room.roomCode] = room;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(map));
    } catch {}

    // 3. Cloud Relay (ntfy.sh) - global public discovery
    try {
      fetch(`https://ntfy.sh/${this.NTFY_TOPIC}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ANNOUNCE',
          room
        })
      }).catch(() => {});
    } catch {}

    this.notifyListeners();
  }

  private static broadcastClose(roomCode: string) {
    this.cachedRooms.delete(roomCode);

    try {
      this.localChannel?.postMessage({
        type: 'CLOSE',
        roomCode
      });
    } catch {}

    try {
      const map = this.readStorageMap();
      delete map[roomCode];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(map));
    } catch {}

    try {
      fetch(`https://ntfy.sh/${this.NTFY_TOPIC}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          roomCode
        })
      }).catch(() => {});
    } catch {}

    this.notifyListeners();
  }

  public static async fetchRooms(): Promise<PublicRoomInfo[]> {
    this.init();

    // 1. Ask local tabs to re-announce immediately
    try {
      this.localChannel?.postMessage({ type: 'QUERY' });
    } catch {}

    // 2. Load from localStorage
    this.loadFromStorage();

    // 3. Poll cloud relay for cross-network rooms
    try {
      const res = await fetch(`https://ntfy.sh/${this.NTFY_TOPIC}/json?poll=1&since=25s`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const text = await res.text();
        const lines = text.trim().split('\n');
        for (const line of lines) {
          if (!line) continue;
          try {
            const entry = JSON.parse(line);
            if (entry.message) {
              const payload = typeof entry.message === 'string' ? JSON.parse(entry.message) : entry.message;
              if (payload.action === 'ANNOUNCE' && payload.room) {
                const r = payload.room as PublicRoomInfo;
                if (!this.cachedRooms.has(r.roomCode) || this.cachedRooms.get(r.roomCode)!.updatedAt < r.updatedAt) {
                  this.cachedRooms.set(r.roomCode, r);
                }
              } else if (payload.action === 'CLOSE' && payload.roomCode) {
                this.cachedRooms.delete(payload.roomCode);
              }
            }
          } catch {}
        }
      }
    } catch {}

    this.notifyListeners();
    return this.getActiveRoomsList();
  }

  public static getActiveRoomsList(): PublicRoomInfo[] {
    const now = Date.now();
    const result: PublicRoomInfo[] = [];

    for (const [code, room] of this.cachedRooms.entries()) {
      // Exclude rooms inactive for > 16 seconds
      if (now - room.updatedAt > 16000) {
        this.cachedRooms.delete(code);
        continue;
      }
      result.push(room);
    }

    // Sort: open rooms in lobby first, then password rooms in lobby, then playing
    result.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'lobby' ? -1 : 1;
      }
      if (a.hasPassword !== b.hasPassword) {
        return a.hasPassword ? 1 : -1;
      }
      return b.updatedAt - a.updatedAt;
    });

    return result;
  }

  private static readStorageMap(): Record<string, PublicRoomInfo> {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private static loadFromStorage() {
    const map = this.readStorageMap();
    const now = Date.now();
    for (const [code, room] of Object.entries(map)) {
      if (now - room.updatedAt < 16000) {
        if (!this.cachedRooms.has(code) || this.cachedRooms.get(code)!.updatedAt < room.updatedAt) {
          this.cachedRooms.set(code, room);
        }
      }
    }
  }
}
