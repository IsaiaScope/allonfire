# /allonfire-deploy Command — Design Spec

**Date:** 2026-04-04
**Status:** Draft

## Problem

Deploying changes through the 3-tier cascade (feature -> dev -> test -> prod) is a manual, multi-step process: push the branch, create a PR to dev, wait for CI, merge, create a PR to test, wait, merge, create a PR to prod, wait, merge. Each step requires checking CI status, writing PR descriptions, and handling failures. This is tedious and error-prone.

## Solution

A Claude Code slash command `/allonfire-deploy` that automates the entire cascade from the current feature branch to a target environment (default: prod). It handles committing, pushing, PR creation, CI polling, auto-merging, and failure diagnosis.

## Invocation

```
/allonfire-deploy          # asks target, default prod
/allonfire-deploy prod     # full cascade to prod
/allonfire-deploy test     # cascade up to test only
/allonfire-deploy dev      # push + PR to dev only
```

**File location:** `/Users/isaia/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/commands/allonfire-deploy.md`

## Cascade Pipeline

### Pre-flight Checks

1. Detect current branch — must be a feature/fix branch (not dev, test, or prod)
2. Resolve target from args (default: prod)
3. Verify `gh` CLI is authenticated

### Step 1: Commit & Push Feature Branch

- Check `git status` for uncommitted changes
- If changes exist: stage relevant files, commit with descriptive message, push
- If clean but unpushed commits: push
- If branch has no remote tracking: `git push -u origin <branch>`

### Step 2: Feature -> Dev PR

- Check for existing PR: `gh pr list --head <branch> --base dev --json number`
- If none: create PR with verbose body (see PR Body Format below)
- Poll CI: `gh pr checks <number> --watch`
- On pass: `gh pr merge <number> --merge --delete-branch`
- On fail: diagnose and stop (see Failure Handling)
- **Stop here if target is `dev`**

### Step 3: Dev -> Test Promotion

- `git fetch origin` to sync
- Create PR: base=test, head=dev
- Title: `chore(cascade): promote dev to test`
- Body: changelog of commits since last test merge
- Poll CI, auto-merge on pass
- **Stop here if target is `test`**

### Step 4: Test -> Prod Promotion

- Create PR: base=prod, head=test
- Title: `chore(cascade): promote test to prod`
- Body: full changelog since last prod merge
- Poll CI (includes ci-prod-gate verification), auto-merge on pass
- Report success with links to all created/merged PRs

## PR Body Format

### Feature -> Dev

```markdown
## Summary
[Generated from branch commit messages — what changed and why]

## Technical Details
[Files changed, grouped by domain/feature area. Key implementation decisions.]

## Testing
CI pipeline: lint, types, tests, build — all passing.
```

### Promotion PRs (dev->test, test->prod)

```markdown
## Summary
Promotes changes from {source} to {target}.

### Changes included
- {short hash} {commit message}
- {short hash} {commit message}
...

## Technical Details
{Aggregated summary of file changes across all included commits}

## Testing
CI pipeline verified on {source} branch. All checks passing.
```

## CI Failure Handling

When any CI check fails:

1. Identify which check failed: `gh pr checks <number>`
2. Get failed run: `gh run list --branch <branch> --status failure --limit 1`
3. Read logs: `gh run view <run-id> --log-failed`
4. Analyze and report:
   - Which job failed (lint-types, test, build)
   - The specific error message
   - Suggested fix
5. Stop cascade — user fixes the issue and re-runs `/allonfire-deploy`

## Command File Structure

The command follows the commit-commands plugin pattern:

```yaml
---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git branch:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git fetch:*), Bash(gh pr:*), Bash(gh run:*), Bash(gh auth:*), AskUserQuestion
description: Deploy through the cascade pipeline (feature -> dev -> test -> prod)
---
```

The command body contains:
- Context gathering (git status, current branch, existing PRs)
- Step-by-step instructions for each cascade stage
- PR body templates
- Failure diagnosis instructions

## Constraints

- Never force-push or use destructive git operations
- Never merge to prod from anything other than test (enforced by ci-prod-gate anyway)
- Always wait for CI to pass before merging — never skip checks
- If already on dev/test/prod, refuse to run and explain why
- The command must complete all operations using tool calls (Bash with git/gh)
