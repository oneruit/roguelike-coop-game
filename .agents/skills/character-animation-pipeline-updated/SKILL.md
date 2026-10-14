---
name: character-animation-pipeline
description: Standardized pipeline for creating, reviewing, validating, and integrating four 6x4 animation sprite sheets (IDLE, WALK, IDLE_ATTACK, WALK_ATTACK) for 2.5D pixel-art chibi characters (heroic 2.5-3 heads tall chibi proportions without anime/kawaii styling) on pure magenta RGB(255,0,255) chromakey background with closed eyes on frame 3. Each cell is 96x96 px. Rows top to bottom are FRONT, BACK, RIGHT, LEFT. In RIGHT and LEFT rows, the body is strictly sideways and face in profile. Preserve character identity and weapon continuity; no visual attack effects by default.
---

# Character Animation Pipeline Skill

## Goal

Produce **four separate animation sheets** for each playable character:
1. `IDLE` — **stationary rest state**
2. `WALK` — **locomotion / movement state**
3. `IDLE_ATTACK` — **stationary attack state** (also retained as `ATTACK` for backwards compatibility)
4. `WALK_ATTACK` — **attack while moving**

Every sheet is a strict **6 columns × 4 rows** grid: 24 frames at **96 × 96 px per cell**, total **576 × 384 px**. The game uses 2D pixel-art sprites in a 2.5D world with a camera tilted approximately 30°.

---

## 1. User Input Handling & Generation Modes

The pipeline accepts two primary modes of user input:

### Mode A: Direct Ready Prompt or Reference Image (`Direct Mode`)
* If the user supplies an already prepared text prompt or an image reference (e.g. concept art, character sheet):
  - Do **NOT** prompt the user with long multi-part questionnaires.
  - Adopt the character description or reference image directly.
  - Ensure the prompt incorporates the mandatory engine rules: pure magenta chromakey background `rgb(255,0,255)`, chibi 2.5–3 heads tall anatomy, zero floor shadows/platforms, strict side profile for left/right rows, and mandatory negative constraints.
  - Proceed directly to turnaround generation or animation generation.

### Mode B: Brief / Incomplete Character Description (`Auto-Enrichment via Defaults`)
* If the user provides a brief or high-level description (e.g. *"female amazon in red bikini with magic orbs"* or *"undead knight with greatsword"*):
  - Do **NOT** interrupt the workflow with an 11-step questionnaire unless the user explicitly asks for an interactive interview.
  - **Automatically complete and enrich** all missing parameters using the archetype defaults below, following the Master Prompt Template:

| Dimension | Default Fallback Value |
|---|---|
| **Archetype / Class** | Inferred from prompt (warrior, mage, rogue, amazon, etc.) |
| **Proportions** | Heroic Chibi (2.5 to 3 heads tall): large head (~30-35% height), compact torso, sturdy limbs, chunky boots, strong readable silhouette |
| **Face & Head** | Serious focused battle-ready expression, angular jawline, sharp chin, no smile, no cute or adorable expression |
| **Eyes** | Sharp focused eyes with intense iris color and dark contour, vigilant battle glare |
| **Hair / Headgear** | Practical battle-ready hair / braids / hood / circlet matching character archetype |
| **Armor / Clothing** | Saturated dark fantasy palette (deep steels, leathers, crimson, forest green, obsidian, bronze), crisp pixel-art clusters |
| **Held Item / Weapon** | Held with both hands or combat-ready stance, clearly visible beside character. If unarmed, hands raised in ready combat stance. No extra weapons |
| **Magical Effects** | Faint localized magical motes / energy orbs only if specified by archetype; no oversized clutter |
| **Background** | Pure solid magenta background rgb(255,0,255), no shadows under feet, no ground line, no floor, no platform |
| **Negative Constraints** | `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.` |

---

## 2. Master Prompt Template

```text
96x96 chibi pixel art portrait of a [gender/species/type] [archetype/class], a [role/description].

Chibi proportions with an intentionally oversized head and compact body, [body type], [limb description], [stance], strong readable silhouette.

[Face/head description], [eye description], [expression details], no smile, no cute or adorable expression.

[Hair/head details], [optional mane/markings/ornaments].

[Clothing/armor/body description], [optional accessories].

[Held item: Holding a [weapon/tool/focus] with both hands, clearly visible beside the character / Holding no weapon, both hands raised in a ready combat stance], [optional offhand]. No other weapons.

[Optional magical/energy effects].

Pure solid magenta background rgb(255,0,255), clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic [fantasy/dark fantasy/sci-fi] RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, [specific exclusions], no realistic proportions, no photorealism, no smooth gradients.

Additional character details to include: [list all extra details the user specifies].
```

---

## 3. Art Direction & Proportions Contract

- **Anatomy**: **Chibi proportions (2.5 to 3 heads tall)** — large readable head (~30–35% of total height), compact torso, sturdy limbs, chunky boots, and stylized readable weapons. Realistic 7–8 head human proportions are strictly forbidden.
- **Tone**: Serious, battle-hardened, mature dark fantasy roguelike RPG aesthetic.
- **Facial Features**: Sharp jawline, defined chin, small-to-medium sharp eyes, stern closed mouth or fierce grimace. No anime sparkling eyes, no kawaii blushing cheeks, no baby faces.
- **Mandatory Negative Constraint Block**:
  > **`No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.`**
- **Pure Solid Magenta Chromakey**: Every source generation MUST use pure solid magenta background `RGB: 255, 0, 255` (`#ff00ff`).
- **Global Magenta Removal**: Magenta is NEVER used on characters. Magenta is keyed out globally, **both outside the silhouette and inside any enclosed gaps, holes, and limbs**.
- **No Magenta Aura (1px Black Outline Defringing)**: The post-processing script converts any boundary pixel touching transparency that has magenta spill/fringe into a crisp 1px black outline `[0, 0, 0, 255]`. This eliminates any purple/magenta halo without painting over or altering inner character textures.
- **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no ground line, no platform, no pedestal, no floor tiles**.
- **Proportion Equality**: Proportions, scale, and weapon presence must be identical across all views.

---

## 4. Sheet Layout — Authoritative Row Mapping

The authoritative row mapping from top to bottom is:

1. `Row 0`: `FRONT` — Character faces toward the camera / screen bottom.
2. `Row 1`: `BACK` — Character faces away toward the screen top.
3. `Row 2 (3rd row)`: `RIGHT` — Character faces to the RIGHT.
   - **MANDATORY PROFILE RULE**: When drawn facing RIGHT, the character's **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso angled towards camera.
4. `Row 3 (4th row)`: `LEFT` — Character faces to the LEFT.
   - **MANDATORY PROFILE RULE**: When drawn facing LEFT, the character's **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso angled towards camera.

*(Note: In Three.js `CharacterAnimator.ts`, this corresponds to standard `ANIM_LAYOUT_V2` with `rowMap: { front: 0, back: 1, right: 2, left: 3 }`.)*

### Columns 1–6 (Temporal Progression)
Columns 1–6 are consecutive temporal frames from left to right.
* **Mandatory Frame 3 Rule**: On **Column 3 across all rows** where eyes are visible, the character's **eyes are closed** (natural blink at peak inhale in IDLE, focus blink mid-stride in WALK, concentrated focus tension during backswing in IDLE_ATTACK / WALK_ATTACK).

```text
Row 0 FRONT: [F1][F2][F3 (closed eyes)][F4][F5][F6]
Row 1 BACK:  [B1][B2][B3 (closed eyes)][B4][B5][B6]
Row 2 RIGHT: [R1][R2][R3 (closed eyes)][R4][R5][R6]  <-- Body strictly sideways, face in profile!
Row 3 LEFT:  [L1][L2][L3 (closed eyes)][L4][L5][L6]  <-- Body strictly sideways, face in profile!
```

---

## 5. Animation State Requirements

### 5.1 IDLE — Six-Frame Seamless Loop (`prompts/02_IDLE.md`)
- **Stationary rest state**: The character stands grounded in battle readiness, maintaining a stable posture. Feet remain motionless on the baseline (`y ≈ 88`).
- Calm breathing: Torso subtly expands and rises 1–2 px on the inhale and lowers on the exhale.
- **Column 3 Closed Eyes**: At peak inhale (frame 3), eyes close in a calm blink across all directions.
- Frame 4: Eyes open; frame 6 loops seamlessly back into frame 1.
- Weapon held steadily in ready combat stance.

### 5.2 WALK — Six-Frame Seamless Loop (`prompts/03_WALK.md`)
- **Locomotion / movement state**: The character traverses (strides/moves) without executing an attack.
- Crisp stride with rhythmic alternation of chunky boots along the baseline.
- **Column 3 Closed Eyes**: During the leg passing phase (frame 3), eyes briefly close in a momentary blink of focus across all directions.
- Torso sways subtly (+1 px); center of gravity remains stable.
- Frame 6 loops seamlessly back into frame 1.

### 5.3 IDLE_ATTACK — Six-Frame One-Shot Action (`prompts/04_IDLE_ATTACK.md`)
- **Stationary attack state**: The character executes a strike, shot, or weapon release while remaining stationary in place (no positional displacement).
1. Initial resting combat stance (eyes open).
2. Preparation / weight shift.
3. Wind-up / weapon cocked back (**frame 3: eyes closed in combat focus**).
4. Main strike / maximum weapon release (eyes snap wide open).
5. Weapon follow-through and recoil recovery.
6. Return to resting combat stance.
- **Strictly No Attack VFX**: No slash trails, sparks, or glowing streaks. Only authentic physical motion of body and weapon.

### 5.4 WALK_ATTACK — Six-Frame Action Cycle (`prompts/05_WALK_ATTACK.md`)
- **Attack while moving**: The character simultaneously moves (walking/running) and executes a weapon attack (firing on the run, slashing in stride, hurling projectiles or casting spells on the move).
1. Strike foot plants on the baseline + weapon wind-up begins.
2. Weight shifts forward in stride + attack chambers.
3. Leg passing phase (**frame 3: eyes closed in combat focus mid-stride**).
4. Opposite foot plants + strike release / projectile discharge (eyes snap wide open).
5. Follow-through and momentum recovery while stride continues smoothly.
6. Stride completes and returns to continuous moving-attack loop.
- **Strictly No Attack VFX**: Physical motion of weapon and striding character body only.

---

## 6. Post-Processing & Automated Verification Scripts

The package includes two verified scripts:

### 1. `scripts/process_character_sheets.py`
- Targets pure magenta chromakey `RGB(255, 0, 255)` (`#ff00ff`) globally by default (`--bg-mode magenta --bg-tolerance 65`).
- Removes magenta both outside and inside the silhouette.
- Defringes boundary pixels with a crisp 1px black outline, removing any magenta halo without painting over inner textures.
- Aligns character baselines to `target_feet_y = 88` with consistent shared scale across IDLE/WALK/IDLE_ATTACK/WALK_ATTACK.
- Default row order: `--row-order fbrl` (Row 2 = RIGHT, Row 3 = LEFT).
- Automatically runs facing direction verification on the processed sheets!

```bash
python .agents/skills/character-animation-pipeline-updated/scripts/process_character_sheets.py \
  --name <character_name> \
  --idle path/to/hero_<name>_idle_source.png \
  --walk path/to/hero_<name>_walk_source.png \
  --idle-attack path/to/hero_<name>_attack_source.png \
  --walk-attack path/to/hero_<name>_walk_attack_source.png \
  --out-dir public/textures/heroes \
  --bg-mode magenta \
  --row-order fbrl
```

### 2. `scripts/validate_sheets.py`
Validates both exact dimensions (576×384) AND facing directions:
- Verifies that Row 2 (3rd row) is facing RIGHT and Row 3 (4th row) is facing LEFT.
- Verifies that in both profile rows, the body is turned sideways and face is in profile.
- Checks horizontal flip alignment: `IoU(flip(Row2), Row3) > IoU(Row2, Row3)`.

```bash
python .agents/skills/character-animation-pipeline-updated/scripts/validate_sheets.py \
  --idle public/textures/heroes/hero_<name>_idle.png \
  --walk public/textures/heroes/hero_<name>_walk.png \
  --attack public/textures/heroes/hero_<name>_attack.png \
  --walk-attack public/textures/heroes/hero_<name>_walk_attack.png \
  --row-order fbrl
```

---

## 7. Acceptance Checklist

- [ ] Dual input respected: direct prompt/image executed directly, brief descriptions auto-enriched via defaults.
- [ ] Four animation sheets exist: IDLE (rest), WALK (movement), IDLE_ATTACK (stationary attack / attack), WALK_ATTACK (attack while moving) (6×4 grid, 96×96 cells, 576×384 px).
- [ ] Row mapping: Row 0 FRONT, Row 1 BACK, Row 2 (3rd row) RIGHT, Row 3 (4th row) LEFT.
- [ ] **Strict Profile Checked**: In Row 2 and Row 3, character body is ALWAYS sideways and face in profile, no 3/4 turn.
- [ ] Background is pure solid magenta `rgb(255,0,255)` (`#ff00ff`) in generation sources.
- [ ] Magenta is keyed out globally (inside and outside character).
- [ ] No magenta aura / halo remains (defringed with 1px crisp black outline).
- [ ] No ground shadows, drop shadows, platforms, floor lines, or pedestals.
- [ ] Heroic Chibi proportions (2.5–3 heads tall) maintained consistently across all frames.
- [ ] Negative constraints verified: No anime, kawaii, pastel colors, or photorealism.
- [ ] **Frame 3 closed eyes verified**: In IDLE, WALK, IDLE_ATTACK, and WALK_ATTACK, column 3 has closed eyes across all rows.
- [ ] Weapon continuity maintained across all frames and rows.
- [ ] Attacks have no visual effects (no slash arcs, sparks, magic trails).
- [ ] Approval gateway respected: Generated images are presented to the user with "Approved", "Redo / Revise", or "Custom variant" before proceeding.
- [ ] Scripts pass: `process_character_sheets.py` and `validate_sheets.py` exit with code 0 and facing directions verified.
- [ ] `npm run typecheck`, `npm run build`, and `npm run build:admin` succeed.
