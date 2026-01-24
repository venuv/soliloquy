# Crab

> "The sourest-natured fetcher that lives"
> — Launce, *The Two Gentlemen of Verona*

Crab fetches and processes the complete MIT Shakespeare corpus, extracting soliloquies, notable speeches, and memorable snippets for the Morning Muse feature.

## What Crab Does

1. **Fetches** all 37 plays from the MIT Shakespeare archive
2. **Parses** HTML to extract character speeches
3. **Identifies** soliloquies (long solo speeches) and notable snippets
4. **Enriches** with LLM-generated metadata (emotion, themes, wisdom type)
5. **Outputs** `shakespeare-master.json` - a rich database for Morning Muse

## Usage

```bash
# Run the full pipeline (takes ~1 hour)
node crab.js

# Or run individual steps
node crab.js --fetch-only      # Just download plays
node crab.js --parse-only      # Parse already-fetched plays
node crab.js --enrich-only     # Add metadata to parsed quotes
```

## Output Schema

```json
{
  "id": "hamlet-3.1-to-be",
  "quote": "To be, or not to be, that is the question...",
  "full_text": "...(complete soliloquy)...",
  "character": "Hamlet",
  "play": "Hamlet",
  "play_type": "tragedy",
  "act": 3,
  "scene": 1,
  "line_count": 35,
  "character_situation": "Paralyzed by grief and indecision...",
  "emotions": ["doubt", "weariness", "anxiety"],
  "themes": ["mortality", "decision", "suffering", "action"],
  "outcome": "lived_with",
  "wisdom_types": ["validation", "perspective"],
  "tone": "contemplative"
}
```

## Named After

Crab, the dog from *The Two Gentlemen of Verona* - who fetches slowly but eventually delivers.
