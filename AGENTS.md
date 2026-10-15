# Agent Git Workflow

This document defines the agile Git workflow for AI agents contributing to this repository, optimized for a fast-moving core team of up to 3 developers.

---

## 1. Core Philosophy & Branches

To prevent unnecessary overhead, ceremony, and context switching for small teams, everyday tasks use **Trunk-Based Development** on the `development` branch with strict automated verification gates.

* **`development`** — primary active development branch.
  - **Routine tasks** (bug fixes, balance tuning, UI enhancements, component refactoring, standard features): agents commit and push **directly to `development`** once all verification gates pass. No pull request or manual web UI approval required for routine work.
* **`master`** — production/release branch.
  - **Agents must never commit or push directly to `master`.**
  - Releases from `development` into `master` are strictly developer-controlled.
* **`feature/*` or `spike/*`** — reserved exclusively for:
  - Multi-day, high-risk architectural overhauls (e.g. replacing the network stack).
  - Experimental spikes where the developer explicitly instructs: *"Create a separate feature branch and PR"*.

---

## 2. Mandatory Rules

1. **Synchronize First**: Always pull the latest `origin/development` before writing code.
2. **Never Touch `master` Directly**: Only developers perform release merges (`development → master`).
3. **Never Force-Push**: `--force` and `--force-with-lease` are strictly forbidden on shared branches.
4. **Mandatory Verification Gate**:
   - Before committing or pushing, all verification commands must pass with zero errors:
     1. `npm run index` (refresh symbol index & cache)
     2. `npm run typecheck` (TypeScript compile check)
     3. `npm run build` (game client production build)
     4. `npm run build:admin` (admin panel production build)
     5. `npm test` (automated test suite)
   - If any check fails, do **NOT** push. Fix the issues immediately.
5. **Conventional Commits**: Write clear, structured commit messages (`feat(...)`, `fix(...)`, `refactor(...)`, `chore(...)`, `test(...)`).
6. **Rollback Protocol**: If a change needs to be reverted after pushing, always use `git revert`. Never rewrite pushed git history.
7. **Bug Fixing & Reporting**: If a defect or unexpected error is encountered, fix it immediately and report it clearly. See [`.agents/rules/bug-handling.md`](.agents/rules/bug-handling.md).
8. **Modular Architecture**: All code, UI, and assets must adhere to modularity standards. See [`.agents/rules/modular-architecture.md`](.agents/rules/modular-architecture.md).
9. **Documentation Language**: All documentation, architecture specifications, skills, rules, prompts, guides, and markdown files must be written in English. See [`.agents/rules/documentation-language.md`](.agents/rules/documentation-language.md).
10. **Image Generation Approval**: Mandatory human approval for generated visual assets. See [`.agents/rules/image-generation-approval.md`](.agents/rules/image-generation-approval.md).

---

## 3. Routine Workflow (Direct to `development`)

### Step 1. Synchronize
```powershell
git switch development
git pull origin development
```

### Step 2. Implement
Make only the changes required for the assigned task. Preserve unrelated code and existing comments.

### Step 3. Verify
Run the complete verification pipeline:
```powershell
npm run index
npm run typecheck
npm run build
npm run build:admin
npm test
```
All commands must exit with code `0`. Fix all errors before continuing.

#### Entity & Admin Panel Synchronization Checklist
When adding or modifying playable characters, weapons, enemies, or bosses:
- **Default Balance**: Always register new entities in `game/src/balance/defaultBalance.ts` (`DEFAULT_BALANCE`).
- **Admin Panel Assets**: Ensure textures and chart colors are registered in `admin/src/constants.ts`.
- **Symbol Index**: Refresh the symbol index via `npm run index`.
- **Admin Build**: Verify `npm run build:admin` succeeds.
- Full details: see [`.agents/rules/entity-admin-sync.md`](.agents/rules/entity-admin-sync.md).

### Step 4. Commit
Stage and commit changes using Conventional Commits:
```powershell
git add -A
git commit -m "feat(combat): implement projectile piercing"
```

### Step 5. Push Directly
```powershell
git push origin development
```

### Step 6. Report Result
Summarize the changes made, verification results, and any relevant notes to the developer.

---

## 4. Rollback & Revert Protocol

When a change is undesirable or needs to be undone:

### A. Local Changes (Not Yet Pushed)
```powershell
# Discard all unstaged and staged working tree modifications:
git restore .

# Discard the last local commit if already committed:
git reset --hard HEAD~1
```

### B. Pushed Changes on `development` (Team-Safe Rollback)
Never use `git push --force`. Create a clean revert commit:
```powershell
# 1. Identify the commit hash:
git log -3 --oneline

# 2. Revert the commit cleanly:
git revert <commit-hash> --no-edit

# 3. Verify and push the revert:
npm run build
git push origin development
```

### C. Asking the AI Agent to Rollback
Developers can simply instruct the agent:
> *"Revert the last change and push to development"*
> or
> *"Rollback commit `<hash>`"*

The agent will locate the commit, execute `git revert`, run the verification gate, and push the rollback commit.

---

## 5. Large Feature / PR Workflow (Exception Case)

For experimental spikes or multi-day disruptive refactors where isolated review is explicitly requested:

```powershell
git switch development
git pull origin development
git switch -c feature/<feature-name>

# Implement & Verify
npm run index
npm run typecheck
npm run build
npm run build:admin
npm test

# Commit & Push
git add -A
git commit -m "feat(module): description"
git push -u origin feature/<feature-name>

# Create PR
gh pr create --base development --head feature/<feature-name> --title "feat(module): description" --body "Automated PR."
```
Once approved, the developer or agent merges the PR into `development`.

---

## 6. Release Workflow (`development → master`)

Promotion from `development` to `master` represents a production release and is strictly performed manually by developers:

```powershell
git switch master
git pull origin master
git merge --no-ff development
git push origin master
```
Agents must **never** push or merge directly to `master`.
