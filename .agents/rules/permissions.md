---
description: Full autonomy permissions for file changes and tool execution within the project
globs: ["**/*"]
---

# Autonomy and Tool Execution Permissions

1. **Full Access to Project Files:**
   - Permitted to directly create, modify, relocate, and overwrite any files within the repository without asking the user for confirmation beforehand.

2. **Direct Tool and Command Execution:**
   - Execute builds (`npm run build`), typechecks (`tsc`), test suites, Python asset processing scripts, and package installations proactively without asking "may I run this?".

3. **Verification and Reporting:**
   - After applying changes, autonomously verify builds and code health, providing the user with a concise and clear summary of the completed work.
