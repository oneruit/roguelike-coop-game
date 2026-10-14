# ATTACK Animation Prompt Guide (6-Frame One-Shot Weapon Strike)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_attack.png`**.

---

## 1. Grid & Sheet Specifications

| Property | Value |
|---|---|
| Grid Dimensions | 6 columns × 4 rows (24 cells) |
| Cell Dimensions | 96 × 96 px |
| Total Resolution | 576 × 384 px (or 1152 × 768 px for high-res source) |
| Background | Pure solid magenta chromakey `rgb(255,0,255)` (`#ff00ff`) |
| Direction Rows (Top to Bottom) | Row 0: `FRONT` (face)<br>Row 1: `BACK` (back)<br>Row 2 (3rd row): `RIGHT` (right — body sideways, face strictly in profile)<br>Row 3 (4th row): `LEFT` (left — body sideways, face strictly in profile) |

---

## 2. Mandatory Directional Profile Rule

* **Row 2 (3rd row — RIGHT)**: The character strikes to the RIGHT. The **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso or head angled towards the camera.
* **Row 3 (4th row — LEFT)**: The character strikes to the LEFT. The **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso or head angled towards the camera.

---

## 3. Frame-by-Frame Progression (Columns 1 to 6)

Every directional row depicts a forceful, physical one-shot weapon strike (not a loop, not an attack-while-walking):

* **Column 1 (Ready / Pre-strike Stance)**:
  - Combat-ready posture, eyes locked onto the target plane.
  - Weapon held firmly in standard combat grip.
  - **Eyes are open, grim, and vigilant**.
* **Column 2 (Preparation / Weight Shift)**:
  - Weight drops onto the back foot; shoulders begin rotating.
  - Weapon begins shifting into chamber / backswing position.
  - **Eyes are open and fiercely locked forward**.
* **Column 3 (Apex Wind-up & Mandatory Closed Eyes)**:
  - **MANDATORY CLOSED EYES**: On this 3rd frame across all rows where eyes are visible, the character's **eyes are closed** in grim, explosive battle concentration / focus right before unleashing the strike.
  - Muscular tension peaks; weapon is pulled to maximum cocked backswing position.
  - Closed eyelids clearly depicted on FRONT, RIGHT, and LEFT rows.
* **Column 4 (Main Strike / Peak Impact Pose)**:
  - **Eyes snap open wide with fierce intensity**.
  - Weapon swings forward with maximum extension and forward weight delivery.
  - Clearest, most powerful silhouette frame of the strike.
* **Column 5 (Follow-through)**:
  - Weapon momentum completes its physical arc.
  - Body overshoots slightly under momentum before stabilizing.
  - **Eyes remain open and locked on the target plane**.
* **Column 6 (Recovery / Reset)**:
  - Weapon draws back toward ready position.
  - Weight re-centers into a stable stance ready to return smoothly to IDLE.
  - **Eyes open and alert**.

---

## 4. Negative & Stylistic Constraints

* **Strict Proportions**: Heroic Chibi (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal**.
* **Strictly No Attack VFX**: **NO slash arcs, NO energy blades, NO glowing weapon trails, NO sparks, NO impact flashes, NO speed lines, NO magic aura clutter**. The strike is conveyed purely through physical body mechanics and weapon motion.
* **Cell Clearance**: Weapon tips, heads, and boots must stay completely within each 96×96 cell without edge clipping.
* **Global Magenta Keying & Defringing**: Magenta is removed globally inside and outside the character. Boundary edges are cleaned with a 1px black outline without any purple/magenta aura.
* **Mandatory Negative Constraint**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.`
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.
