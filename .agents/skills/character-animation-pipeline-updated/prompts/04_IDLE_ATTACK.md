# IDLE_ATTACK Animation Prompt Guide (6-Frame One-Shot Weapon Strike — Stationary Attack State)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_idle_attack.png`** (also saved as `hero_[name]_attack.png` for backwards compatibility).

**IDLE_ATTACK is the stationary attack state**: The character executes a strike, shot, or weapon release while remaining stationary in place (at rest, without displacement). Feet are firmly locked in combat stance on the baseline (`y ≈ 88`), with the entire body executing a powerful wind-up, strike impact, and recovery back to resting combat stance.

---

## 1. Grid & Sheet Specifications

| Property | Value |
|---|---|
| Grid Dimensions | **6 columns × 3 rows** (18 source cells; Row 3 LEFT is auto-mirrored by script) |
| Cell Dimensions | 96 × 96 px (or native square cells e.g. 200×200 / 256×256) |
| Total Resolution | 576 × 288 px (or 1536 × 768 px high-res source) |
| Background | Pure solid magenta chromakey `rgb(255,0,255)` (`#ff00ff`) |
| Direction Rows (Top to Bottom) | Row 0: `FRONT` (attacking toward camera)<br>Row 1: `BACK` (attacking away — 100% rear view, no eyes/face)<br>Row 2: `RIGHT` (attacking to right, body sideways, face in 90° profile)<br>*(Row 3 LEFT is automatically generated via script mirroring)* |

---

## 2. Mandatory Directional Profile & Back Protection Rules

* **Row 1 (BACK VIEW)**: The character attacks 100% away from camera across **ALL 6 frames**. **NO face, NO eyes, and NO head turning on Frame 3**. The rear cowl/hair/backplate simply coils back on Frame 3 and drives forward on Frame 4.
* **Row 2 (3rd row — RIGHT)**: The character strikes to the RIGHT. The **body is ALWAYS turned sideways**, and the **face is strictly in 90° profile**. No three-quarters (3/4) views, no torso or head angled towards camera.

---

## 3. Frame-by-Frame Progression (Columns 1 to 6) — Whole-Body Physical Strike

Every directional row depicts a forceful, physical one-shot weapon strike with **full-body kinetic commitment** (NO stiff mannequin posture):

* **Column 1 (Ready / Pre-strike Stance)**:
  - Stationary combat-ready posture, eyes locked onto the target plane.
  - Feet planted firmly on the baseline (`y ≈ 88`).
  - Weapon held firmly in standard combat grip. Eyes are open, calm, and alert.
* **Column 2 (Preparation & Torso Coil)**:
  - Weight drops onto the back foot; torso coils and shoulders rotate backward.
  - Weapon begins shifting into cocked chamber / backswing position.
  - Eyes are open and locked forward.
* **Column 3 (Apex Wind-up & Mandatory Closed Eyes)**:
  - **MANDATORY CLOSED EYES**: On this 3rd frame across FRONT and RIGHT rows, the character's **eyes are fully closed** in grim combat concentration right before unleashing the strike.
  - **BACK ROW**: Remains 100% facing away. No eyes or face!
  - Muscular tension peaks; torso pulls back to maximum coiled tension.
* **Column 4 (Explosive Strike Release & Eye Normalization)**:
  - **FULL-BODY LUNGE**: Torso explosively drives forward (8–12px), shoulders rotate with full swing follow-through, head drives forward toward the target plane.
  - **NORMALIZED EYES**: Eyes open to normal, steady, calm battle-ready gaze (identical size/shape to Column 1). **NO bulging eyes, NO wide crazy stare, NO anime shocked expression**.
  - **WEAPON CONTINUITY**: Character firmly grips the weapon during the full forward release arc. Weapon NEVER disappears or flies out of hands!
* **Column 5 (Follow-through & Deceleration)**:
  - Weapon momentum completes its physical arc.
  - Upper body overshoots slightly under kinetic momentum before absorbing recoil.
  - Weapon remains firmly in hand. Eyes remain open and focused on the target plane.
* **Column 6 (Recovery / Reset)**:
  - Weapon draws back toward ready position.
  - Torso straightens, weight re-centers into a stable stance ready to return smoothly to IDLE.
  - Eyes open and alert.

---

## 4. Negative & Stylistic Constraints

* **Strict Proportions**: Heroic Chibi (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal**.
* **Strictly No Attack VFX**: **NO slash arcs, NO energy blades, NO glowing weapon trails, NO sparks, NO impact flashes, NO speed lines, NO magic aura clutter**. The strike is conveyed purely through physical body mechanics and weapon motion.
* **Weapon Continuity Contract**: Weapon must remain firmly held across ALL 6 frames. Weapon never disappears or dissolves.
* **Cell Clearance**: Weapon tips, heads, and boots must stay completely within each cell without edge clipping.
* **Global Magenta Keying & Defringing**: Magenta is removed globally inside and outside the character. Boundary edges are cleaned with a 1px black outline without any purple/magenta aura.
* **Mandatory Negative Constraint**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients, no stiff body, no frozen torso, no mannequin animation, no lifeless posture, no bulging eyes, no wide crazy stare, no shocked expression, no cartoon eyes.`
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.
