# Common Character Lock — Base Identity & Master Prompt Template

Use the reference character image / prompt as the primary visual lock for the **exact same character**. Do not redesign, beautify into anime style, simplify into an unrelated costume, or alter established character features.

---

## 1. Input Processing Modes

### Mode A: Ready Prompt or Image Reference
If the user provides an existing text prompt or image reference:
* Adopt the character's visual identity directly.
* Ensure mandatory engine requirements are met: pure solid flat white background `rgb(255,255,255)` with `rembg` AI matting, chibi 2.5–3 heads tall proportions, zero ground shadows / platforms, strict side profile for left/right rows, and the mandatory negative constraint block.
* Proceed directly without redundant questionnaires.

### Mode B: Brief / Incomplete Character Description (Auto-Enrichment)
If the user provides a brief description (e.g. *"female amazon in red bikini with magic orbs"* or *"dwarf warrior with warhammer"*), automatically complete all missing fields using the sensible archetype defaults below instead of prompting with a long survey:

| Dimension | Default Fallback Value |
|---|---|
| **Proportions** | Super-Deformed Chibi (2.0 to 2.4 heads tall max): massive readable head (42–45% of total sprite height), head and hair/hood dome are equal to or wider than shoulders, ultra-compact stubby torso (< 18% height), short thick limbs, chunky oversized boots, strong readable silhouette |
| **Face & Head** | Serious focused battle-ready expression, angular jawline, sharp chin, no smile, no cute or adorable expression |
| **Eyes** | Sharp focused eyes with intense iris color and dark contour, vigilant battle glare |
| **Hair / Headgear** | Practical battle-ready hair / braids / hood / circlet matching character archetype |
| **Armor / Clothing** | Saturated dark fantasy palette (deep steels, leathers, crimson, forest green, obsidian, bronze), compact stylized armor fitted to stubby chibi anatomy, crisp pixel-art clusters |
| **Held Item / Weapon** | Held with both hands or combat-ready stance, clearly visible beside character. If unarmed, hands raised in ready combat stance. No extra weapons |
| **Effects** | Faint localized magical motes / energy orbs only if specified by archetype; no oversized clutter |
| **Background / AI Matting** | Pure solid flat white background rgb(255,255,255) (#ffffff). Processed via rembg AI matting (preserves 100% of character colors including purple, magenta, pink, green, and white). No shadows under feet, no ground line, no floor, no platform |
| **Negative Constraints** | `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic human proportions, no photorealism, no smooth gradients, no tall adult body, no 4+ heads proportions, no broad adult shoulders with small head, no giant spherical profile head, no balloon head, no basketball head, no elongated horizontal skull, head horizontal depth must not exceed frontal width.` |

---

## 2. Master Prompt Template

```text
96x96 chibi pixel art portrait of a [gender/species/type] [archetype/class], a [role/description].

Super-deformed chibi proportions (strictly 2.0 to 2.4 heads tall max) with an intentionally oversized head (42-45% of total height) that is equal to or wider than the shoulders, ultra-compact stubby torso, short sturdy limbs, chunky oversized boots, strong readable silhouette.

[Face/head description], [eye description], serious battle-hardened expression, sharp jawline, no smile, no cute or adorable expression.

[Hair/head details], [optional mane/markings/ornaments].

[Clothing/armor/body description scaled to compact chibi proportions], [optional accessories].

[Held item: Holding a [weapon/tool/focus] with both hands, clearly visible beside the character / Holding no weapon, both hands raised in a ready combat stance], [optional offhand]. No other weapons.

[Optional magical/energy effects].

Pure solid flat white background rgb(255,255,255), clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic [fantasy/dark fantasy/sci-fi] RPG game character design, battle-ready and dangerous despite super-deformed chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, [specific exclusions], no realistic human proportions, no photorealism, no smooth gradients, no stiff body, no frozen torso, no mannequin animation, no lifeless posture, no bulging eyes, no wide crazy stare, no shocked expression, no cartoon eyes, no tall adult body, no 4+ heads proportions, no broad adult shoulders with small head, no giant spherical profile head, no balloon head, no basketball head, no elongated horizontal skull, head horizontal depth must not exceed frontal width.

Additional character details to include: [list all extra details the user specifies].
```

---

## 3. Strict Negative Constraint String

Every prompt MUST contain this exact negative constraint block:
> `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic human proportions, no photorealism, no smooth gradients, no stiff body, no frozen torso, no mannequin animation, no lifeless posture, no bulging eyes, no wide crazy stare, no shocked expression, no cartoon eyes, no tall adult body, no 4+ heads proportions, no broad adult shoulders with small head, no giant spherical profile head, no balloon head, no basketball head, no elongated horizontal skull, head horizontal depth must not exceed frontal width.`

---

## 4. Directional Orientation & 6x3 / 6x4 Architecture Contract

The animation pipeline supports both **6×3** (recommended for generation efficiency and consistency) and **6×4** source grids:
* **Row 0 (1st row)**: `FRONT` — Character faces directly toward the camera / screen bottom.
* **Row 1 (2nd row)**: `BACK` — Character faces directly away toward the top of the screen.
  - **BACK VIEW PROTECTION RULE**: The back of head, hair, hood, and armor MUST face 100% away from camera across **ALL 6 frames**. **NO face, NO eyes, and NO head turning on Frame 3**. On Frame 3, the neck/head merely dips 1px with breath/stride.
* **Row 2 (3rd row)**: `RIGHT` — Character faces to the RIGHT.
  - **MANDATORY PROFILE RULE**: When drawn facing RIGHT, the character's **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso or head angled towards camera.
  - **COMPACT PROFILE HEAD DEPTH (ANTI-SPHERE RULE)**:
    - In Front view (Row 0), the head is wide ear-to-ear (~36–40px) including hair volume on both sides and spreading horns.
    - In Profile view (Row 2), the horizontal head depth (tip of nose to back of hair) MUST be **compact and streamlined** (~28–32px max, $\approx 80–85\%$ of frontal width, **never exceeding front width**).
    - The profile head must **NEVER be an inflated horizontal sphere, round balloon, or basketball**. The face profile (brow, small chibi nose, lips/chin) projects neatly forward; the cranium and hair curve smoothly downward along the nape of the neck without bulging 40px backwards.
* **Row 3 (4th row — Optional in Source)**: `LEFT` — Character faces to the LEFT.
  - **AUTOMATED SCRIPT MIRRORING**: To prevent token waste and asymmetric AI hallucinations, Row 3 (LEFT) is **automatically derived by horizontally mirroring Row 2** in `process_character_sheets.py`. Generation prompts only need to produce 3 rows (`FRONT`, `BACK`, `RIGHT`).

---

## 5. Whole-Body Kinematics & Facial Expressiveness Contract

* **Whole-Body Locomotion & Attacks (No Mannequin / Stiff Torso)**:
  - In `WALK`: Torso leans forward 5–10° during stride, bobs vertically (+/- 2–3px), shoulders counter-twist with leg strikes.
  - In `ATTACK` and `WALK_ATTACK`: Entire body commits to the strike. Frame 2–3 coils and pulls back with shoulder twist; Frame 4 explosively lunges forward (8–12px forward chest drive) following through with weapon release; Frames 5–6 absorb recoil and reset.
* **Frame 3 Blink & Frame 4 Eye Normalization**:
  - **Frame 3**: Calm, focused blink (eyelids fully closed) on visible front/side rows (`FRONT`, `RIGHT`).
  - **Frame 4**: Eyes return to normal, steady, calm battle-ready gaze (identical size/shape to Frames 1–2). **NO bulging eyes, NO wide crazy stare, NO anime shocked expression**.
* **Head Height & Width Anchor**:
  - Head height must remain strictly **42–45% of total character height (2.0 to 2.4 heads tall max)** across all frames.
  - Head width must remain **equal to or wider than the shoulder span**. Pauldrons and armor must never dwarf the chibi head. Proportions never stretch into realistic adult scale during lunges.
* **Strict Palette Lock**:
  - All frames and sheets must sample and preserve the exact color palette (armor, hair, skin, metal) established in the approved turnaround sheet.

---

## 6. Weapon Continuity Contract

* **Permanent Weapon Grip**:
  - The held weapon (flail, sword, staff, bow, or chakram) **MUST remain clearly visible and firmly held in the character's hand across ALL 6 frames**.
  - The weapon **NEVER disappears, dissolves into empty hands, or flies off-screen** during attacks. Even during throw/strike release (Frame 4) and follow-through (Frame 5), the character visibly grips the weapon through the full swing arc.
  - In-engine projectile spawning is handled separately by code; character sprites must always remain fully equipped and combat-ready.

---

## 7. White Background & `rembg` AI Matting Contract

* **Pure Solid Flat White Background `rgb(255,255,255)` (`#ffffff`)**: Clean flat white canvas across all cells.
* **AI Matting via `rembg`**: Background is removed using neural AI matting (`rembg` with alpha thresholding $\ge 30$). Zero color bleeding, zero edge halos (no pink/magenta/green fringe), and complete preservation of all character palettes (purple hair, pink fabrics, green mantles, white armor).
* **Dynamic Row Gutters & Intact Frames**: Automatically detects true row split gutters to prevent severed feet or robes, and extracts intact animation frames.
* **Zero Floor Elements**: Absolutely NO shadows under feet, NO drop shadows, NO cast shadows, NO ground line, NO floor tiles, NO platform, NO pedestal.
* **Cell Clearance**: Every cell is 96×96 px. All body parts, weapon tips, hair, and accessories must remain inside the cell with ~8 px bottom margin (`feet baseline y ≈ 88`).
