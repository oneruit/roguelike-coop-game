---
name: character-animation-pipeline
description: Standardized pipeline for creating, reviewing, validating, and integrating three 6x4 animation sprite sheets (IDLE, WALK, ATTACK) for 2.5D pixel-art chibi characters (heroic 2.5-3 heads tall chibi proportions without anime/kawaii styling) on pure magenta RGB(255,0,255) chromakey background with closed eyes on frame 3. Each cell is 128x128 px. Rows top to bottom are FRONT, BACK, LEFT, RIGHT (or FRONT, BACK, RIGHT, LEFT). Preserve character identity and weapon continuity; no visual attack effects by default.
---

# Character Animation Pipeline Skill

## Goal

Produce **three separate animation sheets** for each playable character: `IDLE`, `WALK`, and `ATTACK`. Every sheet is a strict **6 columns × 4 rows** grid: 24 frames at **128 × 128 px per cell**, total **768 × 512 px**. The game uses 2D pixel-art sprites in a 2.5D world with a camera tilted approximately 30°.

---

## 1. User Input Handling & Generation Modes

The pipeline accepts two primary modes of user input:

### Mode A: Direct Ready Prompt or Reference Image (`Direct Mode`)
* If the user supplies an already prepared text prompt or an image reference (e.g. concept art, character sheet):
  - Do **NOT** prompt the user with long multi-part questionnaires.
  - Adopt the character description or reference image directly.
  - Ensure the prompt incorporates the mandatory engine rules: pure magenta chromakey background `rgb(255,0,255)`, chibi 2.5–3 heads tall anatomy, zero floor shadows/platforms, and mandatory negative constraints.
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
128x128 chibi pixel art portrait of a [gender/species/type] [archetype/class], a [role/description].

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
- **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no ground line, no platform, no pedestal, no floor tiles**.
- **Proportion Equality**: Proportions, scale, and weapon presence must be identical across all views.

---

## 4. Deliverables and Naming

Runtime assets go into `public/textures/heroes/`:

| File | Purpose | Layout | Expected Size |
|---|---|---|---|
| `hero_<name>_idle.png` | Breathing / subtle idle loop | 6×4 | 768×512 px |
| `hero_<name>_walk.png` | Walking loop | 6×4 | 768×512 px |
| `hero_<name>_attack.png` | One-shot weapon attack | 6×4 | 768×512 px |
| `hero_<name>_portrait.png` | Optional UI avatar, not animated | 1 frame | 128×128 px |

Do not generate `WALK_ATTACK` as a standard state. Do not pack all three actions into one image.

---

## 5. Sheet Layout — Authoritative Row Mapping

The primary layout is:

1. `FRONT` — Character faces toward the camera / screen bottom.
2. `BACK` — Character faces away toward the screen top.
3. `LEFT` — Strict left-facing profile.
4. `RIGHT` — Strict right-facing profile.

*(Note: The game engine's `CharacterAnimator.ts` also supports `ANIM_LAYOUT_V2` with `FRONT / BACK / RIGHT / LEFT`. The processing script supports both via `--row-order fblr` or `--row-order fbrl`.)*

### Columns 1–6 (Temporal Progression)
Columns 1–6 are consecutive temporal frames from left to right.
* **Mandatory Frame 3 Rule**: On **Column 3 across all rows** where eyes are visible, the character's **eyes are closed** (natural blink at peak inhale in IDLE, focus blink mid-stride in WALK, concentrated focus tension during backswing in ATTACK).

```text
Row 0 FRONT: [F1][F2][F3 (closed eyes)][F4][F5][F6]
Row 1 BACK:  [B1][B2][B3 (closed eyes)][B4][B5][B6]
Row 2 LEFT:  [L1][L2][L3 (closed eyes)][L4][L5][L6]
Row 3 RIGHT: [R1][R2][R3 (closed eyes)][R4][R5][R6]
```

---

## 6. Animation State Requirements

### 6.1 IDLE — Six-Frame Seamless Loop (`prompts/02_IDLE.md`)
- A stationary combat-ready stance. Feet stay firmly planted on the baseline (`y ≈ 118`).
- Subtle breathing: torso rises 1–2 px on inhale, settles on exhale.
- **Column 3 Closed Eyes**: At the peak of inhale (frame 3), the eyes close in a calm, focused blink.
- Frame 4: Eyes snap open; frame 6 transitions smoothly back to frame 1.
- Weapon stays in hands with consistent grip and length.

### 6.2 WALK — Six-Frame Seamless Loop (`prompts/03_WALK.md`)
- This is a measured **walk**, not a run, sprint, dodge, or slide.
- Clear foot placement and alternating chunky boots on the baseline in all directions.
- **Column 3 Closed Eyes**: Mid-stride passing pose (frame 3) features a momentary focus blink.
- Torso bobs subtly (+1 px); root remains centered.
- Frame 6 transitions smoothly to frame 1.

### 6.3 ATTACK — Six-Frame One-Shot Action (`prompts/04_ATTACK.md`)
1. Ready stance (eyes open).
2. Preparation / weight shift.
3. Wind-up backswing (**eyes closed in grim battle concentration**).
4. Main strike / peak weapon extension (eyes snap open wide).
5. Follow-through.
6. Recovery / reset to ready stance.
- **Strictly No Attack VFX**: No slash arcs, no magic blades, no sparks, no particles, no speed lines. Physical weapon attack only.
- Entire weapon and character stay inside each 128×128 cell.

---

## 7. Turnaround / Reference Sheet Stage (`prompts/01_TURNAROUND.md`)

Before generating animation sheets, generate and approve either:
* **Option A: 4-View Turnaround**: FRONT, BACK, LEFT, RIGHT in a clean single row.
* **Option B: 5-in-1 Reference Sheet**: Portrait, Front full-body, Back full-body, Right profile full-body, isolated weapon preview.

Requirements:
- Pure solid magenta background `rgb(255,0,255)`.
- No shadows under feet, no ground line, no platforms.
- Same weapon in all views.
- 100% equal proportions and scale across all views.

---

## 8. Post-Processing & Automated Background Removal

The package includes `scripts/process_character_sheets.py`, which:
- Targets pure magenta chromakey `RGB(255, 0, 255)` (`#ff00ff`) by default (`--bg-mode magenta`).
- Uses edge-connected flood fill to remove outer background while preserving enclosed magenta/white details.
- Scales pixel art with nearest-neighbor interpolation.
- Aligns character baselines to `target_feet_y = 118` with consistent shared scale across IDLE/WALK/ATTACK.
- Supports `--row-order fblr` (default) or `--row-order fbrl`.

### Execution Command:

```bash
python .agents/skills/character-animation-pipeline-updated/scripts/process_character_sheets.py \
  --name <character_name> \
  --idle path/to/hero_<name>_idle_source.png \
  --walk path/to/hero_<name>_walk_source.png \
  --attack path/to/hero_<name>_attack_source.png \
  --out-dir public/textures/heroes \
  --bg-mode magenta
```

### Validation Command:

```bash
python .agents/skills/character-animation-pipeline-updated/scripts/validate_sheets.py \
  --idle public/textures/heroes/hero_<name>_idle.png \
  --walk public/textures/heroes/hero_<name>_walk.png \
  --attack public/textures/heroes/hero_<name>_attack.png
```

---

## 9. Three.js Integration & Animation Controller

In `game/src/entities/CharacterAnimator.ts`:

```ts
// Standard V2 / Amazon Layout:
export const ANIM_LAYOUT_V2: CharacterAnimLayout = {
  cols: 6,
  rows: 4,
  rowMap: { front: 0, back: 1, right: 2, left: 3 }
};

// Necromancer / Default Pipeline Layout:
export const ANIM_LAYOUT_NECROMANCER: CharacterAnimLayout = {
  cols: 6,
  rows: 4,
  rowMap: { front: 0, back: 1, left: 2, right: 3 }
};
```

Ensure the layout passed to `CharacterAnimator` matches the row order of the processed textures.

---

## 10. Acceptance Checklist

- [ ] Dual input respected: direct prompt/image executed directly, brief descriptions auto-enriched via defaults.
- [ ] Exactly three animation sheets exist: IDLE, WALK, ATTACK (6×4 grid, 128×128 cells, 768×512 px).
- [ ] Background is pure solid magenta `rgb(255,0,255)` (`#ff00ff`) in generation sources.
- [ ] No ground shadows, drop shadows, platforms, floor lines, or pedestals.
- [ ] Heroic Chibi proportions (2.5–3 heads tall) maintained consistently across all frames.
- [ ] Negative constraints verified: No anime, kawaii, pastel colors, or photorealism.
- [ ] **Frame 3 closed eyes verified**: In IDLE, WALK, and ATTACK, column 3 has closed eyes across all rows.
- [ ] Weapon continuity maintained across all frames and rows.
- [ ] ATTACK has no visual effects (no slash arcs, sparks, magic trails).
- [ ] Sheets processed cleanly via `scripts/process_character_sheets.py --bg-mode magenta`.
- [ ] `scripts/validate_sheets.py` passes with exit code 0.
- [ ] `npm run typecheck`, `npm run build`, and `npm run build:admin` succeed.
