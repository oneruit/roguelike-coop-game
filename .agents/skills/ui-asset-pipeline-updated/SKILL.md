---
name: ui-asset-pipeline-updated
description: Standardized pipeline for creating, generating, styling, slicing, and integrating dark fantasy ARPG UI assets (9-slice scalable frames, blank action button plaques, ability sockets, bust portraits, ribbons) into the HTML/CSS game interface with mandatory human approval.
---

# UI Asset Pipeline (Updated)

This skill defines the standardized master pipeline for creating, generating, processing, slicing, and integrating **dark fantasy ARPG UI assets** into the game engine's HTML/CSS interface.

---

## 1. Architectural Philosophy: Hybrid HTML/CSS + Raster Asset Standard

In modern game UI development (*Diablo, Path of Exile, Grim Dawn, Dead Cells*), the most scalable and responsive UI architecture combines **HTML/CSS semantic layouts** with **high-res / 16-bit raster texture assets**:

1. **HTML & DOM Layout:**
   - Handles responsive scaling, flexbox/grid flow, z-index layering, click/tap events, and accessibility.
   - **Crucial Rule — Blank Button Plaques (No Baked-In Text):**
     - Button textures must NEVER contain rasterized text (e.g. "ENTER RIFT", "BACK", "PLAY").
     - Baked-in text prevents localization (Russian, English, etc.), distorts on scaling, and blocks dynamic state changes (such as changing button text to "SELECT A CHARACTER" or locked state countdowns).
     - All button plaques must be generated as **completely blank raster plaques**. Text is rendered as crisp HTML `<span>` elements styled via CSS typography (`Cinzel`, `text-shadow`, glowing drop-shadows).
2. **9-Slice Scalable Frames (`border-image`):**
   - Frame assets provide ornate antique gold filigree or chiseled iron corner brackets while allowing panels, dialogs, and cards to stretch infinitely without distorting corner geometry.
   - The interior cavity of a 9-slice frame must either be keyed out to transparent alpha ($0, 0, 0, 0$) so dynamic contents (such as character portraits) show through, or filled with dark textured stone.
3. **Dedicated Asset Directory Conventions:**
   - UI assets belong in `public/textures/ui/`.
   - Character bust portraits belong in `public/textures/heroes/<hero-id>/portrait.png`.
   - All raster textures are referenced in CSS via root paths (e.g., `/textures/ui/frame_card_normal_9slice.png`).

---

## 2. Visual Style Guidelines (Dark Fantasy ARPG)

All UI elements must strictly adhere to the grim dark fantasy aesthetic established by *Diablo* and *Rift: Abyss*:

* **Primary Materials & Textures:**
  - **Spiky Demonic Wrought Iron:** Heavy blackened iron with sharp jagged silhouettes and chisel marks (`#120e17`, `#1f1b26`).
  - **Molten Magma / Fiery Ember Core:** Blazing lava gradients (`#ea580c`, `#c2410c`, `#7c2d12`) with warm incandescent amber glow (`rgba(249, 115, 22, 0.85)`).
  - **Antique Gold Filigree:** Ornate scrolled corner brackets and borders (`#D4AF37`, `#F59E0B`, `#FDE68A`) for legendary and selected states.
  - **Dark Obsidian & Stone:** Beveled dark plates with forged bronze/iron corner rivets.
  - **Arcane Void / Rift Magic:** Saturated glowing purple runes and rift eyes (`#8B5CF6`, `#A855F7`, `#D8B4FE`).
* **Strict Exclusions:**
  - **STRICTLY NO anime or kawaii styling**, NO cute chibi smiles, NO pastel candy colors.
  - **STRICTLY NO modern flat minimal mobile UI**, NO smooth vector glassmorphism, NO generic rounded buttons.
  - **STRICTLY NO baked-in text** on interactive buttons.

---

## 3. Core UI Component Specifications

### 3.1 9-Slice Scalable Frames
Used for character roster cards, inspector modals, tooltip boxes, and quest dialogs.

* **Asset Geometry:** Symmetrical square or rectangular template (e.g., $256 \times 256$ px) with uniform corner margins (typically $32$px or $48$px).
* **Inner Cavity:** Clear interior ($0,0,0,0$ alpha) for cards containing portraits.
* **Standard Assets:**
  - `frame_card_normal_9slice.png`: Dark iron / stone riveted frame.
  - `frame_card_selected_9slice.png`: Radiant antique gold filigree frame.
  - `frame_panel_gothic_9slice.png`: Dark obsidian gothic modal panel with top filigree crest.
* **CSS Pattern:**
  ```css
  .char-roster-card .char-card-frame-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-style: solid;
    border-width: 14px;
    border-image-source: url('/textures/ui/frame_card_normal_9slice.png');
    border-image-slice: 48 fill;
    border-image-repeat: stretch;
    box-sizing: border-box;
  }

  .char-roster-card.card-selected .char-card-frame-overlay {
    border-width: 16px;
    border-image-source: url('/textures/ui/frame_card_selected_9slice.png');
    border-image-slice: 48 fill;
    border-image-repeat: stretch;
    filter: drop-shadow(0 0 20px rgba(250, 204, 21, 0.9));
  }
  ```

### 3.2 Blank Action Button Plaques
Buttons provide the tactile material feel through blank raster textures, while text, icons, and interactive states are driven by CSS:

* **Standard Assets:**
  - `btn_enter_rift_blank.png`: Spiky demonic wrought-iron plaque with burning magma core.
  - `btn_gothic_back_blank.png`: Rectangular obsidian and dark steel plaque with bronze corner brackets.
* **Interactive States via CSS Filters:**
  - **Hover:** `filter: brightness(1.2) drop-shadow(0 0 24px rgba(249, 115, 22, 1)); transform: scale(1.03);`
  - **Active / Pressed:** `transform: scale(0.97); filter: brightness(0.95);`
  - **Disabled / Locked:** `filter: grayscale(0.8) brightness(0.6); cursor: not-allowed;`
* **CSS Pattern:**
  ```css
  .char-action-btn-play {
    width: clamp(230px, 22vw, 290px);
    height: clamp(62px, 6.8vh, 74px);
    background: url('/textures/ui/btn_enter_rift_blank.png') center center / 100% 100% no-repeat;
    border: none;
    color: #fff7ed;
    font-family: 'Cinzel', Georgia, serif;
    font-size: clamp(15px, 1.5vw, 18px);
    font-weight: 800;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    text-shadow: 0 0 10px rgba(249, 115, 22, 0.9), 0 2px 4px #000;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: filter 0.2s, transform 0.18s;
    user-select: none;
    filter: drop-shadow(0 0 16px rgba(249, 115, 22, 0.7));
  }
  ```

### 3.3 Ability Sockets & Trait Sockets
Square or diamond sockets for active hero skills and passive traits:

* **Active Ability Sockets:** $64 \times 64$ px or $128 \times 128$ px square dark iron beveled frames with glowing purple arcane runes:
  - `ability_void_strike.png`: Downward piercing void arrow.
  - `ability_abyssal_charge.png`: Charging shadow beast head.
  - `ability_rift_nova.png`: Pulsing purple starburst / sun nova.
  - `ability_devouring_slash.png`: Curved sweeping arcane blade.
* **Passive Trait Socket:** Ornate antique gold diamond / rhombus frame with glowing purple rift eye:
  - `trait_socket_passive.png`.

### 3.4 Character Bust Portraits (3:4 Vertical Aspect Ratio)
Vertical portrait art displayed inside roster cards and hero inspect panels:

* **Dimensions:** $3:4$ ratio (e.g., $300 \times 400$ px or $600 \times 800$ px).
* **Location:** `public/textures/heroes/<hero-id>/portrait.png`.
* **Atmosphere:** Dark void background with subtle vignette and glowing amber or purple embers.

---

## 4. Mandatory Approval Gateway (Rule: `image-generation-approval.md`)

Whenever generating UI textures or concept sheets, agents **MUST** strictly follow the project approval rule:

1. Generate the UI mockup or sprite sheet asset (`image-generator` subagent).
2. Display the generated image in chat using markdown file links.
3. Call `ask_question` with 3 options:
   - `[1] (Recommended) Approve (continue work / integrate into game)`
   - `[2] Request changes (specify what to refine or regenerate)`
   - `[3] Do nothing / Cancel task (stop generation)`
4. **NEVER edit CSS or write sliced assets into `public/` until the user confirms with Option 1.**

---

## 5. Post-Processing & Automated Slicing Scripts

The skill provides an automated slicing script at `.agents/skills/ui-asset-pipeline-updated/scripts/slice_ui_assets.py`.

### 5.1 Python Slicing Utility Capabilities
- **Alpha Extraction:** Removes pure white RGB(255, 255, 255) or magenta RGB(255, 0, 255) backgrounds.
- **Decontamination & Despill:** Multiplies RGB of semi-transparent edge pixels by alpha factor, eliminating white halos against dark backgrounds.
- **Cavity Clearing:** Sets rectangular interior cavities to pure transparent RGBA(0, 0, 0, 0) for 9-slice portrait frames.
- **Batch Processing:** Accepts a JSON config file for automated extraction of complete asset sheets.

### 5.2 Command Examples

**Single Element Extraction (with inner cavity clearing):**
```bash
python .agents/skills/ui-asset-pipeline-updated/scripts/slice_ui_assets.py \
  --input path/to/sheet.png \
  --output public/textures/ui/frame_card_normal_9slice.png \
  --crop 60,60,320,320 \
  --cavity 48,48,212,212 \
  --bg-mode white
```

**Single Element Extraction (blank button plaque):**
```bash
python .agents/skills/ui-asset-pipeline-updated/scripts/slice_ui_assets.py \
  --input path/to/sheet.png \
  --output public/textures/ui/btn_enter_rift_blank.png \
  --crop 350,50,950,230 \
  --bg-mode white \
  --trim
```

**Batch Slicing with JSON Config:**
```json
[
  {
    "output": "public/textures/ui/btn_enter_rift_blank.png",
    "crop": [360, 48, 1050, 250],
    "bg_mode": "white",
    "trim": true
  },
  {
    "output": "public/textures/ui/frame_card_selected_9slice.png",
    "crop": [62, 330, 320, 593],
    "cavity": [40, 40, 218, 223],
    "bg_mode": "white"
  }
]
```

```bash
python .agents/skills/ui-asset-pipeline-updated/scripts/slice_ui_assets.py \
  --input path/to/sheet.png \
  --batch path/to/batch_config.json
```

---

## 6. Master Generation Prompts Library

### Prompt 1: Master UI Sheet (9-Slice Frames, Blank Buttons, Ability Sockets)
```text
Generate the master dark fantasy ARPG UI asset sheet on pure solid white background rgb(255,255,255):

1. BLANK BUTTON PLAQUES (NO TEXT AT ALL):
   - Primary Action Button (ENTER RIFT style): Heavy dark gothic demonic wrought-iron spiky border, burning molten lava / glowing orange-red magma ember core fill. COMPLETELY BLANK, NO TEXT, NO LETTERS. Clean texture plaque for HTML/CSS text overlay.
   - Back Button (BACK style): Rectangular dark obsidian and forged iron gothic beveled plaque with bronze corner rivets and brackets. COMPLETELY BLANK, NO TEXT, NO LETTERS. Clean texture plaque for HTML/CSS text overlay.

2. 4 ACTIVE ABILITY SOCKETS (SQUARE FRAMES, NOT CIRCLES):
   - Row of four distinct 64x64 SQUARE ability sockets in dark forged iron beveled frames with purple glowing arcane sigils:
     1: Void Strike (downward purple arrow)
     2: Abyssal Charge (roaring purple beast head)
     3: Rift Nova (pulsing purple sun/star nova)
     4: Devouring Slash (slashing curved purple blade)

3. 9-SLICE FRAMES:
   - Selected Card 9-Slice Frame: Perfectly square modular frame with 4 symmetrical ornate glowing gold filigree corners (32px slice) and straight repeatable gold edges. Pure solid black interior cavity.
   - Normal Card 9-Slice Frame: Perfectly square modular frame with 4 symmetrical dark iron/bronze riveted corners (32px slice) and straight repeatable dark stone/iron edges. Pure solid black interior cavity.
   - Inspector Panel 9-Slice Frame: Square dark gothic panel frame with 4 symmetrical gold filigree corner brackets (32px slice), straight dark borders, and separate top gothic crest ornament.

4. PASSIVE TRAIT SOCKET:
   - Ornate gold diamond socket with glowing purple rift eye rune.

5. NAVIGATION CHEVRONS:
   - Left and right dark metallic gothic arrow buttons (< and >).

Style: Clean, detailed, professional dark fantasy game UI sprites, high contrast, clean separation on pure solid white background. Strictly NO anime, NO text on buttons.
```

### Prompt 2: Hero Bust Portrait (3:4 Vertical Aspect Ratio)
```text
Vertical bust portrait (3:4 aspect ratio) of [Hero Name], [Class / Archetype description].
[Facial details, eyes, hair, armor/clothing].
Dark atmospheric void background with subtle vignette and glowing embers, matching the style of Diablo / Rift dark fantasy ARPG character selection screen.
Rich contrast, dramatic rim lighting from purple arcane magic or amber fire, deep textured shadows.
Clean, detailed, heroic dark fantasy digital art / high-res RPG portrait.
Strictly NO anime, NO kawaii, NO modern flat vector.
```

---

## 7. Verification & Integration Checklist

Before finalizing any UI asset task, verify every item:

- [ ] **Blank Button Check**: Buttons have **zero baked-in text**; all text is rendered cleanly via HTML `<span>` and CSS typography.
- [ ] **9-Slice Symmetry**: Frames have uniform corner slice dimensions ($32$px, $48$px) and transparent cavities where required.
- [ ] **Alpha Extraction**: Backgrounds are cleanly removed with zero white/magenta halo or fringe bleeding against dark surfaces.
- [ ] **File Size Compliance**: All modified CSS/TS files remain strictly under 1500 lines per `.agents/rules/file-size-limit.md`.
- [ ] **Approval Rule**: Generated assets were previewed and confirmed by the user via `ask_question`.
- [ ] **Mandatory Verification Commands Pass**:
  ```powershell
  npm run typecheck
  npm run build
  npm run build:admin
  npm test
  ```
