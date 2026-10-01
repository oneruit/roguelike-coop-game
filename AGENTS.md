# Agent Git Workflow & Contribution Guidelines

This document defines the mandatory Git workflow for all AI agents (including Antigravity, Claude, Copilot, etc.) and automated tools contributing to this repository.

---

## 12 Golden Rules for Agents

1. **Never work directly on `main` (or default branch `master`).**
   - Direct commits to `main`/`master` are strictly prohibited.
2. **Always fetch latest upstream before starting:**
   - Always run `git fetch origin` and ensure your working base is up to date with the remote primary branch (`origin/main` or `origin/master`).
3. **Create a dedicated branch for each task:**
   - Every individual request, bugfix, or feature must live on its own separate branch.
4. **Follow strict branch naming conventions:**
   - `feature/<name>` — New game mechanics, entity systems, UI, networking features.
   - `fix/<name>` — Bug fixes, collision corrections, networking patches.
   - `refactor/<name>` — Code cleanup, architecture improvements without behavior changes.
   - `chore/<name>` — Dependency updates, tooling, configuration updates.
   - `docs/<name>` — Documentation updates only.
   - `test/<name>` — Adding or improving tests.
   *(Use kebab-case for `<name>`, e.g., `feature/altar-interaction`, `fix/projectile-damage-calc`)*.
5. **Write clear Conventional Commits:**
   - Follow the Conventional Commits specification: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `perf:`, etc.
   - Use imperative mood: `"feat(combat): add piercing projectile behavior"` (not `"added piercing projectiles"`).
6. **Always verify build & type check before pushing:**
   - Agents **MUST** execute and verify locally:
     ```bash
     npm run typecheck
     npm run build
     ```
   - Do not push if either check fails. Fix all errors before proceeding.
7. **Push the branch to `origin`:**
   - Set the upstream tracking branch on first push: `git push -u origin <branch-name>`.
8. **Create a Pull Request targeting `main`:**
   - PR must target `main` (or the repository default branch, e.g., `master`).
   - Include a concise title, description of changes, and verification steps in the PR description.
9. **NEVER merge Pull Requests automatically:**
   - Agents must never auto-merge, squash-merge, or fast-forward merge PRs into `main`. Merging is strictly reserved for the human repository owner/reviewer.
10. **NEVER force-push (`--force` or `--force-with-lease`):**
    - Prohibited unless explicitly and directly commanded by the user in chat.
11. **Rebase if `main` updated while working:**
    - If the base branch advanced while developing, rebase the feature branch onto `origin/main` before pushing/finalizing:
      ```bash
      git fetch origin
      git rebase origin/main
      ```
    - Resolve any conflicts, re-run verification (`npm run build`), and verify clean state.
12. **Keep commits focused and atomic:**
    - Only stage and commit files related to the specific prompt/task.
    - Never include unrelated files, temporary editor files, or accidentally untracked artifacts.

---

## Step-by-Step Command Playbook for Agents

### Step 1: Detect Default Branch & Sync Upstream
Identify the base branch (`main` or `master`) and update local tracking:
```bash
# Check primary branch (default is main or master)
BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")

# Fetch latest from remote
git fetch origin

# Switch to base branch and pull latest changes
git checkout $BASE_BRANCH
git pull origin $BASE_BRANCH
```
*(On Windows PowerShell:)*
```powershell
git fetch origin
git checkout master # or main
git pull origin master
```

### Step 2: Create a Dedicated Feature Branch
Branch from the updated base:
```bash
# For a new feature
git checkout -b feature/altar-buff-system

# For a bug fix
git checkout -b fix/enemy-desync-on-chunk-unload

# For refactoring
git checkout -b refactor/binary-snapshot-serializer
```

### Step 3: Implement & Verify Locally
Make your changes, then run verification before staging:
```bash
# 1. Check TypeScript types
npm run typecheck

# 2. Verify Vite production build
npm run build
```

### Step 4: Stage & Commit (Conventional Commits)
Stage only relevant files:
```bash
git add src/world/Altar.ts src/combat/DamageNumberManager.ts
git commit -m "feat(world): add altar interaction buffs and visual indicators"
```

#### Commit Types:
| Prefix | Purpose | Example |
| :--- | :--- | :--- |
| `feat` | New capability or feature | `feat(drops): add automatic gem magnetic attraction` |
| `fix` | Bug fix or error resolution | `fix(net): resolve snapshot buffer overflow during peer disconnect` |
| `refactor`| Code change without behavioral difference | `refactor(entities): simplify enemy state machine transitions` |
| `perf` | Performance improvement | `perf(chunks): optimize spatial hash lookup for drop items` |
| `chore` | Maintenance, dependencies, config | `chore(ci): add build verification workflow` |
| `docs` | Documentation only | `docs: update architecture overview in docs/` |

### Step 5: Check for Upstream Divergence & Rebase
If `origin/main` has new commits:
```bash
git fetch origin
git rebase origin/main # or origin/master
```
If there are conflicts:
1. Resolve conflicts in files.
2. Re-run `npm run typecheck && npm run build`.
3. `git add <resolved-files>`
4. `git rebase --continue`

### Step 6: Push to Origin
```bash
git push -u origin feature/<name>
```

### Step 7: Create a Pull Request (Targeting `main` / `master`)
If the GitHub CLI (`gh`) is available:
```bash
gh pr create --base master --head feature/<name> --title "feat(world): add altar buffs" --body "### Summary of changes\n- Added altar interaction..."
```
If `gh` CLI is not installed, output the direct web comparison URL for the user to open and review:
```text
https://github.com/oneruit/roguelike-coop-game/compare/master...feature/<name>?expand=1
```

### Step 8: Complete Turn — Do Not Auto-Merge
- Inform the user that the branch has been pushed and provide the PR link.
- **Do not merge the PR.** Wait for user review and approval.

---

## CI/CD Automation

This repository runs automated GitHub Actions on every pull request and push to `main` and `master`:
- **Workflow**: `.github/workflows/ci.yml`
- **Checks performed**:
  - `npm ci`
  - `npm run typecheck` (`tsc --noEmit`)
  - `npm run build` (`tsc && vite build`)
  - Verification across Node.js versions (20.x, 22.x)
- Any failing checks will block PR merge. Agents must ensure all checks pass before concluding their work.
