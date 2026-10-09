---
name: character-animation-pipeline
description: Standardized pipeline for creating, generating, extracting, aligning, and integrating 4-state animated characters (IDLE, WALK, ATTACK, WALK_ATTACK across 4 directional rows, 6 cols x 4 rows @ 128x128px per cell) in chibi style with mandatory 1px black border and bottom grounding into the game engine.
---

# Character Animation Pipeline Skill

This skill defines the standardized master pipeline for creating, generating, processing, and integrating 4-state animated characters into the game engine.

Instead of generating a single massive composite sheet, this pipeline standardizes on **4 separate animation images** (one per action state) and **1 portrait avatar image**, using a unified **6 columns $\times$ 4 rows (24 frames)** grid with **$128 \times 128$ pixel cells**, **chibi art proportions**, a **mandatory 1px solid black border**, and **bottom grounding** so characters walk firmly on the ground rather than floating.

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

### 1.2 Core Visual Standards: Chibi Proportions & 1px Black Border

1. **Chibi Style Proportions:**
   - Proportions: **2.0 to 2.5 heads tall** (large expressive head, cute compact torso and limbs).
   - High readability in top-down / 2.5D isometric view.
   - Distinctive stylized equipment, hairstyles, and glowing eyes.

2. **Mandatory 1px Solid Black Outline (`border 1px black`):**
   - Every frame **must have a crisp 1px solid black outline** (`#000000`) surrounding the character's outer silhouette.
   - This ensures the sprite cleanly pops out against any background, sandy floor, altar tiles, or enemy crowds.
   - The processing script automatically enforces this outline on all alpha boundaries.

3. **Bottom Grounding (`Прижатие к низу`):**
   - **Crucial Rule:** In each $128 \times 128$ frame, the character's feet **must be pressed to the bottom of the cell** (`target_feet_y = 122`), leaving only 6px margin at the bottom (for ground contact and the 1px black border).
   - All extra empty space / headroom sits at the **top of the cell** ($y \in [0, 18]$), **never at the bottom**.
   - If empty space were left below the feet, shorter/chibi characters would hover or float in the air above the terrain!

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
For a $3.6 \times 3.6$ unit plane geometry in Three.js with feet anchored at `feet_y = 122` in a 128px cell:

$$\text{translation}_y = \left(\frac{\text{feet\_y}}{\text{cell\_size}} - 0.5\right) \times \text{world\_size} = \left(\frac{122}{128} - 0.5\right) \times 3.6 = 0.453125 \times 3.6 = 1.63125$$

With geometry translation $1.63125$, the character's feet touch down **exactly at ground level ($y = 0.000$)**, resting perfectly on top of the ground shadow mesh (`shadowMesh`).

---

## 2. Cross-Sheet Consistency Protocol

To prevent character drift (where face, armor, eye color, hair, or wings change between the 4 sheets), follow this 3-step consistency protocol:

### Step 1: Character Design Specification (Design Bible)
Establish exact visual tokens before prompting:
- **Archetype & Proportions:** e.g., Chibi Norse Valkyrie maiden, 2.5 heads tall.
- **Head & Face:** Silver winged helmet/circlet, long golden blonde braids, glowing cyan eyes (`#00E5FF`).
- **Outfit & Armor:** Polished silver plate cuirass with gold trims, royal blue battle tunic/skirt (`#1D4ED8`).
- **Accessories:** Golden-feathered wings behind shoulders, silver two-handed greatsword with glowing azure blade.
- **Outline:** Mandatory 1px solid black border.

### Step 2: Master Reference Generation
Generate the **Master Portrait** (or Master IDLE sheet) first. Save it as the visual anchor.

### Step 3: Reference Image Conditioning (`ImagePaths`)
When generating the remaining sheets (WALK, ATTACK, WALK_ATTACK), **always pass the master reference image** via `ImagePaths` in `generate_image` (e.g. `ImagePaths: [portrait_path, idle_sheet_path]`). This locks the model into drawing the exact same character with identical colors, hair, and clothing across all action states.

---

## 3. Standard Generation Prompts

### Master IDLE Prompt (`hero_<name>_idle.png`)
```text
2D chibi pixel art character sprite sheet of <Hero Description>.
Chibi proportions: 2.5 heads tall, large expressive head, cute glowing cyan eyes, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic, golden feathered wings, holding silver greatsword.
Mandatory crisp 1px solid black outline around every character sprite (border 1px black).
Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward.
Row 1: facing left.
Row 2: facing right.
Row 3: facing back.
Animation: IDLE subtle breathing and gentle wing flutter cycle across 6 columns per row.
Characters anchored to the bottom of their frame cell. Clean 16-bit chibi pixel art.
```

### Master WALK Prompt (`hero_<name>_walk.png`)
*(Provide Master Portrait & IDLE in `ImagePaths`)*
```text
2D chibi pixel art character sprite sheet of the same cute chibi <Hero Description> from reference images.
Identical character design: 2.5 heads tall chibi proportions, cute large cyan eyes, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic, golden feathered wings, holding silver greatsword.
Mandatory crisp 1px solid black outline around every character sprite (border 1px black).
Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward.
Row 1: facing left.
Row 2: facing right.
Row 3: facing back.
Animation: WALK running cycle animation across 6 columns per row: alternating legs, cute run strides, animated wings.
Characters anchored to the bottom of their frame cell. Clean 16-bit chibi pixel art.
```

### Master ATTACK Prompt (`hero_<name>_attack.png`)
*(Provide Master Portrait & IDLE in `ImagePaths`)*
```text
2D chibi pixel art character sprite sheet of the same cute chibi <Hero Description> from reference images.
Identical character design: 2.5 heads tall chibi proportions, cute large cyan eyes, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic, golden feathered wings, wielding two-handed silver greatsword.
Mandatory crisp 1px solid black outline around every character sprite (border 1px black).
Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward.
Row 1: facing left.
Row 2: facing right.
Row 3: facing back.
Animation: ATTACK strike animation across 6 columns per row: anticipation windup, raising greatsword, forward cleave slash with glowing cyan blade arc trail, follow-through swing, recovery.
Characters anchored to the bottom of their frame cell. Clean 16-bit chibi pixel art.
```

### Master WALK_ATTACK Prompt (`hero_<name>_walk_attack.png`)
*(Provide Master Portrait & IDLE in `ImagePaths`)*
```text
2D chibi pixel art character sprite sheet of the same cute chibi <Hero Description> from reference images.
Identical character design: 2.5 heads tall chibi proportions, cute large cyan eyes, golden blonde braids, silver winged helmet, silver plate armor with royal blue tunic, golden feathered wings, wielding two-handed silver greatsword.
Mandatory crisp 1px solid black outline around every character sprite (border 1px black).
Grid layout: exactly 6 columns and 4 rows (24 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward.
Row 1: facing left.
Row 2: facing right.
Row 3: facing back.
Animation: WALK ATTACK running dash slash animation across 6 columns per row: sprinting forward, leaping strike with glowing cyan greatsword slash arc, follow-through dash, recovery.
Characters anchored to the bottom of their frame cell. Clean 16-bit chibi pixel art.
```

### Master PORTRAIT Prompt (`hero_<name>_front.png`)
```text
128x128 chibi pixel art portrait of cute <Hero Description>.
Chibi anime proportions, large expressive glowing cyan eyes, long golden blonde braided hair, silver winged helmet with golden trims, silver breastplate with royal blue tunic collar, small golden feathered wings.
Mandatory crisp 1px solid black outline around the character border.
Pure solid white background rgb(255,255,255), clean 16-bit chibi pixel art icon.
```

---

## 4. Automated Processing Script

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
  --feet-y 122 \
  --char-h 104.0
```

### Processing Operations:
1. **Background Clean:** Removes pure white (`#FFFFFF`) or pure black (`#000000`) backgrounds, generating smooth anti-aliased alpha borders.
2. **Bottom Anchoring:** Pushes all feet to `target_feet_y = 122` (in 128px cell). Shorter characters leave headroom at the top, firmly standing on the ground.
3. **Mandatory 1px Black Border:** Applies morphological dilation to ensure every single frame has an outer 1px `#000000` boundary.
4. **Resolution Packaging:** Packs each sheet into $768 \times 512$ px (6 cols $\times$ 4 rows @ 128x128) and portrait into $128 \times 128$ px.

---

## 5. Engine Integration Checklist

### Step 5.1: Texture Preloading (`game/src/core/TextureManager.ts`)
```typescript
public static loadValkyrieTextures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
  return this.loadAnimatedTextures('hero_valkyrie', renderer);
}
```

### Step 5.2: Player Geometry Grounding (`game/src/entities/Player.ts` & `RemotePlayer.ts`)
```typescript
public static getCharacterGeometry(charType: CharacterType): PlaneGeometry {
  let geom = Player.geometryCache.get(charType);
  if (!geom) {
    geom = new PlaneGeometry(3.6, 3.6);
    // 128x128 chibi standard: feet anchored at y=122 in 128px cell (pressed to bottom)
    // translation = (122 / 128 - 0.5) * 3.6 = 0.453125 * 3.6 = 1.63125
    // Legacy 96x96 standard: feet anchored at y=74 in 96px cell -> 0.975
    const is128Standard = charType === 'valkyrie';
    const translateY = is128Standard ? 1.63125 : 0.975;
    geom.translate(0, translateY, 0);
    Player.geometryCache.set(charType, geom);
  }
  return geom;
}
```

### Step 5.3: Dynamic UV Columns Support
```typescript
const img = (tex as any).image as { width?: number; height?: number } | undefined;
const dynamicCols = (img && img.width && img.height && img.height > 0)
  ? Math.round((img.width / img.height) * 4)
  : cfg.cols;

tex.repeat.set(1 / dynamicCols, 1 / 4);
tex.offset.set(frameCol / dynamicCols, (3 - row) / 4);
```

---

## 6. Verification Checklist

Always run:
1. `python .agents/skills/character-animation-pipeline/scripts/process_character_sheets.py ...` -> Exit code 0.
2. Dimensions check:
   - 4 sheets: $768 \times 512$ pixels RGBA.
   - Portrait: $128 \times 128$ pixels RGBA.
   - Outline check: 1px black outline around all character frames.
3. TypeScript check:
   ```powershell
   npm run typecheck
   ```
4. Build verification:
   ```powershell
   npm run build
   ```
5. In-game verification: verify feet touch ground shadows without floating.
