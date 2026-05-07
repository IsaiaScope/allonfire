# /allonfire-deploy Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `/allonfire-deploy` slash command that automates the feature -> dev -> test -> prod cascade with CI polling, auto-merging, and failure diagnosis.

**Architecture:** A single Claude Code project command file (`.md`) that orchestrates git and GitHub CLI operations through a multi-stage cascade pipeline. The command asks for a target environment, then sequentially commits/pushes, creates PRs, polls CI, merges, and promotes through each stage. On CI failure it reads logs and diagnoses.

**Tech Stack:** Claude Code slash commands, `git` CLI, `gh` CLI, GitHub Actions CI

---

## File Map

- **Create:** `/Users/isaia/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/commands/allonfire-deploy.md` — The slash command file

That's it. Single file. The command is self-contained markdown with embedded context-gathering commands.

---

### Task 1: Create the project commands directory

**Files:**
- Create: `/Users/isaia/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/commands/` (directory)

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/isaia/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/commands
```

- [ ] **Step 2: Verify**

```bash
ls -la /Users/isaia/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/commands/
```

Expected: Empty directory exists.

---

### Task 2: Write the /allonfire-deploy command file

**Files:**
- Create: `/Users/isaia/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/commands/allonfire-deploy.md`

This is the core task. The command file must include:
1. YAML front matter with allowed-tools and description
2. Context section with embedded shell commands (using `!` backtick syntax)
3. Full cascade pipeline instructions
4. PR body templates
5. CI failure diagnosis instructions

- [ ] **Step 1: Write the command file**

Write the following content to `/Users/isaia/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/commands/allonfire-deploy.md`:

````markdown
---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git branch:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git fetch:*), Bash(gh pr:*), Bash(gh run:*), Bash(gh auth:*), AskUserQuestion
description: Deploy through the cascade pipeline (feature -> dev -> test -> prod)
---

## Context

- Current branch: !`git branch --show-current`
- Git status: !`git status`
- Staged + unstaged changes: !`git diff HEAD`
- Recent commits on this branch (not on dev): !`git log origin/dev..HEAD --oneline 2>/dev/null || echo "No commits ahead of dev"`
- Existing PRs from this branch: !`gh pr list --head $(git branch --show-current) --json number,title,baseRefName,state --jq '.[] | "\(.number) \(.title) [\(.baseRefName)] \(.state)"' 2>/dev/null || echo "No existing PRs"`
- Remote tracking: !`git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "No upstream tracking branch"`

## Your task

You are the AllOnFire deploy pipeline. You orchestrate the cascade: **feature branch -> dev -> test -> prod**.

### Phase 0: Pre-flight

1. Read the current branch from context above. If it is `dev`, `test`, or `prod`, STOP immediately and tell the user: "Cannot deploy from branch '{branch}'. Switch to a feature or fix branch first."
2. Verify gh is authenticated: run `gh auth status`. If it fails, STOP and tell the user to run `gh auth login`.
3. Use AskUserQuestion to ask the user where they want to deploy. Present these options:
   - **prod (Recommended)** — Full cascade: feature -> dev -> test -> prod
   - **test** — Partial cascade: feature -> dev -> test
   - **dev** — Push and merge to dev only

### Phase 1: Commit & Push Feature Branch

1. Check the git status from context above.
2. If there are uncommitted changes:
   - Run `git status` to see what changed
   - Run `git diff HEAD` to review changes
   - Stage relevant files with `git add` (be specific, do not use `git add -A`)
   - Create a commit with a descriptive message following the repo's commit style (check recent commits from context)
   - Include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` in the commit message
3. If the branch has no upstream tracking (see context), push with: `git push -u origin <branch>`
4. If the branch has upstream but unpushed commits, push with: `git push`
5. If everything is already pushed, skip to Phase 2.

### Phase 2: Feature -> Dev PR

1. Check if a PR already exists from context above.
   - If a PR exists targeting `dev`, use that PR number.
   - If a PR exists targeting a different base, STOP and tell the user.
   - If no PR exists, create one (see below).

2. To create the PR, first gather info:
   - Run `git log origin/dev..HEAD --oneline` to get commit list
   - Run `git diff origin/dev --stat` to get files changed summary

3. Create the PR:
   ```
   gh pr create --base dev --head <branch> --title "<type>(<scope>): <description>" --body "$(cat <<'EOF'
   ## Summary
   <Generate from commit messages — explain what changed and why>

   ## Technical Details
   <List files changed grouped by domain. Note key implementation decisions.>

   ## Testing
   CI pipeline will verify: lint, type-check, tests, build.
   EOF
   )"
   ```
   - The title should follow the branch naming: `fix/quiz-create-new-question` -> `fix(quiz): create new question`
   - The body must be verbose and descriptive.

4. Poll CI checks:
   ```
   gh pr checks <pr-number> --watch
   ```
   This blocks until all checks complete or fail.

5. If checks PASS: merge the PR:
   ```
   gh pr merge <pr-number> --merge --delete-branch
   ```

6. If checks FAIL: go to **Failure Diagnosis** section below.

7. If the deploy target is `dev`, STOP here and report success with the PR link.

### Phase 3: Dev -> Test Promotion

1. Fetch latest: `git fetch origin`
2. Get the changelog for the PR body:
   ```
   git log origin/test..origin/dev --oneline
   ```
3. Get file change summary:
   ```
   git diff origin/test..origin/dev --stat
   ```
4. Create the promotion PR:
   ```
   gh pr create --base test --head dev --title "chore(cascade): promote dev to test" --body "$(cat <<'EOF'
   ## Summary
   Promotes latest changes from `dev` to `test` for staging verification.

   ### Changes included
   <Insert the git log output as a bullet list: - {hash} {message}>

   ## Technical Details
   <Insert the git diff --stat output showing files changed>

   ## Testing
   All changes passed CI on `dev`. This PR runs the full CI suite again on `test`.
   EOF
   )"
   ```

5. Poll CI: `gh pr checks <pr-number> --watch`

6. If checks PASS: `gh pr merge <pr-number> --merge`

7. If checks FAIL: go to **Failure Diagnosis** section below.

8. If the deploy target is `test`, STOP here and report success with PR links.

### Phase 4: Test -> Prod Promotion

1. Fetch latest: `git fetch origin`
2. Get the full changelog:
   ```
   git log origin/prod..origin/test --oneline
   ```
3. Get file change summary:
   ```
   git diff origin/prod..origin/test --stat
   ```
4. Create the promotion PR:
   ```
   gh pr create --base prod --head test --title "chore(cascade): promote test to prod" --body "$(cat <<'EOF'
   ## Summary
   Promotes verified changes from `test` to `prod` for production deployment.

   ### Changes included
   <Insert the git log output as a bullet list: - {hash} {message}>

   ## Technical Details
   <Insert the git diff --stat output showing files changed>

   ## Testing
   All changes passed CI on both `dev` and `test`. The `ci-prod-gate` workflow verifies the source branch is `test`.
   EOF
   )"
   ```

5. Poll CI (includes ci-prod-gate): `gh pr checks <pr-number> --watch`

6. If checks PASS: `gh pr merge <pr-number> --merge`

7. If checks FAIL: go to **Failure Diagnosis** section below.

8. Report final success with links to ALL PRs created/merged during this deploy.

### Failure Diagnosis

When CI fails at any stage:

1. Identify which checks failed:
   ```
   gh pr checks <pr-number>
   ```

2. Find the failed workflow run:
   ```
   gh run list --branch <branch> --status failure --limit 1 --json databaseId,name,conclusion --jq '.[0]'
   ```

3. Read the failed logs:
   ```
   gh run view <run-id> --log-failed
   ```

4. Analyze the output and report to the user:
   - Which job failed (lint-types, test, build, verify-source)
   - The specific error message or test failure
   - A suggested fix (e.g., "Type error in apps/laura/src/features/games/components/quiz-form.tsx:42 — property 'x' does not exist on type 'Y'. Fix: add the missing property to the interface.")
   - The PR link so the user can see the status

5. STOP the cascade. Tell the user to fix the issue and re-run `/allonfire-deploy`.

### Final Report

When the cascade completes successfully, provide a summary:

```
Deploy complete to {target}!

PRs created/merged:
- #{number}: {title} ({base}) — {link}
- #{number}: {title} ({base}) — {link}
- #{number}: {title} ({base}) — {link}

All CI checks passed. Changes are now live on {target}.
```
````

- [ ] **Step 2: Verify the file was created correctly**

```bash
cat /Users/isaia/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/commands/allonfire-deploy.md | head -5
```

Expected output:
```
---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git branch:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git fetch:*), Bash(gh pr:*), Bash(gh run:*), Bash(gh auth:*), AskUserQuestion
description: Deploy through the cascade pipeline (feature -> dev -> test -> prod)
---
```

---

### Task 3: Test the command is discoverable

- [ ] **Step 1: Verify Claude Code recognizes the command**

Start a new Claude Code session (or reload) and check that `/allonfire-deploy` appears in the slash command list. You can verify by running:

```bash
ls /Users/isaia/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/commands/allonfire-deploy.md
```

The file must exist and have valid YAML front matter.

- [ ] **Step 2: Dry-run validation**

Invoke `/allonfire-deploy` in Claude Code. It should:
1. Show the context section populated with real git data
2. Ask which target to deploy to (prod/test/dev)
3. After selecting, begin the cascade pipeline

If the command does not appear, check:
- The directory path is correct
- The YAML front matter is valid (no syntax errors)
- Claude Code has been reloaded

---

### Task 4: Commit the spec and plan docs

- [ ] **Step 1: Stage and commit the documentation**

```bash
git add docs/superpowers/specs/2026-04-04-allonfire-deploy-command-design.md docs/superpowers/plans/2026-04-04-allonfire-deploy-command.md
git commit -m "docs: add /allonfire-deploy command spec and implementation plan

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
