# Soliloquy Master 🎭

Memorize Shakespeare's soliloquies through flashcard practice and voice-enabled testing.

## Features

- **25 Shakespeare Soliloquies** with logical chunk breakdowns
- **Memorize Mode** - Walk through chunks sequentially, mark as mastered
- **Test Mode** - Random prompts with voice input (Web Speech API) or typing
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
      ]
    }
  ]
}
```

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite + Tailwind CSS
- **Storage**: JSON files on persistent volume
- **Voice**: Web Speech API (browser-native)
