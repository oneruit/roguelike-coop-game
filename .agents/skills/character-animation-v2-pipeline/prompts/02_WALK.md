# WALK Animation Prompt Guide (6-Frame Loop)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_walk.png`** using `character-animation-v2-pipeline`.

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
* **Row 0 (Top)**: `FRONT` (Лицо) — Character walking towards bottom / facing camera.
* **Row 1**: `BACK` (Спина) — Character walking away / facing top.
* **Row 2**: `RIGHT` (Правая сторона) — Strict right-facing profile walk cycle.
* **Row 3 (Bottom)**: `LEFT` (Левая сторона) — Strict left-facing profile walk cycle.

---

## 2. Frame-by-Frame Progression (Columns 1 to 6)

Every direction row depicts a balanced, rhythmic 6-frame combat walking loop:

* **Column 1 (Contact)**:
  - Lead foot (left foot) strikes the ground forward with solid contact.
  - Trailing foot pushes off the ground behind.
  - Arms / weapon counter-balance the stride.
  - **Eyes are open and focused forward**.
* **Column 2 (Down / Weight Transfer)**:
  - Lead leg absorbs body weight with slight knee flex.
  - Torso drops slightly (lowest vertical position in the stride, -1 to -2 px).
  - Trailing heel lifts off ground.
  - **Eyes are open**.
* **Column 3 (Passing / Mid-Stride & Mandatory Eye Blink)**:
  - **MANDATORY CLOSED EYES**: On this 3rd frame across all rows, the character's **eyes are fully closed** in a natural stride blink / determined focus.
  - Trailing foot swings forward passing the planted leg; body rises to mid-height.
  - Closed eyelids clearly depicted on FRONT, RIGHT, and LEFT rows.
* **Column 4 (Opposite Contact)**:
  - Opposite foot (right foot) strikes the ground forward with solid contact.
  - Previous lead foot is now planted behind.
  - **Eyes snap open again**, sharp and vigilant.
* **Column 5 (Opposite Down / Weight Transfer)**:
  - Right leg absorbs body weight with slight knee flex.
  - Torso settles slightly into the step.
  - Trailing heel lifts off ground.
  - **Eyes remain open**.
* **Column 6 (Passing / Loop Transition)**:
  - Trailing leg swings forward passing the planted leg, returning smoothly to Column 1.
  - **Eyes remain open**.

---

## 3. Negative & Stylistic Constraints

* **Strict Proportions**: Chibi miniature (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor, no ground line, no platform, no pedestal, no tile grid**.
* **Weapon Continuity**: Same weapon / focus held in all frames and rows with consistent grip.
* **No Anime / Kawaii**: No smiles, no blush, no cute baby face, no soft pastel colors.
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.

---

## 4. Master Prompt Template for WALK

```text
16-bit chibi pixel art 6x4 animation sprite sheet for a WALK animation of [character description].

Sprite sheet layout: Exactly 6 columns by 4 rows of 128x128 pixel cells on a 768x512 canvas.
Row order from top to bottom:
- Row 0 (top): FRONT view (character facing forward toward camera)
- Row 1: BACK view (character facing directly away)
- Row 2: RIGHT view (character in strict right profile)
- Row 3 (bottom): LEFT view (character in strict left profile)

Columns 1 to 6 show consecutive temporal animation frames of a 6-frame rhythmic combat walking loop:
- Column 1: Contact pose with lead foot touching ground, weapon balanced, alert open eyes
- Column 2: Down pose absorbing step weight with knee flex, open eyes
- Column 3: Passing pose with swinging leg passing planted foot, CLOSED EYES (character blinks with eyelids fully closed on frame 3 in all rows)
- Column 4: Opposite contact pose with opposite foot striking ground, eyes open again
- Column 5: Opposite down pose absorbing weight, open eyes
- Column 6: Opposite passing pose looping smoothly back to frame 1, open eyes

MANDATORY DETAIL: On column 3 (the 3rd frame) across all rows, the character has closed eyes (focused mid-stride blink). Eyes are open on all other frames.

Chibi proportions (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots), consistent scale and grounded baseline across all cells.
Character holds the exact same [weapon/focus] in all frames and rows with consistent grip and size.

Pure solid magenta chromakey background rgb(255,0,255) #ff00ff directly under feet, clean 16-bit pixel art game sprites, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms.

Heroic RPG character design, battle-ready and dangerous despite chibi proportions.

No shadows under character feet, no drop shadows, no cast shadows, no floor, no ground line, no platform, no pedestal, no tile grid, no anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients, no text, no frame numbers, no grid lines.
```
