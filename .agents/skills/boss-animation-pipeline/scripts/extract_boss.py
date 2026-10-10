#!/usr/bin/env python3
"""
Boss Animation Pipeline - Sprite Extraction Tool
Extracts, aligns, mirrors, and packages 2-state animated bosses (WALK, ATTACK across 4 directional rows).
Standardized to 160x160 cell size to accommodate extended claws and slash fx arcs.

Layout of output sprite sheets (960x640 px: 6 columns x 4 rows):
- Row 0: Front (facing down towards player)
- Row 1: Left  (mirrored Right row)
- Row 2: Right (facing right)
- Row 3: Back  (facing up away from player)
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


def detect_and_clean_alpha(img_arr):
    """Detects background and returns clean RGBA numpy array."""
    h, w, c = img_arr.shape
    if c == 4:
        alpha = img_arr[:, :, 3]
        if (alpha == 0).mean() > 0.10:
            arr = img_arr.copy()
            arr[arr[:, :, 3] < 12, 3] = 0
            return arr

    # Sample corners to determine background color
    corners = np.concatenate([
        img_arr[0:20, 0:20, :3].reshape(-1, 3),
        img_arr[0:20, -20:, :3].reshape(-1, 3),
        img_arr[-20:, 0:20, :3].reshape(-1, 3),
        img_arr[-20:, -20:, :3].reshape(-1, 3)
    ], axis=0).astype(float)

    bg_color = np.median(corners, axis=0)
    rgb = img_arr[:, :, :3].astype(float)
    dist = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=-1))
    alpha = np.clip((dist - 12.0) / 20.0, 0.0, 1.0)
    out = np.zeros((h, w, 4), dtype=np.uint8)
    for ch in range(3):
        fg = np.where(alpha > 0.05, (rgb[:, :, ch] - (1.0 - alpha) * bg_color[ch]) / np.maximum(alpha, 0.05), rgb[:, :, ch])
        out[:, :, ch] = np.clip(np.round(fg), 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(np.round(alpha * 255), 0, 255).astype(np.uint8)
    out[out[:, :, 3] < 18, 3] = 0
    return out


def find_sprites_left_bound(alpha):
    """Finds the X coordinate where character sprites begin, skipping left badges/labels."""
    x_sum = (alpha > 10).sum(axis=0)
    # The badge labels usually occupy x < 120, followed by an empty gap where sum is 0
    # Search for an empty gutter between x=60 and x=150
    min_x = 0
    min_val = 999999
    for x in range(70, min(160, len(x_sum))):
        if x_sum[x] < min_val:
            min_val = x_sum[x]
            min_x = x
        if x_sum[x] == 0:
            return x + 1
    return min_x + 1


def find_row_spans(alpha, x_start, expected_rows=6):
    """Detects vertical row spans for Walk and Attack states."""
    sub_alpha = alpha[:, x_start:] > 10
    row_sums = sub_alpha.sum(axis=1)

    in_row = False
    start = 0
    spans = []
    threshold = 12
    for y, s in enumerate(row_sums):
        if s >= threshold and not in_row:
            in_row = True
            start = y
        elif s < threshold and in_row:
            in_row = False
            if y - start > 30:  # Minimum valid character row height
                spans.append((start, y))
    if in_row and (len(row_sums) - start > 30):
        spans.append((start, len(row_sums)))

    if len(spans) != expected_rows:
        # Try adaptive thresholds if needed
        for alt_thresh in [8, 15, 20, 25, 6]:
            spans = []
            in_row = False
            for y, s in enumerate(row_sums):
                if s >= alt_thresh and not in_row:
                    in_row = True
                    start = y
                elif s < alt_thresh and in_row:
                    in_row = False
                    if y - start > 30:
                        spans.append((start, y))
            if in_row and (len(row_sums) - start > 30):
                spans.append((start, len(row_sums)))
            if len(spans) == expected_rows:
                break

    return spans


def extract_frame_boxes(alpha, y0, y1, x_start, expected_cols=6):
    """Finds horizontal bounding boxes for individual sprite frames within a row."""
    sub = (alpha[y0:y1+1, x_start:] > 10)
    cols = sub.sum(axis=0)

    for gap_thresh in [4, 3, 2, 5, 6, 1, 8]:
        in_box = False
        start_x = 0
        gap = 0
        boxes = []
        for x, v in enumerate(cols):
            if v > 0:
                if not in_box:
                    in_box = True
                    start_x = x
                gap = 0
            else:
                if in_box:
                    gap += 1
                    if gap >= gap_thresh:
                        in_box = False
                        end_x = x - gap + 1
                        if end_x - start_x > 15:
                            boxes.append((x_start + start_x, x_start + end_x))
        if in_box:
            end_x = len(cols) - gap
            if end_x - start_x > 15:
                boxes.append((x_start + start_x, x_start + end_x))

        if len(boxes) == expected_cols:
            return boxes

    # If could not find exact count, return whatever was found with gap_thresh=3
    return boxes


def process_row_frames(arr, y0, y1, boxes, cell_size=160, target_feet_y=136):
    """Extracts, anchors, and centers frames in standard cell_size x cell_size cells."""
    alpha = arr[:, :, 3]
    frames = []

    for b in boxes:
        sub_arr = arr[y0:y1+1, b[0]:b[1]]
        sub_alpha = sub_arr[:, :, 3] > 10
        y_idx, x_idx = np.where(sub_alpha)
        if len(y_idx) == 0:
            frames.append(np.zeros((cell_size, cell_size, 4), dtype=np.uint8))
            continue

        ymin, ymax = y_idx.min(), y_idx.max()
        xmin, xmax = x_idx.min(), x_idx.max()
        cropped = sub_arr[ymin:ymax+1, xmin:xmax+1]

        crop_alpha = cropped[:, :, 3] > 10
        h, w = cropped.shape[:2]

        # Baseline feet anchor: bottom-most pixel
        feet_y_rel = h - 1

        # Body center: use hip / center-mass
        hip = crop_alpha[int(h * 0.45):int(h * 0.85), :]
        hy, hx = np.where(hip)
        if len(hx) > 0:
            body_center_x = np.mean(hx)
        else:
            body_center_x = w / 2.0

        cell = np.zeros((cell_size, cell_size, 4), dtype=np.uint8)
        dest_y = target_feet_y - feet_y_rel
        dest_x = int(round(cell_size / 2.0 - body_center_x))

        src_y0 = max(0, -dest_y)
        src_x0 = max(0, -dest_x)
        src_y1 = min(h, cell_size - dest_y)
        src_x1 = min(w, cell_size - dest_x)

        dy0 = dest_y + src_y0
        dx0 = dest_x + src_x0
        dy1 = dy0 + (src_y1 - src_y0)
        dx1 = dx0 + (src_x1 - src_x0)

        cell[dy0:dy1, dx0:dx1] = cropped[src_y0:src_y1, src_x0:src_x1]
        frames.append(cell)

    return frames


def build_4row_sheet(front_frames, right_frames, back_frames, cell_size=160, cols=6):
    """
    Constructs a 4-directional sprite sheet (cols x 4 rows):
    Row 0: Front
    Row 1: Left (mirrored Right)
    Row 2: Right
    Row 3: Back
    """
    left_frames = [np.fliplr(f) for f in right_frames]

    sheet = np.zeros((4 * cell_size, cols * cell_size, 4), dtype=np.uint8)
    for c in range(cols):
        if c < len(front_frames):
            sheet[0*cell_size:1*cell_size, c*cell_size:(c+1)*cell_size] = front_frames[c]
        if c < len(left_frames):
            sheet[1*cell_size:2*cell_size, c*cell_size:(c+1)*cell_size] = left_frames[c]
        if c < len(right_frames):
            sheet[2*cell_size:3*cell_size, c*cell_size:(c+1)*cell_size] = right_frames[c]
        if c < len(back_frames):
            sheet[3*cell_size:4*cell_size, c*cell_size:(c+1)*cell_size] = back_frames[c]

    return sheet


def extract_boss(input_path, name, out_dir, cell_size=160, target_feet_y=136, cols=6):
    print(f"Loading {input_path}...")
    img = Image.open(input_path).convert('RGBA')
    arr = np.array(img)
    arr = detect_and_clean_alpha(arr)
    alpha = arr[:, :, 3]

    x_start = find_sprites_left_bound(alpha)
    print(f"Detected character sprites start at X = {x_start}")

    spans = find_row_spans(alpha, x_start, expected_rows=6)
    print(f"Found {len(spans)} row spans: {spans}")

    if len(spans) < 6:
        raise ValueError(f"Expected 6 rows in boss sheet (3 walk + 3 attack), but detected {len(spans)}")

    # Map rows according to specification:
    # Walk:
    # 0: Right (Walk Right)
    # 1: Front (Walk Front)
    # 2: Back  (Walk Back)
    # Attack:
    # 3: Right (Attack Right)
    # 4: Front (Attack Front)
    # 5: Back  (Attack Back)
    row_names = [
        'Walk Right', 'Walk Front', 'Walk Back',
        'Attack Right', 'Attack Front', 'Attack Back'
    ]

    extracted_rows = []
    for idx, (y0, y1) in enumerate(spans[:6]):
        boxes = extract_frame_boxes(alpha, y0, y1, x_start, expected_cols=cols)
        print(f"Row {idx} ({row_names[idx]}): detected {len(boxes)} frame boxes")
        frames = process_row_frames(arr, y0, y1, boxes, cell_size=cell_size, target_feet_y=target_feet_y)
        extracted_rows.append(frames)

    walk_right = extracted_rows[0]
    walk_front = extracted_rows[1]
    walk_back  = extracted_rows[2]

    attack_right = extracted_rows[3]
    attack_front = extracted_rows[4]
    attack_back  = extracted_rows[5]

    # Build 4-directional sheets
    walk_sheet = build_4row_sheet(walk_front, walk_right, walk_back, cell_size=cell_size, cols=cols)
    attack_sheet = build_4row_sheet(attack_front, attack_right, attack_back, cell_size=cell_size, cols=cols)

    os.makedirs(out_dir, exist_ok=True)

    walk_path = os.path.join(out_dir, f"{name}_walk.png")
    attack_path = os.path.join(out_dir, f"{name}_attack.png")

    Image.fromarray(walk_sheet).save(walk_path)
    Image.fromarray(attack_sheet).save(attack_path)

    # Save directional portraits / fallback frames (Front, Left, Right, Back)
    Image.fromarray(walk_front[0]).save(os.path.join(out_dir, f"{name}_front.png"))
    Image.fromarray(np.fliplr(walk_right[0])).save(os.path.join(out_dir, f"{name}_left.png"))
    Image.fromarray(walk_right[0]).save(os.path.join(out_dir, f"{name}_right.png"))
    Image.fromarray(walk_back[0]).save(os.path.join(out_dir, f"{name}_back.png"))

    print(f"Successfully generated:")
    print(f"  - {walk_path} ({walk_sheet.shape[1]}x{walk_sheet.shape[0]})")
    print(f"  - {attack_path} ({attack_sheet.shape[1]}x{attack_sheet.shape[0]})")
    print(f"  - Directional fallbacks & portraits: {name}_front.png, left, right, back")

    # If dist directory exists, sync them as well
    dist_dir = os.path.join("dist", "textures")
    if os.path.exists("dist") and os.path.isdir("dist"):
        os.makedirs(dist_dir, exist_ok=True)
        for fname in [f"{name}_walk.png", f"{name}_attack.png", f"{name}_front.png", f"{name}_left.png", f"{name}_right.png", f"{name}_back.png"]:
            src = os.path.join(out_dir, fname)
            dst = os.path.join(dist_dir, fname)
            if os.path.exists(src):
                Image.open(src).save(dst)
        print(f"  - Synced textures to {dist_dir}")


def main():
    parser = argparse.ArgumentParser(description="Boss Sprite Extraction Pipeline")
    parser.add_argument("--input", required=True, help="Path to input composite boss sprite sheet")
    parser.add_argument("--name", default="boss_demon", help="Base name for exported textures (e.g. boss_demon)")
    parser.add_argument("--out-dir", default="public/textures", help="Output directory for generated textures")
    parser.add_argument("--cell-size", type=int, default=160, help="Standardized cell width and height in px")
    parser.add_argument("--feet-y", type=int, default=136, help="Target feet baseline Y in cell (0 to cell-size)")
    parser.add_argument("--cols", type=int, default=6, help="Number of frames per row")

    args = parser.parse_args()
    extract_boss(
        input_path=args.input,
        name=args.name,
        out_dir=args.out_dir,
        cell_size=args.cell_size,
        target_feet_y=args.feet_y,
        cols=args.cols
    )


if __name__ == "__main__":
    main()
