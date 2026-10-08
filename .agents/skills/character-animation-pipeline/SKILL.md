---
name: character-animation-pipeline
description: Comprehensive pipeline for extracting, aligning, packaging, and integrating 4-state animated characters (IDLE, WALK, ATTACK, WALK_ATTACK across 3 directional rows at 128x128 cell size) into the game engine.
---

# Character Animation Pipeline Skill

This skill defines the complete pipeline for taking a composite 3-perspective character concept reference sheet and integrating it as a fully animated, playable hero into the game engine.

---

## 1. Concept Reference Sheet Anatomy & Standards

Modern character assets originate from a standardized multi-panel reference image on a solid chromakey background (typically green `#A2DD5C`):

```
+------------------------------------+------------------------------------+
|  TOP-LEFT: PORTRAIT / BUST         |  TOP-RIGHT: SIGNATURE WEAPON       |
|  Close-up portrait within box      |  Full weapon on transparent/green  |
+------------------------------------+------------------------------------+
|  BOTTOM-LEFT:      |  BOTTOM-CENTER:    |  BOTTOM-RIGHT:                |
|  FRONT VIEW        |  SIDE VIEW (Right) |  BACK VIEW                    |
|  (Full standing)   |  (Full profile)    |  (Full rear)                  |
+--------------------+--------------------+-------------------------------+
```

### Directional Row Conventions (3 Output Rows)
In Three.js UV coordinates, $V=0$ is at the bottom of the image and $V=1$ is at the top.
Output sprite sheets standardize to **3 directional rows**:
- **Row 0 (Top)**: Front / Forward-facing view ($V \in [2/3, 1]$)
- **Row 1 (Middle)**: Side view ($V \in [1/3, 2/3]$), facing right. In-engine, Left-facing view is mirrored automatically via UV coordinates (`repeat.x = -1/cols`, `offset.x = (col + 1)/cols`).
- **Row 2 (Bottom)**: Back / Upward-facing view ($V \in [0, 1/3]$)

### Texture Resolution & Cell Size Standards (128x128)
Each individual sprite frame is standardized to a **$128 \times 128$** pixel cell (`cell_size = 128`, `target_feet_y = 99`):
- **IDLE**: $512 \times 384$ px (4 columns $\times$ 3 rows, 4 frames per direction)
- **IDLE_ATTACK (ATTACK)**: $640 \times 384$ px (5 columns $\times$ 3 rows, 5 frames per direction)
- **WALK**: $512 \times 384$ px (4 columns $\times$ 3 rows, 4 frames per direction)
- **WALK_ATTACK**: $640 \times 384$ px (5 columns $\times$ 3 rows, 5 frames per direction)
- **PORTRAIT**: $64 \times 64$ px / $128 \times 128$ px (`hero_<char_name>_front.png`, extracted from top-left box)
- **WEAPON**: $128 \times 128$ px icon (`weapon_<weapon_id>.png`, extracted from top-right box)

### Mandatory Rule: Frame 3 Closed Eyes
In **ALL** 4 action states (`IDLE`, `IDLE_ATTACK`, `WALK`, `WALK_ATTACK`), the character **MUST HAVE CLOSED EYES** on **Frame 3** (1-based frame 3, 0-based column index 2):
- **Front View**: Both eyes are replaced with natural skin tone and a dark curved eyelash contour line.
- **Side View**: The visible eye is closed with eyelash contour line.
- **Back View**: Head/body matches Frame 3 breathing/step/attack timing.

---

## 2. Automated Extraction Tool

A production-ready Python extraction script is located at `scripts/extract_character.py`:

```bash
python .agents/skills/character-animation-pipeline/scripts/extract_character.py \
  --input "<path_to_concept_sheet>" \
  --name "hero_<char_name>" \
  --out-dir "public/textures/heroes" \
  --weapon-dir "public/textures/weapons" \
  --weapon-name "weapon_<weapon_id>" \
  --cell-size 128 \
  --feet-y 99
```

### Script Capabilities:
1. **Format Auto-Detection:**
   - Detects modern reference concept sheets (green background `#A2DD5C`, portrait, weapon, 3 bottom perspectives) vs. legacy 4-quadrant sheets.
2. **Chromakey Despill & Alpha Extraction:**
   - Samples corner colors, calculates Euclidean distance, extracts smooth anti-aliased alpha borders, and removes green color bleed.
3. **High-Res Closed-Eyes Synthesis:**
   - Replaces eyes on the high-resolution crop before downscaling to preserve crisp eyelash edges and smooth skin gradients.
4. **Anatomical Baseline Alignment:**
   - Anchors feet to `target_feet_y = 99` across all 4 action sheets, leaving ~33px of generous headroom for extended sword slash arcs.
5. **Frame Sequence & Slash Generation:**
   - Generates 4-frame breathing/idle cycle, 4-frame walk stride cycle, 5-frame sword cleave attack with glowing slash arc VFX, and 5-frame dash cleave attack.

---

## 3. Code Integration Checklist

### Step 3.1: Shared Types & Registries
Add the new hero key:
- `game/src/shared/types/entities.ts`: Extend `CharacterType`:
  ```typescript
  export type CharacterType = 'ronin' | 'valkyrie' | 'flail' | 'sorceress' | 'chakram' | 'archer' | '<new_hero>';
  ```
- `game/src/shared/types/registry.ts`: Add to `CHARACTERS` array.

### Step 3.2: Texture Preloading (`src/core/TextureManager.ts`)
Preload animated textures and weapon icon:
```typescript
// 1. In TextureManager:
public static load<HeroName>Textures(renderer?: WebGLRenderer): AnimatedCharacterTextures {
  return this.loadAnimatedTextures('hero_<char_name>', renderer);
}
```

### Step 3.3: Signature Weapon (`src/combat/Weapon.ts` & `src/sim/SimWeapons.ts`)
1. Create client-side weapon with `onTriggerAttack` callback:
   ```typescript
   export class <WeaponName>Weapon extends Weapon {
     private slashRadius: number = 3.8;
     private onTriggerAttack?: () => void;
     constructor(onTriggerAttack?: () => void) {
       super('<weapon_id>', '<Weapon Name>', '🗡️', <cooldown>, <damage>);
       this.onTriggerAttack = onTriggerAttack;
     }
   }
   ```
2. Create simulation counterpart in `SimWeapons.ts` and register in `createSimWeaponForCharacter`.

### Step 3.4: Player Animation State Machine (`src/entities/Player.ts` & `RemotePlayer.ts`)
Support 3-row sheets with UV mirroring for left direction:
```typescript
const is3Row = this.charType === '<new_hero>';
const STATE_CONFIG = is3Row ? {
  IDLE: { texture: this.animatedTextures.idle, cols: 4, rows: 3, fps: 8 },
  WALK: { texture: this.animatedTextures.walk, cols: 4, rows: 3, fps: 10 },
  ATTACK: { texture: this.animatedTextures.attack, cols: 5, rows: 3, fps: 14 },
  WALK_ATTACK: { texture: this.animatedTextures.walk_attack, cols: 5, rows: 3, fps: 14 }
} : { /* legacy 4-row config */ };

// Direction mapping:
// front -> row 0, right -> row 1, left -> row 1 (mirrored), back -> row 2
const row = this.currentDir === 'front' ? 0 : this.currentDir === 'back' ? 2 : 1;
const isMirror = is3Row && this.currentDir === 'left';

if (isMirror) {
  tex.repeat.set(-1 / cfg.cols, 1 / cfg.rows);
  tex.offset.set((frameCol + 1) / cfg.cols, ((cfg.rows - 1) - row) / cfg.rows);
} else {
  tex.repeat.set(1 / cfg.cols, 1 / cfg.rows);
  tex.offset.set(frameCol / cfg.cols, ((cfg.rows - 1) - row) / cfg.rows);
}
```

### Step 3.5: Character Select UI (`HUD.ts` & `characterSelectModal.html`)
1. Add hero name in `HUD.getHeroName()` and avatar in `HUD.getHeroAvatar()`.
2. Add hero card in `game/src/ui/html/characterSelectModal.html`:
   ```html
   <div class="character-card hero-select-card" data-hero="<char_type>">
     ...
     <img src="/textures/heroes/hero_<char_name>_front.png" alt="<Name>" class="char-portrait" />
     <div class="char-card-name"><Hero Display Name></div>
   </div>
   ```

---

## 4. Verification Checklist

Always run:
1. `python .agents/skills/character-animation-pipeline/scripts/extract_character.py ...` -> Check exit code 0 and texture dimensions (IDLE/WALK: 512x384, ATTACK/WALK_ATTACK: 640x384).
2. Check Frame 3: Confirm eyes are closed on column 2 in all 4 generated sheets.
3. `npm run typecheck` -> Zero TypeScript errors.
4. `npm run build` -> Production build bundle passes.
5. In-game verification -> Test character movement in all 4 directions, verify attack animations, and verify left-right mirroring.
