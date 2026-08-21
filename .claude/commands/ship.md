# Ship: Test, Commit, Push, Deploy, Verify

Project-scoped deployment pipeline for soliloquy-master.

Runs a local build gate, commits explicitly-named files, pushes to origin/main,
deploys to fly.io with the remote builder, and confirms the site is serving.

## Preflight

Before any state-changing step, verify:
1. `fly auth whoami` returns a user (if it errors, tell the user to `! fly auth login` or paste a `FlyV1 fm2_...` token to export as `FLY_API_TOKEN`)
2. `gh auth status` shows the `venuv` account as active (if not, run `gh auth switch --user venuv --hostname github.com`)

## Workflow

### 1. Inspect changes

- Run `git status` and `git log --oneline origin/main..HEAD` in parallel
- Show a short summary of modified files and unpushed commits to the user
- If there are no changes and no unpushed commits, tell the user "nothing to ship" and stop
- Look at `git diff --stat` — if any untracked files appear that shouldn't be committed (e.g. `.env`, credentials, large binaries, `node_modules/`, `dist/`), flag them and ask before proceeding

### 2. Local build gate

- Run `cd client && npm run build` (or `npm run build` from the project root, which does the same)
- If it fails, stop and show the vite error output. Do NOT proceed to commit or deploy — the same build runs inside the Docker container during `fly deploy`, and failing there wastes ~2 minutes
- If it succeeds, mention the bundle size briefly and move on

### 3. Stage and commit

- Stage explicit files by name based on `git status` output — do NOT use `git add -A` or `git add .` (risk of sweeping in secrets or build artifacts)
- Draft a commit message from the diff:
  - Subject line under 72 chars, describes the *why* not the *what*
  - Body paragraph (optional) with context
  - Trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Use a heredoc to pass the message so multiline formatting survives:
  ```
  git commit -m "$(cat <<'EOF'
  Subject line here
  
  Body if needed.
  
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

### 4. Push to main

- `git push origin main` — the `.claude/settings.local.json` in this repo pre-authorizes this exact command
- If the push fails due to remote changes: `git pull --rebase origin main && git push origin main`
- If the push fails due to auth (403), the user's `gh` is on the wrong account — see Preflight step 2

### 5. Deploy

- Run `fly deploy --remote-only` (uses the depot remote builder — no local Docker required)
- Wait for the build to finish and the machine to reach a good state (the CLI blocks until then)
- If the deploy errors, surface the specific failure and stop — do not retry blindly

### 6. Verify

- Curl the root: `curl -sS -o /dev/null -w "HTTP %{http_code} — %{time_total}s\n" https://soliloquy-master.fly.dev/`
- Expect `HTTP 200` and sub-second response
- Run `fly status -a soliloquy-master` and confirm the machine version bumped and state is `started`
- Report the deployed image ID and URL

## Output format

Report progress terse:
```
✓ preflight (fly ok, gh=venuv)
✓ local build ok (client bundle 371 kB)
✓ committed: "Add append-only funnel analytics + admin dashboard"
✓ pushed to origin/main
✓ deployed (image: deployment-01M0JGPY9B4ASY3GTKBHK1J5KJ, machine v84)
✓ live: HTTP 200 in 0.28s
```

## Error handling

- Any non-zero exit stops the pipeline immediately; report the error and where it happened
- Never skip pre-commit hooks (`--no-verify`); if they fail, investigate the underlying issue
- Never force-push (`git push --force`) — the pre-authorization in `.claude/settings.local.json` intentionally excludes force pushes
- After a failed deploy, do NOT attempt to `git reset` or roll back locally — investigate first and check with the user
