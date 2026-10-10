#!/usr/bin/env python3
"""
Standardized Monster Animation Pipeline Processor (4-Frame Standard)
Processes separate animation state images (WALK, ATTACK, IDLE) and a portrait
for regular enemies/monsters into production-ready sprite sheets.

Standard Specifications:
- 4 columns x 4 rows (16 frames total per sheet)
- Default cell size: 128 x 128 pixels (total resolution: 512 x 512 pixels, clean Power-of-Two)
- Directional row mapping:
  * Row 0 (Top): Front / Forward-facing view (moving down towards player)
  * Row 1: Left-facing view (mirrored from Row 2)
  * Row 2: Right-facing view
  * Row 3 (Bottom): Back / Upward-facing view (moving up away from player)
- 10px bottom margin: target_feet_y = 118 in 128px cell (prevents claw swipes & feet clipping)
- Character height limit: <= 96 pixels inside 128px cell
- Symmetrical lateral mirroring (--mirror-left): mirrors Row 2 (Right) into Row 1 (Left)
  to guarantee zero directional drift and identical movement cadence.
- Auto-exports directional fallbacks: monster_<name>_{front,back,left,right}.png
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


def detect_and_clean_background(img_arr, bg_mode='auto'):
    """
    Cleans background to transparent RGBA.
    Supports transparent PNGs, pure/near black background, solid colors, and pure white backgrounds.
    """
    h, w = img_arr.shape[:2]
    c = img_arr.shape[2] if len(img_arr.shape) > 2 else 1

    if c == 4 and bg_mode != 'chroma':
        alpha = img_arr[:, :, 3]
        if (alpha == 0).mean() > 0.12:
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
        max_val = np.max(rgb, axis=2)
        alpha = np.clip((max_val - 12.0) / 18.0, 0.0, 1.0)
    elif bg_brightness > 230:
        dist = np.sqrt(np.sum((255.0 - rgb) ** 2, axis=-1))
        alpha = np.clip((dist - 16.0) / 20.0, 0.0, 1.0)
    else:
        d = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=-1))
        alpha = np.clip((d - 12.0) / 24.0, 0.0, 1.0)

    out = np.zeros((h, w, 4), dtype=np.uint8)
    for ch in range(3):
        out[:, :, ch] = np.clip(np.round(rgb[:, :, ch]), 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(np.round(alpha * 255), 0, 255).astype(np.uint8)
    out[out[:, :, 3] < 18, 3] = 0
    return out


def align_and_pack_monster_sheet(
    rgba_arr,
    cell_size=128,
    cols=4,
    rows=4,
    target_feet_y=118,
    target_char_h=92.0,
    max_char_h=96.0,
    mirror_left=False,
    mirror_right=False
):
    """
    Standardizes a 4x4 animation image into cell_size x cell_size frames (512x512).
    Leaves a 10px margin at bottom (target_feet_y = 118).
    Caps height to <= 96px.
    """
    h, w = rgba_arr.shape[:2]
    row_h = h / float(rows)
    col_w = w / float(cols)

    row_baselines = []
    char_heights = []
    char_widths = []

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
                char_heights.append(ys.max() - ys.min() + 1)
                char_widths.append(xs.max() - xs.min() + 1)

        row_baselines.append(np.median(feet_in_row) if len(feet_in_row) > 0 else (y1 - 3))

    ref_h = np.median(char_heights) if len(char_heights) > 0 else (row_h * 0.8)
    ref_w = np.max(char_widths) if len(char_widths) > 0 else (col_w * 0.8)
    scale = min(target_char_h / float(ref_h), max_char_h / float(ref_h)) if ref_h > 0 else 1.0
    max_allowed_w = cell_size - 10
    if ref_w * scale > max_allowed_w and ref_w > 0:
        scale = max_allowed_w / float(ref_w)

    out_sheet = np.zeros((rows * cell_size, cols * cell_size, 4), dtype=np.uint8)

    for r in range(rows):
        src_r = r
        flip_horizontal = False
        if r == 1 and mirror_left:
            src_r = 2
            flip_horizontal = True
        elif r == 2 and mirror_right:
            src_r = 1
            flip_horizontal = True

        y0 = int(round(src_r * row_h))
        y1 = int(round((src_r + 1) * row_h))
        ground_y = row_baselines[src_r]

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
            if new_w > (cell_size - 6):
                w_factor = (cell_size - 6) / float(new_w)
                new_w = max(1, int(round(new_w * w_factor)))
                new_h = max(1, int(round(new_h * w_factor)))
            if new_h > (cell_size - 6):
                h_factor = (cell_size - 6) / float(new_h)
                new_w = max(1, int(round(new_w * h_factor)))
                new_h = max(1, int(round(new_h * h_factor)))

            sp_img = Image.fromarray(sprite)
            sp_scaled = np.array(sp_img.resize((new_w, new_h), Image.Resampling.LANCZOS))

            if flip_horizontal:
                sp_scaled = np.fliplr(sp_scaled)

            bh, bw = sp_scaled.shape[:2]

            global_feet = y0 + max_y
            feet_offset = global_feet - ground_y

            dst_feet_y = target_feet_y + int(round(feet_offset * scale))
            dst_y = dst_feet_y - bh
            dst_x = (cell_size - bw) // 2

            dst_y = max(0, min(cell_size - bh, dst_y))
            dst_x = max(0, min(cell_size - bw, dst_x))

            out_y0 = r * cell_size + dst_y
            out_x0 = c * cell_size + dst_x

            mask = sp_scaled[:, :, 3] > 0
            target_slice = out_sheet[out_y0:out_y0 + bh, out_x0:out_x0 + bw]
            target_slice[mask] = sp_scaled[mask]

    return Image.fromarray(out_sheet)


def process_monster_portrait(portrait_input, out_path, cell_size=128, fallback_sheet=None):
    """
    Standardizes monster portrait icon to transparent PNG.
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
            res = crop_img.resize((cell_size, cell_size), Image.Resampling.LANCZOS)
            tmp_path = out_path + '.tmp.png'
            res.save(tmp_path)
            if os.path.exists(out_path):
                try:
                    os.remove(out_path)
                except Exception:
                    pass
            os.replace(tmp_path, out_path)
            print(f'[OK] Processed Monster Portrait: {out_path} ({res.size})')
            return

    if fallback_sheet is not None:
        crop_cell = fallback_sheet.crop((0, 0, cell_size, cell_size))
        tmp_path = out_path + '.tmp.png'
        crop_cell.save(tmp_path)
        if os.path.exists(out_path):
            try:
                os.remove(out_path)
            except Exception:
                pass
        os.replace(tmp_path, out_path)
        print(f'[OK] Created Monster Portrait from Row 0 Col 0: {out_path} ({crop_cell.size})')


def export_monster_directional_fallbacks(sheet, out_dir, clean_name, cell_size=128):
    """
    Exports static directional 1-frame fallbacks:
    - _front.png (Row 0, Col 0)
    - _left.png  (Row 1, Col 0)
    - _right.png (Row 2, Col 0)
    - _back.png  (Row 3, Col 0)
    """
    dirs = [
        ('front', 0),
        ('left', 1),
        ('right', 2),
        ('back', 3)
    ]
    for dir_name, row in dirs:
        x0 = 0
        y0 = row * cell_size
        frame = sheet.crop((x0, y0, x0 + cell_size, y0 + cell_size))
        file_path = os.path.join(out_dir, f'{clean_name}_{dir_name}.png')
        frame.save(file_path)
    print(f'[OK] Exported Directional Fallbacks (_front, _left, _right, _back) into: {out_dir}')


def process_monster(
    name,
    walk_path,
    attack_path=None,
    idle_path=None,
    portrait_path=None,
    out_dir='public/textures/monsters',
    cell_size=128,
    cols=4,
    rows=4,
    target_feet_y=118,
    target_char_h=92.0,
    max_char_h=96.0,
    mirror_left=True,
    mirror_right=False
):
    out_dir = os.path.normpath(os.path.abspath(out_dir))
    os.makedirs(out_dir, exist_ok=True)
    clean_name = name if name.startswith('monster_') else f'monster_{name}'

    inputs = {
        'walk': walk_path
    }
    if attack_path:
        inputs['attack'] = attack_path
    if idle_path:
        inputs['idle'] = idle_path

    processed_sheets = {}

    for state, path in inputs.items():
        if not path or not os.path.isfile(path):
            raise FileNotFoundError(f'Missing input image for state "{state}": {path}')

        raw_im = Image.open(path)
        arr = np.array(raw_im)
        rgba = detect_and_clean_background(arr)

        sheet = align_and_pack_monster_sheet(
            rgba,
            cell_size=cell_size,
            cols=cols,
            rows=rows,
            target_feet_y=target_feet_y,
            target_char_h=target_char_h,
            max_char_h=max_char_h,
            mirror_left=mirror_left,
            mirror_right=mirror_right
        )

        out_file = os.path.normpath(os.path.abspath(os.path.join(out_dir, f'{clean_name}_{state}.png')))
        tmp_file = out_file + '.tmp.png'
        sheet.save(tmp_file)
        if os.path.exists(out_file):
            try:
                os.remove(out_file)
            except Exception:
                pass
        os.replace(tmp_file, out_file)
        processed_sheets[state] = sheet
        print(f'[OK] Processed Monster {state.upper()}: {out_file} ({sheet.size})')

    # Portrait & Directional Fallbacks
    portrait_out = os.path.join(out_dir, f'{clean_name}_front.png')
    primary_sheet = processed_sheets.get('walk') or processed_sheets.get('idle')
    process_monster_portrait(
        portrait_path,
        portrait_out,
        cell_size=cell_size,
        fallback_sheet=primary_sheet
    )

    if primary_sheet:
        export_monster_directional_fallbacks(primary_sheet, out_dir, clean_name, cell_size=cell_size)

    print(f'\nSuccess! Standard 4-Frame Monster package ready for "{clean_name}".')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process 4x4 animation sheets into 4-frame standard for monsters.')
    parser.add_argument('--name', '-n', required=True, help='Monster name (e.g. coyote or monster_coyote)')
    parser.add_argument('--walk', required=True, help='Path to 4x4 WALK image')
    parser.add_argument('--attack', help='Optional path to 4x4 ATTACK image')
    parser.add_argument('--idle', help='Optional path to 4x4 IDLE image')
    parser.add_argument('--portrait', help='Optional path to portrait image')
    parser.add_argument('--out-dir', '-o', default='public/textures/monsters', help='Output directory')
    parser.add_argument('--cell-size', type=int, default=128, help='Frame cell size (default: 128)')
    parser.add_argument('--cols', type=int, default=4, help='Columns per row (default: 4)')
    parser.add_argument('--rows', type=int, default=4, help='Rows (default: 4)')
    parser.add_argument('--feet-y', type=int, default=118, help='Feet anchor Y coordinate (default: 118, 10px margin from bottom)')
    parser.add_argument('--char-h', type=float, default=92.0, help='Target monster height (default: 92.0)')
    parser.add_argument('--max-h', type=float, default=96.0, help='Max allowed monster height (default: 96.0)')
    parser.add_argument('--mirror-left', action='store_true', default=True, help='Mirror Row 2 (Right) into Row 1 (Left)')
    parser.add_argument('--no-mirror-left', dest='mirror_left', action='store_false', help='Disable automatic left mirroring')
    parser.add_argument('--mirror-right', action='store_true', help='Mirror Row 1 (Left) into Row 2 (Right)')

    args = parser.parse_args()
    process_monster(
        name=args.name,
        walk_path=args.walk,
        attack_path=args.attack,
        idle_path=args.idle,
        portrait_path=args.portrait,
        out_dir=args.out_dir,
        cell_size=args.cell_size,
        cols=args.cols,
        rows=args.rows,
        target_feet_y=args.feet_y,
        target_char_h=args.char_h,
        max_char_h=args.max_h,
        mirror_left=args.mirror_left,
        mirror_right=args.mirror_right
    )
