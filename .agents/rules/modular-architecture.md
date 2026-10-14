---
description: Mandatory modular and structured architecture rule for UI, game mechanics, and assets
globs: ["game/**/*", "admin/**/*", "public/**/*"]
---

# Modular and Structured Architecture Rule

This rule defines mandatory architecture standards for all UI components, game mechanics, and asset structures in this repository.

## 1. UI Modularity & Isolation

1. **Feature-Based Directories**:
   - Each major UI screen or complex modal must live in its dedicated directory under `game/src/ui/screens/<ScreenName>/` or `game/src/ui/components/<ComponentName>/`.
   - Each screen bundle must contain:
     - Its controller/class (e.g. `<ScreenName>Screen.ts` or `<ScreenName>UI.ts`).
     - Its template HTML.
     - Its isolated stylesheet (e.g. `<screen-name>.css`).

2. **Strict CSS Scoping & BEM**:
   - Every style rule for a screen MUST be scoped under that screen's root namespace class (e.g. `.ui-char-select`, `.ui-main-menu`, `.ui-hud`).
   - Never write unscoped styles targeting generic classes or tags (e.g. bare `.modal`, `.card`, `.btn`, `button`, `h2`, `table`).
   - Never use `!important` on `display` or `position` that breaks the global modal visibility contract (`.modal.hidden` / `.ui-screen--hidden` must always be respected).

3. **Safe DOM Binding & Graceful Degradation**:
   - Never use blind non-null assertions like `document.getElementById('...')!` that crash the entire JavaScript runtime if a DOM element is missing or renamed.
   - Use `SafeDOM.query` / safe element lookups or graceful null checks with warning logs.
   - If an element is absent from a template, only that specific feature/button should degrade; the rest of the game and UI must continue running.

4. **Event-Driven UI Coordination**:
   - UI screens must not tightly couple by querying each other's private DOM or calling deep internal methods.
   - Use an event emitter or coordinator (`UIEventBus` / `ScreenManager`) for navigation, modal stack, and cross-screen communication.

---

## 2. Asset Structure Hierarchy

1. **Dedicated Entity Directories**:
   - Assets must not be dumped as flat files in root folders.
   - **Heroes**: `public/textures/heroes/<hero_id>/` containing `idle.png`, `walk.png`, `attack.png`, `front.png`, `portrait.png`.
   - **Biomes**: `public/textures/biomes/<biome_id>/` containing `surface.jpg`, `tree.png`, `obstacle.png`, `props.png`, etc.
   - **Monsters**: `public/textures/monsters/<monster_id>/` containing `front.png`, `walk.png`, `attack.png`.
   - **Bosses**: `public/textures/bosses/<boss_id>/` containing `front.png`, `walk.png`, `attack.png`.
   - **Weapons**: `public/textures/weapons/<weapon_id>/` containing `icon.png`, `projectile.png`.
   - **UI Assets**: `public/textures/ui/<screen_or_category>/` (e.g. `main-menu/`, `char-select/`, `common/`).

2. **Centralized Asset Resolvers**:
   - Code must not construct arbitrary hardcoded texture paths across dozens of files.
   - Use `AssetResolver` or `TextureManager` methods to obtain URLs.
   - Ensure backward-compatible fallbacks during migrations so existing legacy paths continue resolving until fully migrated.
   - Always update `admin/src/constants.ts` (`TEXTURE_MAP` / `getEntityTexture`) whenever entity paths or structures are updated.

---

## 3. Game Mechanics Modularity

1. **Single Responsibility**:
   - Game mechanics (combat, movement, buffs, progression, world generation, audio) must reside in separate files and modules.
   - Avoid monolithic files. Break complex features into cohesive, single-purpose helper modules and classes.

2. **Decoupled Mechanics via Events**:
   - Entities (such as Player or Enemies) should emit events (`player:damage`, `player:levelup`, `boss:spawn`) rather than directly calling UI methods or network methods.
   - Systems subscribe to events, keeping simulation logic decoupled from presentation and UI.
