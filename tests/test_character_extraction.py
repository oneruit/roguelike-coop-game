"""Regression checks for glowing character sheets (requires Pillow and numpy)."""
import importlib.util
from pathlib import Path
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("extract_character", ROOT / ".agents/skills/character-animation-pipeline/scripts/extract_character.py")
extract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extract)

class CharacterExtractionTests(unittest.TestCase):
    def test_core_alpha_separates_connected_glows(self):
        arr = np.zeros((32, 70, 4), dtype=np.uint8)
        arr[6:24, 5:25] = [255, 0, 0, 255]
        arr[6:24, 40:60] = [0, 255, 0, 255]
        arr[10:15, 25:40] = [100, 100, 255, 20]
        rows = [{"y0": 0, "y1": 31, "feet_y": 23}]
        sheet = np.array(extract.build_sheet(arr, rows, 0, 70, 2, 26, 40, segmentation_alpha=64))
        self.assertTrue(np.any(sheet[:40, :40, 0] == 255))
        self.assertFalse(np.any(sheet[:40, :40, 1] == 255))
        self.assertTrue(np.any(sheet[:40, 40:80, 1] == 255))
        self.assertFalse(np.any(sheet[:40, 40:80, 0] == 255))
        self.assertTrue(np.any(sheet[:, :, 3] == 20), "Copying preserves the original glow alpha")

    def test_excess_complete_frames_are_truncated_not_merged(self):
        arr = np.zeros((32, 66, 4), dtype=np.uint8)
        for i, color in enumerate(([255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255])):
            arr[5:25, 2 + i * 22:22 + i * 22] = color
        rows = [{"y0": 0, "y1": 31, "feet_y": 24}]
        sheet = np.array(extract.build_sheet(arr, rows, 0, 66, 2, 27, 40, segmentation_alpha=64))
        self.assertFalse(np.any(sheet[:40, :, 2] == 255))
        self.assertFalse(np.any(sheet[:40, :40, 1] == 255))
        self.assertFalse(np.any(sheet[:40, 40:80, 0] == 255))

    def test_copy_stays_inside_the_destination_cell(self):
        arr = np.zeros((80, 70, 4), dtype=np.uint8)
        arr[0:80, 0:70] = [255, 0, 0, 255]
        rows = [{"y0": 0, "y1": 79, "feet_y": 40}]
        sheet = np.array(extract.build_sheet(arr, rows, 0, 70, 2, 20, 32, segmentation_alpha=64))
        self.assertTrue(np.any(sheet[:32, :32, 3]))
        self.assertFalse(np.any(sheet[32:, :, 3]), "An oversized frame must not bleed into another directional row")
        self.assertEqual(int(np.count_nonzero(sheet[:32, :32, 3])), 32 * 32)
        self.assertEqual(int(np.count_nonzero(sheet[:32, 32:64, 3])), 32 * 32)

    def test_game_assets_have_one_safe_nonempty_frame_per_cell(self):
        from PIL import Image
        for state, cols in (("idle", 10), ("walk", 6), ("attack", 8), ("walk_attack", 6)):
            image = Image.open(ROOT / f"public/textures/heroes/hero_invoker_{state}.png")
            self.assertEqual(image.size, (cols * 96, 384))
            for row in range(4):
                for col in range(cols):
                    box = image.crop((col * 96, row * 96, (col + 1) * 96, (row + 1) * 96)).getchannel("A").getbbox()
                    self.assertIsNotNone(box, (state, row, col))
                    self.assertTrue(box[0] > 0 and box[1] > 0 and box[2] < 96 and box[3] < 96, (state, row, col, box))

if __name__ == "__main__":
    unittest.main()
