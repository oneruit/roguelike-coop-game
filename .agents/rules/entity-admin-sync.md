---
description: Обязательное правило: при добавлении нового персонажа, оружия, монстра или босса в игру обязательно регистрировать их в дефолтном балансе и админ-панели
globs: ["game/src/**/*", "admin/**/*"]
---

# Правило синхронизации игровых сущностей с Админ-панелью

При добавлении в игру любого нового **персонажа (героя)**, **оружия**, **рядового монстра** или **босса**, **строго обязательно** синхронизировать его с системой баланса (`DEFAULT_BALANCE`) и Админ-панелью (`admin/`).

---

## 1. Добавление нового персонажа (Hero / Character)

При создании нового героя `<hero_id>`:
1. **Регистрация в типах и реестре игры**:
   - `game/src/shared/types/entities.ts` -> добавить в `CharacterType`.
   - `game/src/shared/types/registry.ts` -> добавить в массив `CHARACTERS`.
2. **Регистрация в балансе (`game/src/balance/defaultBalance.ts`)**:
   - Добавить объект героя в `DEFAULT_BALANCE.heroes[<hero_id>]`:
     ```ts
     <hero_id>: {
       id: '<hero_id>',
       name: '<Имя (Класс)>',
       maxHp: <число>,
       baseSpeed: <число>,
       damageMultiplier: <число>,
       startingWeapon: '<weapon_id>',
       role: '<Краткое описание роли>'
     }
     ```
3. **Игровая логика персонажа (`game/src/entities/Player.ts`)**:
   - В методах `init()` и `syncBalance()` настроить выдачу стартового оружия и применение базовых статов.
   - Зарегистрировать в UI выбора персонажа (`game/src/ui/html/characterSelectModal.html`).
   - Если используется симуляция ядра — добавить сопоставление в `game/src/sim/SimWeapons.ts`.
4. **Текстуры и спрайты**:
   - Поместить спрайт героя: `public/textures/heroes/hero_<hero_id>_front.png`.
   - При нестандартном пути добавить явный маппинг в `admin/src/constants.ts` -> `TEXTURE_MAP['hero-' + <hero_id>]`.
5. **Проверка в Админ-панели**:
   - Герой автоматически появится в таблице героев (`heroesView.ts`).
   - Герой автоматически появится в выпадающем списке симулятора урона (`simulationView.ts`).
   - Герой автоматически появится на графике сравнительного профиля (`progressionView.ts`).
   - Счетчик героев на дашборде и в сайдбаре обновится автоматически (`kpi-heroes-count`, `sidebar-heroes-count`).

---

## 2. Добавление нового оружия (Weapon)

При создании нового оружия `<weapon_id>`:
1. **Реализация класса оружия**:
   - Реализовать класс оружия в `game/src/combat/Weapon.ts` (или `InvokerWeapons.ts`), наследующий `Weapon`.
   - Реализовать расчет в симуляторе `game/src/sim/SimWeapons.ts`.
2. **Выдача при прокачке**:
   - Добавить предложение оружия в пул прокачки уровня в `game/src/ui/HUD.ts` (`generateLevelUpOptions()`).
3. **Регистрация в балансе (`game/src/balance/defaultBalance.ts`)**:
   - Добавить запись в `DEFAULT_BALANCE.weapons[<weapon_id>]`:
     ```ts
     <weapon_id>: {
       id: '<weapon_id>',
       name: '<Название оружия>',
       icon: '<Эмодзи или символ>',
       damage: <базовый урон>,
       cooldown: <секунды кулдауна>,
       damagePerLevel: <прирост за уровень>,
       maxLevel: 20,
       // Опциональные характеристики (поддерживаются и редактируются в админ-панели):
       range?: <число>,
       speed?: <число>,
       pierce?: <число>,
       count?: <число>,
       explosionRadius?: <число>,
       splashRadius?: <число>,
       fallSpeed?: <число>,
       knockback?: <число>,
       bleedDps?: <число>,
       bleedDuration?: <число>,
       orbitRadius?: <число>,
       orbitSpeed?: <число>,
       notes: '<Описание механики>'
     }
     ```
4. **Иконка и цвет для графиков (`admin/src/constants.ts`)**:
   - Поместить иконку: `public/textures/weapons/weapon_<weapon_id>.png` (или маппинг в `TEXTURE_MAP['weapon-' + <weapon_id>]`).
   - Задать фирменный цвет для графиков в `WEAPON_COLORS[<weapon_id>]`.
5. **Проверка в Админ-панели**:
   - Оружие автоматически появится в таблице арсенала (`weaponsView.ts`) со всеми параметрами в дровере.
   - Оружие доступно в слотах симулятора DPS (`simulationView.ts`) и в пресетах.
   - Оружие отображается на графиках прогрессии урона и DPS (`progressionView.ts`).
   - Рейтинг Top-5 оружия и общий счетчик арсенала на дашборде обновятся автоматически.

---

## 3. Добавление нового рядового монстра (Monster)

При создании нового типа монстра `<monster_id>`:
1. **Регистрация в типах и реестре игры**:
   - `game/src/shared/types/entities.ts` -> добавить в `EnemyType`.
   - `game/src/shared/types/registry.ts` -> добавить в массив `ENEMIES`.
2. **Менеджер врагов (`game/src/entities/EnemyManager.ts`)**:
   - Добавить конфиг в `EnemyManager.configs[<monster_id>]` (HP, скорость, урон, размеры, префикс текстур, тип гема).
   - Подключить синхронизацию в `EnemyManager.syncBalance()`.
3. **Регистрация в балансе (`game/src/balance/defaultBalance.ts`)**:
   - Добавить запись в `DEFAULT_BALANCE.monsters[<monster_id>]`:
     ```ts
     <monster_id>: {
       id: '<monster_id>',
       name: '<Название монстра>',
       hp: <базовое HP>,
       speed: <скорость>,
       damage: <урон за удар>,
       gemType: 'blue' | 'green' | 'red' | 'gold',
       description: '<Описание поведения>'
     }
     ```
4. **Текстура и цвет графика (`admin/src/constants.ts`)**:
   - Поместить текстуру: `public/textures/monsters/monster_<monster_id>_front.png` (или маппинг в `TEXTURE_MAP['monster-' + <monster_id>]`).
   - Задать цвет для графиков в `MONSTER_COLORS[<monster_id>]`.
5. **Проверка в Админ-панели**:
   - Монстр появится в таблице монстров (`monstersView.ts`).
   - Монстр доступен в графиках скейлинга HP, скорости и урона волны 0-30 мин (`progressionView.ts`).
   - Счетчики врагов на дашборде обновятся автоматически.

---

## 4. Добавление нового босса (Boss)

При создании нового босса `<boss_id>`:
1. **Регистрация в игре (`game/src/entities/EnemyManager.ts`)**:
   - Добавить в `EnemyType` (если уникальный тип) и в `EnemyManager.configs`.
   - Подключить синхронизацию в `EnemyManager.syncBalance()`.
2. **Регистрация в балансе (`game/src/balance/defaultBalance.ts`)**:
   - Добавить запись в `DEFAULT_BALANCE.bosses[<boss_id>]`:
     ```ts
     <boss_id>: {
       id: '<boss_id>',
       name: '<Имя босса>',
       hp: <базовое HP>,
       speed: <скорость>,
       damage: <урон>,
       description: '<Описание фаз/особенностей>'
     }
     ```
3. **Текстура и цвет (`admin/src/constants.ts`)**:
   - Поместить текстуру: `public/textures/bosses/boss_<boss_id>_front.png` (или маппинг в `TEXTURE_MAP['boss-' + <boss_id>]`).
   - Задать цвет в `MONSTER_COLORS[<boss_id>]`.
4. **Проверка в Админ-панели**:
   - Босс появится в таблице боссов (`bossesView.ts`).
   - Босс появится на графиках прогрессии боссов (`progressionView.ts`).
   - Счетчики пула боссов обновятся автоматически.

---

## 5. Чек-лист проверки перед коммитом
Перед отправкой изменений в Git обязательно выполнить:
1. `npm run typecheck` — 0 ошибок.
2. `npm run build` — 0 ошибок (сборка игры).
3. `npm run build:admin` — 0 ошибок (сборка админ-панели).
4. Проверить, что у новой сущности корректно отображается иконка, имя и числовые статы без NaN/undefined.
