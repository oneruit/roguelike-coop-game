# 📊 Complete Game Balance Reference Guide

> This document is based on the project codebase (`src/combat`, `src/entities`, `src/drops`, `src/items`, `src/director`, `src/world`).  
> Designed for analyzing game balance, identifying bottlenecks, and adjusting numerical parameters.

---

## 📑 Table of Contents
1. [Character (Hero) Attributes](#1-character-hero-attributes)
2. [Weapons: Damage, Timings, and 20 Upgrade Levels](#2-weapons-damage-timings-and-20-upgrade-levels)
3. [Passives & Relics from Chests (Rift Items)](#3-passives--relics-from-chests-rift-items)
4. [Monster Drops: Experience Gems & Passive Buffs](#4-monster-drops-experience-gems--passive-buffs)
5. [Monster Attributes & Scaling Formulas](#5-monster-attributes--scaling-formulas)
6. [Boss Attributes & Scaling by Time / Stages](#6-boss-attributes--scaling-by-time--stages)

---

## 1. Character (Hero) Attributes

The game features **6 unique heroes**. Character selection determines base health, movement speed, base damage multiplier, and initial starting weapon.

### 1.1. Hero Base Attribute Comparison Table

| Hero | ID | Starting Weapon | Base HP | Base Speed | Damage Multiplier | Core Role / Trait |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Ren (Ronin)** | `ronin` | Crimson Whirlwind (`whirlwind_slash`) | **115** | 8.6 m/s | **x1.35** | Balanced melee fighter with circular AOE clearing |
| **Kaela (Valkyrie)** | `valkyrie` | Greatsword (`greatsword`) | **135** *(max)* | 8.2 m/s *(min)* | **x1.45** *(max)* | Ultra-durable tank with highest single-hit damage and wide arc |
| **Brigitte** | `flail` | Flail (`flail`) | **125** | 8.5 m/s | **x1.40** | Physical crowd control with heavy enemy knockback |
| **Aria (Sorceress)** | `sorceress` | Astral Staff (`astral_staff`) | **105** *(min)* | 8.8 m/s | **x1.30** | Long-range mage with piercing fan projectiles, fragile up close |
| **Kira** | `chakram` | Dancing Chakram (`chakram`) | **115** | 8.7 m/s | **x1.35** | Mobile skirmisher with ricocheting boomerangs cutting through crowds |
| **Elf Archer** | `archer` | Hunting Bow (`bow`) | **110** | 8.9 m/s *(max)* | **x1.35** | High-speed sniper with long-range piercing arrows |

---

### 1.2. Shared Base Character Attributes

| Attribute | Base Value | Upgrade Source / Modifier | Hard Cap |
| :--- | :---: | :--- | :---: |
| **Tactical Dash** | CD: **2.5 s**, dur: **0.22 s** | Dash speed: **x2.5** current movement speed | Full collision invulnerability |
| **Critical Strike Chance** | **5% (0.05)** | +12% per stack of Sniper Visor (`crit_visor`) | 100% |
| **Critical Strike Damage** | **200% (x2.0)** | Fixed | x2.0 |
| **Pickup Radius (Magnet)** | **3.5 m** | x1.35 per stack of Magnetic Lasso (`stat_lasso`) | **25.0 m** |
| **Health Regeneration** | **0 HP/s** | +1.5 HP/s (Hunter's Amulet), +2.5 HP/s (Bio-Injector) | **30.0 HP/s** |
| **Damage Reduction (Armor)** | **0%** | +10% (Leather Vest), diminishing returns (Nano-Plating) | **75% (0.75)** |
| **Cooldown Reduction (CDR)** | **0%** | -8% (Pocket Watch), x0.85 (Kinetic Accelerator) | **70-80%** (CD min 0.12–0.30s) |
| **Energy Shield** | **0 HP** | +35 HP per stack of Aegis Battery (`aegis_battery`) | Regens 25% shield/s out of combat (3s delay) |

---

### 1.3. Character Experience Progression Curve

Experience required to progress from level $L$ to level $L+1$:
$$\text{XP}(L) = \lfloor 10 \cdot L^{1.5} \cdot 1.2 \rfloor = \lfloor 12 \cdot L^{1.5} \rfloor$$

| Level (L) | XP to Next Level ($\Delta\text{XP}$) | Cumulative Experience ($\sum\text{XP}$) |
| :---: | :---: | :---: |
| **1** | 12 XP | 0 XP |
| **2** | 33 XP | 12 XP |
| **3** | 62 XP | 45 XP |
| **4** | 96 XP | 107 XP |
| **5** | 134 XP | 203 XP |
| **6** | 176 XP | 337 XP |
| **7** | 222 XP | 513 XP |
| **8** | 271 XP | 735 XP |
| **9** | 324 XP | 1 006 XP |
| **10** | 379 XP | 1 330 XP |
| **15** | 697 XP | 4 012 XP |
| **20** | 1 073 XP | 8 438 XP |
| **25** | 1 500 XP | 14 870 XP |
| **30** | 1 971 XP | 23 548 XP |

---

## 2. Weapons: Damage, Timings, and 20 Upgrade Levels

All weapons in the game scale up to **Level 20**. There are **13 weapons** available.

### 2.1. Summary Table of Base (Level 1) Weapon Attributes

| Weapon | ID | Icon | Damage (L1) | Cooldown (L1) | Radius / Range | Projectiles / Swings | Pierce | Attack Mechanics |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Hunting Bow** | `bow` | 🏹 | **25** | 0.85 s | Full visibility | 1 arrow | 2 enemies | High-speed arrows (24 m/s) |
| **Kukri Knife** | `kukri` | 🔪 | **11** | 0.65 s | Full visibility | 2 knives | 1 enemy | Rapid burst of spinning thrown blades |
| **Reaper Scythe** | `reaper_scythe` | 🌙 | **4** (+8 bleed/s) | 0.00 s (continuous) | 2.5 m (orbit) | 2 scythes | Infinite | Orbiting scythes applying stacking bleed |
| **Ring of Fire** | `fire_ring` | 🔥 | **15** | 0.50 s | 3.5 m (aura) | Pulse | All in radius | Animated expanding flame ring with tick damage |
| **Katana Slash** | `katana_slash` | 🗡️ | **24** | 0.60 s | 3.8 m | 1 swing | All in radius | Arc cleave power slash |
| **Crimson Whirlwind** | `whirlwind_slash` | 🌪️ | **15** | 0.42 s | 3.6 m | 1 whirlwind | All in radius | Rapid dual whirlwind cleave |
| **Greatsword** | `greatsword` | ⚔️ | **30** | 0.70 s | 4.2 m | 1 swing | All in radius | Heavy circular swing with massive coverage |
| **Flail** | `flail` | ⛓️ | **19** | 0.52 s | 3.9 m | 1 swing | All in radius | Heavy enemy knockback (Knockback 0.35) |
| **Astral Staff** | `astral_staff` | 🔮 | **21** | 0.65 s | 22 m | 1 projectile | 2 enemies | Astral arcane bolts (16 m/s) |
| **Dancing Chakram** | `chakram` | 🪃 | **19** | 0.70 s | 20 m | 1 chakram | Infinite | Returning arc boomerang (14.5 m/s) |
| **Lightning Strike** | `lightning_strike` | ⚡ | **42** | 1.20 s | 22 m (dist) / 2.4 m (splash) | 1 strike | Splash AOE | Vertical lightning bolt from the heavens |
| **Ice Spike** | `ice_spike` | 🧊 | **36** | 1.10 s | 18 m (dist) / 2.0 m (splash) | 1 spike | Splash AOE | Piercing ice spikes erupting from the ground |
| **Fireball** | `fireball` | ☄️ | **52** | 1.35 s | 22 m (dist) / 2.5 m (splash) | 1 ball | Splash AOE | Falling meteor detonating on impact (28 m/s) |
| **Assault Rifle** | `assault_rifle` | 🔫 | **13** | 0.18 s | 32 m (dist) | 1 bullet | 1 enemy | Rapid automatic rifle fire |

---

### 2.2. Weapon Level-by-Level Scaling (Up to Level 20)

#### 1. Hunting Bow (`bow`)
- **Base**: 26 damage, 0.85s CD, 1 arrow, 2 pierce.
- **Growth per level**: +6 damage per level.
- **Projectile milestones**: +1 arrow at levels **[4, 8, 12, 16, 20]** *(up to 6 arrows)*.
- **Pierce milestones**: +1 pierce at levels **[3, 6, 9, 13, 17]** *(up to 7 enemies)*.
- **Cooldown milestones**: -7% cooldown at levels **[2, 5, 7, 10, 14, 18]** *(min 0.40s)*.
- **Level 20 Stats**: **140 damage**, **6 arrows**, **7 pierce**, **0.54s CD**.

#### 2. Kukri Knife (`kukri`)
- **Base**: 12 damage, 0.65s CD, 2 burst knives, 1 pierce.
- **Growth per level**: +3 damage per level.
- **Burst milestones**: +1 knife per burst at levels **[2, 4, 6, 8, 10, 12, 14, 16, 18, 20]** *(up to 12 knives)*.
- **Pierce milestones**: +1 pierce at levels **[10, 20]** *(up to 3 enemies)*.
- **Cooldown milestones**: -6% cooldown at levels **[3, 5, 7, 9, 11, 13, 15, 17, 19]** *(min 0.25s)*.
- **Level 20 Stats**: **69 damage**, **12 knives per burst**, **3 pierce**, **0.37s CD**.

#### 3. Reaper Scythe (`reaper_scythe`)
- **Base**: 4 direct damage, 8 bleed damage/s (duration 3.0s = 24 total damage per stack, stacks indefinitely on successive contacts), 2 scythes, 2.5m radius, 3.8 rad/s speed. Scythes orbit around the hero, inflicting stacking bleed on touched monsters.
- **Growth per level**: +1 direct damage, +2 bleed DPS (+6 total damage per stack), +0.20m orbit radius, +0.08 orbit speed per level.
- **Scythe milestones**: +1 scythe at levels **[3, 6, 9, 12, 15, 18, 20]** *(up to 9 scythes)*.
- **Level 20 Stats**: **23 direct damage**, **46 bleed DPS** (138 total damage over 3s from a single stack), **9 scythes**, **6.30m orbit radius**, **5.32 rad/s speed**.

#### 4. Ring of Fire (`fire_ring`)
- **Base**: 16 damage, 0.50s CD (tick), 3.5m radius. Frame-by-frame animated blazing fire sprite sheet (16 frames in a 4x4 grid, 18 FPS).
- **Growth per level**: +4 damage, +0.20m radius, -4% CD (min 0.22s) per level.
- **Level 20 Stats**: **92 damage**, **7.30m AOE radius**, **0.23s tick interval**.

#### 5. Katana Slash (`katana_slash`)
- **Base**: 25 damage, 0.60s CD, 3.8m swing radius.
- **Growth per level**: +6 damage, +0.14m swing radius, -4% CD (min 0.30s) per level.
- **Level 20 Stats**: **139 damage**, **6.46m swing radius**, **0.30s CD**.

#### 6. Crimson Whirlwind (`whirlwind_slash`)
- **Base**: 16 damage, 0.42s CD, 3.6m whirlwind radius.
- **Growth per level**: +4 damage, +0.12m whirlwind radius, -4% CD (min 0.20s) per level.
- **Level 20 Stats**: **92 damage**, **5.88m whirlwind radius**, **0.20s CD**.

#### 7. Greatsword (`greatsword`)
- **Base**: 32 damage, 0.70s CD, 4.2m swing radius.
- **Growth per level**: +7 damage, +0.15m swing radius, -4% CD (min 0.35s) per level.
- **Level 20 Stats**: **165 damage**, **7.05m swing radius**, **0.35s CD**.

#### 8. Flail (`flail`)
- **Base**: 20 damage, 0.52s CD, 3.9m radius, knockback 0.35.
- **Growth per level**: +5 damage, +0.14m flail radius, +0.02 knockback force, -4% CD (min 0.25s) per level.
- **Level 20 Stats**: **115 damage**, **6.56m flail radius**, **0.73 knockback force**, **0.25s CD**.

#### 9. Astral Staff (`astral_staff`)
- **Base**: 22 damage, 0.65s CD, 1 bolt, 2 pierce.
- **Growth per level**: +5 damage per level.
- **Projectile milestones**: +1 bolt in fan arc at levels **[3, 6, 9, 12, 15, 18, 20]** *(up to 8 bolts)*.
- **Pierce milestones**: +1 pierce at levels **[4, 8, 12, 16, 20]** *(up to 7 enemies)*.
- **Cooldown milestones**: -6% cooldown at levels **[2, 5, 7, 10, 14, 17]** *(min 0.30s)*.
- **Level 20 Stats**: **117 damage**, **8 fan bolts**, **7 pierce**, **0.45s CD**.

#### 10. Dancing Chakram (`chakram`)
- **Base**: 20 damage, 0.70s CD, 1 chakram, infinite pierce, 14.5 m/s flight speed.
- **Growth per level**: +4 damage per level.
- **Chakram milestones**: +1 chakram at levels **[4, 8, 12, 16, 20]** *(up to 6 chakrams)*.
- **Flight speed milestones**: +1.2 m/s at levels **[2, 5, 10, 15]** *(up to 19.3 m/s)*.
- **Cooldown milestones**: -6% cooldown at levels **[3, 6, 9, 13, 17]** *(min 0.30s)*.
- **Level 20 Stats**: **96 damage**, **6 chakrams**, **19.3 m/s speed**, **0.51s CD**.

#### 11. Lightning Strike (`lightning_strike`)
- **Base**: 45 damage, 1.20s CD, 1 strike, 2.4m splash radius, 22m range.
- **Growth per level**: +8 damage per level.
- **Strike milestones**: +1 lightning bolt at levels **[4, 8, 12, 16, 20]** *(up to 6 bolts)*.
- **Splash radius milestones**: +0.30m at levels **[5, 10, 15]** *(up to 3.3m)*.
- **Cooldown milestones**: -8% cooldown at levels **[3, 6, 9, 13, 17]** *(min 0.40s)*.
- **Level 20 Stats**: **197 damage**, **6 bolts**, **3.30m blast radius**, **0.79s CD**.

#### 12. Ice Spike (`ice_spike`)
- **Base**: 38 damage, 1.10s CD, 1 spike, 2.0m blast radius, 18m range.
- **Growth per level**: +7 damage per level.
- **Spike milestones**: +1 ice spike at levels **[4, 8, 12, 16, 20]** *(up to 6 spikes)*.
- **Blast radius milestones**: +0.25m at levels **[5, 10, 15]** *(up to 2.75m)*.
- **Cooldown milestones**: -7% cooldown at levels **[3, 6, 9, 13, 17]** *(min 0.35s)*.
- **Level 20 Stats**: **171 damage**, **6 ice spikes**, **2.75m blast radius**, **0.76s CD**.

#### 13. Fireball (`fireball`)
- **Base**: 55 damage, 1.35s CD, 1 fireball, 2.5m blast radius, 22m range, 28 m/s speed.
- **Growth per level**: +10 damage per level.
- **Fireball milestones**: +1 fireball at levels **[4, 8, 12, 16, 20]** *(up to 6 fireballs)*.
- **Blast radius milestones**: +0.35m at levels **[5, 10, 15]** *(up to 3.55m)*.
- **Cooldown milestones**: -8% cooldown at levels **[3, 6, 9, 13, 17]** *(min 0.40s)*.
- **Level 20 Stats**: **245 damage**, **6 fireballs**, **3.55m blast radius**, **0.89s CD**, **28 m/s impact speed**.

---

## 3. Passives & Relics from Chests (Rift Items)

Chests spawn deterministically (16 per stage). Opening a chest requires gold dropped by monsters.

### 3.1. Chest Types and Drop Rate Table

| Chest Type | Base Cost | Common Chance (White) | Uncommon Chance (Green) | Legendary Chance (Red) | Map Spawn Weight |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Small Chest** | **25 Gold** | **80%** | **20%** | **0%** | ~55% of all chests |
| **Large Chest** | **50 Gold** | **20%** | **70%** | **10%** | ~30-45% of chests |
| **Legendary Chest** | **100 Gold** | **0%** | **10%** | **90%** | 15% (from stage 2) |

> 💡 **Dynamic Chest Cost Formula across Time and Stage**:  
> $$\text{Cost}(t, \text{stage}) = \text{round}\left(\text{BaseCost} \cdot \left(1 + \frac{t}{300}\right)^{0.75} \cdot 1.1^{\text{stage} - 1}\right)$$

---

### 3.2. Chest Items and Relics Table

| Item | ID | Rarity | Icon | Base Effect | Effect per Stack |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Kinetic Injector** | `kinetic_injector` | Common | ⚡ | **+15%** weapon attack speed | Multiplies CD by $\times 0.85^{\text{stacks}}$ |
| **Nanite Plating** | `nanite_plating` | Common | 🛡️ | Diminishing damage reduction (5% at L1 up to 60% at L20) | Diminishing returns scaling up to 60% cap |
| **Adrenaline Dart** | `adrenaline_dart` | Common | 💉 | **+12%** movement speed | +12% movement speed per stack |
| **Pulse Rounds** | `pulse_rounds` | Common | 🩸 | **15%** chance to inflict bleed (180% damage over 3s) | +15% chance per stack |
| **Bio-Injector** | `health_vial` | Common | 🧪 | **+2.5 HP/s** passive health regeneration | +2.5 HP/s per stack |
| **Chain Lightning** | `chain_lightning` | Uncommon | 🌩️ | **25%** chance to trigger chain lightning on 3 targets (160% damage) | +2 targets and +30% damage per stack |
| **Plasma Detonator** | `plasma_detonator` | Uncommon | 💥 | On kill, enemy explodes (4m radius, **200%** damage) | +1m radius and +50% damage per stack |
| **Sniper Visor** | `crit_visor` | Uncommon | 🎯 | **+12%** critical strike chance (base x2.0 damage) | +12% crit chance per stack |
| **Aegis Battery** | `aegis_battery` | Uncommon | 💠 | Grants an energy shield with **+35 HP**, recharges out of combat | +35 max shield capacity per stack |
| **Bio-Leech** | `bio_leech` | Uncommon | 🧬 | Restores **+2 HP** per monster kill | +2 HP per stack |
| **Singularity Core** | `singularity_core` | Legendary | 🕳️ | Every **10th kill** spawns a black hole detonating for **600%** damage | -2 kills required, +200% damage per stack |
| **Orbital Strike** | `orbital_strike` | Legendary | 🛰️ | Every **12 s**, an orbital beam incinerates the strongest enemy for **800%** | -2 s CD per stack |
| **Chronos Phylactery**| `chronos_phylactery`| Legendary | ⏳ | Cheat-death: freezes monsters & bosses for **5 s**, knocks back **25m**, heals **50% HP** (once per stage) | +25% healing per stack |
| **Titan Eye** | `golem_core` | Boss (Yellow) | 👁️ | Periodic kinetic beam stunning enemies | +50% beam damage per stack |
| **Molten Scale** | `molten_scale` | Boss (Yellow) | 🔥 | Leaves a fiery trail behind the hero burning pursuers | +40% fire damage per stack |

---

## 4. Monster Drops: Experience Gems & Passive Buffs

### 4.1. Gem Types

| Gem Type | Color | Model / Aura | Experience (XP) | Extra Effect |
| :--- | :---: | :---: | :---: | :--- |
| **Blue Gem** | Light Blue (`#00e5ff`) | Octahedron 0.28m | **3 XP** | Standard gem from common monsters |
| **Green Gem** | Green (`#00e676`) | Octahedron 0.36m | **12 XP** | Drops from tougher foes (skeletons, ghosts, scorpions, brutes) |
| **Red Gem** | Red (`#ff1744`) | Octahedron 0.45m | **40 XP** | Drops from bisons, elites, and bosses |
| **Gold Gem** | Gold (`#ffd700`) | Octahedron with golden torus | **20 XP** | **Grants a permanent random run passive buff!** |

---

### 4.2. Monster Drop Probability Table

| Enemy Category | Examples | XP Gem Drop | Gold Gem Chance (Passives) | Gold (Credits) |
| :--- | :--- | :---: | :---: | :---: |
| **Common Mobs** | Coyote, Crawler, Cactus | Blue Gem (3 XP) | **1.0%** | 3 Gold |
| **Medium Mobs** | Skeleton, Ghost | Green Gem (12 XP) | **1.0%** | 3 Gold |
| **Tough Mobs** | Scorpion, Brute, Bison | Green / Red (12-40 XP) | **3.0%** | 3 Gold |
| **Elite Mobs (Affix)** | Any monster with an aura | Green / Red (12-40 XP) | **3.0%** | **16 Gold** |
| **Stage / 5-min Boss** | Demon, Hydra | **5 + 2*Tier Red Gems** (280-440 XP) | **40.0%** | **100-270 Gold** |

---

### 4.3. Passive Buffs from Gold Gems (`PassiveBuffs`)

Picking up a gold gem awards one of 7 passives:

| Passive | ID | Icon | Effect per Gem | Maximum Cap | Balance Impact |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **Sheriff Star** | `stat_sheriff_star` | ⭐ | **+2%** global damage multiplier | No cap (multiplicative) | Adds +20–40% total DPS by minute 20 |
| **Fleet Spurs** | `stat_spurs` | 👢 | **+3%** movement speed | **x2.5** (max 20–22 m/s) | Allows comfortable kiting of bisons and bosses |
| **Whiskey Flask** | `stat_flask` | 🍶 | **+30 Max HP** + full instant heal | No cap | Emergency rescue and health pool scaling |
| **Magnetic Lasso** | `stat_lasso` | ➰ | **+35%** XP pickup radius | **25.0 meters** | Vacuums XP without entering monster packs |
| **Hunter's Amulet** | `stat_amulet` | 🧿 | **+1.5 HP/s** health regeneration | **30.0 HP/s** | Core passive sustain |
| **Leather Vest** | `stat_vest` | 🦺 | **-10%** damage taken | **70% (0.70)** | Crucial defensive stat against high-tier attacks |
| **Pocket Watch** | `stat_watch` | ⏱️ | **+8%** weapon attack speed (-8% CD) | **70% (0.30 multiplier)** | Amplifies fire rate across all weapons |

---

### 4.4. Temporary Buffs from Altars (`Altar`)

| Altar | Icon | Duration | Effect |
| :--- | :---: | :---: | :--- |
| **Altar of Wrath** | ⚔️ | **25 s** | **+80%** hero damage |
| **Altar of Wind** | ⚡ | **20 s** | **+60%** movement speed |
| **Altar of Life** | 💖 | **18 s** | **+12 HP/s** health regeneration |
| **Altar of Invulnerability** | 🛡️ | **12 s** | **100% invulnerability** to all damage |

---

## 5. Monster Attributes & Scaling Formulas

### 5.1. Base Monster Attributes (Minute 0)

| Monster | ID | Health (HP) | Speed | Damage per Hit | Hitbox Size | XP Gem | Behavioral Traits |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Bloodthirsty Coyote** | `coyote` | **52** | 5.4 m/s | **10** | 2.1 x 1.6 m | Blue (3 XP) | Starter pack runner, charges straight at hero |
| **Crawling Vermin** | `crawler` | **45** | 6.0 m/s | **12** | 2.0 x 1.2 m | Blue (3 XP) | Fast chaser with low HP |
| **Cactus Zombie** | `cactus` | **95** | 3.5 m/s | **16** | 1.9 x 2.3 m | Blue (3 XP) | Slow, bulky zombie |
| **Skeleton Bandit** | `skeleton` | **120** | 3.8 m/s | **18** | 1.9 x 2.4 m | Green (12 XP) | Mid-tier skeletal warrior |
| **Cowboy Phantom** | `ghost` | **150** | 4.0 m/s | **20** | 1.7 x 2.5 m | Green (12 XP) | **Phases through obstacles, rocks, and cacti!** |
| **Desert Scorpion** | `scorpion` | **210** | 3.2 m/s | **25** | 2.3 x 2.1 m | Green (12 XP) | Tough frontline tank |
| **Desert Brute** | `brute` | **380** | 2.6 m/s | **32** | 2.5 x 2.7 m | Green (12 XP) | Heavy armored juggernaut |
| **White Killer Bison** | `bison` | **800** | 4.8 m/s | **40** | 3.4 x 1.9 m | Red (40 XP) | **Fast, deadly bruiser** (charge attacks) |

---

### 5.2. Elite Affixes

Elite spawn chance:
$$P_{\text{elite}}(m, \text{stage}) = \begin{cases} 
\min\left(0.35, \; \frac{m}{20} \cdot 0.35 + (\text{stage} - 1) \cdot 0.05\right), & m \le 15 \\
\min\left(0.70, \; 0.26 + (m - 15) \cdot 0.016\right), & m > 15 
\end{cases}$$

- On spawn, an elite monster receives:
  - **HP**: $\mathbf{\times 2.2}$ scaled base health.
  - **Damage**: $\mathbf{\times 1.35}$ scaled base damage.
  - **Gold drop**: **16 credits** (instead of 3).
  - **Visual aura**:
    - 🔥 **Blazing (`blazing`)**: Crimson flame aura (`#ef4444`).
    - ❄️ **Glacial (`glacial`)**: Frosted azure aura (`#38bdf8`).
    - ⚡ **Overloading (`overloading`)**: Electric violet aura (`#818cf8`).

---

### 5.3. Monster Time Scaling Formulas (0–40 Minutes)

Let $m = \frac{\text{gameTime}}{60}$ (elapsed minutes) and $m_{\text{post}} = \max(0, m - 15)$:
$$\text{HpMult}(m) = 1 + \left(0.35 \cdot m + \left(\frac{m}{4.0}\right)^{1.8} \cdot 0.45\right) \cdot 1.5 + \left(\frac{m_{\text{post}}}{3.5}\right)^{2.3} \cdot 3.5 \cdot (1 + 0.15 \cdot m_{\text{post}})$$
$$\text{DmgMult}(m) = 1 + \left(0.15 \cdot m + \left(\frac{m}{6.0}\right)^{1.5} \cdot 0.30\right) \cdot 1.5 + \left(\frac{m_{\text{post}}}{4.0}\right)^{2.0} \cdot 1.8 \cdot (1 + 0.10 \cdot m_{\text{post}})$$
$$\text{SpeedMult}(m) = \min\left(1.65, \; 1 + (0.012 \cdot m) \cdot 1.5 + m_{\text{post}} \cdot 0.01\right)$$

#### Monster Scaling Multiplier Table:

| Elapsed (min) | HP Multiplier ($\text{HpMult}$) | Damage Multiplier ($\text{DmgMult}$) | Speed Multiplier ($\text{SpdMult}$) | Elite Chance | Wave Spawn Interval |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **0 min** | **x1.00** | **x1.00** | **x1.00** | 0% | 1.00 s |
| **5 min** | **x4.60** | **x2.50** | **x1.09** | 9% | 0.25 s |
| **10 min** | **x9.80** | **x4.20** | **x1.18** | 18% | 0.18 s |
| **15 min** | **x16.10** | **x6.20** | **x1.27** | **26%** | **0.18 s** |
| **20 min** | **x37.70** | **x12.50** | **x1.41** | 35% | 0.18 s |
| **25 min** | **x130.60** | **x33.00** | **x1.55** | 51% | 0.16 s |
| **30 min** | **x366.60** | **x76.10** | **x1.65** *(cap)* | 59% | 0.15 s |
| **35 min** | **x829.20** | **x150.20** | **x1.65** *(cap)* | 67% | 0.14 s |
| **40 min** | **x1615.70** | **x263.80** | **x1.65** *(cap)* | **70%** *(cap)* | **0.14 s** *(cap)* |

> 📌 **Example**: At minute 15, a Coyote has **837 HP** and deals **62 damage** (inflection point). At minute 20, a Coyote has **1,960 HP** and deals **125 damage**, while a Bison has **30,160 HP** and **500 damage**. At minute 40, a Coyote has **84,016 HP** and deals **2,638 damage**, while a Bison has **1,292,560 HP** and **10,552 damage**!

---

### 5.4. Monster Wave Schedule

| Timeline (min) | Active Enemy Types | Spawns per Wave | Max Concurrent Enemies |
| :--- | :--- | :--- | :---: |
| **00:00 – 01:00** | Coyotes, Crawlers | 1 mob | 95 mobs |
| **01:00 – 02:00** | Coyotes, Crawlers, Cacti, Skeletons | 1–2 mobs | 97 mobs |
| **02:00 – 03:00** | Cacti, Skeletons, Scorpions, Ghosts | 1–2 mobs | 99 mobs |
| **03:00 – 04:00** | Brutes, Scorpions, Ghosts, Skeletons | 1–2 mobs | 101 mobs |
| **04:00 – 05:00** | Bisons, Brutes, Scorpions, Ghosts | 2 mobs | 103 mobs |
| **05:00 – 10:00** | Heavy frontline: Bisons and Brutes with Scorpions | 3 mobs | 105–115 mobs |
| **10:00 – 15:00** | Mixed aggressive hordes with frequent Bisons | 3–4 mobs | 115–125 mobs |
| **15:00 – 20:00** | Continuous waves of Bisons, Brutes, and Ghosts | 4–5 mobs | 125–135 mobs |
| **20:00 – 25:00** | Relentless elite swarms of Bisons and Brutes | 5 mobs | 135–145 mobs |
| **25:00 – 30:00** | Void Breach: armored rush assault | 6 mobs | 155–170 mobs |
| **30:00 – 35:00** | Endless Rift: incessant waves of Bisons and Ghosts | 7 mobs | 175–195 mobs |
| **35:00 – 40:00** | Apocalypse: maximum density of elite tanks | 8 mobs | **up to 220 mobs** (up to 260 in co-op) |
| **40:00+** | **Void Singularity**: run climax | 8 mobs | 220 mobs |

---

## 6. Boss Attributes & Scaling by Time / Stages

### 6.1. Base Bosses

| Boss | ID | Base HP | Base Damage | Speed | Dimensions | Drops |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Blood Demon** | `boss` | **7,600** | **45** | 2.4 m/s | 7.8 x 7.8 m | 5-15 Red Gems, 40% Gold Gem, 100+ Gold |
| **Three-Headed Hydra** | `hydra` | **28,000** | **65** | 2.3 m/s | 10.0 x 10.0 m | 9 Red Gems, 40% Gold Gem, 100+ Gold |
| **Immortal Reaper** | `boss` (reaper) | **99,999,999** | **99,999** | **7.6 m/s** | 5.6 x 5.2 m | Invulnerable (ends run at minute 40) |

---

### 6.2. 5-Minute Periodic Bosses (Survival Bosses)

Every 5 minutes (starting from minute 5, then 10, 15, 20, 25, etc.), a boss of tier $T$ spawns:
$$\text{TierHp}(T) = \text{round}\left(7600 \cdot \left(1 + \left((T - 1) \cdot 2.2 + (T - 1)^{1.6} \cdot 1.0\right) \cdot 1.5\right)\right)$$
$$\text{TierDmg}(T) = \text{round}\left(45 \cdot \left(1 + \left((T - 1) \cdot 0.6 + (T - 1)^{1.3} \cdot 0.2\right) \cdot 1.5\right)\right)$$
$$\text{TierSpd}(T) = 2.4 + (T - 1) \cdot 0.18 \cdot 1.5$$

| Time | Tier (T) | Boss Name | Health (HP) | Damage | Speed | Defeat Rewards |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **05:00** | **Tier 1** | Blood Demon | **7,600** | **45** | 2.40 m/s | 7 Red Gems (280 XP) + 40% Passive |
| **10:00** | **Tier 2** | Ancient Three-Headed Hydra | **28,000** | **65** | 2.30 m/s | 9 Red Gems (360 XP) + 40% Passive |
| **15:00** | **Tier 3** | Blood Demon (Lvl 3) | **87,874** | **134** | 2.94 m/s | 11 Red Gems (440 XP) + 40% Passive |
| **20:00** | **Tier 4** | Blood Demon (Lvl 4) | **184,150** | **238** | 3.21 m/s | 13 Red Gems (520 XP) + 40% Passive |
| **25:00** | **Tier 5** | Blood Demon (Lvl 5) | **307,266** | **357** | 3.48 m/s | 15 Red Gems (600 XP) + 40% Passive |
| **40:00** | **Final** | Prairie Immortal Reaper | **99,999,999** | **99,999** | **7.60 m/s** | Character death (run victory outro) |

---

### 6.3. Rift Teleporter Bosses

Activating a Rift Teleporter spawns a biome-themed guardian. Its attributes scale with global difficulty:
$$D(t, \text{players}, \text{stage}) = \left(1 + 0.08 \cdot \frac{t}{60}\right) \cdot (1 + 0.35 \cdot (\text{players} - 1)) \cdot 1.15^{\text{stage} - 1}$$
$$\text{BossHp}(\text{stage}) = \text{round}(7600 \cdot (1.2 + (\text{stage} - 1) \cdot 1.5) \cdot D)$$
$$\text{BossDmg}(\text{stage}) = \text{round}(45 \cdot (1 + (\text{stage} - 1) \cdot 0.3) \cdot (1 + (D - 1) \cdot 0.2))$$

| Stage | Biome | Guardian Name | Base HP (Solo, ~4 min) | Base Damage | Reward |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | Ashen Wastes | **Blood Rift Guardian** | **12,038 HP** | **48** | 150 Gold, 7 Red Gems |
| **2** | Derelict Sector | **Ancient Three-Headed Hydra** | **31,150 HP** | **71** | 180 Gold, 9 Red Gems |
| **3** | Biolum Wilds | **Xeno-Spore Matron** | **55,640 HP** | **98** | 210 Gold, 11 Red Gems |
| **4** | Volcanic Caldera | **Magma Colossus** | **88,920 HP** | **131** | 240 Gold, 13 Red Gems |
| **5** | Primordial Ruins | **Primordial Guardian** | **133,400 HP** | **172** | 270 Gold, 15 Red Gems |
| **6** | Rift Core | **Rift Architect** | **192,100 HP** | **222** | 300 Gold, Cycle Victory! |

---

## 7. Practical Design Notes & Balance Tuning Insights

1. **Weapon Balance**:
   - Highest single-target burst at Level 20 belongs to **Lightning Strike** (197 damage $\times$ 6 bolts = 1,182 damage per cast) and **Hunting Bow** (140 damage $\times$ 6 arrows with 7 pierce = 840–5,880 damage per salvo).
   - Top weapons for crowd control and kiting are **Flail** (knockback 0.73) and **Kukri Knife** (12 burst knives every 0.37s).
   - **Reaper Scythe** at Level 20 forms a lethal barrier of 9 rotating scythes in a 6.3m radius, rapidly applying devastating bleed stacks (46 DPS per stack) to all caught entities.
2. **Survivability Tuning**:
   - Damage reduction caps at 75%, achievable through stacked vests and nanite plating. Crucial for surviving past minute 15, when basic enemy hits exceed 150 damage.
   - Aegis Battery shields regenerate 25% per second after just 3 seconds out of combat, favoring mobile kiting playstyles (Aria, Archer).
3. **Difficulty Curve**:
   - The exponential health surge begins after **minute 10** (HP mult x13.68 $\to$ x50.96 at min 20). Without legendary drops or weapons leveled past 10, horde clearing slows considerably.
   - In multiplayer co-op, each additional player adds +35% boss HP and +35% mob wave density, preserving challenge without overwhelming the team.
