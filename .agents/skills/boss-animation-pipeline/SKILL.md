---
name: boss-animation-pipeline
description: Comprehensive pipeline for creating, generating, extracting, aligning, mirroring, packaging, and integrating 4-frame animated boss monsters (WALK, ATTACK, IDLE across 4 directional rows, 4 cols x 4 rows @ 160x160px per cell) with ground anchoring and anti-drift rules into the game engine.
---

# Boss Animation Pipeline Skill

This skill defines the standardized master pipeline for creating, generating, processing, and integrating **4-frame animated boss monsters** into the game engine.

Standardizing on **separate animation images** (one per action state) and **1 portrait avatar image**, using a unified **4 columns $\times$ 4 rows (16 frames)** grid with **$160 \times 160$ pixel cells** (total resolution **$640 \times 640$ px**), generous margins for melee cleaves and shockwaves, strict **boss anatomical consistency rules**, and **ground anchoring** so massive boss monsters stand firmly on the ground.

---

## 1. Standard Architecture & Specifications

### 1.1 The 4 Standard Assets per Boss
Every boss comprises 4 core texture assets in `public/textures/bosses/`:

| Texture File | Action State | Layout | Frame Cell Size | Total Resolution |
| :--- | :--- | :--- | :--- | :--- |
| `boss_<name>_walk.png` | **WALK** (heavy stride, pursuit) | 4 cols $\times$ 4 rows (16 frames) | $160 \times 160$ px | **$640 \times 640$ px** |
| `boss_<name>_attack.png` | **ATTACK** (windup, crushing slam/strike) | 4 cols $\times$ 4 rows (16 frames) | $160 \times 160$ px | **$640 \times 640$ px** |
| `boss_<name>_idle.png` *(optional)* | **IDLE** (menacing breathing, rage aura) | 4 cols $\times$ 4 rows (16 frames) | $160 \times 160$ px | **$640 \times 640$ px** |
| `boss_<name>_front.png` | **PORTRAIT** (boss HP bar avatar, card icon) | 1 frame icon | $160 \times 160$ px | **$160 \times 160$ px** |

*Note:* The processing script also automatically exports directional fallbacks for all 4 directions: `boss_<name>_{front,back,left,right}.png`.

---

### 1.2 Core Visual Standards for Bosses

1. **Boss Proportions & Silhouette:**
   - Massive, imposing proportions (2.5 to 4 times larger than regular heroes).
   - Highly readable, heavy silhouette: demonic horns, spikes, heavy armor plating, claws, tails, or blazing wings.
   - Distinctive threat accent: glowing eyes (crimson `#EF4444`, infernal purple `#A855F7`, or blazing orange `#F97316`).

2. **Boss Height & Headroom Limits:**
   - Boss body height in frame: **up to 120–130 pixels** (`char_h = 120.0`, `max_h = 130.0`) inside the $160 \times 160$ cell.
   - Guarantees at least 25–30 pixels of overhead clearance for horns, crowns, raised claws, and rage effects.

3. **24px Bottom Margin & Ground Anchoring (`target_feet_y = 136`):**
   - The contact point where the boss's feet/paws touch the ground is anchored at **$y = 136$** (`target_feet_y = 136` in a 160px cell).
   - This leaves a clean **24px margin at the bottom** ($160 - 136 = 24$ px) so ground shockwaves, stomp craters, and dust bursts are never clipped by the sprite boundary.

4. **Natural Clean Alpha Edges (No Artificial 1px Black Border):**
   - Authentic pixel art antialiasing without harsh artificial 1px solid black bounding boxes.

---

### 1.3 Directional Row Mapping (Rows 0 to 3)
In Three.js UV coordinates, $V = 0$ is at the bottom and $V = 1$ is at the top.
Rows from top to bottom map to:

- **Row 0 (Top, $y \in [0, 160)$)**: **Front** — front-facing view (boss moving down towards player).
- **Row 1 ($y \in [160, 320)$)**: **Left** — left-facing view (boss moving left; mirrored from Row 2).
- **Row 2 ($y \in [320, 480)$)**: **Right** — right-facing view (boss moving right).
- **Row 3 (Bottom, $y \in [480, 640)$)**: **Back** — back-facing view (boss moving up away from camera).

```
+---------------+---------------+---------------+---------------+
| R0C0: Front 0 | R0C1: Front 1 | R0C2: Front 2 | R0C3: Front 3 | -> Row 0: Front
+---------------+---------------+---------------+---------------+
| R1C0: Left 0  | R1C1: Left 1  | R1C2: Left 2  | R1C3: Left 3  | -> Row 1: Left
+---------------+---------------+---------------+---------------+
| R2C0: Right 0 | R2C1: Right 1 | R2C2: Right 2 | R2C3: Right 3 | -> Row 2: Right
+---------------+---------------+---------------+---------------+
| R3C0: Back 0  | R3C1: Back 1  | R3C2: Back 2  | R3C3: Back 3  | -> Row 3: Back
+---------------+---------------+---------------+---------------+
```

---

### 1.4 Three.js Ground Anchoring Math for Bosses
For a Three.js plane geometry of size $5.2 \times 5.2$ units with contact point $y = 136$ in a 160px cell:

$$\text{anchorFactor} = \left(\frac{136}{160} - 0.5\right) = 0.85 - 0.5 = \mathbf{0.35}$$

$$\text{translation}_y = \text{height} \times 0.35 = 5.2 \times 0.35 = \mathbf{1.82}$$

With plane geometry translation $+1.82$ along the $Y$ axis:
- The boss's feet touch down exactly at ground level ($y = 0.000$) resting on the contact shadow `shadowMesh`.
- The 24px downward buffer extends into $y \in [-0.39, 0.000]$, rendering ground slams and shockwaves without gaps or clipping.

---

## 2. Boss Generation Artifact Prevention Rules

1. **Persistent Anatomy:**
   - Strictly defined limb and feature counts (e.g. exactly 2 curved horns, 2 clawed arms, 1 spiked tail). Disallow spontaneous extra limbs or disappearing tails during directional rotations.
2. **Direction Drift Prevention:**
   - Generative diffusion models frequently twist left profiles into semi-front views.
   - **Solution:** `--mirror-left` flag is enabled by default in `process_boss_sheets.py`. Row 2 (Right) is generated in a clean right profile and horizontally mirrored into Row 1 (Left), guaranteeing 100% matched cadence and zero directional drift.
3. **4-Frame Rhythmic Cycles:**
   - **WALK (4 frames):** Left foot forward $\to$ passing stance $\to$ right foot forward $\to$ passing stance.
   - **ATTACK (4 frames):** Anticipation windup $\to$ crushing slam with flash $\to$ impact crater shockwave $\to$ return to combat stance.

---

## 3. Master Generation Prompts (Example: Infernal Demon Boss)

### Master PORTRAIT Prompt (`boss_demon_front.png`)
```text
160x160 menacing pixel art boss portrait of Infernal Demon Overlord.
Gigantic demonic beast, sharp obsidian curved horns, glowing red volcanic eyes, molten magma cracks across blackened spiked plate chest, terrifying demonic maw, smoke rising from shoulders.
Pure solid white background rgb(255,255,255), clean 16-bit RPG boss icon.
```

### Master WALK Prompt (`boss_demon_walk.png`)
```text
2D pixel art boss sprite sheet of menacing Infernal Demon Overlord.
Massive demonic beast: curved obsidian horns, glowing red molten eyes, spiked volcanic armor, clawed hands, heavy demon hooves.
Grid layout: exactly 4 columns and 4 rows (16 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward towards player.
Row 1: STRICT 100% profile facing LEFT only for all 4 columns.
Row 2: STRICT 100% profile facing RIGHT only for all 4 columns.
Row 3: facing back / away from player.
Animation: WALK heavy stomping 4-frame cycle across 4 columns: heavy steps shaking the ground, tail swishing, magma veins glowing.
Characters anchored with 24px bottom margin inside each frame cell. Clean 16-bit pixel art.
```

### Master ATTACK Prompt (`boss_demon_attack.png`)
*(Provide Master Portrait & WALK in `ImagePaths`)*
```text
2D pixel art boss sprite sheet of the same Infernal Demon Overlord from reference images.
Identical boss design: obsidian horns, molten magma veins, spiked armor.
Grid layout: exactly 4 columns and 4 rows (16 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward towards player.
Row 1: STRICT 100% profile facing LEFT only for all 4 columns.
Row 2: STRICT 100% profile facing RIGHT only for all 4 columns.
Row 3: facing back / away from player.
Animation: ATTACK devastating 4-frame slam sequence across 4 columns:
Column 0: heavy anticipation windup raising massive volcanic claw;
Column 1: brutal ground smash with fiery red shockwave and volcanic sparks;
Column 2: impact crater follow-through;
Column 3: recovery return to combat stance.
Characters anchored with 24px bottom margin inside each frame cell. Clean 16-bit pixel art.
```

---

## 4. Automated Processing Script

Script `.agents/skills/boss-animation-pipeline/scripts/process_boss_sheets.py`:

```bash
python .agents/skills/boss-animation-pipeline/scripts/process_boss_sheets.py \
  --name "demon" \
  --walk "<path_to_walk>" \
  --attack "<path_to_attack>" \
  --portrait "<path_to_portrait>" \
  --out-dir "public/textures/bosses" \
  --cell-size 160 \
  --feet-y 136 \
  --char-h 120.0 \
  --max-h 130.0 \
  --mirror-left
```

---

## 5. Engine Integration Checklist

### Step 5.1: Dynamic UV Columns Detection in `Enemy.ts`
The game engine dynamically determines columns (supporting both the 4-frame standard and legacy 6-column sheets):

```typescript
private updateBossAnimation(dt: number) {
  if (!this.bossTextures) return;

  const tex = this.animState === 'ATTACK' ? this.bossTextures.attack : this.bossTextures.walk;
  const img = (tex as any).image as { width?: number; height?: number } | undefined;
  const cols = (img && img.width && img.height && img.height > 0)
    ? Math.round((img.width / img.height) * 4)
    : 4;

  let frameCol = 0;
  if (this.animState === 'ATTACK') {
    this.attackAnimTimer -= dt;
    const progress = Math.max(0, Math.min(0.999, 1 - (this.attackAnimTimer / 0.5)));
    frameCol = Math.floor(progress * cols);
    if (this.attackAnimTimer <= 0) {
      this.animState = 'WALK';
      this.bossAnimFrameTimer = 0;
    }
  } else {
    this.bossAnimFrameTimer += dt * 8; // 8 FPS walk rhythm
    frameCol = Math.floor(this.bossAnimFrameTimer) % cols;
  }

  tex.repeat.set(1 / cols, 1 / 4);
  tex.offset.set(frameCol / cols, (3 - row) / 4);
}
```

---

## 6. Verification Checklist

1. `python .agents/skills/boss-animation-pipeline/scripts/process_boss_sheets.py ...` -> Exit code 0.
2. Resolution verification:
   - Sprite sheets `boss_<name>_{walk,attack}.png`: $640 \times 640$ px (4 cols $\times$ 4 rows @ 160x160).
   - Portrait `boss_<name>_front.png`: $160 \times 160$ px.
3. `npm run typecheck` and `npm run build` — 0 errors.
