# WALK Animation Prompt Guide (6-Frame Looping Cycle)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_walk.png`**.

---

## 1. Grid & Sheet Specifications

| Property | Value |
|---|---|
| Grid Dimensions | 6 columns × 4 rows (24 cells) |
| Cell Dimensions | 128 × 128 px |
| Total Resolution | 768 × 512 px (or 1536 × 1024 px for high-res source) |
| Background | Pure solid magenta chromakey `rgb(255,0,255)` (`#ff00ff`) |
| Direction Rows (Top to Bottom) | Row 0: `FRONT`<br>Row 1: `BACK`<br>Row 2: `LEFT` (or `RIGHT` depending on engine layout)<br>Row 3: `RIGHT` (or `LEFT`) |

---

## 2. Frame-by-Frame Progression (Columns 1 to 6)

Every directional row depicts a measured, determined 6-frame combat walk cycle (not running, sliding, or dodging):

* **Column 1 (Contact Pose 1)**:
  - First foot-strike pose: one chunky boot extends forward touching the baseline, opposite foot planted behind.
  - Arms and held weapon slightly swing in counter-balance to the stride.
  - **Eyes are open and alert**, scanning ahead.
* **Column 2 (Weight Shift / Push-off 1)**:
  - Weight transfers squarely onto the leading foot; trailing heel lifts off the ground.
  - Torso experiences slight vertical rise (+1 px).
  - **Eyes are open and focused**.
* **Column 3 (Passing Pose 1 & Mandatory Closed Eyes)**:
  - **MANDATORY CLOSED EYES**: On this 3rd frame across all rows where eyes are visible, the character's **eyes are fully closed** in a momentary blink of intense focus during the mid-stride leg pass.
  - Free leg swings through past the supporting leg.
  - Closed eyelids clearly drawn on FRONT, LEFT, and RIGHT rows.
* **Column 4 (Contact Pose 2)**:
  - Opposite foot-strike pose: opposite boot extends forward, reversing the leg posture from Column 1.
  - **Eyes snap open again**, sharp and vigilant.
  - Torso settles onto the forward foot.
* **Column 5 (Weight Shift / Push-off 2)**:
  - Weight transfers onto the newly grounded foot; opposite heel lifts.
  - Torso rises (+1 px) in steady rhythm.
  - **Eyes remain open and watchful**.
* **Column 6 (Passing Pose 2 / Loop Return)**:
  - Opposite leg passes through, returning smoothly into Column 1.
  - **Eyes remain open**, weapons and clothing align cleanly for seamless playback loop.

---

## 3. Negative & Stylistic Constraints

* **Strict Proportions**: Heroic Chibi (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal, no dust clouds**.
* **Weapon Continuity**: Same weapon / focus held throughout all frames and rows.
* **Mandatory Negative Constraint**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.`
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.
