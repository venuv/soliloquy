# Scripts

Utility scripts for managing the Soliloquy corpus.

## add-video.mjs

Add a YouTube video performance to the corpus. Updates all three data sources (video-clips.json, segment-timestamps.json, GetInspired.jsx).

```bash
# Interactive mode - prompts for details
node scripts/add-video.mjs https://youtube.com/watch?v=0178jo7Mka0

# With flags - no prompts
node scripts/add-video.mjs https://youtube.com/watch?v=0178jo7Mka0 \
  --soliloquy=all-the-worlds-a-stage \
  --performer="Benedict Cumberbatch" \
  --title="The Seven Ages of Man" \
  --duration="3:30" \
  --ship

# Just the video ID works too
node scripts/add-video.mjs 0178jo7Mka0 --soliloquy=to-be-or-not-to-be --performer="Actor Name"
```

**Options:**
- `--soliloquy=ID` - Soliloquy ID (run without args to see full list)
- `--performer=NAME` - Performer name
- `--title=TITLE` - Production/video title
- `--duration=TIME` - Duration (e.g., "3:30")
- `--ship` - Commit, push to main, and deploy to fly.io

## yt-scraper.mjs

Scrape YouTube for Shakespeare performance videos. Uses youtube-sr library.

```bash
node scripts/yt-scraper.mjs
```

Results saved to `tmp/yt-results.json`.

## rechunk-by-verse.mjs

Re-chunk soliloquies by verse line (iambic pentameter) for more natural memorization flow.

```bash
node scripts/rechunk-by-verse.mjs
```

## find-videos.mjs / find-videos2.mjs

Search Internet Archive for Shakespeare film performances.

```bash
node scripts/find-videos.mjs
```

## verify-youtube.mjs / verify-scraped.mjs / bulk-verify.mjs

Verify that YouTube video IDs are still valid and accessible.

```bash
node scripts/verify-youtube.mjs
node scripts/bulk-verify.mjs
```

## add-play.mjs

Add a new Shakespeare play/work to the corpus.

```bash
node scripts/add-play.mjs
```

## Data Files Modified

| Script | video-clips.json | segment-timestamps.json | GetInspired.jsx | shakespeare.json |
|--------|-----------------|------------------------|-----------------|------------------|
| add-video.mjs | ✓ | ✓ | ✓ | - |
| add-play.mjs | - | - | - | ✓ |
| rechunk-by-verse.mjs | - | - | - | ✓ |
