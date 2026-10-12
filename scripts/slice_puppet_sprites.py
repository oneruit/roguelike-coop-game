import os
import json
from collections import deque
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation

def slice_sprites():
    src_path = r'C:/Users/oneru/.gemini/antigravity/brain/a4af7202-50f7-4151-a09e-2e124b299057/.user_uploaded/media_1791793313914_a49ab4da.png'
    out_dir = r'public/textures/heroes/puppet_warrior'
    os.makedirs(out_dir, exist_ok=True)

    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img).astype(np.float32)
    H, W, _ = arr.shape

    # Clean 1px border on the left
    arr[:, 0] = [255, 255, 255, 255]

    # White background mask for flood-fill (min RGB > 190)
    is_bg_seed = (arr[:, :, 0] > 190) & (arr[:, :, 1] > 190) & (arr[:, :, 2] > 190)

    # Flood-fill from outer edges
    visited = np.zeros((H, W), dtype=bool)
    q = deque()
    for r in range(H):
        if is_bg_seed[r, 0]: q.append((r, 0))
        if is_bg_seed[r, W-1]: q.append((r, W-1))
    for c in range(W):
        if is_bg_seed[0, c]: q.append((0, c))
        if is_bg_seed[H-1, c]: q.append((H-1, c))

    for r, c in q:
        visited[r, c] = True

    while q:
        r, c = q.popleft()
        for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < H and 0 <= nc < W:
                if not visited[nr, nc] and is_bg_seed[nr, nc]:
                    visited[nr, nc] = True
                    q.append((nr, nc))

    # All flood-filled outer background is 100% transparent
    arr[visited, 3] = 0

    # Clean up anti-aliasing white halos at outer boundary
    edge_ring = binary_dilation(visited) & (~visited)
    for r, c in zip(*np.where(edge_ring)):
        min_c = min(arr[r, c, :3])
        if min_c > 170:
            arr[r, c, 3] = 0
        elif min_c > 60:
            # Defringe: remove white halo from outer border
            factor = (min_c - 60) / 110.0
            arr[r, c, :3] = arr[r, c, :3] * (1.0 - factor * 0.85)

    clean_img = Image.fromarray(arr.astype(np.uint8))

    # Coarse bounding boxes [ymin, xmin, ymax, xmax]
    parts_bboxes = {
        "head": (6, 22, 195, 198),
        "hair": (10, 290, 271, 432),
        "torso": (23, 588, 207, 709),
        "pelvis": (70, 823, 173, 969),
        "upper_arm_l": (236, 43, 353, 117),
        "upper_arm_r": (236, 149, 353, 224),
        "forearm_l": (240, 388, 370, 471),
        "forearm_r": (240, 550, 370, 633),
        "fist_l": (261, 780, 335, 846),
        "fist_r": (261, 913, 335, 978),
        "thigh_l": (389, 43, 536, 121),
        "thigh_r": (389, 145, 536, 224),
        "shin_l": (419, 303, 536, 377),
        "shin_r": (419, 405, 536, 479),
        "boot_l": (445, 529, 549, 611),
        "boot_r": (445, 631, 549, 714),
        "orb_purple": (398, 759, 532, 862),
        "orb_cyan": (398, 895, 532, 999),
    }

    # Recommended pivot anchors (x, y) relative to cropped sprite [0..1]
    pivots = {
        "head": [0.50, 0.90],         # chin / neck joint
        "hair": [0.75, 0.15],         # where hair ties to head
        "torso": [0.50, 0.85],        # base of torso connecting to pelvis
        "pelvis": [0.50, 0.40],       # center of pelvis
        "upper_arm_l": [0.50, 0.15],  # shoulder
        "upper_arm_r": [0.50, 0.15],  # shoulder
        "forearm_l": [0.45, 0.15],    # elbow
        "forearm_r": [0.55, 0.15],    # elbow
        "fist_l": [0.50, 0.20],       # wrist
        "fist_r": [0.50, 0.20],       # wrist
        "thigh_l": [0.50, 0.15],      # hip joint
        "thigh_r": [0.50, 0.15],      # hip joint
        "shin_l": [0.50, 0.15],       # knee joint
        "shin_r": [0.50, 0.15],       # knee joint
        "boot_l": [0.50, 0.20],       # ankle
        "boot_r": [0.50, 0.20],       # ankle
        "orb_purple": [0.50, 0.50],   # center of sphere
        "orb_cyan": [0.50, 0.50],     # center of sphere
    }

    z_orders = {
        "hair": 1,
        "upper_arm_l": 2,
        "forearm_l": 3,
        "fist_l": 4,
        "thigh_l": 5,
        "shin_l": 6,
        "boot_l": 7,
        "pelvis": 8,
        "torso": 9,
        "head": 10,
        "thigh_r": 11,
        "shin_r": 12,
        "boot_r": 13,
        "upper_arm_r": 14,
        "forearm_r": 15,
        "fist_r": 16,
        "orb_purple": 17,
        "orb_cyan": 18,
    }

    atlas_data = {}

    for name, bbox in parts_bboxes.items():
        ymin, xmin, ymax, xmax = bbox
        cropped = clean_img.crop((xmin, ymin, xmax, ymax))
        
        tight_box = cropped.getbbox()
        if tight_box:
            cropped = cropped.crop(tight_box)

        file_name = f"{name}.png"
        file_path = os.path.join(out_dir, file_name)
        cropped.save(file_path)

        w, h = cropped.size
        atlas_data[name] = {
            "file": file_name,
            "width": w,
            "height": h,
            "pivot": pivots.get(name, [0.5, 0.5]),
            "zOrder": z_orders.get(name, 10)
        }
        print(f"Exported {name}: {w}x{h}")

    with open(os.path.join(out_dir, "parts_meta.json"), "w", encoding="utf-8") as f:
        json.dump(atlas_data, f, indent=2)

    print("Clean export finished!")

if __name__ == '__main__':
    slice_sprites()
