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
   - **`Option 1 (Recommended):`** `Approved / Fits well (proceed with work / integrate into the game)`
   - **`Option 2:`** `Redo / Revise (specify adjustments or regenerate)`
   - **`Option 3:`** `Custom variant (provide custom image or specify file path)`

3. **Halt execution** and await user input.

---

## 3. Handling User Decisions

### Scenario A: Approved ("Fits well")
* The agent records the approved asset.
* Advances to the next stage (Python post-processing, slicing, moving to `public/textures/`, CSS/TypeScript integration).

### Scenario B: Redo / Revise ("Request changes")
* The agent analyzes user feedback (adjusting colors, proportions, details, equipment elements).
* Revises the prompt taking all feedback into account.
* Calls `generate_image` again.
* **Calls `ask_question` again** with the same choices until fully approved.

### Scenario C: Custom variant ("User provided asset")
* The user provides their own image file or specifies a path to a custom asset.
* The agent verifies the user's asset dimensions and format, places it into the pipeline, and proceeds to post-processing/slicing/integration using the user's provided asset.

### Scenario D: Cancel task
* If the user decides against creating the asset or explicitly cancels the task.
* The agent **IMMEDIATELY stops task execution**.
* Does not make unwanted changes to the codebase (`game/`, `admin/`, CSS, textures).
* Cleans up temporary artifacts if not needed.
* Briefly reports the task cancellation to the user.

---

## 4. Strict Prohibitions
* **PROHIBITED**: Automatically accepting a generated image and committing/integrating it into the game without explicit human approval.
* **PROHIBITED**: Generating full animation sheets for characters or bosses before the concept sheet (`concept.png` / turnaround) has been approved.
* **PROHIBITED**: Proceeding without giving the user the choice between "Approved", "Redo / Revise", and "Custom variant".

---

## 5. API Quota Exhaustion & Graceful Suspension (HTTP 429)

If an image generation tool or subagent fails due to rate limiting or quota exhaustion (`HTTP 429 RESOURCE_EXHAUSTED` / `QUOTA_EXHAUSTED`):

1. **Stop Immediately**:
   - Do **NOT** retry image generation in loops or poll repeatedly.
   - Immediately abort any pending generation subagents.

2. **Preserve Current Progress**:
   - Save all approved artifacts, concept art, turnaround sheets, reference images, and partial crops into the character's or asset's folder (e.g. `raw_assets/<asset_id>/`).
   - Create or update a resumption checkpoint file: `raw_assets/<asset_id>/TASK_STATE.json` (or `TASK_STATE.md`).
   - The checkpoint MUST record:
     - `task_id` / `character_id` / `asset_name`.
     - User specifications and requirements (prompt, visual details, references).
     - Completed and approved steps (e.g., Turnaround approved, concept locked).
     - Remaining unfinished steps (e.g., pending animation sheets: IDLE, WALK, ATTACK, WALK_ATTACK; script post-processing; engine integration).
     - Quota reset time and duration provided by the API error message.
     - Resumption instructions for the next session.

3. **Commit Progress to Task Branch**:
   - Commit all saved assets and the checkpoint file to the active task branch (`feature/*`) following Conventional Commits (e.g. `feat(character): save approved turnaround and task checkpoint`).
   - Ensure the git working tree is clean.

4. **Report to User**:
   - Clearly report that generation was paused due to HTTP 429 quota exhaustion.
   - State the exact remaining cooldown duration and estimated reset time.
   - List what was completed, approved, and saved.
   - Provide a clear prompt the user can invoke when the quota resets to seamlessly resume the remaining steps without repeating already completed work.

