#!/usr/bin/env python3
"""
Magenta Chromakey Defringing & Background Removal Tool
Eliminates magenta/pink halos around sprites generated with RGB(255, 0, 255) chromakey,
preserving interior character colors (eyes, fire, clothing, gems).

Usage:
    python defringe_magenta.py input.png output.png [options]
    python defringe_magenta.py --batch input_dir/ output_dir/ [options]
"""

import os
import sys
import argparse
import numpy as np
from PIL import Image


def remove_magenta_and_defringe(
    img: Image.Image,
    bg_color: tuple[int, int, int] = (255, 0, 255),
    bg_tolerance: float = 75.0,
    edge_depth: int = 2,
    spill_threshold: float = 18.0,
    despill_mode: str = "despill",
    flood_fill: bool = False,
    alpha_cutoff: int = 15
) -> Image.Image:
    """
    Removes magenta chromakey background and decontaminates edge halos.

    Args:
        img: Input PIL Image (RGB or RGBA).
        bg_color: Target background color (R, G, B), default (255, 0, 255).
        bg_tolerance: Euclidean distance threshold in RGB space for background.
        edge_depth: Pixel radius from the silhouette border to check for magenta spill (1-3).
        spill_threshold: Minimum excess magenta (min(R-G, B-G)) to classify as fringe.
        despill_mode: 'despill' (color decontamination), 'dark-outline' (convert to dark border),
                      or 'cut' (make fringe transparent).
        flood_fill: If True, only remove background connected to image edges.
        alpha_cutoff: Minimum alpha value to keep (below this becomes 0).

    Returns:
        Clean RGBA PIL Image without pink/magenta halo.
    """
    img_rgba = img.convert("RGBA")
    arr = np.array(img_rgba)
    h, w = arr.shape[:2]

    rgb = arr[:, :, :3].astype(np.float32)
    alpha = arr[:, :, 3].astype(np.float32)

    bg_rgb = np.array(bg_color, dtype=np.float32)

    # 1. Detect background pixels
    dist_to_bg = np.sqrt(np.sum((rgb - bg_rgb) ** 2, axis=2))

    is_green = (bg_rgb[1] > 180.0 and bg_rgb[0] < 70.0 and bg_rgb[2] < 70.0)
    if is_green:
        is_hue = (
            (rgb[:, :, 1] > 95.0)
            & (rgb[:, :, 0] < 140.0)
            & (rgb[:, :, 2] < 140.0)
            & ((rgb[:, :, 1] - rgb[:, :, 0]) > 30.0)
            & ((rgb[:, :, 1] - rgb[:, :, 2]) > 30.0)
        )
    else:
        # Characteristic magenta hue check: high R, high B, low G
        is_hue = (
            (rgb[:, :, 0] > 95.0)
            & (rgb[:, :, 2] > 95.0)
            & (rgb[:, :, 1] < 140.0)
            & ((rgb[:, :, 0] - rgb[:, :, 1]) > 30.0)
            & ((rgb[:, :, 2] - rgb[:, :, 1]) > 30.0)
        )

    bg_candidate = (dist_to_bg <= bg_tolerance) | (is_hue & (dist_to_bg <= 145.0))

    if flood_fill:
        # Connect only from image borders
        from scipy.ndimage import binary_dilation
        bg_mask = np.zeros((h, w), dtype=bool)
        border = np.zeros((h, w), dtype=bool)
        border[0, :] = border[-1, :] = border[:, 0] = border[:, -1] = True
        seeds = border & bg_candidate
        bg_mask = seeds
        while True:
            expanded = binary_dilation(bg_mask, structure=np.ones((3, 3), dtype=bool)) & bg_candidate
            if np.array_equal(expanded, bg_mask):
                break
            bg_mask = expanded
    else:
        bg_mask = bg_candidate

    # Pixels already transparent in input
    bg_mask = bg_mask | (alpha <= alpha_cutoff)

    # 2. Build initial alpha
    out_alpha = np.where(bg_mask, 0.0, alpha)

    # 3. Detect edge / boundary pixels
    # Pixels with alpha > 0 adjacent to alpha == 0
    fg_mask = out_alpha > alpha_cutoff
    edge_mask = np.zeros((h, w), dtype=bool)

    current_mask = fg_mask
    pad = np.pad(current_mask, 1, mode="constant", constant_values=False)
    has_empty_neighbor = (~pad[:-2, 1:-1]) | (~pad[2:, 1:-1]) | (~pad[1:-1, :-2]) | (~pad[1:-1, 2:])
    boundary_1 = current_mask & has_empty_neighbor
    edge_mask |= boundary_1

    if edge_depth >= 2:
        pad2 = np.pad(current_mask & ~boundary_1, 1, mode="constant", constant_values=False)
        has_empty_or_b1 = (~pad2[:-2, 1:-1]) | (~pad2[2:, 1:-1]) | (~pad2[1:-1, :-2]) | (~pad2[1:-1, 2:])
        boundary_2 = (current_mask & ~boundary_1) & (has_empty_or_b1 & boundary_1)
        edge_mask |= boundary_2

    if edge_depth >= 3:
        inner = current_mask & ~edge_mask
        pad3 = np.pad(inner, 1, mode="constant", constant_values=False)
        has_neighbor_edge = pad3[:-2, 1:-1] | pad3[2:, 1:-1] | pad3[1:-1, :-2] | pad3[1:-1, 2:]
        boundary_3 = inner & has_neighbor_edge
        edge_mask |= boundary_3

    # 4. Color Decontamination (Despilling)
    r = rgb[:, :, 0]
    g = rgb[:, :, 1]
    b = rgb[:, :, 2]

    if is_green:
        excess = np.maximum(0.0, g - np.maximum(r, b))
    else:
        # Calculate excess magenta: min(R-G, B-G)
        excess = np.maximum(0.0, np.minimum(r - g, b - g))

    # Spill exists where excess exceeds threshold on edge pixels
    spill_mask = edge_mask & (excess > spill_threshold)

    out_rgb = rgb.copy()

    if despill_mode == "cut":
        out_alpha[spill_mask & (excess > 40.0)] = 0
        remain_spill = spill_mask & (out_alpha > 0)
        if is_green:
            out_rgb[remain_spill, 1] = np.clip(g[remain_spill] - excess[remain_spill], 0, 255)
        else:
            out_rgb[remain_spill, 0] = np.clip(r[remain_spill] - excess[remain_spill], 0, 255)
            out_rgb[remain_spill, 2] = np.clip(b[remain_spill] - excess[remain_spill], 0, 255)

    elif despill_mode == "dark-outline":
        strong_spill = spill_mask & (dist_to_bg < 180.0)
        base = np.maximum(r[strong_spill], b[strong_spill]) if is_green else g[strong_spill]
        out_rgb[strong_spill, 0] = np.clip(base * 0.9, 0, 255)
        out_rgb[strong_spill, 1] = np.clip(base * 0.9, 0, 255)
        out_rgb[strong_spill, 2] = np.clip(base * 0.9, 0, 255)
        other_spill = spill_mask & ~strong_spill
        if is_green:
            out_rgb[other_spill, 1] = np.clip(g[other_spill] - excess[other_spill], 0, 255)
        else:
            out_rgb[other_spill, 0] = np.clip(r[other_spill] - excess[other_spill], 0, 255)
            out_rgb[other_spill, 2] = np.clip(b[other_spill] - excess[other_spill], 0, 255)

    else:  # default: "despill" (mathematical color decontamination)
        mostly_background = spill_mask & (dist_to_bg < 90.0) & ((r < 35.0) if is_green else (g < 35.0))
        out_alpha[mostly_background] = 0

        active_spill = spill_mask & ~mostly_background
        if is_green:
            out_rgb[active_spill, 1] = np.clip(g[active_spill] - excess[active_spill], 0, 255)
        else:
            out_rgb[active_spill, 0] = np.clip(r[active_spill] - excess[active_spill], 0, 255)
            out_rgb[active_spill, 2] = np.clip(b[active_spill] - excess[active_spill], 0, 255)

    # 5. Assemble final RGBA image
    result = np.zeros((h, w, 4), dtype=np.uint8)
    result[:, :, :3] = np.clip(np.round(out_rgb), 0, 255).astype(np.uint8)
    result[:, :, 3] = np.clip(np.round(out_alpha), 0, 255).astype(np.uint8)

    # Clean zero-alpha RGB to avoid dirty compression
    result[result[:, :, 3] == 0, :3] = 0

    return Image.fromarray(result, mode="RGBA")


def defringe_existing_alpha(
    img: Image.Image,
    edge_depth: int = 2,
    spill_threshold: float = 15.0
) -> Image.Image:
    """
    Cleans magenta halos from images where background is already transparent or dark.
    """
    img_rgba = img.convert("RGBA")
    arr = np.array(img_rgba)
    h, w = arr.shape[:2]

    rgb = arr[:, :, :3].astype(np.float32)
    alpha = arr[:, :, 3].astype(np.float32)

    fg_mask = alpha > 15
    pad = np.pad(fg_mask, 1, mode="constant", constant_values=False)
    neighbor_empty = (~pad[:-2, 1:-1]) | (~pad[2:, 1:-1]) | (~pad[1:-1, :-2]) | (~pad[1:-1, 2:])
    edge_mask = fg_mask & neighbor_empty

    if edge_depth >= 2:
        pad2 = np.pad(fg_mask & ~edge_mask, 1, mode="constant", constant_values=False)
        edge_mask |= (fg_mask & ~edge_mask) & ((~pad2[:-2, 1:-1]) | (~pad2[2:, 1:-1]) | (~pad2[1:-1, :-2]) | (~pad2[1:-1, 2:]))

    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    excess = np.maximum(0.0, np.minimum(r - g, b - g))

    has_fringe = edge_mask & (excess > spill_threshold)

    out_rgb = rgb.copy()
    out_rgb[has_fringe, 0] = np.clip(r[has_fringe] - excess[has_fringe], 0, 255)
    out_rgb[has_fringe, 2] = np.clip(b[has_fringe] - excess[has_fringe], 0, 255)

    result = np.zeros((h, w, 4), dtype=np.uint8)
    result[:, :, :3] = np.clip(np.round(out_rgb), 0, 255).astype(np.uint8)
    result[:, :, 3] = np.clip(np.round(alpha), 0, 255).astype(np.uint8)
    result[result[:, :, 3] == 0, :3] = 0

    return Image.fromarray(result, mode="RGBA")


def process_file(input_path: str, output_path: str, args):
    print(f"Processing: {input_path} -> {output_path}")
    img = Image.open(input_path)

    if getattr(args, "defringe_only", False):
        result = defringe_existing_alpha(
            img,
            edge_depth=args.edge_depth,
            spill_threshold=args.spill_threshold
        )
    else:
        result = remove_magenta_and_defringe(
            img,
            bg_color=(args.bg_r, args.bg_g, args.bg_b),
            bg_tolerance=args.tolerance,
            edge_depth=args.edge_depth,
            spill_threshold=args.spill_threshold,
            despill_mode=args.mode,
            flood_fill=args.flood_fill
        )

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    result.save(output_path, "PNG")
    print(f"[OK] Saved clean asset to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Clean magenta background & eliminate pink/magenta fringing from generated 2D game assets."
    )
    parser.add_argument("input", help="Input image file or directory")
    parser.add_argument("output", help="Output image file or directory")
    parser.add_argument("--tolerance", type=float, default=75.0, help="Chromakey RGB distance tolerance (default: 75.0)")
    parser.add_argument("--edge-depth", type=int, default=2, help="Edge defringing radius in pixels (default: 2)")
    parser.add_argument("--spill-threshold", type=float, default=18.0, help="Magenta excess threshold (default: 18.0)")
    parser.add_argument("--mode", choices=["despill", "dark-outline", "cut"], default="despill",
                        help="Defringe mode: despill (color decontamination, default), dark-outline (pixel art border), cut (alpha trim)")
    parser.add_argument("--flood-fill", action="store_true", help="Remove only background connected to image edges")
    parser.add_argument("--defringe-only", action="store_true", help="Only defringe existing alpha channel without chromakey")
    parser.add_argument("--bg-r", type=int, default=255, help="Background Red component (default: 255)")
    parser.add_argument("--bg-g", type=int, default=0, help="Background Green component (default: 0)")
    parser.add_argument("--bg-b", type=int, default=255, help="Background Blue component (default: 255)")

    args = parser.parse_args()

    if os.path.isdir(args.input):
        for root, _, files in os.walk(args.input):
            for file in files:
                if file.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                    in_file = os.path.join(root, file)
                    rel = os.path.relpath(in_file, args.input)
                    out_file = os.path.join(args.output, os.path.splitext(rel)[0] + ".png")
                    process_file(in_file, out_file, args)
    else:
        process_file(args.input, args.output, args)


if __name__ == "__main__":
    main()
