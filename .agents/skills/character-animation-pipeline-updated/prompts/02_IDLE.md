# IDLE Animation Prompt Guide (6-Frame Seamless Loop — Stationary Rest State)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_idle.png`**.

**IDLE is the stationary rest state**: The character is at rest in battle-ready stance, maintaining a stable grounded posture without steps or displacement, executing measured rhythmic breathing; feet remain firmly planted on the baseline (`y ≈ 88`).

---

## 1. Grid & Sheet Specifications

| Property | Value |
|---|---|
| Grid Dimensions | 6 columns × 4 rows (24 cells) |
| Cell Dimensions | 96 × 96 px |
| Total Resolution | 576 × 384 px (or 1152 × 768 px for high-res source) |
| Background | Pure solid magenta chromakey `rgb(255,0,255)` (`#ff00ff`) |
| Direction Rows (Top to Bottom) | Row 0: `FRONT` (front)<br>Row 1: `BACK` (rear)<br>Row 2 (3rd row): `RIGHT` (right — body sideways, face in profile)<br>Row 3 (4th row): `LEFT` (left — body sideways, face in profile) |

---

## 2. Mandatory Directional Profile Rule

* **Row 2 (3rd row — RIGHT)**: The character faces to the RIGHT. The **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso or head angled towards the camera.
* **Row 3 (4th row — LEFT)**: The character faces to the LEFT. The **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso or head angled towards the camera.

---

## 3. Frame-by-Frame Progression (Columns 1 to 6)

Every directional row depicts a subtle, rhythmic 6-frame combat idle / breathing loop:

* **Column 1 (Base Stance)**:
  - Alert, grounded battle-ready stance. Feet firmly planted on the baseline (`y ≈ 88`).
  - Weapon / magical focus firmly held in ready position.
  - **Eyes are open and alert**, focused directly forward in the direction of the row with a serious, grim expression.
* **Column 2 (Inhale / Expansion)**:
  - Inhale begins. Torso and chest rise subtly by 1–2 pixels.
  - Subtle upward shift of weapon and hands following the breath.
  - **Eyes are open and watchful**.
* **Column 3 (Peak Inhale & Mandatory Closed Eyes)**:
  - **MANDATORY CLOSED EYES**: On this 3rd frame across all rows where eyes are visible, the character's **eyes are fully closed** in a natural, calm, focused blink at the apex of the breath cycle.
  - Closed eyelids are rendered with a crisp dark lash contour on FRONT, RIGHT, and LEFT rows; on BACK row, slight meditative neck angle corresponds with the blink.
  - Torso is at maximum subtle vertical expansion (+2 px).
* **Column 4 (Exhale / Descent)**:
  - Exhale begins. Torso and shoulders begin lowering smoothly.
  - **Eyes snap open again**, sharp, vigilant, and battle-ready.
  - Weapon begins lowering back toward resting height.
* **Column 5 (Settling)**:
  - Weight settles down toward the base resting pose.
  - **Eyes remain open and focused**.
* **Column 6 (Loop Transition)**:
  - Transition frame connecting smoothly back into Column 1.
  - **Eyes remain open**, weapon and posture align with the starting frame.

---

## 4. Negative & Stylistic Constraints

* **Strict Proportions**: Heroic Chibi (2.5 to 3 heads tall, large head ~30-35% height, compact sturdy body).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal, no tile grid**.
* **Global Magenta Keying & Defringing**: Magenta is removed globally inside and outside the character. Boundary edges are cleaned with a 1px black outline without any purple/magenta aura.
* **Weapon Continuity**: Same weapon / focus held in all frames and rows. Plausible grip, no warping or disappearing items.
* **Mandatory Negative Constraint**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.`
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.
