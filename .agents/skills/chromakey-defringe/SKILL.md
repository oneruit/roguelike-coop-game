---
name: chromakey-defringe
description: Automated removal of pure magenta RGB(255, 0, 255) chromakey backgrounds and elimination of pink/magenta edge halos (color despill / decontamination) for 2D pixel art and sprites.
---

# Magenta Chromakey & Defringing Pipeline

> [!NOTE]
> **Project Standard Update**: New assets in the game are generated on **pure solid flat white background `rgb(255,255,255)`** and extracted via **`rembg` AI matting**, which completely eliminates color halos and palette erosion at generation time. This `chromakey-defringe` tool is retained for legacy magenta-keyed assets and backwards compatibility.

This skill provides a mathematically sound, automated pipeline to remove pure magenta (`#FF00FF` / `RGB(255, 0, 255)`) backgrounds from AI-generated or rendered 2D game assets, eliminating pink/purple halos (*chroma fringing*) while completely preserving internal colors (such as flames, red eyes, purple magic, and skin tones).

---

## 1. The Root Cause of Magenta Halos

When neural network image generators or 2D renderers produce pixel-art sprites on a magenta `RGB(255, 0, 255)` canvas:
1. **Edge Antialiasing & Compression**: Boundary pixels between dark outlines (e.g., `RGB(30, 25, 20)`) and the magenta canvas blend into composite colors like `RGB(142, 12, 137)`.
2. **Standard Chromakey Failure**:
   - If distance threshold is too small, blended border pixels are kept at 100% opacity, leaving a thick, unnatural pink/magenta halo around every silhouette and branch.
   - If distance threshold is too large, interior reds, purples, fire, and skin highlights are eaten away or punched through with holes.

---

## 2. The Solution: Mathematical Color Decontamination (Despill)

Because pure magenta has zero green (`G = 0`), the green channel of every blended pixel comes solely from the foreground object!

For any boundary pixel adjacent to the background, the excess magenta spill is:
$$\text{excess} = \max(0, \min(R - G, B - G))$$

By subtracting the excess spill:
$$R_{\text{clean}} = \text{clamp}(R - \text{excess}, 0, 255)$$
$$B_{\text{clean}} = \text{clamp}(B - \text{excess}, 0, 255)$$

Blended pixels like `RGB(142, 12, 137)` (with $G=12$) transform into `RGB(17, 12, 12)` — the exact natural dark outline tone of the object — completely eliminating the pink halo without eroding the silhouette!

---

## 3. Tool Usage

The CLI script is located at:
`.agents/skills/chromakey-defringe/scripts/defringe_magenta.py`

### Single Image Processing
```bash
python .agents/skills/chromakey-defringe/scripts/defringe_magenta.py input.png output.png
```

### Batch Directory Processing
```bash
python .agents/skills/chromakey-defringe/scripts/defringe_magenta.py input_dir/ output_dir/
```

### Options & Modes
- `--mode despill` (default): True color decontamination. Subtly neutralizes magenta spill back to natural edge color.
- `--mode dark-outline`: Clamps all boundary spill pixels to dark border colors (`RGB(G*0.9, G*0.9, G*0.9)`), ideal for retro pixel art with black/dark ink outlines.
- `--mode cut`: Trims outer faint spill pixels to transparent (`alpha = 0`).
- `--edge-depth 2`: Radius in pixels from the edge to inspect for magenta spill (default: 2; use 1 for tiny icons, 3 for large/soft-edged assets).
- `--spill-threshold 18.0`: Sensitivity to magenta excess (default: 18.0; lower values remove fainter tints).
- `--tolerance 75.0`: Background detection distance in RGB space.
- `--flood-fill`: Removes background starting from image edges, protecting any enclosed magenta regions inside the sprite.
- `--defringe-only`: Used when background has already been keyed out (or is on a dark preview background) and only edge halo cleanup is needed.

---

## 4. Best Practices for Image Generation

1. **Prompting**: Always specify solid magenta canvas: `"on solid pure magenta RGB(255, 0, 255) chromakey background, no shadows on background, no rim lighting"`.
2. **Avoid Magenta Rim Lights**: Avoid prompts with "neon pink backlight" or "magenta rim lighting" when using magenta backgrounds.
3. **Internal Pink/Magenta Elements**: If the character possesses pink hair or magenta energy, use the `--flood-fill` flag so the tool only removes background connected to the outside borders.
