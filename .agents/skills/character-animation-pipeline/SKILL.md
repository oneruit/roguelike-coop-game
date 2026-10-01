---
name: character-animation-pipeline
description: Comprehensive pipeline for extracting, aligning, packaging, and integrating 4-state animated characters (IDLE, WALK, ATTACK, WALK_ATTACK across 4 directional rows) into the Wild West 2.5D game engine.
---

# Character Animation Pipeline Skill

This skill defines the complete pipeline for taking a composite 4-quadrant character sprite sheet and integrating it as a fully animated, playable hero into the game engine.

---

## 1. Sprite Sheet Anatomy & Layout

Standard composite sheets feature 4 distinct quadrants:

```
+------------------------------------+------------------------------------+
|  QUADRANT 1: IDLE                  |  QUADRANT 2: ATTACK                |
|  10 columns x 4 directional rows   |  8 columns x 4 directional rows    |
+------------------------------------+------------------------------------+
|  QUADRANT 3: WALK                  |  QUADRANT 4: WALK ATTACK           |
|  6 columns x 4 directional rows    |  6 columns x 4 directional rows    |
+------------------------------------+------------------------------------+
```

### Directional Row Conventions (Row 0 to 3)
In Three.js UV coordinates, $V=0$ is at the bottom of the image and $V=1$ is at the top.
The rows from top to bottom map to:
- **Row 0 (Top)**: Front / Forward-facing view
- **Row 1**: Left-facing view
- **Row 2**: Right-facing view
- **Row 3 (Bottom)**: Back / Upward-facing view

### Texture Resolution Standards
Each frame is standardized to a **$96 \times 96$** pixel cell (providing generous margins so extended sword slash arcs are never clipped):
- **IDLE**: $960 \times 384$ px (10 cols $\times$ 4 rows)
- **WALK**: $576 \times 384$ px (6 cols $\times$ 4 rows)
- **ATTACK**: $768 \times 384$ px (8 cols $\times$ 4 rows)
- **WALK ATTACK**: $576 \times 384$ px (6 cols $\times$ 4 rows)
- **PORTRAIT**: $64 \times 64$ px (LANCZOS downscale of Row 0, Col 0 of IDLE)

---

## 2. Automated Extraction Tool

A production-ready Python extraction script is provided in `scripts/extract_character.py`:

```bash
python .agents/skills/character-animation-pipeline/scripts/extract_character.py \
  --input "<path_to_input_sheet>" \
  --name "hero_<char_name>" \
  --out-dir "public/textures" \
  --cell-size 96 \
  --feet-y 74
```

### Script Capabilities:
1. **Background Auto-Detection:**
   - **Transparent PNG:** Automatically detects alpha channel and cleans faint noise (`alpha < 12`).
   - **Solid Background (JPEG/PNG):** Automatically samples corners, determines background color, and executes Euclidean distance chromakeying with soft anti-aliased alpha borders.
2. **Quadrant & Row Auto-Detection:**
   - Detects the empty gutter between left and right quadrants.
   - Filters out text headers (e.g. "IDLE", "ATTACK") using row height and offset thresholds.
   - Locates exact bounding boxes for every individual sprite frame.
3. **Anatomical Baseline Alignment:**
   - Anchors feet consistently to `target_feet_y` (default: 48) across all 4 action states.
   - Prevents vertical jumping, slipping, and jittering when transitioning between Idle, Walk, Attack, and Walk Attack.
   - Provides safe margins for elongated sword slashes and weapon trails.
4. **Frame Looping & Padding:**
   - For rows with fewer frames (e.g., Row 3 IDLE often having 4 frames), applies ping-pong looping `[0, 1, 2, 3, 2, 1, 0, 1, 2, 3]` to seamlessly fill 10 frames.

---

## 3. Code Integration Checklist

### Step 3.1: Texture Preloading (`src/core/TextureManager.ts`)
Add character texture preloading and accessor:

```typescript
// 1. In preloadAll:
this.loadAnimatedTextures('hero_<char_name>', renderer);

// 2. Add helper method:
public static load<CharName>Textures(renderer?: THREE.WebGLRenderer): AnimatedCharacterTextures {
  return this.loadAnimatedTextures('hero_<char_name>', renderer);
}
```

### Step 3.2: Signature Weapon (`src/combat/Weapon.ts`)
Create the hero's signature weapon with attack callback integration:

```typescript
export class <WeaponName>Weapon extends Weapon {
  private slashRadius: number = 3.6;
  private onTriggerAttack?: () => void;

  constructor(onTriggerAttack?: () => void) {
    super('<weapon_id>', '<Weapon Name>', '🗡️', <cooldown>, <damage>);
    this.onTriggerAttack = onTriggerAttack;
  }

  public update(dt: number, playerPos: THREE.Vector3, enemies: Enemy[], spawnProjectile: (p: Projectile) => void) {
    this.timer += dt;
    if (this.timer >= this.cooldown) {
      // Check hits and trigger onTriggerAttack() to start character attack animation
      if (hitCount > 0 || nearbyEnemies) {
        this.timer = 0;
        this.onTriggerAttack?.();
        SoundManager.playSlash();
      }
    }
  }
}
```

### Step 3.3: Player Animation State Machine (`src/entities/Player.ts`)
1. Extend `CharacterType`:
   ```typescript
   export type CharacterType = 'male' | 'female' | 'swordsman' | 'ronin' | '<new_char>';
   ```
2. Setup Geometry Anchoring in constructor:
   ```typescript
   // For feet at target_feet_y (e.g. 48): translate is 3.6 * (48/64 - 0.5) = 3.6 * 0.25 = 0.9
   this.<char>Geom = new THREE.PlaneGeometry(3.6, 3.6);
   this.<char>Geom.translate(0, 3.6 * 0.25, 0);
   ```
3. Update `isAnimatedCharacter()` to return `true` for the new character type.
4. Add stats and starting weapon to `applyCharacterPerks()`:
   ```typescript
   this.baseDamageMultiplier = 1.35;
   this.maxHp = 115;
   this.hp = 115;
   this.baseSpeed = 8.6;
   this.weapons.push(new <WeaponName>Weapon(() => this.triggerAttackAnim(0.42)));
   ```

### Step 3.4: Level-Up Options Pool (`src/ui/HUD.ts`)
Add the weapon to `generateUpgradeOptions()` so other heroes or this hero can level it up.

### Step 3.5: Character Select UI (`index.html` & `src/style.css`)
Add the character card to `#character-select-modal .character-grid`:

```html
<div class="character-card" data-hero="<char_type>">
  <div class="char-portrait-wrapper">
    <img src="/textures/hero_<char_name>_front.png" alt="<Name>" class="char-portrait" />
  </div>
  <div class="char-name"><Character Name></div>
  <div class="char-type"><Class / Title></div>
  <div class="char-perks">
    <div class="perk-tag">🎯 Стартовое оружие: ...</div>
    <div class="perk-tag">🌀 Полный цикл анимаций: Idle, Walk, Attack, Walk Attack</div>
    <div class="perk-tag">⚡ ...</div>
  </div>
  <button class="action-btn select-btn">Выбрать</button>
</div>
```

Ensure `.character-grid` in `src/style.css` uses a responsive layout (`grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))` or `repeat(N, 1fr)`).

---

## 4. Animation Timing and UV Reference

In `updateAnimatedCharacterAnimation`:
```typescript
const STATE_CONFIG: Record<HeroAnimState, { texture: THREE.Texture; cols: number; fps: number }> = {
  IDLE: { texture: textures.idle, cols: 10, fps: 8 },
  WALK: { texture: textures.walk, cols: 6, fps: 12 },
  ATTACK: { texture: textures.attack, cols: 8, fps: 16 },
  WALK_ATTACK: { texture: textures.walk_attack, cols: 6, fps: 14 }
};

// UV repeat & offset:
const row = DIR_ROW_MAP[this.currentDir]; // front=0, left=1, right=2, back=3
texture.repeat.set(1 / cfg.cols, 1 / 4);
texture.offset.set(frameCol / cfg.cols, (3 - row) / 4);
```

---

## 5. Verification Checklist

Always run:
1. `python .agents/skills/character-animation-pipeline/scripts/extract_character.py ...` -> Check exit code 0 and dimensions.
2. `npx tsc --noEmit` -> Zero TypeScript errors.
3. `npm run build` -> Production build bundle passes.
4. Launch/check dev server -> Verify all 4 directions and 4 action states trigger in-game without console errors.
