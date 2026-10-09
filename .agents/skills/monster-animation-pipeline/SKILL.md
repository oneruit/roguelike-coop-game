---
name: monster-animation-pipeline
description: Standardized pipeline for creating, generating, extracting, aligning, mirroring, packaging, and integrating 4-frame animated regular monsters and enemies (WALK, ATTACK, IDLE across 4 directional rows, 4 cols x 4 rows @ 128x128px per cell) in chibi/pixel art style with 10px bottom margin and ground anchoring into the game engine.
---

# Monster Animation Pipeline Skill

This skill defines the standardized master pipeline for creating, generating, processing, and integrating **4-frame animated monsters and regular enemies** into the game engine.

Standardizing on **separate animation images** (one per action state) and **1 portrait avatar image**, using a unified **4 columns $\times$ 4 rows (16 frames)** grid with **$128 \times 128$ pixel cells** (clean Power-of-Two **$512 \times 512$ px** texture), **chibi pixel art proportions**, a **10px bottom margin** for claw/bite clearance, strict **quadruped & insect anatomical consistency rules**, and **ground anchoring** so monsters walk, creep, and lunge realistically on the ground plane.

---

## 1. Standard Architecture & Specifications

### 1.1 The 4 Standard Assets per Monster
Every animated monster comprises 4 core texture assets in `public/textures/monsters/`:

| Texture File | Action State | Layout | Frame Cell Size | Total Resolution |
| :--- | :--- | :--- | :--- | :--- |
| `monster_<name>_walk.png` | **WALK** (бег, крадущийся шаг, бег стаи) | 4 cols $\times$ 4 rows (16 frames) | $128 \times 128$ px | **$512 \times 512$ px** |
| `monster_<name>_attack.png` *(опц.)* | **ATTACK** (укус, выпад когтями, жало) | 4 cols $\times$ 4 rows (16 frames) | $128 \times 128$ px | **$512 \times 512$ px** |
| `monster_<name>_idle.png` *(опц.)* | **IDLE** (рычание, дыхание, шевеление) | 4 cols $\times$ 4 rows (16 frames) | $128 \times 128$ px | **$512 \times 512$ px** |
| `monster_<name>_front.png` | **PORTRAIT** (аватар, карточка бестиария) | 1 frame icon | $128 \times 128$ px | **$128 \times 128$ px** |

*Примечание:* Скрипт также автоматически генерирует статические фолбэки для 4 направлений: `monster_<name>_{front,back,left,right}.png`.

---

### 1.2 Core Visual Standards for Monsters

1. **Chibi / Compact Pixel Art Proportions:**
   - Высокая читаемость при виде сверху (top-down / 2.5D isometric view).
   - Выразительные глаза/морда, плотное тело, ясные очертания лап, клешней или хвостов.
   - Стилистика едина со стилем героев (16-bit чиби-стиль).

2. **Monster Height Limit:**
   - Высота монстра **не должна превышать 96 пикселей** (`height <= 96px`) внутри ячейки $128 \times 128$.
   - Запас сверху не менее 22 пикселей для шипов, ушей, рогов и анимаций прыжка.

3. **10px Bottom Margin & Grounding (`Отступ 10px снизу`):**
   - Лапы/брюшко монстра зафиксированы на **$y = 118$** (`target_feet_y = 118` в ячейке 128px).
   - Оставляет чистый **буфер 10px снизу** ($128 - 118 = 10$ px), исключая обрезку когтей, жала и лап при движении.

4. **Чистые альфа-края (No Artificial 1px Black Border):**
   - Натуральный пиксель-арт без искусственных толстых 1px черных рамок.

---

### 1.3 Directional Row Mapping (Rows 0 to 3)
В UV-координатах Three.js:

- **Row 0 (Top, $y \in [0, 128)$)**: **Front** — вид спереди (морда смотрит на игрока).
- **Row 1 ($y \in [128, 256)$)**: **Left** — вид слева (движение влево; отзеркаливается из Row 2).
- **Row 2 ($y \in [256, 384)$)**: **Right** — вид справа (движение вправо).
- **Row 3 (Bottom, $y \in [384, 512)$)**: **Back** — вид со спины (движение вверх от камеры).

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
Для плоскости Three.js размером $2.2 \times 2.2$ метра и точкой опоры $y = 118$ в ячейке 128px:

$$\text{translation}_y = \left(\frac{118}{128} - 0.5\right) \times \text{world\_size} = (0.921875 - 0.5) \times 2.2 = 0.421875 \times 2.2 = \mathbf{0.9281}$$

При смещении плоскости на $+0.928$ по оси $Y$:
- Лапы монстра стоят ровно на плоскости $y = 0.000$ на контактной тени `shadowMesh`.
- Нижний буфер 10px предотвращает эффект «парения» или обрезания земли.

---

## 2. Monster Generation Artifact Prevention Rules

1. **Анатомическая стабильность (Limb & Feature Count):**
   - Четвероногие (койот, бизон): ровно 4 лапы, 1 хвост, 2 уха. Запрещены лишние ноги-фантомы или исчезающие хвосты.
   - Членистоногие (скорпион, краулер): ровно 2 клешни, 1 сегментированный хвост с жалом.
   - Гуманоиды/нежить (скелет, громила): ровно 2 руки, 2 ноги, 1 оружие/дубина.
2. **Предотвращение дрейфа сторон (Direction Drift):**
   - Диффузионные модели часто рисуют боковой профиль влево с поворотом морды к зрителю.
   - **Решение:** Флаг `--mirror-left` в `process_monster_sheets.py` берет строку Row 2 (Right) и отзеркаливает по горизонтали в Row 1 (Left), обеспечивая 100% стабильный профиль без флипов.
3. **4-кадровые ритмичные циклы:**
   - **WALK (4 кадра):**
     * Колонка 0: Шаг левой лапой/ногой вперед
     * Колонка 1: Нейтральная фаза прохождения (все лапы касаются земли)
     * Колонка 2: Шаг правой лапой/ногой вперед
     * Колонка 3: Нейтральная фаза прохождения
   - **ATTACK (4 кадра):**
     * Колонка 0: Замах / сжатие для прыжка (anticipation)
     * Колонка 1: Рывок вперед с укусом/ударом клешней (strike)
     * Колонка 2: Завершение выпада / контакт (impact)
     * Колонка 3: Возврат в исходную позицию (recovery)

---

## 3. Master Generation Prompts (Примеры Монстров)

### Пример 1: Койот / Степной Волк (`monster_coyote`)

#### Master PORTRAIT Prompt (`monster_coyote_front.png`)
```text
128x128 chibi pixel art monster portrait of Prairie Coyote.
Fierce cute desert coyote beast, sandy brown fur, pointed alert ears, amber glowing eyes, sharp white fangs.
Pure solid white background rgb(255,255,255), clean 16-bit RPG monster icon.
```

#### Master WALK Prompt (`monster_coyote_walk.png`)
```text
2D chibi pixel art monster sprite sheet of Prairie Coyote.
Quadruped canine beast: sandy brown fur, bushy tail, alert pointed ears, amber eyes. Exactly 4 legs, 1 tail. No extra limbs.
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
Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit pixel art.
```

#### Master ATTACK Prompt (`monster_coyote_attack.png`)
```text
2D chibi pixel art monster sprite sheet of the same Prairie Coyote from reference images.
Quadruped canine: sandy brown fur, amber eyes, sharp fangs.
Grid layout: exactly 4 columns and 4 rows (16 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward towards player.
Row 1: STRICT 100% profile facing LEFT only for all 4 columns.
Row 2: STRICT 100% profile facing RIGHT only for all 4 columns.
Row 3: facing back / away from player.
Animation: ATTACK 4-frame bite lunge across 4 columns:
Column 0: crouching anticipation coil;
Column 1: forward lunging bite snap with open jaws;
Column 2: bite clamp impact;
Column 3: landing back into trot stance.
Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit pixel art.
```

---

### Пример 2: Пустынный Скорпион (`monster_scorpion`)

#### Master WALK Prompt (`monster_scorpion_walk.png`)
```text
2D chibi pixel art monster sprite sheet of Desert Scorpion.
Arachnid monster: chitinous red-brown carapace, 2 large front pincers, raised segmented tail with venomous glowing green stinger. Exactly 2 pincers and 1 tail.
Grid layout: exactly 4 columns and 4 rows (16 frames total).
Pure solid white background rgb(255,255,255) without grid lines.
Row 0: facing front / forward towards player.
Row 1: STRICT 100% profile facing LEFT only for all 4 columns.
Row 2: STRICT 100% profile facing RIGHT only for all 4 columns.
Row 3: facing back / away from player.
Animation: WALK scuttling 4-frame cycle across 4 columns: alternating legs scuttle, pincers snapping gently, tail arching.
Characters anchored with 10px bottom margin inside each frame cell. Clean 16-bit pixel art.
```

---

## 4. Automated Processing Script

Скрипт `.agents/skills/monster-animation-pipeline/scripts/process_monster_sheets.py`:

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

## 5. Engine Integration Checklist

### Step 5.1: Dynamic UV Columns Detection in `Enemy.ts`
При рендеринге анимированного монстра движок определяет `cols` динамически:

```typescript
const tex = this.monsterTextures.walk;
const img = (tex as any).image as { width?: number; height?: number } | undefined;
const cols = (img && img.width && img.height && img.height > 0)
  ? Math.round((img.width / img.height) * 4)
  : 4;

tex.repeat.set(1 / cols, 1 / 4);
tex.offset.set(frameCol / cols, (3 - row) / 4);
```

---

## 6. Verification Checklist

1. `python .agents/skills/monster-animation-pipeline/scripts/process_monster_sheets.py ...` -> Exit code 0.
2. Проверка разрешения:
   - Спрайтшиты `monster_<name>_{walk,attack}.png`: $512 \times 512$ px (4 cols $\times$ 4 rows @ 128x128).
   - Портрет `monster_<name>_front.png`: $128 \times 128$ px.
3. `npm run typecheck` и `npm run build` — 0 ошибок.
