"""
Chroma Key Background Removal Script for Character Pipeline.
Replaces RGB(255, 0, 255) [Pure Magenta / #FF00FF] with transparent alpha (RGBA).
Supports flood-fill mode (removes only background connected from corners/edges,
preserving magenta details inside the character) and global tolerance mode.
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


def process_image(input_path: str, output_path: str, tolerance: float = 20.0, flood_fill: bool = True, resize_to: int = None):
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

    p_out = Path(output_path)
    p_out.parent.mkdir(parents=True, exist_ok=True)
    result.save(p_out, format="PNG")
    print(f"Processed image successfully saved to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Remove RGB(255,0,255) chromakey background from character portrait/sprite.")
    parser.add_argument("--input", "-i", required=True, help="Path to input image")
    parser.add_argument("--output", "-o", required=True, help="Path to output PNG image")
    parser.add_argument("--tolerance", "-t", type=float, default=20.0, help="Color distance tolerance (default: 20.0)")
    parser.add_argument("--no-flood-fill", action="store_true", help="Use global color replacement instead of edge flood-fill")
    parser.add_argument("--resize", "-r", type=int, default=None, help="Resize final image to NxN (nearest neighbor for pixel art, e.g. 128)")

    args = parser.parse_args()
    process_image(
        input_path=args.input,
        output_path=args.output,
        tolerance=args.tolerance,
        flood_fill=not args.no_flood_fill,
        resize_to=args.resize
    )


if __name__ == "__main__":
    main()
