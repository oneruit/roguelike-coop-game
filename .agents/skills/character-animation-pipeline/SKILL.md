---
name: character-animation-pipeline
description: Standardized pipeline for creating, generating, extracting, aligning, and integrating 4-state animated characters (IDLE, WALK, ATTACK, WALK_ATTACK across 4 directional rows, 6 cols x 4 rows @ 128x128px per cell) in chibi style with 10px bottom margin, weapon consistency rules, and ground anchoring into the game engine.
---

# Character Animation Pipeline Skill

This skill defines the standardized master pipeline for creating, generating, processing, and integrating 4-state animated characters into the game engine.

Instead of generating a single composite sheet, this pipeline standardizes on **4 separate animation images** (one per action state) and **1 portrait avatar image**, using a unified **6 columns $\times$ 4 rows (24 frames)** grid with **$128 \times 128$ pixel cells**, **chibi art proportions**, a **10px bottom margin** for combat effect clearance, strict **weapon consistency rules**, and **ground anchoring** so characters walk firmly on the ground rather than floating.

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

1. **Chibi Style Proportions:**
   - Proportions: **2.0 to 2.5 heads tall** (large expressive head, cute compact torso and limbs).
   - High readability in top-down / 2.5D isometric view.
   - Distinctive stylized equipment, hairstyles, and glowing eyes.

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

---

## 3. Cross-Sheet Consistency Protocol

To prevent character drift (where face, armor, eye color, hair, or wings change between the 4 sheets), follow this 3-step consistency protocol:

### Step 1: Character Design Specification (Design Bible)
Establish exact visual tokens before prompting:
- **Archetype & Proportions:** Chibi Norse Valkyrie maiden, 2.5 heads tall.
- **Head & Face:** Silver winged circlet/helmet, long golden blonde braids, cute glowing cyan eyes (`#00E5FF`).
- **Outfit & Armor:** Polished silver plate cuirass with gold trims, royal blue battle tunic/skirt (`#1D4ED8`).
- **Wings:** White feathered angel wings behind shoulders with subtle golden tips.
- **Equipment:** One golden-tipped spear in right hand, one round Norse shield (blue and silver with gold rim and center boss) on left arm. No other weapons.

### Step 2: Master Reference Generation
Generate the **Master Portrait** (or Master IDLE sheet) first. Save it as the visual anchor.

### Step 3: Reference Image Conditioning (`ImagePaths`)
When generating the remaining sheets (WALK, ATTACK, WALK_ATTACK), **always pass the master reference image** via `ImagePaths` in `generate_image` (e.g. `ImagePaths: [portrait_path, idle_sheet_path]`). This locks the model into drawing the exact same character with identical colors, hair, clothing, and weapons across all action states.

---

## 4. Standard Generation Prompts (Valkyrie Example: Spear & Shield)

### Master PORTRAIT Prompt (`hero_valkyrie_front.png`)
```text
128x128 chibi pixel art portrait of cute Valkyrie (winged maiden warrior of Norse mythology).
Chibi anime proportions, large expressive glowing cyan eyes, long golden blonde braided hair, silver winged helmet with golden trims, polished silver breastplate with royal blue tunic collar, white feathered wings with golden tips behind shoulders.
Holding spear in right hand and round blue Norse shield on left arm.
No other weapons.
Pure solid white background rgb(255,255,255), clean 16-bit chibi pixel art icon.
```

### Master IDLE Prompt (`hero_valkyrie_idle.png`)
```text
2D chibi pixel art character sprite sheet of cute Norse Valkyrie maiden warrior.
Chibi proportions: 2.5 heads tall, max 96px height, large expressive head, cute glowing cyan eyes, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic, white feathered wings with golden tips.
Equipment: STRICTLY ONE spear in right hand, STRICTLY ONE round blue Norse shield on left arm. ZERO extra weapons, NO weapons on hip, NO sheathed swords, NO daggers on belt, NO weapons on back.
Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward towards viewer. Right hand holds spear, left arm holds shield.
Row 1: STRICT 100% profile facing LEFT only for all 6 columns. Zero front-facing frames.
Row 2: STRICT 100% profile facing RIGHT only for all 6 columns. Zero front-facing frames.
Row 3: facing back / away from viewer. Right hand holds spear, left arm holds shield.
Animation: IDLE subtle breathing and gentle wing flutter cycle across 6 columns per row.
Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit chibi pixel art.
```

### Master WALK Prompt (`hero_valkyrie_walk.png`)
*(Provide Master Portrait & IDLE in `ImagePaths`)*
```text
2D chibi pixel art character sprite sheet of the same cute chibi Norse Valkyrie maiden from reference images.
Identical character design: 2.5 heads tall chibi proportions, max 96px height, cute large cyan eyes, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic, white feathered wings.
Equipment: STRICTLY ONE spear in right hand, STRICTLY ONE round blue Norse shield on left arm in every frame. NO extra weapons, NO swords on hips, NO weapons on back.
Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward towards viewer.
Row 1: STRICT 100% profile facing LEFT only for all 6 columns. Left arm shield forward, right hand spear behind.
Row 2: STRICT 100% profile facing RIGHT only for all 6 columns. Right hand spear forward, left arm shield behind.
Row 3: facing back / away from viewer.
Animation: WALK running cycle animation across 6 columns per row: alternating legs, cute run strides, animated wings, carrying spear and shield.
Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit chibi pixel art.
```

### Master ATTACK Prompt (`hero_valkyrie_attack.png`)
*(Provide Master Portrait & IDLE in `ImagePaths`)*
```text
2D chibi pixel art character sprite sheet of the same cute chibi Norse Valkyrie maiden from reference images.
Identical character design: 2.5 heads tall chibi proportions, max 96px height, cute large cyan eyes, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic, white feathered wings.
Equipment: STRICTLY ONE spear in right hand, STRICTLY ONE round blue Norse shield on left arm in every frame. NO extra weapons, NO swords on hips, NO weapons on back.
Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward towards viewer. Thrusting spear downward towards viewer.
Row 1: STRICT 100% profile facing LEFT only for all 6 columns. Thrusting spear forward to the left.
Row 2: STRICT 100% profile facing RIGHT only for all 6 columns. Thrusting spear forward to the right.
Row 3: facing back / away from viewer. Thrusting spear upward away from viewer.
Animation: ATTACK spear thrust animation across 6 columns per row: anticipation windup pull back, rapid forward spear lunge thrust with glowing cyan pierce arc trail, shield brace, recovery.
Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit chibi pixel art.
```

### Master WALK_ATTACK Prompt (`hero_valkyrie_walk_attack.png`)
*(Provide Master Portrait & IDLE in `ImagePaths`)*
```text
2D chibi pixel art character sprite sheet of the same cute chibi Norse Valkyrie maiden from reference images.
Identical character design: 2.5 heads tall chibi proportions, max 96px height, cute large cyan eyes, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic, white feathered wings.
Equipment: STRICTLY ONE spear in right hand, STRICTLY ONE round blue Norse shield on left arm in every frame. NO extra weapons, NO swords on hips, NO weapons on back.
Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward towards viewer.
Row 1: STRICT 100% profile facing LEFT only for all 6 columns.
Row 2: STRICT 100% profile facing RIGHT only for all 6 columns.
Row 3: facing back / away from viewer.
Animation: WALK ATTACK charging spear dash thrust animation across 6 columns per row: sprinting forward, leaping dive thrust with glowing cyan energy trail, follow-through dash, recovery.
Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit chibi pixel art.
```

---

## 5. Automated Processing Script

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

## 6. Engine Integration Checklist

### Step 6.1: Texture Preloading (`game/src/core/TextureManager.ts`)
```typescript
public static loadValkyrieTextures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
  return this.loadAnimatedTextures('hero_valkyrie', renderer);
}
```

### Step 6.2: Player Geometry Grounding (`game/src/entities/Player.ts` & `RemotePlayer.ts`)
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

### Step 6.3: Dynamic UV Columns Support
```typescript
const img = (tex as any).image as { width?: number; height?: number } | undefined;
const dynamicCols = (img && img.width && img.height && img.height > 0)
  ? Math.round((img.width / img.height) * 4)
  : cfg.cols;

tex.repeat.set(1 / dynamicCols, 1 / 4);
tex.offset.set(frameCol / dynamicCols, (3 - row) / 4);
```

---

## 7. Verification Checklist

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
