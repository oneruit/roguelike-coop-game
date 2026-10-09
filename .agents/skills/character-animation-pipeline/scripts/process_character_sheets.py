#!/usr/bin/env python3
"""
Standardized Character Animation Pipeline Processor
Processes 4 separate animation state images (IDLE, WALK, ATTACK, WALK_ATTACK) and a portrait
into production-ready, standardized sprite sheets for the game engine.

Standard Specifications:
- Character Style: "Chibi" proportions (2.5 heads tall, large expressive eyes, compact body)
- Border: Mandatory 1px solid black border around entire character silhouette
- 4 separate images (one per action state)
- Exactly 24 frames per image arranged in 6 columns x 4 rows
- Frame cell size: 128 x 128 pixels
- Total sheet resolution: 768 x 512 pixels (6 * 128 = 768, 4 * 128 = 512)
- Portrait resolution: 128 x 128 pixels
- Directional row mapping:
  * Row 0 (Top): Front / Forward-facing view
  * Row 1: Left-facing view
  * Row 2: Right-facing view
  * Row 3 (Bottom): Back / Upward-facing view
- Anchoring to bottom: target_feet_y = 122 in 128px cell (prevents hovering above ground)
- Horizontal center: x = 64 in 128px cell
"""

import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
import argparse
import numpy as np
from PIL import Image


def apply_1px_black_border(rgba_arr):
    """
    Enforces a mandatory 1px solid black border around the alpha silhouette of a sprite.
    Any transparent pixel adjacent to a non-transparent foreground pixel is set to [0, 0, 0, 255].
    """
    alpha = rgba_arr[:, :, 3]
    fg = alpha > 20
    h, w = alpha.shape

    dilated = np.zeros((h, w), dtype=bool)
    for dy in [-1, 0, 1]:
        for dx in [-1, 0, 1]:
            if dy == 0 and dx == 0:
                continue
            shifted = np.zeros_like(fg)
            sy_start = max(0, dy)
            sy_end = h + min(0, dy)
            ty_start = max(0, -dy)
            ty_end = h + min(0, -dy)

            sx_start = max(0, dx)
            sx_end = w + min(0, dx)
            tx_start = max(0, -dx)
            tx_end = w + min(0, -dx)

            shifted[sy_start:sy_end, sx_start:sx_end] = fg[ty_start:ty_end, tx_start:tx_end]
            dilated |= shifted

    border = dilated & (~fg)
    out = rgba_arr.copy()
    out[border] = [0, 0, 0, 255]
    return out


def detect_and_clean_background(img_arr, bg_mode='auto'):
    """
    Cleans background to transparent RGBA.
    Supports transparent PNGs, pure/near black background, solid colors, and pure white backgrounds.
    """
    h, w = img_arr.shape[:2]
    c = img_arr.shape[2] if len(img_arr.shape) > 2 else 1

    if c == 4 and bg_mode != 'chroma':
        alpha = img_arr[:, :, 3]
        if (alpha == 0).mean() > 0.15:
            arr = img_arr.copy()
            arr[arr[:, :, 3] < 12, 3] = 0
            return arr

    rgb = img_arr[:, :, :3].astype(float)
    corners = np.concatenate([
        rgb[0:15, 0:15].reshape(-1, 3),
        rgb[0:15, -15:].reshape(-1, 3),
        rgb[-15:, 0:15].reshape(-1, 3),
        rgb[-15:, -15:].reshape(-1, 3)
    ], axis=0)

    bg_color = np.median(corners, axis=0)
    bg_brightness = np.mean(bg_color)

    if bg_brightness < 25:
        # Dark / pitch-black background
        max_val = np.max(rgb, axis=2)
        alpha = np.clip((max_val - 12.0) / 18.0, 0.0, 1.0)
    elif bg_brightness > 230:
        # Pure white / near-white background
        dist = np.sqrt(np.sum((255.0 - rgb) ** 2, axis=-1))
        alpha = np.clip((dist - 16.0) / 20.0, 0.0, 1.0)
    else:
        # Chroma keying with Euclidean color distance
        d = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=-1))
        alpha = np.clip((d - 12.0) / 24.0, 0.0, 1.0)

    out = np.zeros((h, w, 4), dtype=np.uint8)
    for ch in range(3):
        out[:, :, ch] = np.clip(np.round(rgb[:, :, ch]), 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(np.round(alpha * 255), 0, 255).astype(np.uint8)
    out[out[:, :, 3] < 18, 3] = 0
    return out


def align_and_pack_sheet(
    rgba_arr,
    cell_size=128,
    cols=6,
    rows=4,
    target_feet_y=122,
    target_char_h=104.0,
    add_border=True
):
    """
    Standardizes a 6x4 animation image into cell_size x cell_size frames (768x512).
    Anchors character feet to the bottom (target_feet_y = 122 in 128px cell).
    Ensures mandatory 1px black outline.
    """
    h, w = rgba_arr.shape[:2]
    row_h = h / float(rows)
    col_w = w / float(cols)

    row_baselines = []
    char_heights = []

    for r in range(rows):
        y0 = int(round(r * row_h))
        y1 = int(round((r + 1) * row_h))
        feet_in_row = []

        for c in range(cols):
            x0 = int(round(c * col_w))
            x1 = int(round((c + 1) * col_w))
            cell_a = rgba_arr[y0:y1, x0:x1, 3]
            ys, xs = np.where(cell_a > 25)
            if len(ys) > 0:
                feet_in_row.append(y0 + ys.max())
                char_heights.append(ys.max() - ys.min())

        row_baselines.append(np.median(feet_in_row) if len(feet_in_row) > 0 else (y1 - 3))

    ref_h = np.median(char_heights) if len(char_heights) > 0 else (row_h * 0.8)
    scale = target_char_h / float(ref_h) if ref_h > 0 else 1.0

    max_allowed_h = cell_size - 8
    if target_char_h > max_allowed_h:
        scale = max_allowed_h / float(ref_h)

    out_sheet = np.zeros((rows * cell_size, cols * cell_size, 4), dtype=np.uint8)

    for r in range(rows):
        y0 = int(round(r * row_h))
        y1 = int(round((r + 1) * row_h))
        ground_y = row_baselines[r]

        for c in range(cols):
            x0 = int(round(c * col_w))
            x1 = int(round((c + 1) * col_w))
            cell_raw = rgba_arr[y0:y1, x0:x1]

            ys, xs = np.where(cell_raw[:, :, 3] > 20)
            if len(ys) == 0:
                continue

            min_y, max_y = ys.min(), ys.max()
            min_x, max_x = xs.min(), xs.max()

            sprite = cell_raw[min_y:max_y + 1, min_x:max_x + 1]
            sh, sw = sprite.shape[:2]

            new_w = max(1, int(round(sw * scale)))
            new_h = max(1, int(round(sh * scale)))

            sp_img = Image.fromarray(sprite)
            sp_scaled = np.array(sp_img.resize((new_w, new_h), Image.Resampling.LANCZOS))

            if add_border:
                sp_bordered = apply_1px_black_border(sp_scaled)
            else:
                sp_bordered = sp_scaled

            bh, bw = sp_bordered.shape[:2]

            # Placement anchored firmly to bottom
            global_feet = y0 + max_y
            feet_offset = global_feet - ground_y

            dst_feet_y = target_feet_y + int(round(feet_offset * scale))
            dst_y = dst_feet_y - bh
            dst_x = (cell_size - bw) // 2

            # Clamp inside frame boundaries
            dst_y = max(0, min(cell_size - bh, dst_y))
            dst_x = max(0, min(cell_size - bw, dst_x))

            out_y0 = r * cell_size + dst_y
            out_x0 = c * cell_size + dst_x

            mask = sp_bordered[:, :, 3] > 0
            target_slice = out_sheet[out_y0:out_y0 + bh, out_x0:out_x0 + bw]
            target_slice[mask] = sp_bordered[mask]

    return Image.fromarray(out_sheet)


def process_portrait(portrait_input, out_path, cell_size=128, fallback_idle_sheet=None, add_border=True):
    """
    Standardizes portrait to 128x128 pixel transparent PNG with 1px black outline.
    """
    out_path = os.path.normpath(os.path.abspath(out_path))
    if portrait_input and os.path.isfile(portrait_input):
        raw = Image.open(portrait_input)
        arr = np.array(raw)
        rgba = detect_and_clean_background(arr)

        ys, xs = np.where(rgba[:, :, 3] > 20)
        if len(ys) > 0:
            min_y, max_y = ys.min(), ys.max()
            min_x, max_x = xs.min(), xs.max()

            crop_w = max_x - min_x
            crop_h = max_y - min_y
            side = max(crop_w, crop_h)
            cx = (min_x + max_x) // 2

            x0 = max(0, cx - side // 2)
            x1 = min(rgba.shape[1], x0 + side)
            y0 = max(0, min_y)
            y1 = min(rgba.shape[0], y0 + side)

            cropped = rgba[y0:y1, x0:x1]
            crop_img = Image.fromarray(cropped)
            res = np.array(crop_img.resize((cell_size, cell_size), Image.Resampling.LANCZOS))
            if add_border:
                res = apply_1px_black_border(res)
            res_img = Image.fromarray(res)
            res_img.save(out_path)
            print(f'[OK] Processed Portrait: {out_path} ({res_img.size})')
            return

    if fallback_idle_sheet is not None:
        crop_cell = fallback_idle_sheet.crop((0, 0, cell_size, cell_size))
        crop_arr = np.array(crop_cell)
        if add_border:
            crop_arr = apply_1px_black_border(crop_arr)
        res_img = Image.fromarray(crop_arr)
        res_img.save(out_path)
        print(f'[OK] Created Portrait from IDLE Row 0 Col 0: {out_path} ({res_img.size})')


def process_character(
    name,
    idle_path,
    walk_path,
    attack_path,
    walk_attack_path,
    portrait_path=None,
    out_dir='public/textures/heroes',
    cell_size=128,
    cols=6,
    rows=4,
    target_feet_y=122,
    target_char_h=104.0,
    add_border=True
):
    out_dir = os.path.normpath(os.path.abspath(out_dir))
    os.makedirs(out_dir, exist_ok=True)
    clean_name = name if name.startswith('hero_') else f'hero_{name}'

    inputs = {
        'idle': idle_path,
        'walk': walk_path,
        'attack': attack_path,
        'walk_attack': walk_attack_path
    }

    processed_sheets = {}

    for state, path in inputs.items():
        if not path or not os.path.isfile(path):
            raise FileNotFoundError(f'Missing input image for state "{state}": {path}')

        raw_im = Image.open(path)
        arr = np.array(raw_im)
        rgba = detect_and_clean_background(arr)

        sheet = align_and_pack_sheet(
            rgba,
            cell_size=cell_size,
            cols=cols,
            rows=rows,
            target_feet_y=target_feet_y,
            target_char_h=target_char_h,
            add_border=add_border
        )

        out_file = os.path.join(out_dir, f'{clean_name}_{state}.png')
        sheet.save(out_file)
        processed_sheets[state] = sheet
        print(f'[OK] Processed {state.upper()}: {out_file} ({sheet.size})')

    # Portrait processing
    portrait_out = os.path.join(out_dir, f'{clean_name}_front.png')
    process_portrait(
        portrait_path,
        portrait_out,
        cell_size=cell_size,
        fallback_idle_sheet=processed_sheets.get('idle'),
        add_border=add_border
    )

    print(f'\nSuccess! Standard 128x128 Chibi character package ready for "{clean_name}".')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process 4 separate 6x4 animation sheets into 128x128 standard.')
    parser.add_argument('--name', '-n', required=True, help='Character name (e.g. valkyria or hero_valkyria)')
    parser.add_argument('--idle', required=True, help='Path to 6x4 IDLE image')
    parser.add_argument('--walk', required=True, help='Path to 6x4 WALK image')
    parser.add_argument('--attack', required=True, help='Path to 6x4 ATTACK image')
    parser.add_argument('--walk-attack', required=True, help='Path to 6x4 WALK_ATTACK image')
    parser.add_argument('--portrait', help='Optional path to portrait image')
    parser.add_argument('--out-dir', '-o', default='public/textures/heroes', help='Output directory')
    parser.add_argument('--cell-size', type=int, default=128, help='Frame cell size (default: 128)')
    parser.add_argument('--cols', type=int, default=6, help='Columns per row (default: 6)')
    parser.add_argument('--rows', type=int, default=4, help='Rows (default: 4)')
    parser.add_argument('--feet-y', type=int, default=122, help='Feet anchor Y coordinate (default: 122, anchored to bottom)')
    parser.add_argument('--char-h', type=float, default=104.0, help='Target character height (default: 104.0)')
    parser.add_argument('--no-border', action='store_true', help='Skip mandatory 1px black outline enforcement')

    args = parser.parse_args()
    process_character(
        name=args.name,
        idle_path=args.idle,
        walk_path=args.walk,
        attack_path=args.attack,
        walk_attack_path=args.walk_attack,
        portrait_path=args.portrait,
        out_dir=args.out_dir,
        cell_size=args.cell_size,
        cols=args.cols,
        rows=args.rows,
        target_feet_y=args.feet_y,
        target_char_h=args.char_h,
        add_border=not args.no_border
    )
