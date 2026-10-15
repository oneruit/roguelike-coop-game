# WALK_ATTACK Animation Prompt Guide (6-Frame Action Cycle — Attack While Moving)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_walk_attack.png`**.

**WALK_ATTACK is the attack-while-moving state**: The character simultaneously moves (walking / running) and executes a weapon attack (firing on the run, slashing in stride, hurling projectiles or casting spells while advancing). Legs dynamically cycle foot-strikes along the baseline (`y ≈ 88`), while torso and arms execute wind-up, strike impact, and momentum follow-through in continuous motion.

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

* **Row 2 (3rd row — RIGHT)**: The character moves and attacks to the RIGHT. The **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso or head angled towards the camera.
* **Row 3 (4th row — LEFT)**: The character moves and attacks to the LEFT. The **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso or head angled towards the camera.

---

## 3. Frame-by-Frame Progression (Columns 1 to 6)

Every directional row depicts a dynamic 6-frame running/stride weapon strike cycle:

* **Column 1 (Stride Contact & Strike Anticipation)**:
  - Leading chunky boot extends forward touching the baseline (`y ≈ 88`), trailing boot pushes off.
  - Weapon begins rapid transition into cocked/drawn strike position.
  - **Eyes are open, focused, and scanning the line of advance**.
* **Column 2 (Drive Forward & Weapon Chambering)**:
  - Weight rolls vigorously onto the front foot in active forward locomotion.
  - Weapon reaches full ready chamber / backswing tension while moving.
  - **Eyes locked forward with fierce determination**.
* **Column 3 (Mid-Stride Passing Pose & Mandatory Closed Eyes)**:
  - **MANDATORY CLOSED EYES**: On this 3rd frame across all rows where eyes are visible, the character's **eyes are fully closed** in focused battle concentration at peak stride extension right before unleashing the attack.
  - Free leg swings through the passing stance; torso leans slightly forward under kinetic momentum.
  - Closed eyelids clearly depicted on FRONT, RIGHT, and LEFT rows.
* **Column 4 (Strike Release & Opposite Foot Plant)**:
  - **Eyes snap open wide with intense combat focus**.
  - Opposite boot makes firm ground strike on baseline; weapon swings / fires / thrusts forward with full forward momentum.
  - Primary damage impact pose.
* **Column 5 (Follow-through & Kinetic Recovery)**:
  - Weapon momentum completes its discharge/slash arc while stride continues smoothly.
  - Upper body stabilizes from the attack recoil.
  - **Eyes remain open and locked on the target path**.
* **Column 6 (Cycle Transition Frame)**:
  - Trailing foot swings forward, posture aligns smoothly back into Column 1.
  - Weapon returns to ready-stride stance for seamless continuous playback while moving and attacking.
  - **Eyes open and alert**.

---

## 4. Negative & Stylistic Constraints

* **Strict Proportions**: Heroic Chibi (2.5 to 3 heads tall, large head ~30-35% height, compact body, sturdy boots).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal, no dust clouds**.
* **Strictly No Attack VFX**: **NO slash arcs, NO energy blades, NO glowing weapon trails, NO sparks, NO impact flashes, NO speed lines, NO magic aura clutter**. The strike is conveyed purely through physical body mechanics, stride, and weapon motion.
* **Cell Clearance**: Weapon tips, heads, and boots must stay completely within each 96×96 cell without edge clipping.
* **Global Magenta Keying & Defringing**: Magenta is removed globally inside and outside the character. Boundary edges are cleaned with a 1px black outline without any purple/magenta aura.
* **Mandatory Negative Constraint**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.`
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.
