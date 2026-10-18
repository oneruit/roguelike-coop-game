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

### Option B: 5-in-1 Character Reference Canvas (Default Standard)
A single reference canvas with 5 designated panels arranged horizontally on pure magenta:
1. `Portrait` (96×96 close-up crop of face and headgear).
2. `Front Full-Body` (96×96 frontal chibi sprite).
3. `Back Full-Body` (96×96 rear chibi sprite).
4. `Right Profile Full-Body` (96×96 profile chibi sprite: body sideways, face in strict profile).
5. `Weapon Preview` (isolated 96×96 preview of the held weapon/focus — automatically sliced by script into `weapon_<name>.png`).

---

## 2. Safe Margins & Anti-Overlap Gutter Contract

To prevent adjacent figures or outstretched weapons from bleeding into neighboring panel crops:
* **Generous Gutter Spacing**: Maintain **at least 40–50 pixels of pure empty solid magenta background** between each of the 5 panels. Figures and weapon tips MUST NEVER touch, overlap, or cross panel boundaries.
* **Compact Poses**: Characters stand in a compact grounded posture with held weapons oriented vertically or angled close to the body, keeping silhouettes neatly centered within their panel area.

---

## 3. Anatomical & Proportions Contract

* **Chibi Ratio (2.5 to 3 heads tall)**: Large readable head (~30–35% of total height), compact torso, sturdy limbs, chunky boots.
* **Proportion Equality**: Proportions, eye-level, and scale must be **100% identical across all views** so silhouettes align precisely.
* **Grounded Baseline**: Lowest foot pixel anchored at consistent baseline (`y ≈ 88` in 96-px cell).
* **Equipment Continuity**: The character must hold the weapon / focus across **all views**. Unseen details (e.g. back of cloak, rear armor plates, side quivers) must be rendered logically and consistently.

---

## 4. Mandatory Constraints & Cleanliness

* **Background**: **Pure solid magenta background `rgb(255,0,255)` (`#ff00ff`)**.
* **Global Removal & Defringing**: Magenta is removed both outside and inside the character. No magenta aura remains along the edges (defringed with 1px black outline).
* **Zero Floor Clutter**: **No shadows under feet, no drop shadows, no cast shadows, no floor line, no platform, no pedestal, no tile grid**.
* **Negative Constraints**:
  > `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients, no stiff body, no frozen torso, no mannequin animation, no bulging eyes, no wide crazy stare, no shocked expression, no cartoon eyes.`
* **No Animation**: This is a static reference sheet. Do not create temporal animation frames.

