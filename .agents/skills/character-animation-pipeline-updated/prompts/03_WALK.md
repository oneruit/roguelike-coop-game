# WALK Animation Prompt Guide (6-Frame Looping Cycle — Locomotion / Movement State)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_walk.png`**.

**WALK is the locomotion / movement state**: The character is in motion (locomotion / walking), rhythmically alternating booted feet along the baseline (`y ≈ 88`) in a steady walking cycle without executing an attack.

---

## 1. Grid & Sheet Specifications

| Property | Value |
|---|---|
| Grid Dimensions | **6 columns × 3 rows** (18 source cells; Row 3 LEFT is auto-mirrored by script) |
| Cell Dimensions | 96 × 96 px (or native square cells e.g. 200×200 / 256×256) |
| Total Resolution | 576 × 288 px (or 1536 × 768 px high-res source) |
| Background | Pure solid magenta chromakey `rgb(255,0,255)` (`#ff00ff`) |
| Direction Rows (Top to Bottom) | Row 0: `FRONT` (walking toward camera)<br>Row 1: `BACK` (walking away — 100% rear view, no eyes/face)<br>Row 2: `RIGHT` (walking to right, body sideways, face in 90° profile)<br>*(Row 3 LEFT is automatically generated via script mirroring)* |

---

## 2. Mandatory Directional Profile & Back Protection Rules

* **Row 1 (BACK VIEW)**: The character walks 100% away from camera across **ALL 6 frames**. **NO face, NO eyes, and NO head turning on Frame 3**. The back of the hood/hair/backplate simply sways and dips slightly with the stride.
* **Row 2 (3rd row — RIGHT)**: The character walks to the RIGHT. The **body is ALWAYS turned sideways**, and the **face is strictly in 90° profile**. No three-quarters (3/4) views, no torso or head angled towards camera.

---

## 3. Frame-by-Frame Progression (Columns 1 to 6) — Dynamic Whole-Body Locomotion

Every directional row depicts a measured, determined 6-frame combat walk cycle with **dynamic whole-body kinematics** (NO frozen torso or stiff mannequin animation):

* **Column 1 (Contact Pose 1)**:
  - First foot-strike pose: one chunky boot extends forward touching the baseline (`y ≈ 88`), opposite foot planted behind.
  - Torso leans forward 5–10° into the stride; arms and held weapon swing in counter-balance.
  - Eyes are open, calm, and alert, scanning ahead.
* **Column 2 (Weight Shift / Push-off 1)**:
  - Weight transfers squarely onto the leading foot; trailing heel lifts off the ground.
  - Torso experiences subtle vertical rise (+1–2 px) in natural bounce.
  - Eyes are open and focused.
* **Column 3 (Passing Pose 1 & Mandatory Closed Eyes)**:
  - **MANDATORY CLOSED EYES**: On this 3rd frame across FRONT and RIGHT rows, the character's **eyes are fully closed** in a momentary blink of intense focus during the mid-stride leg pass.
  - **BACK ROW**: Remains 100% facing away. No eyes or face!
  - Free leg swings through past the supporting leg; torso maintains forward momentum.
* **Column 4 (Contact Pose 2 & Eye Normalization)**:
  - Opposite foot-strike pose: opposite boot extends forward, reversing the leg posture from Column 1.
  - **NORMALIZED EYES**: Eyes return to normal, steady, calm battle-ready gaze (identical size/shape to Column 1). **NO bulging eyes, NO wide crazy stare, NO anime shocked expression**.
  - Torso settles onto the forward foot with slight downward dip (-1 px).
* **Column 5 (Weight Shift / Push-off 2)**:
  - Weight transfers onto the newly grounded foot; opposite heel lifts.
  - Torso rises (+1–2 px) in steady rhythm.
  - Eyes remain open and watchful.
* **Column 6 (Passing Pose 2 / Loop Return)**:
  - Opposite leg passes through, returning smoothly into Column 1.
  - Eyes remain open, weapons and clothing align cleanly for seamless playback loop.

---

## 4. Negative & Stylistic Constraints

* **Strict Proportions**: Heroic Chibi (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal, no dust clouds**.
* **Global Magenta Keying & Defringing**: Magenta is removed globally inside and outside the character. Boundary edges are cleaned with a 1px black outline without any purple/magenta aura.
* **Weapon Continuity**: Same weapon firmly held throughout all frames and rows. Weapon never disappears.
* **Mandatory Negative Constraint**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients, no stiff body, no frozen torso, no mannequin animation, no lifeless posture, no bulging eyes, no wide crazy stare, no shocked expression, no cartoon eyes.`
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.
