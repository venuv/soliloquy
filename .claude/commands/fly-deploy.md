---
allowed-tools: Bash(git:*), Bash(fly:*), Bash(flyctl:*)
description: Pull latest from GitHub main and deploy to Fly.io
---

Pull the latest code from GitHub main branch and deploy to Fly.io.

Steps:
1. Fetch latest from origin
2. Checkout main branch
3. Pull latest changes
4. Run `fly deploy`

After deployment, confirm it succeeded and show the app URL.
