#!/usr/bin/env python3
"""
Custom Archer Sprite Sheet Generator
Generates full 4-state sprite sheets (IDLE, WALK, ATTACK, WALK_ATTACK across 4 directions)
for Elf Archer equipped with an authentic wooden recurve bow, arrows, and quiver.
Completely eliminates all traces of chakrams, circular melee swings, and slash trails.
"""

import os
import sys
import numpy as np
from PIL import Image

def clean_frame(cell, row_idx):
    cell = cell.copy()
    h, w, _ = cell.shape
    for y in range(h):
        for x in range(w):
            if cell[y, x, 3] < 15 or y < 33 or y > 75:
                cell[y, x] = [0, 0, 0, 0]
                continue

            # 1. Fully protect the feet and boots across all rows and animation phases
            if 31 <= x <= 62 and 69 <= y <= 75:
                continue

            # 2. Fully protect the core head and torso
            if 41 <= x <= 55 and 34 <= y <= 68:
                continue

            # 3. Clean row-specific chakram wheel positions from Kira's hands
            if row_idx == 0:
                # Front view: chakram held on viewer's left side (x <= 36, y in 54..70)
                if x <= 36 and 54 <= y <= 70:
                    cell[y, x] = [0, 0, 0, 0]
                    continue
            elif row_idx == 1:
                # Left view: chakram held in forward hand (x <= 37, y in 54..70)
                if x <= 37 and 54 <= y <= 70:
                    cell[y, x] = [0, 0, 0, 0]
                    continue
            elif row_idx in (2, 3):
                # Right and Back view: chakram held on right side (x >= 57, y in 54..70)
                if x >= 57 and 54 <= y <= 70:
                    cell[y, x] = [0, 0, 0, 0]
                    continue

            # 4. Remove any stray outer weapon / metallic / bright debris
            r, g, b, a = cell[y, x]
            sat = max(abs(int(r)-int(g)), abs(int(g)-int(b)), abs(int(r)-int(b)))
            lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0

            if (x < 36 or x > 60) and (sat < 28 or lum > 0.45):
                cell[y, x] = [0, 0, 0, 0]
                continue

            if x < 33 or x > 63:
                cell[y, x] = [0, 0, 0, 0]
                continue

    return cell

def recolor_elf(cell, row_idx):
    cell = cell.copy()
    h, w, _ = cell.shape
    for y in range(h):
        for x in range(w):
            r, g, b, a = cell[y, x]
            if a < 20:
                continue
            lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0
            is_skin = (r > 185 and g > 125 and b > 85 and r > g and g > b)

            # Hair -> Golden blonde elf locks
            if y < 62 and r > 125 and r > g * 1.12 and b < 105:
                new_r = int(185 + lum * 70)
                new_g = int(145 + lum * 105)
                new_b = int(32 + lum * 65)
                cell[y, x] = [min(255, new_r), min(255, new_g), min(255, new_b), a]
                continue

            # Clothes / Tunic / Boots
            if y >= 48 and not is_skin and (r > 20 or g > 20 or b > 20):
                if y < 69:
                    # Forest emerald green tunic
                    new_r = int(16 + lum * 36)
                    new_g = int(85 + lum * 125)
                    new_b = int(26 + lum * 48)
                    if lum > 0.42 and (x in (48, 52) or y == 56):
                        # Gold trim embroidery
                        new_r, new_g, new_b = 225, 185, 45
                else:
                    # Leather boots
                    new_r = int(75 + lum * 55)
                    new_g = int(48 + lum * 32)
                    new_b = int(26 + lum * 22)
                cell[y, x] = [min(255, new_r), min(255, new_g), min(255, new_b), a]

    # Pointed elf ears
    if row_idx == 0:
        cell[46, 42] = [235, 175, 125, 255]
        cell[47, 41] = [245, 190, 140, 255]
        cell[46, 63] = [235, 175, 125, 255]
        cell[47, 64] = [245, 190, 140, 255]
    elif row_idx == 1:
        cell[46, 58] = [245, 190, 140, 255]
        cell[45, 59] = [235, 175, 125, 255]
    elif row_idx == 2:
        cell[46, 44] = [245, 190, 140, 255]
        cell[45, 43] = [235, 175, 125, 255]

    return cell

def draw_bow_front(cell, phase):
    """Row 0: Front View (Facing South / Camera) - Bow aims/shoots DOWN towards camera"""
    # Quiver on right shoulder with arrows
    cell[43, 44] = [255, 255, 255, 255]
    cell[44, 43] = [255, 255, 255, 255]
    cell[45, 44] = [130, 70, 20, 255]
    cell[46, 44] = [110, 55, 15, 255]

    if phase == 'ready':
        # Resting bow at side
        for by in range(49, 77):
            curve = int(3.5 * np.sin((by - 49) / 28.0 * np.pi))
            bx = 38 - curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by, bx + 1] = [190, 115, 35, 255]
            cell[by, 39] = [230, 230, 235, 200]
        # Hand wrapping bow grip
        cell[61, 38] = [160, 100, 40, 255]
        cell[62, 38] = [235, 175, 125, 255]

    elif phase == 'aim':
        # Bow raised horizontally across chest
        for bx in range(35, 62):
            curve = int(3.0 * np.sin((bx - 35) / 27.0 * np.pi))
            by = 55 + curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by - 1, bx] = [190, 115, 35, 255]
            cell[54, bx] = [230, 230, 235, 200]
        cell[57, 48] = [235, 175, 125, 255]
        cell[53, 48] = [235, 175, 125, 255]

    elif phase == 'nock':
        # Bow held across chest, arrow placed pointing DOWN
        for bx in range(34, 63):
            curve = int(3.5 * np.sin((bx - 34) / 29.0 * np.pi))
            by = 56 + curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by - 1, bx] = [190, 115, 35, 255]
            cell[54, bx] = [230, 230, 235, 200]
        # Arrow shaft along x=48 pointing DOWN
        for ay in range(50, 64):
            cell[ay, 48] = [180, 95, 22, 255]
        # Arrowhead
        cell[64, 48] = [255, 255, 255, 255]
        cell[63, 47] = [230, 230, 235, 255]
        cell[63, 49] = [230, 230, 235, 255]
        # Fletching
        cell[50, 47] = [245, 245, 250, 255]
        cell[50, 49] = [245, 245, 250, 255]
        # Hands
        cell[58, 48] = [235, 175, 125, 255]
        cell[51, 48] = [235, 175, 125, 255]

    elif phase == 'draw':
        # FULL DRAW: Stave bends downward, string drawn UP towards chin
        for bx in range(33, 64):
            curve = int(5.0 * np.sin((bx - 33) / 31.0 * np.pi))
            by = 58 + curve
            cell[by, bx] = [130, 65, 15, 255]
            cell[by - 1, bx] = [200, 125, 40, 255]
            if bx <= 48:
                sy = int(58 - (58 - 47) * (bx - 33) / 15.0)
            else:
                sy = int(47 + (58 - 47) * (bx - 48) / 15.0)
            cell[sy, bx] = [240, 240, 245, 220]
        # Arrow shaft
        for ay in range(47, 66):
            cell[ay, 48] = [190, 100, 25, 255]
        # Arrowhead
        cell[67, 48] = [255, 255, 255, 255]
        cell[66, 47] = [255, 255, 255, 255]
        cell[66, 49] = [255, 255, 255, 255]
        # Fletchings
        cell[47, 47] = [240, 240, 250, 255]
        cell[47, 49] = [240, 240, 250, 255]
        # Hands
        cell[61, 48] = [235, 175, 125, 255]
        cell[46, 48] = [245, 185, 135, 255]

    elif phase == 'release':
        # RELEASE: String snaps forward, arrow shoots DOWN towards camera
        for bx in range(34, 63):
            curve = int(3.5 * np.sin((bx - 34) / 29.0 * np.pi))
            by = 56 + curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by - 1, bx] = [190, 115, 35, 255]
            cell[55, bx] = [235, 235, 240, 210]
        # Flying arrow
        for ay in range(68, 87):
            cell[ay, 48] = [210, 120, 30, 255]
        cell[88, 48] = [255, 255, 255, 255]
        cell[87, 47] = [255, 255, 255, 255]
        cell[87, 49] = [255, 255, 255, 255]
        cell[68, 47] = [255, 255, 255, 255]
        cell[68, 49] = [255, 255, 255, 255]
        # Speed streak behind arrow
        for ay in range(56, 68):
            cell[ay, 48] = [240, 220, 140, 180]

    elif phase == 'recoil':
        # RECOIL & ARROW SPEED STREAK
        for bx in range(35, 62):
            curve = int(3.0 * np.sin((bx - 35) / 27.0 * np.pi))
            by = 56 + curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by - 1, bx] = [190, 115, 35, 255]
            cell[55, bx] = [230, 230, 235, 200]
        # Arrow streak speeding down offscreen
        for ay in range(80, 96):
            cell[ay, 48] = [255, 235, 160, 255]
        for ay in range(86, 96):
            cell[ay, 47] = [240, 210, 120, 180]
            cell[ay, 49] = [240, 210, 120, 180]

def draw_bow_left(cell, phase):
    """Row 1: Left View (Facing West) - Bow aims/shoots LEFT"""
    # Quiver on back
    cell[44, 56] = [255, 255, 255, 255]
    cell[45, 57] = [130, 70, 20, 255]
    cell[43, 58] = [255, 255, 255, 255]

    if phase == 'ready':
        for by in range(48, 76):
            curve = int(3.0 * np.sin((by - 48) / 27.0 * np.pi))
            bx = 36 - curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by, bx + 1] = [190, 115, 35, 255]
            cell[by, 37] = [230, 230, 235, 200]
        cell[60, 36] = [235, 175, 125, 255]

    elif phase in ('aim', 'nock'):
        for by in range(46, 76):
            curve = int(4.0 * np.sin((by - 46) / 29.0 * np.pi))
            bx = 33 - curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by, bx + 1] = [190, 115, 35, 255]
            cell[by, 34] = [230, 230, 235, 200]
        cell[58, 33] = [235, 175, 125, 255]
        if phase == 'nock':
            for ax in range(30, 48):
                cell[58, ax] = [180, 90, 20, 255]
            cell[58, 29] = [255, 255, 255, 255]
            cell[57, 30] = [230, 230, 235, 255]
            cell[59, 30] = [230, 230, 235, 255]
            cell[57, 47] = [245, 245, 250, 255]
            cell[59, 47] = [245, 245, 250, 255]
            cell[58, 48] = [235, 175, 125, 255]

    elif phase == 'draw':
        for by in range(44, 76):
            curve = int(5.0 * np.sin((by - 44) / 31.0 * np.pi))
            bx = 31 - curve
            cell[by, bx] = [130, 65, 15, 255]
            cell[by, bx + 1] = [200, 125, 40, 255]
            if by <= 58:
                sx = int(31 + (45 - 31) * (by - 44) / 14.0)
            else:
                sx = int(45 - (45 - 31) * (by - 58) / 17.0)
            cell[by, sx] = [240, 240, 245, 220]
        # Arrow shaft
        for ax in range(25, 46):
            cell[58, ax] = [190, 100, 25, 255]
        cell[58, 24] = [255, 255, 255, 255]
        cell[57, 25] = [255, 255, 255, 255]
        cell[59, 25] = [255, 255, 255, 255]
        cell[57, 46] = [240, 240, 250, 255]
        cell[59, 46] = [240, 240, 250, 255]
        cell[58, 30] = [235, 175, 125, 255]
        cell[58, 46] = [245, 185, 135, 255]

    elif phase == 'release':
        for by in range(45, 75):
            curve = int(3.0 * np.sin((by - 45) / 29.0 * np.pi))
            bx = 32 - curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by, bx + 1] = [190, 115, 35, 255]
            cell[by, 33] = [235, 235, 240, 210]
        for ax in range(10, 28):
            cell[58, ax] = [210, 120, 30, 255]
        cell[58, 8] = [255, 255, 255, 255]
        cell[57, 9] = [255, 255, 255, 255]
        cell[59, 9] = [255, 255, 255, 255]
        cell[57, 28] = [255, 255, 255, 255]
        cell[59, 28] = [255, 255, 255, 255]
        for ax in range(29, 36):
            cell[58, ax] = [240, 220, 140, 180]

    elif phase == 'recoil':
        for by in range(46, 75):
            curve = int(3.0 * np.sin((by - 46) / 28.0 * np.pi))
            bx = 33 - curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by, bx + 1] = [190, 115, 35, 255]
            cell[by, 34] = [230, 230, 235, 200]
        for ax in range(0, 16):
            cell[58, ax] = [255, 235, 160, 255]
        for ax in range(0, 10):
            cell[57, ax] = [240, 210, 120, 180]
            cell[59, ax] = [240, 210, 120, 180]

def draw_bow_right(cell, phase):
    """Row 2: Right View (Facing East) - Bow aims/shoots RIGHT"""
    # Quiver on back
    cell[44, 40] = [255, 255, 255, 255]
    cell[45, 39] = [130, 70, 20, 255]
    cell[43, 38] = [255, 255, 255, 255]

    if phase == 'ready':
        for by in range(48, 76):
            curve = int(3.0 * np.sin((by - 48) / 27.0 * np.pi))
            bx = 59 + curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by, bx - 1] = [190, 115, 35, 255]
            cell[by, 58] = [230, 230, 235, 200]
        cell[60, 59] = [235, 175, 125, 255]

    elif phase in ('aim', 'nock'):
        for by in range(46, 76):
            curve = int(4.0 * np.sin((by - 46) / 29.0 * np.pi))
            bx = 62 + curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by, bx - 1] = [190, 115, 35, 255]
            cell[by, 61] = [230, 230, 235, 200]
        cell[58, 62] = [235, 175, 125, 255]
        if phase == 'nock':
            for ax in range(48, 66):
                cell[58, ax] = [180, 90, 20, 255]
            cell[58, 67] = [255, 255, 255, 255]
            cell[57, 66] = [230, 230, 235, 255]
            cell[59, 66] = [230, 230, 235, 255]
            cell[57, 49] = [245, 245, 250, 255]
            cell[59, 49] = [245, 245, 250, 255]
            cell[58, 48] = [235, 175, 125, 255]

    elif phase == 'draw':
        for by in range(44, 76):
            curve = int(5.0 * np.sin((by - 44) / 31.0 * np.pi))
            bx = 64 + curve
            cell[by, bx] = [130, 65, 15, 255]
            cell[by, bx - 1] = [200, 125, 40, 255]
            if by <= 58:
                sx = int(64 - (64 - 51) * (by - 44) / 14.0)
            else:
                sx = int(51 + (64 - 51) * (by - 58) / 17.0)
            cell[by, sx] = [240, 240, 245, 220]
        # Arrow shaft
        for ax in range(50, 71):
            cell[58, ax] = [190, 100, 25, 255]
        cell[58, 72] = [255, 255, 255, 255]
        cell[57, 71] = [255, 255, 255, 255]
        cell[59, 71] = [255, 255, 255, 255]
        cell[57, 49] = [240, 240, 250, 255]
        cell[59, 49] = [240, 240, 250, 255]
        cell[58, 63] = [235, 175, 125, 255]
        cell[58, 50] = [245, 185, 135, 255]

    elif phase == 'release':
        for by in range(45, 75):
            curve = int(3.0 * np.sin((by - 45) / 29.0 * np.pi))
            bx = 63 + curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by, bx - 1] = [190, 115, 35, 255]
            cell[by, 62] = [235, 235, 240, 210]
        for ax in range(68, 86):
            cell[58, ax] = [210, 120, 30, 255]
        cell[58, 88] = [255, 255, 255, 255]
        cell[57, 87] = [255, 255, 255, 255]
        cell[59, 87] = [255, 255, 255, 255]
        cell[57, 68] = [255, 255, 255, 255]
        cell[59, 68] = [255, 255, 255, 255]
        for ax in range(60, 68):
            cell[58, ax] = [240, 220, 140, 180]

    elif phase == 'recoil':
        for by in range(46, 75):
            curve = int(3.0 * np.sin((by - 46) / 28.0 * np.pi))
            bx = 62 + curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by, bx - 1] = [190, 115, 35, 255]
            cell[by, 61] = [230, 230, 235, 200]
        for ax in range(80, 96):
            cell[58, ax] = [255, 235, 160, 255]
        for ax in range(86, 96):
            cell[57, ax] = [240, 210, 120, 180]
            cell[59, ax] = [240, 210, 120, 180]

def draw_bow_back(cell, phase):
    """Row 3: Back View (Facing North / Away) - Bow aims/shoots UP"""
    # Quiver diagonally across back
    for qy in range(44, 58):
        qx = int(44 + (qy - 44) * 0.4)
        cell[qy, qx] = [110, 50, 15, 255]
        cell[qy, qx + 1] = [160, 85, 25, 255]
    cell[41, 43] = [255, 255, 255, 255]
    cell[42, 45] = [255, 255, 255, 255]
    cell[43, 47] = [255, 255, 255, 255]

    if phase == 'ready':
        for by in range(48, 76):
            curve = int(3.0 * np.sin((by - 48) / 27.0 * np.pi))
            bx = 38 - curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by, bx + 1] = [190, 115, 35, 255]
            cell[by, 39] = [230, 230, 235, 200]

    elif phase in ('aim', 'nock'):
        for bx in range(35, 62):
            curve = int(3.0 * np.sin((bx - 35) / 26.0 * np.pi))
            by = 44 - curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by + 1, bx] = [190, 115, 35, 255]
            cell[45, bx] = [230, 230, 235, 200]
        if phase == 'nock':
            for ay in range(40, 55):
                cell[ay, 48] = [180, 90, 20, 255]
            cell[39, 48] = [255, 255, 255, 255]
            cell[40, 47] = [230, 230, 235, 255]
            cell[40, 49] = [230, 230, 235, 255]
            cell[54, 47] = [245, 245, 250, 255]
            cell[54, 49] = [245, 245, 250, 255]

    elif phase == 'draw':
        for bx in range(33, 64):
            curve = int(4.0 * np.sin((bx - 33) / 30.0 * np.pi))
            by = 42 - curve
            cell[by, bx] = [130, 65, 15, 255]
            cell[by + 1, bx] = [200, 125, 40, 255]
            if bx <= 48:
                sy = int(42 + (54 - 42) * (bx - 33) / 15.0)
            else:
                sy = int(54 - (54 - 42) * (bx - 48) / 15.0)
            cell[sy, bx] = [240, 240, 245, 220]
        # Arrow shaft
        for ay in range(34, 54):
            cell[ay, 48] = [190, 100, 25, 255]
        cell[33, 48] = [255, 255, 255, 255]
        cell[34, 47] = [255, 255, 255, 255]
        cell[34, 49] = [255, 255, 255, 255]
        cell[54, 47] = [255, 255, 255, 255]
        cell[54, 49] = [255, 255, 255, 255]

    elif phase == 'release':
        for bx in range(34, 63):
            curve = int(3.0 * np.sin((bx - 34) / 28.0 * np.pi))
            by = 43 - curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by + 1, bx] = [190, 115, 35, 255]
            cell[44, bx] = [235, 235, 240, 210]
        for ay in range(16, 36):
            cell[ay, 48] = [210, 120, 30, 255]
        cell[14, 48] = [255, 255, 255, 255]
        cell[15, 47] = [255, 255, 255, 255]
        cell[15, 49] = [255, 255, 255, 255]
        cell[36, 47] = [255, 255, 255, 255]
        cell[36, 49] = [255, 255, 255, 255]
        for ay in range(37, 44):
            cell[ay, 48] = [240, 220, 140, 180]

    elif phase == 'recoil':
        for bx in range(35, 62):
            curve = int(3.0 * np.sin((bx - 35) / 26.0 * np.pi))
            by = 44 - curve
            cell[by, bx] = [120, 60, 15, 255]
            cell[by + 1, bx] = [190, 115, 35, 255]
            cell[45, bx] = [230, 230, 235, 200]
        for ay in range(0, 18):
            cell[ay, 48] = [255, 235, 160, 255]
        for ay in range(0, 12):
            cell[ay, 47] = [240, 210, 120, 180]
            cell[ay, 49] = [240, 210, 120, 180]

def draw_bow(cell, row_idx, phase):
    if row_idx == 0:
        draw_bow_front(cell, phase)
    elif row_idx == 1:
        draw_bow_left(cell, phase)
    elif row_idx == 2:
        draw_bow_right(cell, phase)
    elif row_idx == 3:
        draw_bow_back(cell, phase)

def build_all_sheets():
    idle_raw = np.array(Image.open('public/textures/hero_chakram_idle.png'))
    walk_raw = np.array(Image.open('public/textures/hero_chakram_walk.png'))

    # 1. IDLE (960x384, 10 cols x 4 rows)
    idle_sheet = np.zeros((384, 960, 4), dtype=np.uint8)
    for r in range(4):
        for c in range(10):
            base = idle_raw[r*96:(r+1)*96, c*96:(c+1)*96]
            clean = clean_frame(base, r)
            colored = recolor_elf(clean, r)
            draw_bow(colored, r, 'ready')
            idle_sheet[r*96:(r+1)*96, c*96:(c+1)*96] = colored
    Image.fromarray(idle_sheet).save('public/textures/hero_archer_idle.png')
    print('[OK] Generated public/textures/hero_archer_idle.png')

    # 2. WALK (576x384, 6 cols x 4 rows)
    walk_sheet = np.zeros((384, 576, 4), dtype=np.uint8)
    for r in range(4):
        for c in range(6):
            base = walk_raw[r*96:(r+1)*96, c*96:(c+1)*96]
            clean = clean_frame(base, r)
            colored = recolor_elf(clean, r)
            draw_bow(colored, r, 'ready')
            walk_sheet[r*96:(r+1)*96, c*96:(c+1)*96] = colored
    Image.fromarray(walk_sheet).save('public/textures/hero_archer_walk.png')
    print('[OK] Generated public/textures/hero_archer_walk.png')

    # 3. ATTACK (768x384, 8 cols x 4 rows)
    # Using clean standing base frames with archery progression
    atk_phases = ['ready', 'aim', 'nock', 'draw', 'draw', 'release', 'recoil', 'ready']
    atk_cols = [0, 1, 2, 3, 4, 5, 6, 7]
    atk_sheet = np.zeros((384, 768, 4), dtype=np.uint8)
    for r in range(4):
        for c in range(8):
            base = idle_raw[r*96:(r+1)*96, atk_cols[c]*96:(atk_cols[c]+1)*96]
            clean = clean_frame(base, r)
            colored = recolor_elf(clean, r)
            draw_bow(colored, r, atk_phases[c])
            atk_sheet[r*96:(r+1)*96, c*96:(c+1)*96] = colored
    Image.fromarray(atk_sheet).save('public/textures/hero_archer_attack.png')
    print('[OK] Generated public/textures/hero_archer_attack.png')

    # 4. WALK ATTACK (576x384, 6 cols x 4 rows)
    # Using running base frames with archery progression on the run
    watk_phases = ['aim', 'nock', 'draw', 'draw', 'release', 'recoil']
    watk_sheet = np.zeros((384, 576, 4), dtype=np.uint8)
    for r in range(4):
        for c in range(6):
            base = walk_raw[r*96:(r+1)*96, c*96:(c+1)*96]
            clean = clean_frame(base, r)
            colored = recolor_elf(clean, r)
            draw_bow(colored, r, watk_phases[c])
            watk_sheet[r*96:(r+1)*96, c*96:(c+1)*96] = colored
    Image.fromarray(watk_sheet).save('public/textures/hero_archer_walk_attack.png')
    print('[OK] Generated public/textures/hero_archer_walk_attack.png')

    # 5. PORTRAIT (64x64, downscale of Idle row 0 col 0)
    portrait_raw = idle_sheet[0:96, 0:96]
    portrait_img = Image.fromarray(portrait_raw).resize((64, 64), Image.Resampling.LANCZOS)
    portrait_img.save('public/textures/hero_archer_front.png')
    print('[OK] Generated public/textures/hero_archer_front.png')

if __name__ == '__main__':
    build_all_sheets()
