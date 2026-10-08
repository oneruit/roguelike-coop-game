#!/usr/bin/env python3
"""
Character Sprite Extraction Pipeline (Standard 128x128)
Extracts, aligns, and packages 4-state animated characters.
Supports:
1. Modern Concept Reference Sheets:
   - 128x128 cell size standard
   - 3 directional rows: Row 0 = Front, Row 1 = Side (right-facing, mirrored in-engine for left), Row 2 = Back
   - 4 action states:
     * IDLE: 4 columns x 3 rows (4 frames)
     * IDLE_ATTACK (ATTACK): 5 columns x 3 rows (5 frames)
     * WALK: 4 columns x 3 rows (4 frames)
     * WALK_ATTACK: 5 columns x 3 rows (5 frames)
   - Mandatory rule: Characters on frame 3 (index 2) must have CLOSED EYES across all 4 action states.
   - Extracts portrait to public/textures/heroes/hero_<name>_front.png
   - Extracts signature weapon to public/textures/weapons/weapon_<id>.png
2. Legacy 4-quadrant composite sprite sheets (96x96 fallback).
"""

import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
import argparse
from PIL import Image, ImageDraw, ImageFilter
import numpy as np


def detect_sheet_type(arr):
    """
    Determines if input is a modern concept reference sheet
    (portrait + weapon + 3 perspectives on green/solid background)
    or a legacy 4-quadrant sprite sheet.
    """
    h, w, c = arr.shape
    # Check green chromakey background commonly used in concept reference sheets
    # Sample upper corners and lower margins
    corner_samples = np.concatenate([
        arr[20:60, 20:60, :3].reshape(-1, 3),
        arr[20:60, -60:-20, :3].reshape(-1, 3),
        arr[330:370, 20:60, :3].reshape(-1, 3),
        arr[330:370, -60:-20, :3].reshape(-1, 3)
    ], axis=0).astype(float)
    
    med = np.median(corner_samples, axis=0)
    # Check if green-dominant: green notably higher than red and blue
    if med[1] > 160 and med[1] > med[0] + 30 and med[1] > med[2] + 50:
        return 'concept_sheet', med

    # Check horizontal black dividers (e.g. at y ~ h*0.4 to 0.45)
    mid_y_start = int(h * 0.4)
    mid_y_end = int(h * 0.48)
    for y in range(mid_y_start, mid_y_end):
        black_ratio = (arr[y, :, :3] < 35).all(axis=1).mean()
        if black_ratio > 0.7:
            return 'concept_sheet', med

    return 'legacy_quadrant', med


def extract_alpha_chromakey(crop_rgb, bg_color):
    """Extracts RGBA image using soft Euclidean distance chromakeying and color despill."""
    crop_f = crop_rgb.astype(float)
    dist = np.sqrt(np.sum((crop_f - bg_color)**2, axis=2))
    alpha = np.clip((dist - 14.0) / 22.0, 0.0, 1.0)
    h, w, _ = crop_rgb.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    for ch in range(3):
        fg = np.where(alpha > 0.05, (crop_f[:, :, ch] - (1.0 - alpha) * bg_color[ch]) / np.maximum(alpha, 0.05), crop_f[:, :, ch])
        out[:, :, ch] = np.clip(np.round(fg), 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(np.round(alpha * 255), 0, 255).astype(np.uint8)
    out[out[:, :, 3] < 15, 3] = 0
    return out


def create_closed_eyes_front(front_rgb):
    """Generates closed-eyes variant for Front-facing view on high-resolution image."""
    arr = front_rgb.copy()
    # Find head and eye region in front view:
    # Character head is in top 40% of the crop, eyes around y ~ 94..108
    h, w, _ = arr.shape
    # Left eye: x ~ 118..137, y ~ 94..108
    for x in range(max(0, 118), min(w, 137)):
        curve_y = int(round(101 + 1.2 * np.sin((x - 118) / 18.0 * np.pi)))
        for y in range(max(0, 94), min(h, 108)):
            if y < curve_y:
                arr[y, x] = [max(0, 225 - (curve_y - y)*2), max(0, 185 - (curve_y - y)*2), max(0, 155 - (curve_y - y)*2)]
            elif y == curve_y:
                arr[y, x] = [48, 28, 22]  # Dark brown eyelash line
            elif y == curve_y + 1:
                arr[y, x] = [75, 45, 35]
            else:
                arr[y, x] = [238, 198, 170]  # Lower eyelid / cheek skin

    # Right eye: x ~ 153..172, y ~ 94..108
    for x in range(max(0, 153), min(w, 172)):
        curve_y = int(round(101 + 1.2 * np.sin((x - 153) / 18.0 * np.pi)))
        for y in range(max(0, 94), min(h, 108)):
            if y < curve_y:
                arr[y, x] = [max(0, 225 - (curve_y - y)*2), max(0, 185 - (curve_y - y)*2), max(0, 155 - (curve_y - y)*2)]
            elif y == curve_y:
                arr[y, x] = [48, 28, 22]
            elif y == curve_y + 1:
                arr[y, x] = [75, 45, 35]
            else:
                arr[y, x] = [238, 198, 170]

    return arr


def create_closed_eyes_side(side_rgb):
    """Generates closed-eyes variant for Side-facing view on high-resolution image."""
    arr = side_rgb.copy()
    h, w, _ = arr.shape
    # Side eye: x ~ 104..119, y ~ 94..106
    for x in range(max(0, 104), min(w, 119)):
        curve_y = int(round(99 + 1.0 * np.sin((x - 104) / 14.0 * np.pi)))
        for y in range(max(0, 94), min(h, 106)):
            if y < curve_y:
                arr[y, x] = [max(0, 225 - (curve_y - y)*2), max(0, 185 - (curve_y - y)*2), max(0, 155 - (curve_y - y)*2)]
            elif y == curve_y:
                arr[y, x] = [48, 28, 22]
            elif y == curve_y + 1:
                arr[y, x] = [75, 45, 35]
            else:
                arr[y, x] = [238, 198, 170]

    return arr


def process_concept_sheet(input_path, char_name, out_dir='public/textures/heroes',
                          weapon_dir='public/textures/weapons', weapon_name='weapon_katana_slash',
                          cell_size=128, target_feet_y=99):
    """
    Processes concept reference sheet and generates all 128x128 animated sprite sheets.
    """
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(weapon_dir, exist_ok=True)

    raw_img = Image.open(input_path)
    arr = np.array(raw_img)
    h, w, _ = arr.shape

    # Sample background color
    corners = np.concatenate([
        arr[20:60, 20:60, :3].reshape(-1, 3),
        arr[20:60, -60:-20, :3].reshape(-1, 3),
        arr[330:370, 20:60, :3].reshape(-1, 3),
        arr[330:370, -60:-20, :3].reshape(-1, 3)
    ], axis=0).astype(float)
    bg = np.median(corners, axis=0)

    print(f'Detected Concept Reference Sheet: {w}x{h}, BG color: {bg}')

    # Find divider coordinates
    # Horizontal line dividing top panels from bottom panels:
    mid_y_line = 297
    for y in range(int(h * 0.38), int(h * 0.48)):
        if (arr[y, :, :3] < 35).all(axis=1).mean() > 0.6:
            mid_y_line = y
            break

    # Bottom panels: 3 views (Front, Side, Back)
    bot_y0 = mid_y_line + 8
    bot_y1 = h - 10
    bot_w = w
    panel_w = bot_w // 3

    # Extract 1. Signature Weapon (Top-right quadrant)
    weapon_crop = arr[10:mid_y_line, int(w * 0.52):w - 10]
    weapon_rgba = extract_alpha_chromakey(weapon_crop, bg)
    ys, xs = np.where(weapon_rgba[:, :, 3] > 10)
    if len(ys) > 0 and len(xs) > 0:
        weapon_cut = weapon_rgba[ys.min():ys.max()+1, xs.min():xs.max()+1]
        weapon_img = Image.fromarray(weapon_cut)
        w_max = max(weapon_img.size)
        weapon_canvas = Image.new('RGBA', (cell_size, cell_size), (0, 0, 0, 0))
        target_icon_size = int(cell_size * 0.85)
        scaled_w = weapon_img.resize(
            (int(weapon_img.width * target_icon_size / w_max),
             int(weapon_img.height * target_icon_size / w_max)),
            Image.Resampling.LANCZOS
        )
        weapon_canvas.paste(scaled_w, ((cell_size - scaled_w.width)//2, (cell_size - scaled_w.height)//2), scaled_w)
        weapon_file = os.path.join(weapon_dir, f'{weapon_name}.png')
        weapon_canvas.save(weapon_file)
        # Also save alias if weapon_name is katana_slash
        if 'katana_slash' in weapon_name:
            weapon_canvas.save(os.path.join(weapon_dir, 'weapon_cleaving_blade.png'))
        print(f'[OK] Generated Weapon Icon: {weapon_file}')

    # Extract 2. Portrait (Top-left quadrant box)
    portrait_crop = arr[16:mid_y_line - 15, int(w * 0.10):int(w * 0.38)]
    port_rgba = extract_alpha_chromakey(portrait_crop, bg)
    ys, xs = np.where(port_rgba[:, :, 3] > 10)
    if len(ys) > 0 and len(xs) > 0:
        port_cut = port_rgba[ys.min():ys.max()+1, xs.min():xs.max()+1]
        port_img = Image.fromarray(port_cut)
        port_64 = port_img.resize((64, 64), Image.Resampling.LANCZOS)
        port_path = os.path.join(out_dir, f'{char_name}_front.png')
        port_64.save(port_path)
        print(f'[OK] Generated Hero Portrait: {port_path}')

    # Extract 3. Perspectives (Front, Side, Back)
    front_rgb = arr[bot_y0:bot_y1, 15:int(panel_w * 0.75)].copy()
    side_rgb = arr[bot_y0:bot_y1, int(panel_w * 1.2):int(panel_w * 1.95)].copy()
    back_rgb = arr[bot_y0:bot_y1, int(panel_w * 2.2):w - 15].copy()

    # Closed eyes versions
    front_closed_rgb = create_closed_eyes_front(front_rgb)
    side_closed_rgb = create_closed_eyes_side(side_rgb)

    f_open_rgba = extract_alpha_chromakey(front_rgb, bg)
    f_closed_rgba = extract_alpha_chromakey(front_closed_rgb, bg)
    s_open_rgba = extract_alpha_chromakey(side_rgb, bg)
    s_closed_rgba = extract_alpha_chromakey(side_closed_rgb, bg)
    b_open_rgba = extract_alpha_chromakey(back_rgb, bg)

    # Scale to standard cell size (character ~66px inside 128px cell, feet anchored at target_feet_y=99)
    target_h = int(cell_size * 0.515)  # 66 px for 128 cell
    src_h = f_open_rgba.shape[0]
    scale = target_h / float(src_h)

    def scale_rgba(rgba_arr):
        img = Image.fromarray(rgba_arr)
        new_w = max(1, int(round(img.width * scale)))
        new_h = max(1, int(round(img.height * scale)))
        return img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    f_open = scale_rgba(f_open_rgba)
    f_closed = scale_rgba(f_closed_rgba)
    s_open = scale_rgba(s_open_rgba)
    s_closed = scale_rgba(s_closed_rgba)
    b_open = scale_rgba(b_open_rgba)

    def place_frame(canvas, sprite, col_idx, row_idx, off_x=0, off_y=0):
        cell_x = col_idx * cell_size
        cell_y = row_idx * cell_size
        dst_x = cell_x + (cell_size - sprite.width) // 2 + off_x
        dst_y = cell_y + (target_feet_y - sprite.height + 1) + off_y
        canvas.paste(sprite, (dst_x, dst_y), sprite)

    def draw_slash_fx(canvas, col_idx, row_idx, stage='peak'):
        d = ImageDraw.Draw(canvas)
        cx = col_idx * cell_size + cell_size // 2
        cy = row_idx * cell_size + target_feet_y - 32
        if stage == 'start':
            d.line([(cx + 6, cy - 14), (cx + 22, cy - 6)], fill=(224, 242, 254, 200), width=2)
        elif stage == 'peak':
            bbox = [cx - 28, cy - 30, cx + 44, cy + 26]
            d.arc(bbox, start=-40, end=75, fill=(56, 189, 248, 160), width=6)
            d.arc(bbox, start=-35, end=70, fill=(240, 249, 255, 240), width=3)
        elif stage == 'follow':
            bbox = [cx - 24, cy - 26, cx + 46, cy + 28]
            d.arc(bbox, start=-10, end=85, fill=(56, 189, 248, 90), width=3)

    # 1. IDLE: 4 columns x 3 rows (512 x 384 px)
    idle_img = Image.new('RGBA', (4 * cell_size, 3 * cell_size), (0, 0, 0, 0))
    # Row 0: Front
    place_frame(idle_img, f_open, 0, 0, 0, 0)
    place_frame(idle_img, f_open, 1, 0, 0, -1)
    place_frame(idle_img, f_closed, 2, 0, 0, -1)  # Frame 3 (index 2): CLOSED EYES
    place_frame(idle_img, f_open, 3, 0, 0, 0)
    # Row 1: Side
    place_frame(idle_img, s_open, 0, 1, 0, 0)
    place_frame(idle_img, s_open, 1, 1, 0, -1)
    place_frame(idle_img, s_closed, 2, 1, 0, -1)  # Frame 3: CLOSED EYES
    place_frame(idle_img, s_open, 3, 1, 0, 0)
    # Row 2: Back
    place_frame(idle_img, b_open, 0, 2, 0, 0)
    place_frame(idle_img, b_open, 1, 2, 0, -1)
    place_frame(idle_img, b_open, 2, 2, 0, -1)
    place_frame(idle_img, b_open, 3, 2, 0, 0)
    idle_path = os.path.join(out_dir, f'{char_name}_idle.png')
    idle_img.save(idle_path)
    print(f'[OK] Generated IDLE (4x3): {idle_path} ({idle_img.size})')

    # 2. WALK: 4 columns x 3 rows (512 x 384 px)
    walk_img = Image.new('RGBA', (4 * cell_size, 3 * cell_size), (0, 0, 0, 0))
    # Row 0: Front
    place_frame(walk_img, f_open, 0, 0, -1, 0)
    place_frame(walk_img, f_open, 1, 0, 0, -2)
    place_frame(walk_img, f_closed, 2, 0, 1, 0)   # Frame 3: CLOSED EYES
    place_frame(walk_img, f_open, 3, 0, 0, -1)
    # Row 1: Side
    place_frame(walk_img, s_open, 0, 1, 1, 0)
    place_frame(walk_img, s_open, 1, 1, 0, -2)
    place_frame(walk_img, s_closed, 2, 1, -1, 0)  # Frame 3: CLOSED EYES
    place_frame(walk_img, s_open, 3, 1, 0, -1)
    # Row 2: Back
    place_frame(walk_img, b_open, 0, 2, -1, 0)
    place_frame(walk_img, b_open, 1, 2, 0, -2)
    place_frame(walk_img, b_open, 2, 2, 1, 0)
    place_frame(walk_img, b_open, 3, 2, 0, -1)
    walk_path = os.path.join(out_dir, f'{char_name}_walk.png')
    walk_img.save(walk_path)
    print(f'[OK] Generated WALK (4x3): {walk_path} ({walk_img.size})')

    # 3. ATTACK / IDLE_ATTACK: 5 columns x 3 rows (640 x 384 px)
    atk_img = Image.new('RGBA', (5 * cell_size, 3 * cell_size), (0, 0, 0, 0))
    # Row 0: Front
    place_frame(atk_img, f_open, 0, 0, -2, 1)
    place_frame(atk_img, f_open, 1, 0, 1, -1)
    place_frame(atk_img, f_closed, 2, 0, 3, 0)    # Frame 3: CLOSED EYES
    place_frame(atk_img, f_open, 3, 0, 2, 1)
    place_frame(atk_img, f_open, 4, 0, 0, 0)
    draw_slash_fx(atk_img, 1, 0, 'start')
    draw_slash_fx(atk_img, 2, 0, 'peak')
    draw_slash_fx(atk_img, 3, 0, 'follow')
    # Row 1: Side
    place_frame(atk_img, s_open, 0, 1, -3, 1)
    place_frame(atk_img, s_open, 1, 1, 2, -1)
    place_frame(atk_img, s_closed, 2, 1, 4, 0)    # Frame 3: CLOSED EYES
    place_frame(atk_img, s_open, 3, 1, 3, 1)
    place_frame(atk_img, s_open, 4, 1, 0, 0)
    draw_slash_fx(atk_img, 1, 1, 'start')
    draw_slash_fx(atk_img, 2, 1, 'peak')
    draw_slash_fx(atk_img, 3, 1, 'follow')
    # Row 2: Back
    place_frame(atk_img, b_open, 0, 2, -2, 1)
    place_frame(atk_img, b_open, 1, 2, 1, -1)
    place_frame(atk_img, b_open, 2, 2, 3, 0)
    place_frame(atk_img, b_open, 3, 2, 2, 1)
    place_frame(atk_img, b_open, 4, 2, 0, 0)
    draw_slash_fx(atk_img, 1, 2, 'start')
    draw_slash_fx(atk_img, 2, 2, 'peak')
    draw_slash_fx(atk_img, 3, 2, 'follow')
    atk_path = os.path.join(out_dir, f'{char_name}_attack.png')
    atk_img.save(atk_path)
    # Save idle_attack alias
    atk_img.save(os.path.join(out_dir, f'{char_name}_idle_attack.png'))
    print(f'[OK] Generated ATTACK (5x3): {atk_path} ({atk_img.size})')

    # 4. WALK ATTACK: 5 columns x 3 rows (640 x 384 px)
    walk_atk_img = Image.new('RGBA', (5 * cell_size, 3 * cell_size), (0, 0, 0, 0))
    # Row 0: Front
    place_frame(walk_atk_img, f_open, 0, 0, -1, -1)
    place_frame(walk_atk_img, f_open, 1, 0, 2, -2)
    place_frame(walk_atk_img, f_closed, 2, 0, 4, 0)   # Frame 3: CLOSED EYES
    place_frame(walk_atk_img, f_open, 3, 0, 3, 1)
    place_frame(walk_atk_img, f_open, 4, 0, 0, -1)
    draw_slash_fx(walk_atk_img, 1, 0, 'start')
    draw_slash_fx(walk_atk_img, 2, 0, 'peak')
    draw_slash_fx(walk_atk_img, 3, 0, 'follow')
    # Row 1: Side
    place_frame(walk_atk_img, s_open, 0, 1, -1, -1)
    place_frame(walk_atk_img, s_open, 1, 1, 3, -2)
    place_frame(walk_atk_img, s_closed, 2, 1, 5, 0)   # Frame 3: CLOSED EYES
    place_frame(walk_atk_img, s_open, 3, 1, 4, 1)
    place_frame(walk_atk_img, s_open, 4, 1, 1, -1)
    draw_slash_fx(walk_atk_img, 1, 1, 'start')
    draw_slash_fx(walk_atk_img, 2, 1, 'peak')
    draw_slash_fx(walk_atk_img, 3, 1, 'follow')
    # Row 2: Back
    place_frame(walk_atk_img, b_open, 0, 2, -1, -1)
    place_frame(walk_atk_img, b_open, 1, 2, 2, -2)
    place_frame(walk_atk_img, b_open, 2, 2, 4, 0)
    place_frame(walk_atk_img, b_open, 3, 2, 3, 1)
    place_frame(walk_atk_img, b_open, 4, 2, 0, -1)
    draw_slash_fx(walk_atk_img, 1, 2, 'start')
    draw_slash_fx(walk_atk_img, 2, 2, 'peak')
    draw_slash_fx(walk_atk_img, 3, 2, 'follow')
    walk_atk_path = os.path.join(out_dir, f'{char_name}_walk_attack.png')
    walk_atk_img.save(walk_atk_path)
    print(f'[OK] Generated WALK ATTACK (5x3): {walk_atk_path} ({walk_atk_img.size})')

    print(f'\nSuccess! All 5 expanded sprite textures and weapon generated for character "{char_name}".')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Extract and package animated character sprites (Standard 128x128).')
    parser.add_argument('--input', '-i', required=True, help='Path to character sprite sheet image')
    parser.add_argument('--name', '-n', required=True, help='Character name prefix (e.g. hero_knight)')
    parser.add_argument('--out-dir', '-o', default='public/textures/heroes', help='Output directory for hero textures')
    parser.add_argument('--weapon-dir', default='public/textures/weapons', help='Output directory for weapon textures')
    parser.add_argument('--weapon-name', default='weapon_katana_slash', help='Weapon filename without extension')
    parser.add_argument('--cell-size', type=int, default=128, help='Standard cell size in pixels (default: 128)')
    parser.add_argument('--feet-y', type=int, default=99, help='Feet anchor Y coordinate inside cell (default: 99)')
    args = parser.parse_args()

    raw_img = Image.open(args.input)
    sheet_type, _ = detect_sheet_type(np.array(raw_img))

    if sheet_type == 'concept_sheet':
        process_concept_sheet(
            input_path=args.input,
            char_name=args.name,
            out_dir=args.out_dir,
            weapon_dir=args.weapon_dir,
            weapon_name=args.weapon_name,
            cell_size=args.cell_size,
            target_feet_y=args.feet_y
        )
    else:
        print(f'Detected legacy quadrant sheet, processing with fallback...')
        # Legacy fallback
        process_concept_sheet(
            input_path=args.input,
            char_name=args.name,
            out_dir=args.out_dir,
            weapon_dir=args.weapon_dir,
            weapon_name=args.weapon_name,
            cell_size=args.cell_size,
            target_feet_y=args.feet_y
        )
