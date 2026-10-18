# IDLE Animation Prompt Guide (6-Frame Seamless Loop — Stationary Rest State)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_idle.png`**.

**IDLE is the stationary rest state**: The character is at rest in battle-ready stance, maintaining a stable grounded posture without steps or displacement, executing measured rhythmic breathing; feet remain firmly planted on the baseline (`y ≈ 88`).

---

## 1. Grid & Sheet Specifications

| Property | Value |
|---|---|
| Grid Dimensions | **6 columns × 3 rows** (18 source cells; Row 3 LEFT is auto-mirrored by script) |
| Cell Dimensions | 96 × 96 px (or native square cells e.g. 200×200 / 256×256) |
| Total Resolution | 576 × 288 px (or 1536 × 768 px high-res source) |
| Background | Pure solid magenta chromakey `rgb(255,0,255)` (`#ff00ff`) |
| Direction Rows (Top to Bottom) | Row 0: `FRONT` (facing camera)<br>Row 1: `BACK` (facing away — 100% rear view, no eyes/face)<br>Row 2: `RIGHT` (body sideways, face strictly in 90° profile)<br>*(Row 3 LEFT is automatically generated via script mirroring)* |

---

## 2. Mandatory Directional Profile & Back Protection Rules

* **Row 1 (BACK VIEW)**: The character faces 100% away from camera across **ALL 6 frames**. **NO face, NO eyes, and NO head turning on Frame 3**. The back of the hood/hair/backplate simply dips 1px with breath.
* **Row 2 (3rd row — RIGHT)**: The character faces to the RIGHT. The **body is ALWAYS turned sideways**, and the **face is strictly in 90° profile**. No three-quarters (3/4) views, no torso or head angled towards camera.

---

## 3. Frame-by-Frame Progression (Columns 1 to 6)

Every directional row depicts a subtle, rhythmic 6-frame combat idle / breathing loop:

* **Column 1 (Base Stance)**:
  - Alert, grounded battle-ready stance. Feet firmly planted on the baseline (`y ≈ 88`).
  - Weapon firmly held in ready combat grip.
  - Eyes are open, calm, and focused forward with a serious battle glare.
* **Column 2 (Inhale / Expansion)**:
  - Inhale begins. Torso and chest rise subtly by 1–2 pixels.
  - Subtle upward shift of weapon and hands following the breath.
  - Eyes remain open and watchful.
* **Column 3 (Peak Inhale & Mandatory Closed Eyes)**:
  - **MANDATORY CLOSED EYES**: On this 3rd frame across FRONT and RIGHT rows, the character's **eyes are fully closed** in a natural, calm blink. Closed dark eyelid contour.
  - **BACK ROW**: Remains 100% facing away. No eyes or face!
  - Torso is at maximum subtle vertical expansion (+2 px).
* **Column 4 (Exhale / Descent & Eye Normalization)**:
  - Exhale begins. Torso and shoulders lower smoothly.
  - **NORMALIZED EYES**: Eyes return to normal, steady, calm battle-ready gaze (identical size/shape to Column 1). **NO bulging eyes, NO wide crazy stare, NO anime shocked expression**.
  - Weapon lowers back toward resting height.
* **Column 5 (Settling)**:
  - Weight settles down toward the base resting pose.
  - Eyes remain open and focused.
* **Column 6 (Loop Transition)**:
  - Transition frame connecting smoothly back into Column 1.
  - Eyes remain open, weapon and posture align with the starting frame.

---

## 4. Negative & Stylistic Constraints

* **Strict Proportions**: Heroic Chibi (2.5 to 3 heads tall, large head ~30-35% height, compact sturdy body).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal, no tile grid**.
* **Global Magenta Keying & Defringing**: Magenta is removed globally inside and outside the character. Boundary edges are cleaned with a 1px black outline without any purple/magenta aura.
* **Weapon Continuity**: Same weapon firmly held across all frames and rows. Weapon never disappears.
* **Mandatory Negative Constraint**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients, no stiff body, no frozen torso, no mannequin animation, no bulging eyes, no wide crazy stare, no shocked expression, no cartoon eyes.`
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.
