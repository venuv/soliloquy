## Verse-Line Chunking

**Script**: `scripts/rechunk-by-verse.mjs`

Soliloquies are chunked by natural verse lines (one line = one card) rather than arbitrary word counts. This matches how Shakespeare is recited.

**Completed**: to-be-or-not-to-be, tomorrow-and-tomorrow, coriolanus-banishment
**Remaining**: ~29 soliloquies need verse sources added to the script

## Stanislavsky Action Notes (Coach Tab)

**Model**: `llama-3.3-70b-versatile` via Groq API
**Method**: Stanislavsky-based memorization coaching — replaces the old phonetic word-picture mnemonics.

Each line gets an **action note** with two parts:
- **Action**: What the character is actively DOING with the line (visceral, transitive verb — e.g., "Dare yourself to face the unknown")
- **Anchors**: 2-3 key words with the character's physical/sensory feeling at that moment (e.g., "slings" → sharp sting across the chest)

The LLM receives surrounding chunks for sequence context and is instructed to follow Stanislavsky's method of physical actions. Generated notes are stored per-user in their analytics file.

**Previous system** (removed): `llama-3.1-8b-instant` generating phonetic sound-alike images (e.g., "whether" → WEATHER). This was too trite to aid memorization.

## Tigris Analytics Backup

**Service**: Tigris (S3-compatible object storage via Fly.io)
**Bucket**: `soliloquy-analytics`
**Pattern**: Fire-and-forget sync — every local JSON write also PUTs to Tigris without blocking. On startup, server restores any missing local files from Tigris before accepting connections.

This decouples user data from machine lifecycle. If a Fly machine/volume is destroyed, analytics are preserved in Tigris and restored automatically on the next deploy.

**Key files**: `server/tigris.js` (S3 client), `server/persist.js` (writeAndSync wrapper)

---

## Image Stylization for UI

**Tool**: replicate.com  
**Model**: bytedance/seedream-4.5

**Effective prompts**:
- "change style to waxed, blotchy print. ed hopper style line drawing. black and white."
- "change style to stuccoed, block print. change colors to contemporary. durer style lines. frayed ripped edges"

**Use case**: Stylize production photos, venue images, historical images to match the landing page collage aesthetic (torn edges, vintage feel, sumi-e/Tufte coherence).

**Pages needing this treatment**:
- Live Performances (venue/production photos)
- Daily News (historical images, festival photos)
