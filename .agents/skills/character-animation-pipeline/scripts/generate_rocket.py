#!/usr/bin/env python3
"""
Procedural Pixel Art Generator for Rocket Raccoon Sprite Sheets.
Generates:
- hero_rocket_idle.png (10 cols x 4 rows, 960x384)
- hero_rocket_walk.png (6 cols x 4 rows, 576x384)
- hero_rocket_attack.png (8 cols x 4 rows, 768x384)
- hero_rocket_walk_attack.png (6 cols x 4 rows, 576x384)
- hero_rocket_front.png (64x64 portrait)
- weapon_assault_rifle.png (128x128 weapon icon)
"""

import os
import math
from PIL import Image, ImageDraw

CELL_SIZE = 96
FEET_Y = 74

# Color Palette
C_CLEAR = (0, 0, 0, 0)
# Fur colors
C_FUR_DARK = (45, 42, 40, 255)       # Dark charcoal outline / shadow
C_FUR_MED = (90, 85, 82, 255)        # Base grey fur
C_FUR_LIGHT = (145, 140, 135, 255)   # Light grey fur highlight
C_FUR_WHITE = (235, 232, 225, 255)   # Muzzle / eyebrow / ear white
C_NOSE = (25, 20, 20, 255)
C_EYE_BG = (35, 25, 25, 255)         # Mask eye socket
C_EYE_IRIS = (230, 140, 30, 255)     # Glowing amber eye
C_EYE_GLINT = (255, 255, 255, 255)
C_EAR_INNER = (215, 140, 140, 255)   # Inner ear pinkish

# Suit colors (Guardians blue & orange)
C_SUIT_DARK = (20, 35, 65, 255)      # Navy blue shadow
C_SUIT_MAIN = (35, 65, 120, 255)     # Guardians blue suit
C_SUIT_HI = (55, 100, 175, 255)      # Suit highlight
C_ORANGE_DARK = (180, 60, 10, 255)   # Orange harness shadow
C_ORANGE_MAIN = (240, 100, 20, 255)  # Orange straps / accents
C_ORANGE_HI = (255, 150, 60, 255)    # Orange highlight
C_BELT = (60, 50, 45, 255)           # Leather belt / boots
C_BUCKLE = (190, 200, 210, 255)      # Metal buckle / silver hardware

# Tail colors (striped)
C_TAIL_DARK = (40, 36, 35, 255)
C_TAIL_LIGHT = (200, 195, 185, 255)
C_TAIL_MED = (110, 105, 100, 255)

# Weapon colors (High-tech Assault Rifle / Blaster)
C_GUN_STEEL = (70, 75, 85, 255)
C_GUN_DARK = (30, 32, 40, 255)
C_GUN_HI = (120, 130, 145, 255)
C_GUN_ENERGY = (0, 220, 255, 255)    # Cyan energy glow / indicator
C_GUN_MAG = (45, 48, 55, 255)

# Muzzle flash colors
C_FLASH_CORE = (255, 255, 255, 255)
C_FLASH_YELLOW = (255, 230, 60, 255)
C_FLASH_ORANGE = (255, 120, 20, 255)
C_FLASH_SPARK = (255, 200, 50, 255)


def draw_pixel(im, x, y, color):
    if 0 <= x < im.width and 0 <= y < im.height:
        if color[3] == 255:
            im.putpixel((x, y), color)
        elif color[3] > 0:
            # Alpha blend
            curr = im.getpixel((x, y))
            a = color[3] / 255.0
            r = int(color[0] * a + curr[0] * (1 - a))
            g = int(color[1] * a + curr[1] * (1 - a))
            b = int(color[2] * a + curr[2] * (1 - a))
            im.putpixel((x, y), (r, g, b, 255))


def fill_rect(im, x0, y0, x1, y1, color):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            draw_pixel(im, x, y, color)


def draw_rocket_frame(dir_name='front', anim='IDLE', frame=0, total_frames=10):
    """
    Renders one 96x96 frame of Rocket Raccoon.
    dir_name: 'front' (0), 'left' (1), 'right' (2), 'back' (3)
    anim: 'IDLE', 'WALK', 'ATTACK', 'WALK_ATTACK'
    """
    im = Image.new('RGBA', (CELL_SIZE, CELL_SIZE), C_CLEAR)
    cx = 48
    feet_y = FEET_Y

    # Animation parameters
    bob_y = 0
    step_phase = 0
    tail_sway = 0
    recoil_x = 0
    recoil_y = 0
    muzzle_flash_phase = 0

    if anim == 'IDLE':
        # Idle breathing and gentle tail sway
        phase = (frame / total_frames) * 2 * math.pi
        bob_y = int(round(math.sin(phase) * 0.8))
        tail_sway = math.sin(phase) * 3.0
    elif anim == 'WALK':
        # Walking cycle: bob up and down, legs alternate
        phase = (frame / total_frames) * 2 * math.pi
        bob_y = int(round(abs(math.sin(phase)) * 2.0))
        step_phase = math.sin(phase)
        tail_sway = math.sin(phase * 1.5) * 4.0
    elif anim == 'ATTACK':
        # Firing bursts every 2 frames
        is_firing_frame = (frame % 2 == 0)
        if is_firing_frame:
            muzzle_flash_phase = 1.0 - (frame % 2) * 0.4
            recoil_x = -2 if dir_name in ('right', 'front', 'back') else 2
            recoil_y = 1
        else:
            recoil_x = 0
            recoil_y = 0
            muzzle_flash_phase = 0.0
        phase = (frame / total_frames) * 2 * math.pi
        tail_sway = math.sin(phase) * 2.0
    elif anim == 'WALK_ATTACK':
        # Walk + Attack: step motion + rapid fire
        phase = (frame / total_frames) * 2 * math.pi
        bob_y = int(round(abs(math.sin(phase)) * 2.0))
        step_phase = math.sin(phase)
        is_firing_frame = (frame % 2 == 0)
        if is_firing_frame:
            muzzle_flash_phase = 1.0
            recoil_x = -2 if dir_name in ('right', 'front', 'back') else 2
            recoil_y = 1
        tail_sway = math.sin(phase * 1.5) * 4.0

    # Draw direction
    if dir_name == 'front':
        _draw_front(im, cx, feet_y, bob_y, step_phase, tail_sway, recoil_x, recoil_y, muzzle_flash_phase)
    elif dir_name == 'back':
        _draw_back(im, cx, feet_y, bob_y, step_phase, tail_sway, recoil_x, recoil_y, muzzle_flash_phase)
    elif dir_name == 'left':
        _draw_side(im, cx, feet_y, bob_y, step_phase, tail_sway, recoil_x, recoil_y, muzzle_flash_phase, flip=False)
    elif dir_name == 'right':
        _draw_side(im, cx, feet_y, bob_y, step_phase, tail_sway, recoil_x, recoil_y, muzzle_flash_phase, flip=True)

    return im


def _draw_front(im, cx, fy, bob_y, step_phase, tail_sway, recoil_x, recoil_y, flash_p):
    # 1. Bushy Tail behind
    tx_base = cx - 10 + int(tail_sway)
    ty_base = fy - 8 - bob_y
    # Draw striped tail curving out to the left
    tail_segs = [
        (tx_base - 1, ty_base, 6, 6, C_TAIL_DARK),
        (tx_base - 4, ty_base - 4, 7, 7, C_TAIL_LIGHT),
        (tx_base - 8, ty_base - 8, 8, 8, C_TAIL_DARK),
        (tx_base - 12, ty_base - 12, 7, 7, C_TAIL_LIGHT),
        (tx_base - 14, ty_base - 16, 6, 6, C_TAIL_DARK),
    ]
    for sx, sy, sw, sh, sc in tail_segs:
        fill_rect(im, sx, sy, sx + sw, sy + sh, sc)
        # Tail tip tuft
        draw_pixel(im, sx + 1, sy - 1, C_TAIL_MED)

    # 2. Feet / Boots
    leg_offset = int(step_phase * 2)
    # Left foot
    fill_rect(im, cx - 8, fy - 3 + leg_offset, cx - 4, fy, C_BELT)
    draw_pixel(im, cx - 9, fy, C_BELT)
    # Right foot
    fill_rect(im, cx + 4, fy - 3 - leg_offset, cx + 8, fy, C_BELT)
    draw_pixel(im, cx + 9, fy, C_BELT)

    # 3. Pants / Legs
    fill_rect(im, cx - 7, fy - 8 - bob_y, cx - 4, fy - 4 + leg_offset, C_SUIT_DARK)
    fill_rect(im, cx + 4, fy - 8 - bob_y, cx + 7, fy - 4 - leg_offset, C_SUIT_DARK)

    # 4. Torso / Suit
    torso_top = fy - 22 - bob_y
    torso_bot = fy - 8 - bob_y
    fill_rect(im, cx - 8, torso_top, cx + 8, torso_bot, C_SUIT_MAIN)
    # Suit shadows / highlights
    fill_rect(im, cx - 8, torso_top, cx - 7, torso_bot, C_SUIT_DARK)
    fill_rect(im, cx + 7, torso_top, cx + 8, torso_bot, C_SUIT_DARK)
    # Orange harness straps (cross straps)
    for i in range(12):
        draw_pixel(im, cx - 6 + i, torso_top + 2 + i, C_ORANGE_MAIN)
        draw_pixel(im, cx + 6 - i, torso_top + 2 + i, C_ORANGE_MAIN)
    # Metal buckle / gadget in center
    fill_rect(im, cx - 2, torso_top + 6, cx + 2, torso_top + 8, C_BUCKLE)
    draw_pixel(im, cx, torso_top + 7, C_GUN_ENERGY) # glowing center tech light
    # Belt at waist
    fill_rect(im, cx - 8, torso_bot - 2, cx + 8, torso_bot, C_BELT)
    fill_rect(im, cx - 2, torso_bot - 2, cx + 2, torso_bot, C_BUCKLE)

    # 5. Head
    head_top = fy - 38 - bob_y
    head_cx = cx
    # Ears
    # Left ear (pointed with white fluff and dark edge)
    fill_rect(im, head_cx - 13, head_top - 6, head_cx - 7, head_top + 2, C_FUR_DARK)
    fill_rect(im, head_cx - 11, head_top - 4, head_cx - 8, head_top, C_EAR_INNER)
    draw_pixel(im, head_cx - 12, head_top - 7, C_FUR_WHITE)
    # Right ear
    fill_rect(im, head_cx + 7, head_top - 6, head_cx + 13, head_top + 2, C_FUR_DARK)
    fill_rect(im, head_cx + 8, head_top - 4, head_cx + 11, head_top, C_EAR_INNER)
    draw_pixel(im, head_cx + 12, head_top - 7, C_FUR_WHITE)

    # Main head shape
    fill_rect(im, head_cx - 11, head_top, head_cx + 11, head_top + 16, C_FUR_MED)
    # Cheek fur tufts (fluffy raccoon sides)
    fill_rect(im, head_cx - 13, head_top + 8, head_cx - 11, head_top + 14, C_FUR_WHITE)
    fill_rect(im, head_cx + 11, head_top + 8, head_cx + 13, head_top + 14, C_FUR_WHITE)
    draw_pixel(im, head_cx - 14, head_top + 11, C_FUR_DARK)
    draw_pixel(im, head_cx + 14, head_top + 11, C_FUR_DARK)

    # Forehead top fur highlight
    fill_rect(im, head_cx - 6, head_top, head_cx + 6, head_top + 2, C_FUR_LIGHT)

    # Black Bandit Mask around eyes
    fill_rect(im, head_cx - 9, head_top + 5, head_cx - 2, head_top + 10, C_EYE_BG)
    fill_rect(im, head_cx + 2, head_top + 5, head_cx + 9, head_top + 10, C_EYE_BG)
    # White markings above eyes (eyebrow spots)
    fill_rect(im, head_cx - 8, head_top + 3, head_cx - 4, head_top + 4, C_FUR_WHITE)
    fill_rect(im, head_cx + 4, head_top + 3, head_cx + 8, head_top + 4, C_FUR_WHITE)

    # Eyes (amber glow with sharp glint)
    draw_pixel(im, head_cx - 6, head_top + 7, C_EYE_IRIS)
    draw_pixel(im, head_cx - 5, head_top + 7, C_EYE_IRIS)
    draw_pixel(im, head_cx - 6, head_top + 6, C_EYE_GLINT)
    draw_pixel(im, head_cx + 5, head_top + 7, C_EYE_IRIS)
    draw_pixel(im, head_cx + 6, head_top + 7, C_EYE_IRIS)
    draw_pixel(im, head_cx + 5, head_top + 6, C_EYE_GLINT)

    # White Snout & Nose
    fill_rect(im, head_cx - 4, head_top + 10, head_cx + 4, head_top + 15, C_FUR_WHITE)
    fill_rect(im, head_cx - 2, head_top + 10, head_cx + 2, head_top + 12, C_NOSE)
    # Mouth line / grin
    draw_pixel(im, head_cx, head_top + 13, C_FUR_DARK)
    draw_pixel(im, head_cx - 1, head_top + 14, C_FUR_DARK)
    draw_pixel(im, head_cx + 1, head_top + 14, C_FUR_DARK)

    # 6. Heavy Assault Rifle / Machine Gun (carried at chest ready position)
    gx = head_cx - 2 + recoil_x
    gy = torso_top + 6 + recoil_y
    # Main rifle body
    fill_rect(im, gx, gy, gx + 18, gy + 7, C_GUN_STEEL)
    fill_rect(im, gx, gy + 1, gx + 17, gy + 6, C_GUN_DARK)
    # Barrel extension
    fill_rect(im, gx + 18, gy + 2, gx + 26, gy + 5, C_GUN_STEEL)
    fill_rect(im, gx + 26, gy + 1, gx + 29, gy + 6, C_GUN_DARK) # Muzzle brake
    # Magazine drum / box underneath
    fill_rect(im, gx + 6, gy + 8, gx + 13, gy + 14, C_GUN_MAG)
    draw_pixel(im, gx + 9, gy + 11, C_GUN_HI)
    # Glowing energy heat vents / ammo counter
    draw_pixel(im, gx + 8, gy + 3, C_GUN_ENERGY)
    draw_pixel(im, gx + 11, gy + 3, C_GUN_ENERGY)
    draw_pixel(im, gx + 14, gy + 3, C_GUN_ENERGY)

    # Arms / Hands holding rifle
    # Left arm & paw
    fill_rect(im, head_cx - 10, torso_top + 4, head_cx - 6, torso_top + 12, C_SUIT_MAIN)
    fill_rect(im, gx + 1, gy + 3, gx + 4, gy + 7, C_FUR_DARK)
    # Right arm & paw
    fill_rect(im, head_cx + 4, torso_top + 4, head_cx + 8, torso_top + 11, C_SUIT_MAIN)
    fill_rect(im, gx + 12, gy + 4, gx + 15, gy + 8, C_FUR_DARK)

    # 7. Muzzle Flash (during firing)
    if flash_p > 0:
        fx = gx + 30
        fy_m = gy + 3
        # White hot core
        fill_rect(im, fx, fy_m - 2, fx + 5, fy_m + 3, C_FLASH_CORE)
        # Yellow fireball petals
        fill_rect(im, fx + 5, fy_m - 4, fx + 10, fy_m + 5, C_FLASH_YELLOW)
        fill_rect(im, fx - 1, fy_m - 5, fx + 4, fy_m - 3, C_FLASH_YELLOW)
        fill_rect(im, fx - 1, fy_m + 4, fx + 4, fy_m + 6, C_FLASH_YELLOW)
        # Orange flame edges and sparks
        fill_rect(im, fx + 10, fy_m - 2, fx + 14, fy_m + 3, C_FLASH_ORANGE)
        draw_pixel(im, fx + 15, fy_m - 5, C_FLASH_SPARK)
        draw_pixel(im, fx + 16, fy_m + 6, C_FLASH_SPARK)
        draw_pixel(im, fx + 12, fy_m, C_FLASH_SPARK)
        # Empty shell casing flying out from gun chamber
        draw_pixel(im, gx + 4, gy - 4, C_FLASH_YELLOW)
        draw_pixel(im, gx + 5, gy - 3, C_ORANGE_HI)


def _draw_side(im, cx, fy, bob_y, step_phase, tail_sway, recoil_x, recoil_y, flash_p, flip=False):
    # Base drawing facing left (flip=True mirrors horizontally for right)
    temp = Image.new('RGBA', (CELL_SIZE, CELL_SIZE), C_CLEAR)
    gx_offset = -recoil_x # recoil backward

    # 1. Big Bushy Tail extending backward to the right
    tx = cx + 8 + int(tail_sway)
    ty = fy - 12 - bob_y
    tail_rings = [
        (tx, ty, 8, 8, C_TAIL_DARK),
        (tx + 5, ty - 3, 9, 9, C_TAIL_LIGHT),
        (tx + 11, ty - 8, 10, 10, C_TAIL_DARK),
        (tx + 16, ty - 14, 10, 10, C_TAIL_LIGHT),
        (tx + 20, ty - 20, 8, 8, C_TAIL_MED),
        (tx + 22, ty - 26, 6, 6, C_TAIL_DARK),
    ]
    for rx, ry, rw, rh, rc in tail_rings:
        fill_rect(temp, rx, ry, rx + rw, ry + rh, rc)

    # 2. Feet & Legs (walking stride)
    leg_fwd = int(step_phase * 4)
    # Back leg
    fill_rect(temp, cx + 2 - leg_fwd, fy - 6, cx + 6 - leg_fwd, fy, C_SUIT_DARK)
    fill_rect(temp, cx + 1 - leg_fwd, fy - 2, cx + 6 - leg_fwd, fy, C_BELT)
    # Front leg
    fill_rect(temp, cx - 6 + leg_fwd, fy - 6, cx - 2 + leg_fwd, fy, C_SUIT_MAIN)
    fill_rect(temp, cx - 8 + leg_fwd, fy - 2, cx - 2 + leg_fwd, fy, C_BELT)

    # 3. Torso
    torso_top = fy - 22 - bob_y
    torso_bot = fy - 7 - bob_y
    fill_rect(temp, cx - 7, torso_top, cx + 7, torso_bot, C_SUIT_MAIN)
    fill_rect(temp, cx + 3, torso_top, cx + 7, torso_bot, C_SUIT_DARK) # back shadow
    # Orange harness straps & tech backpack
    fill_rect(temp, cx - 4, torso_top + 2, cx - 1, torso_bot - 2, C_ORANGE_MAIN)
    fill_rect(temp, cx + 6, torso_top + 1, cx + 10, torso_top + 10, C_GUN_STEEL) # backpack battery
    draw_pixel(temp, cx + 8, torso_top + 3, C_GUN_ENERGY)
    fill_rect(temp, cx - 7, torso_bot - 2, cx + 7, torso_bot, C_BELT)

    # 4. Head (Profile / 3/4)
    head_top = fy - 38 - bob_y
    # Ears
    fill_rect(temp, cx + 2, head_top - 6, cx + 7, head_top + 2, C_FUR_DARK)
    fill_rect(temp, cx + 3, head_top - 4, cx + 6, head_top, C_EAR_INNER)
    draw_pixel(temp, cx + 4, head_top - 7, C_FUR_WHITE)

    # Head base
    fill_rect(temp, cx - 11, head_top, cx + 7, head_top + 16, C_FUR_MED)
    # Pointy Snout jutting forward to the left
    fill_rect(temp, cx - 16, head_top + 9, cx - 9, head_top + 15, C_FUR_WHITE)
    fill_rect(temp, cx - 17, head_top + 9, cx - 14, head_top + 11, C_NOSE) # black nose tip

    # Eye mask & Eye
    fill_rect(temp, cx - 10, head_top + 5, cx - 3, head_top + 9, C_EYE_BG)
    fill_rect(temp, cx - 9, head_top + 3, cx - 4, head_top + 4, C_FUR_WHITE) # brow
    draw_pixel(temp, cx - 8, head_top + 6, C_EYE_IRIS)
    draw_pixel(temp, cx - 7, head_top + 6, C_EYE_GLINT)

    # Cheek fur tuft
    fill_rect(temp, cx - 3, head_top + 11, cx + 3, head_top + 15, C_FUR_WHITE)

    # 5. Heavy Assault Rifle / Machine Gun (Aiming forward to the left)
    gun_x = cx - 28 + gx_offset
    gun_y = torso_top + 7 + recoil_y
    # Barrel & muzzle
    fill_rect(temp, gun_x, gun_y + 1, gun_x + 12, gun_y + 4, C_GUN_STEEL)
    fill_rect(temp, gun_x - 3, gun_y, gun_x, gun_y + 5, C_GUN_DARK) # heavy muzzle brake
    # Receiver / body
    fill_rect(temp, gun_x + 12, gun_y, gun_x + 28, gy_receiver := gun_y + 7, C_GUN_DARK)
    fill_rect(temp, gun_x + 14, gun_y + 1, gun_x + 26, gun_y + 5, C_GUN_STEEL)
    # Energy glow vent
    draw_pixel(temp, gun_x + 18, gun_y + 2, C_GUN_ENERGY)
    draw_pixel(temp, gun_x + 21, gun_y + 2, C_GUN_ENERGY)
    # Heavy ammo magazine drum
    fill_rect(temp, gun_x + 16, gun_y + 7, gun_x + 23, gun_y + 13, C_GUN_MAG)
    # Stock extending under arm
    fill_rect(temp, gun_x + 28, gun_y + 2, gun_x + 34, gun_y + 5, C_GUN_STEEL)

    # Arms & Paws holding the weapon
    fill_rect(temp, cx - 4, torso_top + 5, cx + 2, torso_top + 12, C_SUIT_MAIN) # shoulder
    fill_rect(temp, gun_x + 20, gun_y + 4, gun_x + 24, gun_y + 8, C_FUR_DARK)   # rear paw grip
    fill_rect(temp, gun_x + 10, gun_y + 3, gun_x + 13, gun_y + 7, C_FUR_DARK)   # front paw support

    # 6. Muzzle Flash
    if flash_p > 0:
        fx = gun_x - 4
        fy_m = gun_y + 2
        fill_rect(temp, fx - 5, fy_m - 2, fx, fy_m + 3, C_FLASH_CORE)
        fill_rect(temp, fx - 10, fy_m - 4, fx - 5, fy_m + 5, C_FLASH_YELLOW)
        fill_rect(temp, fx - 14, fy_m - 2, fx - 10, fy_m + 3, C_FLASH_ORANGE)
        draw_pixel(temp, fx - 15, fy_m - 5, C_FLASH_SPARK)
        draw_pixel(temp, fx - 16, fy_m + 6, C_FLASH_SPARK)
        # Shell casing flying backwards
        draw_pixel(temp, gun_x + 18, gun_y - 4, C_FLASH_YELLOW)
        draw_pixel(temp, gun_x + 16, gun_y - 3, C_ORANGE_HI)

    if flip:
        temp = temp.transpose(Image.FLIP_LEFT_RIGHT)

    im.alpha_composite(temp)


def _draw_back(im, cx, fy, bob_y, step_phase, tail_sway, recoil_x, recoil_y, flash_p):
    # 1. Feet / Boots
    leg_offset = int(step_phase * 2)
    fill_rect(im, cx - 8, fy - 3 + leg_offset, cx - 4, fy, C_BELT)
    fill_rect(im, cx + 4, fy - 3 - leg_offset, cx + 8, fy, C_BELT)

    # 2. Pants
    fill_rect(im, cx - 7, fy - 8 - bob_y, cx - 4, fy - 4 + leg_offset, C_SUIT_DARK)
    fill_rect(im, cx + 4, fy - 8 - bob_y, cx + 7, fy - 4 - leg_offset, C_SUIT_DARK)

    # 3. Torso Back & Tech Backpack
    torso_top = fy - 22 - bob_y
    torso_bot = fy - 8 - bob_y
    fill_rect(im, cx - 8, torso_top, cx + 8, torso_bot, C_SUIT_DARK)
    fill_rect(im, cx - 8, torso_bot - 2, cx + 8, torso_bot, C_BELT)
    # High-tech backpack / jump-pack with dual thrusters & orange straps
    fill_rect(im, cx - 6, torso_top + 1, cx + 6, torso_top + 11, C_GUN_DARK)
    fill_rect(im, cx - 4, torso_top + 3, cx + 4, torso_top + 9, C_GUN_STEEL)
    draw_pixel(im, cx, torso_top + 5, C_GUN_ENERGY)
    fill_rect(im, cx - 6, torso_top + 10, cx - 3, torso_top + 13, C_ORANGE_MAIN) # left thruster nozzle
    fill_rect(im, cx + 3, torso_top + 10, cx + 6, torso_top + 13, C_ORANGE_MAIN) # right thruster nozzle

    # 4. Big Striped Tail prominently arching up from lower back
    tx = cx + int(tail_sway)
    ty = torso_bot - 2
    tail_rings = [
        (tx - 4, ty - 2, 8, 6, C_TAIL_DARK),
        (tx - 5, ty + 2, 10, 6, C_TAIL_LIGHT),
        (tx - 6, ty + 6, 11, 7, C_TAIL_DARK),
        (tx - 4, ty + 12, 10, 6, C_TAIL_LIGHT),
        (tx - 2, ty + 16, 7, 5, C_TAIL_MED),
    ]
    for rx, ry, rw, rh, rc in tail_rings:
        fill_rect(im, rx, ry, rx + rw, ry + rh, rc)

    # 5. Head Back
    head_top = fy - 38 - bob_y
    # Ears from back
    fill_rect(im, cx - 13, head_top - 6, cx - 7, head_top + 2, C_FUR_DARK)
    draw_pixel(im, cx - 12, head_top - 7, C_FUR_WHITE)
    fill_rect(im, cx + 7, head_top - 6, cx + 13, head_top + 2, C_FUR_DARK)
    draw_pixel(im, cx + 12, head_top - 7, C_FUR_WHITE)

    # Back of head fur
    fill_rect(im, cx - 11, head_top, cx + 11, head_top + 16, C_FUR_MED)
    fill_rect(im, cx - 7, head_top + 2, cx + 7, head_top + 10, C_FUR_DARK) # dark stripe on head
    # Side cheek tufts
    fill_rect(im, cx - 13, head_top + 8, cx - 11, head_top + 14, C_FUR_WHITE)
    fill_rect(im, cx + 11, head_top + 8, cx + 13, head_top + 14, C_FUR_WHITE)

    # 6. Weapon peek (carried in front, barrel and muzzle sticking out to the right)
    gx = cx + 8 + recoil_x
    gy = torso_top + 6 + recoil_y
    fill_rect(im, gx, gy + 1, gx + 14, gy + 4, C_GUN_STEEL)
    fill_rect(im, gx + 14, gy, gx + 17, gy + 5, C_GUN_DARK)

    # 7. Muzzle Flash
    if flash_p > 0:
        fx = gx + 18
        fy_m = gy + 2
        fill_rect(im, fx, fy_m - 2, fx + 5, fy_m + 3, C_FLASH_CORE)
        fill_rect(im, fx + 5, fy_m - 4, fx + 9, fy_m + 5, C_FLASH_YELLOW)
        draw_pixel(im, fx + 11, fy_m - 3, C_FLASH_SPARK)
        draw_pixel(im, fx + 12, fy_m + 4, C_FLASH_SPARK)


def generate_all():
    out_dir = 'public/textures/heroes'
    os.makedirs(out_dir, exist_ok=True)

    # Direction row mapping:
    # Row 0: Front
    # Row 1: Left
    # Row 2: Right
    # Row 3: Back
    dirs = ['front', 'left', 'right', 'back']

    configs = [
        ('idle', 10, 'IDLE'),
        ('walk', 6, 'WALK'),
        ('attack', 8, 'ATTACK'),
        ('walk_attack', 6, 'WALK_ATTACK'),
    ]

    for name, cols, anim in configs:
        sheet_w = cols * CELL_SIZE
        sheet_h = 4 * CELL_SIZE
        sheet = Image.new('RGBA', (sheet_w, sheet_h), C_CLEAR)

        for row_idx, dir_name in enumerate(dirs):
            for col_idx in range(cols):
                frame_im = draw_rocket_frame(dir_name=dir_name, anim=anim, frame=col_idx, total_frames=cols)
                sheet.paste(frame_im, (col_idx * CELL_SIZE, row_idx * CELL_SIZE))

        out_path = os.path.join(out_dir, f'hero_rocket_{name}.png')
        sheet.save(out_path)
        print(f'Saved {out_path} ({sheet.size})')

    # Portrait (64x64): clean downscale of front idle frame
    front_idle = draw_rocket_frame(dir_name='front', anim='IDLE', frame=0, total_frames=10)
    # Crop character area (around center) and place on 64x64
    portrait = Image.new('RGBA', (64, 64), C_CLEAR)
    # The character in front_idle is centered around X=48, Y=56, height ~45, width ~36
    cropped = front_idle.crop((48 - 24, 30, 48 + 24, 78)) # 48x48
    portrait.paste(cropped, (8, 8))
    portrait_path = os.path.join(out_dir, 'hero_rocket_front.png')
    portrait.save(portrait_path)
    print(f'Saved {portrait_path} ({portrait.size})')

    # Generate Weapon Icon: weapon_assault_rifle.png (128x128)
    w_icon = Image.new('RGBA', (128, 128), C_CLEAR)
    # Draw assault rifle icon centered with glowing tech styling
    # Gun receiver & barrel
    draw = ImageDraw.Draw(w_icon)
    # Shadow / outline
    draw.rectangle([20, 52, 108, 76], fill=(15, 18, 24, 255))
    # Main gunmetal body
    draw.rectangle([24, 54, 96, 72], fill=C_GUN_STEEL)
    draw.rectangle([28, 56, 92, 70], fill=C_GUN_DARK)
    # Heavy barrel & compensator
    draw.rectangle([96, 58, 114, 68], fill=C_GUN_STEEL)
    draw.rectangle([112, 56, 118, 70], fill=(20, 22, 28, 255))
    # Magazine drum / curved clip
    draw.polygon([(56, 72), (72, 72), (68, 100), (52, 98)], fill=C_GUN_MAG)
    draw.polygon([(58, 74), (70, 74), (66, 96), (54, 94)], fill=(25, 28, 35, 255))
    # Top tactical rail / holographic optic
    draw.rectangle([38, 44, 76, 54], fill=C_GUN_STEEL)
    draw.rectangle([48, 40, 68, 48], fill=C_GUN_DARK)
    draw.rectangle([54, 42, 62, 46], fill=(0, 240, 255, 220)) # cyan holographic reticle glass
    # Stock
    draw.polygon([(24, 56), (12, 60), (12, 78), (24, 72)], fill=C_GUN_STEEL)
    # Orange stripe detailing (Guardians styling)
    draw.rectangle([44, 60, 48, 68], fill=C_ORANGE_MAIN)
    draw.rectangle([80, 60, 84, 68], fill=C_ORANGE_MAIN)
    # Glowing power cell
    draw.rectangle([58, 62, 74, 66], fill=C_GUN_ENERGY)
    # Grip
    draw.polygon([(34, 72), (42, 72), (38, 88), (30, 88)], fill=C_BELT)

    weapons_dir = 'public/textures/weapons'
    os.makedirs(weapons_dir, exist_ok=True)
    w_path = os.path.join(weapons_dir, 'weapon_assault_rifle.png')
    w_icon.save(w_path)
    print(f'Saved {w_path} ({w_icon.size})')


if __name__ == '__main__':
    generate_all()
