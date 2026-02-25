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
- **Word Pictures** - AI-generated phonetic mnemonics with memory palace rooms
- **Progress Tracking** - Per-user analytics stored in JSON files
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
fly volumes create soliloquy_data --size 1 --region ord

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
- Auto-stop/start machines (cost savings)
- Persistent volume mounted at `/app/server/data`
- HTTPS enforcement
- 256MB shared CPU (minimal tier)

### Admin Endpoints

All require `X-Admin-Key` header matching your `ADMIN_KEY` secret.

```bash
# Download all analytics
curl -H "X-Admin-Key: your-secret" https://your-app.fly.dev/api/admin/download > analytics.json

# Get storage stats
curl -H "X-Admin-Key: your-secret" https://your-app.fly.dev/api/admin/stats

# Cleanup old data (users inactive for 90+ days)
curl -X POST -H "X-Admin-Key: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"maxAgeDays": 90}' \
  https://your-app.fly.dev/api/admin/cleanup
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

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite + Tailwind CSS
- **Storage**: JSON files on persistent volume
- **Voice**: Web Speech API (browser-native)
