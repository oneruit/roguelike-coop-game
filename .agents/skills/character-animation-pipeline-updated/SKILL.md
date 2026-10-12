---
name: character-animation-pipeline
description: Standardized pipeline for creating, reviewing, validating, and integrating three 6x4 animation sprite sheets (IDLE, WALK, ATTACK) for 2.5D pixel-art chibi characters (heroic 2.5-3 heads tall chibi proportions without anime/kawaii styling). Each cell is 128x128 px. Rows from top to bottom are FRONT, BACK, LEFT, RIGHT. Preserve character identity and weapon continuity; no visual attack effects by default.
---

# Character Animation Pipeline Skill

## Goal

Produce **three separate animation sheets** for each playable character: `IDLE`, `WALK`, and `ATTACK`. Every sheet is a strict **6 columns × 4 rows** grid: 24 frames at **128 × 128 px per cell**, total **768 × 512 px**. The game uses 2D pixel-art sprites in a 2.5D world with a camera tilted approximately 30°.

### Art Direction & Proportions Contract
- **Anatomy**: **Chibi proportions (2.5 to 3 heads tall)** — large readable head (~30–35% of total height), compact torso, sturdy limbs, chunky boots, and stylized readable weapons.
- **Tone**: Serious, battle-hardened, mature dark fantasy roguelike RPG aesthetic.
- **Mandatory Negative Constraint Block**:
  > **"No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients."**
- **Visual Style Benchmark**: See [`references/chibi_style_reference.png`](references/chibi_style_reference.png) for approved archetypes and proportion guidelines.

Do not generate `WALK_ATTACK` as a standard state. Do not pack all three actions into one image. A portrait is optional and is not an animation sheet.

## 1. Deliverables and naming

Runtime assets go into `public/textures/heroes/`:

| File | Purpose | Layout | Expected size |
|---|---|---|---|
| `hero_<name>_idle.png` | Breathing / subtle idle loop | 6×4 | 768×512 px |
| `hero_<name>_walk.png` | Walking loop | 6×4 | 768×512 px |
| `hero_<name>_attack.png` | One-shot weapon attack | 6×4 | 768×512 px |
| `hero_<name>_portrait.png` | Optional UI avatar, not animated | 1 frame | 128×128 px |

The approved turnaround/reference sheet is a production reference, not a runtime spritesheet. Keep it outside the runtime texture directory unless the game explicitly uses it.

## 2. Sheet layout — authoritative row order

**Rows from top to bottom are exactly:**

1. `FRONT` — character faces toward the bottom of the game screen / toward the camera-facing side of the world.
2. `BACK` — character faces away from the viewer, toward the top of the game screen.
3. `LEFT` — strict left-facing profile.
4. `RIGHT` — strict right-facing profile.

**Columns 1–6** are consecutive temporal frames from left to right. Do not add labels, empty gutters, borders, panel backgrounds, or extra frames. No frame may overlap a neighboring cell.

| Property | Required value |
|---|---|
| Columns / rows | 6 / 4 |
| Cell size | 128×128 px |
| Whole sheet | 768×512 px |
| Direction row order | FRONT, BACK, LEFT, RIGHT |
| Background during generation | Pure white `#FFFFFF` |
| Runtime background | Transparent alpha after approved processing, if required by the renderer |

ASCII layout:

```text
Row 0 FRONT: [F1][F2][F3][F4][F5][F6]
Row 1 BACK:  [B1][B2][B3][B4][B5][B6]
Row 2 LEFT:  [L1][L2][L3][L4][L5][L6]
Row 3 RIGHT: [R1][R2][R3][R4][R5][R6]
```

This row order intentionally replaces the old `FRONT / LEFT / RIGHT / BACK` mapping. Update the direction-to-row mapping in the game; do not just replace the PNG while keeping the old row indices.

## 3. Camera and 2.5D projection

The game camera looks down at the playfield at approximately **30°**. The asset must still read as a directional 2D sprite, not a rendered 3D model:

- Keep an orthographic, game-sprite presentation and consistent scale in every cell.
- Show only subtle, consistent top-facing planes on the hood, shoulders, weapon and boots as appropriate for the game's elevated camera.
- All directions represent cardinal orientation in the game world. `LEFT` and `RIGHT` are strict profile views, not three-quarter views.
- Do not rotate the whole character image 30° in its own plane. The requested angle describes the world camera / projection, not a 30° character lean.
- Keep ground contact and proportions stable across views. Do not change the character's size merely because the view changes.
- Avoid strong perspective distortion, extreme top-down views, free camera rotation, or a different drawing style per direction.

If the current game has established projection rules that differ from these instructions, inspect the runtime renderer first and update this section intentionally rather than guessing.

## 4. Character scale, alignment, and cell safety

- Each cell is 128×128 px. Keep the full character and all required equipment inside the cell.
- **Chibi proportions contract**: Target character height is approximately **80–96 px** (excluding long weapon protrusions). The anatomy is **chibi / heroic miniature (2.5 to 3 heads tall)**:
  - **Head**: Large and expressive (~28–34 px, ~30–35% of overall height), giving space for detailed helmets, hair, scars, and sharp mature facial expressions.
  - **Torso**: Compact, sturdy, and armored (~20–24 px).
  - **Legs & Boots**: Sturdy, chunky boots (~25–30 px) with solid ground contact.
  - **Hands & Weapons**: Stylized, slightly oversized hands and weapons for pixel clarity and immediate recognition at small scale.
  - **No realistic proportions**: Do not draw realistic 7–8 head human anatomy. The stylized miniature silhouette is mandatory.
- Preserve the existing ground-anchor convention when compatible with the game: lowest grounded foot pixel at approximately `y = 118` (10 px from the bottom). Use a stable root / foot baseline through the animation. A lifted foot may rise during WALK, but the contacting foot should remain grounded.
- Weapon blade, tip, shaft, hands, headgear and feet must not be cropped. For long weapons, simplify the pose or angle the weapon diagonally; do not let it cross the cell boundary.
- Avoid automatic per-frame scaling or bounding-box centering: it causes jitter during playback. If a correction is necessary, apply one consistent scale and anchoring policy across the entire sheet.
- The 10 px bottom margin is a grounding convention, not a requirement to add combat effects. `ATTACK` contains no effects unless a later game requirement explicitly adds them.

For a `3.6 × 3.6` Three.js plane and a verified texture/UV setup where the foot anchor maps from `y=118`, the legacy vertical geometry translation is `1.51875` units. Keep this only if it matches the current geometry and texture orientation. Verify in-game; `flipY`, geometry orientation, and UV conventions can change the effective mapping.

## 5. Character identity, chibi anatomy, and visual style contract

Before generating animation, create a short design bible from the user-provided reference:

- face, skin tone, eye color and expression;
- hair and headgear;
- costume, armor, trim, materials and silhouette;
- body proportions (chibi 2.5–3 heads tall);
- exact weapon shape, length, colors, and grip;
- distinctive asymmetrical elements, emblems, scars, accessories;
- approved pixel outline and shading style.

### 5.1 Visual Style Benchmark
Reference file: [`references/chibi_style_reference.png`](references/chibi_style_reference.png).
This reference sheet establishes the target aesthetic across 15 fantasy archetypes (warrior, rogue, dire wolf beast, druid, pyromancer, necromancer, skeleton warrior, witcher-slayer, armored golem, dwarf warrior, plate knight, greatsword berserker, elf archer, sorceress). All characters share:
- 2.5–3 heads tall chibi proportions.
- Heavy, battle-worn equipment, distinct silhouettes, and grounded poses.
- Crisp 16-bit / 32-bit pixel art with dark pixel contours and stepped shading clusters.

### 5.2 Facial Features & Serious Aesthetic (Anti-Anime / Anti-Kawaii)
Although the proportions are chibi, the characters must look like **battle-hardened, serious adults or menacing creatures**:
- **Face shape**: Defined jawline, sharp chin, pronounced cheekbones, and angular contours.
- **Eyes**: Small-to-medium sharp eyes with dark lash/eyelid contours, intense colored irises, and a focused battle glare or grim furrowed brow.
- **Mouth & expression**: Stern, grim, fierce, or determined expression; tight closed mouth or snarl.
- **Gritty details**: Stubble, beards, scars, war paint, dark eye circles, weathered skin.
- **Strictly forbidden**:
  - **NO anime style**: No huge stylized manga eyes, no floating spiky hair tropes.
  - **NO kawaii style**: No blushing cheeks, no smiling baby faces, no oversized sparkling eye reflections.
  - **NO cute expressions / childish appearance**: Characters must not look like children, toddlers, or cute mascots.

### 5.3 Color Palette & Shading
- **Palette**: Saturated, rich yet grounded dark fantasy palette (deep steel, weathered leather, blood crimson, forest green, obsidian, bone, glowing runes/embers).
- **No soft pastel colors**: No washed-out candy colors or soft pastel pinks/baby blues.
- **Shading**: Strict pixel art shading with crisp stepped pixel clusters and dithering.
- **No smooth gradients**: No airbrush blending, no vector anti-aliasing, no radial color fades.
- **Outlines**: Solid dark pixel outlines separating the sprite cleanly from the background.

### 5.4 Mandatory Negative Constraint String
Every prompt MUST include this exact negative constraint sentence:
> `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.`

Use `prompts/00_CHARACTER_LOCK.md` as the shared identity block. Attach both the original reference image and the approved turnaround when the image tool supports multiple references. References define identity; the action prompt defines only movement.

**Generate and get approval for a four-view turnaround before generating the three animation sheets.** This prevents the model from inventing unrelated back and side views. The turnaround should show the same costume and equipment in FRONT, BACK, LEFT, RIGHT directions.

Never hardcode Valkyrie features into the general skill. Character-specific descriptions belong in the per-character design bible.

## 6. Animation state requirements

### 6.1 IDLE — six-frame seamless loop

- A stationary combat-ready stance. Feet stay planted; the root position does not drift.
- Use subtle breathing, tiny shoulder/head movement, small hair/cloak/equipment motion, and an occasional blink only in views where the eyes are visible.
- The weapon stays in the character's hands; grip, silhouette and weapon length remain consistent.
- Frame 6 must transition smoothly to frame 1. Avoid a visibly different final pose.
- Do not duplicate all six cells, but keep changes deliberately small.

### 6.2 WALK — six-frame seamless loop

- This is a **walk**, not a run, sprint, dodge, attack, or slide.
- Show a readable alternating gait and clear foot placement in all four directions.
- Keep the root centered and scale constant. The body may bob slightly; the contacting foot must not float.
- Add controlled secondary motion to hair, cloak, armor straps and weapon. Hands maintain a plausible grip.
- Frame 6 must transition smoothly to frame 1.
- FRONT walks toward the front-facing direction; BACK walks away; LEFT/RIGHT move in their respective screen directions. Do not turn the body toward the camera in profile rows.

### 6.3 ATTACK — six-frame one-shot action

The default is **one physical weapon strike**, not a loop and not an attack while walking:

1. Ready stance.
2. Preparation / weight shift.
3. Wind-up.
4. Main strike / strongest pose.
5. Follow-through.
6. Recovery to a stable stance suitable for returning to IDLE.

- Use the actual equipped weapon and plausible two-hand / one-hand grip.
- Show a coherent physical trajectory. The weapon must not teleport, morph, disappear, or change size.
- Adapt the same attack to the same action timing in all four views.
- **No visual effects:** no slash arcs, glow, sparks, particles, impact flashes, motion trails, speed lines, or magic effects. The attack is communicated solely by the body and weapon pose.
- Keep blade, tip, limbs and hands inside the cell. A later game-specific attack may override this only by explicitly revising the skill.

## 7. Do not mirror directions by default

Do **not** automatically mirror `LEFT` from `RIGHT` (or vice versa). Mirroring can reverse dominant-hand grip, emblems, belts, scars, asymmetrical armor, and weapon orientation. Generate both views explicitly from the approved turnaround.

Mirroring is allowed only as a deliberate optimization after a human verifies that the character design, equipment, handedness, and motion remain correct when flipped. It is not a substitute for a correct directional row.

## 8. Prompt assembly

For each generation:

1. Attach the reference images:
   - Visual style benchmark: `.agents/skills/character-animation-pipeline-updated/references/chibi_style_reference.png`.
   - Character reference image and approved turnaround (when generating animation states).
2. Paste the common identity block from `prompts/00_CHARACTER_LOCK.md` (which includes the chibi proportions contract and mandatory negative constraints).
3. Append exactly one state prompt: `02_IDLE.md`, `03_WALK.md`, or `04_ATTACK.md`.
4. Ensure the mandatory negative constraint string is present:
   `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.`
5. Use the same row order, cell size, background, pixel style and camera paragraph in all three requests.
6. Ask for one state per image. Do not request all states together.
7. If the generated sheet has the wrong grid or violates chibi proportions / negative constraints, first correct the generation; do not proceed to processing / runtime integration.

The prompts are deliberately written as reusable templates. Replace bracketed fields with the character's approved design details. Never leave generic placeholders in a production prompt.

## 9. Naming and processing

Save source generations separately from processed runtime assets. Never overwrite original generations during cleanup. Before processing, inspect each sheet at native resolution and verify the grid, row order, weapon visibility, and uniform background. Automatic processing cannot correct a wrong animation, wrong row order, cell borders, merged cells, or a weapon already cropped by the image generator.

### Process source sheets

The package includes `scripts/process_character_sheets.py`, adapted to this pipeline. It processes **only IDLE, WALK, and ATTACK**, outputs 128×128 RGBA cells on 768×512 sheets, removes edge-connected background pixels, uses nearest-neighbor scaling for pixel art, applies one shared scale across IDLE/WALK/ATTACK (IDLE is the scale reference), and anchors frames relative to each row's foot baseline. Its alpha cleanup preserves enclosed near-white details (important for white hoods, cloaks, armor, and highlights) better than a global white color key. Always inspect the result: if a white detail touches the white canvas through a gap in the outline, no automatic color-keying method can reliably know that it belongs to the character.

Install dependencies once:

```bash
python -m pip install -r .agents/skills/character-animation-pipeline-updated/scripts/requirements.txt
```

Run from the repository root (adjust paths to your actual source-generation directory):

```bash
python .agents/skills/character-animation-pipeline-updated/scripts/process_character_sheets.py \
  --name glaive_warrior \
  --idle path/to/hero_glaive_warrior_idle_source.png \
  --walk path/to/hero_glaive_warrior_walk_source.png \
  --attack path/to/hero_glaive_warrior_attack_source.png \
  --out-dir public/textures/heroes
```

The source images must be 6×4 grids whose rows are ordered `FRONT / BACK / LEFT / RIGHT`. For 128×128 source cells, the full image is 768×512; higher-resolution grids such as 1536×1024 are also accepted and converted to 128×128 output cells. All three source sheets must use the same canvas dimensions so the processor can preserve character scale across actions. If the source cells are not square or the three sheets have different canvas sizes, the processor stops with an error rather than silently stretching directions.

If `--portrait` is supplied, the script processes that separate image; otherwise it creates `hero_<name>_portrait.png` from the first cell of the processed IDLE sheet (FRONT, frame 1). To preserve the old portrait filename used by legacy code, add `--legacy-front-portrait` (writes `hero_<name>_front.png`). Direction mirroring is off by default; `--mirror-left` or `--mirror-right` is allowed only after verifying that flipping will not reverse handedness or asymmetric gear.

Background modes are `auto`, `white`, `black`, `chroma`, and `none`. Use `--bg-mode white` if the source background is pure white and auto-detection chooses incorrectly; `--bg-tolerance` controls the RGB distance threshold. Keep raw source PNGs separate from processed output.

### Validate processed assets

The package also includes `scripts/validate_sheets.py`, which checks PNG readability and dimensions only. It does not judge animation quality or verify that the sheet actually contains the correct frame order.

```bash
python .agents/skills/character-animation-pipeline-updated/scripts/validate_sheets.py \
  --idle public/textures/heroes/hero_glaive_warrior_idle.png \
  --walk public/textures/heroes/hero_glaive_warrior_walk.png \
  --attack public/textures/heroes/hero_glaive_warrior_attack.png
```

The processor requires Pillow and NumPy; the dimension validator uses only Python's standard library. The package includes a small test suite: `python -m unittest discover -s .agents/skills/character-animation-pipeline-updated/tests -v`.

## 10. Three.js row mapping and UVs

Recommended row map (row indices are counted from the **top of the image**):

```ts
const ROW_FROM_TOP = {
  front: 0,
  back: 1,
  left: 2,
  right: 3,
} as const;

const COLS = 6;
const ROWS = 4;

texture.repeat.set(1 / COLS, 1 / ROWS);
texture.offset.set(frameCol / COLS, (ROWS - 1 - ROW_FROM_TOP[direction]) / ROWS);
```

Use `frameCol` in the range `0..5`. Confirm the result with a labelled test texture or by checking all four directions in-game; texture vertical flipping and the current animation controller may affect how row indices are interpreted. Update any enums, comments, tests, and atlas metadata that still assume `front=0, left=1, right=2, back=3`.

The image dimensions imply **6 columns**, not a dynamically guessed column count. Avoid inferring the layout from aspect ratio when the art contract already defines 6×4.

## 11. Acceptance checklist

### File/layout
- [ ] Exactly three animation sheets exist: IDLE, WALK, ATTACK.
- [ ] Every sheet is 768×512 px and has a 6×4 grid of 128×128 cells.
- [ ] Rows from top to bottom are FRONT, BACK, LEFT, RIGHT.
- [ ] Background is uniform white in generation sources; runtime alpha is processed intentionally if needed.
- [ ] No grid borders, labels, UI, terrain, shadows, or extra panels.

### Chibi Anatomy & Art Style
- [ ] Chibi proportions (2.5–3 heads tall) maintained consistently across all frames and directions.
- [ ] Strictly satisfies negative style constraints: **No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.**
- [ ] Mature, battle-hardened facial expression (defined jaw, sharp small-to-medium eyes, battle glare, scars/beards; no huge sparkling anime eyes, no blush, no cute baby face).
- [ ] Crisp 16-bit / 32-bit pixel art with dark pixel outlines, stepped shading clusters, and saturated dark fantasy colors (no pastels, no airbrush gradients).
- [ ] Stylized, readable weapons and hands scaled appropriately for clear gameplay read without clipping outside 128×128 cells.

### Character consistency
- [ ] Same face, hair, hood/helmet, armor, colors, chibi body proportions and equipment in all three sheets.
- [ ] FRONT/BACK/LEFT/RIGHT designs are recognizably the same character.
- [ ] Both profile directions face strictly outward, not toward camera.
- [ ] Weapon geometry and hand grip persist through every frame.
- [ ] No cropped body parts or weapon parts.
- [ ] No automatic left-right mirroring without explicit approval.

### Animation quality
- [ ] IDLE is subtle and loops cleanly.
- [ ] WALK shows alternating feet, grounded contact and a clean loop.
- [ ] ATTACK progresses through preparation, wind-up, strike, follow-through and recovery.
- [ ] ATTACK has no visual effects.
- [ ] Scale and root position do not jitter across frames.

### Integration
- [ ] Direction row mapping in Three.js matches FRONT/BACK/LEFT/RIGHT.
- [ ] Texture UV orientation and `flipY` are verified in-game.
- [ ] The feet contact the intended ground level and shadow plane.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] Check the animation at native sprite size in the actual game; do not approve solely from a zoomed-up preview.
