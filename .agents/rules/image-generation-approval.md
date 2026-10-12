---
description: Mandatory human approval gateway for all generated visual assets (characters, monsters, bosses, UI, HUD, icons)
globs: ["**/*"]
---

# Image Generation Approval Rule

This rule is a **strict and mandatory protocol** for all AI agents working with any graphical asset generation in this project.

---

## 1. Scope
The rule applies to **every invocation of the `generate_image` tool**, regardless of the asset type being created:
- Character concept sheets (`hero_<name>_concept.png`);
- Character animation sheets (`IDLE`, `WALK`, `ATTACK`, `WALK_ATTACK`);
- Regular monsters and bosses (`WALK`, `ATTACK`, portraits);
- User interface elements (HUD, 9-slice frames, buttons, progress bars, ribbons, slots);
- Icons for items, abilities, weapons, and rewards;
- Environment textures, biomes, and visual effects.

---

## 2. Mandatory Approval Gateway Protocol

After generating an image, the agent **MUST**:

1. **Display the image to the user in chat** (using markdown image preview or link).
2. **Immediately call the `ask_question` tool**, presenting the user with 3 specific options:
   - **`Option 1 (Recommended):`** `Approve (proceed with work / integrate into game)`
   - **`Option 2:`** `Request changes (specify revisions or regenerate)`
   - **`Option 3:`** `Do nothing / Cancel task (stop generation)`

3. **Halt execution** and await user input.

---

## 3. Handling User Decisions

### Scenario A: "Approve"
* The agent records the approved asset.
* Advances to the next stage (Python post-processing, slicing, moving to `public/textures/`, CSS/TypeScript integration).

### Scenario B: "Request changes"
* The agent analyzes user feedback (adjusting colors, proportions, details, equipment elements).
* Revises the prompt taking all feedback into account.
* Calls `generate_image` again.
* **Calls `ask_question` again** with the same 3 choices until fully approved.

### Scenario C: "Do nothing / Cancel task"
* The user decides against creating the asset or cancels the task.
* The agent **IMMEDIATELY stops task execution**.
* Does not make changes to the codebase (`game/`, `admin/`, CSS, textures).
* Cleans up temporary artifacts if not needed.
* Briefly reports the successful task cancellation to the user.

---

## 4. Strict Prohibitions
* **PROHIBITED**: Automatically accepting a generated image and committing/integrating it into the game without explicit human approval.
* **PROHIBITED**: Generating full animation sheets for characters or bosses before the concept sheet (`concept.png`) has been approved.
* **PROHIBITED**: Ignoring the "Do nothing / Cancel task" option.
