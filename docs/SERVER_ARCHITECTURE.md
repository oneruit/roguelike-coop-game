# Server and GameCore Architecture

This document describes the modular architecture of **GameCore**, designed on the principle of **Headless Authoritative Simulation** (deterministic simulation free from graphical dependencies).

---

## 1. Concept: Separation of Simulation (GameCore) and Presentation (Renderer)

Previously, gameplay entities (`Enemy`, `Projectile`, `Gem`, `Player`) instantiated `THREE.Group`, `THREE.Mesh`, materials, and directly touched the DOM inside their core logic. Running simulation logic on a headless server (Linux VPS / Node.js / Bun) would have required deep code rewrites or heavy WebGL/Canvas shims.

The game architecture is cleanly partitioned into two isolated layers:

```
┌────────────────────────────────────────────────────────┐
│              Headless GameCore (src/sim/)              │
│  - Math: SimVec3, SimRNG (deterministic PRNG)          │
│  - Players: SimPlayer (HP, buffs, XP, stats, weapons)  │
│  - Enemies: SimEnemy, waves, target tracking AI        │
│  - Weapons & Projectiles: SimWeapon, paths, pierce     │
│  - Collisions: Circle / sphere overlaps (damage)       │
│  - Drops & Altars: Gems, magnets, team buffs           │
│  - Events: SimEvent (damage, death, sound, upgrade)    │
│  - Snapshots: getSnapshot() for network replication    │
│  * 0% dependencies on THREE.js, window, or document    │
└────────────────────────────────────────────────────────┘
                           ▲
                           │ Input / Snapshots
                           ▼
┌────────────────────────────────────────────────────────┐
│             Presentation Layer (Client / Three.js)     │
│  - Three.js Scene, 3D meshes, 2.5D sprites, shadows    │
│  - SoundManager (Web Audio API)                        │
│  - DamageNumberManager (HTML/3D floating combat text)  │
│  - HUD & Menus (DOM elements)                          │
│  - InputManager (keyboard, mouse, gamepad)             │
└────────────────────────────────────────────────────────┘
```

---

## 2. Current Mode: Host-Based (Client Host)

In the current version, multiplayer operates without requiring dedicated paid server infrastructure:
- **Solo Mode**: `GameCore` runs locally within the player's browser session.
- **Co-op Mode (up to 5 players)**: The host runs `GameCore`. Remote clients connect via WebRTC (PeerJS) and stream only player input commands (`CLIENT_INPUT` / `CLIENT_SYNC`). The host feeds inputs to `GameCore.setPlayerInput(id, input)`, executes `GameCore.tick(dt)`, and broadcasts authoritative snapshots via `GameCore.getSnapshot()` to all peers.

---

## 3. Transition to Dedicated Server (Node.js / Bun / VPS)

When deploying to a dedicated server (such as a Linux VPS or cloud instance):

### Zero Mechanics Rewrites Needed
Monsters, projectile physics, damage formulas, wave spawning, XP, levels, and altars are fully encapsulated in `src/sim/GameCore.ts` and `src/sim/SimWeapons.ts`. They execute out-of-the-box in Node.js and Bun.

### Server Runner: `server/dedicatedServer.ts`
The repository includes a ready-to-run headless server file: `server/dedicatedServer.ts`.

To launch on a server:
```bash
# Launch with Bun:
bun server/dedicatedServer.ts

# Or launch with Node.js / ts-node:
npx ts-node server/dedicatedServer.ts
```

### Server Tick Loop Structure (30 Hz):
```typescript
import { GameCore } from '../src/sim/GameCore';

const serverCore = new GameCore({ seed: 42, isCoop: true, tickRate: 30 });
const dt = 1 / 30;

// Fixed server tick loop (33.3 ms)
setInterval(() => {
  // 1. Simulate world step
  const events = serverCore.tick(dt);

  // 2. Fetch authoritative snapshot
  const snapshot = serverCore.getSnapshot();

  // 3. Broadcast over WebSocket / WebRTC to all connected players
  broadcastToAllPlayers({ type: 'SNAPSHOT', snapshot, events });
}, 1000 / 30);
```

### Architectural Advantages:
1. **Authoritative Cheat Protection**: Damage calculations, experience drops, boss health, and projectile hitboxes are verified server-side; clients cannot fabricate kills.
2. **Determinism**: The `SimRNG` pseudorandom generator enables reproducible simulations and match replay playback.
3. **Seamless Migration**: Switch between modes at any time via a configuration flag (`mode: 'local_host' | 'dedicated_client'`) in `GameCoreBridge.ts`.
