import numpy as np
from PIL import Image
import os
import scipy.ndimage as ndi

def generate_photorealistic_dunes():
    output_dir = 'public/textures/dunes'
    os.makedirs(output_dir, exist_ok=True)

    # Load reference terrain sand
    sand_path = 'public/textures/biomes/biome_ashen_wastes.jpg'
    sand_img = Image.open(sand_path).convert('RGB')
    sand_arr = np.array(sand_img, dtype=np.float32)
    H_sand, W_sand, _ = sand_arr.shape

    mean_sand_rgb = np.mean(sand_arr, axis=(0, 1)) # [222.8, 166.9, 86.9]
    print(f"Reference Sand Mean RGB: {mean_sand_rgb}")

    size = 1024
    y_grid, x_grid = np.mgrid[-1:1:1024j, -1:1:1024j]

    # Sun direction from upper-right (+X, -Y, +Z in 2D image coordinates)
    # Matches Three.js directional light [18, 28, 14]
    sun_dir = np.array([0.42, -0.68, 0.60], dtype=np.float32)
    sun_dir /= np.linalg.norm(sun_dir)

    # -------------------------------------------------------------------------
    # 1. BARCHAN DUNE (Бархан с реалистичным сплошным песчаным телом и полулунным гребнем)
    # -------------------------------------------------------------------------
    # Rotate coordinates to match prevailing wind direction (~-30 deg)
    theta1 = np.radians(28)
    cos1, sin1 = np.cos(theta1), np.sin(theta1)
    x1 = x_grid * cos1 - y_grid * sin1
    y1 = x_grid * sin1 + y_grid * cos1

    # Barchan crest profile: smooth parabolic curve
    # y1 is along wind direction (upwind is -y1, downwind is +y1)
    # x1 is across wind
    c_crest = 0.95
    y_crest = -0.05 + c_crest * (x1 ** 2)

    # Envelope restricting width across wind
    # Barchan core is ~0.65 units wide, horns extend to ~0.75
    w_env = np.clip(1.0 - (np.abs(x1) / 0.72) ** 2, 0.0, 1.0)
    w_env = w_env ** 1.2

    # Upwind stoss slope (gentle climb up to the crest)
    stoss_dist = np.clip((y_crest - y1) / 0.52, 0.0, 1.0)
    h_stoss = (1.0 - stoss_dist ** 1.6) * (y1 <= y_crest)

    # Downwind slipface (steep drop off after the crest)
    slip_dist = np.clip((y1 - y_crest) / 0.32, 0.0, 1.0)
    # Slipface has a concave angle of repose profile
    h_slip = ((1.0 - slip_dist) ** 1.8) * (y1 > y_crest)

    # Combined base elevation of the barchan
    h_barchan = (h_stoss + h_slip) * w_env

    # Horn extensions (sand ridges trailing downwind on the flanks)
    horn_mask = (np.abs(x1) > 0.22) & (np.abs(x1) < 0.70) & (y1 > y_crest)
    horn_decay = np.clip(1.0 - (y1 - y_crest) / 0.48, 0.0, 1.0)
    horn_h = horn_mask * (horn_decay ** 1.4) * 0.45 * w_env
    h_barchan = np.maximum(h_barchan, horn_h)

    # Smooth the macroscopic dune shape
    h_barchan = ndi.gaussian_filter(h_barchan, sigma=10.0)
    if h_barchan.max() > 0:
        h_barchan /= h_barchan.max()

    # Add realistic wind ripples across the dune surface
    # Ripple wave direction flows across the upwind slope and curves over the crest
    ripple_phase1 = (x1 * 36.0 + y1 * 22.0) * np.pi
    ripples1 = np.sin(ripple_phase1) * 0.038 + np.sin(ripple_phase1 * 2.2 + 0.4) * 0.018
    # Fine grain noise
    grain1 = (np.random.RandomState(42).randn(size, size).astype(np.float32)) * 0.008
    h_barchan_textured = np.clip(h_barchan + (ripples1 + grain1) * h_barchan, 0.0, 1.0)

    # Compute normals from height gradient
    gy1, gx1 = np.gradient(h_barchan_textured * 55.0)
    norm1 = np.sqrt(gx1**2 + gy1**2 + 1.0)
    nx1, ny1, nz1 = -gx1 / norm1, -gy1 / norm1, 1.0 / norm1

    # Directional solar shading
    ndotl1 = np.clip(nx1 * sun_dir[0] + ny1 * sun_dir[1] + nz1 * sun_dir[2], 0.0, 1.0)

    # Crest highlight detection: sharp change in slope facing sun
    crest_highlight = np.clip((h_barchan - 0.5) * 2.0, 0.0, 1.0) * ndotl1

    # Ambient occlusion / soft shadow on sheltered slip face
    slip_shadow = np.clip((ny1 * 0.65 - ndotl1 * 0.60), 0.0, 1.0) * h_barchan

    # Sample base sand texture with micro displacement
    warp_x1 = ((x_grid * 0.5 + 0.5) * (W_sand - 1) + gx1 * 6.0) % W_sand
    warp_y1 = ((y_grid * 0.5 + 0.5) * (H_sand - 1) + gy1 * 6.0) % H_sand

    barchan_rgb = np.zeros((size, size, 3), dtype=np.float32)
    for c in range(3):
        barchan_rgb[:, :, c] = ndi.map_coordinates(sand_arr[:, :, c], [warp_y1, warp_x1], order=1)

    # Modulate RGB with authentic physical lighting:
    # Sunlit golden highlights on crest and stoss slope
    light_mult1 = 0.78 + 0.48 * ndotl1 + 0.15 * crest_highlight
    barchan_rgb[:, :, 0] *= light_mult1 * 1.04
    barchan_rgb[:, :, 1] *= light_mult1 * 1.01
    barchan_rgb[:, :, 2] *= light_mult1 * 0.95

    # Deepen amber shadow on slipface (warm ambient sand bounce, not pitch black)
    barchan_rgb[:, :, 0] -= slip_shadow * 24.0
    barchan_rgb[:, :, 1] -= slip_shadow * 20.0
    barchan_rgb[:, :, 2] -= slip_shadow * 12.0
    barchan_rgb = np.clip(barchan_rgb, 0.0, 255.0)

    # Super-smooth alpha transition based on dune height
    # Generous feathering over the perimeter
    h_cut = 0.04
    alpha_raw1 = np.clip((h_barchan - h_cut) / (0.85 - h_cut), 0.0, 1.0)
    # Cosine / smooth Hermite S-curve
    alpha_curve1 = alpha_raw1 * alpha_raw1 * (3.0 - 2.0 * alpha_raw1)
    # Radial perimeter guard
    rad = np.sqrt(x_grid**2 + y_grid**2)
    rad_mask = np.clip((0.92 - rad) / 0.22, 0.0, 1.0)
    rad_mask = rad_mask * rad_mask * (3.0 - 2.0 * rad_mask)
    alpha1 = alpha_curve1 * rad_mask
    alpha1 = ndi.gaussian_filter(alpha1, sigma=4.0)
    alpha1 = np.clip(alpha1 * 255.0, 0.0, 255.0).astype(np.uint8)

    # Assemble RGBA and ensure zero-alpha color matches sand perfectly
    barchan_rgba = np.zeros((size, size, 4), dtype=np.uint8)
    barchan_rgba[:, :, :3] = barchan_rgb.astype(np.uint8)
    barchan_rgba[:, :, 3] = alpha1

    # Color dilation to prevent edge discoloration
    zero_mask1 = alpha1 < 10
    for c in range(3):
        col = barchan_rgba[:, :, c].copy()
        col[zero_mask1] = int(mean_sand_rgb[c])
        barchan_rgba[:, :, c] = col

    Image.fromarray(barchan_rgba, 'RGBA').save(os.path.join(output_dir, 'dune_barchan.png'))
    print("Generated and saved high-fidelity dune_barchan.png")

    # -------------------------------------------------------------------------
    # 2. TRANSVERSE DUNE RIDGE (Вытянутая волнообразная барханная гряда)
    # -------------------------------------------------------------------------
    # Ridge stretches across the wind in an undulating S-wave
    theta2 = np.radians(-22)
    cos2, sin2 = np.cos(theta2), np.sin(theta2)
    x2 = x_grid * cos2 - y_grid * sin2
    y2 = x_grid * sin2 + y_grid * cos2

    # Undulating crest curve
    crest_curve2 = 0.18 * np.sin(x2 * 3.2) + 0.07 * np.cos(x2 * 6.5)
    y_crest2 = crest_curve2

    # Taper off along ridge length (|x2| > 0.72)
    len_env = np.clip(1.0 - (np.abs(x2) / 0.74) ** 2, 0.0, 1.0)
    len_env = len_env ** 1.3

    # Asymmetric transverse profile (gentle windward slope, steeper slipface)
    delta_y = y2 - y_crest2
    stoss_dist2 = np.clip((-delta_y) / 0.44, 0.0, 1.0)
    h_stoss2 = ((1.0 - stoss_dist2 ** 1.6)) * (delta_y <= 0)

    slip_dist2 = np.clip(delta_y / 0.28, 0.0, 1.0)
    h_slip2 = ((1.0 - slip_dist2) ** 1.7) * (delta_y > 0)

    h_ridge = (h_stoss2 + h_slip2) * len_env
    h_ridge = ndi.gaussian_filter(h_ridge, sigma=11.0)
    if h_ridge.max() > 0:
        h_ridge /= h_ridge.max()

    # Wind ripples running across the ridge
    ripple_phase2 = (x2 * 30.0 + y2 * 18.0) * np.pi
    ripples2 = np.sin(ripple_phase2) * 0.035 + np.sin(ripple_phase2 * 2.1) * 0.016
    grain2 = (np.random.RandomState(84).randn(size, size).astype(np.float32)) * 0.008
    h_ridge_textured = np.clip(h_ridge + (ripples2 + grain2) * h_ridge, 0.0, 1.0)

    # Normals and lighting
    gy2, gx2 = np.gradient(h_ridge_textured * 50.0)
    norm2 = np.sqrt(gx2**2 + gy2**2 + 1.0)
    nx2, ny2, nz2 = -gx2 / norm2, -gy2 / norm2, 1.0 / norm2

    ndotl2 = np.clip(nx2 * sun_dir[0] + ny2 * sun_dir[1] + nz2 * sun_dir[2], 0.0, 1.0)
    crest_highlight2 = np.clip((h_ridge - 0.45) * 2.0, 0.0, 1.0) * ndotl2
    slip_shadow2 = np.clip((ny2 * 0.60 - ndotl2 * 0.60), 0.0, 1.0) * h_ridge

    # Sample base sand texture
    warp_x2 = ((x_grid * 0.5 + 0.5) * (W_sand - 1) + gx2 * 6.0) % W_sand
    warp_y2 = ((y_grid * 0.5 + 0.5) * (H_sand - 1) + gy2 * 6.0) % H_sand

    ridge_rgb = np.zeros((size, size, 3), dtype=np.float32)
    for c in range(3):
        ridge_rgb[:, :, c] = ndi.map_coordinates(sand_arr[:, :, c], [warp_y2, warp_x2], order=1)

    light_mult2 = 0.78 + 0.48 * ndotl2 + 0.15 * crest_highlight2
    ridge_rgb[:, :, 0] *= light_mult2 * 1.04
    ridge_rgb[:, :, 1] *= light_mult2 * 1.01
    ridge_rgb[:, :, 2] *= light_mult2 * 0.95

    ridge_rgb[:, :, 0] -= slip_shadow2 * 24.0
    ridge_rgb[:, :, 1] -= slip_shadow2 * 20.0
    ridge_rgb[:, :, 2] -= slip_shadow2 * 12.0
    ridge_rgb = np.clip(ridge_rgb, 0.0, 255.0)

    # Alpha mask
    h_cut2 = 0.04
    alpha_raw2 = np.clip((h_ridge - h_cut2) / (0.85 - h_cut2), 0.0, 1.0)
    alpha_curve2 = alpha_raw2 * alpha_raw2 * (3.0 - 2.0 * alpha_raw2)
    alpha2 = alpha_curve2 * rad_mask
    alpha2 = ndi.gaussian_filter(alpha2, sigma=4.0)
    alpha2 = np.clip(alpha2 * 255.0, 0.0, 255.0).astype(np.uint8)

    ridge_rgba = np.zeros((size, size, 4), dtype=np.uint8)
    ridge_rgba[:, :, :3] = ridge_rgb.astype(np.uint8)
    ridge_rgba[:, :, 3] = alpha2

    zero_mask2 = alpha2 < 10
    for c in range(3):
        col = ridge_rgba[:, :, c].copy()
        col[zero_mask2] = int(mean_sand_rgb[c])
        ridge_rgba[:, :, c] = col

    Image.fromarray(ridge_rgba, 'RGBA').save(os.path.join(output_dir, 'dune_mound.png'))
    print("Generated and saved high-fidelity dune_mound.png (Transverse Ridge)")

    # -------------------------------------------------------------------------
    # 3. FIX ALL OTHER BIOME ROUGH TERRAIN SPRITES (Edge Bleed & Alpha Masks)
    # -------------------------------------------------------------------------
    biome_pairs = [
        ('scrap_drift.png', 'biome_derelict_sector.jpg'),
        ('spore_patch.png', 'biome_bioluminescent_wilds.jpg'),
        ('ash_drift.png', 'biome_volcanic_caldera.jpg'),
        ('ruins_rubble.png', 'biome_primordial_ruins.jpg'),
        ('void_distortion.png', 'biome_rift_core.jpg')
    ]

    for png_name, biome_jpg in biome_pairs:
        png_path = os.path.join(output_dir, png_name)
        jpg_path = os.path.join('public/textures/biomes', biome_jpg)
        if not os.path.exists(png_path) or not os.path.exists(jpg_path):
            continue

        base_img = Image.open(png_path).convert('RGBA')
        biome_img = Image.open(jpg_path).convert('RGB')

        base_arr = np.array(base_img, dtype=np.float32)
        biome_arr = np.array(biome_img, dtype=np.float32)
        mean_biome_rgb = np.mean(biome_arr, axis=(0, 1))

        alpha = base_arr[:, :, 3]

        # If texture was completely opaque (e.g. scrap_drift, ash_drift with white bg)
        # Extract features and create radial/organic soft mask
        if np.mean(alpha > 250) > 0.85:
            # Detect white or uniform border
            diff_from_corner = np.mean(np.abs(base_arr[:, :, :3] - base_arr[0, 0, :3]), axis=2)
            # Center distance
            dist_center = np.sqrt(x_grid**2 + y_grid**2)
            organic_fade = np.clip((0.85 - dist_center) / 0.35, 0.0, 1.0)
            organic_fade = organic_fade * organic_fade * (3.0 - 2.0 * organic_fade)
            
            # Combine feature detection with radial falloff
            alpha = np.clip(diff_from_corner * 4.0, 0.0, 255.0) * organic_fade
            alpha = ndi.gaussian_filter(alpha, sigma=6.0)

        # Smooth existing alpha to eliminate harsh pixel cutout borders
        alpha = ndi.gaussian_filter(alpha, sigma=3.5)
        # Apply gentle perimeter falloff so it never touches the texture border
        dist_c = np.sqrt(x_grid**2 + y_grid**2)
        border_fade = np.clip((0.92 - dist_c) / 0.22, 0.0, 1.0)
        border_fade = border_fade * border_fade * (3.0 - 2.0 * border_fade)
        alpha = alpha * border_fade
        alpha = np.clip(alpha, 0.0, 255.0).astype(np.uint8)

        base_arr[:, :, 3] = alpha

        # Dilate edge color using mean biome floor RGB to prevent black/white halos
        zero_m = alpha < 10
        for c in range(3):
            col = base_arr[:, :, c].copy()
            col[zero_m] = mean_biome_rgb[c]
            base_arr[:, :, c] = col

        Image.fromarray(base_arr.astype(np.uint8), 'RGBA').save(png_path)
        print(f"Refined and cleaned {png_name} for {biome_jpg}")

if __name__ == '__main__':
    generate_photorealistic_dunes()
