---
name: monster-animation-pipeline
description: Standardized pipeline for creating, generating, extracting, aligning, mirroring, packaging, and integrating 4-frame animated regular monsters and enemies (2 states: WALK and ATTACK across 4 directional rows, 4 cols x 4 rows @ 128x128px per cell) in menacing 16-bit pixel art style (strictly NO anime/chibi/cute) with 10px bottom margin, 3rd frame attack hit registration, contact ground shadow, and ground anchoring into the game engine.
---

# Monster Animation Pipeline Skill

This skill defines the standardized master pipeline for creating, generating, processing, and integrating **4-frame animated monsters and regular enemies** into the game engine.

Standardizing on **2 core animation states (WALK and ATTACK)** and **1 portrait avatar image**, using a unified **4 columns $\times$ 4 rows (16 frames)** grid with **$128 \times 128$ pixel cells** (clean Power-of-Two **$512 \times 512$ px** texture), **compact aggressive monster proportions** (menacing beasts, ferocious vermin, undead), a **10px bottom margin** for claw/bite clearance, strict **quadruped & insect anatomical consistency rules**, **contact ground shadows**, and **ground anchoring** so monsters walk, creep, and lunge realistically on the ground plane.

---

## 1. Standard Architecture & Specifications

### 1.1 The 3 Standard Assets per Monster (2 States + Portrait)
Monsters strictly utilize **2 animation states: WALK and ATTACK**. An IDLE state is not needed. The **PORTRAIT** is automatically extracted from the 1st frame (Row 0, Col 0 - Front view) via the python script:

| Texture File | Action State | Layout | Frame Cell Size | Total Resolution |
| :--- | :--- | :--- | :--- | :--- |
| `monster_<name>_walk.png` | **WALK** (run, creeping stalk, pack sprint) | 4 cols $\times$ 4 rows (16 frames) | $128 \times 128$ px | **$512 \times 512$ px** |
| `monster_<name>_attack.png` | **ATTACK** (bite, claw strike, sting) | 4 cols $\times$ 4 rows (16 frames) | $128 \times 128$ px | **$512 \times 512$ px** |
| `monster_<name>_front.png` | **PORTRAIT** (avatar, bestiary icon from 1st frame) | 1 frame icon | $128 \times 128$ px | **$128 \times 128$ px** |

*Note:* `process_monster_sheets.py` also automatically extracts static directional fallbacks for all 4 directions: `monster_<name>_{front,back,left,right}.png`.

---

### 1.2 Core Visual Standards for Monsters

1. **Compact Aggressive Monster Proportions & Threat Demeanor:**
   - High readability in top-down / 2.5D isometric view.
   - Expressive predatory eyes/snout, compact muscular torso, clearly silhouetted paws, pincers, spines, or tails.
   - **Strict Exclusions:** Monsters are dangerous predators, beasts, and undead — **STRICTLY NO anime, NO chibi proportions, NO kawaii, NO cute/friendly expressions, NO cartoon pet look**.
   - Clean 16-bit pixel art style with hard pixel edges, limited color palette, and high contrast.

2. **Monster Height Limit:**
   - Monster height **must not exceed 96 pixels** (`height <= 96px`) inside the $128 \times 128$ cell.
   - Guarantees at least 22 pixels of overhead headroom for spines, ears, horns, and leaping animations.

3. **10px Bottom Margin & Ground Anchoring (`target_feet_y = 118`):**
   - The contact point where the monster's paws or belly meet the ground is anchored at **$y = 118$** (`target_feet_y = 118` in a 128px cell).
   - Leaves a clean **10px margin at the bottom** ($128 - 118 = 10$ px), preventing claws, stingers, and paws from clipping against the frame edge.

4. **Natural Clean Alpha Edges (No Artificial 1px Black Border):**
   - Natural pixel art antialiasing without thick artificial 1px black borders.

5. **Dynamic 2D Sprite Projected Shadows (No Artificial Ellipse):**
   - The basic ellipse/circle contact shadow mesh under entities has been eliminated.
   - Monsters now cast true dynamic 2D directional silhouette shadows onto the ground plane using `this.spriteMesh.castShadow = true` and `customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: ..., alphaTest: 0.25 })`, matching the hero player.
   - The shadow silhouette automatically animates in sync with the sprite's active animation state and directional row.

---

### 1.3 Directional Row Mapping (Rows 0 to 3)
In Three.js UV coordinates:

- **Row 0 (Top, $y \in [0, 128)$)**: **Front** — front-facing view (snout/face facing player).
- **Row 1 ($y \in [128, 256)$)**: **Left** — left-facing view (moving left; mirrored from Row 2).
- **Row 2 ($y \in [256, 384)$)**: **Right** — right-facing view (moving right).
- **Row 3 (Bottom, $y \in [384, 512)$)**: **Back** — back-facing view (moving up away from camera).

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

### 1.4 Three.js Ground Anchoring Math for Monsters
For a Three.js plane geometry of size $2.2 \times 2.2$ units with contact point $y = 118$ in a 128px cell:

$$\text{translation}_y = \left(\frac{118}{128} - 0.5\right) \times \text{world\_size} = (0.921875 - 0.5) \times 2.2 = 0.421875 \times 2.2 = \mathbf{0.9281}$$

With plane geometry translation $+0.928$ along the $Y$ axis:
- The monster's paws rest directly on ground level $y = 0.000$ on top of `shadowMesh`.
- The 10px buffer prevents any visual floating or ground clipping.

---

## 2. Monster Generation Artifact Prevention Rules

1. **Anatomical Stability (Limb & Feature Count):**
   - Quadrupeds (coyote, bison): exactly 4 paws, 1 tail, 2 ears. No phantom limbs or disappearing tails.
   - Arthropods (scorpion, crawler): exactly 2 pincers, 1 segmented tail with stinger.
   - Humanoids / Undead (skeleton, brute): exactly 2 arms, 2 legs, 1 weapon/club.
2. **Direction Drift Prevention:**
   - Diffusion models often turn left profiles towards the viewer.
   - **Solution:** The `--mirror-left` flag in `process_monster_sheets.py` takes Row 2 (Right) and mirrors it horizontally into Row 1 (Left), ensuring 100% stable profile symmetry without cadence flips.
3. **4-Frame Rhythmic Cycles & 3rd Frame Hit Registration:**
   - **WALK (4 frames):**
     * Column 0: Front-left and back-right paws step forward
     * Column 1: Neutral passing stance (paws grounded)
     * Column 2: Front-right and back-left paws step forward
     * Column 3: Neutral passing stance
   - **ATTACK (4 frames over 0.5s duration):**
     * Column 0 (Frame 1): Crouch / tension windup (anticipation)
     * Column 1 (Frame 2): Forward lunge with bite/claw strike (strike launch)
     * Column 2 (Frame 3): **STRIKE IMPACT! Hit damage against player is registered strictly on this 3rd frame** (`frameCol === 2`).
     * Column 3 (Frame 4): Recovery back to trot stance (recovery)

---

## 3. Monster Concept Sheet & Human Approval Protocol (Phase 0 Approval Gate)

To prevent monster anatomical drift and ensure visual satisfaction before generating multi-frame animation sheets, all monster creation follows a mandatory human approval workflow:

### Step 3.1: Monster Concept Sheet Generation (`monster_<name>_concept.png`)
Generate a single composite **Monster Concept Sheet** featuring 3 distinct sections on pure solid white background `rgb(255,255,255)`:
1. **Left section (Bestiary Portrait / Snout View):** Close-up 128x128 menacing monster icon (sharp predatory eyes, bared fangs, horns, antennae, threat snarl).
2. **Center section (Full-Body Monster Sprite):** Full-body compact aggressive beast/vermin/undead sprite in front combat stance (height $\le 96$ px, 10px bottom margin, predatory posture, paws/claws/carapace).
3. **Right section (Signature Attack Feature / Threat Detail):** Standalone close-up detail of the monster's primary weapon or natural attack feature (e.g. venomous stinger, crushing pincers, gnashing jaw, barbed spikes).

#### Master Concept Sheet Prompt (Example: Prairie Coyote)
```text
Monster concept reference sheet of Prairie Coyote, a vicious and deadly desert predator beast.

Three clear distinct sections on pure solid white background rgb(255,255,255):
1. Left section: close-up 128x128 menacing monster portrait icon, snarling aggressive muzzle, sharp bared white fangs, glowing amber eyes, alert pointed ears, no cute or friendly expression.
2. Center section: full-body compact aggressive beast sprite in front combat stance, muscular canine frame, sturdy paws, spiky sandy-brown fur, bushy tail, exactly 4 legs and 1 tail.
3. Right section: isolated detailed display of open snapping predator jaws and sharp white canine teeth.

Clean 16-bit pixel art game assets, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, clear readable silhouette.
Dark fantasy RPG monster design, vicious and dangerous wilderness beast.

No anime style, no chibi proportions, no kawaii style, no cute expression, no cartoon pet look, no childish appearance, no soft pastel colors, no friendly face, no photorealism, no smooth gradients.
```

### Step 3.2: Human Approval Gateway (`ask_question` Interactive Check)
The agent MUST display `monster_<name>_concept.png` in chat and request developer approval via `ask_question`:
- **Question:** *"Сгенерирован концепт-лист монстра (портрет, силуэт в полный рост, боевые детали). Подойдёт ли такой дизайн или нужны правки?"*
- **Options:**
  - `(Recommended) Утвердить концепт (перейти к генерации листов анимаций WALK и ATTACK)`
  - `Внести правки в монстра (указать, что изменить: окрас, форму рогов/клешней, свирепость, детали)`
- **Iteration Loop:** If the developer requests adjustments, the agent modifies the prompt tokens, regenerates `monster_<name>_concept.png`, and asks again.
- **NEVER generate animation sheets before the monster concept is approved by the human developer.**

### Step 3.3: Reference Image Conditioning (`ImagePaths: [concept_path]`)
When generating `monster_<name>_walk.png` and `monster_<name>_attack.png`, **always pass the approved concept image** via `ImagePaths` in `generate_image`.

---

## 4. Master Generation Prompts (Monster Examples)

### Example 1: Prairie Coyote (`monster_coyote`)

#### Master PORTRAIT Prompt (`monster_coyote_front.png`)
```text
128x128 menacing pixel art monster portrait of Prairie Coyote, a vicious and deadly desert predator.

Compact aggressive beast proportions, muscular canine frame, sturdy paws, predatory stance, strong readable silhouette.

Snarling aggressive expression, sharp glowing amber eyes, bared white fangs, alert pointed ears, no friendly or cute expression.

Sandy brown fur with dusty grey undertones, coarse spiky coat texture, bushy tail.

Pure solid white background rgb(255,255,255), clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast, chunky simplified forms, clear readable silhouette.

Dark fantasy RPG monster design, vicious and dangerous wilderness beast.

No anime style, no chibi proportions, no kawaii style, no cute expression, no cartoon pet look, no childish appearance, no soft pastel colors, no friendly face, no photorealism, no smooth gradients.
```

#### Master WALK Prompt (`monster_coyote_walk.png`)
```text
2D pixel art monster sprite sheet of Prairie Coyote, a vicious desert predator beast.

Compact aggressive beast proportions, muscular canine frame, sturdy paws, bushy tail, alert pointed ears, amber predatory eyes, sharp fangs. Exactly 4 legs, 1 tail. No extra limbs.

Grid layout: exactly 4 columns and 4 rows (16 frames total).
Pure solid white background rgb(255,255,255) without grid lines.

Row 0: facing front / forward towards player.
Row 1: STRICT 100% profile facing LEFT only for all 4 columns.
Row 2: STRICT 100% profile facing RIGHT only for all 4 columns.
Row 3: facing back / away from player.

Animation: WALK rhythmic 4-frame running trot cycle across 4 columns:
Column 0: front-left and rear-right paws reach forward;
Column 1: paws meet ground in passing stance;
Column 2: front-right and rear-left paws reach forward;
Column 3: paws meet ground in passing stance.

Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast.

Dark fantasy RPG monster design, vicious and dangerous wilderness beast.

No anime style, no chibi proportions, no kawaii style, no cute expression, no cartoon pet look, no childish appearance, no soft pastel colors, no friendly face, no photorealism, no smooth gradients.
```

#### Master ATTACK Prompt (`monster_coyote_attack.png`)
```text
2D pixel art monster sprite sheet of the same vicious Prairie Coyote from reference images.

Identical monster design: compact muscular canine frame, sandy brown fur, amber predatory eyes, sharp bared fangs. Exactly 4 legs, 1 tail.

Grid layout: exactly 4 columns and 4 rows (16 frames total).
Pure solid white background rgb(255,255,255) without grid lines.

Row 0: facing front / forward towards player.
Row 1: STRICT 100% profile facing LEFT only for all 4 columns.
Row 2: STRICT 100% profile facing RIGHT only for all 4 columns.
Row 3: facing back / away from player.

Animation: ATTACK 4-frame bite lunge across 4 columns:
Column 0: crouching anticipation coil;
Column 1: forward lunging bite snap with open jaws;
Column 2: bite clamp impact (damage hit frame);
Column 3: landing back into trot stance.

Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast.

Dark fantasy RPG monster design, vicious and dangerous wilderness beast.

No anime style, no chibi proportions, no kawaii style, no cute expression, no cartoon pet look, no childish appearance, no soft pastel colors, no friendly face, no photorealism, no smooth gradients.
```

---

### Example 2: Desert Scorpion (`monster_scorpion`)

#### Master WALK Prompt (`monster_scorpion_walk.png`)
```text
2D pixel art monster sprite sheet of Desert Scorpion, a deadly venomous arachnid creature.

Compact aggressive creature proportions: chitinous red-brown carapace, 2 large front pincers, raised segmented tail with venomous glowing green stinger. Exactly 2 pincers, 8 legs, and 1 tail. No extra limbs.

Grid layout: exactly 4 columns and 4 rows (16 frames total).
Pure solid white background rgb(255,255,255) without grid lines.

Row 0: facing front / forward towards player.
Row 1: STRICT 100% profile facing LEFT only for all 4 columns.
Row 2: STRICT 100% profile facing RIGHT only for all 4 columns.
Row 3: facing back / away from player.

Animation: WALK scuttling 4-frame cycle across 4 columns: alternating legs scuttle, pincers snapping aggressively, tail arched ready to strike.

Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit pixel art game sprite, crisp hard pixel edges, limited color palette, strong contrast.

Dark fantasy RPG monster design, vicious and dangerous arachnid beast.

No anime style, no chibi proportions, no kawaii style, no cute expression, no cartoon bug look, no childish appearance, no soft pastel colors, no friendly appearance, no photorealism, no smooth gradients.
```

---

## 5. Automated Processing Script

Script `.agents/skills/monster-animation-pipeline/scripts/process_monster_sheets.py`:

```bash
python .agents/skills/monster-animation-pipeline/scripts/process_monster_sheets.py \
  --name "coyote" \
  --walk "<path_to_walk>" \
  --attack "<path_to_attack>" \
  --portrait "<path_to_portrait>" \
  --out-dir "public/textures/monsters" \
  --cell-size 128 \
  --feet-y 118 \
  --char-h 92.0 \
  --max-h 96.0 \
  --mirror-left
```

---

## 6. Engine Integration Checklist

### Step 6.1: 2-State Animation & 3rd Frame Hit Registration in `Enemy.ts`
When an animated monster attacks, the engine cycles 4 frames over 0.5s and registers damage strictly on the 3rd frame (`frameCol === 2`):

```typescript
// Authoritative simulation in Enemy.updateSimulation
if (this.animState === 'ATTACK') {
  this.attackAnimTimer -= dt;
  const progress = Math.max(0, Math.min(0.999, 1 - (this.attackAnimTimer / this.attackDuration)));
  const frameCol = Math.floor(progress * 4);

  // Damage is registered strictly on the 3rd frame (index 2)
  if (frameCol === 2 && !this.hasDealtDamageThisAttack) {
    this.hasDealtDamageThisAttack = true;
    this.pendingAttackHit = true;
  }

  if (this.attackAnimTimer <= 0) {
    this.animState = 'WALK';
    this.attackAnimTimer = 0;
  }
}
```

### Step 6.2: Dynamic 2D Sprite Projected Shadow Integration
Monsters cast a realistic directional silhouette shadow onto the terrain matching the player:

```typescript
this.customDepthMaterial = new MeshDepthMaterial({
  depthPacking: RGBADepthPacking,
  map: this.spriteMaterial.map,
  alphaTest: 0.25
});
this.spriteMesh.customDepthMaterial = this.customDepthMaterial;
this.spriteMesh.castShadow = true;
```

---

## 7. Verification Checklist

1. `python .agents/skills/monster-animation-pipeline/scripts/process_monster_sheets.py ...` -> Exit code 0.
2. Resolution verification:
   - Sprite sheets `monster_<name>_{walk,attack}.png`: $512 \times 512$ px (4 cols $\times$ 4 rows @ 128x128).
   - Portrait `monster_<name>_front.png`: $128 \times 128$ px.
3. `npm run typecheck` and `npm run build` — 0 errors.
