# Common Character Lock — Base Identity & Master Prompt Template

Use the reference character image / prompt as the primary visual lock for the **exact same character**. Do not redesign, beautify into anime style, simplify into an unrelated costume, or alter established character features.

---

## 1. Input Processing Modes

### Mode A: Ready Prompt or Image Reference
If the user provides an existing text prompt or image reference:
* Adopt the character's visual identity directly.
* Ensure mandatory engine requirements are met: pure solid magenta background `rgb(255,0,255)`, chibi 2.5–3 heads tall proportions, zero ground shadows / platforms, strict side profile for left/right rows, and the mandatory negative constraint block.
* Proceed directly without redundant questionnaires.

### Mode B: Brief / Incomplete Character Description (Auto-Enrichment)
If the user provides a brief description (e.g. *"female amazon in red bikini with magic orbs"* or *"dwarf warrior with warhammer"*), automatically complete all missing fields using the sensible archetype defaults below instead of prompting with a long survey:

| Dimension | Default Fallback Value |
|---|---|
| **Proportions** | Heroic Chibi (2.5 to 3 heads tall): large head (~30-35% height), compact torso, sturdy limbs, chunky boots, strong readable silhouette |
| **Face & Head** | Serious focused battle-ready expression, angular jawline, sharp chin, no smile, no cute or adorable expression |
| **Eyes** | Sharp focused eyes with intense iris color and dark contour, vigilant battle glare |
| **Hair / Headgear** | Practical battle-ready hair / braids / hood / circlet matching character archetype |
| **Armor / Clothing** | Saturated dark fantasy palette (deep steels, leathers, crimson, forest green, obsidian, bronze), crisp pixel-art clusters |
| **Held Item / Weapon** | Held with both hands or combat-ready stance, clearly visible beside character. If unarmed, hands raised in ready combat stance. No extra weapons |
| **Effects** | Faint localized magical motes / energy orbs only if specified by archetype; no oversized clutter |
| **Background** | Pure solid magenta background rgb(255,0,255), no shadows under feet, no ground line, no floor, no platform |
| **Negative Constraints** | `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.` |

---

## 2. Master Prompt Template

```text
96x96 chibi pixel art portrait of a [gender/species/type] [archetype/class], a [role/description].

Chibi proportions with an intentionally oversized head and compact body, [body type], [limb description], [stance], strong readable silhouette.

[Face/head description], [eye description], [expression details], no smile, no cute or adorable expression.

[Hair/head details], [optional mane/markings/ornaments].

[Clothing/armor/body description], [optional accessories].

[Held item: Holding a [weapon/tool/focus] with both hands, clearly visible beside the character / Holding no weapon, both hands raised in a ready combat stance], [optional offhand]. No other weapons.

[Optional magical/energy effects].

Pure solid magenta background rgb(255,0,255), clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic [fantasy/dark fantasy/sci-fi] RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, [specific exclusions], no realistic proportions, no photorealism, no smooth gradients.

Additional character details to include: [list all extra details the user specifies].
```

---

## 3. Strict Negative Constraint String

Every prompt MUST contain this exact negative constraint block:
> `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.`

---

## 4. Directional Orientation & Strict Profile Contract

In all multi-view sheets and directional spritesheets, the standard row mapping is:
* **Row 0 (1st row)**: `FRONT` — Character faces directly toward the camera / screen bottom.
* **Row 1 (2nd row)**: `BACK` — Character faces directly away toward the top of the screen.
* **Row 2 (3rd row)**: `RIGHT` — Character faces to the RIGHT.
  **MANDATORY PROFILE RULE**: When drawn facing RIGHT, the character's **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso or head angled towards the camera.
* **Row 3 (4th row)**: `LEFT` — Character faces to the LEFT.
  **MANDATORY PROFILE RULE**: When drawn facing LEFT, the character's **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso or head angled towards the camera.

---

## 5. Chromakey & Edge Cleanup Contract

* **Pure Solid Magenta Background `rgb(255,0,255)` (`#ff00ff`)**: Strict chromakey background for automated transparent extraction.
* **Global Removal**: Magenta is NEVER used as a character color. Magenta is removed completely and globally — **both outside the character and inside any enclosed gaps, holes, limbs, or weapon loops**.
* **Zero Magenta Aura**: The pipeline cleans all boundary pixels touching transparency with a crisp 1px black outline `[0, 0, 0, 255]`, preventing any purple/magenta halo or fringe while leaving all interior character textures 100% untouched.
* **Zero Floor Elements**: Absolutely NO shadows under feet, NO drop shadows, NO cast shadows, NO ground line, NO floor tiles, NO platform, NO pedestal.
* **Cell Clearance**: Every cell is 96×96 px. All body parts, weapon tips, hair, and accessories must remain inside the cell with ~8 px bottom margin (`feet baseline y ≈ 88`).
