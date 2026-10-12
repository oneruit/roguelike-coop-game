"""
Chroma Key Background Removal and Sheet Slicing Script for Character Pipeline.
Replaces RGB(255, 0, 255) [Pure Magenta / #FF00FF] with transparent alpha (RGBA).
Supports:
1. Border flood-fill chroma keying (protects magenta accents inside the character).
2. Global color keying.
3. Automated horizontal segmentation and slicing into 5 components:
   - Portrait (close-up bust)
   - Front view (full body)
   - Back view (full body)
   - Right profile view (full body)
   - Weapon preview (isolated weapon)
"""

import argparse
import sys
from collections import deque
from pathlib import Path
from PIL import Image


def color_distance(c1, c2):
    """Euclidean distance in RGB space."""
    return sum((a - b) ** 2 for a, b in zip(c1[:3], c2[:3])) ** 0.5


def is_chroma_key(color, target=(255, 0, 255), tolerance=20.0):
    return color_distance(color, target) <= tolerance


def remove_chromakey_floodfill(image: Image.Image, target=(255, 0, 255), tolerance=20.0) -> Image.Image:
    """
    Flood-fill keying from borders.
    Guarantees that magenta accents inside the character (gems, magic eyes)
    are NOT accidentally removed if they are not part of the background.
    """
    img = image.convert("RGBA")
    width, height = img.size
    pixels = img.load()

    visited = [[False] * height for _ in range(width)]
    queue = deque()

    # Seed from all 4 borders
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        cx, cy = queue.popleft()
        if visited[cx][cy]:
            continue
        visited[cx][cy] = True

        current_color = pixels[cx, cy]
        if is_chroma_key(current_color, target, tolerance):
            # Set transparent
            pixels[cx, cy] = (current_color[0], current_color[1], current_color[2], 0)

            # Check 4 neighbors
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < width and 0 <= ny < height and not visited[nx][ny]:
                    queue.append((nx, ny))

    return img


def remove_chromakey_global(image: Image.Image, target=(255, 0, 255), tolerance=20.0) -> Image.Image:
    """Replaces all matching pixels across the entire image with transparent alpha."""
    img = image.convert("RGBA")
    width, height = img.size
    pixels = img.load()

    for x in range(width):
        for y in range(height):
            c = pixels[x, y]
            if is_chroma_key(c, target, tolerance):
                pixels[x, y] = (c[0], c[1], c[2], 0)

    return img


def detect_horizontal_segments(img: Image.Image, min_gap: int = 4, min_width: int = 15):
    """
    Detects continuous non-transparent segments along the X-axis.
    Returns list of (start_x, end_x) tuples.
    """
    w, h = img.size
    pixels = img.load()

    has_pixels = [any(pixels[x, y][3] > 0 for y in range(h)) for x in range(w)]

    segments = []
    in_seg = False
    start = 0

    for x, val in enumerate(has_pixels):
        if val and not in_seg:
            in_seg = True
            start = x
        elif not val and in_seg:
            # Check gap length before closing segment
            lookahead_empty = all(not has_pixels[min(w - 1, x + g)] for g in range(min_gap))
            if lookahead_empty:
                in_seg = False
                if (x - start) >= min_width:
                    segments.append((start, x))

    if in_seg and (w - start) >= min_width:
        segments.append((start, w))

    return segments


def fit_into_box(cropped_img: Image.Image, target_size: int = 128, max_content_size: int = 120) -> Image.Image:
    """
    Scales a cropped sprite to fit within max_content_size, then centers it
    on a transparent target_size x target_size canvas.
    """
    cw, ch = cropped_img.size
    if cw <= 0 or ch <= 0:
        return Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))

    scale = min(max_content_size / cw, max_content_size / ch)
    # If the sprite is already smaller than target, we keep 1.0 or scale up cleanly
    scale = min(1.0, scale) if scale < 1.0 else min(scale, 4.0)

    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))

    resized = cropped_img.resize((nw, nh), resample=Image.Resampling.NEAREST)

    canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    offset_x = (target_size - nw) // 2
    offset_y = (target_size - nh) // 2
    canvas.paste(resized, (offset_x, offset_y))

    return canvas


def slice_sheet(img: Image.Image, output_dir: Path, prefix: str = "hero", target_cell_size: int = 128):
    """
    Slices an RGBA 5-in-1 sheet into Portrait, Front, Back, Right, and Weapon sprites.
    """
    w, h = img.size
    pixels = img.load()
    output_dir.mkdir(parents=True, exist_ok=True)

    segments = detect_horizontal_segments(img)
    default_names = ["portrait", "front", "back", "right", "weapon"]

    # If column segmentation detected something other than 5 segments, fall back to 5 equal columns
    if len(segments) != 5:
        print(f"Notice: Detected {len(segments)} segments instead of 5. Using proportional 5-column fallback.")
        col_w = w // 5
        segments = [(i * col_w, (i + 1) * col_w) for i in range(5)]

    for idx, (x1, x2) in enumerate(segments):
        # Find exact vertical bounds within this horizontal slice
        min_y, max_y = h, 0
        found = False
        for x in range(x1, x2):
            for y in range(h):
                if pixels[x, y][3] > 0:
                    found = True
                    if y < min_y:
                        min_y = y
                    if y > max_y:
                        max_y = y

        name = default_names[idx] if idx < len(default_names) else f"view_{idx + 1}"
        out_filename = f"{prefix}_{name}.png"
        out_path = output_dir / out_filename

        if not found:
            print(f"Warning: No pixels found in slice {idx} ({name}). Skipping.")
            continue

        cropped = img.crop((x1, min_y, x2, max_y + 1))
        fitted = fit_into_box(cropped, target_size=target_cell_size, max_content_size=int(target_cell_size * 0.92))
        fitted.save(out_path, format="PNG")
        print(f"Saved sliced sprite: {out_path} ({cropped.size[0]}x{cropped.size[1]} -> {target_cell_size}x{target_cell_size})")


def process_image(input_path: str, output_path: str = None, tolerance: float = 20.0,
                  flood_fill: bool = True, resize_to: int = None,
                  slice_components: bool = False, output_dir: str = None, prefix: str = "hero"):
    p_in = Path(input_path)
    if not p_in.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    img = Image.open(p_in)

    if flood_fill:
        result = remove_chromakey_floodfill(img, target=(255, 0, 255), tolerance=tolerance)
    else:
        result = remove_chromakey_global(img, target=(255, 0, 255), tolerance=tolerance)

    if resize_to:
        result = result.resize((resize_to, resize_to), resample=Image.Resampling.NEAREST)

    if output_path:
        p_out = Path(output_path)
        p_out.parent.mkdir(parents=True, exist_ok=True)
        result.save(p_out, format="PNG")
        print(f"Processed transparent sheet saved to {output_path}")

    if slice_components:
        out_directory = Path(output_dir) if output_dir else (p_out.parent if output_path else p_in.parent)
        slice_sheet(result, output_dir=out_directory, prefix=prefix, target_cell_size=128)


def main():
    parser = argparse.ArgumentParser(
        description="Remove RGB(255,0,255) chromakey background and optionally slice 5-in-1 model sheet."
    )
    parser.add_argument("--input", "-i", required=True, help="Path to input image")
    parser.add_argument("--output", "-o", default=None, help="Path to output full transparent sheet PNG")
    parser.add_argument("--tolerance", "-t", type=float, default=20.0, help="Color distance tolerance (default: 20.0)")
    parser.add_argument("--no-flood-fill", action="store_true", help="Use global color replacement instead of edge flood-fill")
    parser.add_argument("--resize", "-r", type=int, default=None, help="Resize final sheet to NxN")
    parser.add_argument("--slice", "-s", action="store_true", help="Slice sheet into portrait, front, back, right, and weapon sprites")
    parser.add_argument("--output-dir", "-d", default=None, help="Directory to save sliced sprites (default: output dir or input dir)")
    parser.add_argument("--prefix", "-p", default="hero", help="Filename prefix for sliced sprites (default: 'hero')")

    args = parser.parse_args()

    if not args.output and not args.slice:
        parser.error("Specify at least --output or --slice")

    process_image(
        input_path=args.input,
        output_path=args.output,
        tolerance=args.tolerance,
        flood_fill=not args.no_flood_fill,
        resize_to=args.resize,
        slice_components=args.slice,
        output_dir=args.output_dir,
        prefix=args.prefix
    )


if __name__ == "__main__":
    main()
