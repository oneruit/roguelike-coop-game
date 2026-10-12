# File Size Limit Rule (Max 1500 Lines)

This rule establishes strict maximum line limits for files within the repository to maintain code health, readability, and maintainability.

---

## 1. Core Rule

> **No code, stylesheet, or data source file may exceed 1,500 lines.**
>
> If an existing or newly created file exceeds or approaches 1,500 lines, it must be modularized and divided into smaller, well-defined files.

---

## 2. Rationale

- **Maintainability**: Giant monolithic files make navigation, refactoring, and review significantly slower and error-prone.
- **Merge Conflicts**: Multiple developers or agents editing different parts of a massive file frequently cause painful git conflicts.
- **Context Constraints**: AI agents and automated tools operate within finite context windows. Smaller, targeted modules result in faster and more accurate changes.
- **Cohesion and Separation of Concerns**: Encourages clean separation of UI components, utility functions, game mechanics, and state management.

---

## 3. Modularization Strategies

When a file approaches or exceeds 1,500 lines, use the following patterns to decompose it:

### TypeScript / JavaScript Files
1. **Extract Helpers & Math Utilities**: Move pure functions, math formulas, geometry logic, or formatting into a sibling `*Utils.ts` or `*Helpers.ts` file.
2. **Extract Sub-Components / Renderers**: If a UI file builds multiple distinct windows, tabs, or modal sections, create dedicated sub-components (e.g. `InventoryView.ts`, `MerchantView.ts`, `SkillTreeTab.ts`).
3. **Extract Types and Constants**: Move shared type definitions, interfaces, enum mappings, and configuration constants into `*Types.ts` or `*Constants.ts`.
4. **Extract State / Business Logic**: Decouple stateful logic, network dispatching, or event handlers from rendering templates.

### CSS / Stylesheet Files
1. **Decompose by Domain**: Rather than one monolithic stylesheet (e.g. `hud.css`), break out distinct sub-systems:
   - `hud-combat.css` (health bars, floating damage, hotbars)
   - `hud-modals.css` (dialogs, merchants, inventory)
   - `hud-minimap.css` (minimap, radar, markers)
2. **CSS `@import` or Vite Entrypoints**: Import modular stylesheets cleanly in the main entry point or directly in component loaders.

---

## 4. Verification Check

Before committing changes, agents and developers should ensure no modified files exceed 1,500 lines:

```powershell
Get-ChildItem -Recurse -Include *.ts,*.js,*.css,*.html -Exclude node_modules,dist,dist-admin | ForEach-Object {
    $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
    if ($lines -gt 1500) {
        Write-Host "Warning: $($_.FullName) exceeds 1500 lines ($lines lines)" -ForegroundColor Red
    }
}
```
