---
description: "Mandatory rule: when adding a new character, weapon, monster, or boss to the game, always register them in the default balance and admin panel"
globs: "game/src/**/*, admin/**/*"
---

# Entity & Admin Panel Synchronization Rule

When adding any new **character (hero)**, **weapon**, **common monster**, or **boss** to the game, it is **strictly mandatory** to synchronize it with the balance system (`DEFAULT_BALANCE`) and the Admin Panel (`admin/`).

---

## 1. Adding a New Character (Hero / Character)

When creating a new hero `<hero_id>`:
1. **Registration in game types and registry**:
   - `game/src/shared/types/entities.ts` -> add to `CharacterType`.
   - `game/src/shared/types/registry.ts` -> add to the `CHARACTERS` array.
2. **Registration in default balance (`game/src/balance/defaultBalance.ts`)**:
   - Add hero object to `DEFAULT_BALANCE.heroes[<hero_id>]`:
     ```ts
     <hero_id>: {
       id: '<hero_id>',
       name: '<Name (Class)>',
       maxHp: <number>,
       baseSpeed: <number>,
       damageMultiplier: <number>,
       startingWeapon: '<weapon_id>',
       role: '<Brief role description>'
     }
     ```
3. **Character game logic (`game/src/entities/Player.ts`)**:
   - In `init()` and `syncBalance()` methods, configure starting weapon assignment and base stat application.
   - Register in the character select UI (`game/src/ui/html/characterSelectModal.html`).
   - If headless core simulation is used — add mapping in `game/src/sim/SimWeapons.ts`.
4. **Textures and sprites**:
   - Place hero sprite: `public/textures/heroes/hero_<hero_id>_front.png`.
   - For non-standard paths, add an explicit mapping in `admin/src/constants.ts` -> `TEXTURE_MAP['hero-' + <hero_id>]`.
5. **Admin panel verification**:
   - The hero will automatically appear in the heroes table (`heroesView.ts`).
   - The hero will automatically appear in the damage simulator dropdown (`simulationView.ts`).
   - The hero will automatically appear in the comparative profile chart (`progressionView.ts`).
   - Hero counters on the dashboard and sidebar will update automatically (`kpi-heroes-count`, `sidebar-heroes-count`).

---

## 2. Adding a New Weapon (Weapon)

When creating a new weapon `<weapon_id>`:
1. **Weapon class implementation**:
   - Implement the weapon class in `game/src/combat/Weapon.ts` (or `InvokerWeapons.ts`), extending `Weapon`.
   - Implement damage calculation in the simulator `game/src/sim/SimWeapons.ts`.
2. **Level-up offering**:
   - Add the weapon to the level-up upgrade pool in `game/src/ui/HUD.ts` (`generateLevelUpOptions()`).
3. **Registration in default balance (`game/src/balance/defaultBalance.ts`)**:
   - Add entry to `DEFAULT_BALANCE.weapons[<weapon_id>]`:
     ```ts
     <weapon_id>: {
       id: '<weapon_id>',
       name: '<Weapon Name>',
       icon: '<Emoji or symbol>',
       damage: <base damage>,
       cooldown: <cooldown seconds>,
       damagePerLevel: <increase per level>,
       maxLevel: 20,
       // Optional attributes (supported and editable in the admin panel):
       range?: <number>,
       speed?: <number>,
       pierce?: <number>,
       count?: <number>,
       explosionRadius?: <number>,
       splashRadius?: <number>,
       fallSpeed?: <number>,
       knockback?: <number>,
       bleedDps?: <number>,
       bleedDuration?: <number>,
       orbitRadius?: <number>,
       orbitSpeed?: <number>,
       notes: '<Mechanics description>'
     }
     ```
4. **Icon and chart color (`admin/src/constants.ts`)**:
   - Place icon: `public/textures/weapons/weapon_<weapon_id>.png` (or mapping in `TEXTURE_MAP['weapon-' + <weapon_id>]`).
   - Set signature chart color in `WEAPON_COLORS[<weapon_id>]`.
5. **Admin panel verification**:
   - The weapon will automatically appear in the arsenal table (`weaponsView.ts`) with all parameters in the drawer.
   - The weapon is available in DPS simulator slots (`simulationView.ts`) and presets.
   - The weapon is rendered on damage and DPS progression charts (`progressionView.ts`).
   - Top-5 weapon ranking and total arsenal counter on the dashboard update automatically.

---

## 3. Adding a New Monster (Monster)

When creating a new monster type `<monster_id>`:
1. **Registration in game types and registry**:
   - `game/src/shared/types/entities.ts` -> add to `EnemyType`.
   - `game/src/shared/types/registry.ts` -> add to the `ENEMIES` array.
2. **Enemy manager (`game/src/entities/EnemyManager.ts`)**:
   - Add config in `EnemyManager.configs[<monster_id>]` (HP, speed, damage, dimensions, texture prefix, gem type).
   - Hook up synchronization in `EnemyManager.syncBalance()`.
3. **Registration in default balance (`game/src/balance/defaultBalance.ts`)**:
   - Add entry to `DEFAULT_BALANCE.monsters[<monster_id>]`:
     ```ts
     <monster_id>: {
       id: '<monster_id>',
       name: '<Monster Name>',
       hp: <base HP>,
       speed: <speed>,
       damage: <damage per hit>,
       gemType: 'blue' | 'green' | 'red' | 'gold',
       description: '<Behavior description>'
     }
     ```
4. **Texture and chart color (`admin/src/constants.ts`)**:
   - Place texture: `public/textures/monsters/monster_<monster_id>_front.png` (or mapping in `TEXTURE_MAP['monster-' + <monster_id>]`).
   - Set chart color in `MONSTER_COLORS[<monster_id>]`.
5. **Admin panel verification**:
   - The monster appears in the monsters table (`monstersView.ts`).
   - The monster is available in wave 0-60 min HP, speed, and damage scaling charts (`progressionView.ts`).
   - Enemy counters on the dashboard update automatically.

---

## 4. Adding a New Boss (Boss)

When creating a new boss `<boss_id>`:
1. **Registration in game (`game/src/entities/EnemyManager.ts`)**:
   - Add to `EnemyType` (if unique type) and in `EnemyManager.configs`.
   - Hook up synchronization in `EnemyManager.syncBalance()`.
2. **Registration in default balance (`game/src/balance/defaultBalance.ts`)**:
   - Add entry to `DEFAULT_BALANCE.bosses[<boss_id>]`:
     ```ts
     <boss_id>: {
       id: '<boss_id>',
       name: '<Boss Name>',
       hp: <base HP>,
       speed: <speed>,
       damage: <damage>,
       description: '<Phases/mechanics description>'
     }
     ```
3. **Texture and color (`admin/src/constants.ts`)**:
   - Place texture: `public/textures/bosses/boss_<boss_id>_front.png` (or mapping in `TEXTURE_MAP['boss-' + <boss_id>]`).
   - Set color in `MONSTER_COLORS[<boss_id>]`.
4. **Admin panel verification**:
   - The boss appears in the bosses table (`bossesView.ts`).
   - The boss appears in boss progression charts (`progressionView.ts`).
   - Boss pool counters update automatically.

---

## 5. Pre-commit Verification Checklist
Before submitting changes to Git, always execute:
1. `npm run index` — refresh codebase symbol index cache.
2. `npm run typecheck` — 0 errors.
3. `npm run build` — 0 errors (game build).
4. `npm run build:admin` — 0 errors (admin panel build).
5. `npm test` — all test suites pass.
6. Verify that the new entity correctly displays icon, name, and numeric stats without NaN/undefined.

