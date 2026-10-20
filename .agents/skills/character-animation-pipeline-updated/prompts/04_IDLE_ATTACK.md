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
| Background | Pure solid magenta `rgb(255,0,255)` (`#ff00ff`) by default; **Pure Green `rgb(0,255,0)` (`#00ff00`) if character contains purple/pink/magenta** |
| Direction Rows (Top to Bottom) | Row 0: `FRONT` (attacking toward camera)<br>Row 1: `BACK` (attacking away — 100% rear view, no eyes/face)<br>Row 2: `RIGHT` (attacking to right, body sideways, face in 90° profile)<br>*(Row 3 LEFT is automatically generated via script mirroring)* |

---

## 2. Mandatory Directional Profile & Back Protection Rules

* **Row 1 (BACK VIEW)**: The character attacks 100% away from camera across **ALL 6 frames**. **NO face, NO eyes, and NO head turning on Frame 3**. The rear cowl/hair/backplate simply coils back on Frame 3 and drives forward on Frame 4.
* **Row 2 (3rd row — RIGHT)**: The character strikes to the RIGHT. The **body is ALWAYS turned sideways**, and the **face is strictly in 90° profile**. No three-quarters (3/4) views, no torso or head angled towards camera.

---

## 3. Frame-by-Frame Progression (Columns 1 to 6) — Kinetic Strike Cycle

`IDLE_ATTACK` is a one-shot kinetic strike sequence. Every single frame MUST show distinct, progressive physical change. **Frame 1 and Frame 6 must NEVER be identical**.

* **Column 1 (Anticipation / Pre-strike Grip)**:
  - Combat-ready stance, feet planted on baseline (`y ≈ 88`).
  - Hand shifts into firm strike grip; knees flex slightly; weapon is aimed forward. Eyes are open, calm, and alert.
* **Column 2 (Progressive Chambering & Torso Coil — NO STAGNATION)**:
  - Weight drops onto the back foot; torso coils and shoulders rotate backward 10–15°.
  - **WEAPON RISES / CHAMBERS**: Weapon visibly draws back into cocked position (NOT identical to Frame 1!).
  - Eyes remain open and locked on the target.
* **Column 3 (Apex Wind-up & Mandatory Closed Eyes)**:
  - **MAXIMUM BACKSWING COIL**: Torso and weapon reach peak backswing tension right before release.
  - **MANDATORY CLOSED EYES**: On this 3rd frame across FRONT and RIGHT rows, the character's **eyes are fully closed** in fierce combat concentration.
  - **BACK ROW**: Remains 100% facing away. No eyes or face!
* **Column 4 (Explosive Strike Release & Eye Normalization)**:
  - **FULL-BODY LUNGE**: Torso explosively drives forward (8–12px), shoulders rotate with full swing follow-through, head drives forward toward the target plane.
  - **NORMALIZED EYES**: Eyes open to normal, steady, calm battle-ready gaze (identical narrow slit and pupil size to Column 1). **NO bulging eyes, NO wide crazy stare, NO anime shocked expression**.
  - **WEAPON CONTINUITY**: Character firmly grips the weapon during the full forward release arc. Weapon NEVER disappears or flies out of hands!
* **Column 5 (Follow-through & Kinetic Recoil)**:
  - Weapon momentum reaches full extension / impact follow-through.
  - Upper body overshoots slightly under kinetic momentum before absorbing recoil.
  - Weapon remains firmly in hand. Eyes remain open and focused on the target plane.
* **Column 6 (Kinetic Recovery / Deceleration — STRICTLY DIFFERENT FROM FRAME 1)**:
  - **RECOVERY PHASE (NOT A DUPLICATE OF FRAME 1)**: The strike has completed. The weapon and arm lower halfway, momentum dissipates, flail chain / weapon swings low, torso begins straightening up to return smoothly into the loop.
  - Eyes open and alert.

---

## 4. Weapon Archetype Attack Profiles

Select the appropriate kinematic profile based on the character's equipped weapon:

### A. Flail / Heavy Mace (`flail`)
- **Col 1**: Low ready grip at hip, flail chain hanging down.
- **Col 2**: Hand lifts to shoulder; spiked head and chain swing upward and back under momentum.
- **Col 3 (Apex)**: Hand cocked overhead; heavy spiked flail head coiled behind shoulder; closed eyes.
- **Col 4 (Impact)**: Explosive forward arm whip; spiked flail head hurls horizontally/downward in full extension; flail held firmly.
- **Col 5**: Spiked head swings downward past the knees under heavy centrifugal inertia; body absorbs recoil.
- **Col 6 (Recovery)**: Hand draws back toward hip; chain swings low; torso re-centers (different from Col 1).

### B. Sword / Blade / Axe (`sword`, `glaive`)
- **Col 1**: Standard front/profile guard.
- **Col 2**: Two-handed or dominant hand draw back to opposite shoulder; torso coils.
- **Col 3 (Apex)**: Blade raised high in maximum backswing diagonal; closed eyes.
- **Col 4 (Impact)**: Full-body forward lunge with sweeping horizontal/diagonal slash arc; blade gripped in hand.
- **Col 5**: Blade passes beyond target line; cloak/tunic billows forward.
- **Col 6 (Recovery)**: Blade angle tilts upward toward resting guard; chest straightens.

### C. Wand / Staff (`wand`, `staff`, `sorceress`)
- **Col 1**: Wand held low at hip in casting stance.
- **Col 2**: Wand pulled close to chest; torso coils back.
- **Col 3 (Apex)**: Wand cocked near shoulder/temple at peak channel focus; closed eyes.
- **Col 4 (Impact)**: Explosive forward arm thrust pointing wand directly at target; eyes open.
- **Col 5**: Cast follow-through; arm fully extended; cloak flares forward.
- **Col 6 (Recovery)**: Casting arm lowers halfway, returning to low ready stance.

### D. Bow (`bow`, `archer`)
- **Col 1**: Arrow nocked, bow held low.
- **Col 2**: Bow raised, draw hand pulls string halfway back.
- **Col 3 (Apex)**: Full draw to cheek; maximum string tension; closed eyes in concentration.
- **Col 4 (Impact)**: String released; bow hand snaps forward with recoil; draw hand snaps back; eyes open.
- **Col 5**: Bow arm recoil kick absorbs momentum.
- **Col 6 (Recovery)**: Hand begins lowering toward hip/quiver.

### E. Chakram / Throwing Disc (`chakram`)
- **Col 1**: Disc held in horizontal grip at hip.
- **Col 2**: Arm coils across torso toward opposite shoulder; hips twist back.
- **Col 3 (Apex)**: Disc pulled to maximum coiled backswing; closed eyes.
- **Col 4 (Impact)**: Full explosive horizontal hurl release forward; arm extended; disc firmly gripped through swing.
- **Col 5**: Throwing arm fully extended in follow-through across the chest line.
- **Col 6 (Recovery)**: Arm retracts halfway toward resting combat posture.

---

## 5. Negative & Stylistic Constraints

* **Strict Proportions**: Super-Deformed Chibi (strictly 2.0 to 2.4 heads tall max, massive head taking 42–45% of height, head wider than shoulders, ultra-compact stubby torso, oversized chunky boots).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal**.
* **Strictly No Attack VFX**: **NO slash arcs, NO energy blades, NO glowing weapon trails, NO sparks, NO impact flashes, NO speed lines, NO magic aura clutter**. The strike is conveyed purely through physical body mechanics and weapon motion.
* **Weapon Continuity Contract**: Weapon must remain firmly held across ALL 6 frames. Weapon never disappears or dissolves.
* **Anti-Cloning Rule**: Frame 1 and Frame 6 must NEVER be identical clones. Frames 1, 2, and 3 must NEVER be static frozen clones.
* **Cell Clearance**: Weapon tips, heads, and boots must stay completely within each cell without edge clipping.
* **Global Magenta Keying & Defringing**: Magenta is removed globally inside and outside the character. Boundary edges are cleaned with a 1px black outline without any purple/magenta aura.
* **Mandatory Negative Constraint**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic human proportions, no photorealism, no smooth gradients, no stiff body, no frozen torso, no mannequin animation, no lifeless posture, no bulging eyes, no wide crazy stare, no shocked expression, no cartoon eyes, no tall adult body, no 4+ heads proportions, no broad adult shoulders with small head, no giant spherical profile head, no balloon head, no basketball head, no elongated horizontal skull, head horizontal depth must not exceed frontal width, no duplicate frame 1 and 6, no static frames 1 2 3.`
* **Pixel Art Quality**: Crisp hard pixel edges, limited color palette, strong contrast, 16-bit game sprite aesthetic.

