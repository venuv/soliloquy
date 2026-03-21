#!/usr/bin/env python3
"""
Corpus Manager — Find, review, chunk, beat-generate, and add Shakespeare soliloquies.

Usage:
  python3 scripts/corpus-manager.py search "Othello"          # Find soliloquies in a play
  python3 scripts/corpus-manager.py list                       # List all soliloquies in corpus
  python3 scripts/corpus-manager.py list --play Hamlet         # List soliloquies from a play
  python3 scripts/corpus-manager.py add                        # Interactive add workflow
"""

import json
import re
import sys
import os
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
SHAKESPEARE_PATH = SCRIPT_DIR / "../server/data/authors/shakespeare.json"
MIT_BASE = "https://shakespeare.mit.edu"

# Play name -> MIT Shakespeare URL path
PLAY_URLS = {
    "a midsummer night's dream": "midsummer",
    "all's well that ends well": "allswell",
    "antony and cleopatra": "cleopatra",
    "as you like it": "asyoulikeit",
    "comedy of errors": "comedy_errors",
    "coriolanus": "coriolanus",
    "cymbeline": "cymbeline",
    "hamlet": "hamlet",
    "henry iv part 1": "1henryiv",
    "henry iv part 2": "2henryiv",
    "henry v": "henryv",
    "henry vi part 1": "1henryvi",
    "henry vi part 2": "2henryvi",
    "henry vi part 3": "3henryvi",
    "henry viii": "henryviii",
    "julius caesar": "julius_caesar",
    "king john": "john",
    "king lear": "lear",
    "love's labour's lost": "lll",
    "macbeth": "macbeth",
    "measure for measure": "measure",
    "merchant of venice": "merchant",
    "merry wives of windsor": "merry_wives",
    "much ado about nothing": "much_ado",
    "othello": "othello",
    "pericles": "pericles",
    "richard ii": "richardii",
    "richard iii": "richardiii",
    "romeo and juliet": "romeo_juliet",
    "taming of the shrew": "taming_shrew",
    "the tempest": "tempest",
    "the winter's tale": "winters_tale",
    "timon of athens": "timon",
    "titus andronicus": "titus",
    "troilus and cressida": "troilus_cressida",
    "twelfth night": "twelfth_night",
    "two gentlemen of verona": "two_gentlemen",
}

# Well-known soliloquies by play (curated candidates)
KNOWN_SOLILOQUIES = {
    "othello": [
        {
            "character": "Iago",
            "title": "And what's he then that says I play the villain?",
            "act": "Act 2, Scene 3",
            "description": "Iago justifies his manipulation of Cassio and Othello, revealing his philosophy that virtue is a mere fig.",
            "start_line": "And what's he then that says I play the villain?",
        },
        {
            "character": "Othello",
            "title": "It is the cause, it is the cause, my soul",
            "act": "Act 5, Scene 2",
            "description": "Othello steels himself to kill Desdemona, framing murder as justice. Agonizing tenderness and resolve.",
            "start_line": "It is the cause, it is the cause, my soul",
        },
        {
            "character": "Othello",
            "title": "Soft you; a word or two before you go",
            "act": "Act 5, Scene 2",
            "description": "Othello's final speech before suicide. He asks to be remembered as one who loved not wisely but too well.",
            "start_line": "Soft you; a word or two before you go",
        },
        {
            "character": "Iago",
            "title": "Thus do I ever make my fool my purse",
            "act": "Act 1, Scene 3",
            "description": "Iago's first major soliloquy. He reveals his hatred of Othello, suspects him with Emilia, and hatches his plan.",
            "start_line": "Thus do I ever make my fool my purse",
        },
    ],
    "a midsummer night's dream": [
        {
            "character": "Oberon",
            "title": "I know a bank where the wild thyme blows",
            "act": "Act 2, Scene 1",
            "description": "Oberon describes Titania's bower — one of Shakespeare's most beautiful nature passages.",
            "start_line": "I know a bank where the wild thyme blows",
        },
        {
            "character": "Puck",
            "title": "If we shadows have offended",
            "act": "Act 5, Scene 1",
            "description": "Puck's epilogue, breaking the fourth wall to ask the audience's forgiveness.",
            "start_line": "If we shadows have offended",
        },
        {
            "character": "Titania",
            "title": "These are the forgeries of jealousy",
            "act": "Act 2, Scene 1",
            "description": "Titania describes how her quarrel with Oberon has disordered the seasons and nature itself.",
            "start_line": "These are the forgeries of jealousy",
        },
    ],
    "the winter's tale": [
        {
            "character": "Leontes",
            "title": "Too hot, too hot!",
            "act": "Act 1, Scene 2",
            "description": "Leontes' jealousy erupts as he watches Hermione with Polixenes. The syntax breaks apart with his sanity.",
            "start_line": "Too hot, too hot!",
        },
        {
            "character": "Time",
            "title": "I, that please some, try all",
            "act": "Act 4, Scene 1",
            "description": "Time personified bridges the 16-year gap, one of Shakespeare's boldest theatrical devices.",
            "start_line": "I, that please some, try all",
        },
    ],
    "antony and cleopatra": [
        {
            "character": "Cleopatra",
            "title": "Give me my robe, put on my crown",
            "act": "Act 5, Scene 2",
            "description": "Cleopatra prepares for death with royal ceremony. She transforms suicide into triumph — 'I am fire and air.'",
            "start_line": "Give me my robe, put on my crown",
        },
        {
            "character": "Enobarbus",
            "title": "The barge she sat in, like a burnish'd throne",
            "act": "Act 2, Scene 2",
            "description": "Enobarbus describes Cleopatra's first meeting with Antony on the Cydnus — Shakespeare's most lavish descriptive passage.",
            "start_line": "The barge she sat in, like a burnish'd throne",
        },
        {
            "character": "Cleopatra",
            "title": "I dreamt there was an Emperor Antony",
            "act": "Act 5, Scene 2",
            "description": "Cleopatra eulogizes Antony after his death, elevating him to mythic proportions. His legs bestrid the ocean.",
            "start_line": "I dreamt there was an Emperor Antony",
        },
    ],
    "measure for measure": [
        {
            "character": "Isabella",
            "title": "To whom should I complain?",
            "act": "Act 2, Scene 4",
            "description": "Isabella recoils from Angelo's proposition — she must choose between her brother's life and her virtue.",
            "start_line": "To whom should I complain?",
        },
        {
            "character": "Claudio",
            "title": "Ay, but to die, and go we know not where",
            "act": "Act 3, Scene 1",
            "description": "Claudio's terrified meditation on death — the fear of the unknown after death.",
            "start_line": "Ay, but to die, and go we know not where",
        },
    ],
}


def load_corpus():
    with open(SHAKESPEARE_PATH) as f:
        return json.load(f)


def save_corpus(data):
    with open(SHAKESPEARE_PATH, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def list_corpus(play_filter=None):
    data = load_corpus()
    plays = {}
    for w in data["works"]:
        src = w["source"]
        if play_filter and play_filter.lower() not in src.lower():
            continue
        plays.setdefault(src, []).append(w)

    for play in sorted(plays):
        print(f"\n  {play}")
        for w in plays[play]:
            beats = len(w.get("beats", []))
            chunks = len(w.get("chunks", []))
            print(f"    {w['id']:40s} {w['character']:15s} {chunks:2d} chunks, {beats} beats")

    total = sum(len(v) for v in plays.values())
    print(f"\n  {len(plays)} plays, {total} soliloquies")


def fetch_play_text(play_key):
    """Fetch full play text from MIT Shakespeare."""
    url = f"{MIT_BASE}/{play_key}/full.html"
    print(f"  Fetching {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "CorpusManager/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_speech(html, start_line, character):
    """Extract a speech from MIT Shakespeare HTML given its opening line."""
    # Clean HTML to plain text while preserving structure
    # MIT format: <A NAME=speech##><b>CHARACTER</b></a> then lines in <A NAME=N.N.NN>text</a><br>
    text = html

    # Find the start line
    start_clean = start_line.strip().lower()
    # Search for the line in the HTML
    pos = text.lower().find(start_clean[:40])
    if pos == -1:
        # Try without punctuation
        start_nopunct = re.sub(r"[^a-z\s]", "", start_clean)
        text_nopunct = re.sub(r"[^a-z\s]", "", text.lower())
        pos = text_nopunct.find(start_nopunct[:40])
        if pos == -1:
            return None

    # Back up to find the speech start marker
    chunk_start = max(0, pos - 500)
    chunk_end = min(len(text), pos + 5000)
    region = text[chunk_start:chunk_end]

    # Extract lines from the region — look for text between tags
    # Strip HTML tags but preserve line breaks
    lines = []
    in_speech = False
    for line in region.split("\n"):
        stripped = re.sub(r"<[^>]+>", "", line).strip()
        if not stripped:
            continue

        # Check if we hit the start line
        if not in_speech:
            if start_clean[:30] in stripped.lower()[:40]:
                in_speech = True
                lines.append(stripped)
            continue

        # Check if another character starts speaking (all caps name pattern)
        if re.match(r"^[A-Z]{2,}$", stripped) or re.match(r"^[A-Z][A-Z ]+$", stripped):
            break

        # Stage directions — skip inline, break on exits/enters
        if stripped.startswith("[") or stripped.startswith("Exeunt") or stripped.startswith("Exit"):
            break
        if re.match(r"^Enter\s", stripped):
            break
        # Skip stage directions like "Kissing her", "Aside", "Drawing his sword"
        if re.match(r"^(Kissing|Drawing|Kneeling|Aside|Re-enter|Takes|Puts|Falls|Rises|Reads|Sings)\b", stripped):
            continue

        lines.append(stripped)

    return "\n".join(lines) if lines else None


def auto_chunk(text):
    """Split a soliloquy into front/back flashcard chunks at natural caesura points."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    chunks = []

    for line in lines:
        words = line.split()
        if len(words) <= 3:
            # Short line — use as single chunk
            mid = len(words) // 2 or 1
            chunks.append({
                "front": " ".join(words[:mid]),
                "back": " ".join(words[mid:])
            })
            continue

        # Find the best split point near the middle
        mid = len(words) // 2
        # Prefer splitting after punctuation near the middle
        best = mid
        best_score = 0
        for i in range(max(1, mid - 2), min(len(words) - 1, mid + 3)):
            word = words[i]
            score = 0
            if word.endswith((",", ";", ":", "!", "?", ".")):
                score += 3
            if word.endswith(("—", "--")):
                score += 2
            if abs(i - mid) == 0:
                score += 1
            if score > best_score:
                best_score = score
                best = i

        # If no punctuation found, just split at mid
        split_at = best + 1 if best_score > 0 else mid

        chunks.append({
            "front": " ".join(words[:split_at]),
            "back": " ".join(words[split_at:])
        })

    return chunks


def generate_beats(work_id):
    """Run the existing generate-beats.mjs script."""
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        print("  GROQ_API_KEY not set, skipping beat generation.")
        return False

    result = subprocess.run(
        ["node", str(SCRIPT_DIR / "generate-beats.mjs"), work_id],
        env={**os.environ, "GROQ_API_KEY": groq_key},
        capture_output=True, text=True, timeout=30
    )
    print(result.stdout)
    if result.returncode != 0:
        print(f"  Beat generation failed: {result.stderr}")
        return False
    return True


def make_id(title):
    """Generate a kebab-case ID from a title."""
    # Take first few significant words
    words = re.sub(r"[^a-z\s]", "", title.lower()).split()
    # Skip common words
    skip = {"the", "a", "an", "and", "or", "but", "is", "it", "to", "of", "my", "i", "that"}
    significant = [w for w in words if w not in skip][:5]
    if not significant:
        significant = words[:4]
    return "-".join(significant)


def search_play(play_name):
    """Search for soliloquies in a play."""
    play_lower = play_name.lower().strip()

    # Check corpus for existing entries
    data = load_corpus()
    existing = [w for w in data["works"] if play_lower in w["source"].lower()]
    if existing:
        print(f"\n  Already in corpus from this play:")
        for w in existing:
            print(f"    - {w['title']} ({w['character']}, {w['act']})")

    # Check curated list
    matched_key = None
    for key in KNOWN_SOLILOQUIES:
        if play_lower in key or key in play_lower:
            matched_key = key
            break

    if matched_key:
        candidates = KNOWN_SOLILOQUIES[matched_key]
        existing_titles = {w["title"].lower() for w in existing}

        new_candidates = []
        for c in candidates:
            if c["title"].lower() not in existing_titles:
                new_candidates.append(c)

        if not new_candidates:
            print(f"\n  All known soliloquies from this play are already in the corpus.")
            return []

        print(f"\n  Found {len(new_candidates)} candidate(s):\n")
        for i, c in enumerate(new_candidates):
            print(f"  [{i+1}] \"{c['title']}\"")
            print(f"      {c['character']}, {c['act']}")
            print(f"      {c['description']}")
            print()

        return new_candidates
    else:
        print(f"\n  No curated candidates for '{play_name}'.")
        print(f"  Known plays: {', '.join(sorted(KNOWN_SOLILOQUIES.keys()))}")
        return []


def interactive_add():
    """Interactive workflow to add a soliloquy."""
    play_name = input("\n  Play name: ").strip()
    if not play_name:
        return

    candidates = search_play(play_name)
    if not candidates:
        print("  No candidates to add. You can manually provide text below.")
        manual = input("  Paste soliloquy text? (y/n): ").strip().lower()
        if manual != "y":
            return
        character = input("  Character: ").strip()
        act = input("  Act/Scene (e.g. 'Act 3, Scene 1'): ").strip()
        print("  Paste the soliloquy text (empty line to finish):")
        lines = []
        while True:
            line = input()
            if not line:
                break
            lines.append(line)
        full_text = "\n".join(lines)
        title = lines[0][:50] if lines else "Untitled"
        selected = {"character": character, "act": act, "title": title, "start_line": lines[0] if lines else ""}
    else:
        choices = input("  Which to add? (numbers separated by commas, or 'all'): ").strip()
        if choices.lower() == "all":
            indices = list(range(len(candidates)))
        else:
            try:
                indices = [int(x.strip()) - 1 for x in choices.split(",")]
            except ValueError:
                print("  Invalid selection.")
                return

        for idx in indices:
            if idx < 0 or idx >= len(candidates):
                print(f"  Invalid index: {idx + 1}")
                continue
            add_candidate(play_name, candidates[idx])
        return

    # Manual path
    chunks = auto_chunk(full_text)
    work_id = make_id(title)

    print(f"\n  Preview:")
    print(f"    ID: {work_id}")
    print(f"    Title: {title}")
    print(f"    {len(chunks)} chunks:")
    for i, c in enumerate(chunks):
        print(f"      {i}: {c['front']} | {c['back']}")

    confirm = input("\n  Add to corpus? (y/n): ").strip().lower()
    if confirm != "y":
        print("  Cancelled.")
        return

    data = load_corpus()
    work = {
        "id": work_id,
        "title": title,
        "source": play_name,
        "character": selected["character"],
        "act": selected["act"],
        "chunks": chunks,
    }
    data["works"].append(work)
    save_corpus(data)
    print(f"  Added '{title}' ({len(chunks)} chunks)")

    # Generate beats
    beat_ok = generate_beats(work_id)
    if beat_ok:
        print(f"  Beats generated.")
    print(f"  Done! Now has {len(data['works'])} soliloquies.")


def add_candidate(play_name, candidate):
    """Add a curated candidate — fetch text, chunk, beat, save."""
    print(f"\n  Adding: \"{candidate['title']}\" ({candidate['character']})...")

    # Resolve play URL
    play_lower = play_name.lower().strip()
    play_key = None
    for key, val in PLAY_URLS.items():
        if play_lower in key or key in play_lower:
            play_key = val
            break

    if not play_key:
        print(f"  Can't find MIT URL for '{play_name}'. Known: {list(PLAY_URLS.keys())}")
        return

    # Fetch and extract
    html = fetch_play_text(play_key)
    speech_text = extract_speech(html, candidate["start_line"], candidate["character"])

    if not speech_text:
        print(f"  Could not extract speech text from MIT source.")
        print(f"  Paste the text manually (empty line to finish):")
        lines = []
        while True:
            line = input()
            if not line:
                break
            lines.append(line)
        speech_text = "\n".join(lines)
        if not speech_text:
            print("  Skipping.")
            return

    print(f"\n  Extracted text:")
    print(f"  ---")
    for line in speech_text.split("\n"):
        print(f"  {line}")
    print(f"  ---")

    ok = input("\n  Text looks right? (y/n/edit): ").strip().lower()
    if ok == "n":
        print("  Skipping.")
        return
    if ok == "edit":
        print("  Paste corrected text (empty line to finish):")
        lines = []
        while True:
            line = input()
            if not line:
                break
            lines.append(line)
        speech_text = "\n".join(lines)

    # Chunk it
    chunks = auto_chunk(speech_text)
    work_id = make_id(candidate["title"])

    # Check for duplicate ID
    data = load_corpus()
    existing_ids = {w["id"] for w in data["works"]}
    if work_id in existing_ids:
        work_id = work_id + "-" + candidate["character"].lower().replace(" ", "-")

    print(f"\n  {len(chunks)} chunks:")
    for i, c in enumerate(chunks):
        print(f"    {i}: {c['front']} | {c['back']}")

    confirm = input("\n  Add to corpus? (y/n): ").strip().lower()
    if confirm != "y":
        print("  Cancelled.")
        return

    # Determine proper play title
    play_title = play_name.title()
    # Use existing source name if we have works from this play
    for w in data["works"]:
        if play_lower in w["source"].lower():
            play_title = w["source"]
            break

    work = {
        "id": work_id,
        "title": candidate["title"],
        "source": play_title,
        "character": candidate["character"],
        "act": candidate["act"],
        "chunks": chunks,
    }
    data["works"].append(work)
    save_corpus(data)
    print(f"  Saved '{candidate['title']}' ({len(chunks)} chunks)")

    # Generate beats
    beat_ok = generate_beats(work_id)
    if beat_ok:
        print(f"  Beats generated.")

    # Reload to get updated count
    data = load_corpus()
    print(f"  Corpus now has {len(data['works'])} soliloquies.")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1].lower()

    if cmd == "list":
        play_filter = None
        if "--play" in sys.argv:
            idx = sys.argv.index("--play")
            if idx + 1 < len(sys.argv):
                play_filter = sys.argv[idx + 1]
        list_corpus(play_filter)

    elif cmd == "search":
        if len(sys.argv) < 3:
            print("  Usage: corpus-manager.py search <play name>")
            return
        play_name = " ".join(sys.argv[2:])
        search_play(play_name)

    elif cmd == "add":
        interactive_add()

    else:
        print(f"  Unknown command: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
