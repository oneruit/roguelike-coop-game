# Character Turnaround / Reference Sheet Prompt Guide

Create a static multi-view reference sheet of the character before generating animation sprite sheets. This locks costume construction, weapon geometry, and proportions across all angles.

---

## 1. Sheet Options

### Option A: Standard 4-View Turnaround (Recommended for Spritesheet Continuity)
Four full-body standing views arranged horizontally left-to-right on one canvas:
1. `FRONT` — Frontal view facing the viewer / camera.
2. `BACK` — Direct rear view facing away.
3. `LEFT` — Strict left-facing profile view.
4. `RIGHT` — Strict right-facing profile view.

### Option B: 5-in-1 Character Reference Canvas
A single reference canvas with 5 designated panels:
1. `Portrait` (128×128 close-up crop of face and headgear).
2. `Front Full-Body` (128×128 frontal chibi sprite).
3. `Back Full-Body` (128×128 rear chibi sprite).
4. `Right Profile Full-Body` (128×128 profile chibi sprite).
5. `Weapon Preview` (isolated 128×128 preview of the held weapon/focus).

---

## 2. Anatomical & Proportions Contract

* **Chibi Ratio (2.5 to 3 heads tall)**: Large readable head (~30–35% of total height), compact torso, sturdy limbs, chunky boots.
* **Proportion Equality**: Proportions, eye-level, and scale must be **100% identical across all views** so silhouettes align precisely.
* **Grounded Baseline**: Lowest foot pixel anchored at consistent baseline (`y ≈ 118` in 128-px cell).
* **Equipment Continuity**: The character must hold the weapon / focus across **all views**. Unseen details (e.g. back of cloak, rear armor plates, side quivers) must be rendered logically and consistently.

---

## 3. Mandatory Constraints & Cleanliness

* **Background**: **Pure solid magenta background `rgb(255,0,255)` (`#ff00ff`)**.
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal, no tile grid**.
* **Negative Constraints**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.`
* **No Animation**: This is a static reference sheet. Do not create temporal animation frames.
