#!/usr/bin/env python3
"""Validate the dimensions of IDLE, WALK, and ATTACK PNG sprite sheets.

Uses only Python's standard library. It checks PNG signature/IHDR dimensions;
it does not inspect grid contents, align frames, remove backgrounds, or validate animation quality.
"""

from __future__ import annotations

import argparse
import struct
import sys
from pathlib import Path
from typing import Optional, Tuple

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
CELL_SIZE = 128
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


def check_one(label: str, value: Optional[str]) -> bool:
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

    print(f"OK    {label}: {path} — {size[0]}x{size[1]}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--idle", required=True, help="Path to hero_<name>_idle.png")
    parser.add_argument("--walk", required=True, help="Path to hero_<name>_walk.png")
    parser.add_argument("--attack", required=True, help="Path to hero_<name>_attack.png")
    args = parser.parse_args()

    results = [
        check_one("IDLE", args.idle),
        check_one("WALK", args.walk),
        check_one("ATTACK", args.attack),
    ]
    if all(results):
        print("\nAll three sheets have the expected dimensions.")
        print("Reminder: this check does not verify the row order or the visual quality of frames.")
        return 0

    print("\nValidation failed. Correct the files before integrating them into the game.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
