---
name: boss-animation-pipeline
description: Comprehensive pipeline for extracting, aligning, mirroring, packaging, and integrating 2-state animated boss monsters (WALK, ATTACK across 4 directional rows) into the game engine.
---

# Boss Animation Pipeline Skill

This skill defines the complete pipeline for extracting composite boss sprite sheets and integrating them as fully animated, multi-state boss enemies with directional movement and melee/ranged attack sequences into the game engine.

---

## 1. Sprite Sheet Anatomy & Layout

Standard boss sprite sheets feature 2 action states across 3 input rows:

```
+------------------------------------+------------------------------------+
|  WALK:                             |  ATTACK:                           |
|  Row 0: Right (facing right)       |  Row 3: Right (facing right)       |
|  Row 1: Front (facing down)        |  Row 4: Front (facing down)        |
|  Row 2: Back  (facing up)          |  Row 5: Back  (facing up)          |
+------------------------------------+------------------------------------+
```

### Directional Row Conventions in Output Sheets (4 Rows)
In Three.js UV coordinates, $V=0$ is at the bottom of the image and $V=1$ is at the top.
The generated sprite sheets standardize to 4 directional rows (from top to bottom):
- **Row 0 (Top)**: Front / Forward-facing view (moving down towards player)
- **Row 1**: Left-facing view (horizontally mirrored from Row 0 Right)
- **Row 2**: Right-facing view (moving right)
- **Row 3 (Bottom)**: Back / Upward-facing view (moving up away from player)

### Texture Resolution Standards
Each boss frame is standardized to square cells providing generous margins for combat stances and attacks:
- **Demon Boss (`boss_demon`)**: $160 \times 160$ px cell size (`feet_y = 136`)
  - **WALK**: $960 \times 640$ px (6 cols $\times$ 4 rows)
  - **ATTACK**: $960 \times 640$ px (6 cols $\times$ 4 rows)
- **Hydra Boss (`boss_hydra`)**: $224 \times 224$ px cell size (`feet_y = 180`, accommodates 3 necks and tail)
  - **WALK**: $1344 \times 896$ px (6 cols $\times$ 4 rows)
  - **ATTACK**: $1344 \times 896$ px (6 cols $\times$ 4 rows)
- **Directional Fallbacks & Portraits**: `<name>_front.png`, `<name>_left.png`, `<name>_right.png`, `<name>_back.png`

---

## 2. Automated Extraction Tool

A production-ready Python extraction script is provided in `scripts/extract_boss.py`:

```bash
python .agents/skills/boss-animation-pipeline/scripts/extract_boss.py \
  --input "<path_to_input_sheet>" \
  --name "boss_demon" \
  --out-dir "public/textures" \
  --cell-size 160 \
  --feet-y 136 \
  --cols 6
```

### Script Capabilities:
1. **Background & Alpha Auto-Cleaning:**
   - Detects transparent PNGs and cleans faint compression noise (`alpha < 12`).
   - Supports solid backgrounds via automatic corner sampling and Euclidean chromakeying.
2. **Badge & Label Filtering:**
   - Automatically detects and skips side badges (e.g., "Ходьба", "Вправо", "Лицом", "Спиной", "Атака").
3. **Anatomical Baseline Alignment:**
   - Anchors feet to `target_feet_y` (default: 136 for 160px cells) across both Walk and Attack.
   - Centers the torso/hip anchor at `cell_size / 2` (80px), ensuring the boss does not jitter or slide when slashing.
4. **Automatic Horizontal Mirroring:**
   - Automatically mirrors the Right-facing walk and attack rows to create seamless Left-facing rows.

---

## 3. Engine Integration Checklist

### Step 3.1: Texture Loading (`src/core/TextureManager.ts`)
Define `BossTextures` interface and preloading helpers:

```typescript
export interface BossTextures {
  walk: THREE.Texture;
  attack: THREE.Texture;
}

public static loadBossTextures(baseName: string, renderer?: THREE.WebGLRenderer): BossTextures {
  const loadPixel = (url: string) => {
    const tex = this.load(url, renderer);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  };
  return {
    walk: loadPixel(`/textures/bosses/${baseName}_walk.png`),
    attack: loadPixel(`/textures/bosses/${baseName}_attack.png`)
  };
}
```

### Step 3.2: Boss Animation State Machine (`src/entities/Enemy.ts`)
1. Extend `Enemy` class with boss animation state properties:
   ```typescript
   public animState: 'WALK' | 'ATTACK' = 'WALK';
   private bossTextures?: BossTextures;
   private bossAnimTimer: number = 0;
   public attackCooldown: number = 0;
   ```
2. Setup Geometry Anchoring:
   ```typescript
   // Plane geometry centered on feet at target_feet_y = 136 in 160px cell:
   // translation = size * (136 / 160 - 0.5) = 5.2 * 0.35 = 1.82
   const geom = new THREE.PlaneGeometry(5.2, 5.2);
   geom.translate(0, 5.2 * 0.35, 0);
   ```
3. Update UV coordinates per frame:
   ```typescript
   const DIR_ROW_MAP: Record<SpriteDirection, number> = {
     front: 0,
     left: 1,
     right: 2,
     back: 3
   };
   const row = DIR_ROW_MAP[this.currentDir];
   const tex = this.animState === 'ATTACK' ? this.bossTextures.attack : this.bossTextures.walk;
   const cols = 6;
   const frameCol = Math.floor(this.bossAnimTimer) % cols;
   tex.repeat.set(1 / cols, 1 / 4);
   tex.offset.set(frameCol / cols, (3 - row) / 4);
   ```

### Step 3.3: Combat & Attack Timing (`src/entities/EnemyManager.ts`)
- Trigger boss attack animation when the boss is within melee attack distance ($< 3.2$ units) of a player.
- While attacking, hold attack animation for 6 frames (approx 0.5s at 12 fps), then deal damage or trigger shockwave.

---

## 4. Verification Checklist

1. `python .agents/skills/boss-animation-pipeline/scripts/extract_boss.py ...` -> Return code 0.
2. Verify output textures exist in `public/textures/bosses/` and `dist/textures/bosses/`.
3. `npx tsc --noEmit` -> Zero TypeScript errors.
4. `npm run build` -> Clean build without warnings.
5. In-game Dev Panel -> Click "Призвать босса" / "Spawn Boss" and verify walking, attacking in all 4 directions, and smooth sprite playback.
