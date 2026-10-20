# Character Turnaround / Reference Sheet Prompt Guide

Create a static multi-view reference sheet of the character before generating animation sprite sheets. This locks costume construction, weapon geometry, and proportions across all angles.

---

## 1. Sheet Options

### Option A: Standard 4-View Turnaround (Recommended for Spritesheet Continuity)
Four full-body standing views arranged horizontally left-to-right on one canvas:
1. `FRONT` — Frontal view facing the viewer / camera.
2. `BACK` — Direct rear view facing away.
3. `RIGHT` — Strict right-facing profile view.
   **MANDATORY PROFILE RULE**: The character's **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No 3/4 turn.
4. `LEFT` — Strict left-facing profile view.
   **MANDATORY PROFILE RULE**: The character's **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No 3/4 turn.

### Option B: 4-Column Turnaround with Stacked Focus Column (Default Standard)
A single reference canvas with 4 vertical columns on pure magenta (`#ff00ff`):
1. **Column 1: Close-up & Focus Column (Stacked Vertically with >= 40px magenta gutter between them)**:
   - **Top Panel**: `Portrait` (96×96 close-up bust portrait of head, horns/cowl, face, neck collar/scarf, and pauldron). Centered vertically in top half.
   - **Bottom Panel**: `Weapon Preview` (isolated 96×96 preview of held weapon/focus, e.g. flail handle, chain, and spiked mace head). Centered vertically in bottom half.
2. **Column 2: Front Full-Body View**:
   - `FRONT` (96×96 frontal chibi sprite: 2.0–2.4 heads, massive head wider than shoulders, compact stubby torso, grounded baseline `y ≈ 88`, holding weapon).
3. **Column 3: Back Full-Body View**:
   - `BACK` (96×96 rear chibi sprite: 100% rear view of hair, horns, backplate, skirt; NO face, NO eyes).
4. **Column 4: Right Profile Full-Body View**:
   - `RIGHT` (96×96 right profile chibi sprite: body strictly turned sideways, face strictly in side profile, holding weapon).
   - **COMPACT PROFILE HEAD RULE**: Cranial depth (nose to back of hair) must be compact (~28–32px, $\approx 80–85\%$ of front view width, NEVER wider than front view). Head must NOT be an inflated horizontal sphere, balloon, or basketball.

---

## 2. Safe Margins & Anti-Overlap Gutter Contract

To prevent adjacent figures or outstretched weapons from bleeding into neighboring panel crops:
* **Generous Horizontal & Vertical Gutter Spacing**: Maintain **at least 40–50 pixels of pure empty solid magenta background** between each column, and **at least 40–50 pixels between Portrait (top) and Weapon Preview (bottom)** in Column 1.
* **No Cutoffs**: Entire bust portrait (including ram horns, tips of ears/hair) and weapon head/chain must have at least 15–20px magenta margin from canvas borders to avoid cutoff.
* **No Text Clutter in Cropped Zones**: Do not place large or duplicate text labels inside the sprite bounding boxes.
* **Compact Poses**: Characters stand in a compact grounded posture with held weapons oriented vertically or angled close to the body, keeping silhouettes neatly centered within their panel area.

---

## 3. Anatomical & Proportions Contract

* **Super-Deformed Chibi Ratio (strictly 2.0 to 2.4 heads tall max)**: Massive readable head (taking **42–45% of total sprite height**). Head dome and hair/cowl width must be **equal to or wider than the shoulder span**.
* **Ultra-Compact Body**: Stubby torso (< 18% height), short sturdy limbs, and chunky oversized boots. Pauldrons and chestplate must be scaled down to fit the cute stubby chibi proportions rather than expanding into wide adult proportions.
* **Proportion Equality**: Proportions, eye-level, and scale must be **100% identical across all views** so silhouettes align precisely.
* **Grounded Baseline**: Lowest foot pixel anchored at consistent baseline (`y ≈ 88` in 96-px cell).
* **Equipment Continuity**: The character must hold the weapon / focus across **all views**. Unseen details (e.g. back of cloak, rear armor plates, side quivers) must be rendered logically and consistently.

---

## 4. Mandatory Constraints & Cleanliness

* **Background / Chromakey**: **Pure solid magenta background `rgb(255,0,255)` (`#ff00ff`) by default**.
  - **MANDATORY Green Chromakey (`#00ff00`)**: If the character has purple, lavender, pink, or magenta elements, use **Pure Solid Green `RGB(0, 255, 0)`** to preserve 100% of hair/clothing details without chromakey erosion.
* **Global Removal & Defringing**: Magenta is removed both outside and inside the character. No magenta aura remains along the edges (defringed with 1px black outline).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal, no tile grid**.
* **Negative Constraints**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic human proportions, no photorealism, no smooth gradients, no stiff body, no frozen torso, no mannequin animation, no bulging eyes, no wide crazy stare, no shocked expression, no cartoon eyes, no tall adult body, no 4+ heads proportions, no broad adult shoulders with small head.`
* **No Animation**: This is a static reference sheet. Do not create temporal animation frames.


