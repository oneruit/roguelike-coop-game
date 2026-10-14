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
- Character animation sheets (`IDLE`, `WALK`, `ATTACK`);
- Regular monsters and bosses (`WALK`, `ATTACK`, portraits);
- User interface elements (HUD, 9-slice frames, buttons, progress bars, ribbons, slots);
- Icons for items, abilities, weapons, and rewards;
- Environment textures, biomes, and visual effects.

---

## 2. Mandatory Approval Gateway Protocol

After generating an image, the agent **MUST**:

1. **Display the image to the user in chat** (using markdown image preview or link).
2. **Immediately call the `ask_question` tool**, asking whether the generated image fits, needs to be redone, or if the user wants to provide their own variant:
   - **`Option 1 (Recommended):`** `Подходит (продолжить работу / интегрировать в игру)`
   - **`Option 2:`** `Переделать (укажу правки или сгенерировать заново)`
   - **`Option 3:`** `Свой вариант (загружу своё изображение или укажу путь к файлу)`

3. **Halt execution** and await user input.

---

## 3. Handling User Decisions

### Scenario A: "Подходит" (Approved)
* The agent records the approved asset.
* Advances to the next stage (Python post-processing, slicing, moving to `public/textures/`, CSS/TypeScript integration).

### Scenario B: "Переделать" (Redo / Request changes)
* The agent analyzes user feedback (adjusting colors, proportions, details, equipment elements).
* Revises the prompt taking all feedback into account.
* Calls `generate_image` again.
* **Calls `ask_question` again** with the same choices until fully approved.

### Scenario C: "Свой вариант" (Custom variant)
* The user provides their own image file or specifies a path to a custom asset.
* The agent verifies the user's asset dimensions and format, places it into the pipeline, and proceeds to post-processing/slicing/integration using the user's provided asset.

### Scenario D: "Отмена задачи / Cancel task"
* If the user decides against creating the asset or explicitly cancels the task.
* The agent **IMMEDIATELY stops task execution**.
* Does not make unwanted changes to the codebase (`game/`, `admin/`, CSS, textures).
* Cleans up temporary artifacts if not needed.
* Briefly reports the task cancellation to the user.

---

## 4. Strict Prohibitions
* **PROHIBITED**: Automatically accepting a generated image and committing/integrating it into the game without explicit human approval.
* **PROHIBITED**: Generating full animation sheets for characters or bosses before the concept sheet (`concept.png` / turnaround) has been approved.
* **PROHIBITED**: Proceeding without giving the user the choice between "Подходит", "Переделать", and "Свой вариант".
