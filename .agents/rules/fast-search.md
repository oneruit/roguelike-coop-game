---
description: "Mandatory performance rule for codebase searching, symbol lookup, and exploration"
globs: "**/*"
---

# Fast Codebase Search and Exploration Rule

This rule defines mandatory search and navigation practices for AI agents to eliminate multi-minute exploration delays.

## 1. Strictly Prohibited Slow Patterns

1. **NEVER use unscoped recursive PowerShell searches**:
   - `Get-ChildItem -Recurse | Select-String ...`
   - `Get-ChildItem -Recurse -File` without strict exclusions
   - *Why*: The repository contains over 8,500 files (including `node_modules`, `dist`, and assets). Broad PowerShell directory scans allocate hundreds of megabytes of .NET objects and freeze execution for 2–5 minutes.

2. **NEVER crawl directories sequentially with `view_file`**:
   - Do not open 10–20 files in a row just to explore architecture or understand where a type lives.
   - Consult `.agents/rules/codebase-map.md` and `.agents/cache/codebase-index.md` first.

3. **NEVER spawn `research` subagents for simple file or symbol lookups**:
   - Spawning a subagent incurs substantial context and time overhead (~3–5 minutes).
   - Use direct targeted Git search commands in the parent agent turn.

---

## 2. Mandatory Search Commands

Always use Git-indexed commands. Git maintains an in-memory tree index, allowing search across the entire project in under 100 milliseconds:

### A. Searching Code, Text, or Symbols (`git grep`)
```powershell
# Search across code files (skips node_modules, dist, .git automatically)
git grep -n "<pattern>" -- "game/src" "admin/src"

# Case-insensitive search
git grep -i -n "<pattern>" -- "game/src" "admin/src"
```

### B. Finding Files by Name (`git ls-files`)
```powershell
# Find files by pattern or basename instantaneously without directory walking
git ls-files "*<pattern>*"
```

### C. Consulting the Pre-computed Codebase Index
- When looking for the definition of an interface, class, enum, or function, check `.agents/cache/codebase-index.md`.
- To regenerate or refresh the index after adding new files, run:
  ```powershell
  npm run index
  ```

### D. Targeted File Viewing
- After locating the target line via `git grep` or `codebase-index.md`, use `view_file` with precise `StartLine` and `EndLine` (e.g. range of 50–100 lines).
- Avoid loading full 800-line files when only inspecting a single class, method, or config block.

---

## 3. Native MCP Tools (Fastest Option)

When the `codebase-indexer` MCP server is available, prefer using native MCP tools over running terminal commands:

- **`find_symbol(name)`**: Instant lookup of classes, interfaces, types, functions, constants, or class methods. Returns exact file path, line number, JSDoc summary, and declaration code snippet. Supports **fuzzy matching**, CamelCase acronyms (e.g. `css` for `CharacterSelectScreen`), abbreviations (e.g. `authmgr` for `AuthManager`), and typo tolerance.
- **`get_game_entities(category)`**: Instant table of heroes, weapons, bosses, monsters, items, or passives from `DEFAULT_BALANCE` without reading large files.
- **`search_code(query, directory, caseSensitive, maxResults)`**: High-speed git-indexed search (<50ms).
- **`get_file_outline(file)`**: Lists all exported symbols and class methods for a file without reading the whole file.
- **`refresh_index()`**: Re-indexes the project on demand.


