# IDLE Animation Prompt Guide (6-Frame Loop)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_idle.png`** using `character-animation-v2-pipeline`.

---

## 1. Grid & Sheet Specifications

| Property | Value |
|---|---|
| Grid Dimensions | 6 columns × 4 rows |
| Cell Dimensions | 128 × 128 px |
| Total Resolution | 768 × 512 px |
| Aspect Ratio | 3:2 |
| Background | Pure solid magenta chromakey `RGB: 255, 0, 255` (`#ff00ff`) directly under feet |

### Authoritative Row Mapping
* **Row 0 (Top)**: `FRONT` (Лицо) — Character facing forward toward camera / screen bottom.
* **Row 1**: `BACK` (Спина) — Character facing away toward screen top.
* **Row 2**: `RIGHT` (Правая сторона) — Strict right-facing profile view.
* **Row 3 (Bottom)**: `LEFT` (Левая сторона) — Strict left-facing profile view.

---

## 2. Frame-by-Frame Progression (Columns 1 to 6)

Every direction row depicts a subtle, rhythmic 6-frame combat idle / breathing loop:

* **Column 1 (Base Stance)**:
  - Base grounded battle-ready stance. Feet firmly planted on the baseline.
  - Weapon / magical focus firmly held in ready position.
  - **Eyes are open and alert**, focused directly forward with serious expression.
* **Column 2 (Inhale / Expansion)**:
  - Inhale begins. Torso and chest rise subtly by 1–2 pixels.
  - Subtle upward tilt or shift of weapon / hands following the breath.
  - **Eyes are open and watchful**.
* **Column 3 (Peak Inhale & Mandatory Eye Blink)**:
  - **MANDATORY CLOSED EYES**: On this 3rd frame across all rows, the character's **eyes are fully closed** in a natural, calm, focused blink at the apex of the breath cycle.
  - Closed eyelids are clearly rendered on FRONT, RIGHT, and LEFT rows; on BACK row, slight meditative neck angle corresponds with the blink.
  - Chest is at maximum subtle vertical expansion (+2 px).
* **Column 4 (Exhale / Descent)**:
  - Exhale begins. Torso and shoulders begin lowering smoothly.
  - **Eyes snap open again**, sharp and vigilant.
  - Weapon begins lowering back toward resting height.
* **Column 5 (Settling)**:
  - Weight settles down toward the base resting pose.
  - **Eyes remain open and focused**.
* **Column 6 (Loop Transition)**:
  - Transition frame connecting smoothly back to Column 1.
  - **Eyes remain open**, weapon and posture align with starting frame.

---

## 3. Negative & Stylistic Constraints

* **Strict Proportions**: Chibi miniature (2.5 to 3 heads tall, large head ~30-35% height, compact sturdy body).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor, no ground line, no platform, no pedestal, no tile grid**.
* **Weapon Continuity**: Same weapon / focus held in all frames and rows.
* **No Anime / Kawaii**: No smiles, no blush, no cute baby face, no soft pastel colors.
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.

---

## 4. Master Prompt Template for IDLE

```text
16-bit chibi pixel art 6x4 animation sprite sheet for an IDLE animation of [character description].

Sprite sheet layout: Exactly 6 columns by 4 rows of 128x128 pixel cells on a 768x512 canvas.
Row order from top to bottom:
- Row 0 (top): FRONT view (character facing forward toward camera)
- Row 1: BACK view (character facing directly away)
- Row 2: RIGHT view (character in strict right profile)
- Row 3 (bottom): LEFT view (character in strict left profile)

Columns 1 to 6 show consecutive temporal animation frames of a 6-frame subtle breathing and combat idle loop:
- Column 1: Base battle-ready stance with weapon held firmly, alert open eyes
- Column 2: Inhale starts, torso rises subtly by 1-2px, weapon tilts slightly, open eyes
- Column 3: Peak inhale apex with CLOSED EYES (character blinks with eyelids fully closed on frame 3 in all rows)
- Column 4: Exhale begins, shoulders lower smoothly, eyes open again
- Column 5: Weight settles back down toward resting baseline, open eyes
- Column 6: Smooth loop transition frame returning to base stance, open eyes

MANDATORY DETAIL: On column 3 (the 3rd frame) across all rows, the character has closed eyes (focused blink). Eyes are open on all other frames.

Chibi proportions (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots), consistent scale and grounded baseline across all cells.
Character holds the exact same [weapon/focus] in all frames and rows with consistent grip and size.

Pure solid magenta chromakey background rgb(255,0,255) #ff00ff directly under feet, clean 16-bit pixel art game sprites, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms.

Heroic RPG character design, battle-ready and dangerous despite chibi proportions.

No shadows under character feet, no drop shadows, no cast shadows, no floor, no ground line, no platform, no pedestal, no tile grid, no anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients, no text, no frame numbers, no grid lines.
```
