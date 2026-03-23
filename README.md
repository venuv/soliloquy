# Soliloquy Master 🎭

Memorize Shakespeare's soliloquies through flashcard practice and voice-enabled testing.

## Features

- **34 Shakespeare Soliloquies** with logical chunk breakdowns
- **Lines or Beats** - Practice by half-line chunks or dramatic beats (actor's units of intention)
- **Memorize Mode** - Walk through chunks/beats sequentially, mark as mastered
- **Drill Mode** - Adaptive spaced repetition targeting weak spots
- **Test Mode** - Random prompts with voice input (Web Speech API) or typing
- **Recite Mode** - Full soliloquy recording with AI analysis (accuracy, fluency, dramatic coaching)
- **Beat Editor** - Adjust beat boundaries per-user; shared defaults generated via LLM
- **Coach** - Stanislavsky action notes: what the character is DOING + sensory anchors for key words
- **Progress Tracking** - Per-user analytics stored in JSON files, backed up to Tigris (S3)
- **Simple Auth** - Numeric token (no passwords), cookie fingerprinting for abuse detection

## Local Development

```bash
# Install all dependencies
npm run install:all

# Run development servers (client on :5173, server on :3001)
npm run dev
```

## Deploy to Fly.io

### First Time Setup

```bash
# Install flyctl if needed
brew install flyctl   # or: curl -L https://fly.io/install.sh | sh

# Login to Fly
fly auth login

# Create the app (from project root)
fly launch --no-deploy

# Create persistent volume for data (1GB should be plenty)
fly volumes create soliloquy_data --size 1 --region iad

# Create Tigris bucket for analytics backup
fly storage create soliloquy-analytics

# Set admin key for analytics access
fly secrets set ADMIN_KEY=your-secret-admin-key

# Deploy
fly deploy
```

### Subsequent Deploys

```bash
fly deploy
```

### Configuration

The `fly.toml` is already configured with:
- Always-on machine (autostop off, min 1 running)
- Persistent volume mounted at `/app/server/data/analytics`
- Tigris S3 backup for analytics (fire-and-forget sync + restore-on-startup)
- HTTPS enforcement
- 512MB shared CPU, region `iad`

### Admin Endpoints

All require `X-Admin-Key` header matching your `ADMIN_KEY` secret.

```bash
# Download all analytics as JSON (full blob — users, sessions, pageviews, progress)
curl -H "X-Admin-Key: your-secret" https://your-app.fly.dev/api/admin/download > analytics.json

# Pretty-print and explore with jq
curl -s -H "X-Admin-Key: your-secret" https://your-app.fly.dev/api/admin/download | jq '.users.analytics | keys'

# Get storage stats (file count, total size)
curl -H "X-Admin-Key: your-secret" https://your-app.fly.dev/api/admin/stats

# Cleanup old data (users inactive for 90+ days)
curl -X POST -H "X-Admin-Key: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"maxAgeDays": 90}' \
  https://your-app.fly.dev/api/admin/cleanup
```

#### Analytics Download Structure

The `/api/admin/download` endpoint returns:

```json
{
  "exportedAt": "2026-03-22T...",
  "users": {
    "keys": { ... },
    "analytics": {
      "<userKey>": {
        "sessions": [{ "timestamp", "authorId", "workId", "mode", "duration", "score" }],
        "pageviews": [{ "timestamp", "page", "workId" }],
        "progress": { "<authorId/workId>": { "chunks": { ... }, "mastered": true/false } },
        "attempts": [...],
        "recitations": [...]
      }
    }
  },
  "aggregates": { ... }
}
```

**What's tracked:**
- `sessions` — Memorize and Test mode practice (duration, score, chunks reviewed)
- `pageviews` — Visits to Reflect, Watch, Live, Muse, News pages
- `progress` — Per-work chunk mastery state
- `attempts` — Individual correct/incorrect answers
- `recitations` — Full recitation transcripts with drama coaching analysis

#### Offline Analysis Script

```bash
# Download and save locally
ADMIN_KEY="your-secret"
APP_URL="https://soliloquy-master.fly.dev"

curl -s -H "X-Admin-Key: $ADMIN_KEY" "$APP_URL/api/admin/download" > analytics-$(date +%Y%m%d).json

# Count users with sessions
cat analytics-*.json | jq '[.users.analytics | to_entries[] | select(.value.sessions | length > 0)] | length'

# List pageview distribution
cat analytics-*.json | jq '[.users.analytics[].pageviews[]?.page] | group_by(.) | map({page: .[0], count: length}) | sort_by(-.count)'

# Users by last activity
cat analytics-*.json | jq '.users.analytics | to_entries[] | {user: .key, sessions: (.value.sessions | length), pageviews: (.value.pageviews // [] | length), last: (.value.sessions[-1]?.timestamp // "never")}'
```

## Data Structure

```
/data
  /analytics
    {userKey}.json    # Per-user: sessions, progress, attempts
  /authors
    shakespeare.json  # Works and chunks
  keys.json          # User keys + fingerprints
```

## Adding Video Performances

Use the `add-video` script to add YouTube performances to the corpus:

```bash
# Interactive - prompts for soliloquy, performer, etc.
node scripts/add-video.mjs https://youtube.com/watch?v=VIDEO_ID

# With flags - no prompts, auto-ship
node scripts/add-video.mjs VIDEO_ID \
  --soliloquy=to-be-or-not-to-be \
  --performer="Kenneth Branagh" \
  --title="Hamlet Film" \
  --duration="4:15" \
  --ship
```

Run without arguments to see available soliloquy IDs:
```bash
node scripts/add-video.mjs
```

See [scripts/README.md](scripts/README.md) for all utility scripts.

## Generating Beats

Beats are dramatic units that group lines by the character's active intention (Stanislavski method). They're generated via a two-pass LLM pipeline: a generator segments the soliloquy, then a Stanislavski-trained critic verifies actioning, boundaries, and proportions.

```bash
# Generate beats for a single soliloquy
GROQ_API_KEY=your-key node scripts/generate-beats.mjs to-be-or-not-to-be

# Generate for all soliloquies that don't have beats yet
GROQ_API_KEY=your-key node scripts/generate-beats.mjs --all

# Preview without saving
GROQ_API_KEY=your-key node scripts/generate-beats.mjs --all --dry-run
```

Beats are saved as shared defaults in `shakespeare.json`. Individual users can customize beat boundaries via the Beat Editor in the UI — their overrides are stored in their own analytics file and don't affect other users.

## Adding Authors/Works

Create a new JSON file in `server/data/authors/`:

```json
{
  "id": "rilke",
  "name": "Rainer Maria Rilke",
  "subtitle": "Bohemian-Austrian Poet",
  "portrait": "📜",
  "works": [
    {
      "id": "archaic-torso",
      "title": "Archaic Torso of Apollo",
      "source": "New Poems",
      "character": "",
      "act": "1908",
      "chunks": [
        { "front": "We cannot know his legendary head", "back": "with eyes like ripening fruit." },
        ...
      ],
      "beats": [
        { "id": 0, "label": "Encounter", "intention": "To confront the sculpture's power", "startChunk": 0, "endChunk": 3 },
        ...
      ]
    }
  ]
}
```

Beats are optional in the data file — if omitted, they can be generated later via the CLI or the "Generate Beats" button in the UI (requires `GROQ_API_KEY`).

## Adding Plays (Batch)

```bash
# Add all soliloquies from a play file (with optional beats)
node scripts/add-play.mjs hamlet
```

Play files live in `scripts/plays/{name}.json`. Beats in play files are validated for contiguity and full chunk coverage.

## Corpus Manager (Python)

Interactive CLI for searching, adding, and managing soliloquies:

```bash
# Search for soliloquies from a play
python scripts/corpus-manager.py search othello

# List all soliloquies (or filter by play)
python scripts/corpus-manager.py list
python scripts/corpus-manager.py list --play hamlet

# Add a soliloquy interactively (fetch → extract → chunk → save → generate beats)
GROQ_API_KEY=your-key python scripts/corpus-manager.py add
```

The `add` command walks through:
1. Select play and candidate soliloquy
2. Fetch text from MIT Shakespeare
3. Review extracted speech
4. Auto-chunk at caesura (natural line breaks)
5. Save to `shakespeare.json`
6. Generate Stanislavski beats via Groq LLM

Supported plays: Othello, Midsummer Night's Dream, Winter's Tale, Measure for Measure, Antony & Cleopatra, and more.

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite + Tailwind CSS
- **Storage**: JSON files on persistent volume + Tigris S3 backup
- **Voice**: Web Speech API (browser-native)
