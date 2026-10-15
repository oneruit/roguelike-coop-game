---
description: High-level architectural map, entity registry, and fast navigation guide for the codebase
globs: ["**/*"]
---

# Codebase Architectural Map & Fast Navigation

This document serves as the persistent architectural cache and navigation guide for agents working on this project. Read this before initiating wide file searches.

---

## 1. Directory Structure & Module Responsibilities

```text
my-lovely-game/
├── game/                    # Core Game Client (Three.js, TypeScript, Vite)
│   ├── src/
│   │   ├── auth/           # Guest & Email OTP session management (AuthManager)
│   │   ├── balance/        # Balance definitions (DEFAULT_BALANCE, BalanceManager, Supabase)
│   │   ├── combat/         # Damage calculation, resistances, knockback, damage numbers
│   │   ├── core/           # Game loop, input handling, camera controller, sound manager
│   │   ├── director/       # Wave spawn director, difficulty scaling, boss spawners
│   │   ├── drops/          # Experience gems, chests, potion pickups, magnet attraction
│   │   ├── entities/       # Character, Monster, Boss, Projectile, SpriteAnimation
│   │   ├── items/          # Relics, consumables, might elixirs, active abilities
│   │   ├── mechanics/      # Shrines, portals, destructibles, shrines
│   │   ├── meta/           # MetaProgression, BattlePass, ChapterQuests, Talents
│   │   ├── net/            # NetworkManager (WebSocket & WebRTC PeerJS multiplayer)
│   │   ├── shared/         # Common data interfaces, enums, weapon/hero types
│   │   ├── sim/            # Headless balance simulation engine & DPS benchmarkers
│   │   ├── styles/         # Screen-specific CSS styles & global design tokens
│   │   ├── ui/             # HUD, ScreenManager, and modular UI screens
│   │   │   └── screens/    # Auth, CharacterSelect, GameOver, InGameHUD, Inventory,
│   │   │                   # LevelUp, Lobby, MainMenu, Quests, Settings, Shop
│   │   ├── utils/          # DOM helpers (SafeDOM), math, pooling, geometry
│   │   ├── vfx/            # Particle systems, screen shake, status indicators
│   │   └── world/          # ChunkManager, BiomeGenerator, TreeManager, Obstacles
├── admin/                  # Admin Dashboard & Balance Editor (TypeScript, Vite)
│   ├── src/
│   │   ├── admin.ts        # Admin application entry point & tab router
│   │   ├── constants.ts    # Asset maps (TEXTURE_MAP, getEntityTexture), chart colors
│   │   ├── api/            # SupabaseService (draft/publish balance, balance rollback)
│   │   ├── state/          # balanceState (reactive draft store & change tracking)
│   │   ├── views/          # Views: Heroes, Weapons, Monsters, Bosses, Talents, Simulator
│   │   └── styles/         # Admin panel styles and themes
├── server/                 # Dedicated WebSocket Multiplayer Server
│   └── dedicatedServer.ts  # Node.js server for state broadcast and room orchestration
├── public/                 # Static Assets (Served directly by Vite)
│   ├── textures/           # heroes/, monsters/, bosses/, weapons/, biomes/, ui/
│   └── audio/              # Sound effects and background music
└── tests/                  # Headless unit & integration test suites (Node.js test runner)
```

---

## 2. Key Singletons & Registries

| Domain | Key Symbol / File | Responsibility |
| :--- | :--- | :--- |
| **Default Balance** | `DEFAULT_BALANCE` in [game/src/balance/defaultBalance.ts](file:///d:/projects/Git/my-lovely-game/game/src/balance/defaultBalance.ts) | Single source of truth for all hero, weapon, monster, boss, item, passive, and talent stats. |
| **Runtime Balance** | `BalanceManager` in [game/src/balance/BalanceManager.ts](file:///d:/projects/Git/my-lovely-game/game/src/balance/BalanceManager.ts) | In-memory balance manager; fetches overrides from Supabase or falls back to `DEFAULT_BALANCE`. |
| **Authentication** | `AuthManager` in [game/src/auth/AuthManager.ts](file:///d:/projects/Git/my-lovely-game/game/src/auth/AuthManager.ts) | Guest accounts, Supabase Email OTP sign-in, session persistence in localStorage. |
| **Admin Asset Map** | `TEXTURE_MAP` / `getEntityTexture` in [admin/src/constants.ts](file:///d:/projects/Git/my-lovely-game/admin/src/constants.ts) | Maps entity IDs to preview images in the admin panel and simulator. |
| **Networking** | `NetworkManager` in [game/src/net/NetworkManager.ts](file:///d:/projects/Git/my-lovely-game/game/src/net/NetworkManager.ts) | Manages host/client multiplayer state, WebSockets, and snapshot interpolation. |
| **Meta Progression** | `MetaProgression` in [game/src/meta/MetaProgression.ts](file:///d:/projects/Git/my-lovely-game/game/src/meta/MetaProgression.ts) | Talent trees, crystals, persistent account stats, chapter quests. |

---

## 3. Instant Game Entity & Balance Registry

To inspect game balance, characters, weapons, or monsters, **do not read `defaultBalance.ts` directly**. Use the pre-computed registry:

- **Markdown Reference:** [`.agents/cache/game-registry.md`](.agents/cache/game-registry.md) (complete tables of heroes, weapons, stats, cooldowns, bosses, and passives).
- **Native MCP Tool:** Call `get_game_entities({ category: "heroes" | "weapons" | "bosses" | "monsters" | "items" | "all" })` to get structured balance tables instantly without file reads.

---

## 4. Common Extension Workflows (Recipes)

### A. Adding / Modifying a Playable Hero
1. Define hero ID in `CharacterType` in [game/src/entities/Character.ts](file:///d:/projects/Git/my-lovely-game/game/src/entities/Character.ts).
2. Register stats and default weapon in `DEFAULT_BALANCE.heroes` in [game/src/balance/defaultBalance.ts](file:///d:/projects/Git/my-lovely-game/game/src/balance/defaultBalance.ts).
3. Place sprites in `public/textures/heroes/<hero_id>/` (`idle.png`, `walk.png`, `attack.png`, `portrait.png`, `front.png`).
4. Register textures in `TEXTURE_MAP` in [admin/src/constants.ts](file:///d:/projects/Git/my-lovely-game/admin/src/constants.ts).
5. Update tests in [tests/uniqueCharacters.test.ts](file:///d:/projects/Git/my-lovely-game/tests/uniqueCharacters.test.ts).

### B. Adding / Modifying a Weapon
1. Define weapon ID in `WeaponType` in [game/src/shared/types.ts](file:///d:/projects/Git/my-lovely-game/game/src/shared/types.ts) or weapon class in `game/src/entities/weapons/`.
2. Register stats, upgrade grades, and damage scaling in `DEFAULT_BALANCE.weapons` in [game/src/balance/defaultBalance.ts](file:///d:/projects/Git/my-lovely-game/game/src/balance/defaultBalance.ts).
3. Place weapon icon in `public/textures/weapons/<weapon_id>/icon.png`.
4. Register in `TEXTURE_MAP` in [admin/src/constants.ts](file:///d:/projects/Git/my-lovely-game/admin/src/constants.ts).

### C. Adding / Modifying a Monster or Boss
1. Define monster/boss ID and register stats in `DEFAULT_BALANCE.monsters` or `DEFAULT_BALANCE.bosses`.
2. Add sprite sheets in `public/textures/monsters/<id>/` or `public/textures/bosses/<id>/`.
3. Register preview textures in `TEXTURE_MAP` in [admin/src/constants.ts](file:///d:/projects/Git/my-lovely-game/admin/src/constants.ts).

### D. Adding / Modifying a UI Screen
1. Follow modular architecture: place in `game/src/ui/screens/<ScreenName>/`.
2. Include `<ScreenName>Screen.ts`, `template.html`, and `<screen-name>.css`.
3. Keep styles strictly scoped to `.ui-<screen-name>`.
4. Use `SafeDOM.query` instead of raw `document.getElementById('...')!`.

---

## 5. Verification Commands

Before completing any task, execute:
```powershell
npm run typecheck    # TypeScript compiler check
npm run build        # Client production bundle build
npm run build:admin  # Admin panel production build
npm test             # Unit & integration tests
```
