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

### Phase 1: File Selection, Commit & Push Feature Branch

1. Check the git status from context above.
2. If there are NO uncommitted changes (nothing staged, nothing unstaged), skip to step 6.
3. **Ask which files to include in the deploy.** Use AskUserQuestion with multiSelect: true. List ALL changed files — both staged and unstaged — as options. Default recommendation: select ALL of them. Label each file with its status (staged/unstaged) so the user can see. Example option labels: `"apps/laura/src/foo.ts (staged)"`, `"apps/laura/src/bar.tsx (unstaged)"`. The user can deselect files they don't want to deploy yet.
4. **Analyze the selected files for logical grouping.** Review the diffs of the selected files and determine if they contain multiple distinct logical changes (e.g., a bug fix AND a separate UI tweak AND a refactor). If they do, split into **2–3 commits maximum**, each grouping related files. If all changes are part of a single logical unit, use a single commit.
   - For each commit:
     - Stage only the files belonging to that logical group with `git add` (be specific, never use `git add -A`)
     - Create a commit with a descriptive message following the repo's commit style (check recent commits from context)
     - Include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` in the commit message
   - Do NOT create more than 3 commits. If changes span many concerns, group the smaller ones together.
5. If only one logical change exists across all selected files, create a single commit.
6. If the branch has no upstream tracking (see context), push with: `git push -u origin <branch>`
7. If the branch has upstream but unpushed commits, push with: `git push`
8. If everything is already pushed, skip to Phase 2.

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
   gh pr merge <pr-number> --merge
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
