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
| `boss_<name>_walk.png` | **WALK** (тяжёлая поступь, преследование) | 4 cols $\times$ 4 rows (16 frames) | $160 \times 160$ px | **$640 \times 640$ px** |
| `boss_<name>_attack.png` | **ATTACK** (замах, сокрушительный удар/хлыст) | 4 cols $\times$ 4 rows (16 frames) | $160 \times 160$ px | **$640 \times 640$ px** |
| `boss_<name>_idle.png` *(опц.)* | **IDLE** (грозное дыхание, аура ярости) | 4 cols $\times$ 4 rows (16 frames) | $160 \times 160$ px | **$640 \times 640$ px** |
| `boss_<name>_front.png` | **PORTRAIT** (аватар полоски HP босса, иконка) | 1 frame icon | $160 \times 160$ px | **$160 \times 160$ px** |

*Примечание:* Скрипт также автоматически экспортирует статические фолбэки для 4 направлений: `boss_<name>_{front,back,left,right}.png`.

---

### 1.2 Core Visual Standards for Bosses

1. **Boss Proportions & Silhouette:**
   - Масштабные, внушительные пропорции (в 2.5–4 раза крупнее обычных героев).
   - Читаемый массивный силуэт: демонические рога, шипы, бронепластины, массивные когти, хвосты или пламенные крылья.
   - Опасный акцентный элемент: светящиеся глаза (багровые `#EF4444`, инфернально-пурпурные `#A855F7` или огненно-рыжие `#F97316`).

2. **Boss Height & Headroom Limits:**
   - Высота тела босса в кадре: **до 120–130 пикселей** (`char_h = 120.0`, `max_h = 130.0`) внутри ячейки $160 \times 160$.
   - Это гарантирует запас сверху не менее 25–30 пикселей для рогов, корон, поднятых лап и эффектов ярости.

3. **Отступ снизу 24px и заземление (`target_feet_y = 136`):**
   - Точка касания лап/ног с землёй зафиксирована на **$y = 136$** (`target_feet_y = 136` для ячейки 160px).
   - Это оставляет буфер **24 пикселя снизу** ($160 - 136 = 24$ px), чтобы волны сотрясения земли, удары когтей о камни и трещины не обрезались краем спрайта.

4. **Чистые альфа-края (No Artificial 1px Black Border):**
   - Натуральный пиксель-арт без грубых искусственных черных контуров в 1px.

---

### 1.3 Directional Row Mapping (Rows 0 to 3)
В UV-координатах Three.js $V = 0$ внизу, $V = 1$ вверху.
Строки сверху вниз:

- **Row 0 (Top, $y \in [0, 160)$)**: **Front** — вид спереди (босс движется вниз к игроку).
- **Row 1 ($y \in [160, 320)$)**: **Left** — вид слева (босс движется влево; отзеркаливается из Row 2).
- **Row 2 ($y \in [320, 480)$)**: **Right** — вид справа (босс движется вправо).
- **Row 3 (Bottom, $y \in [480, 640)$)**: **Back** — вид со спины (босс движется вверх).

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
Для плоскости Three.js размером $5.2 \times 5.2$ метра и точкой опоры $y = 136$ в ячейке 160px:

$$\text{anchorFactor} = \left(\frac{136}{160} - 0.5\right) = 0.85 - 0.5 = \mathbf{0.35}$$

$$\text{translation}_y = \text{height} \times 0.35 = 5.2 \times 0.35 = \mathbf{1.82}$$

При смещении плоскости на $+1.82$ по оси $Y$:
- Лапы босса стоят точно на уровне земли ($y = 0.000$) прямо на тени `shadowMesh`.
- Нижний буфер 24px распространяется под землю в диапазон $y \in [-0.39, 0.000]$, отображая трещины и пыль без зазоров и клиппинга.

---

## 2. Boss Generation Artifact Prevention Rules

1. **Анатомическая персистентность (Persistent Anatomy):**
   - У босса строго фиксированное число конечностей, рогов и хвостов (например, ровно 2 массивных рога, ровно 2 лапы с когтями, 1 шипастый хвост). Запрещено появление случайных лишних конечностей или исчезновение хвоста при поворотах.
2. **Предотвращение дрейфа сторон (Direction Drift):**
   - В диффузионных моделях профиль влево часто страдает от разворота морды в камеру.
   - **Решение:** В пайплайне по умолчанию активен флаг `--mirror-left`. Строка Row 2 (Right) генерируется в чистый правый профиль и автоматически отзеркаливается в Row 1 (Left). Это гарантирует 100% идентичный тайминг шагов и идеальный боковой профиль.
3. **4-кадровые ритмичные циклы:**
   - **WALK (4 кадра):** Шаг левой лапой $\to$ фаза прохождения $\to$ шаг правой лапой $\to$ фаза прохождения.
   - **ATTACK (4 кадра):** Замах/телеграф $\to$ сокрушительный удар со вспышкой $\to$ остаточный след/трещина $\to$ возврат в стойку.

---

## 3. Master Generation Prompts (Пример: Demon Boss)

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

Скрипт `.agents/skills/boss-animation-pipeline/scripts/process_boss_sheets.py`:

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
В движке босс автоматически определяет число колонок (поддерживая как новый 4-кадровый стандарт, так и легаси 6-кадровый):

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
2. Проверка разрешения:
   - Спрайтшиты `boss_<name>_{walk,attack}.png`: $640 \times 640$ px (4 cols $\times$ 4 rows @ 160x160).
   - Портрет `boss_<name>_front.png`: $160 \times 160$ px.
3. `npm run typecheck` и `npm run build` — 0 ошибок.
