import os
import sys
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import label, find_objects
import rembg

def remove_bg_rembg(image_path: Path, alpha_thresh: int = 128) -> Image.Image:
    """Use rembg to remove white background and apply crisp alpha threshold for pixel art."""
    im = Image.open(image_path).convert("RGBA")
    # If image already has alpha channel with transparent background, return directly
    arr = np.array(im)
    if (arr[:, :, 3] < 50).sum() > 1000:
        return im

    # Run rembg
    no_bg = rembg.remove(im)
    arr = np.array(no_bg)
    # Threshold alpha for clean 16-bit pixel edges
    arr[arr[:, :, 3] < alpha_thresh, 3] = 0
    arr[arr[:, :, 3] >= alpha_thresh, 3] = 255
    return Image.fromarray(arr, mode="RGBA")

def process_sheet_rembg(
    src_path: Path,
    target_char_h: float = 68.0,
    target_feet_y: int = 88,
    cell_size: int = 96,
    cols: int = 6,
    rows: int = 3,
    alpha_thresh: int = 128,
) -> Image.Image:
    """Process a 6x3 white-background sheet into a 6x4 576x384 RGBA spritesheet."""
    clean_im = remove_bg_rembg(src_path, alpha_thresh=alpha_thresh)
    arr = np.array(clean_im)
    H, W = arr.shape[:2]

    # Row vertical divisions approximately
    row_h = H / float(rows)
    row_sprites = {}
    all_heights = []

    for r_idx in range(rows):
        y0 = int(round(r_idx * row_h))
        y1 = int(round((r_idx + 1) * row_h))
        row_sub = arr[y0:y1, :]
        labeled, num = label(row_sub[:, :, 3] > 20)
        objs = find_objects(labeled)
        # Filter out tiny noise and border tags
        sprites = sorted(
            [o for o in objs if (o[0].stop - o[0].start) > 40 and (o[1].stop - o[1].start) > 30],
            key=lambda o: o[1].start,
        )
        if len(sprites) != cols:
            print(f"[WARN] {src_path.name} Row {r_idx} found {len(sprites)} sprites instead of {cols}. Trying fallback gutter split.")
            # Fallback: slice by column gutters
            sprites = []
            col_w = W / float(cols)
            for c in range(cols):
                cx0 = int(round(c * col_w))
                cx1 = int(round((c + 1) * col_w))
                cell_sub = row_sub[:, cx0:cx1]
                m_ys, m_xs = np.where(cell_sub[:, :, 3] > 20)
                if len(m_xs):
                    sprites.append((slice(m_ys.min(), m_ys.max() + 1), slice(cx0 + m_xs.min(), cx0 + m_xs.max() + 1)))

        for s in sprites:
            all_heights.append(s[0].stop - s[0].start)
        row_sprites[r_idx] = (sprites, y0)

    ref_h = float(np.median(all_heights)) if all_heights else 240.0
    scale = target_char_h / ref_h
    print(f"[{src_path.name}] ref_h={ref_h:.1f}, scale={scale:.4f}")

    # Output 4 rows x 6 cols
    output = np.zeros((4 * cell_size, cols * cell_size, 4), dtype=np.uint8)

    for r in range(4):
        src_r = r if r < 3 else 2
        flip = (r == 3)
        sprites, y0 = row_sprites[src_r]

        for c in range(cols):
            s = sprites[c]
            cy0 = y0 + s[0].start
            cy1 = y0 + s[0].stop
            cx0 = s[1].start
            cx1 = s[1].stop

            sprite_crop = arr[cy0:cy1, cx0:cx1].copy()
            m_ys, m_xs = np.where(sprite_crop[:, :, 3] > 20)
            if not len(m_xs):
                continue
            exact_crop = sprite_crop[m_ys.min() : m_ys.max() + 1, m_xs.min() : m_xs.max() + 1]

            sim = Image.fromarray(exact_crop, mode="RGBA")
            if flip:
                sim = sim.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

            sw, sh = sim.size
            nw = max(1, int(round(sw * scale)))
            nh = max(1, int(round(sh * scale)))
            res = sim.resize((nw, nh), Image.Resampling.NEAREST)

            # Center horizontally at 48, anchor feet at 88
            dx = (cell_size // 2) - (nw // 2)
            dy = target_feet_y - nh

            cell_x0 = c * cell_size
            cell_y0 = r * cell_size

            res_arr = np.array(res)
            # Clip bounds
            out_y0 = max(cell_y0, cell_y0 + dy)
            out_y1 = min(cell_y0 + cell_size, cell_y0 + dy + nh)
            out_x0 = max(cell_x0, cell_x0 + dx)
            out_x1 = min(cell_x0 + cell_size, cell_x0 + dx + nw)

            src_sy0 = out_y0 - (cell_y0 + dy)
            src_sy1 = src_sy0 + (out_y1 - out_y0)
            src_sx0 = out_x0 - (cell_x0 + dx)
            src_sx1 = src_sx0 + (out_x1 - out_x0)

            out_cell = output[out_y0:out_y1, out_x0:out_x1]
            sub_res = res_arr[src_sy0:src_sy1, src_sx0:src_sx1]

            alpha = sub_res[:, :, 3:4] / 255.0
            out_cell[:, :, :3] = (sub_res[:, :, :3] * alpha + out_cell[:, :, :3] * (1 - alpha)).astype(np.uint8)
            out_cell[:, :, 3] = np.maximum(out_cell[:, :, 3], sub_res[:, :, 3])

    return Image.fromarray(output, mode="RGBA")

def main():
    raw_dir = Path("raw_assets/necromancer")
    processed_dir = raw_dir / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    pub_dir = Path("public/textures/heroes/necromancer")
    pub_dir.mkdir(parents=True, exist_ok=True)

    sheet_names = [
        ("source_idle.png", "hero_necromancer_idle.png", "idle.png"),
        ("source_walk.png", "hero_necromancer_walk.png", "walk.png"),
        ("source_attack.png", "hero_necromancer_attack.png", "attack.png"),
        ("source_walk_attack.png", "hero_necromancer_walk_attack.png", "walk_attack.png"),
    ]

    for src_name, raw_name, pub_name in sheet_names:
        src_path = raw_dir / src_name
        if not src_path.exists():
            print(f"[SKIP] {src_path} not found yet")
            continue
        print(f"\nProcessing {src_name}...")
        processed_im = process_sheet_rembg(src_path)
        processed_im.save(processed_dir / raw_name)
        processed_im.save(pub_dir / pub_name)
        print(f"[OK] Saved {raw_name} and {pub_name} (576x384)")

    # Front frame from idle.png
    idle_pub = pub_dir / "idle.png"
    if idle_pub.exists():
        idle_im = Image.open(idle_pub)
        front = idle_im.crop((0, 0, 96, 96))
        front.save(pub_dir / "front.png")
        print("[OK] Saved front.png (96x96)")

    # Portrait from turnaround.png
    turnaround_path = raw_dir / "turnaround.png"
    if turnaround_path.exists():
        turnaround_clean = remove_bg_rembg(turnaround_path)
        arr = np.array(turnaround_clean)
        # Portrait is Column 1 Top half: x=30..320, y=30..330
        p_crop = arr[30:330, 30:320]
        m_ys, m_xs = np.where(p_crop[:, :, 3] > 20)
        if len(m_xs):
            exact_p = p_crop[m_ys.min():m_ys.max()+1, m_xs.min():m_xs.max()+1]
            p_im = Image.fromarray(exact_p, mode="RGBA")
            p_sq = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
            # Fit inside 96x96 with aspect ratio
            p_im.thumbnail((88, 88), Image.Resampling.NEAREST)
            off_x = (96 - p_im.width) // 2
            off_y = (96 - p_im.height) // 2
            p_sq.paste(p_im, (off_x, off_y), p_im)
            p_sq.save(pub_dir / "portrait.png")
            print("[OK] Saved portrait.png (96x96)")

        # Weapon Astral Staff: Column 1 Bottom half: x=30..320, y=340..700
        w_crop = arr[340:700, 30:320]
        m_ys, m_xs = np.where(w_crop[:, :, 3] > 20)
        if len(m_xs):
            exact_w = w_crop[m_ys.min():m_ys.max()+1, m_xs.min():m_xs.max()+1]
            w_im = Image.fromarray(exact_w, mode="RGBA")
            w_sq = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
            w_im_512 = w_im.resize((w_im.width * 2, w_im.height * 2), Image.Resampling.NEAREST)
            w_im_512.thumbnail((480, 480), Image.Resampling.NEAREST)
            off_x = (512 - w_im_512.width) // 2
            off_y = (512 - w_im_512.height) // 2
            w_sq.paste(w_im_512, (off_x, off_y), w_im_512)
            w_sq.save("public/textures/weapons/weapon_astral_staff.png")
            print("[OK] Saved weapon_astral_staff.png (512x512)")

if __name__ == "__main__":
    main()
