#!/usr/bin/env python3
"""
UI Asset Slicer & Alpha Extractor for Dark Fantasy ARPG UI Assets
Part of ui-asset-pipeline-updated skill.
"""

import argparse
import json
import os
import sys
from PIL import Image

def extract_alpha_white(img: Image.Image, threshold: int = 242, soft_range: int = 12) -> Image.Image:
    """
    Extracts alpha channel from pure white / near-white background rgb(255, 255, 255).
    Applies despill / darkening on semi-transparent edge pixels to prevent white haloing
    on dark backgrounds.
    """
    img = img.convert("RGBA")
    data = img.getdata()
    new_data = []

    for r, g, b, a in data:
        # Distance from pure white
        dist = 255 - max(r, g, b)
        
        # Calculate alpha
        if dist <= 0:
            new_data.append((0, 0, 0, 0))
        elif dist >= soft_range:
            new_data.append((r, g, b, 255))
        else:
            # Linear ramp in the soft transition zone
            alpha = int(255 * (dist / soft_range))
            # Decontaminate white bleed: scale RGB by alpha ratio so edge is dark, not white
            factor = dist / soft_range
            new_r = int(r * factor)
            new_g = int(g * factor)
            new_b = int(b * factor)
            new_data.append((new_r, new_g, new_b, alpha))

    img.putdata(new_data)
    return img

def extract_alpha_magenta(img: Image.Image, tolerance: int = 65) -> Image.Image:
    """
    Extracts alpha channel from pure magenta rgb(255, 0, 255) chromakey background.
    """
    img = img.convert("RGBA")
    data = img.getdata()
    new_data = []

    for r, g, b, a in data:
        # Chromakey difference from magenta (255, 0, 255)
        diff = abs(r - 255) + abs(g - 0) + abs(b - 255)
        if diff < tolerance:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append((r, g, b, 255))

    img.putdata(new_data)
    return img

def clear_inner_cavity(img: Image.Image, cavity_box: tuple) -> Image.Image:
    """
    Sets the interior rectangular cavity of a 9-slice frame to transparent (0, 0, 0, 0).
    cavity_box: (x1, y1, x2, y2) relative to the cropped asset.
    """
    img = img.convert("RGBA")
    x1, y1, x2, y2 = cavity_box
    width, height = img.size
    
    # Clamp bounds
    x1 = max(0, min(x1, width))
    x2 = max(0, min(x2, width))
    y1 = max(0, min(y1, height))
    y2 = max(0, min(y2, height))

    pixels = img.load()
    for y in range(y1, y2):
        for x in range(x1, x2):
            pixels[x, y] = (0, 0, 0, 0)

    return img

def auto_trim_alpha(img: Image.Image, padding: int = 2) -> Image.Image:
    """
    Trims transparent borders surrounding the element, preserving a specified padding.
    """
    bbox = img.getbbox()
    if not bbox:
        return img
    
    x1, y1, x2, y2 = bbox
    w, h = img.size
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)
    
    return img.crop((x1, y1, x2, y2))

def process_element(
    source_img: Image.Image,
    crop_box: tuple,
    bg_mode: str = "white",
    cavity_box: tuple = None,
    trim: bool = False,
    resize: tuple = None
) -> Image.Image:
    """
    Crops, removes background, clears cavity (if any), and trims/resizes element.
    """
    # Crop
    element = source_img.crop(crop_box)

    # Background alpha extraction
    if bg_mode == "white":
        element = extract_alpha_white(element)
    elif bg_mode == "magenta":
        element = extract_alpha_magenta(element)
    elif bg_mode == "none":
        element = element.convert("RGBA")

    # Clear inner cavity if requested
    if cavity_box:
        element = clear_inner_cavity(element, cavity_box)

    # Trim transparent borders if requested
    if trim:
        element = auto_trim_alpha(element)

    # Resize if requested
    if resize:
        element = element.resize(resize, Image.Resampling.LANCZOS)

    return element

def main():
    parser = argparse.ArgumentParser(description="Slice and process UI assets from concept sheets.")
    parser.add_argument("--input", "-i", required=True, help="Input source image path")
    parser.add_argument("--output", "-o", help="Output PNG path (for single element)")
    parser.add_argument("--crop", help="Crop box x1,y1,x2,y2")
    parser.add_argument("--bg-mode", choices=["white", "magenta", "none"], default="white", help="Background alpha extraction mode")
    parser.add_argument("--cavity", help="Interior cavity coordinates to clear x1,y1,x2,y2")
    parser.add_argument("--trim", action="store_true", help="Auto-trim transparent border")
    parser.add_argument("--resize", help="Target size W,H (e.g. 64,64)")
    parser.add_argument("--batch", help="Path to JSON config defining multiple elements to slice")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file {args.input} does not exist.", file=sys.stderr)
        sys.exit(1)

    source = Image.open(args.input)

    # Batch mode
    if args.batch:
        if not os.path.exists(args.batch):
            print(f"Error: Batch config {args.batch} not found.", file=sys.stderr)
            sys.exit(1)
        
        with open(args.batch, "r", encoding="utf-8") as f:
            config = json.load(f)
        
        for item in config:
            crop_box = tuple(item["crop"])
            cavity_box = tuple(item["cavity"]) if "cavity" in item and item["cavity"] else None
            resize = tuple(item["resize"]) if "resize" in item and item["resize"] else None
            bg_mode = item.get("bg_mode", "white")
            trim = item.get("trim", False)
            out_path = item["output"]

            os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
            res = process_element(source, crop_box, bg_mode, cavity_box, trim, resize)
            res.save(out_path, "PNG")
            print(f"Sliced: {out_path} ({res.size[0]}x{res.size[1]} px)")
        
        print("Batch slicing complete.")
        return

    # Single mode
    if not args.output or not args.crop:
        print("Error: For single element slicing, both --output and --crop are required.", file=sys.stderr)
        sys.exit(1)

    crop_box = tuple(map(int, args.crop.split(",")))
    cavity_box = tuple(map(int, args.cavity.split(","))) if args.cavity else None
    resize = tuple(map(int, args.resize.split(","))) if args.resize else None

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    res = process_element(source, crop_box, args.bg_mode, cavity_box, args.trim, resize)
    res.save(args.output, "PNG")
    print(f"Saved: {args.output} ({res.size[0]}x{res.size[1]} px)")

if __name__ == "__main__":
    main()
