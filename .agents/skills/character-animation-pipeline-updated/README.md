# Character Animation Pipeline — updated (Chibi Dark Fantasy)

Updated skill for generating pixel-art characters in the **Chibi Dark Fantasy** style for a 2.5D game with an angled ~30° camera.

## User Input Modes

1. **Direct Mode (Ready prompt or reference image)**:
   - When the user provides a complete prompt or reference image, generation runs directly without questionnaires.
   - The agent strictly enforces key technical requirements: pure magenta background `RGB: 255, 0, 255` (`#ff00ff`), chibi proportions 2.5–3 heads tall, strict side profile in right/left rows, no cast shadows under feet, and the negative constraints block.
2. **Auto-Enrichment via Defaults (Brief character description)**:
   - When the user provides a brief or incomplete description (e.g. *"amazon girl in red bikini without weapon with magic spheres"*), the agent automatically fills in missing parameters using defaults from the master template (`prompts/00_CHARACTER_LOCK.md`).

## Art Style and Anatomy (Chibi Proportions Contract)

- **Chibi Proportions (2.5–3 heads tall)**: Large expressive head (~30–35% of total height), compact solid torso, sturdy limbs, heavy boots, and readable stylized weapons for pixel-art clarity (96×96 cell, character height ~64–72 px).
- **Strict Prohibition on Realistic Proportions**: No 7–8 heads tall proportions.
- **Gritty Mature Demeanor (Anti-Anime / Anti-Kawaii)**: Characters appear as hardened veterans, menacing warriors, or deadly undead. Sharp cheekbones, strong jawline, battle squint, scars, beards, stubble, firm mouth.
- **Mandatory Negative Constraints**:
  > **`No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.`**
  > Categorically prohibited: anime glossy eyes, kawaii blush, juvenile cute faces, candy pastel tones, blurry gradients, and photorealism.
- **Color Palette and Pixel Art**: Deep saturated dark fantasy tones (steel, leather, crimson, emerald, obsidian, runes), stepped cluster shading, crisp dark pixel outlines.
- **Magenta Chromakey Background & Global Removal**: Pure magenta `RGB(255, 0, 255)` (`#ff00ff`). Magenta is removed **both outside and inside the character** (between limbs, weapons, etc.), as magenta is never used on characters.
- **Defringing & Magenta Aura Elimination (1px Black Outline)**: Boundary pixels touching transparent background are cleaned and receive a crisp 1px black outline `[0, 0, 0, 255]`. Interior sprite textures remain 100% untouched.
- **Clean Ground Beneath Feet**: **No ground shadows, circular decals, platforms, floor lines, or pedestals**.
- **Row Order and Strict Profile**:
  - Row 0: `FRONT`
  - Row 1: `BACK`
  - Row 2 (3rd row): `RIGHT` (body strictly sideways, face strictly in side profile, no 3/4 turn)
  - Row 3 (4th row): `LEFT` (body strictly sideways, face strictly in side profile, no 3/4 turn)
- **Closed Eyes on Frame 3**: On every 3rd frame (Column 3) across all rows, the character is depicted with closed eyes (moment of focus / natural blink at the peak of breath or stride).

## Included Files

- `SKILL.md` — guidelines, frame standards, anatomical proportions, negative constraints, Three.js integration, and checklist.
- `prompts/00_CHARACTER_LOCK.md` — master template and identity baseline with strict profile rule.
- `prompts/01_TURNAROUND.md` — turnaround sheet (4-view or 5-in-1 reference sheet) in chibi proportions before animation.
- `prompts/02_IDLE.md` — 6 idle frames (row 2 right, row 3 left, closed eyes on frame 3).
- `prompts/03_WALK.md` — 6 walk cycle frames (row 2 right, row 3 left, closed eyes on frame 3).
- `prompts/04_ATTACK.md` — 6 single physical weapon attack frames without VFX (row 2 right, row 3 left, closed eyes on frame 3).
- `prompts/05_OPTIONAL_PORTRAIT.md` — optional 96×96 avatar.
- `references/CHANGELOG.md` — pipeline revision history.
- `scripts/process_character_sheets.py` — raw asset processor: global magenta removal, defringing, 1px black contour, feet alignment (`y=88`), row 2 and 3 direction verification.
- `scripts/validate_sheets.py` — dimension validation (576×384) and direction checking (row 2 right, row 3 left, side profile).
- `scripts/requirements.txt` — processor dependencies (Pillow and NumPy).
- `tests/test_process_character_sheets.py` — unit tests for global magenta removal, 1px contour, and direction validation.

## Quick Workflow

1. On task receipt:
   - If a complete prompt / reference is given — use directly.
   - If description is brief — enrich with default values via master template `00_CHARACTER_LOCK.md`.
2. Generate and approve turnaround reference from 4 views on magenta background `rgb(255,0,255)` (ask user: fits, redo, or custom variant).
3. For each state, compose prompt from `00_CHARACTER_LOCK.md` and the corresponding `02/03/04` file, enforcing closed eyes on frame 3, strict side profile in rows 2 and 3, and negative constraints.
4. Save the three raw sprite sheets (576×384 or 1152×768) separately from runtime textures.
5. Process raw assets via `scripts/process_character_sheets.py --bg-mode magenta --row-order fbrl`.
6. Verify dimensions and directions via `scripts/validate_sheets.py --row-order fbrl`.
7. Verify Three.js rendering with appropriate row mapping (`CharacterAnimator.ts`).
8. If API returns HTTP 429 quota exhaustion: halt immediately, save approved assets and checkpoint in `raw_assets/<name>/TASK_STATE.json`, commit to task branch, and report cooldown duration and resumption instructions.

