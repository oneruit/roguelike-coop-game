from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from process_character_sheets import (
    align_and_pack_sheet,
    detect_and_clean_background,
    process_character,
    verify_facing_directions,
)


class ProcessCharacterSheetsTests(unittest.TestCase):
    def make_sheet(self, color=(40, 60, 90), bg_color=(255, 0, 255)) -> Image.Image:
        sheet = Image.new("RGB", (768, 512), bg_color)
        draw = ImageDraw.Draw(sheet)
        for row in range(4):
            for col in range(6):
                x = col * 128
                y = row * 128
                # Main character body with realistic directional profile reach
                if row == 2:  # Row 2 (3rd row) facing RIGHT: asymmetric reach to the right
                    draw.rectangle((x + 40, y + 20, x + 92, y + 116), fill=color, outline=(0, 0, 0), width=3)
                    draw.rectangle((x + 55, y + 50, x + 70, y + 65), fill=(255, 0, 255))
                    draw.rectangle((x + 72, y + 25, x + 90, y + 45), fill=(220, 160, 120))
                elif row == 3:  # Row 3 (4th row) facing LEFT: asymmetric reach to the left
                    draw.rectangle((x + 36, y + 20, x + 88, y + 116), fill=color, outline=(0, 0, 0), width=3)
                    draw.rectangle((x + 58, y + 50, x + 73, y + 65), fill=(255, 0, 255))
                    draw.rectangle((x + 38, y + 25, x + 56, y + 45), fill=(220, 160, 120))
                else:
                    draw.rectangle((x + 40, y + 20, x + 88, y + 116), fill=color, outline=(0, 0, 0), width=3)
                    draw.rectangle((x + 50, y + 50, x + 65, y + 65), fill=(255, 0, 255))
        return sheet

    def test_magenta_removed_globally_inside_and_outside_and_aura_defringed(self) -> None:
        sheet = self.make_sheet()
        # Add artificial magenta fringe on outer boundary
        sheet_arr = np.array(sheet)
        sheet_arr[19, 40:87] = [180, 30, 180]  # Fringe right above character

        rgba = detect_and_clean_background(sheet_arr, "magenta", tolerance=65.0)

        # 1. Outer background is removed (alpha == 0)
        self.assertEqual(int(rgba[5, 5, 3]), 0)

        # 2. Inner enclosed magenta hole is ALSO removed (alpha == 0)
        self.assertEqual(int(rgba[55, 55, 3]), 0)

        # 3. True character interior body is preserved (alpha == 255, original color)
        self.assertEqual(int(rgba[35, 50, 3]), 255)
        self.assertEqual(tuple(rgba[35, 50, :3]), (40, 60, 90))

        # 4. Magenta fringe along boundary was either keyed out or converted to 1px black outline
        fringe_pixel = rgba[20, 50]  # The top boundary of the character
        self.assertEqual(int(fringe_pixel[3]), 255)
        # Should be converted to black outline [0, 0, 0], no magenta tint!
        self.assertTrue(fringe_pixel[0] == 0 and fringe_pixel[2] == 0)

    def test_pack_sheet_has_standard_dimensions_and_transparency(self) -> None:
        rgba = detect_and_clean_background(np.asarray(self.make_sheet().convert("RGBA")), "magenta")
        packed = align_and_pack_sheet(rgba, label="TEST", row_order="fbrl")
        self.assertEqual(packed.size, (768, 512))
        result = np.asarray(packed)
        self.assertEqual(int(result[0, 0, 3]), 0)
        self.assertTrue(np.any(result[:, :, 3] > 0))

    def test_non_square_source_cells_fail_fast(self) -> None:
        rgba = np.zeros((512, 900, 4), dtype=np.uint8)
        with self.assertRaises(ValueError):
            align_and_pack_sheet(rgba, label="BAD")

    def test_facing_directions_verification(self) -> None:
        sheet = self.make_sheet()
        rgba = detect_and_clean_background(np.asarray(sheet.convert("RGBA")), "magenta")

        # In our make_sheet: Row 2 has face on right, Row 3 has face on left -> should pass fbrl!
        ok, msg = verify_facing_directions(rgba, expected_row_order="fbrl", label="TEST_SHEET")
        self.assertTrue(ok, msg)

        # But if evaluated against fblr (where Row 2 is expected to be left), it should fail
        ok_bad, _ = verify_facing_directions(rgba, expected_row_order="fblr", label="TEST_SHEET")
        self.assertFalse(ok_bad)

    def test_process_character_writes_only_three_states_and_portrait(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source"
            output = root / "output"
            source.mkdir()
            for state in ("idle", "walk", "attack"):
                self.make_sheet().save(source / f"{state}.png")

            process_character(
                name="test_hero",
                idle_path=str(source / "idle.png"),
                walk_path=str(source / "walk.png"),
                attack_path=str(source / "attack.png"),
                out_dir=str(output),
                bg_mode="magenta",
                row_order="fbrl",
            )

            for state in ("idle", "walk", "attack"):
                with Image.open(output / f"hero_test_hero_{state}.png") as result:
                    self.assertEqual(result.size, (768, 512))
                    self.assertEqual(result.mode, "RGBA")
            with Image.open(output / "hero_test_hero_portrait.png") as portrait:
                self.assertEqual(portrait.size, (128, 128))
            self.assertFalse((output / "hero_test_hero_walk_attack.png").exists())


if __name__ == "__main__":
    unittest.main()
