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
        sheet = Image.new("RGB", (576, 384), bg_color)
        draw = ImageDraw.Draw(sheet)
        for row in range(4):
            for col in range(6):
                x = col * 96
                y = row * 96
                # Main character body with realistic directional profile reach
                if row == 2:  # Row 2 (3rd row) facing RIGHT: asymmetric reach to the right
                    draw.rectangle((x + 30, y + 15, x + 69, y + 87), fill=color, outline=(0, 0, 0), width=3)
                    draw.rectangle((x + 41, y + 37, x + 52, y + 49), fill=bg_color)
                    draw.rectangle((x + 54, y + 18, x + 67, y + 34), fill=(220, 160, 120))
                elif row == 3:  # Row 3 (4th row) facing LEFT: asymmetric reach to the left
                    draw.rectangle((x + 27, y + 15, x + 66, y + 87), fill=color, outline=(0, 0, 0), width=3)
                    draw.rectangle((x + 43, y + 37, x + 55, y + 49), fill=bg_color)
                    draw.rectangle((x + 28, y + 18, x + 42, y + 34), fill=(220, 160, 120))
                else:
                    draw.rectangle((x + 30, y + 15, x + 66, y + 87), fill=color, outline=(0, 0, 0), width=3)
                    draw.rectangle((x + 37, y + 37, x + 49, y + 49), fill=bg_color)
        return sheet

    def test_magenta_removed_globally_inside_and_outside_and_aura_defringed(self) -> None:
        sheet = self.make_sheet()
        # Add artificial magenta fringe on outer boundary
        sheet_arr = np.array(sheet)
        sheet_arr[14, 30:66] = [180, 30, 180]  # Fringe right above character

        rgba = detect_and_clean_background(sheet_arr, "magenta", tolerance=65.0)

        # 1. Outer background is removed (alpha == 0)
        self.assertEqual(int(rgba[5, 5, 3]), 0)

        # 2. Inner enclosed magenta hole is ALSO removed (alpha == 0)
        self.assertEqual(int(rgba[40, 40, 3]), 0)

        # 3. True character interior body is preserved (alpha == 255, original color)
        self.assertEqual(int(rgba[25, 38, 3]), 255)
        self.assertEqual(tuple(rgba[25, 38, :3]), (40, 60, 90))

        # 4. Magenta fringe along boundary was either keyed out or converted to 1px black outline
        fringe_pixel = rgba[15, 38]  # The top boundary of the character
        self.assertEqual(int(fringe_pixel[3]), 255)
        # Should be converted to black outline [0, 0, 0], no magenta tint!
        self.assertTrue(fringe_pixel[0] == 0 and fringe_pixel[2] == 0)

    def test_green_chromakey_removed_globally_and_purple_elements_preserved(self) -> None:
        # Create sheet on pure green chromakey with lavender/purple character body
        lavender_color = (180, 100, 220)
        sheet = self.make_sheet(color=lavender_color, bg_color=(0, 255, 0))
        sheet_arr = np.array(sheet)
        sheet_arr[14, 30:66] = [30, 180, 30]  # Green fringe right above character

        rgba = detect_and_clean_background(sheet_arr, "green", tolerance=65.0)

        # 1. Outer green background is removed
        self.assertEqual(int(rgba[5, 5, 3]), 0)

        # 2. Inner enclosed green hole is also removed
        self.assertEqual(int(rgba[40, 40, 3]), 0)

        # 3. Lavender/purple body is 100% preserved (not stripped or eroded!)
        self.assertEqual(int(rgba[25, 38, 3]), 255)
        self.assertEqual(tuple(rgba[25, 38, :3]), lavender_color)

        # 4. Green fringe along boundary was despilled (green excess neutralized)
        fringe_pixel = rgba[15, 38]
        self.assertEqual(int(fringe_pixel[3]), 255)
        self.assertTrue(fringe_pixel[1] <= 30)

    def test_auto_detect_green_and_magenta_background(self) -> None:
        sheet_mag = self.make_sheet(bg_color=(255, 0, 255))
        rgba_mag = detect_and_clean_background(np.array(sheet_mag), bg_mode="auto")
        self.assertEqual(int(rgba_mag[0, 0, 3]), 0)

        sheet_grn = self.make_sheet(bg_color=(0, 255, 0))
        rgba_grn = detect_and_clean_background(np.array(sheet_grn), bg_mode="auto")
        self.assertEqual(int(rgba_grn[0, 0, 3]), 0)

    def test_custom_bg_color_hex(self) -> None:
        sheet_grn = self.make_sheet(bg_color=(0, 255, 0))
        rgba_hex = detect_and_clean_background(np.array(sheet_grn), bg_color="#00ff00")
        self.assertEqual(int(rgba_hex[0, 0, 3]), 0)

        rgba_str = detect_and_clean_background(np.array(sheet_grn), bg_color="green")
        self.assertEqual(int(rgba_str[0, 0, 3]), 0)

    def test_pack_sheet_has_standard_dimensions_and_transparency(self) -> None:
        rgba = detect_and_clean_background(np.asarray(self.make_sheet().convert("RGBA")), "magenta")
        packed = align_and_pack_sheet(rgba, label="TEST", row_order="fbrl")
        self.assertEqual(packed.size, (576, 384))
        result = np.asarray(packed)
        self.assertEqual(int(result[0, 0, 3]), 0)
        self.assertTrue(np.any(result[:, :, 3] > 0))

    def test_non_square_source_cells_fail_fast(self) -> None:
        rgba = np.zeros((384, 700, 4), dtype=np.uint8)
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

    def test_process_character_writes_expected_states_and_portrait(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source"
            output = root / "output"
            source.mkdir()
            for state in ("idle", "walk", "attack", "walk_attack"):
                self.make_sheet().save(source / f"{state}.png")

            process_character(
                name="test_hero",
                idle_path=str(source / "idle.png"),
                walk_path=str(source / "walk.png"),
                idle_attack_path=str(source / "attack.png"),
                walk_attack_path=str(source / "walk_attack.png"),
                out_dir=str(output),
                bg_mode="magenta",
                row_order="fbrl",
            )

            for state in ("idle", "walk", "attack", "idle_attack", "walk_attack"):
                with Image.open(output / f"hero_test_hero_{state}.png") as result:
                    self.assertEqual(result.size, (576, 384))
                    self.assertEqual(result.mode, "RGBA")
            with Image.open(output / "hero_test_hero_portrait.png") as portrait:
                self.assertEqual(portrait.size, (96, 96))

    def test_process_character_supports_6x3_source_grid(self) -> None:
        """Verify 6x3 source sheets (FRONT, BACK, RIGHT) are automatically expanded to 4 rows."""
        sheet_3row = Image.new("RGB", (576, 288), (255, 0, 255))
        draw = ImageDraw.Draw(sheet_3row)
        for row in range(3):
            for col in range(6):
                x = col * 96
                y = row * 96
                if row == 2:  # Right facing profile
                    draw.rectangle((x + 30, y + 15, x + 69, y + 87), fill=(40, 60, 90), outline=(0, 0, 0), width=3)
                    draw.rectangle((x + 54, y + 18, x + 67, y + 34), fill=(220, 160, 120))
                else:
                    draw.rectangle((x + 30, y + 15, x + 66, y + 87), fill=(40, 60, 90), outline=(0, 0, 0), width=3)

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source"
            output = root / "output"
            source.mkdir()
            for state in ("idle", "walk", "attack"):
                sheet_3row.save(source / f"{state}.png")

            process_character(
                name="hero_3row",
                idle_path=str(source / "idle.png"),
                walk_path=str(source / "walk.png"),
                attack_path=str(source / "attack.png"),
                out_dir=str(output),
                rows=3,
                bg_mode="magenta",
                row_order="fbrl",
            )

            # Output must be the standard 576x384 (6 cols x 4 rows)
            with Image.open(output / "hero_3row_idle.png") as result:
                self.assertEqual(result.size, (576, 384))
            with Image.open(output / "hero_3row_portrait.png") as portrait:
                self.assertEqual(portrait.size, (96, 96))



if __name__ == "__main__":
    unittest.main()

