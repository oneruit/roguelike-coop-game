---
name: character-animation-v2-pipeline
description: Standardized pipeline for generating and processing 6x4 animation sprite sheets (IDLE, WALK, ATTACK) for 2.5D chibi pixel art characters. 768x512 px total (128x128 px cells). Authoritative row order: FRONT, BACK, RIGHT, LEFT. 6 frames per row on pure magenta RGB(255,0,255) chromakey background.
---

# Character Animation v2 Pipeline Skill

## 1. Overview and Deliverables

This skill defines the standardized pipeline for generating, validating, and integrating **6-frame animation sprite sheets** for playable 2.5D chibi characters.

### Required Deliverables
Each character requires **three distinct animation sheets** saved to `public/textures/heroes/`:

| File | Purpose | Grid | Cell Size | Total Resolution |
|---|---|---|---|---|
| `hero_[name]_idle.png` | Subtle breathing / combat idle loop | 6 cols × 4 rows | 128×128 px | 768×512 px |
| `hero_[name]_walk.png` | 6-frame rhythmic walking loop | 6 cols × 4 rows | 128×128 px | 768×512 px |
| `hero_[name]_attack.png` | One-shot weapon / martial strike | 6 cols × 4 rows | 128×128 px | 768×512 px |

---

## 2. Grid Architecture & Authoritative Row Order

Every sheet is a strict **6 columns × 4 rows** grid:

```text
+-------------------------------------------------------------------------------+
| Row 0 FRONT (Лицо):           [ F1 ]  [ F2 ]  [ F3 ]  [ F4 ]  [ F5 ]  [ F6 ]  |
| Row 1 BACK  (Спина):          [ B1 ]  [ B2 ]  [ B3 ]  [ B4 ]  [ B5 ]  [ B6 ]  |
| Row 2 RIGHT (Правая сторона): [ R1 ]  [ R2 ]  [ R3 ]  [ R4 ]  [ R5 ]  [ R6 ]  |
| Row 3 LEFT  (Левая сторона):  [ L1 ]  [ L2 ]  [ L3 ]  [ L4 ]  [ L5 ]  [ L6 ]  |
+-------------------------------------------------------------------------------+
Total resolution: 768 x 512 px (6 * 128 = 768 px, 4 * 128 = 512 px)
```

### Direction Mapping
1. **Row 0: FRONT (Лицо)** — Character faces towards the bottom of the screen (facing the camera).
2. **Row 1: BACK (Спина)** — Character faces away towards the top of the screen.
3. **Row 2: RIGHT (Правая сторона)** — Strict right-facing profile view.
4. **Row 3: LEFT (Левая сторона)** — Strict left-facing profile view.

Columns 1 through 6 are consecutive temporal frames from left to right. No borders, no gutters, no text labels, and no overlapping cells.

---

## 3. Mandatory Art Direction & Technical Constraints

- **Anatomy & Scale**: Chibi proportions (**2.5 to 3 heads tall**).
  - Head is large and expressive (~30–35% of total sprite height).
  - Torso is compact, limbs and boots are sturdy with grounded stance.
  - Character height inside the 128×128 cell is approximately 80–96 px.
- **Weapon Continuity**:
  - The character must hold the same weapon / magic focus in every single frame and row.
  - Scale, materials, grip, and proportions of the weapon must remain consistent throughout.
- **No Ground Clutter & No Shadows**:
  - **Zero cast shadows** and **zero drop shadows** under character feet.
  - **No ground lines, no floor tiles, no platforms, and no pedestals**.
  - Pure solid magenta chromakey directly touches the soles of boots.
- **Background**:
  - Pure solid magenta chromakey background `RGB(255, 0, 255) #ff00ff`.
- **Negative Constraints**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients, no drop shadows, no cast shadows under feet, no platforms, no floor lines, no grid lines, no text, no view labels.`
- **No Attack VFX Clutter**:
  - In `ATTACK`, communicate the strike through physical posture, wind-up, and weapon extension.
  - No cartoon slash arcs, no anime impact flashes, and no smoke clouds unless specified by character design.

---

## 4. Frame Sequence Progression (6 Frames per Action)

### 4.1 IDLE Animation (6-Frame Loop)
A subtle breathing and combat readiness loop:
1. **Frame 1**: Base grounded battle-ready stance, weapon firmly held.
2. **Frame 2**: Inhale starts — chest and shoulders rise by 1–2 px, subtle weapon tilt.
3. **Frame 3**: Peak breath apex — maximum subtle vertical expansion.
4. **Frame 4**: Exhale begins — shoulders lower smoothly.
5. **Frame 5**: Weight settles back down toward baseline.
6. **Frame 6**: Transition frame seamlessly connecting back to Frame 1.

### 4.2 WALK Animation (6-Frame Loop)
A grounded rhythmic walk cycle with solid foot contact:
1. **Frame 1 (Contact)**: Lead foot strikes the ground, trailing foot planted behind.
2. **Frame 2 (Down)**: Weight transfers to lead foot, slight knee bend, trailing heel rises.
3. **Frame 3 (Passing)**: Trailing leg swings forward passing the planted leg, torso rises.
4. **Frame 4 (Opposite Contact)**: Opposite foot strikes the ground, original lead foot planted behind.
5. **Frame 5 (Down)**: Weight transfers to new lead foot, opposite heel rises.
6. **Frame 6 (Passing)**: Trailing leg swings past planted leg, looping back to Frame 1.

### 4.3 ATTACK Animation (6-Frame One-Shot Strike)
A high-impact combat strike:
1. **Frame 1 (Ready)**: Combat stance with weapon cocked and weight balanced.
2. **Frame 2 (Anticipation / Pull-back)**: Weight shifts backward, weapon draws back into position.
3. **Frame 3 (Full Wind-up)**: Torso coiled, maximum muscular tension, weapon at apex of backswing.
4. **Frame 4 (Strike / Impact)**: Explosive forward strike, maximum weapon extension, dynamic silhouette.
5. **Frame 5 (Follow-through)**: Body and weapon follow momentum past impact, deceleration.
6. **Frame 6 (Recovery)**: Character absorbs recoil and returns toward ready combat stance.

---

## 5. Master Prompt Templates

### ATTACK State Prompt Template (3:2 Aspect Ratio)
```text
16-bit chibi pixel art 6x4 animation sprite sheet for an ATTACK animation of [character description].

Sprite sheet layout: Exactly 6 columns by 4 rows of 128x128 pixel cells on a 768x512 canvas.
Row order from top to bottom:
- Row 0 (top): FRONT view (character facing forward toward camera)
- Row 1: BACK view (character facing directly away)
- Row 2: RIGHT view (character in strict right profile)
- Row 3 (bottom): LEFT view (character in strict left profile)

Columns 1 to 6 show consecutive temporal animation frames of a 6-frame one-shot weapon attack:
- Column 1: Ready combat stance with weapon raised
- Column 2: Preparation and shift of weight
- Column 3: Wind-up anticipation with torso coiled
- Column 4: Explosive strike with maximum weapon extension
- Column 5: Follow-through and deceleration
- Column 6: Recovery returning toward ready stance

Chibi proportions (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots), consistent scale and grounded baseline across all cells.
Character holds the exact same [weapon/focus] in all frames and rows with consistent grip and size.

Pure solid magenta chromakey background rgb(255,0,255) #ff00ff directly under feet, clean 16-bit pixel art game sprites, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms.

Heroic RPG character design, battle-ready and dangerous despite chibi proportions.

No shadows under character feet, no drop shadows, no cast shadows, no floor, no ground line, no platform, no pedestal, no tile grid, no anime slash arcs, no impact flashes, no anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients, no text, no frame numbers, no grid lines.
```

### IDLE State Prompt Template
```text
16-bit chibi pixel art 6x4 animation sprite sheet for an IDLE animation of [character description].

Sprite sheet layout: Exactly 6 columns by 4 rows of 128x128 pixel cells on a 768x512 canvas.
Row order from top to bottom:
- Row 0 (top): FRONT view (character facing forward toward camera)
- Row 1: BACK view (character facing directly away)
- Row 2: RIGHT view (character in strict right profile)
- Row 3 (bottom): LEFT view (character in strict left profile)

Columns 1 to 6 show consecutive temporal animation frames of a 6-frame subtle breathing loop (Frame 1 neutral stance -> Frame 2-3 inhale and gentle rise -> Frame 4-5 exhale -> Frame 6 seamless loop).
Chibi proportions (2.5 to 3 heads tall), weapon firmly held in all frames.

Pure solid magenta chromakey background rgb(255,0,255) #ff00ff directly under feet, clean 16-bit pixel art game sprites, crisp hard pixel edges.
No shadows under character feet, no floor, no platform, no anime style, no text, no grid lines.
```

### WALK State Prompt Template
```text
16-bit chibi pixel art 6x4 animation sprite sheet for a WALK animation of [character description].

Sprite sheet layout: Exactly 6 columns by 4 rows of 128x128 pixel cells on a 768x512 canvas.
Row order from top to bottom:
- Row 0 (top): FRONT view (character facing forward toward camera)
- Row 1: BACK view (character facing directly away)
- Row 2: RIGHT view (character in strict right profile)
- Row 3 (bottom): LEFT view (character in strict left profile)

Columns 1 to 6 show consecutive temporal animation frames of a 6-frame rhythmic walk cycle (Frame 1 lead foot contact -> Frame 2 down -> Frame 3 passing -> Frame 4 opposite contact -> Frame 5 down -> Frame 6 passing loop).
Chibi proportions (2.5 to 3 heads tall), weapon firmly held.

Pure solid magenta chromakey background rgb(255,0,255) #ff00ff directly under feet, clean 16-bit pixel art game sprites, crisp hard pixel edges.
No shadows under character feet, no floor, no platform, no anime style, no text, no grid lines.
```

---

## 6. Processing & Integration Workflow

```powershell
python .agents/skills/character-animation-v2-pipeline/scripts/process_v2_sheets.py `
  -i "<path_to_generated_sheet.png>" `
  -o "public/textures/heroes/hero_<name>_attack.png"
```

The script:
1. Key-outs the magenta chromakey background using border flood-fill.
2. Ensures exact 768×512 px dimensions with crisp pixel-art nearest-neighbor sampling.
3. Saves the ready-to-render RGBA PNG to `public/textures/heroes/`.
