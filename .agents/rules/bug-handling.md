---
description: Mandatory bug fixing and reporting protocol when bugs or unexpected defects are discovered
globs: ["**/*"]
---

# Bug Fixing and Reporting Rule

This rule defines the mandatory protocol for handling bugs discovered during development, testing, refactoring, or code analysis.

## Mandatory Protocol

1. **Immediate Fix**:
   - If an agent discovers a bug, runtime error, broken logic, desynchronization, visual artifact, or unexpected behavior in the codebase or while testing, the agent **MUST fix the bug immediately**.
   - Do not ignore found bugs, leave them for later, or expect the user to fix them manually.

2. **Explicit Reporting**:
   - The agent **MUST explicitly report** every discovered and resolved bug in the summary/report to the developer.
   - The report should briefly describe:
     - What the bug was (root cause and symptoms);
     - Where it occurred (file and component);
     - How it was resolved.

3. **Verification**:
   - Verify that the fix does not introduce regressions by running the project verification commands:
     ```powershell
     npm run typecheck
     npm run build
     npm run build:admin
     ```
