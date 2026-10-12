# ATTACK Animation Prompt Guide (6-Frame One-Shot Strike)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_attack.png`** using `character-animation-v2-pipeline`.

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
* **Row 0 (Top)**: `FRONT` (Лицо) — Character attacking toward bottom / facing camera.
* **Row 1**: `BACK` (Спина) — Character attacking away / facing top.
* **Row 2**: `RIGHT` (Правая сторона) — Strict right-facing profile attack animation.
* **Row 3 (Bottom)**: `LEFT` (Левая сторона) — Strict left-facing profile attack animation.

---

## 2. Frame-by-Frame Progression (Columns 1 to 6)

Every direction row depicts a punchy, high-impact 6-frame combat strike:

* **Column 1 (Ready / Pre-Attack)**:
  - Stable combat posture with weapon / hands cocked in readiness.
  - **Eyes are open**, assessing distance and locked onto the target.
* **Column 2 (Anticipation / Pull-back)**:
  - Weight shifts backward, torso rotates, arms begin drawing weapon / energy back.
  - Muscular tension begins building up.
  - **Eyes are open**, focused on the target point.
* **Column 3 (Peak Wind-up & Mandatory Eye Concentration)**:
  - **MANDATORY CLOSED EYES**: On this 3rd frame across all rows, the character's **eyes are fully closed** in a moment of extreme combat focus, breath hold, and sensory concentration before the explosive release.
  - Maximum tension pose: torso coiled to the maximum, weapon / hands pulled back to the apex of the backswing.
  - Closed eyelids clearly depicted on FRONT, RIGHT, and LEFT rows; on BACK row, neck and shoulder muscles are coiled at peak tension.
* **Column 4 (Explosive Strike / Release)**:
  - Sudden, explosive forward slash, thrust, or release.
  - **Eyes snap open wide with fierce, piercing intensity**.
  - Maximum physical extension of arms and weapon, producing the strongest readable combat silhouette.
* **Column 5 (Follow-Through / Deceleration)**:
  - Momentum carries the weapon and torso slightly past the impact point.
  - Body absorbs the forward kinetic energy, deceleration begins.
  - **Eyes remain open and sharp**.
* **Column 6 (Recovery / Recoil)**:
  - Weapon begins returning toward balanced resting position.
  - Feet re-stabilize on the baseline, preparing for seamless transition back to IDLE.
  - **Eyes remain open**.

---

## 3. Negative & Stylistic Constraints

* **Strict Proportions**: Chibi miniature (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor, no ground line, no platform, no pedestal, no tile grid**.
* **Weapon Continuity**: Same weapon / focus held in all frames and rows with consistent grip and dimensions.
* **Zero Attack VFX Clutter**: **No cartoon slash arcs, no impact flashes, no speed lines, no dust clouds, no anime energy trails**. Communicate the attack through physical posture, wind-up, and weapon trajectory.
* **No Anime / Kawaii**: No smiles, no blush, no cute baby face, no soft pastel colors.
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.

---

## 4. Master Prompt Template for ATTACK

```text
16-bit chibi pixel art 6x4 animation sprite sheet for an ATTACK animation of [character description].

Sprite sheet layout: Exactly 6 columns by 4 rows of 128x128 pixel cells on a 768x512 canvas.
Row order from top to bottom:
- Row 0 (top): FRONT view (character facing forward toward camera)
- Row 1: BACK view (character facing directly away)
- Row 2: RIGHT view (character in strict right profile)
- Row 3 (bottom): LEFT view (character in strict left profile)

Columns 1 to 6 show consecutive temporal animation frames of a 6-frame one-shot combat attack:
- Column 1: Ready combat stance with weapon/hands raised, alert open eyes
- Column 2: Preparation and backward weight shift, pulling weapon back, open eyes
- Column 3: Full wind-up anticipation at peak tension with CLOSED EYES (character has eyelids fully closed on frame 3 in all rows in intense focus)
- Column 4: Explosive strike with eyes snapping wide open, maximum forward weapon extension and dynamic silhouette
- Column 5: Follow-through extension and momentum deceleration, open eyes
- Column 6: Recovery returning toward ready combat stance, open eyes

MANDATORY DETAIL: On column 3 (the 3rd frame) across all rows, the character has closed eyes (intense concentration / breath hold). Eyes are open on all other frames.

Chibi proportions (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots), consistent scale and grounded baseline across all cells.
Character holds the exact same [weapon/focus] in all frames and rows with consistent grip and size.

Pure solid magenta chromakey background rgb(255,0,255) #ff00ff directly under feet, clean 16-bit pixel art game sprites, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms.

Heroic RPG character design, battle-ready and dangerous despite chibi proportions.

No shadows under character feet, no drop shadows, no cast shadows, no floor, no ground line, no platform, no pedestal, no tile grid, no cartoon slash arcs, no anime impact flashes, no anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients, no text, no frame numbers, no grid lines.
```
