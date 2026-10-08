/**
 * Dedicated Game Server (Headless Node.js / Bun runner with WebSocket support)
 *
 * Runs headless authoritative GameCore simulation at 30 ticks/sec.
 * Processes client inputs and broadcasts authoritative snapshots over WebSockets.
 *
 * Run with:
 *   npm run server
 *   PORT=8080 npm run server
 * or test run:
 *   npm run server -- --test
 */

import { WebSocketServer, WebSocket } from 'ws';
import { GameCore } from '../src/sim/GameCore';
import { SimPlayerInput, CharacterType } from '../src/sim/types';

export interface DedicatedServerOptions {
  port?: number;
  tickRate?: number;
  seed?: number;
  isCoop?: boolean;
}

interface ClientConnection {
  id: string;
  name: string;
  hero: CharacterType;
  ws: WebSocket;
  isReady: boolean;
}

export class DedicatedGameServer {
  public core: GameCore;
  public tickRate: number;
  public tickIntervalMs: number;
  public port: number;

  private wss: WebSocketServer | null = null;
  private intervalId: any = null;
  private clients = new Map<string, ClientConnection>();
  private nextSlotIndex = 1;
  private isGameRunning = false;

  constructor(options: DedicatedServerOptions = {}) {
    this.tickRate = options.tickRate || 30;
    this.tickIntervalMs = 1000 / this.tickRate;
    this.port = options.port || Number(process.env.PORT) || 8080;

    this.core = new GameCore({
      seed: options.seed ?? Math.floor(Math.random() * 100000),
      isCoop: options.isCoop ?? true,
      tickRate: this.tickRate
    });

    console.log(`[DedicatedServer] Initialized with Seed: ${this.core.rng.getState()}, TickRate: ${this.tickRate}Hz`);
  }

  /**
   * Starts listening for client WebSocket connections
   */
  public listen(): Promise<void> {
    return new Promise((resolve) => {
      this.wss = new WebSocketServer({ port: this.port });

      this.wss.on('listening', () => {
        console.log(`[DedicatedServer] Listening on ws://0.0.0.0:${this.port}`);
        resolve();
      });

      this.wss.on('connection', (ws: WebSocket) => {
        this.handleClientSocket(ws);
      });
    });
  }

  private handleClientSocket(ws: WebSocket) {
    let assignedId = `p${this.nextSlotIndex++}`;
    if (this.nextSlotIndex > 5) this.nextSlotIndex = 1;

    console.log(`[DedicatedServer] New client connected, assigned slot: ${assignedId}`);

    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const text = data.toString();
        const msg = JSON.parse(text);
        this.handleClientMessage(assignedId, ws, msg);
      } catch (err) {
        console.warn(`[DedicatedServer] Failed to parse message from ${assignedId}:`, err);
      }
    });

    ws.on('close', () => {
      console.log(`[DedicatedServer] Client disconnected: ${assignedId}`);
      this.clients.delete(assignedId);
      this.core.removePlayer(assignedId);

      this.broadcast({
        type: 'PLAYER_DISCONNECT',
        playerId: assignedId
      });
    });
  }

  private handleClientMessage(assignedId: string, ws: WebSocket, msg: any) {
    switch (msg.type) {
      case 'HELLO': {
        const hero: CharacterType = msg.hero || 'ronin';
        const name: string = msg.name || `Player ${assignedId}`;
        const client: ClientConnection = {
          id: assignedId,
          name,
          hero,
          ws,
          isReady: false
        };
        this.clients.set(assignedId, client);
        this.core.addPlayer(assignedId, hero);

        // Acknowledge connection
        ws.send(JSON.stringify({
          type: 'HELLO_ACK',
          assignedId,
          seed: this.core.rng.getState()
        }));

        this.broadcastLobbyUpdate();

        // Start game simulation if first player
        if (!this.isGameRunning) {
          this.start();
        }
        break;
      }

      case 'HERO_SELECT': {
        const client = this.clients.get(assignedId);
        if (client && msg.hero) {
          client.hero = msg.hero;
          this.broadcastLobbyUpdate();
        }
        break;
      }

      case 'CLIENT_INPUT': {
        if (msg.input) {
          this.core.setPlayerInput(assignedId, msg.input as SimPlayerInput);
        }
        break;
      }

      case 'UPGRADE_SELECT': {
        if (msg.weaponId) {
          this.core.upgradePlayerWeapon(assignedId, msg.weaponId);
        }
        break;
      }

      case 'REVIVE_ACTION': {
        if (msg.targetId) {
          this.core.revivePlayer(assignedId, msg.targetId);
        }
        break;
      }
    }
  }

  private broadcastLobbyUpdate() {
    const playersList = Array.from(this.clients.values()).map(c => ({
      id: c.id,
      name: c.name,
      hero: c.hero,
      isHost: c.id === 'p1',
      isReady: c.isReady
    }));

    this.broadcast({
      type: 'LOBBY_UPDATE',
      players: playersList
    });
  }

  /**
   * Starts the authoritative 30Hz tick simulation loop
   */
  public start() {
    if (this.intervalId) return;

    this.isGameRunning = true;
    const dt = 1 / this.tickRate;
    console.log(`[DedicatedServer] Starting simulation loop (${this.tickIntervalMs.toFixed(1)}ms per tick)...`);

    this.intervalId = setInterval(() => {
      this.tick(dt);
    }, this.tickIntervalMs);
  }

  /**
   * Authoritative tick: updates mobs, bullets, collisions, drops, altars, revives
   */
  public tick(dt: number) {
    const events = this.core.tick(dt);
    const snapshot = this.core.getSnapshot();

    // Broadcast snapshot to all connected clients
    this.broadcast({
      type: 'SERVER_SNAPSHOT',
      snapshot,
      events
    });

    // Check game over
    const status = this.core.isGameOver();
    if (status.isOver) {
      console.log(`[DedicatedServer] Game Over! Victory: ${status.isVictory}. Time: ${this.core.gameTime.toFixed(1)}s`);
      this.broadcast({
        type: 'GAME_OVER',
        isVictory: status.isVictory,
        gameTime: this.core.gameTime,
        kills: this.core.totalKills
      });
      this.stop();
    }
  }

  /**
   * Stops simulation and socket server
   */
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isGameRunning = false;
      console.log('[DedicatedServer] Simulation loop stopped.');
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  /**
   * Handles player connection (programmatic)
   */
  public onPlayerJoin(id: string, _name: string, charType: CharacterType = 'ronin') {
    this.core.addPlayer(id, charType);
  }

  /**
   * Broadcasts payload to all connected WebSocket clients
   */
  public broadcast(packet: any) {
    if (this.clients.size === 0) return;
    const data = typeof packet === 'string' ? packet : JSON.stringify(packet);

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }
}

// -------------------------------------------------------------
// Runner entry point
// -------------------------------------------------------------
const isTestRun = process.argv.includes('--test') || process.env.TEST_RUN === 'true';

const server = new DedicatedGameServer({ tickRate: 30, isCoop: true });

if (isTestRun) {
  console.log('[DedicatedServer] Running 3-second headless self-test...');
  server.onPlayerJoin('p1', 'Player 1 (Host)', 'ronin');
  server.onPlayerJoin('p2', 'Player 2', 'valkyrie');
  server.start();

  setTimeout(() => {
    console.log('[DedicatedServer] Self-test complete. Total kills:', server.core.totalKills);
    console.log('[DedicatedServer] Active enemies in simulation:', server.core.enemies.length);
    console.log('[DedicatedServer] Drops spawned:', server.core.drops.length);
    server.stop();
    process.exit(0);
  }, 3000);
} else {
  server.listen().catch((err) => {
    console.error('[DedicatedServer] Server failed to start:', err);
    process.exit(1);
  });
}
