---
name: character-animation-pipeline
description: Standardized pipeline for creating, generating, extracting, aligning, and integrating 4-state animated characters (IDLE, WALK, ATTACK, WALK_ATTACK across 4 directional rows, 6 cols x 4 rows @ 128x128px per cell) and 128x128 portraits into the game engine.
---

# Character Animation Pipeline Skill

This skill defines the standardized master pipeline for creating, generating, processing, and integrating 4-state animated characters into the game engine.

Instead of generating a single massive composite sheet, this pipeline standardizes on **4 separate animation images** (one per action state) and **1 portrait avatar image**, using a unified **6 columns $\times$ 4 rows (24 frames)** grid with **$128 \times 128$ pixel cells**.

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

> **Why 4 separate images instead of a single composite sheet?**
> 1. **Zero quadrant bleed:** No text headers, no dividing gutter lines, and no bleed between adjacent animations.
> 2. **Maximized resolution:** AI generators produce far sharper details, weapon trails, wings, and cloth physics when generating one 6x4 state at a time.
> 3. **Unified UV math:** Every animation state uses the identical `1 / 6` width and `1 / 4` height UV tile mapping.

---

### 1.2 Directional Row Mapping (Rows 0 to 3)
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

### 1.3 Anatomical Baseline & Geometry Anchoring
In a $128 \times 128$ pixel cell:
- **Baseline Feet Anchor (`feet_y`)**: **$y = 100$** (leaving 28px margin at the bottom for ground contact shadows and downward weapon slash arcs).
- **Torso/Hip Horizontal Center (`center_x`)**: **$x = 64$** (exact center of the 128px cell).
- **Character Standing Height**: **$88 - 96$ px** (leaving 20-30px headroom for helmets, wings, hats, and floating effects).
- **Three.js Mesh Translation Formula**:
  For a plane geometry of size $3.6 \times 3.6$ units:
  $$\text{translation}_y = \left(\frac{\text{feet\_y}}{\text{cell\_size}} - 0.5\right) \times \text{world\_size} = \left(\frac{100}{128} - 0.5\right) \times 3.6 = 0.28125 \times 3.6 \approx 1.0125$$

---

## 2. Standard Generation Plan & AI Prompts

When generating character sheets using an image generation model or tool:
- **Aspect Ratio**: `3:2` (e.g. 1264x848 or 1536x1024, scaled down cleanly to 768x512).
- **Background**: Solid pitch-black background (`#000000`) without white borders, labels, or grid lines.
- **Style**: Clean 16-bit / 32-bit pixel art, uniform scale, consistent lighting, centered full-body sprites.

### Prompt Templates

#### 1. IDLE Sheet (`hero_<name>_idle.png`)
```text
2D pixel art character sprite sheet for <Hero Description>.
Grid layout with exactly 6 columns and 4 rows (24 frames total).
Pure solid pitch-black background #000000 without grid lines, seamless black backdrop.
Row 0: facing front / forward.
Row 1: facing left.
Row 2: facing right.
Row 3: facing back.
Animation state: IDLE breathing and subtle stance animation cycle across 6 columns per row.
Centered characters, consistent height, full body visible in each frame, clean pixel art style, no text, no labels.
```

#### 2. WALK Sheet (`hero_<name>_walk.png`)
```text
2D pixel art character sprite sheet for <Hero Description>.
Grid layout with exactly 6 columns and 4 rows (24 frames total).
Pure solid pitch-black background #000000 without grid lines, seamless black backdrop.
Row 0: facing front / forward.
Row 1: facing left.
Row 2: facing right.
Row 3: facing back.
Animation state: WALK running cycle animation across 6 columns per row: alternating legs, natural stride, arm swing.
Centered characters, consistent height, full body visible in each frame, clean pixel art style, no text, no labels.
```

#### 3. ATTACK Sheet (`hero_<name>_attack.png`)
```text
2D pixel art character sprite sheet for <Hero Description>.
Grid layout with exactly 6 columns and 4 rows (24 frames total).
Pure solid pitch-black background #000000 without grid lines, seamless black backdrop.
Row 0: facing front / forward.
Row 1: facing left.
Row 2: facing right.
Row 3: facing back.
Animation state: ATTACK strike animation across 6 columns per row: anticipation windup, weapon thrust and slash with glowing energy trail, follow-through, recovery.
Centered characters, full body visible in each frame, clean pixel art style, no text, no labels.
```

#### 4. WALK_ATTACK Sheet (`hero_<name>_walk_attack.png`)
```text
2D pixel art character sprite sheet for <Hero Description>.
Grid layout with exactly 6 columns and 4 rows (24 frames total).
Pure solid pitch-black background #000000 without grid lines, seamless black backdrop.
Row 0: facing front / forward.
Row 1: facing left.
Row 2: facing right.
Row 3: facing back.
Animation state: WALK ATTACK running dash slash animation across 6 columns per row: sprinting forward, leaping strike with glowing sword slash arc, follow-through dash, recovery.
Centered characters, full body visible in each frame, clean pixel art style, no text, no labels.
```

#### 5. PORTRAIT Icon (`hero_<name>_front.png`)
```text
128x128 pixel art portrait of <Hero Description>.
Epic RPG character portrait icon, close-up bust/head, detailed face, helmet/hair, shoulder armor.
Isolated on pure solid pitch-black background #000000, crisp pixel art, clean outlines.
```

---

## 3. Automated Processing Script

A dedicated processing script is located at `.agents/skills/character-animation-pipeline/scripts/process_character_sheets.py`:

```bash
python .agents/skills/character-animation-pipeline/scripts/process_character_sheets.py \
  --name "<char_name>" \
  --idle "<path_to_idle_sheet>" \
  --walk "<path_to_walk_sheet>" \
  --attack "<path_to_attack_sheet>" \
  --walk-attack "<path_to_walk_attack_sheet>" \
  --portrait "<path_to_portrait_image>" \
  --out-dir "public/textures/heroes" \
  --cell-size 128 \
  --feet-y 100
```

### Script Workflow:
1. **Background Chromakeying:** Automatically removes solid black, solid white, or solid background colors, producing a clean anti-aliased RGBA alpha channel.
2. **Row & Baseline Alignment:** Samples ground contact points across all 4 rows and aligns characters to `target_feet_y = 100`.
3. **Horizontal Centering:** Centers character bodies at $x = 64$ inside the $128 \times 128$ cell.
4. **Resolution Assembly:** Packs each state into exactly $768 \times 512$ px (6 cols $\times$ 4 rows).
5. **Portrait Formatting:** Cleans background and centers portrait to $128 \times 128$ px. If no portrait image is supplied, crops Row 0 Col 0 from the aligned IDLE sheet.

---

## 4. Engine Integration Checklist

### Step 4.1: Texture Preloading (`game/src/core/TextureManager.ts`)
Preload the 5 textures in `preloadAll()` and add a typed accessor:

```typescript
// In preloadAll:
'/textures/heroes/hero_<name>_front.png',
'/textures/heroes/hero_<name>_idle.png',
'/textures/heroes/hero_<name>_walk.png',
'/textures/heroes/hero_<name>_attack.png',
'/textures/heroes/hero_<name>_walk_attack.png',

// Accessor method:
public static load<Name>Textures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
  return this.loadAnimatedTextures('hero_<name>', renderer);
}
```

### Step 4.2: Player Geometry & UV State Machine (`game/src/entities/Player.ts` & `RemotePlayer.ts`)
1. **Geometry Setup:**
   ```typescript
   // 128x128 cell, feet anchored at y=100 in 3.6x3.6 world plane:
   // translation = (100 / 128 - 0.5) * 3.6 = 0.28125 * 3.6 = 1.0125
   this.heroGeom = new PlaneGeometry(3.6, 3.6);
   this.heroGeom.translate(0, 1.0125, 0);
   ```

2. **Animation UV State Machine:**
   ```typescript
   const STATE_CONFIG: Record<HeroAnimState, { texture: Texture; cols: number; fps: number }> = {
     IDLE: { texture: this.animatedTextures.idle, cols: 6, fps: 8 },
     WALK: { texture: this.animatedTextures.walk, cols: 6, fps: 12 },
     ATTACK: { texture: this.animatedTextures.attack, cols: 6, fps: 16 },
     WALK_ATTACK: { texture: this.animatedTextures.walk_attack, cols: 6, fps: 14 }
   };

   const cfg = STATE_CONFIG[this.animState];
   const tex = cfg.texture;

   // Support dynamic column detection from image aspect ratio:
   const img = (tex as any).image as { width?: number; height?: number } | undefined;
   const dynamicCols = (img && img.width && img.height && img.height > 0)
     ? Math.round((img.width / img.height) * 4)
     : cfg.cols;

   this.animFrameTimer += dt * cfg.fps;
   const frameCol = Math.floor(this.animFrameTimer) % dynamicCols;

   const DIR_ROW_MAP: Record<SpriteDirection, number> = {
     front: 0,
     left: 1,
     right: 2,
     back: 3
   };
   const row = DIR_ROW_MAP[this.currentDir];

   // UV repeat and offset:
   tex.repeat.set(1 / dynamicCols, 1 / 4);
   tex.offset.set(frameCol / dynamicCols, (3 - row) / 4);
   ```

### Step 4.3: Character Registration
1. Add character type to `CharacterType` in `game/src/shared/types/entities.ts`.
2. Register in `HERO_LIST` in `game/src/shared/types/registry.ts`.
3. Add starting weapon and stats in `game/src/entities/Player.ts` (`applyCharacterPerks`).
4. Add portrait card in `game/src/ui/html/characterSelectModal.html`.

---

## 5. Verification Checklist

Always verify after asset generation and integration:
1. `python .agents/skills/character-animation-pipeline/scripts/process_character_sheets.py ...` -> Exit code 0.
2. Dimensions check:
   - All 4 sheets (`idle`, `walk`, `attack`, `walk_attack`): **$768 \times 512$** pixels RGBA.
   - Portrait (`front`): **$128 \times 128$** pixels RGBA.
3. TypeScript check:
   ```powershell
   npm run typecheck
   ```
4. Build verification:
   ```powershell
   npm run build
   ```
5. In-game verification: launch game, select the character, and test moving and attacking in all 4 directions (Front, Left, Right, Back).
