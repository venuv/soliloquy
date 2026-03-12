# Soliloquy - Rules for Claude

## Deployment

- **NEVER run `fly deploy` directly.** All deployments must go through the `/ship` skill.
- Do not deploy uncommitted changes. Code must be committed and pushed to `origin/main` before deploying.

## Beats Mode

- Beats mode sets `chunk = null`. Any code touching chunks in beats mode must resolve chunks from `beat.startChunk`/`beat.endChunk`.
- Word pictures (mnemonics) are indexed by chunk index, not beat index.

## Videos

- Use `node scripts/add-video.mjs` to add YouTube performances — do not manually edit data files.
- YouTube clips use `videoId: "youtube-XXX"` in data files but `youtubeId: "XXX"` in GetInspired.jsx. Always handle both formats.

## Build

- If Vite changes don't appear in the bundle, clear `client/node_modules/.vite` and `client/dist/` before rebuilding.
