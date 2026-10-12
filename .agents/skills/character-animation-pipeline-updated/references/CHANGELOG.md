# Changes from the previous pipeline

1. Standard animation states reduced from four (`IDLE`, `WALK`, `ATTACK`, `WALK_ATTACK`) to three (`IDLE`, `WALK`, `ATTACK`). `WALK_ATTACK` is not a required runtime asset.
2. Each state remains a separate 6×4 sheet at 128×128 per cell (768×512 overall).
3. Authoritative row mapping:
   - Row 0: `FRONT` (face)
   - Row 1: `BACK` (back)
   - Row 2 (3rd row): `RIGHT` (right)
   - Row 3 (4th row): `LEFT` (left)
   Default pipeline standard `fbrl` aligns directly with Three.js `ANIM_LAYOUT_V2`.
4. Strict Profile Rule: In Row 2 (RIGHT) and Row 3 (LEFT), the character's **body is ALWAYS turned sideways**, and the **face is strictly in profile**. No three-quarters (3/4) views, no torso angled towards camera.
5. Camera instructions describe a stable 2.5D orthographic game camera tilted approximately 30° downward.
6. Turnaround / reference approval stage: static 4-view or 5-in-1 reference sheet before generating animation sheets.
7. Replaced archetype-specific prompt examples with a reusable master character identity template plus modular state prompts.
8. `ATTACK` is a physical weapon animation with no VFX by default.
9. Automatic left/right mirroring is disabled by default because it may invert asymmetric details and weapon handedness.
10. Runtime portrait is optional rather than one of the required animation-state files.
11. Chromakey standard: Pure solid magenta `RGB(255, 0, 255)` (`#ff00ff`) chromakey background.
12. Global magenta removal: Magenta is removed **both outside the silhouette and inside any enclosed gaps, holes, and limbs** (magenta is never used as a character color).
13. Zero magenta aura (1px black outline defringing): Boundary pixels touching transparency with residual magenta spill/fringe are converted to crisp 1px black outline `[0, 0, 0, 255]`. Interior character textures are completely untouched.
14. Script facing verification: `scripts/process_character_sheets.py` and `scripts/validate_sheets.py` programmatically verify that Row 2 faces RIGHT and Row 3 faces LEFT in side profile via horizontal flip IoU and facial bias analysis.
15. Pixel-art resizing uses nearest-neighbor interpolation. Frame origins are kept centered on the source cell and foot anchoring is based on a row baseline, reducing jitter.
16. The processor uses the IDLE sheet as the scale reference and applies one shared scale to all three actions, constrained by the most extended frame.
17. Chibi proportions standard: Established heroic miniature Chibi proportions (2.5 to 3 heads tall: head ~30–35% of height, compact torso, sturdy limbs, chunky boots, readable stylized weapons). Realistic human proportions are strictly forbidden.
18. Mandatory negative style constraints: Added mandatory prompt negative block: `"No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients."`
19. Mature / grim facial aesthetic: Characters must be experienced, battle-ready adults or menacing creatures with sharp angular features, battle glare, scars/beards, and small-to-medium sharp eyes. Strictly forbidden: giant anime eyes, kawaii blush, cute smiles, childish appearance.
20. Dual input modes: Support both direct prompt / image generation (no redundant questionnaires) and brief description auto-enrichment using sensible archetype defaults.
21. Closed eyes on frame 3: Column 3 across all rows in IDLE, WALK, and ATTACK depicts the character with closed eyes (natural blink / breath peak / stride focus / wind-up tension).
22. Zero floor clutter: Strictly forbidden ground shadows, drop shadows, cast shadows, floor lines, or pedestals under the character.
