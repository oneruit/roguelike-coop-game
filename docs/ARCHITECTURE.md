# Project Architecture (Game Architecture)

This document describes the modular architecture of the project, separation of concerns across layers (Shared, Sim, Client, Server), and guidelines for introducing new gameplay mechanics without state desynchronization.

---

## 1. Architectural Layer Overview

The project architecture is divided into 5 isolated layers with a unidirectional dependency flow:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Shared Layer (src/shared/)                           │
│  - Entity types (CharacterType, EnemyType, GemType, BuffType)          │
│  - Canonical registries & serialization order (ENEMIES, CHARACTERS)    │
│  - Network protocols & snapshot schemas (NetMessage, PlayerNetState)   │
│  * 0 dependencies on Three.js, WebGL, DOM, or server runtime           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
┌──────────────────────────────────┐      ┌──────────────────────────────┐
│   Simulation Core (src/sim/)     │      │   Dedicated Server (server/) │
│  - Headless simulation (GameCore)│      │  - Headless Node.js/Bun      │
│  - Deterministic SimRNG          │      │  - Authoritative server tick │
│  - Game physics & collisions     │      │    loop (30Hz tick)          │
│  - Damage formulas, stats, waves │      │  - CLI tests and validation  │
│  * 0 dependencies on Three.js/DOM│      │  * 0 dependencies on WebGL   │
└─────────────────┬────────────────┘      └──────────────┬───────────────┘
                  │                                      │
                  │              Network Snapshots       │
                  └──────────────────┬───────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Client Layer (src/)                               │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────┐ │
│  │   Graphics & Engine   │ │   Game Entities (3D)  │ │   Networking  │ │
│  │   (src/core/)         │ │   (src/entities/,     │ │   (src/net/)  │ │
│  │   Engine, Textures,   │ │    src/combat/,       │ │   WebRTC /    │ │
│  │   Input, Camera       │ │    src/world/,        │ │   PeerJS /    │ │
│  │                       │ │    src/drops/)        │ │   BinaryPack  │ │
│  └───────────────────────┘ └───────────────────────┘ └───────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │   User Interface (src/ui/) - DOM, HUD, Canvas Minimap, DevPanel   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Separation of Concerns

### 2.1. Shared Layer (`src/shared/`)
* **Purpose**: Single Source of Truth for data types shared across client and server.
* **Contents**:
  * `entities.ts`: Base types (`CharacterType`, `EnemyType`, `GemType`, `BuffType`, `HeroAnimState`, `SpriteDirection`, `PlayerStats`, `RiftItemId`).
  * `registry.ts`: Canonical indexed arrays (`ENEMIES`, `CHARACTERS`, `SLOTS`, `DIRECTIONS`, `ANIM_STATES`, `CHEST_TIERS`, `GEMS`, `BUFF_TYPES`), used by the `BinarySnapshot` network codec for compact binary serialization (indices instead of string keys).
  * `network.ts`: Network packet schemas (`NetMessage`, `HostSnapshotMessage`, `ClientSyncMessage`, `PlayerNetState`, `EnemySnapshot`, player slots and color constants).
* **Rule**: Zero external dependencies. Can be safely imported anywhere in the project.

### 2.2. Headless Simulation Core (`src/sim/`)
* **Purpose**: Fully authoritative game mathematics and simulation logic independent of graphics and sound.
* **Contents**:
  * `SimRNG.ts`: Deterministic pseudorandom number generator.
  * `GameCore.ts`: Main simulation tick loop (`tick(dt)`), player lifecycle, enemy spawns, waves, altars, pickups.
  * `SimPlayer.ts`, `SimEnemy.ts`, `SimWeapons.ts`, `SimGems.ts`: Mathematical entity models.
* **Rule**: 0% dependencies on Three.js, WebGL, `window`, or `document`. Executes identically in the browser and in headless server runtimes (Node.js/Bun).

### 2.3. Client Presentation (`src/core/`, `src/entities/`, `src/combat/`, `src/world/`, `src/drops/`)
* **Purpose**: Rendering, animations, audio, interpolation, and movement smoothing.
* **Contents**:
  * `Engine.ts`: Initialization of Three.js WebGLRenderer, scene, lighting, camera.
  * `TextureManager.ts`, `SoundManager.ts`, `InputManager.ts`.
  * `Player.ts`, `RemotePlayer.ts`, `Enemy.ts`, `EnemyManager.ts`, `Gem.ts`: 3D meshes, 2.5D billboards, sprite sheet animations.
  * `Projectile.ts`, `Weapon.ts`: Visual projectile effects (lightning, fireballs, chakrams).

### 2.4. User Interface (`src/ui/`)
* **Purpose**: 2D user interface layered over the WebGL canvas.
* **Contents**:
  * `HUD.ts`: Health bars, XP, timer, kill counter, level-up cards.
  * `MapManager.ts`: Minimap (2D Canvas).
  * `DevManager.ts`: Debugging tools and entity spawners.
* **Rule**: Strictly uses `import type` for Three.js. No heavy graphics dependencies.

### 2.5. Networking (`src/net/`)
* **Purpose**: Network packet transport (P2P WebRTC via PeerJS) and data packing.
* **Contents**:
  * `NetworkManager.ts`: Connection lifecycle, rooms, host and client roles.
  * `BinarySnapshot.ts`: Ultra-fast binary snapshot serializer.
* **Rule**: Imports protocols and types exclusively from `src/shared/types`. Independent of concrete graphical entity classes.

### 2.6. Dedicated Server (`server/`)
* **Purpose**: Headless server instance for co-op or competitive multiplayer.
* **Contents**:
  * `dedicatedServer.ts`: Entry point for running on VPS / Node.js / Bun.
* **Rule**: Runs without WebGL or DOM dependencies.

---

## 3. Guide: Adding New Gameplay Mechanics

Thanks to the unified `src/shared/types`, introducing new content is predictable and desync-free.

### Adding a New Enemy
1. **Register the type**:
   In `src/shared/types/entities.ts`, add the key to the `EnemyType` union:
   ```typescript
   export type EnemyType = 'coyote' | ... | 'new_enemy';
   ```
2. **Add to the canonical network registry**:
   In `src/shared/types/registry.ts`, append to the `ENEMIES` array:
   ```typescript
   export const ENEMIES: readonly EnemyType[] = [..., 'new_enemy'];
   ```
   *All network serializers automatically update indexing without desync!*
3. **Configure balance attributes**:
   In `src/sim/SimEnemies.ts` and `src/data/enemies.ts`, define HP, speed, damage, experience.
4. **Configure visual presentation**:
   In `src/entities/Enemy.ts`, connect textures and sprite animations.

### Adding a New Character
1. Add the key to `CharacterType` (`src/shared/types/entities.ts`).
2. Add the name to `CHARACTERS` (`src/shared/types/registry.ts`).
3. Set base attributes and starting weapon in `src/entities/Player.ts` / `src/data/characters.ts`.

### Adding a New Weapon / Projectile
1. In `src/sim/SimWeapons.ts`, implement simulation logic: fire rate, pierce count, damage formula.
2. In `src/combat/Weapon.ts` and `src/combat/Projectile.ts`, implement visual effects (mesh, shader, particles).

---

## 4. Three.js Import Policy (Tree-Shaking)

To minimize bundle size and improve load times, strict tree-shaking rules apply:
* ❌ **Forbidden**: `import * as THREE from 'three';`
* ✅ **Allowed**: Named imports for required classes only:
   ```typescript
   import { Vector3, Mesh, MeshBasicMaterial, type Scene } from 'three';
   ```
* ✅ **In UI & Managers**: Use `import type` where classes are used solely for TypeScript type annotations:
   ```typescript
   import type { Scene, Camera } from 'three';
   ```
