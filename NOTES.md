## Verse-Line Chunking

**Script**: `scripts/rechunk-by-verse.mjs`

Soliloquies are chunked by natural verse lines (one line = one card) rather than arbitrary word counts. This matches how Shakespeare is recited.

**Completed**: to-be-or-not-to-be, tomorrow-and-tomorrow, coriolanus-banishment
**Remaining**: ~29 soliloquies need verse sources added to the script

## Mnemonic Generation

**Model**: `llama-3.1-8b-instant` (fast) via Groq API
**Output**: 5-10 word thumbnail mnemonics using sound-alike images
**Example**: "whether" → WEATHER, "slings" → SLINGSHOT, "suffer" → SURFING

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
