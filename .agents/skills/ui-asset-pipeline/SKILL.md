---
name: ui-asset-pipeline
description: Standardized pipeline for creating, generating, styling, slicing, and integrating 16-bit stylized dark fantasy UI assets (windows, 9-slice frames, buttons, health bars, inventory slots, ribbons) into the HTML/CSS game interface with mandatory human approval.
---

# UI Asset Pipeline Skill

This skill defines the standardized master pipeline for creating, generating, processing, and integrating **16-bit stylized dark fantasy UI assets** into the game engine's HTML/CSS interface.

---

## 1. Architectural Philosophy: The Hybrid HTML/CSS + Raster Asset Standard

In modern web game development (*Loop Hero, Vampire Survivors, Dead Cells, Hearthstone*), the most scalable and responsive UI architecture combines **HTML/CSS semantic layouts** with **pixel-art raster texture assets**:

1. **HTML & DOM:** Provides responsive layout (flexbox, grid, absolute overlays), click/tap event handling, accessibility, and dynamic text localization without rasterizing text.
2. **16-Bit Raster Textures:** Supplies tactile game feel through weathered wood, forged iron, gold filigree, rivets, textured parchment, and glowing magic gems.
3. **Pixel-Perfect Rendering:** All raster UI elements strictly declare `image-rendering: pixelated;` in CSS to preserve razor-sharp pixel edges at any display scaling or DPR (Device Pixel Ratio).

---

## 2. Visual Style Guidelines (Dark Fantasy RPG)

All UI elements must harmonize with the game's battle-ready heroes and menacing monsters:

* **Primary Materials:**
  - **Weathered Dark Oak Wood:** Rich brown tones (`#2D1F17`, `#4A3525`) for panel backing and hanging plaques.
  - **Forged Dark Iron & Steel:** Heavy metallic grey borders (`#1F2421`, `#374151`) with visible rivets and chisel marks.
  - **Antique Gold & Brass Filigree:** Ornate corner brackets, crowns, and borders (`#D97706`, `#F59E0B`, `#FDE68A`).
  - **Aged Parchment:** Warm cream paper texture (`#FEF3C7`, `#FDE68A`) for quest logs, maps, and stat readouts.
  - **Arcane Gemstones:** Saturated glowing jewel accents (Ruby red `#EF4444`, Sapphire blue `#3B82F6`, Emerald green `#10B981`, Amethyst purple `#8B5CF6`).
* **Strict Exclusions:**
  - **STRICTLY NO anime or kawaii style**, NO modern flat minimal mobile UI, NO smooth vector glassmorphism, NO blurry gradients, NO rounded iOS corners.
  - Crisp, hard 16-bit pixel edges, limited color palette, strong shadow/highlight contrast.

---

## 3. Core UI Component Specifications

### 3.1 9-Slice Scalable Frames (`border-image`)
Used for modal dialogs, quest cards, setting windows, and tooltips that must scale dynamically without stretching corner details.

* **Asset Dimensions:** Typically $48 \times 48$ px or $64 \times 64$ px.
* **Slice Margins:** 16px corner slice (16px top, right, bottom, left).
* **CSS Pattern:**
  ```css
  .ui-panel-frame {
    border-style: solid;
    border-width: 16px;
    border-image-source: url('/textures/ui/frame_stone_gold.png');
    border-image-slice: 16 fill;
    border-image-repeat: stretch;
    image-rendering: pixelated;
    box-sizing: border-box;
    filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.8));
  }
  ```

### 3.2 Interactive Buttons (4-State Spritesheets)
Action buttons (Play, Reroll, Upgrade, Close) require a spritesheet with 4 vertical or horizontal states:

1. **Default (Normal):** Base illuminated state.
2. **Hover:** Brightened gold rim, subtle glow accent.
3. **Pressed / Active:** Depressed state with 1–2px inward shadow offset, indicating tactile click.
4. **Disabled:** Darkened greyed-out iron state.

* **Standard Button Cell Size:** $120 \times 36$ px (total vertical sheet: $120 \times 144$ px).
* **CSS Pattern:**
  ```css
  .ui-btn-action {
    width: 120px;
    height: 36px;
    background: url('/textures/ui/btn_action_strip.png') 0 0 no-repeat;
    image-rendering: pixelated;
    border: none;
    cursor: pointer;
  }
  .ui-btn-action:hover {
    background-position: 0 -36px;
  }
  .ui-btn-action:active {
    background-position: 0 -72px;
  }
  .ui-btn-action:disabled {
    background-position: 0 -108px;
    cursor: not-allowed;
  }
  ```

### 3.3 Stat & Vitals Bars (HP, Mana, XP)
Consists of two layered assets:
1. **Frame Overlay (Top Layer):** Ornate metallic frame with dragon or lion head ends, jewel corners, and transparent center window.
2. **Textured Fill Bar (Under Layer):** Pixelated liquid texture (crimson blood for HP, cobalt blue for Mana, emerald green for XP) scaled via `width: X%`.

### 3.4 Equipment & Ability Slots ($64 \times 64$ px)
Chunky beveled sockets for active weapons, passive items, and battle pass rewards:
* $64 \times 64$ px cell size with deep inner shadow bevel.
* Border rarity variants:
  - **Common:** Dark forged iron.
  - **Uncommon:** Polished steel with bronze corners.
  - **Rare:** Sapphire blue filigree with glowing corners.
  - **Epic:** Arcane purple runes.
  - **Legendary:** Molten gold with radiant fiery corners.

### 3.5 Plaques, Ribbons & Header Banners
Hanging wooden plaques with iron chains or royal crimson banners positioned at the top of windows to display titles (`VICTORY`, `LEVEL UP`, `QUEST BOOK`, `SETTINGS`).

---

## 4. Mandatory Approval Gateway (Rule: `image-generation-approval.md`)

Whenever generating UI textures, agents **MUST** strictly follow the project approval rule:

1. Generate the UI mockup or sprite sheet asset (`generate_image`).
2. Display the generated image in chat.
3. Call `ask_question` with 3 options:
   - `[1] (Recommended) Утвердить (продолжить работу / внедрить в игру)`
   - `[2] Внести изменения (указать, что доработать или перегенерировать)`
   - `[3] Не делать ничего / Отменить задачу (остановить генерацию)`
4. **NEVER edit CSS or import assets until the user confirms with Option 1.**

---

## 5. Master Generation Prompts Library

### Prompt 1: 9-Slice Dark Fantasy Window Frame (`frame_wood_gold.png`)
```text
64x64 pixel art 9-slice UI window frame template on pure solid white background rgb(255,255,255).
Clean dark fantasy RPG modal frame: ornate antique gold corner brackets with rivet bolts, dark weathered oak wooden borders, dark stone inner background fill.
Perfect symmetrical 9-slice layout with distinct 16px corner regions and repeatable 32px edge segments.
Clean 16-bit pixel art game UI sprite, crisp hard pixel edges, limited color palette, strong contrast, no smooth gradients, no blur, no drop shadow.
```

### Prompt 2: Action Button Spritesheet (`btn_rpg_action.png`)
```text
120x144 vertical pixel art UI button spritesheet containing exactly 4 stacked states (each 120x36 px) on pure solid white background rgb(255,255,255):
State 1 (Top, 0-36px): Normal default button, carved weathered wood plaque with polished bronze border and corner iron rivets.
State 2 (36-72px): Hover state, glowing golden border highlight and subtle interior amber warmth.
State 3 (72-108px): Pressed active state, depressed 2px downward shadow bevel, inset darker bevel.
State 4 (Bottom, 108-144px): Disabled state, tarnished dark iron plate with cracked wood, muted monochrome grey.
Clean 16-bit pixel art game UI, crisp hard pixel edges, limited color palette, strong contrast, no anime, no smooth gradients.
```

### Prompt 3: Ornate Health & Mana Bar HUD Frame (`hud_vitals_frame.png`)
```text
256x64 pixel art dark fantasy RPG health and mana bar HUD frame on pure solid white background rgb(255,255,255).
Carved dark stone dual-meter frame with polished brass trims, ornate lion head crest in the center, left meter window for red health bar, right meter window for blue mana bar, transparent interior meter cavities.
Clean 16-bit pixel art game asset, crisp hard pixel edges, limited color palette, strong contrast, chunky metallic bevels.
No anime, no modern flat vector, no photorealism, no smooth gradients.
```

### Prompt 4: $64 \times 64$ Ability & Item Slot Matrix (`ui_slot_matrix.png`)
```text
256x64 horizontal pixel art UI item slot sprite row containing 4 distinct 64x64 sockets on pure solid white background rgb(255,255,255):
Slot 1: Common dark iron recessed inventory socket with corner bolts and deep inner bevel.
Slot 2: Rare sapphire blue glowing rune border socket.
Slot 3: Epic deep purple arcane crystal border socket.
Slot 4: Legendary radiant golden filigree socket with glowing amber corner gems.
Clean 16-bit pixel art game UI, crisp hard pixel edges, limited color palette, strong contrast, no smooth gradients.
```

### Prompt 5: Complete Dark Fantasy UI Concept Mockup
```text
Complete 16-bit dark fantasy RPG game user interface mockup and concept sheet on solid pure white background rgb(255,255,255).
Showing modular game UI components arranged neatly:
1. Top: ornate carved oak and gold hanging header plaque reading 'VICTORY' with iron chains.
2. Center: scalable dark fantasy quest modal window with 9-slice gold filigree corners and dark parchment interior.
3. Bottom-left: ornate carved stone health and mana bar with ruby and sapphire gems.
4. Bottom-right: row of four 64x64 item ability slots (iron, bronze, purple, gold) and a set of 3-state action buttons.
Clean 16-bit pixel art game UI sprites, crisp hard pixel edges, limited color palette, strong shadow contrast, chunky simplified forms.
Heroic dark fantasy game aesthetics, battle-ready, strictly NO anime style, NO kawaii, NO modern flat vector, NO smooth gradients.
```

---

## 6. Verification & Integration Checklist

1. **Resolution & Geometry:**
   - Verify dimensions are power-of-two or clean multiples (e.g. $48 \times 48$, $64 \times 64$, $128 \times 128$).
   - Verify 9-slice corners are mathematically identical across all 4 corners.
2. **Background Alpha:**
   - Background must be cleanly extracted to transparent RGBA (no white halos or dark bleed).
3. **CSS Configuration:**
   - Always apply `image-rendering: pixelated;` to every raster UI container.
   - Use `border-image-slice` matching the exact pixel margin of corners (e.g. `16 fill`).
4. **Build Verification:**
   - `npm run typecheck`
   - `npm run build`
