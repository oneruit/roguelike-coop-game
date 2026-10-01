#!/usr/bin/env python3
"""
Character Sprite Extraction Pipeline
Extracts, aligns, and packages 4-state animated characters from composite sprite sheets.
Supports both transparent PNG sheets and solid-background JPG/PNG sheets.
Standardized to 96x96 cell size to ensure extended sword slash arcs are never clipped.
"""

import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
import argparse
from PIL import Image
import numpy as np


def detect_background(img_arr):
    """Checks if image already has transparency, is a checkerboard JPEG, or needs chromakeying."""
    if img_arr.shape[2] == 4:
        alpha = img_arr[:, :, 3]
        if (alpha == 0).mean() > 0.15:
            return 'transparent', None

    # Sample corners to test for checkerboard pattern
    corners = np.concatenate([
        img_arr[0:20, 0:20, :3].reshape(-1, 3),
        img_arr[0:20, -20:, :3].reshape(-1, 3),
        img_arr[-20:, 0:20, :3].reshape(-1, 3),
        img_arr[-20:, -20:, :3].reshape(-1, 3)
    ], axis=0).astype(float)

    sat = np.max(np.abs(corners - np.mean(corners, axis=1, keepdims=True)), axis=1)
    if (sat < 5).mean() > 0.8:
        lum = np.mean(corners, axis=1)
        if lum.max() - lum.min() > 25:
            return 'checkerboard', None

    bg_color = np.median(corners, axis=0)
    return 'solid', bg_color


def clean_or_extract_alpha(img_arr, bg_type, bg_color):
    """Returns RGBA array with clean alpha channel."""
    h, w, c = img_arr.shape
    if bg_type == 'transparent':
        arr = img_arr.copy()
        # Clean faint background compression noise
        arr[arr[:, :, 3] < 12, 3] = 0
        return arr
    elif bg_type == 'checkerboard':
        from scipy.ndimage import label
        r, g, b = img_arr[:,:,0].astype(int), img_arr[:,:,1].astype(int), img_arr[:,:,2].astype(int)
        sat = np.maximum(np.maximum(np.abs(r-g), np.abs(r-b)), np.abs(g-b))
        lum = (r + g + b) // 3
        is_bg = (sat <= 3) & (lum >= 180) & (lum <= 245)
        # Banner labels
        y_idx = np.arange(h)[:, None]
        is_banner = (r < 35) & (g < 35) & (b < 35) & ((y_idx < 60) | ((y_idx > 320) & (y_idx < 390)))
        is_bg |= is_banner
        labeled, num = label(is_bg)
        border_labels = set(np.unique(np.concatenate([labeled[0, :], labeled[-1, :], labeled[:, 0], labeled[:, -1]])))
        border_labels.discard(0)
        is_external_bg = np.isin(labeled, list(border_labels))
        unique, counts = np.unique(labeled, return_counts=True)
        count_map = dict(zip(unique, counts))
        for lab in unique:
            if lab != 0 and lab not in border_labels and count_map[lab] > 15:
                is_external_bg |= (labeled == lab)
        alpha = (~is_external_bg).astype(np.uint8) * 255
        return np.dstack([img_arr[:,:,:3], alpha])
    else:
        # Chroma keying using Euclidean distance to background color
        rgb = img_arr[:, :, :3].astype(float)
        d = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=-1))
        alpha = np.clip((d - 10.0) / 22.0, 0.0, 1.0)
        out = np.zeros((h, w, 4), dtype=np.uint8)
        for ch in range(3):
            fg = np.where(alpha > 0.05, (rgb[:, :, ch] - (1.0 - alpha) * bg_color[ch]) / np.maximum(alpha, 0.05), rgb[:, :, ch])
            out[:, :, ch] = np.clip(np.round(fg), 0, 255).astype(np.uint8)
        out[:, :, 3] = np.clip(np.round(alpha * 255), 0, 255).astype(np.uint8)
        out[out[:, :, 3] < 20, 3] = 0
        return out


def find_row_bands(alpha_col, min_count=20):
    """Finds contiguous vertical intervals where character rows exist."""
    in_row = False
    start_y = 0
    bands = []
    for y, count in enumerate(alpha_col):
        if count >= min_count and not in_row:
            in_row = True
            start_y = y
        elif count < min_count and in_row:
            in_row = False
            bands.append((start_y, y))
    if in_row:
        bands.append((start_y, len(alpha_col)))
    return bands


def get_frame_boxes(alpha, y0, y1, x0, x1, min_w=14, gap_thresh=2):
    """Finds horizontal bounding boxes for individual sprite frames within a row."""
    sub = alpha[y0:y1+1, x0:x1] > 0
    cols = sub.sum(axis=0)
    in_s = False
    start = 0
    gap = 0
    boxes = []
    for x, v in enumerate(cols):
        if v > 0:
            if not in_s:
                in_s = True
                start = x
            gap = 0
        else:
            if in_s:
                gap += 1
                if gap >= gap_thresh:
                    in_s = False
                    end = x - gap + 1
                    if end - start >= min_w:
                        boxes.append((x0 + start, x0 + end))
    if in_s:
        end = len(cols) - gap
        if end - start >= min_w:
            boxes.append((x0 + start, x0 + end))
    return boxes


def build_sheet(arr, row_configs, x0, x1, expected_cols, target_feet_y, cell_size, loop_row3=False):
    """Assembles a standard 4-row sprite sheet with aligned feet anchors."""
    sheet = np.zeros((4 * cell_size, expected_cols * cell_size, 4), dtype=np.uint8)
    alpha = arr[:, :, 3]

    for r_idx, r in enumerate(row_configs):
        boxes = get_frame_boxes(alpha, r['y0'], r['y1'], x0, x1)
        if len(boxes) != expected_cols and not (loop_row3 and len(boxes) == 4):
            for candidate_thresh in [4, 3, 2, 5, 6, 1]:
                alt_boxes = get_frame_boxes(alpha, r['y0'], r['y1'], x0, x1, gap_thresh=candidate_thresh)
                if len(alt_boxes) == expected_cols or (loop_row3 and len(alt_boxes) == 4):
                    boxes = alt_boxes
                    break
        fy = r['feet_y']

        # Sequence of boxes (handle ping-pong loops for rows with fewer frames)
        if len(boxes) < expected_cols and loop_row3 and len(boxes) == 4:
            cycle = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3]
            frame_boxes = [boxes[cycle[i % len(cycle)]] for i in range(expected_cols)]
        elif len(boxes) == expected_cols:
            frame_boxes = boxes
        else:
            frame_boxes = [boxes[min(i, len(boxes)-1)] for i in range(expected_cols)]

        for c_idx, b in enumerate(frame_boxes):
            bx0, bx1 = b
            fw = bx1 - bx0
            target_col_x = c_idx * cell_size + (cell_size - fw) // 2

            sub_frame = arr[r['y0']:r['y1']+1, bx0:bx1]
            row_offset_y = r_idx * cell_size + (r['y0'] - fy + target_feet_y)

            for y_loc in range(sub_frame.shape[0]):
                dst_y = row_offset_y + y_loc
                if 0 <= dst_y < 4 * cell_size:
                    for x_loc in range(sub_frame.shape[1]):
                        dst_x = target_col_x + x_loc
                        if 0 <= dst_x < expected_cols * cell_size:
                            if sub_frame[y_loc, x_loc, 3] > 0:
                                sheet[dst_y, dst_x] = sub_frame[y_loc, x_loc]

    return Image.fromarray(sheet)


def process_character_sheet(input_path, char_name, out_dir='public/textures', cell_size=96, target_feet_y=74):
    os.makedirs(out_dir, exist_ok=True)
    raw_img = Image.open(input_path)
    raw_arr = np.array(raw_img)

    bg_type, bg_color = detect_background(raw_arr)
    print(f'Processing {input_path} (Format: {raw_img.format}, Size: {raw_img.size}, BG: {bg_type})')

    arr = clean_or_extract_alpha(raw_arr, bg_type, bg_color)
    alpha = arr[:, :, 3]

    w = arr.shape[1]
    mid_x = w // 2

    # Find clean split between left (IDLE/WALK) and right (ATTACK/WALK ATTACK) quadrants
    col_counts = (alpha > 0).sum(axis=0)
    zero_cols = [x for x in range(mid_x - 60, mid_x + 60) if col_counts[x] == 0]
    if len(zero_cols) > 0:
        split_x = int(np.median(zero_cols))
    else:
        window = col_counts[max(0, mid_x-60):min(w, mid_x+60)]
        split_x = max(0, mid_x-60) + int(np.argmin(window))
    print(f'Detected left/right quadrant split at x={split_x}')

    # Find row bands in top half and bottom half
    h = arr.shape[0]
    mid_y = h // 2

    top_y_proj = (alpha[:mid_y, :] > 0).sum(axis=1)
    bot_y_proj = (alpha[mid_y:, :] > 0).sum(axis=1)

    top_bands = find_row_bands(top_y_proj, min_count=30)
    bot_bands = find_row_bands(bot_y_proj, min_count=30)

    # Filter out text headers (headers appear at the very top of each half, b[0] < 50)
    top_char_bands = [b for b in top_bands if b[0] >= 50 and (b[1] - b[0] >= 35)]
    bot_char_bands = [b for b in bot_bands if b[0] >= 45 and (b[1] - b[0] >= 35)]

    if len(top_char_bands) < 4:
        print('Using standard top row coordinates fallback...')
        top_char_bands = [(60, 126), (133, 180), (199, 248), (266, 315)]
    if len(bot_char_bands) < 4:
        print('Using standard bot row coordinates fallback...')
        bot_char_bands = [(45, 112), (120, 170), (190, 241), (257, 307)]

    # Take first 4 character bands
    top_char_bands = top_char_bands[:4]
    bot_char_bands = bot_char_bands[:4]

    # Calculate baseline feet Y and extend y1 to include downward slashes
    def compute_row_configs(bands, y_offset=0, max_y=340):
        configs = []
        names = ['front', 'left', 'right', 'back']
        for i, (b0, b1) in enumerate(bands):
            y0 = b0 + y_offset
            # Extend y1 down to the start of the next band to capture full downward slash arcs
            if i + 1 < len(bands):
                y1 = bands[i + 1][0] + y_offset - 1
            else:
                y1 = max_y - 1

            # Feet Y is the median bottom-most non-zero alpha in left quadrant (IDLE/WALK)
            boxes = get_frame_boxes(alpha, y0, b1 + y_offset, 0, split_x)
            feet_ys = []
            for b in boxes:
                frame_sub = alpha[y0:b1+y_offset+1, b[0]:b[1]]
                ys, _ = np.where(frame_sub > 0)
                if len(ys) > 0:
                    feet_ys.append(y0 + ys.max())
            fy = int(round(np.median(feet_ys))) if len(feet_ys) > 0 else (b1 + y_offset - 2)
            configs.append({'name': names[i], 'y0': y0, 'y1': y1, 'feet_y': fy})
        return configs

    top_configs = compute_row_configs(top_char_bands, y_offset=0, max_y=mid_y)
    bot_configs = compute_row_configs(bot_char_bands, y_offset=mid_y, max_y=h)

    print('Top row configurations (including full slash extent):')
    for cfg in top_configs:
        print(f"  {cfg['name']}: y0={cfg['y0']}, y1={cfg['y1']}, feet_y={cfg['feet_y']}")

    print('Bottom row configurations (including full slash extent):')
    for cfg in bot_configs:
        print(f"  {cfg['name']}: y0={cfg['y0']}, y1={cfg['y1']}, feet_y={cfg['feet_y']}")

    # 1. IDLE (top-left, 10 cols)
    idle_sheet = build_sheet(arr, top_configs, 0, split_x, 10, target_feet_y, cell_size, loop_row3=True)
    idle_path = os.path.join(out_dir, f'{char_name}_idle.png')
    idle_sheet.save(idle_path)
    print(f'[OK] Generated IDLE: {idle_path} ({idle_sheet.size})')

    # 2. WALK (bottom-left, 6 cols)
    walk_sheet = build_sheet(arr, bot_configs, 0, split_x, 6, target_feet_y, cell_size)
    walk_path = os.path.join(out_dir, f'{char_name}_walk.png')
    walk_sheet.save(walk_path)
    print(f'[OK] Generated WALK: {walk_path} ({walk_sheet.size})')

    # 3. ATTACK (top-right, 8 cols)
    attack_sheet = build_sheet(arr, top_configs, split_x, w, 8, target_feet_y, cell_size)
    attack_path = os.path.join(out_dir, f'{char_name}_attack.png')
    attack_sheet.save(attack_path)
    print(f'[OK] Generated ATTACK: {attack_path} ({attack_sheet.size})')

    # 4. WALK ATTACK (bottom-right, 6 cols)
    walk_atk_sheet = build_sheet(arr, bot_configs, split_x, w, 6, target_feet_y, cell_size)
    walk_atk_path = os.path.join(out_dir, f'{char_name}_walk_attack.png')
    walk_atk_sheet.save(walk_atk_path)
    print(f'[OK] Generated WALK ATTACK: {walk_atk_path} ({walk_atk_sheet.size})')

    # 5. PORTRAIT (Front IDLE frame 0, 64x64)
    portrait = idle_sheet.crop((0, 0, cell_size, cell_size))
    # Resize portrait cleanly to 64x64 for UI avatar
    portrait_64 = portrait.resize((64, 64), Image.Resampling.LANCZOS)
    portrait_path = os.path.join(out_dir, f'{char_name}_front.png')
    portrait_64.save(portrait_path)
    print(f'[OK] Generated PORTRAIT: {portrait_path} ({portrait_64.size})')

    print(f'\nSuccess! All 5 expanded sprite textures generated for character "{char_name}".')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Extract and package 4-state animated character sprites.')
    parser.add_argument('--input', '-i', required=True, help='Path to composite sprite sheet image')
    parser.add_argument('--name', '-n', required=True, help='Character name prefix (e.g. hero_ronin)')
    parser.add_argument('--out-dir', '-o', default='public/textures', help='Output directory (default: public/textures)')
    parser.add_argument('--cell-size', type=int, default=96, help='Standard cell size in pixels (default: 96)')
    parser.add_argument('--feet-y', type=int, default=74, help='Feet anchor Y coordinate inside cell (default: 74)')
    args = parser.parse_args()

    process_character_sheet(
        input_path=args.input,
        char_name=args.name,
        out_dir=args.out_dir,
        cell_size=args.cell_size,
        target_feet_y=args.feet_y
    )
