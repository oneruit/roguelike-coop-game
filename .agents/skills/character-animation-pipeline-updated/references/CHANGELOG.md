# Changes from the previous pipeline

1. Standard animation states reduced from four (`IDLE`, `WALK`, `ATTACK`, `WALK_ATTACK`) to three (`IDLE`, `WALK`, `ATTACK`). `WALK_ATTACK` is not a required runtime asset.
2. Each state remains a separate 6×4 sheet at 128×128 per cell (768×512 overall).
3. Direction row order changed to `FRONT`, `BACK`, `LEFT`, `RIGHT`. The Three.js direction mapping must be updated together with the textures.
4. Camera instructions now describe a stable 2.5D orthographic game camera tilted approximately 30° downward, without asking the image model to lean or rotate the character itself.
5. Added a mandatory four-view turnaround approval stage before generating animation sheets.
6. Replaced archetype-specific prompt examples as the core approach with a reusable character identity lock plus one state prompt per sheet.
7. `ATTACK` is a physical weapon animation with no VFX by default.
8. Automatic left/right mirroring is disabled by default because it may invert asymmetric details and weapon handedness.
9. Runtime portrait is optional rather than one of the required animation-state files.
10. Added the user-provided `process_character_sheets.py`, adapted to three required inputs (`IDLE`, `WALK`, `ATTACK`) and the new `FRONT / BACK / LEFT / RIGHT` row mapping.
11. Background removal now works on edge-connected near-background pixels instead of removing every globally near-white pixel, protecting enclosed white costume details.
12. Pixel-art resizing uses nearest-neighbor interpolation. Frame origins are kept centered on the source cell and foot anchoring is based on a row baseline, reducing jitter caused by centering each frame's whole weapon/body bounding box.
13. Added an explicit legacy portrait filename option and made lateral mirroring opt-in, never automatic.
14. The processor now uses the IDLE sheet as the scale reference and applies one shared scale to all three actions, constrained by the most extended frame so action changes do not visibly resize the character.
15. Chibi proportions standard: Established heroic miniature Chibi proportions (2.5 to 3 heads tall: head ~30–35% of height, compact torso, sturdy limbs, chunky boots, readable stylized weapons). Realistic human proportions are strictly forbidden.
16. Mandatory negative style constraints: Added mandatory prompt negative block: `"No anime style, no kawaii style, no cute expression, no childish appearance, no soft pastel colors, no realistic proportions, no photorealism, no smooth gradients."`
17. Mature / grim facial aesthetic: Characters must be experienced, battle-ready adults or menacing creatures with sharp angular features, battle glare, scars/beards, and small-to-medium sharp eyes. Strictly forbidden: giant anime eyes, kawaii blush, cute smiles, childish appearance.
18. Visual style reference: Added `references/chibi_style_reference.png` featuring 15 fantasy archetypes as the canonical visual benchmark for proportions, shading, and outlines.
19. Corrected documentation paths: Updated all script references in `SKILL.md` and `README.md` to point to `character-animation-pipeline-updated/`.
