# Common Character Lock — paste into every generation prompt

Use the attached original image as the primary visual reference for the **exact same character**. Use the approved four-view turnaround as the secondary reference for views that are not visible in the original image. Style benchmark: `references/chibi_style_reference.png`. Do not redesign, beautify, simplify into a different costume, or invent a new character.

## Approved design (fill in before use)

- Character / archetype: [NAME AND ROLE]
- Face / skin / eyes / expression: [APPROVED DETAILS - mature, battle-hardened, stern/fierce, sharp small-to-medium eyes]
- Hair / hood / helmet: [APPROVED DETAILS]
- Armor / clothing / materials / colors: [APPROVED DETAILS - saturated dark fantasy palette]
- Distinctive emblems / accessories / asymmetry: [APPROVED DETAILS]
- Body build and chibi proportions: [Chibi 2.5-3 heads tall, compact sturdy torso, chunky boots, grounded stance]
- Weapon and grip: [EXACT WEAPON DESCRIPTION - chunky, readable, stylized for pixel art]
- Off-hand equipment: [DETAILS OR NONE]

## Mandatory Negative Constraints (Strict Art Direction)

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients.

## Identity & Chibi Anatomy Lock

- **Proportions**: Heroic Chibi proportions (2.5 to 3 heads tall). Head is large and readable (approx. 30–35% of total height), torso is compact and stout, limbs are sturdy with chunky boots and grounded stance. Weapons and hands are prominent, well-defined, and stylized for low-res pixel clarity. Do NOT use realistic 7–8 head human proportions.
- **Maturity & Expression**: The character is an adult, battle-hardened, experienced, grim, and dangerous. Sharp angular facial structure, defined jawline, sharp chin, and furrowed brows. Small-to-medium sharp eyes with dark contour, piercing irises, and an intense battle glare. Gritty details encouraged: scars, stubble, beards, warpaint, stern closed mouth or fierce grimace. Absolutely NO giant anime eyes, NO kawaii sparkling reflections, NO blushing cheeks, NO round baby cheeks, NO cute or childish expressions.
- **Visual Consistency**: Preserve the exact same face, skin tone, eye color, hairstyle, headgear, costume construction, armor pieces, materials, color palette, body proportions, outline thickness, pixel density, and silhouette in every cell and every action state. Distinctive asymmetrical details must remain on the same anatomical side.
- **Equipment & Weapon**: The character uses the same equipment in every frame. The weapon must retain its exact geometry, length, blade/head shape, materials, and colors. Hands must grip it plausibly. No extra weapons, duplicate equipment, disappearing items, or weapon morphing.

## Sheet and cell contract

Create **one animated 2D pixel-art game sprite sheet for one action state only**. Exactly 6 columns × 4 rows, exactly 24 cells, exactly 128×128 px per cell, target full canvas 768×512 px. Columns 1–6 show consecutive frames. Rows from top to bottom are exactly:

1. FRONT — front-facing / moving toward the bottom of the game screen.
2. BACK — facing away / moving toward the top of the game screen.
3. LEFT — strict left-facing profile.
4. RIGHT — strict right-facing profile.

Do not add labels, titles, cell borders, separators, gutters, extra panels, or extra frames. Every cell contains one complete character and its required equipment. Keep all content inside its cell and prevent overlap with adjacent cells.

## 2.5D camera and rendering

The sprite must be compatible with a 2.5D action RPG viewed by a stable orthographic camera tilted approximately 30° downward toward the playfield. Keep the same projection, scale, and anatomy in every direction. Show subtle top-facing surfaces where appropriate, but do not render a 3D model, do not use an extreme overhead view, and do not draw a 30° character lean. FRONT/BACK/LEFT/RIGHT are world directions; LEFT and RIGHT must stay strict profiles.

## Pixel art, palette, and background

- Clean, deliberate 16-bit-style pixel art with crisp hard pixel edges, readable pixel clusters, strong dark outlines, and stepped shading clusters.
- Saturated, grounded dark fantasy palette (deep steels, leathers, blood crimson, forest greens, obsidian, bone, glowing runes/embers).
- Strict restrictions: No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients, no vector art, no motion blur.
- Pure solid white background RGB(255,255,255). No scenery, floor, cast shadow, ground circle, text, UI, grids or decorative panels.
- All character pixels and equipment must remain within each 128×128 cell. Keep the grounded foot baseline around y=118 where applicable, maintaining the existing engine's scale and alignment.
- No weapon cropping. No cropped hands, feet, headgear or body parts. No visual effects unless a state-specific prompt explicitly and deliberately changes this rule; the default ATTACK prompt forbids effects.
