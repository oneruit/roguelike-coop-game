---
name: character-animation-pipeline
description: Standardized pipeline for creating, generating, extracting, aligning, and integrating 4-state animated characters (IDLE, WALK, ATTACK, WALK_ATTACK across 4 directional rows, 6 cols x 4 rows @ 128x128px per cell) in battle-ready chibi proportions (oversized head, compact body, serious/intimidating expressions, strictly NO anime/cute) with 10px bottom margin, weapon consistency rules, and ground anchoring into the game engine.
---

# Character Animation Pipeline Skill

This skill defines the standardized master pipeline for creating, generating, processing, and integrating 4-state animated characters into the game engine.

Instead of generating a single composite sheet, this pipeline standardizes on **4 separate animation images** (one per action state) and **1 portrait avatar image**, using a unified **6 columns $\times$ 4 rows (24 frames)** grid with **$128 \times 128$ pixel cells**, **battle-ready chibi proportions** (oversized head, compact athletic/sturdy body, serious battle-hardened face), a **10px bottom margin** for combat effect clearance, strict **weapon consistency rules**, and **ground anchoring** so characters walk firmly on the ground rather than floating.

---

## 1. Standard Architecture & Specifications

### 1.1 The 5 Standard Assets per Character
Every character comprises 5 distinct texture assets in `public/textures/heroes/`:

| Texture File | Action State | Layout | Frame Cell Size | Total Resolution |
| :--- | :--- | :--- | :--- | :--- |
| `hero_<name>_idle.png` | **IDLE** (покой, дыхание) | 6 cols $\times$ 4 rows (24 frames) | $128 \times 128$ px | **$768 \times 512$ px** |
| `hero_<name>_walk.png` | **WALK** (бег, перемещение) | 6 cols $\times$ 4 rows (24 frames) | $128 \times 128$ px | **$768 \times 512$ px** |
| `hero_<name>_attack.png` | **ATTACK** (удар, способность) | 6 cols $\times$ 4 rows (24 frames) | $128 \times 128$ px | **$768 \times 512$ px** |
| `hero_<name>_walk_attack.png` | **WALK_ATTACK** (рывок с ударом) | 6 cols $\times$ 4 rows (24 frames) | $128 \times 128$ px | **$768 \times 512$ px** |
| `hero_<name>_front.png` | **PORTRAIT** (аватар, карточка) | 1 frame icon | $128 \times 128$ px | **$128 \times 128$ px** |

---

### 1.2 Core Visual Standards

1. **Chibi Combat Proportions & Warlike Demeanor:**
   - Proportions: **2.0 to 2.5 heads tall** (intentionally oversized head, compact body, athletic or sturdy build, sturdy limbs, confident combat stance, strong readable silhouette).
   - Facial Expression & Demeanor: **Serious focused expression, sharp eyes, determined look, calm intimidating gaze, no smile**.
   - Strict exclusions: **STRICTLY NO anime style, NO kawaii style, NO cute or adorable expression, NO childish appearance, NO pretty boy face, NO soft pastel colors, NO delicate pose**. Characters are deadly skirmishers fighting monsters.
   - High readability in top-down / 2.5D isometric view with crisp 16-bit pixel art edges.

2. **Character Height Limit:**
   - The character standing height **must not exceed 96 pixels** (`height <= 96px`) inside the $128 \times 128$ cell.
   - Guarantees at least 22px headroom at the top for helmets, wings, hats, and floating effects.

3. **Natural Clean Outlines (No Artificial 1px Black Border):**
   - Sprites must maintain their **natural pixel art antialiasing and shading**.
   - Do **NOT** add artificial heavy 1px black borders around sprites, as they distort delicate pixel details and degrade visual appeal.

4. **10px Bottom Margin & Grounding (`Отступ 10px снизу`):**
   - **Crucial Rule:** In each $128 \times 128$ frame, the character's feet are anchored at **$y = 118$** (`target_feet_y = 118`), leaving a clean **10px margin at the bottom** ($128 - 118 = 10$ px).
   - **Why 10px margin?** Downward weapon slashes, ground dust, shockwaves, and impact sparks often extend below the character's feet; the 10px buffer prevents these effects from clipping against the frame edge.
   - Shorter/chibi characters are grounded by anchoring their feet to $y = 118$, with extra headroom staying at the top of the cell.

---

### 1.3 Directional Row Mapping (Rows 0 to 3)
In Three.js UV coordinates, $V = 0$ is at the bottom of the image and $V = 1$ is at the top.
The rows from top to bottom map to:

- **Row 0 (Top, $y \in [0, 128)$)**: **Front** — forward-facing view (moving down towards camera/player).
- **Row 1 ($y \in [128, 256)$)**: **Left** — left-facing view (moving left).
- **Row 2 ($y \in [256, 384)$)**: **Right** — right-facing view (moving right).
- **Row 3 (Bottom, $y \in [384, 512)$)**: **Back** — upward-facing view (moving up away from camera).

```
+---------------+---------------+---------------+---------------+---------------+---------------+
| R0C0: Front 0 | R0C1: Front 1 | R0C2: Front 2 | R0C3: Front 3 | R0C4: Front 4 | R0C5: Front 5 | -> Row 0: Front
+---------------+---------------+---------------+---------------+---------------+---------------+
| R1C0: Left 0  | R1C1: Left 1  | R1C2: Left 2  | R1C3: Left 3  | R1C4: Left 4  | R1C5: Left 5  | -> Row 1: Left
+---------------+---------------+---------------+---------------+---------------+---------------+
| R2C0: Right 0 | R2C1: Right 1 | R2C2: Right 2 | R2C3: Right 3 | R2C4: Right 4 | R2C5: Right 5 | -> Row 2: Right
+---------------+---------------+---------------+---------------+---------------+---------------+
| R3C0: Back 0  | R3C1: Back 1  | R3C2: Back 2  | R3C3: Back 3  | R3C4: Back 4  | R3C5: Back 5  | -> Row 3: Back
+---------------+---------------+---------------+---------------+---------------+---------------+
```

---

### 1.4 Three.js Ground Anchoring Math
For a $3.6 \times 3.6$ unit plane geometry in Three.js with feet anchored at `feet_y = 118` in a 128px cell:

$$\text{translation}_y = \left(\frac{\text{feet\_y}}{\text{cell\_size}} - 0.5\right) \times \text{world\_size} = \left(\frac{118}{128} - 0.5\right) \times 3.6 = (0.921875 - 0.5) \times 3.6 = 0.421875 \times 3.6 = \mathbf{1.51875}$$

With geometry translation $1.51875$:
- The character's feet touch down **exactly at ground level ($y = 0.000$)**, resting directly on top of the ground shadow mesh (`shadowMesh`).
- The 10px buffer extends downward ($y \in [-0.281, 0.000]$), rendering ground slashes and dust effects without clipping.

---

## 2. Generation Artifact Prevention & Enforcement Rules

When generating sprite sheets with generative models, four major classes of artifacts frequently occur:

### 2.1 Artifact A: Duplicate or Phantom Weapons
* **Problem:** Diffusion models frequently draw extra swords or weapons on the character's hips, back, or belt, even when the character is holding a weapon in hand (e.g. holding spear AND having extra sword on hip, or dual spears).
* **Prevention Rules:**
  1. **Strict Single-Equipment Constraint in Prompts:**
     `Equipment: Exactly ONE spear held in right hand, exactly ONE round shield held on left arm. Zero extra weapons. NO weapons on hip, NO sheathed swords, NO daggers on belt, NO weapons slung on back.`
  2. **Negative Prompting Tokens:**
     `no secondary weapon, no scabbard, no sheath, no extra weapons, no dual weapons, no hip sword.`

### 2.2 Artifact B: Inconsistent Handedness (Weapon in Wrong Hand)
* **Problem:** Models confuse character-relative hands and camera-relative sides, swapping the main weapon from the right hand to the left hand in some frames or directional views.
* **Prevention Rules:**
  Define the anatomical hand position strictly for each of the 4 rows:
  - **Row 0 (Front):** Facing forward directly towards viewer. Right hand (viewer's left side) firmly holds spear; left arm (viewer's right side) holds shield.
  - **Row 1 (Profile Left):** Facing strictly LEFT. Character's left arm with shield is in front facing camera; right hand with spear is in background thrusting left.
  - **Row 2 (Profile Right):** Facing strictly RIGHT. Character's right hand with spear is in foreground facing camera; left arm with shield is behind body.
  - **Row 3 (Back):** Facing strictly UP/away from viewer. Showing back of armor/wings; right hand (viewer's right side) holds spear, left arm (viewer's left side) holds shield.

### 2.3 Artifact C: Missing or Disappearing Weapons
* **Problem:** During animation sequences (especially walk or recovery frames), weapons may vanish or morph into empty hands.
* **Prevention Rules:**
  Include a mandatory persistence token:
  `Mandatory equipment presence in EVERY frame: every single frame across all rows MUST clearly show the spear and round shield. Weapons never disappear, unequip, or morph.`

### 2.4 Artifact D: Direction Drift & Chaotic Row Rotations
* **Problem:** In side rows (Row 1 Left or Row 2 Right), some frames turn forward towards the camera or flip backward, creating chaotic flickering during movement.
* **Prevention Strategy:**
  1. **Prompt Level:**
     `Row 1: STRICT 100% profile facing LEFT only for all 6 columns. Zero front-facing frames, zero camera turns.`
     `Row 2: STRICT 100% profile facing RIGHT only for all 6 columns. Zero front-facing frames, zero camera turns.`
  2. **Pipeline Symmetrical Mirroring (`--mirror-left`):**
     Diffusion models consistently render right-facing profiles better than left-facing profiles. The Python processing script provides the `--mirror-left` flag:
     - Automatically mirrors Row 2 (Right) horizontally into Row 1 (Left).
     - Guarantees 100% flawless lateral consistency, zero direction drift, matched frame timing, and identical silhouette between left and right motion.

### 2.5 Artifact E: Weapon Truncation & Frame Boundary Clipping
* **Problem:** Large weapons (two-handed greatswords, war hammers, recurve bows, spears, staves) often have their tips or blades cut off by the edge of the 128x128 cell.
* **Prevention Rules:**
  1. **Visibility & Angle Directives in Prompts:**
     `holding [weapon] clearly visible beside the character, blade tip / hammer head / bow limb visible, angled diagonally if necessary to fit inside frame.`
  2. **Mandatory Negative Prompting Tokens:**
     `no cropped weapon, no weapon cut off by frame.`

---

## 3. Cross-Sheet Consistency & Human Approval Protocol (Phase 0 Concept Gate)

To prevent character drift and avoid wasting resources generating 24-frame animation sheets for an unverified design, all character creation follows a strict 4-step protocol with a **mandatory human approval gateway**:

### Step 1: Character Design Specification (Design Bible)
Establish exact visual tokens before prompting:
- **Archetype & Proportions:** Chibi Norse Valkyrie maiden, 2.5 heads tall, athletic feminine build.
- **Head & Face:** Silver winged circlet/helmet, long golden blonde braids with loose strands framing face, serious focused expression, sharp blue eyes, determined look, no smile, no cute or adorable expression.
- **Outfit & Armor:** Polished silver breastplate with royal blue tunic collar, reinforced leather armor pieces, subtle dark steel accents, practical armored boots.
- **Wings:** White feathered angel wings behind shoulders with subtle golden tips.
- **Equipment:** One spear in right hand, one round blue Norse shield on left arm. No other weapons.

### Step 2: Concept Sheet Generation (`hero_<name>_concept.png`)
Before generating any animation sheets, generate a single composite **Character Concept Sheet** (`hero_<name>_concept.png`) featuring 3 distinct sections on pure white background `rgb(255,255,255)`:
1. **Left section (Portrait / Avatar):** Close-up 128x128 pixel art face icon with distinct eyes, facial features, and headgear.
2. **Center section (Full-Body Combat Sprite):** Full-body chibi sprite in front-facing combat stance (height $\le 96$ px, 10px bottom margin, armor, silhouette).
3. **Right section (Isolated Weapons & Equipment):** Standalone detailed weapon and shield sprites with clear blade/head geometry.

### Step 3: Human Approval Gateway (`ask_question` Interactive Check)
The agent MUST display `hero_<name>_concept.png` in chat and request human verification using `ask_question`:
- **Question:** *"Сгенерирован концепт-лист персонажа (портрет, спрайт в полный рост, экипировка). Подойдёт ли такой персонаж или переделать?"*
- **Options:**
  - `(Recommended) Утвердить концепт (перейти к генерации анимаций IDLE, WALK, ATTACK, WALK_ATTACK)`
  - `Внести правки в дизайн (указать, что изменить: цвет глаз, волосы, броню, форму оружия и т.д.)`
- **Iteration Loop:** If the developer requests changes (e.g. "make eyes amber, hair shorter, shield kite-shaped"), the agent adjusts the prompt tokens, regenerates `hero_<name>_concept.png`, and asks again until approved.
- **NEVER generate animation sheets before the concept is approved by the human developer.**

### Step 4: Reference Image Conditioning (`ImagePaths: [concept_path]`)
When generating the 4 animation sheets (`hero_<name>_{idle,walk,attack,walk_attack}.png`), **always pass the approved concept sheet** via `ImagePaths` in `generate_image`.
This locks the model into drawing the exact same character with identical colors, hair, clothing, and weapons across all action states.

---

## 4. Standard Generation Prompts (Valkyrie Example: Spear & Shield)

### Master CONCEPT SHEET Prompt (`hero_valkyrie_concept.png`)
```text
Character design and concept reference sheet of a Valkyrie, a battle-ready winged maiden warrior of Norse mythology.

Three clear distinct sections on pure solid white background rgb(255,255,255):
1. Left section: close-up 128x128 pixel art portrait icon, sharp blue eyes, serious focused expression, silver winged circlet, golden blonde braids framing face, determined look, no smile, no cute or adorable expression.
2. Center section: full-body battle-ready chibi combat sprite in front-facing stance, chibi proportions with intentionally oversized head and compact athletic body, sturdy limbs, silver breastplate with royal blue tunic collar, reinforced leather pieces, practical armored boots, white feathered wings with golden tips, holding a spear in right hand and round blue Norse shield on left arm.
3. Right section: isolated standalone weapon sprite display, detailed golden-tipped spear and round blue Norse shield with silver rim.

Clean 16-bit pixel art game assets, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.
Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

### Master PORTRAIT Prompt (`hero_valkyrie_front.png`)
```text
128x128 chibi pixel art portrait of a Valkyrie, a winged maiden warrior of Norse mythology, an experienced battle-ready skirmisher.

Chibi proportions with an intentionally oversized head and compact body, athletic feminine build, sturdy limbs, confident combat stance, strong readable silhouette.

Serious focused expression, sharp blue eyes, determined look, no smile, no cute or adorable expression.

Long golden blonde braided hair, neatly styled with loose strands framing the face.

Polished silver breastplate with royal blue tunic collar, reinforced leather armor pieces, subtle dark steel accents, practical armored boots.

White feathered wings with golden tips clearly visible behind the shoulders.

Holding a spear in the right hand and a round blue Norse shield on the left arm.

No other weapons.

Pure solid white background rgb(255,255,255), clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

### Master IDLE Prompt (`hero_valkyrie_idle.png`)
```text
2D pixel art character sprite sheet of Valkyrie, a winged maiden warrior of Norse mythology, an experienced battle-ready skirmisher.

Chibi proportions with an intentionally oversized head and compact body, athletic feminine build, sturdy limbs, confident combat stance, strong readable silhouette.

Serious focused expression, sharp blue eyes, determined look, no smile, no cute or adorable expression.

Long golden blonde braided hair, silver winged helmet, polished silver breastplate with royal blue tunic collar, white feathered wings with golden tips behind shoulders.

Equipment: STRICTLY ONE spear in right hand, STRICTLY ONE round blue Norse shield on left arm. ZERO extra weapons, NO weapons on hip, NO sheathed swords, NO daggers on belt, NO weapons slung on back.

Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.

Row 0: facing front / forward towards viewer. Right hand holds spear, left arm holds shield.
Row 1: STRICT 100% profile facing LEFT only for all 6 columns. Zero front-facing frames.
Row 2: STRICT 100% profile facing RIGHT only for all 6 columns. Zero front-facing frames.
Row 3: facing back / away from viewer. Right hand holds spear, left arm holds shield.

Animation: IDLE subtle breathing and gentle wing flutter cycle across 6 columns per row.

Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment.

Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

### Master WALK Prompt (`hero_valkyrie_walk.png`)
*(Provide Master Portrait & IDLE in `ImagePaths`)*
```text
2D pixel art character sprite sheet of the same battle-ready Valkyrie from reference images.

Identical character design: chibi proportions with intentionally oversized head and compact body, athletic feminine build, sturdy limbs, confident combat stance, serious focused expression, sharp blue eyes, determined look, no smile, no cute or adorable expression, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic collar, white feathered wings.

Equipment: STRICTLY ONE spear in right hand, STRICTLY ONE round blue Norse shield on left arm in every frame. NO extra weapons, NO swords on hips, NO weapons on back.

Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.

Row 0: facing front / forward towards viewer.
Row 1: STRICT 100% profile facing LEFT only for all 6 columns. Left arm shield forward, right hand spear behind.
Row 2: STRICT 100% profile facing RIGHT only for all 6 columns. Right hand spear forward, left arm shield behind.
Row 3: facing back / away from viewer.

Animation: WALK running stride cycle animation across 6 columns per row: alternating legs, athletic combat run strides, animated wings, carrying spear and shield.

Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms.

Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

### Master ATTACK Prompt (`hero_valkyrie_attack.png`)
*(Provide Master Portrait & IDLE in `ImagePaths`)*
```text
2D pixel art character sprite sheet of the same battle-ready Valkyrie from reference images.

Identical character design: chibi proportions with intentionally oversized head and compact body, athletic feminine build, sturdy limbs, serious focused expression, sharp blue eyes, determined look, no smile, no cute or adorable expression, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic collar, white feathered wings.

Equipment: STRICTLY ONE spear in right hand, STRICTLY ONE round blue Norse shield on left arm in every frame. NO extra weapons, NO swords on hips, NO weapons on back.

Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.

Row 0: facing front / forward towards viewer. Thrusting spear downward towards viewer.
Row 1: STRICT 100% profile facing LEFT only for all 6 columns. Thrusting spear forward to the left.
Row 2: STRICT 100% profile facing RIGHT only for all 6 columns. Thrusting spear forward to the right.
Row 3: facing back / away from viewer. Thrusting spear upward away from viewer.

Animation: ATTACK spear thrust animation across 6 columns per row: anticipation windup pull back, rapid forward spear lunge thrust with radiant pierce trail, shield brace, recovery.

Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms.

Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

### Master WALK_ATTACK Prompt (`hero_valkyrie_walk_attack.png`)
*(Provide Master Portrait & IDLE in `ImagePaths`)*
```text
2D pixel art character sprite sheet of the same battle-ready Valkyrie from reference images.

Identical character design: chibi proportions with intentionally oversized head and compact body, athletic feminine build, sturdy limbs, serious focused expression, sharp blue eyes, determined look, no smile, no cute or adorable expression, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic collar, white feathered wings.

Equipment: STRICTLY ONE spear in right hand, STRICTLY ONE round blue Norse shield on left arm in every frame. NO extra weapons, NO swords on hips, NO weapons on back.

Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.

Row 0: facing front / forward towards viewer.
Row 1: STRICT 100% profile facing LEFT only for all 6 columns.
Row 2: STRICT 100% profile facing RIGHT only for all 6 columns.
Row 3: facing back / away from viewer.

Animation: WALK ATTACK charging spear dash thrust animation across 6 columns per row: sprinting forward, leaping dive thrust with radiant energy trail, follow-through dash, recovery.

Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms.

Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

---

## 5. Modular Prompt Architecture & Archetype Library

All character prompts in the project strictly follow a **9-Block Modular Architecture** to guarantee high quality, battle-hardened aesthetics, and complete absence of anime/cute distortions.

### 5.1 The 9-Block Modular Structure

1. **Header & Core Subject:** `128x128 chibi pixel art portrait of a [gender/race] [archetype], an experienced and deadly [role].`
2. **Chibi Proportions & Silhouette:** `Chibi proportions with an intentionally oversized head and compact body, [athletic/stocky/bulky build], sturdy limbs, confident combat stance, strong readable silhouette.`
3. **Face, Eyes & Combat Expression (NO SMILE / NO CUTE):** `Serious focused expression, sharp [color] eyes, determined look, calm intimidating gaze, [scars/beard/visor traits], no smile, no cute or adorable expression.` *(For faceless mechs: `Glowing visor eyes on a faceless helmet, no visible human face, calm intimidating presence, no cute or adorable expression.`)*
4. **Hair / Headgear:** `[Hair style / helmet details / distinctive features framing face].`
5. **Armor & Attire:** `[Fitted materials, tunic/plate/robes, reinforced pieces, subtle metal accents, practical armored boots].`
6. **Weapons & Off-Hand (Anti-Clipping & Single-Equipment):** `Holding [weapon] in [hand/both hands], [weapon visibility / blade tip visible / angled diagonally], [accessories like quiver/pouches]. No other weapons.`
7. **Sprite & Rendering Standard:** `Pure solid white background rgb(255,255,255), clean 16-bit chibi pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.`
8. **Theme & Threat Tone:** `[Heroic fantasy / dark fantasy / sci-fi] RPG game character design, battle-ready and dangerous despite chibi proportions.`
9. **Negative Exclusion Tokens (MANDATORY):** `No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.` *(Add archetype-specific exclusions like `no elf ears`, `no human face` where appropriate).*

---

### 5.2 Archetype Prompt Library

#### Archetype 1: Elf Archer (Ranger)
```text
128x128 chibi pixel art portrait of a female elf archer, an experienced and deadly fantasy ranger.

Chibi proportions with an intentionally oversized head and compact body, athletic feminine build, sturdy limbs, confident combat stance, strong readable silhouette.

Serious focused expression, sharp emerald green eyes, determined look, calm intimidating gaze, no smile, no cute or adorable expression.

Long white hair, neatly styled with loose strands framing the face, pointed elven ears clearly visible.

Fitted forest green and dark brown ranger leathers, reinforced leather armor pieces, subtle bronze accents, practical dark boots, quiver of arrows on the back.

Holding a wooden recurve bow in the left hand, bow clearly visible beside the character.

No other weapons.

Pure solid white background rgb(255,255,255), clean 16-bit chibi pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

#### Archetype 2: Dark Sorceress (Arcane Mage)
```text
128x128 chibi pixel art portrait of a female dark sorceress, an experienced and dangerous fantasy mage.

Chibi proportions with an intentionally oversized head and compact body, athletic feminine build, sturdy limbs, confident combat stance, strong readable silhouette.

Serious focused expression, sharp dark eyes, determined look, calm intimidating gaze, no smile, no cute or adorable expression.

Long dark hair with distinctive dark streaks, neatly styled with loose strands framing the face.

Fitted dark violet and black mage robes with a high collar, reinforced leather armor pieces, subtle silver arcane details, practical dark boots.

Holding a tall wooden staff topped with a glowing purple crystal in both hands, staff clearly visible beside the character.

Leather belt with small glass potion vials and a compact leather pouch hanging at the hip.

No other weapons.

Pure solid white background rgb(255,255,255), clean 16-bit chibi pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

#### Archetype 3: Greatsword Warrior (Swordswoman)
```text
128x128 chibi pixel art portrait of a female greatsword warrior, a deadly and experienced fantasy swordswoman.

Chibi proportions with an intentionally oversized head and compact body, athletic feminine build, sturdy limbs, confident combat stance, strong readable silhouette.

Serious focused expression, sharp dark brown eyes, determined look, calm intimidating gaze, no smile, no cute or adorable expression.

Short black hair in a sleek chin-length bob with side-swept bangs, loose strands framing the face.

Fitted dark crimson combat dress with a high collar, black leather harness and straps, reinforced leather armor pieces, subtle dark steel accents, practical armored boots.

Holding a massive two-handed greatsword with both hands, oversized broad blade clearly visible beside the character, blade tip visible, angled diagonally.

No other weapons.

Pure solid white background rgb(255,255,255), clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

#### Archetype 4: Plate Knight (Frontline Warrior)
```text
128x128 chibi pixel art portrait of a male knight, an experienced and deadly fantasy warrior in full plate armor.

Chibi proportions with an intentionally oversized head and compact body, athletic masculine build, sturdy limbs, confident combat stance, strong readable silhouette.

Serious focused expression, sharp steel-blue eyes, determined look, calm intimidating gaze, no smile, no cute or adorable expression.

Short dark brown hair, neatly styled with loose strands framing the face, partially hidden under an open-faced helmet.

Polished steel plate armor with royal blue tabard accents, subtle gold trims, reinforced pauldrons, practical armored boots.

Holding a longsword in the right hand, blade tip angled down and visible beside the character, round knight shield on the left arm.

No other weapons.

Pure solid white background rgb(255,255,255), clean 16-bit chibi pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate feminine pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

#### Archetype 5: Dwarf Master Smith (Heavy War Hammer)
```text
128x128 chibi pixel art portrait of a male dwarf, an experienced and deadly fantasy warrior and master smith.

Chibi proportions with an intentionally oversized head and compact body, stocky dwarf build, broad shoulders, sturdy short limbs, confident combat stance, strong readable silhouette.

Serious focused expression, sharp amber brown eyes, determined look, thick braided beard, no smile, no cute or adorable expression.

Long dark auburn hair and a full braided beard with iron beard rings, loose strands framing the face.

Heavy dark iron and bronze plate armor, reinforced leather under-armor, subtle runic engravings, practical armored boots.

Holding a massive two-handed war hammer with both hands, oversized hammer head clearly visible beside the character.

No other weapons.

Pure solid white background rgb(255,255,255), clean 16-bit chibi pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no elf ears, no slender body, no delicate pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

#### Archetype 6: Futuristic Combat Robot / Mech (Sci-Fi Unit)
```text
128x128 chibi pixel art portrait of a futuristic combat robot, a heavy armored sci-fi mech unit.

Chibi proportions with an intentionally oversized head and compact body, bulky armored frame, sturdy limbs, confident combat stance, strong readable silhouette.

Glowing cyan visor eyes on a faceless white helmet, no visible human face, calm intimidating presence, no cute or adorable expression.

Sleek white and violet armor plating with glowing blue energy seams, large rounded shoulder pauldrons, crystal rose ornaments on both shoulders, glowing purple core in the chest.

Holding no weapon, both hands raised in a ready combat stance, oversized armored gauntlets clearly visible.

No other weapons.

Pure solid white background rgb(255,255,255), clean 16-bit chibi pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic sci-fi game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no human face, no realistic proportions, no photorealism, no smooth gradients.
```

#### Archetype 7: Monster Hunter / Witcher (Dual-Swords Mutant Skirmisher)
```text
128x128 chibi pixel art portrait of a male monster hunter, a deadly and experienced fantasy witcher.

Chibi proportions with an intentionally oversized head and compact body, athletic masculine build, sturdy limbs, confident combat stance, strong readable silhouette.

Serious focused expression, sharp yellow cat-like eyes, determined look, calm intimidating gaze, pale scarred face, no smile, no cute or adorable expression.

Long white hair tied back, loose strands framing the face.

Fitted black leather witcher armor with silver studs, reinforced leather armor pieces, subtle silver chain accents, practical dark boots, two swords strapped on the back.

Holding a silver longsword in the right hand, blade clearly visible beside the character.

No other weapons.

Pure solid white background rgb(255,255,255), clean 16-bit chibi pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, detailed equipment, clear readable silhouette.

Heroic dark fantasy RPG game character design, battle-ready and dangerous despite chibi proportions.

No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no delicate pose, no pretty boy face, no cropped weapon, no weapon cut off by frame, no realistic proportions, no photorealism, no smooth gradients.
```

---

## 6. Automated Processing Script

Use `.agents/skills/character-animation-pipeline/scripts/process_character_sheets.py`:

```bash
python .agents/skills/character-animation-pipeline/scripts/process_character_sheets.py \
  --name "valkyrie" \
  --idle "<path_to_idle>" \
  --walk "<path_to_walk>" \
  --attack "<path_to_attack>" \
  --walk-attack "<path_to_walk_attack>" \
  --portrait "<path_to_portrait>" \
  --out-dir "public/textures/heroes" \
  --cell-size 128 \
  --feet-y 118 \
  --char-h 92.0 \
  --max-h 96.0 \
  --mirror-left
```

### Script Capabilities:
1. **Background Clean:** Removes pure white (`#FFFFFF`) or pure black (`#000000`) backgrounds with soft anti-aliased alpha borders.
2. **Bottom Offset:** Anchors feet at `target_feet_y = 118` (leaving a 10px margin at the bottom for combat effects and grounding).
3. **Height Capping:** Ensures character height never exceeds 96px (`max_h = 96.0`).
4. **Mirroring (`--mirror-left`):** Mirrors Row 2 (Right) into Row 1 (Left), completely eliminating AI lateral drift and direction inconsistency.
5. **Resolution Packaging:** Packs each sheet into $768 \times 512$ px (6 cols $\times$ 4 rows @ 128x128) and portrait into $128 \times 128$ px.

---

## 7. Engine Integration Checklist

### Step 7.1: Texture Preloading (`game/src/core/TextureManager.ts`)
```typescript
public static loadValkyrieTextures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
  return this.loadAnimatedTextures('hero_valkyrie', renderer);
}
```

### Step 7.2: Player Geometry Grounding (`game/src/entities/Player.ts` & `RemotePlayer.ts`)
```typescript
public static getCharacterGeometry(charType: CharacterType): PlaneGeometry {
  let geom = Player.geometryCache.get(charType);
  if (!geom) {
    geom = new PlaneGeometry(3.6, 3.6);
    // 128x128 chibi standard: feet anchored at y=118 in 128px cell (10px bottom margin)
    // translation = (118 / 128 - 0.5) * 3.6 = 0.421875 * 3.6 = 1.51875
    const is128Standard = charType === 'valkyrie';
    const translateY = is128Standard ? 1.51875 : 0.975;
    geom.translate(0, translateY, 0);
    Player.geometryCache.set(charType, geom);
  }
  return geom;
}
```

### Step 7.3: Dynamic UV Columns Support
```typescript
const img = (tex as any).image as { width?: number; height?: number } | undefined;
const dynamicCols = (img && img.width && img.height && img.height > 0)
  ? Math.round((img.width / img.height) * 4)
  : cfg.cols;

tex.repeat.set(1 / dynamicCols, 1 / 4);
tex.offset.set(frameCol / dynamicCols, (3 - row) / 4);
```

---

## 8. Verification Checklist

Always run:
1. `python .agents/skills/character-animation-pipeline/scripts/process_character_sheets.py ...` -> Exit code 0.
2. Dimensions check:
   - 4 sheets: $768 \times 512$ pixels RGBA.
   - Portrait: $128 \times 128$ pixels RGBA.
   - Character height: $\le 96$ pixels.
   - Bottom margin: exactly 10 pixels.
3. TypeScript check:
   ```powershell
   npm run typecheck
   ```
4. Build verification:
   ```powershell
   npm run build
   ```
5. In-game verification: verify feet touch ground shadows with 10px buffer below feet.
