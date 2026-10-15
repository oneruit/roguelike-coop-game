---
description: Mandatory requirement that all documentation, rules, skills, prompts, and markdown files are written in English
globs: ["**/*.md"]
---

# Documentation Language Rule

This rule defines the mandatory language requirement for all project documentation and agent instructions.

## Mandatory Requirement

1. **English Only**:
   - All documentation, architectural specifications, skills, agent rules, prompt templates, guides, checklists, and markdown (`.md`) files in this repository **must be written strictly in English**.
   - No documentation, prompt guides, rule files, or skill descriptions may be created in or contain other languages, with the exception of necessary technical identifiers or verbatim error messages from external tools when quoting them.

2. **User Communication vs Repository Files**:
   - The agent may communicate with the user in the language the user speaks in chat (e.g. Russian if the user writes in Russian).
   - However, **all files committed to the repository** (code comments, docstrings, markdown documentation, rules, skills, prompt files, git commit messages, and pull request descriptions) must always be in **English**.

3. **Consistency Across Assets & Prompts**:
   - All state descriptions (e.g. `IDLE`, `WALK`, `IDLE_ATTACK`, `WALK_ATTACK`), animation prompt guides, art direction notes, option texts, and acceptance checklists must use clear, standardized English.
