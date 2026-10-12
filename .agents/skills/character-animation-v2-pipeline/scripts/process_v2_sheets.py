"""
Process and Validate Character Animation v2 Sprite Sheets.
Sheet Specifications:
- Dimensions: 768 x 512 px (6 columns x 4 rows)
- Cell Size: 128 x 128 px
- Row Order:
  0: FRONT (Лицо)
  1: BACK (Спина)
  2: RIGHT (Правая сторона)
  3: LEFT (Левая сторона)
- Columns: 6 temporal animation frames
- Background: Pure solid magenta RGB(255, 0, 255) [#FF00FF] removed to RGBA alpha.
"""

import argparse
from pathlib import Path
from PIL import Image
from collections import deque


def color_distance(c1, c2):
    return sum((a - b) ** 2 for a, b in zip(c1[:3], c2[:3])) ** 0.5


def remove_chromakey_floodfill(image: Image.Image, target=(255, 0, 255), tolerance=20.0) -> Image.Image:
    img = image.convert("RGBA")
    width, height = img.size
    pixels = img.load()

    visited = [[False] * height for _ in range(width)]
    queue = deque()

    # Border seeds
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
        if color_distance(current_color, target) <= tolerance:
            pixels[cx, cy] = (current_color[0], current_color[1], current_color[2], 0)
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < width and 0 <= ny < height and not visited[nx][ny]:
                    queue.append((nx, ny))

    return img


def process_sheet(input_path: str, output_path: str, tolerance: float = 20.0, target_w: int = 768, target_h: int = 512):
    p_in = Path(input_path)
    if not p_in.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    img = Image.open(p_in)
    w, h = img.size

    # Key out magenta background
    keyed = remove_chromakey_floodfill(img, target=(255, 0, 255), tolerance=tolerance)

    # Resize to exact 768x512 using nearest-neighbor if needed (to preserve pixel art crispness)
    if (w, h) != (target_w, target_h):
        print(f"Rescaling sheet from {w}x{h} to target {target_w}x{target_h} (nearest-neighbor)...")
        keyed = keyed.resize((target_w, target_h), resample=Image.Resampling.NEAREST)

    p_out = Path(output_path)
    p_out.parent.mkdir(parents=True, exist_ok=True)
    keyed.save(p_out, format="PNG")
    print(f"Animation v2 sheet successfully saved: {p_out} ({target_w}x{target_h} px, 6x4 grid)")


def main():
    parser = argparse.ArgumentParser(description="Process Character Animation v2 Sprite Sheet (768x512, 6x4, Chroma Key Removal).")
    parser.add_argument("--input", "-i", required=True, help="Input sheet image path")
    parser.add_argument("--output", "-o", required=True, help="Output PNG path (e.g. public/textures/heroes/hero_<name>_attack.png)")
    parser.add_argument("--tolerance", "-t", type=float, default=20.0, help="Magenta color tolerance (default 20.0)")

    args = parser.parse_args()
    process_sheet(args.input, args.output, args.tolerance)


if __name__ == "__main__":
    main()
