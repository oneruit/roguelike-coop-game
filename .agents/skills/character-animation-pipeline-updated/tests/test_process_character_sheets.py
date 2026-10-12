from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from process_character_sheets import align_and_pack_sheet, detect_and_clean_background, process_character


class ProcessCharacterSheetsTests(unittest.TestCase):
    def make_sheet(self, color=(40, 60, 90)) -> Image.Image:
        sheet = Image.new("RGB", (768, 512), (255, 255, 255))
        draw = ImageDraw.Draw(sheet)
        for row in range(4):
            for col in range(6):
                x = col * 128
                y = row * 128
                # Closed outline encloses a white detail, verifying that the color key
                # only clears background connected to the edge of the entire sheet.
                draw.rectangle((x + 40, y + 20, x + 86, y + 116), fill=color, outline=(0, 0, 0), width=3)
                draw.rectangle((x + 50, y + 28, x + 65, y + 38), fill=(255, 255, 255), outline=(0, 0, 0), width=2)
        return sheet

    def test_white_background_removed_but_enclosed_white_detail_kept(self) -> None:
        rgba = detect_and_clean_background(np.asarray(self.make_sheet().convert("RGBA")), "white")
        self.assertEqual(int(rgba[0, 0, 3]), 0)
        self.assertEqual(int(rgba[30, 55, 3]), 255)
        self.assertEqual(tuple(rgba[30, 55, :3]), (255, 255, 255))

    def test_pack_sheet_has_standard_dimensions_and_transparency(self) -> None:
        rgba = detect_and_clean_background(np.asarray(self.make_sheet().convert("RGBA")), "white")
        packed = align_and_pack_sheet(rgba, label="TEST")
        self.assertEqual(packed.size, (768, 512))
        result = np.asarray(packed)
        self.assertEqual(int(result[0, 0, 3]), 0)
        self.assertTrue(np.any(result[:, :, 3] > 0))

    def test_non_square_source_cells_fail_fast(self) -> None:
        rgba = np.zeros((512, 900, 4), dtype=np.uint8)
        with self.assertRaises(ValueError):
            align_and_pack_sheet(rgba, label="BAD")

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
                bg_mode="white",
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
