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

## 3. Frame-by-Frame Progression (Columns 1 to 6) — Dynamic Whole-Body Locomotion & Explicit Leg Alternation

Every directional row depicts a measured, determined 6-frame combat walk cycle with **dynamic whole-body kinematics and true alternating leg strides** (NO frozen mannequin torso, NO sliding on one leg):

* **Column 1 (Stride Contact 1 — Right Foot Forward)**:
  - **Legs**: **Right (near) chunky boot extends forward** touching baseline (`y ≈ 88`); **Left (far) boot is planted behind** trailing the body.
  - **Body Kinematics**: Torso leans 5–10° forward into stride; shoulders counter-rotate; arms and held weapon swing naturally in counter-balance.
  - **Eyes & Facing**: Eyes are open, calm, and alert with a narrow battle glare. In Row 0 (FRONT), body and boots face strictly 100% toward the camera.
* **Column 2 (Drive & Weight Shift 1)**:
  - **Legs**: Body rolls weight onto the forward Right boot; Left (far) heel lifts off the ground, knee begins bending forward.
  - **Body Kinematics**: Torso experiences subtle vertical rise (+1–2 px) in natural stride bounce; weapon bobs with stride.
  - **Eyes & Facing**: Eyes remain open and focused.
* **Column 3 (Apex Mid-Stride Passing 1 & Mandatory Closed Eyes)**:
  - **Legs**: **Left (far) knee swings forward PAST the right supporting leg**. Feet pass each other mid-stride.
  - **MANDATORY CLOSED EYES**: On this 3rd frame across FRONT and RIGHT rows, the character's **eyes are fully closed** in a momentary blink of intense focus mid-stride.
  - **BACK ROW**: Remains 100% facing away. No eyes or face!
* **Column 4 (Stride Contact 2 — Left Foot Forward & Eye Normalization)**:
  - **Legs (REVERSED STRIDE)**: **Left (far) chunky boot steps FORWARD** touching the baseline ahead of the body; **Right (near) boot is now trailing behind**! (True leg alternation — not sliding on the same foot!).
  - **EYE NORMALIZATION**: Eyes return to normal, steady, calm battle-ready gaze (identical size, narrow eyelid slit, and pupil scale to Column 1). **NO wide-eyed surprise, NO round eyes, NO bulging eyes, NO crazy stare**.
  - **Body Kinematics**: Torso settles down onto forward foot with slight dip (-1 px).
* **Column 5 (Drive & Weight Shift 2)**:
  - **Legs**: Weight rolls onto the forward Left boot; Right (near) heel lifts off the ground and begins swinging forward from behind.
  - **Body Kinematics**: Torso rises (+1–2 px) in steady rhythm.
  - **Eyes & Facing**: Eyes remain open and watchful.
* **Column 6 (Passing Pose 2 / Loop Return — NO Torso Twist)**:
  - **Legs**: Right boot swings forward past the left leg, aligning smoothly to touch down into Column 1.
  - **ROW 0 STRICT FRONT LOCK**: In Row 0, the body, chest, and hips MUST remain **strictly 100% FRONT-FACING** toward the camera. **NO 3/4 body twist, NO angled torso rotation on Column 6**.
  - **Eyes**: Eyes remain open and alert, weapon aligns cleanly for seamless continuous playback loop.

---

## 4. Negative & Stylistic Constraints

* **Strict Proportions**: Super-Deformed Chibi (strictly 2.0 to 2.4 heads tall max, massive head taking 42–45% of height, head wider than shoulders, ultra-compact stubby torso, oversized chunky boots).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal, no dust clouds**.
* **Global Magenta Keying & Defringing**: Magenta is removed globally inside and outside the character. Boundary edges are cleaned with a 1px black outline without any purple/magenta aura.
* **Weapon Continuity**: Same weapon firmly held throughout all frames and rows. Weapon never disappears.
* **Mandatory Negative Constraint**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic human proportions, no photorealism, no smooth gradients, no stiff body, no frozen torso, no mannequin animation, no lifeless posture, no bulging eyes, no wide crazy stare, no shocked expression, no cartoon eyes, no tall adult body, no 4+ heads proportions, no broad adult shoulders with small head, no one-leg gliding, no sliding feet, no frozen hips, no twisted 3/4 torso in front row.`
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.

