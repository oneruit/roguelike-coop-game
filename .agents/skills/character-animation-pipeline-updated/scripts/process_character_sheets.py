#!/usr/bin/env python3
"""Process three 6x4 pixel-art animation sheets into aligned RGBA game assets.

The source sheets must use this row order, top to bottom:
    FRONT, BACK, LEFT, RIGHT

The output contains IDLE, WALK and ATTACK sheets only. A portrait is also written:
- from --portrait when supplied;
- otherwise from the first (front-facing) IDLE frame.

Dependencies: Pillow and NumPy.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

CELL_SIZE = 96
COLS = 6
ROWS = 4
EXPECTED_ROW_ORDER = ("FRONT", "BACK", "LEFT", "RIGHT")
ALPHA_THRESHOLD = 20


def _print(message: str) -> None:
    try:
        print(message, flush=True)
    except UnicodeEncodeError:
        print(message.encode("ascii", errors="replace").decode("ascii"), flush=True)


def _connected_to_border(candidate: np.ndarray) -> np.ndarray:
    """Return candidate pixels connected to any image border (scanline flood fill).

    The scanline implementation avoids a Python queue entry for every background
    pixel. Candidate colors inside the sprite are preserved unless they connect
    to the canvas edge, which protects white cloth/armor on white backgrounds.
    """
    height, width = candidate.shape
    visited = np.zeros((height, width), dtype=bool)
    stack: list[tuple[int, int]] = []

    # Seed every candidate run touching the outer border.
    for x in range(width):
        if candidate[0, x]:
            stack.append((x, 0))
        if height > 1 and candidate[height - 1, x]:
            stack.append((x, height - 1))
    for y in range(1, max(1, height - 1)):
        if candidate[y, 0]:
            stack.append((0, y))
        if width > 1 and candidate[y, width - 1]:
            stack.append((width - 1, y))

    while stack:
        x, y = stack.pop()
        if not candidate[y, x] or visited[y, x]:
            continue

        left = x
        while left > 0 and candidate[y, left - 1] and not visited[y, left - 1]:
            left -= 1
        right = x
        while right + 1 < width and candidate[y, right + 1] and not visited[y, right + 1]:
            right += 1

        visited[y, left : right + 1] = True

        for ny in (y - 1, y + 1):
            if ny < 0 or ny >= height:
                continue
            segment = candidate[ny, left : right + 1] & ~visited[ny, left : right + 1]
            if not segment.any():
                continue
            # Push only the first pixel of each unvisited run in the adjacent row.
            starts = np.flatnonzero(segment & ~np.r_[False, segment[:-1]])
            for offset in starts:
                stack.append((left + int(offset), ny))

    return visited


def parse_bg_color(
    color_spec: Optional[Union[str, tuple, list, np.ndarray]]
) -> Optional[tuple[float, float, float]]:
    """Parse color string, hex code, or tuple into (R, G, B) float tuple."""
    if color_spec is None:
        return None
    if isinstance(color_spec, (tuple, list, np.ndarray)):
        if len(color_spec) >= 3:
            return float(color_spec[0]), float(color_spec[1]), float(color_spec[2])
        return None
    if isinstance(color_spec, str):
        c = color_spec.strip().lower()
        if c in ("magenta", "fuchsia"):
            return (255.0, 0.0, 255.0)
        if c in ("green", "lime"):
            return (0.0, 255.0, 0.0)
        if c == "blue":
            return (0.0, 0.0, 255.0)
        if c in ("cyan", "aqua"):
            return (0.0, 255.0, 255.0)
        if c == "white":
            return (255.0, 255.0, 255.0)
        if c == "black":
            return (0.0, 0.0, 0.0)
        if c.startswith("#"):
            c = c[1:]
        if len(c) == 6:
            try:
                r = float(int(c[0:2], 16))
                g = float(int(c[2:4], 16))
                b = float(int(c[4:6], 16))
                return (r, g, b)
            except ValueError:
                pass
        if len(c) == 3:
            try:
                r = float(int(c[0] * 2, 16))
                g = float(int(c[1] * 2, 16))
                b = float(int(c[2] * 2, 16))
                return (r, g, b)
            except ValueError:
                pass
        if "," in c:
            parts = [p.strip() for p in c.split(",")]
            if len(parts) >= 3:
                try:
                    return float(parts[0]), float(parts[1]), float(parts[2])
                except ValueError:
                    pass
    return None


def detect_and_clean_background(
    img_arr: np.ndarray,
    bg_mode: str = "auto",
    tolerance: float = 36.0,
    bg_color: Optional[Union[str, tuple, list, np.ndarray]] = None,
) -> np.ndarray:
    """Convert RGB/RGBA image to RGBA and remove edge-connected background.

    Supports pure magenta (#ff00ff), pure green (#00ff00), pure blue (#0000ff),
    auto-detected chromakey, or custom RGB/hex backgrounds with mathematical
    color despill/defringing.
    """
    arr = np.asarray(img_arr)
    if arr.ndim != 3 or arr.shape[2] not in (3, 4):
        raise ValueError(f"Expected RGB or RGBA image, got shape {arr.shape}")

    arr = arr.astype(np.uint8, copy=True)
    if arr.shape[2] == 4:
        alpha_in = arr[:, :, 3]
        border_alpha = np.concatenate((alpha_in[0, :], alpha_in[-1, :], alpha_in[:, 0], alpha_in[:, -1]))
        mostly_transparent = np.count_nonzero(alpha_in == 0) > alpha_in.size * 0.01
        transparent_border = np.count_nonzero(border_alpha < 250) > border_alpha.size * 0.50
        if mostly_transparent and transparent_border:
            arr[arr[:, :, 3] < 12, 3] = 0
            return arr

    rgb = arr[:, :, :3].astype(np.float32)
    h, w = rgb.shape[:2]

    if bg_mode == "none":
        if arr.shape[2] == 3:
            alpha = np.full((h, w, 1), 255, dtype=np.uint8)
            return np.concatenate((arr, alpha), axis=2)
        return arr

    corners = np.concatenate(
        [
            rgb[0: min(8, h), 0: min(8, w)].reshape(-1, 3),
            rgb[0: min(8, h), max(0, w - 8) : w].reshape(-1, 3),
            rgb[max(0, h - 8) : h, 0: min(8, w)].reshape(-1, 3),
            rgb[max(0, h - 8) : h, max(0, w - 8) : w].reshape(-1, 3),
        ],
        axis=0,
    )
    inferred = np.median(corners, axis=0)

    chroma_type = "custom"
    parsed_bg = parse_bg_color(bg_color)

    if parsed_bg is not None:
        target_color = np.array(parsed_bg, dtype=np.float32)
        dist_mag = float(np.linalg.norm(target_color - np.array([255.0, 0.0, 255.0], dtype=np.float32)))
        dist_grn = float(np.linalg.norm(target_color - np.array([0.0, 255.0, 0.0], dtype=np.float32)))
        dist_blu = float(np.linalg.norm(target_color - np.array([0.0, 0.0, 255.0], dtype=np.float32)))
        if dist_mag <= 45.0:
            chroma_type = "magenta"
        elif dist_grn <= 45.0:
            chroma_type = "green"
        elif dist_blu <= 45.0:
            chroma_type = "blue"
    elif bg_mode == "magenta":
        target_color = np.array([255.0, 0.0, 255.0], dtype=np.float32)
        chroma_type = "magenta"
    elif bg_mode == "green":
        target_color = np.array([0.0, 255.0, 0.0], dtype=np.float32)
        chroma_type = "green"
    elif bg_mode == "blue":
        target_color = np.array([0.0, 0.0, 255.0], dtype=np.float32)
        chroma_type = "blue"
    elif bg_mode == "white":
        target_color = np.array([255.0, 255.0, 255.0], dtype=np.float32)
        chroma_type = "white"
    elif bg_mode == "black":
        target_color = np.array([0.0, 0.0, 0.0], dtype=np.float32)
        chroma_type = "black"
    elif bg_mode == "chroma":
        target_color = inferred
        dist_mag = float(np.linalg.norm(inferred - np.array([255.0, 0.0, 255.0], dtype=np.float32)))
        dist_grn = float(np.linalg.norm(inferred - np.array([0.0, 255.0, 0.0], dtype=np.float32)))
        dist_blu = float(np.linalg.norm(inferred - np.array([0.0, 0.0, 255.0], dtype=np.float32)))
        if dist_mag <= 45.0:
            chroma_type = "magenta"
        elif dist_grn <= 45.0:
            chroma_type = "green"
        elif dist_blu <= 45.0:
            chroma_type = "blue"
    elif bg_mode == "auto":
        dist_magenta = float(np.linalg.norm(inferred - np.array([255.0, 0.0, 255.0], dtype=np.float32)))
        dist_green = float(np.linalg.norm(inferred - np.array([0.0, 255.0, 0.0], dtype=np.float32)))
        dist_blue = float(np.linalg.norm(inferred - np.array([0.0, 0.0, 255.0], dtype=np.float32)))
        brightness = float(np.mean(inferred))

        if dist_magenta <= 120.0 or (inferred[0] > 120 and inferred[2] > 120 and (inferred[0] - inferred[1] > 30) and (inferred[2] - inferred[1] > 30)):
            target_color = np.array([255.0, 0.0, 255.0], dtype=np.float32)
            chroma_type = "magenta"
        elif dist_green <= 120.0 or (inferred[1] > 120 and (inferred[1] - inferred[0] > 30) and (inferred[1] - inferred[2] > 30)):
            target_color = np.array([0.0, 255.0, 0.0], dtype=np.float32)
            chroma_type = "green"
        elif dist_blue <= 120.0 or (inferred[2] > 120 and (inferred[2] - inferred[0] > 30) and (inferred[2] - inferred[1] > 30)):
            target_color = np.array([0.0, 0.0, 255.0], dtype=np.float32)
            chroma_type = "blue"
        elif brightness >= 225:
            target_color = np.array([255.0, 255.0, 255.0], dtype=np.float32)
            chroma_type = "white"
        elif brightness <= 30:
            target_color = np.array([0.0, 0.0, 0.0], dtype=np.float32)
            chroma_type = "black"
        else:
            target_color = inferred
            chroma_type = "custom"
    else:
        raise ValueError(f"Unsupported background mode: {bg_mode}")

    distance = np.sqrt(np.sum((rgb - target_color) ** 2, axis=2))
    dist_inferred = np.sqrt(np.sum((rgb - inferred) ** 2, axis=2))

    if chroma_type == "magenta":
        is_magenta_hue = (
            (rgb[:, :, 0] > 50.0)
            & (rgb[:, :, 2] > 50.0)
            & ((rgb[:, :, 0] - rgb[:, :, 1]) > 18.0)
            & ((rgb[:, :, 2] - rgb[:, :, 1]) > 18.0)
        )
        background = (distance <= float(tolerance)) | (dist_inferred <= float(tolerance)) | is_magenta_hue
    elif chroma_type == "green":
        is_green_hue = (
            (rgb[:, :, 1] > 50.0)
            & ((rgb[:, :, 1] - rgb[:, :, 0]) > 20.0)
            & ((rgb[:, :, 1] - rgb[:, :, 2]) > 20.0)
        )
        background = (distance <= float(tolerance)) | (dist_inferred <= float(tolerance)) | is_green_hue
    elif chroma_type == "blue":
        is_blue_hue = (
            (rgb[:, :, 2] > 50.0)
            & ((rgb[:, :, 2] - rgb[:, :, 0]) > 20.0)
            & ((rgb[:, :, 2] - rgb[:, :, 1]) > 20.0)
        )
        background = (distance <= float(tolerance)) | (dist_inferred <= float(tolerance)) | is_blue_hue
    else:
        candidate = distance <= float(tolerance)
        background = _connected_to_border(candidate)

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = arr[:, :, :3]
    if arr.shape[2] == 4:
        rgba[:, :, 3] = arr[:, :, 3]
    else:
        rgba[:, :, 3] = 255
    rgba[background, 3] = 0
    rgba[rgba[:, :, 3] < 12, 3] = 0

    if chroma_type in ("magenta", "green", "blue"):
        mask = rgba[:, :, 3] > 0
        pad = np.pad(mask, 1, mode="constant", constant_values=False)
        is_boundary = mask & ((~pad[:-2, 1:-1]) | (~pad[2:, 1:-1]) | (~pad[1:-1, :-2]) | (~pad[1:-1, 2:]))

        pad2 = np.pad(mask & ~is_boundary, 1, mode="constant", constant_values=False)
        is_boundary_2 = (mask & ~is_boundary) & ((~pad2[:-2, 1:-1]) | (~pad2[2:, 1:-1]) | (~pad2[1:-1, :-2]) | (~pad2[1:-1, 2:]))

        pad3 = np.pad(mask & ~(is_boundary | is_boundary_2), 1, mode="constant", constant_values=False)
        is_boundary_3 = (mask & ~(is_boundary | is_boundary_2)) & ((~pad3[:-2, 1:-1]) | (~pad3[2:, 1:-1]) | (~pad3[1:-1, :-2]) | (~pad3[1:-1, 2:]))

        edge_mask = is_boundary | is_boundary_2 | is_boundary_3

        boundary_rgb = rgba[:, :, :3].astype(np.float32)
        r_edge = boundary_rgb[:, :, 0]
        g_edge = boundary_rgb[:, :, 1]
        b_edge = boundary_rgb[:, :, 2]

        if chroma_type == "magenta":
            excess_b = np.maximum(0.0, b_edge - g_edge)
            excess_r = np.maximum(0.0, r_edge - g_edge)
            excess_both = np.minimum(excess_r, excess_b)

            is_red = (r_edge - b_edge > 30) & (b_edge > g_edge + 10)
            is_blue = (b_edge - r_edge > 30) & (r_edge > g_edge + 10)
            is_mag = (~is_red) & (~is_blue) & (excess_both > 10.0)

            # Red pixels with blue/magenta spill: only remove excess blue!
            rgba[edge_mask & is_red, 2] = np.clip(b_edge[edge_mask & is_red] - excess_b[edge_mask & is_red], 0, 255).astype(np.uint8)

            # Blue pixels with red/magenta spill: only remove excess red!
            rgba[edge_mask & is_blue, 0] = np.clip(r_edge[edge_mask & is_blue] - excess_r[edge_mask & is_blue], 0, 255).astype(np.uint8)

            # Balanced magenta: remove excess from both!
            rgba[edge_mask & is_mag, 0] = np.clip(r_edge[edge_mask & is_mag] - excess_both[edge_mask & is_mag], 0, 255).astype(np.uint8)
            rgba[edge_mask & is_mag, 2] = np.clip(b_edge[edge_mask & is_mag] - excess_both[edge_mask & is_mag], 0, 255).astype(np.uint8)
        elif chroma_type == "green":
            excess = np.maximum(0.0, g_edge - np.maximum(r_edge, b_edge))
            has_spill = edge_mask & (excess > 18.0)
            rgba[has_spill, 1] = np.clip(g_edge[has_spill] - excess[has_spill], 0, 255).astype(np.uint8)
        elif chroma_type == "blue":
            excess = np.maximum(0.0, b_edge - np.maximum(r_edge, g_edge))
            has_spill = edge_mask & (excess > 18.0)
            rgba[has_spill, 2] = np.clip(b_edge[has_spill] - excess[has_spill], 0, 255).astype(np.uint8)

    rgba[rgba[:, :, 3] == 0, :3] = 0

    return rgba


def _get_cell_bounds(
    image_width: int,
    image_height: int,
    cols: int,
    rows: int,
    row: int,
    col: int,
) -> tuple[int, int, int, int]:
    x0 = int(round(col * image_width / cols))
    x1 = int(round((col + 1) * image_width / cols))
    y0 = int(round(row * image_height / rows))
    y1 = int(round((row + 1) * image_height / rows))
    return x0, y0, x1, y1


def _cell_mask_bounds(cell: np.ndarray, threshold: int = ALPHA_THRESHOLD) -> Optional[tuple[int, int, int, int]]:
    ys, xs = np.where(cell[:, :, 3] > threshold)
    if not len(xs):
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def _central_band_bounds(
    cell: np.ndarray,
    left_ratio: float = 0.25,
    right_ratio: float = 0.75,
    threshold: int = ALPHA_THRESHOLD,
) -> Optional[tuple[int, int]]:
    """Estimate body height and grounded-foot row away from weapon-tip extremes."""
    height, width = cell.shape[:2]
    x0 = max(0, int(round(width * left_ratio)))
    x1 = min(width, int(round(width * right_ratio)))
    ys, xs = np.where(cell[:, x0:x1, 3] > threshold)
    if len(ys) < 4:
        return None
    return int(ys.min()), int(ys.max())


def pad_grid_cells_to_square(
    img_arr: np.ndarray,
    cols: int = COLS,
    rows: int = ROWS,
    bg_mode: str = "magenta",
    bg_color: Optional[Union[str, tuple, list, np.ndarray]] = None,
) -> np.ndarray:
    """If cells are non-square, pad each cell individually with background to make it square.
    
    Prevents distortions and ValueError when image generators output non-square aspect ratios
    (e.g. 896x1200 or 1376x768).
    """
    h, w = img_arr.shape[:2]
    cell_w = w / float(cols)
    cell_h = h / float(rows)
    aspect = cell_w / cell_h if cell_h > 0 else 1.0

    if abs(aspect - 1.0) <= 0.03:
        return img_arr

    # Determine background color to pad with
    parsed_bg = parse_bg_color(bg_color)
    if parsed_bg is not None:
        r, g, b = [int(round(v)) for v in parsed_bg]
        bg_val = [r, g, b, 255] if img_arr.shape[2] == 4 else [r, g, b]
    elif bg_mode == "magenta":
        bg_val = [255, 0, 255, 255] if img_arr.shape[2] == 4 else [255, 0, 255]
    elif bg_mode == "green":
        bg_val = [0, 255, 0, 255] if img_arr.shape[2] == 4 else [0, 255, 0]
    elif bg_mode == "blue":
        bg_val = [0, 0, 255, 255] if img_arr.shape[2] == 4 else [0, 0, 255]
    elif bg_mode == "white":
        bg_val = [255, 255, 255, 255] if img_arr.shape[2] == 4 else [255, 255, 255]
    elif bg_mode == "black":
        bg_val = [0, 0, 0, 255] if img_arr.shape[2] == 4 else [0, 0, 0]
    else:
        bg_val = list(img_arr[0, 0])

    target_cell_side = int(round(max(cell_w, cell_h)))
    out_w = target_cell_side * cols
    out_h = target_cell_side * rows

    out_arr = np.zeros((out_h, out_w, img_arr.shape[2]), dtype=img_arr.dtype)
    out_arr[:] = bg_val

    for r in range(rows):
        for c in range(cols):
            x0, y0, x1, y1 = _get_cell_bounds(w, h, cols, rows, r, c)
            cell = img_arr[y0:y1, x0:x1]
            ch, cw = cell.shape[:2]
            off_x = (target_cell_side - cw) // 2
            off_y = (target_cell_side - ch) // 2
            dst_x0 = c * target_cell_side + off_x
            dst_y0 = r * target_cell_side + off_y
            out_arr[dst_y0 : dst_y0 + ch, dst_x0 : dst_x0 + cw] = cell

    _print(f"[INFO] Auto-padded non-square source grid from {w}x{h} (cells {cell_w:.1f}x{cell_h:.1f}) to {out_w}x{out_h} (square cells {target_cell_side}x{target_cell_side}).")
    return out_arr


def _warn_if_unusual_source_size(width: int, height: int, cols: int, rows: int, label: str) -> None:
    source_cell_w = width / float(cols)
    source_cell_h = height / float(rows)
    aspect = source_cell_w / source_cell_h if source_cell_h else 0.0
    if abs(aspect - 1.0) > 0.03:
        raise ValueError(
            f"{label}: source cells are not approximately square: image {width}x{height} "
            f"gives cells {source_cell_w:.2f}x{source_cell_h:.2f}. Expected a grid "
            "of square cells (for example 576x384 or 1152x768). Consider auto-padding."
        )
    if width % cols != 0 or height % rows != 0:
        _print(
            f"WARNING {label}: source dimensions {width}x{height} are not divisible exactly "
            f"by {cols}x{rows}; frame boundaries will be rounded to the nearest pixel."
        )



def analyze_sheet(
    rgba_arr: np.ndarray,
    cell_size: int = CELL_SIZE,
    cols: int = COLS,
    rows: int = ROWS,
    target_feet_y: int = 88,
    target_char_h: float = 68.0,
    max_char_h: float = 72.0,
    label: str = "sheet",
) -> dict[str, object]:
    """Inspect a sheet and return its target scale, safe scale ceiling, and row baselines."""
    if cell_size <= 0 or cols <= 0 or rows <= 0:
        raise ValueError("cell_size, cols and rows must be positive integers")
    if rows not in (3, 4) or cols != 6:
        _print(f"WARNING {label}: this pipeline is designed for exactly 6 columns x 4 rows (or 6 columns x 3 rows).")


    image_h, image_w = rgba_arr.shape[:2]
    _warn_if_unusual_source_size(image_w, image_h, cols, rows, label)
    source_cell_h = image_h / float(rows)

    # Use the central body region to estimate character height. This reduces the
    # chance that a long glaive/blade at the edge of a frame makes every sprite tiny.
    body_heights: list[int] = []
    cell_info: dict[tuple[int, int], dict[str, object]] = {}
    for row in range(rows):
        for col in range(cols):
            x0, y0, x1, y1 = _get_cell_bounds(image_w, image_h, cols, rows, row, col)
            cell = rgba_arr[y0:y1, x0:x1]
            bounds = _cell_mask_bounds(cell)
            central = _central_band_bounds(cell)
            if central is None and bounds is not None:
                central = (bounds[1], bounds[3])
            if bounds is not None:
                min_x, min_y, max_x, max_y = bounds
                foot_y = central[1] if central is not None else max_y
                body_height = (central[1] - central[0] + 1) if central is not None else (max_y - min_y + 1)
                if body_height >= 4:
                    body_heights.append(body_height)
                cell_info[(row, col)] = {
                    "bounds": bounds,
                    "foot_y": foot_y,
                    "body_height": body_height,
                    "cell_size": (cell.shape[1], cell.shape[0]),
                }
            else:
                cell_info[(row, col)] = {
                    "bounds": None,
                    "foot_y": None,
                    "body_height": 0,
                    "cell_size": (cell.shape[1], cell.shape[0]),
                }

    if not body_heights:
        raise ValueError(f"{label}: no opaque character pixels were detected after background removal")

    reference_height = float(np.median(body_heights))
    wanted_scale = min(target_char_h / reference_height, max_char_h / reference_height)

    row_baselines: dict[int, float] = {}
    for row in range(rows):
        feet = [
            float(info["foot_y"])
            for (r, _), info in cell_info.items()
            if r == row and info["foot_y"] is not None
        ]
        row_baselines[row] = float(np.median(feet)) if feet else source_cell_h - 3

    # Determine a safe upper scale limit across all visible pixels, so weapon tips,
    # hands, headgear and feet remain inside every target cell.
    max_safe_scale = float("inf")
    center_x = cell_size / 2.0
    for (row, _col), info in cell_info.items():
        bounds = info["bounds"]
        if bounds is None:
            continue
        min_x, min_y, max_x, max_y = bounds
        src_w, _src_h = info["cell_size"]  # type: ignore[misc]
        max_dx = max(abs(min_x - src_w / 2.0), abs(max_x - src_w / 2.0))
        if max_dx > 0:
            max_safe_scale = min(max_safe_scale, center_x / max_dx)
        baseline = row_baselines[row]
        if baseline > min_y:
            max_safe_scale = min(max_safe_scale, target_feet_y / (baseline - min_y))
        if max_y > baseline:
            available_below = (cell_size - 1) - target_feet_y
            max_safe_scale = min(max_safe_scale, available_below / (max_y - baseline))

    return {
        "width": image_w,
        "height": image_h,
        "reference_height": reference_height,
        "wanted_scale": wanted_scale,
        "max_safe_scale": max_safe_scale,
        "row_baselines": row_baselines,
        "cell_info": cell_info,
    }


def align_and_pack_sheet(
    rgba_arr: np.ndarray,
    cell_size: int = CELL_SIZE,
    cols: int = COLS,
    rows: int = ROWS,
    target_feet_y: int = 88,
    target_char_h: float = 68.0,
    max_char_h: float = 72.0,
    mirror_left: bool = False,
    mirror_right: bool = False,
    label: str = "sheet",
    scale_override: Optional[float] = None,
    analysis: Optional[dict[str, object]] = None,
    row_order: str = "fblr",
) -> Image.Image:
    """Resize one sheet with a constant scale, cell-centered origins and foot anchoring.

    The complete source cell (including transparent padding) is resized with nearest-
    neighbor sampling. This preserves the grid's intended horizontal origin instead of
    centering each silhouette's bounding box, which causes weapon-heavy frames to jitter.
    """
    info = analysis or analyze_sheet(
        rgba_arr,
        cell_size=cell_size,
        cols=cols,
        rows=rows,
        target_feet_y=target_feet_y,
        target_char_h=target_char_h,
        max_char_h=max_char_h,
        label=label,
    )
    image_h, image_w = rgba_arr.shape[:2]
    row_baselines = info["row_baselines"]
    wanted_scale = float(info["wanted_scale"]) if scale_override is None else float(scale_override)
    max_safe_scale = float(info["max_safe_scale"])
    scale = min(wanted_scale, max_safe_scale)

    if scale <= 0:
        raise ValueError(f"{label}: computed invalid scale factor {scale}")
    if scale < wanted_scale - 1e-4:
        _print(
            f"WARNING {label}: scale reduced from {wanted_scale:.3f} to {scale:.3f} "
            "to keep all visible pixels inside the 96x96 cells. Inspect long-weapon frames."
        )

    out_rows = ROWS  # Always 4 rows in output (576x384)
    output = np.zeros((out_rows * cell_size, cols * cell_size, 4), dtype=np.uint8)
    for row in range(out_rows):
        src_row = row
        flip_horizontal = False
        if rows == 3:
            # Source has 3 rows: 0=FRONT, 1=BACK, 2=RIGHT.
            # Output row 3 (LEFT) is generated by mirroring source row 2 (RIGHT).
            if row == 3:
                src_row = 2
                flip_horizontal = True
        elif row_order == "fbrl":
            # FRONT=0, BACK=1, RIGHT=2, LEFT=3
            if row == 2 and mirror_right:
                src_row = 3
                flip_horizontal = True
            elif row == 3 and mirror_left:
                src_row = 2
                flip_horizontal = True
        else:
            # FRONT=0, BACK=1, LEFT=2, RIGHT=3
            if row == 2 and mirror_left:
                src_row = 3
                flip_horizontal = True
            elif row == 3 and mirror_right:
                src_row = 2
                flip_horizontal = True

        baseline = float(row_baselines[src_row])

        for col in range(cols):
            x0, y0, x1, y1 = _get_cell_bounds(image_w, image_h, cols, rows, src_row, col)
            cell = rgba_arr[y0:y1, x0:x1]
            if not np.any(cell[:, :, 3] > ALPHA_THRESHOLD):
                continue

            src_image = Image.fromarray(cell, mode="RGBA")
            if flip_horizontal:
                src_image = src_image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

            src_w, src_h = src_image.size
            new_w = max(1, int(round(src_w * scale)))
            new_h = max(1, int(round(src_h * scale)))
            resized = np.asarray(src_image.resize((new_w, new_h), Image.Resampling.NEAREST))

            dst_x = int(round((cell_size - new_w) / 2.0))
            dst_y = int(round(target_feet_y - baseline * scale))

            # Clip only at the cell boundary; analysis constrains scale to avoid clipping
            # visible pixels under the assumed source-grid contract.
            src_x0 = max(0, -dst_x)
            src_y0 = max(0, -dst_y)
            src_x1 = min(new_w, cell_size - dst_x)
            src_y1 = min(new_h, cell_size - dst_y)
            if src_x0 >= src_x1 or src_y0 >= src_y1:
                continue

            dst_cell_x = col * cell_size
            dst_cell_y = row * cell_size
            cropped = resized[src_y0:src_y1, src_x0:src_x1]
            target = output[
                dst_cell_y + dst_y + src_y0 : dst_cell_y + dst_y + src_y1,
                dst_cell_x + dst_x + src_x0 : dst_cell_x + dst_x + src_x1,
            ]
            # Every destination slice belongs to exactly one cell and output starts
            # transparent, so copying the RGBA tile is sufficient and avoids resampling.
            target[:, :, :] = cropped

    return Image.fromarray(output, mode="RGBA")

def process_portrait(
    portrait_input: Optional[str],
    out_path: Path,
    cell_size: int = CELL_SIZE,
    fallback_idle_sheet: Optional[Image.Image] = None,
    bg_mode: str = "auto",
    bg_tolerance: float = 36.0,
    bg_color: Optional[Union[str, tuple, list, np.ndarray]] = None,
) -> None:
    """Write a 96x96 portrait; use IDLE front frame if no separate image is supplied."""
    if portrait_input:
        source_path = Path(portrait_input)
        if not source_path.is_file():
            raise FileNotFoundError(f"Portrait image not found: {source_path}")
        with Image.open(source_path) as raw:
            rgba = detect_and_clean_background(np.asarray(raw.convert("RGBA")), bg_mode, bg_tolerance, bg_color=bg_color)
        ys, xs = np.where(rgba[:, :, 3] > ALPHA_THRESHOLD)
        if len(xs):
            min_x, max_x = int(xs.min()), int(xs.max())
            min_y, max_y = int(ys.min()), int(ys.max())
            cropped = rgba[min_y : max_y + 1, min_x : max_x + 1]
            crop_h, crop_w = cropped.shape[:2]
            side = max(crop_w, crop_h)
            square = np.zeros((side, side, 4), dtype=np.uint8)
            put_x = (side - crop_w) // 2
            put_y = (side - crop_h) // 2
            square[put_y : put_y + crop_h, put_x : put_x + crop_w] = cropped
            res = Image.fromarray(square, mode="RGBA").resize((cell_size, cell_size), Image.Resampling.NEAREST)
            res.save(out_path)
            _print(f"[OK] Processed portrait: {out_path} ({res.size})")
            return
        raise ValueError(f"Portrait image has no visible pixels: {source_path}")

    if fallback_idle_sheet is not None:
        # First cell of row 0 is FRONT frame 1 under the authoritative row contract.
        crop_cell = fallback_idle_sheet.crop((0, 0, cell_size, cell_size))
        crop_cell.save(out_path)
        _print(f"[OK] Created portrait from IDLE FRONT frame 1: {out_path} ({crop_cell.size})")


def extract_turnaround_assets(
    turnaround_path: Path,
    out_dir: Path,
    character_name: str,
    bg_mode: str = "magenta",
    bg_tolerance: float = 65.0,
    bg_color: Optional[Union[str, tuple, list, np.ndarray]] = None,
) -> tuple[Optional[Path], Optional[Path]]:
    """Extract weapon preview and portrait from turnaround sheet.
    
    Supports:
    - 4-column turnaround (Column 1 contains stacked Portrait on top and Weapon Preview on bottom).
    - Legacy 5-column turnaround (Panel 1 = Portrait, Panel 5 = Weapon Preview).
    """
    if not turnaround_path.is_file():
        return None, None

    with Image.open(turnaround_path) as raw:
        rgba = detect_and_clean_background(np.asarray(raw.convert("RGBA")), bg_mode, bg_tolerance, bg_color=bg_color)

    h, w = rgba.shape[:2]
    out_dir.mkdir(parents=True, exist_ok=True)
    portrait_out: Optional[Path] = None
    weapon_out: Optional[Path] = None

    # Check first column (w // 4 for 4-column or w // 5 for 5-column)
    col1_w_4 = w // 4
    col1_w_5 = w // 5

    # Check if modern 4-column layout is used: Column 1 (0..w//4) has Portrait (top half) and Weapon (bottom half)
    col1 = rgba[:, 0:col1_w_4]
    mid_y = h // 2
    top_half = col1[:mid_y, :]
    bot_half = col1[mid_y:, :]
    has_stacked_weapon = np.any(bot_half[:, :, 3] > ALPHA_THRESHOLD)

    if has_stacked_weapon:

        # Top half: Portrait
        ys_p, xs_p = np.where(top_half[:, :, 3] > ALPHA_THRESHOLD)
        if len(xs_p):
            crop = top_half[ys_p.min():ys_p.max()+1, xs_p.min():xs_p.max()+1]
            ch, cw = crop.shape[:2]
            side = max(ch, cw)
            sq = np.zeros((side, side, 4), dtype=np.uint8)
            sq[(side - ch) // 2 : (side - ch) // 2 + ch, (side - cw) // 2 : (side - cw) // 2 + cw] = crop
            res = Image.fromarray(sq, mode="RGBA").resize((96, 96), Image.Resampling.NEAREST)
            portrait_out = out_dir / f"hero_{character_name}_portrait.png"
            res.save(portrait_out)
            _print(f"[OK] Extracted portrait from 4-col turnaround (col 1 top): {portrait_out}")

        # Bottom half: Weapon Preview
        ys_w, xs_w = np.where(bot_half[:, :, 3] > ALPHA_THRESHOLD)
        if len(xs_w):
            crop = bot_half[ys_w.min():ys_w.max()+1, xs_w.min():xs_w.max()+1]
            ch, cw = crop.shape[:2]
            side = max(ch, cw)
            sq = np.zeros((side, side, 4), dtype=np.uint8)
            sq[(side - ch) // 2 : (side - ch) // 2 + ch, (side - cw) // 2 : (side - cw) // 2 + cw] = crop
            res = Image.fromarray(sq, mode="RGBA").resize((96, 96), Image.Resampling.NEAREST)
            weapon_out = out_dir / f"weapon_{character_name}.png"
            res.save(weapon_out)
            _print(f"[OK] Extracted weapon icon from 4-col turnaround (col 1 bottom): {weapon_out}")

    else:
        # Legacy 5-panel layout: Panel 0 = Portrait, Panel 4 = Weapon Preview
        panel_w = col1_w_5
        portrait_panel = rgba[:, 0:panel_w]
        ys, xs = np.where(portrait_panel[:, :, 3] > ALPHA_THRESHOLD)
        if len(xs):
            crop = portrait_panel[ys.min():ys.max()+1, xs.min():xs.max()+1]
            ch, cw = crop.shape[:2]
            side = max(ch, cw)
            sq = np.zeros((side, side, 4), dtype=np.uint8)
            sq[(side - ch) // 2 : (side - ch) // 2 + ch, (side - cw) // 2 : (side - cw) // 2 + cw] = crop
            res = Image.fromarray(sq, mode="RGBA").resize((96, 96), Image.Resampling.NEAREST)
            portrait_out = out_dir / f"hero_{character_name}_portrait.png"
            res.save(portrait_out)
            _print(f"[OK] Extracted portrait from turnaround panel 1: {portrait_out}")

        weapon_panel = panel5_legacy
        ys, xs = np.where(weapon_panel[:, :, 3] > ALPHA_THRESHOLD)
        if len(xs):
            crop = weapon_panel[ys.min():ys.max()+1, xs.min():xs.max()+1]
            ch, cw = crop.shape[:2]
            side = max(ch, cw)
            sq = np.zeros((side, side, 4), dtype=np.uint8)
            sq[(side - ch) // 2 : (side - ch) // 2 + ch, (side - cw) // 2 : (side - cw) // 2 + cw] = crop
            res = Image.fromarray(sq, mode="RGBA").resize((96, 96), Image.Resampling.NEAREST)
            weapon_out = out_dir / f"weapon_{character_name}.png"
            res.save(weapon_out)
            _print(f"[OK] Extracted weapon icon from turnaround panel 5: {weapon_out}")

    return portrait_out, weapon_out


def generate_animated_previews(
    sheet_map: dict[str, Image.Image],
    out_dir: Path,
    character_name: str,
    cell_size: int = CELL_SIZE,
    cols: int = COLS,
    fps: int = 6,
) -> list[Path]:
    """Generate animated GIF loops for each animation state and directional facing."""
    preview_dir = out_dir / "previews"
    preview_dir.mkdir(parents=True, exist_ok=True)
    generated: list[Path] = []
    directions = ("front", "back", "right", "left")
    duration_ms = int(round(1000.0 / fps))

    for state, sheet in sheet_map.items():
        for row_idx, dir_name in enumerate(directions):
            frames: list[Image.Image] = []
            for col_idx in range(cols):
                box = (
                    col_idx * cell_size,
                    row_idx * cell_size,
                    (col_idx + 1) * cell_size,
                    (row_idx + 1) * cell_size,
                )
                frames.append(sheet.crop(box))

            if frames:
                gif_path = preview_dir / f"{character_name}_{state}_{dir_name}.gif"
                # Save animated gif with transparency preservation
                frames[0].save(
                    gif_path,
                    save_all=True,
                    append_images=frames[1:],
                    duration=duration_ms,
                    loop=0,
                    disposal=2,
                )
                generated.append(gif_path)

    _print(f"[OK] Generated {len(generated)} animated preview GIFs in {preview_dir}")
    return generated



def verify_facing_directions(
    image_arr: np.ndarray,
    cols: int = COLS,
    rows: int = ROWS,
    label: str = "sheet",
    expected_row_order: str = "fbrl",
) -> tuple[bool, str]:
    """Verify that Row 2 (3rd row) faces RIGHT and Row 3 (4th row) faces LEFT in profile.

    Checks:
    1. Row 2 and Row 3 face in opposite directions (horizontal flip test: IoU(flip(Row2), Row3) > IoU(Row2, Row3)).
    2. Body is turned sideways (боком) and face is in strict profile (в профиль).
    3. Row 2 faces RIGHT (forward facial bias > 0 and > Row 3).
    4. Row 3 faces LEFT (forward facial bias < 0 and < Row 2).
    """
    h, w = image_arr.shape[:2]
    cell_h, cell_w = h // rows, w // cols

    iou_flipped_list: list[float] = []
    iou_direct_list: list[float] = []
    r2_biases: list[float] = []
    r3_biases: list[float] = []

    for col in range(cols):
        c2 = image_arr[cell_h * 2 : cell_h * 3, col * cell_w : (col + 1) * cell_w]
        c3 = image_arr[cell_h * 3 : cell_h * 4, col * cell_w : (col + 1) * cell_w]

        m2 = c2[:, :, 3] > ALPHA_THRESHOLD
        m3 = c3[:, :, 3] > ALPHA_THRESHOLD
        if not m2.any() or not m3.any():
            continue

        m2_flip = np.fliplr(m2)
        iou_f = float(np.logical_and(m2_flip, m3).sum() / max(1, np.logical_or(m2_flip, m3).sum()))
        iou_d = float(np.logical_and(m2, m3).sum() / max(1, np.logical_or(m2, m3).sum()))
        iou_flipped_list.append(iou_f)
        iou_direct_list.append(iou_d)

        ys2, xs2 = np.where(m2)
        top2 = ys2 < (ys2.min() + (ys2.max() - ys2.min()) * 0.5)
        center2 = (xs2.min() + xs2.max()) / 2.0

        ys3, xs3 = np.where(m3)
        top3 = ys3 < (ys3.min() + (ys3.max() - ys3.min()) * 0.5)
        center3 = (xs3.min() + xs3.max()) / 2.0

        face2 = top2 & (c2[ys2, xs2, 0] > 130) & (c2[ys2, xs2, 1] > 70) & (c2[ys2, xs2, 0] >= c2[ys2, xs2, 2])
        face3 = top3 & (c3[ys3, xs3, 0] > 130) & (c3[ys3, xs3, 1] > 70) & (c3[ys3, xs3, 0] >= c3[ys3, xs3, 2])

        bias2 = float(xs2[face2].mean() - center2) if face2.any() else float(xs2[top2].mean() - center2)
        bias3 = float(xs3[face3].mean() - center3) if face3.any() else float(xs3[top3].mean() - center3)
        r2_biases.append(bias2)
        r3_biases.append(bias3)

    if not iou_flipped_list:
        return False, f"{label}: Row 2 or Row 3 contains no visible sprite frames."

    avg_iou_f = float(np.mean(iou_flipped_list))
    avg_iou_d = float(np.mean(iou_direct_list))
    avg_b2 = float(np.mean(r2_biases))
    avg_b3 = float(np.mean(r3_biases))

    if expected_row_order == "fbrl":
        # Row 2 = RIGHT, Row 3 = LEFT
        if avg_iou_f <= avg_iou_d:
            return False, (
                f"{label}: Row 2 (3rd row) and Row 3 (4th row) must face in opposite profile directions! "
                f"Flipped IoU ({avg_iou_f:.3f}) <= Direct IoU ({avg_iou_d:.3f})."
            )
        if avg_b2 <= avg_b3:
            return False, (
                f"{label}: Row 2 (3rd row) must face RIGHT (bias={avg_b2:+.2f}) and Row 3 (4th row) must face LEFT (bias={avg_b3:+.2f})."
            )
    elif expected_row_order == "fblr":
        # Row 2 = LEFT, Row 3 = RIGHT
        if avg_iou_f <= avg_iou_d:
            return False, (
                f"{label}: Row 2 (3rd row) and Row 3 (4th row) must face in opposite profile directions! "
                f"Flipped IoU ({avg_iou_f:.3f}) <= Direct IoU ({avg_iou_d:.3f})."
            )
        if avg_b3 <= avg_b2:
            return False, (
                f"{label}: Row 2 (3rd row) must face LEFT (bias={avg_b2:+.2f}) and Row 3 (4th row) must face RIGHT (bias={avg_b3:+.2f})."
            )

    return True, (
        f"OK {label}: Row 2 and Row 3 verified in profile (opposite IoU {avg_iou_f:.3f} vs {avg_iou_d:.3f}, "
        f"Row 2 bias={avg_b2:+.2f}, Row 3 bias={avg_b3:+.2f})."
    )


def process_character(
    name: str,
    idle_path: str,
    walk_path: str,
    attack_path: Optional[str] = None,
    idle_attack_path: Optional[str] = None,
    walk_attack_path: Optional[str] = None,
    portrait_path: Optional[str] = None,
    turnaround_path: Optional[str] = None,
    out_dir: str = "public/textures/heroes",
    cell_size: int = CELL_SIZE,
    cols: int = COLS,
    rows: int = ROWS,
    target_feet_y: int = 88,
    target_char_h: float = 68.0,
    max_char_h: float = 72.0,
    mirror_left: bool = False,
    mirror_right: bool = False,
    bg_mode: str = "magenta",
    bg_tolerance: float = 65.0,
    bg_color: Optional[Union[str, tuple, list, np.ndarray]] = None,
    legacy_front_portrait: bool = False,
    row_order: str = "fbrl",
    strict_facing: bool = False,
    auto_square: bool = True,
    generate_previews: bool = True,
) -> None:
    output_dir = Path(out_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    clean_name = name if name.startswith("hero_") else f"hero_{name}"
    raw_name = name.replace("hero_", "")

    resolved_idle_attack = idle_attack_path or attack_path
    if not resolved_idle_attack:
        raise ValueError("Must provide either --idle-attack or --attack for the stationary attack animation.")

    inputs: dict[str, str] = {
        "idle": idle_path,
        "walk": walk_path,
        "attack": resolved_idle_attack
    }
    if walk_attack_path:
        inputs["walk_attack"] = walk_attack_path

    rgba_sources: dict[str, np.ndarray] = {}
    analyses: dict[str, dict[str, object]] = {}

    # Load, auto-pad, and inspect all sheets first.
    # Supports both 4-row (6x4) and 3-row (6x3 with FRONT, BACK, RIGHT) inputs.
    effective_mirror_left = mirror_left
    if rows == 3:
        effective_mirror_left = True

    for state, input_path in inputs.items():
        source_path = Path(input_path)
        if not source_path.is_file():
            raise FileNotFoundError(f'Missing input image for state "{state}": {source_path}')
        with Image.open(source_path) as raw:
            raw_arr = np.asarray(raw.convert("RGBA"))
            if auto_square:
                raw_arr = pad_grid_cells_to_square(raw_arr, cols=cols, rows=rows, bg_mode=bg_mode, bg_color=bg_color)
            rgba = detect_and_clean_background(raw_arr, bg_mode, bg_tolerance, bg_color=bg_color)
        rgba_sources[state] = rgba
        analyses[state] = analyze_sheet(
            rgba,
            cell_size=cell_size,
            cols=cols,
            rows=rows,
            target_feet_y=target_feet_y,
            target_char_h=target_char_h,
            max_char_h=max_char_h,
            label=state.upper(),
        )

    sizes = {(arr.shape[1], arr.shape[0]) for arr in rgba_sources.values()}
    if len(sizes) != 1:
        formatted = ", ".join(f"{state.upper()}={arr.shape[1]}x{arr.shape[0]}" for state, arr in rgba_sources.items())
        raise ValueError(
            "IDLE, WALK and ATTACK source sheets must have the same dimensions to preserve character scale "
            f"across states; got {formatted}. Normalize the source sheets to the same canvas first."
        )

    # IDLE is the scale reference; the smallest safe limit across all states protects
    # every visible weapon/body pixel without independently rescaling ATTACK or WALK.
    reference_scale = float(analyses["idle"]["wanted_scale"])
    global_safe_scale = min(float(item["max_safe_scale"]) for item in analyses.values())
    shared_scale = min(reference_scale, global_safe_scale)
    if shared_scale < reference_scale - 1e-4:
        _print(
            f"WARNING: shared scale reduced from {reference_scale:.3f} to {shared_scale:.3f} "
            "to fit the most extended frame across IDLE/WALK/ATTACK. Inspect long-weapon poses."
        )
    _print(
        f"[INFO] Shared scale: {shared_scale:.4f}; IDLE body-height estimate: "
        f"{float(analyses['idle']['reference_height']):.1f} source px."
    )

    processed: dict[str, Image.Image] = {}
    for state in inputs:
        sheet = align_and_pack_sheet(
            rgba_sources[state],
            cell_size=cell_size,
            cols=cols,
            rows=rows,
            target_feet_y=target_feet_y,
            target_char_h=target_char_h,
            max_char_h=max_char_h,
            mirror_left=effective_mirror_left,
            mirror_right=mirror_right,
            label=state.upper(),
            scale_override=shared_scale,
            analysis=analyses[state],
            row_order=row_order,
        )
        out_file = output_dir / f"{clean_name}_{state}.png"
        temp_file = out_file.with_suffix(out_file.suffix + ".tmp")
        sheet.save(temp_file, format="PNG", optimize=True)
        os.replace(temp_file, out_file)
        processed[state] = sheet
        _print(f"[OK] Processed {state.upper()}: {out_file} ({sheet.size})")

        if state == "attack":
            idle_attack_file = output_dir / f"{clean_name}_idle_attack.png"
            temp_idle_attack = idle_attack_file.with_suffix(idle_attack_file.suffix + ".tmp")
            sheet.save(temp_idle_attack, format="PNG", optimize=True)
            os.replace(temp_idle_attack, idle_attack_file)
            _print(f"[OK] Processed IDLE_ATTACK: {idle_attack_file} ({sheet.size})")

        # Facing direction verification for Row 2 (3rd row) and Row 3 (4th row)
        facing_ok, facing_msg = verify_facing_directions(
            np.asarray(sheet), cols=cols, rows=ROWS, label=state.upper(), expected_row_order=row_order
        )
        if facing_ok:
            _print(f"  -> [OK] Facing directions verified: {facing_msg}")
        else:
            if strict_facing:
                raise ValueError(facing_msg)
            _print(f"  -> [WARNING] Facing check: {facing_msg}")

    # Extract turnaround assets if supplied
    extracted_portrait: Optional[Path] = None
    if turnaround_path:
        t_path = Path(turnaround_path)
        extracted_portrait, _extracted_weapon = extract_turnaround_assets(
            t_path, output_dir, raw_name, bg_mode=bg_mode, bg_tolerance=bg_tolerance, bg_color=bg_color
        )

    portrait_suffix = "front" if legacy_front_portrait else "portrait"
    portrait_out = output_dir / f"{clean_name}_{portrait_suffix}.png"
    chosen_portrait = portrait_path or (str(extracted_portrait) if extracted_portrait else None)
    process_portrait(
        chosen_portrait,
        portrait_out,
        cell_size=cell_size,
        fallback_idle_sheet=processed.get("idle"),
        bg_mode=bg_mode,
        bg_tolerance=bg_tolerance,
        bg_color=bg_color,
    )

    if generate_previews:
        generate_animated_previews(processed, output_dir, raw_name, cell_size=cell_size, cols=cols)

    _print(f'\nSuccess! Character package ready for "{clean_name}" (IDLE, WALK, ATTACK).')


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Process 6x4 or 6x3 IDLE/WALK/IDLE_ATTACK/WALK_ATTACK sheets into 96x96 RGBA sprite cells."
    )
    parser.add_argument("--name", "-n", required=True, help="Character name (e.g. glaive_warrior or hero_glaive_warrior)")
    parser.add_argument("--idle", required=True, help="Path to the IDLE sheet; rows FRONT/BACK/RIGHT[/LEFT]")
    parser.add_argument("--walk", required=True, help="Path to the WALK sheet; rows FRONT/BACK/RIGHT[/LEFT]")
    parser.add_argument("--attack", help="Path to the IDLE_ATTACK sheet; rows FRONT/BACK/RIGHT[/LEFT]")
    parser.add_argument("--idle-attack", help="Alias for --attack (path to stationary attack sheet)")
    parser.add_argument("--walk-attack", help="Optional path to the WALK_ATTACK sheet")
    parser.add_argument("--portrait", help="Optional separate portrait; if omitted the turnaround or first IDLE FRONT cell is used")
    parser.add_argument("--turnaround", help="Optional path to 5-in-1 turnaround sheet (auto-extracts portrait & weapon icon)")
    parser.add_argument("--out-dir", "-o", default="public/textures/heroes", help="Output directory")
    parser.add_argument("--cell-size", type=int, default=CELL_SIZE, help="Output cell size (default: 96)")
    parser.add_argument("--cols", type=int, default=COLS, help="Source columns (pipeline default: 6)")
    parser.add_argument("--rows", type=int, default=ROWS, choices=(3, 4), help="Source rows: 4 (FRONT, BACK, RIGHT, LEFT) or 3 (FRONT, BACK, RIGHT with auto-mirrored LEFT). Default: 4")
    parser.add_argument("--feet-y", type=int, default=88, help="Target foot baseline (default: 88; 8px bottom buffer)")
    parser.add_argument("--char-h", type=float, default=68.0, help="Target estimated body height in output pixels (default: 68)")
    parser.add_argument("--max-h", type=float, default=72.0, help="Maximum estimated body height in output pixels (default: 72)")
    parser.add_argument("--bg-mode", choices=("magenta", "green", "blue", "auto", "white", "black", "chroma", "none"), default="magenta", help="Background to remove (default: magenta RGB(255,0,255); green RGB(0,255,0) recommended for characters with pink/purple/magenta elements); auto detects from corners")
    parser.add_argument("--bg-color", help="Explicit background color to remove, e.g. '#00ff00', 'green', 'magenta', or '0,255,0'. Overrides --bg-mode")
    parser.add_argument("--bg-tolerance", type=float, default=65.0, help="Euclidean RGB background tolerance (default: 65.0)")
    parser.add_argument("--row-order", choices=("fbrl", "fblr"), default="fbrl", help="Row order: fbrl (FRONT, BACK, RIGHT, LEFT) or fblr (FRONT, BACK, LEFT, RIGHT). Default: fbrl")
    parser.add_argument("--mirror-left", action="store_true", help="Mirror right row into left row; default enabled for --rows 3")
    parser.add_argument("--mirror-right", action="store_true", help="Mirror left row into right row")
    parser.add_argument("--no-auto-square", action="store_true", help="Disable automatic square cell padding")
    parser.add_argument("--no-previews", action="store_true", help="Disable animated GIF preview generation")
    parser.add_argument("--legacy-front-portrait", action="store_true", help="Save the portrait as *_front.png instead of the new default *_portrait.png")
    parser.add_argument("--strict-facing", action="store_true", help="Fail with error if Row 2/3 facing directions do not match expected orientation")
    args = parser.parse_args(argv)

    if not args.attack and not args.idle_attack:
        parser.error("one of --idle-attack or --attack is required")

    if args.cell_size != 96 or args.cols != 6 or args.rows not in (3, 4):
        parser.error("this pipeline requires --cell-size 96 --cols 6 --rows 3 or 4 (576x384 output sheets)")
    if args.feet_y < 0 or args.feet_y >= args.cell_size:
        parser.error("--feet-y must be inside the output cell")
    if args.char_h <= 0 or args.max_h <= 0:
        parser.error("--char-h and --max-h must be positive")
    if args.bg_tolerance < 0:
        parser.error("--bg-tolerance must be non-negative")

    try:
        process_character(
            name=args.name,
            idle_path=args.idle,
            walk_path=args.walk,
            attack_path=args.attack,
            idle_attack_path=args.idle_attack,
            walk_attack_path=args.walk_attack,
            portrait_path=args.portrait,
            turnaround_path=args.turnaround,
            out_dir=args.out_dir,
            cell_size=args.cell_size,
            cols=args.cols,
            rows=args.rows,
            target_feet_y=args.feet_y,
            target_char_h=args.char_h,
            max_char_h=args.max_h,
            mirror_left=args.mirror_left,
            mirror_right=args.mirror_right,
            bg_mode=args.bg_mode,
            bg_tolerance=args.bg_tolerance,
            bg_color=args.bg_color,
            legacy_front_portrait=args.legacy_front_portrait,
            row_order=args.row_order,
            strict_facing=args.strict_facing,
            auto_square=not args.no_auto_square,
            generate_previews=not args.no_previews,
        )
    except (FileNotFoundError, ValueError, OSError) as exc:
        _print(f"ERROR: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
