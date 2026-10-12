# Changes from the previous pipeline

1. Standard animation states reduced from four (`IDLE`, `WALK`, `ATTACK`, `WALK_ATTACK`) to three (`IDLE`, `WALK`, `ATTACK`). `WALK_ATTACK` is not a required runtime asset.
2. Each state remains a separate 6×4 sheet at 128×128 per cell (768×512 overall).
3. Direction row order supports `FRONT, BACK, LEFT, RIGHT` (default `fblr`) as well as `FRONT, BACK, RIGHT, LEFT` (`fbrl`).
4. Camera instructions describe a stable 2.5D orthographic game camera tilted approximately 30° downward.
5. Turnaround / reference approval stage: static 4-view or 5-in-1 reference sheet before generating animation sheets.
6. Replaced archetype-specific prompt examples with a reusable master character identity template plus modular state prompts.
7. `ATTACK` is a physical weapon animation with no VFX by default.
8. Automatic left/right mirroring is disabled by default because it may invert asymmetric details and weapon handedness.
9. Runtime portrait is optional rather than one of the required animation-state files.
10. Added `process_character_sheets.py`, adapted to three required inputs (`IDLE`, `WALK`, `ATTACK`) with robust background removal.
11. Chromakey standard: Switched from white to pure solid magenta `RGB(255, 0, 255)` (`#ff00ff`) chromakey background. Edge-connected removal strips the outer magenta field while preserving any enclosed character pixels.
12. Pixel-art resizing uses nearest-neighbor interpolation. Frame origins are kept centered on the source cell and foot anchoring is based on a row baseline, reducing jitter.
13. Added explicit legacy portrait filename option and made lateral mirroring opt-in, never automatic.
14. The processor uses the IDLE sheet as the scale reference and applies one shared scale to all three actions, constrained by the most extended frame.
15. Chibi proportions standard: Established heroic miniature Chibi proportions (2.5 to 3 heads tall: head ~30–35% of height, compact torso, sturdy limbs, chunky boots, readable stylized weapons). Realistic human proportions are strictly forbidden.
16. Mandatory negative style constraints: Added mandatory prompt negative block: `"No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients."`
17. Mature / grim facial aesthetic: Characters must be experienced, battle-ready adults or menacing creatures with sharp angular features, battle glare, scars/beards, and small-to-medium sharp eyes. Strictly forbidden: giant anime eyes, kawaii blush, cute smiles, childish appearance.
18. Dual input modes: Support both direct prompt / image generation (no redundant questionnaires) and brief description auto-enrichment using sensible archetype defaults.
19. Closed eyes on frame 3: Column 3 across all rows in IDLE, WALK, and ATTACK depicts the character with closed eyes (natural blink / breath peak / stride focus / wind-up tension).
20. Zero floor clutter: Strictly forbidden ground shadows, drop shadows, cast shadows, floor lines, or pedestals under the character.
