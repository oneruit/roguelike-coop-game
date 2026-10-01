/**
 * Dedicated Game Server (Headless Node.js / Bun / Deno runner)
 *
 * Uses the exact same headless GameCore simulation as the client.
 * Runs at 30 ticks/sec, processing client inputs and broadcasting authoritative snapshots.
 *
 * Run with:
 *   npx ts-node server/dedicatedServer.ts
 * or
 *   bun server/dedicatedServer.ts
 */

import { GameCore } from '../src/sim/GameCore';
import { SimPlayerInput } from '../src/sim/types';

export interface DedicatedServerOptions {
  port?: number;
  tickRate?: number;
  seed?: number;
  isCoop?: boolean;
}

export class DedicatedGameServer {
  public core: GameCore;
  public tickRate: number;
  public tickIntervalMs: number;
  private intervalId: any = null;
  private clientSessions = new Map<string, { id: string; name: string }>();

  constructor(options: DedicatedServerOptions = {}) {
    this.tickRate = options.tickRate || 30;
    this.tickIntervalMs = 1000 / this.tickRate;
    this.core = new GameCore({
      seed: options.seed ?? Math.floor(Math.random() * 100000),
      isCoop: options.isCoop ?? true,
      tickRate: this.tickRate
    });

    console.log(`[DedicatedServer] Initialized with Seed: ${this.core.rng.getState()}, TickRate: ${this.tickRate}Hz`);
  }

  /**
   * Starts the authoritative 30Hz tick simulation loop
   */
  public start() {
    if (this.intervalId) return;

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
    this.broadcastSnapshot(snapshot);

    // Check game over
    const status = this.core.isGameOver();
    if (status.isOver) {
      console.log(`[DedicatedServer] Game Over! Victory: ${status.isVictory}. Time: ${this.core.gameTime.toFixed(1)}s`);
      this.stop();
    }
  }

  /**
   * Stops simulation
   */
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[DedicatedServer] Simulation loop stopped.');
    }
  }

  /**
   * Handles player connection
   */
  public onPlayerJoin(id: string, name: string, charType: any = 'ronin') {
    console.log(`[DedicatedServer] Player joined: ${name} (${id}) as ${charType}`);
    this.clientSessions.set(id, { id, name });
    this.core.addPlayer(id, charType);
  }

  /**
   * Handles player disconnection
   */
  public onPlayerLeave(id: string) {
    console.log(`[DedicatedServer] Player left: ${id}`);
    this.clientSessions.delete(id);
    this.core.removePlayer(id);
  }

  /**
   * Handles client movement input packet
   */
  public onClientInput(id: string, input: SimPlayerInput) {
    this.core.setPlayerInput(id, input);
  }

  /**
   * Handles weapon upgrade selection
   */
  public onClientUpgradeSelect(id: string, weaponId: string) {
    this.core.upgradePlayerWeapon(id, weaponId);
  }

  /**
   * Broadcasts authoritative snapshot to all clients
   */
  private broadcastSnapshot(snapshot: any) {
    // In a production server, this sends a binary WebSocket or WebRTC DataChannel packet.
    // e.g.:
    // const serialized = JSON.stringify(snapshot);
    // for (const socket of webSockets) { socket.send(serialized); }
  }
}

// Self-run when invoked directly via node/bun/tsx
const server = new DedicatedGameServer({ tickRate: 30, isCoop: true });
server.onPlayerJoin('p1', 'Player 1 (Host)', 'ronin');
server.onPlayerJoin('p2', 'Player 2', 'valkyrie');
server.start();

setTimeout(() => {
  console.log('[DedicatedServer] 3 seconds simulation test complete. Total kills:', server.core.totalKills);
  console.log('[DedicatedServer] Active enemies in simulation:', server.core.enemies.length);
  console.log('[DedicatedServer] Drops spawned:', server.core.drops.length);
  server.stop();
  process.exit(0);
}, 3000);
