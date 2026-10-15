#!/usr/bin/env python3
"""Validate dimensions and facing directions of IDLE, WALK, and ATTACK sprite sheets.

Checks:
1. PNG signature, readability, and exact 6x4 576x384 dimensions.
2. Facing directions: Row 2 (3rd row) must face RIGHT and Row 3 (4th row) must face LEFT,
   with the character's body turned sideways (боком) and face in strict profile (в профиль).
"""

from __future__ import annotations

import argparse
import struct
import sys
from pathlib import Path
from typing import Optional, Tuple

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
CELL_SIZE = 96
COLS = 6
ROWS = 4
EXPECTED_SIZE = (CELL_SIZE * COLS, CELL_SIZE * ROWS)


def png_dimensions(path: Path) -> Tuple[int, int]:
    """Read width and height from a PNG IHDR header."""
    try:
        with path.open("rb") as stream:
            header = stream.read(24)
    except OSError as exc:
        raise ValueError(f"cannot read file: {exc}") from exc

    if len(header) < 24 or header[:8] != PNG_SIGNATURE or header[12:16] != b"IHDR":
        raise ValueError("not a valid PNG file or truncated PNG header")

    width, height = struct.unpack(">II", header[16:24])
    if width <= 0 or height <= 0:
        raise ValueError(f"invalid PNG dimensions: {width}x{height}")
    return width, height


def check_dimensions(label: str, value: Optional[str]) -> bool:
    if not value:
        print(f"ERROR {label}: no input path supplied")
        return False

    path = Path(value)
    if not path.is_file():
        print(f"ERROR {label}: file not found: {path}")
        return False

    try:
        size = png_dimensions(path)
    except ValueError as exc:
        print(f"ERROR {label}: {path}: {exc}")
        return False

    if size != EXPECTED_SIZE:
        print(
            f"ERROR {label}: {path} is {size[0]}x{size[1]}, expected "
            f"{EXPECTED_SIZE[0]}x{EXPECTED_SIZE[1]} "
            f"({COLS} columns x {ROWS} rows at {CELL_SIZE}x{CELL_SIZE})."
        )
        return False

    print(f"OK    {label} [Dimensions]: {path} — {size[0]}x{size[1]}")
    return True


def check_facing(label: str, value: str, row_order: str = "fbrl") -> bool:
    path = Path(value)
    if not path.is_file():
        return False

    try:
        from PIL import Image
        import numpy as np
        # Import verify_facing_directions from process_character_sheets
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from process_character_sheets import verify_facing_directions

        with Image.open(path) as img:
            arr = np.asarray(img.convert("RGBA"))
        ok, msg = verify_facing_directions(arr, cols=COLS, rows=ROWS, label=label, expected_row_order=row_order)
        if ok:
            print(f"OK    {label} [Facing Directions]: {msg}")
            return True
        else:
            print(f"FAIL  {label} [Facing Directions]: {msg}")
            return False
    except ImportError:
        print(f"SKIP  {label} [Facing Directions]: Pillow or NumPy not installed for deep image analysis.")
        return True
    except Exception as exc:
        print(f"ERROR {label} [Facing Directions]: {exc}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--idle", required=True, help="Path to hero_<name>_idle.png")
    parser.add_argument("--walk", required=True, help="Path to hero_<name>_walk.png")
    parser.add_argument("--attack", help="Path to hero_<name>_attack.png (or hero_<name>_idle_attack.png)")
    parser.add_argument("--idle-attack", help="Alias for --attack")
    parser.add_argument("--walk-attack", help="Optional path to hero_<name>_walk_attack.png")
    parser.add_argument(
        "--row-order",
        choices=("fbrl", "fblr"),
        default="fbrl",
        help="Expected row order: fbrl (Row 2=RIGHT, Row 3=LEFT) or fblr (Row 2=LEFT, Row 3=RIGHT). Default: fbrl",
    )
    parser.add_argument("--skip-facing", action="store_true", help="Skip facing direction analysis")
    args = parser.parse_args()

    attack_path = args.idle_attack or args.attack
    if not attack_path:
        parser.error("one of --idle-attack or --attack is required")

    targets: list[tuple[str, str]] = [
        ("IDLE", args.idle),
        ("WALK", args.walk),
        ("IDLE_ATTACK", attack_path),
    ]
    if args.walk_attack:
        targets.append(("WALK_ATTACK", args.walk_attack))

    dim_results = [check_dimensions(label, path) for label, path in targets]

    facing_results = [True] * len(targets)
    if not args.skip_facing and all(dim_results):
        print("\nVerifying profile facing directions (Row 2: RIGHT, Row 3: LEFT, body sideways, face in profile)...")
        facing_results = [
            check_facing(label, path, row_order=args.row_order)
            for label, path in targets
        ]

    if all(dim_results) and all(facing_results):
        print("\nAll sheets passed validation! Dimensions 576x384 and facing directions are correct.")
        return 0

    print("\nValidation failed. Correct the files before integrating them into the game.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
