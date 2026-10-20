# WALK_ATTACK Animation Prompt Guide (6-Frame Action Cycle — Attack While Moving)

This instruction defines the exact prompt structure and frame-by-frame progression for generating **`hero_[name]_walk_attack.png`**.

**WALK_ATTACK is the attack-while-moving state**: The character simultaneously moves (walking / running) and executes a weapon attack (firing on the run, slashing in stride, hurling projectiles or casting spells while advancing). Legs dynamically cycle foot-strikes along the baseline (`y ≈ 88`), while torso and arms execute wind-up, strike impact, and momentum follow-through in continuous motion.

---

## 1. Grid & Sheet Specifications

| Property | Value |
|---|---|
| Grid Dimensions | **6 columns × 3 rows** (18 source cells; Row 3 LEFT is auto-mirrored by script) |
| Cell Dimensions | 96 × 96 px (or native square cells e.g. 200×200 / 256×256) |
| Total Resolution | 576 × 288 px (or 1536 × 768 px high-res source) |
| Background | Pure solid magenta `rgb(255,0,255)` (`#ff00ff`) by default; **Pure Green `rgb(0,255,0)` (`#00ff00`) if character contains purple/pink/magenta** |
| Direction Rows (Top to Bottom) | Row 0: `FRONT` (moving & attacking toward camera)<br>Row 1: `BACK` (moving & attacking away — 100% rear view, no eyes/face)<br>Row 2: `RIGHT` (moving & attacking to right, body sideways, face in 90° profile)<br>*(Row 3 LEFT is automatically generated via script mirroring)* |

---

## 2. Mandatory Directional Profile & Back Protection Rules

* **Row 1 (BACK VIEW)**: The character moves and attacks 100% away from camera across **ALL 6 frames**. **NO face, NO eyes, and NO head turning on Frame 3**. The rear cowl/hair/backplate sways with the dynamic stride and swing.
* **Row 2 (3rd row — RIGHT)**: The character moves and attacks to the RIGHT. The **body is ALWAYS turned sideways**, and the **face is strictly in 90° profile**. No three-quarters (3/4) views, no torso or head angled towards camera.
  - **COMPACT PROFILE HEAD RULE (NO BALLOON/SPHERE)**: Head depth horizontally (nose to back of hair) must be compact and streamlined (~28–32px, $\approx 80–85\%$ of front width, NEVER exceeding front width). Hair bob drapes naturally down the neck; strictly NO giant spherical basketball head.

---

## 3. Frame-by-Frame Progression (Columns 1 to 6) — Dynamic Moving Attack Cycle

Every directional row depicts a dynamic 6-frame running/stride weapon strike cycle with **whole-body commitment, explicit alternating leg mechanics, and weapon kinetics** (NO frozen torso, NO sliding on one leg):

* **Column 1 (Stride Contact 1 & Weapon Anticipation)**:
  - **Legs**: **Right (near) chunky boot extends forward** touching baseline (`y ≈ 88`); Left (far) boot pushes off behind.
  - **Weapon & Body**: Torso leans 5–10° forward into stride; weapon draws into cocked/ready strike position.
  - **Eyes & Facing**: Eyes are open, calm, and alert with narrow battle gaze. Row 0 is 100% FRONT-FACING.
* **Column 2 (Drive Forward & Weapon Chambering — NO STAGNATION)**:
  - **Legs**: Weight rolls vigorously onto the forward Right boot; Left (far) boot bends and heel lifts off ground.
  - **Weapon & Body**: Torso coils slightly, shoulders rotate to chamber full weapon backswing while moving.
  - **Eyes**: Eyes locked forward with battle focus.
* **Column 3 (Mid-Stride Passing Pose & Mandatory Closed Eyes)**:
  - **Legs**: **Left (far) knee swings forward PAST the right supporting leg**; feet pass each other mid-stride.
  - **MANDATORY CLOSED EYES**: On this 3rd frame across FRONT and RIGHT rows, the character's **eyes are fully closed** in combat concentration during the passing phase.
  - **BACK ROW**: Remains 100% facing away. No eyes or face!
* **Column 4 (Explosive Strike Release & Stride Alternation)**:
  - **Legs (REVERSED STRIDE)**: **Left (far) boot plants firmly forward on baseline**; **Right (near) boot trails behind**!
  - **FULL-STRIDE LUNGE**: Arm snaps forward unleashing the weapon strike with full body momentum.
  - **EYE NORMALIZATION**: Eyes open to normal, steady, calm battle-ready gaze (identical size/shape to Column 1). **NO bulging eyes, NO wide crazy stare, NO anime shocked expression**.
  - **WEAPON CONTINUITY**: Character firmly grips the weapon during the full forward release arc. Weapon NEVER disappears or flies out of hands!
* **Column 5 (Follow-through & Kinetic Recovery)**:
  - Weight rolls onto Left boot; Right boot begins lifting to advance.
  - Weapon momentum completes its strike/slash arc while stride continues smoothly.
  - Upper body absorbs recoil and stabilizes. Weapon firmly held. Eyes remain open and locked on target.
* **Column 6 (Cycle Transition Frame — NO Torso Twist)**:
  - Right boot swings forward past Left leg, aligning smoothly to touch down into Column 1.
  - **ROW 0 STRICT FRONT LOCK**: In Row 0, the body, chest, and hips MUST remain **strictly 100% FRONT-FACING** toward the camera. **NO 3/4 body twist on Column 6**.
  - Weapon returns to ready-stride stance for seamless continuous playback. Eyes open and alert.

---

## 4. Negative & Stylistic Constraints

* **Strict Proportions**: Super-Deformed Chibi (strictly 2.0 to 2.4 heads tall max, massive head taking 42–45% of height, head wider than shoulders, ultra-compact stubby torso, oversized chunky boots).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal, no dust clouds**.
* **Strictly No Attack VFX**: **NO slash arcs, NO energy blades, NO glowing weapon trails, NO sparks, NO impact flashes, NO speed lines, NO magic aura clutter**. The strike is conveyed purely through physical body mechanics, stride, and weapon motion.
* **Weapon Continuity Contract**: Weapon must remain firmly held across ALL 6 frames. Weapon never disappears or dissolves.
* **Anti-Cloning Rule**: Frame 1 and Frame 6 must NEVER be identical clones. Frames 1, 2, and 3 must NEVER be static frozen clones.
* **Cell Clearance**: Weapon tips, heads, and boots must stay completely within each cell without edge clipping.
* **Global Magenta Keying & Defringing**: Magenta is removed globally inside and outside the character. Boundary edges are cleaned with a 1px black outline without any purple/magenta aura.
* **Mandatory Negative Constraint**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic human proportions, no photorealism, no smooth gradients, no stiff body, no frozen torso, no mannequin animation, no lifeless posture, no bulging eyes, no wide crazy stare, no shocked expression, no cartoon eyes, no tall adult body, no 4+ heads proportions, no broad adult shoulders with small head, no giant spherical profile head, no balloon head, no basketball head, no elongated horizontal skull, head horizontal depth must not exceed frontal width, no one-leg gliding, no sliding feet, no frozen hips, no twisted 3/4 torso in front row, no duplicate frame 1 and 6, no static frames 1 2 3.`
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.

