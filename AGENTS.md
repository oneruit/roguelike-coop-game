# Agent Git Workflow

This document defines the mandatory Git workflow for AI agents contributing to this repository.

## Branches

* `master` — stable/release branch. **Agents must never target or commit to `master`.**
* `development` — active development and testing branch. **All agent PRs must target `development`.**
* `feature/*` — new features and game systems.
* `fix/*` — bug fixes.
* `refactor/*` — refactoring without behavior changes.
* `chore/*` — tooling, dependencies, configuration.
* `docs/*` — documentation.
* `test/*` — tests.

## Mandatory Rules

1. One task = one dedicated branch.
2. Never commit directly to `master` or `development`.
3. Never force-push (`--force` / `--force-with-lease`).
4. Always synchronize with `origin/development` before starting work.
5. Agent PRs must always use `development` as the base branch.
6. Never automatically merge `development` into `master`.
7. `development → master` is a manual developer-controlled release.
8. If CI fails or a merge conflict occurs, stop and report the problem. Do not bypass checks or force a merge.

## Workflow

### 1. Synchronize

```powershell
git fetch origin
git switch development
git pull origin development
```

### 2. Create task branch

```powershell
git switch -c feature/<name>
```

Use the appropriate prefix: `feature`, `fix`, `refactor`, `chore`, `docs`, or `test`.

### 3. Implement

Make only the changes required for the assigned task.

Do not modify unrelated files or introduce unrelated changes.

### 4. Verify

Before committing, both commands must succeed:

```powershell
npm run typecheck
npm run build
```

Fix all errors before continuing.

### 5. Commit

Use Conventional Commits:

```text
feat(combat): add projectile piercing
fix(net): resolve enemy desync
refactor(world): simplify chunk manager
perf(net): optimize snapshot serialization
chore(ci): update build workflow
```

Keep commits focused on the current task.

### 6. Push

```powershell
git push -u origin <branch-name>
```

### 7. Create Pull Request

Immediately after pushing, create a PR targeting `development`.

```powershell
$BRANCH = git rev-parse --abbrev-ref HEAD
$TITLE = git log -1 --pretty=%s

$EXISTING = gh pr list `
  --head $BRANCH `
  --base development `
  --json number `
  --jq '.[0].number'

if (-not $EXISTING) {
    gh pr create `
      --base development `
      --head $BRANCH `
      --title $TITLE `
      --body "Automated PR created by AI agent."
}
```

### 8. Enable Auto-Merge

```powershell
gh pr merge $BRANCH --auto --merge
```

If repository settings do not allow merge commits:

```powershell
gh pr merge $BRANCH --auto --squash
```

Do not bypass required checks.

### 9. Result

If CI passes and the PR has no conflicts:

* The PR may automatically merge into `development`.
* Report the PR number and result to the developer.

If CI fails or conflicts occur:

* Stop immediately.
* Report the failing checks or conflicting files.
* Include the relevant error messages.
* Wait for developer instructions.

## Release

Agents must **never** promote `development` to `master`.

After developers have tested and approved the changes, they manually create and review:

```text
development → master
```

The release merge is controlled by the developers.
