# Soliloquy Beta — Analytics Diary

Working notes from the public beta rollout. One dated entry per session-with-users.
Numbers pulled from `/api/admin/dashboard`.

---

## 2026-08-21 — Launch day

### Where posted
- **r/shakespeare** (86k members) — the main traffic driver
- **forum.artofmemory.com** — https://forum.artofmemory.com/t/memorizing-shakespeares-works/106485/6
  Lower traffic but audience is memorization-focused. Watch whether they behave differently from reddit samplers.

### Dashboard snapshots

| Time (UTC) | Total keys | New 24h | Active 24h | Return rate | Sessions | Events log |
|---|---|---|---|---|---|---|
| 22:08 | 10 | 6 | 7 | 1/6 = 17% | 35 (2 test) | 91 |
| 00:20 (+1d) | 19 | 15 | 17 | 6/15 = 40% | 42 (2 test) | 167 |

### Funnel at 00:20 (unique users, last 7d)
```
login-first        15
login-return        6
home               13
catalog             8
practice-open       8
session-complete    6
test-complete       0   <-- flat all day
```

### Real users worth remembering
- **533339** — Berlin poly Shakespeare hobbyist (inferred from subreddit list). Returned 2h after first visit, 8.8min session on "is-this-a-dagger". Commented on reddit asking for Lady M Act 1 Sc 5 → shipped as `raven-himself-hoarse` within the hour.
- **497990** — Hit "how-all-occasions" (Hamlet's "How all occasions do inform against me") in **beats mode**, 39s, then "quality-of-mercy" (Portia), 100s. Non-toy engagement. Likely returning.

### Patterns observed
- **Reddit traffic is top-loaded with samplers.** Many `practice-open` events with 3–19 second "sessions" — they open a work, see it, close. Not memorizing.
- **Return rate ~40%** — better than expected for a reddit-first-post visit.
- **Onboarding completion strong** — 6+ users completed all 4 slides; 1 skipped at slide 1. Tour earns its keep.
- **Zero test-completes across 8 practice-opens.** Pattern, not fluke.

### Product signals (backlog, not urgent)
- `session-complete` fires too eagerly (3s durations show up in funnel). Consider gating on `duration >= 30s AND chunksReviewed >= 3` before emitting, or add a separate `session-abandon` event.
- Test mode isn't converting. Three hypotheses to check next session:
  1. Test button is hard to find or intimidating (UX)
  2. Users don't feel "ready" after one Learn pass (flow — add a soft nudge)
  3. `test-complete` event isn't firing when it should (bug — verify by doing it yourself)
- Multi-speaker scene support requested by 533339. n=1 today. Revisit at n≥3.
- "Onboarding-open" fires before "onboarding-close" but `home` also fires under the overlay. The `home` count is slightly inflated (includes people who never actually saw the home page un-obscured). Cosmetic; can leave.

### Cost
- **Zero** rate-limit hits (all caps unfired).
- No `visualize/generate` calls (button grayed out).
- Coach button (`/visualize/generate-chunk`) working — verified end-to-end on chunk 0 of `raven-himself-hoarse`. Not rate-limited; monitoring.
- Est. LLM spend today: **<$0.05**.

### Ships today
1. Resurrection redeploy after ~2 month gap
2. `fly.toml` → scale-to-zero (was always-on billing)
3. Append-only events log (`analytics/events.jsonl`) + `/api/admin/dashboard`
4. `Onboarding.jsx` — 4-slide first-visit tour
5. Groq migration: `llama-3.3-70b-versatile` → `openai/gpt-oss-120b` (Groq retired the Llama models on 2026-08-16, right when this app was down — happy accident of timing that the fix and the launch coincided)
6. Per-user hourly rate limits on `muse`, `recite/transcribe`, `beats/generate`, `visualize/generate`
7. "Generate word pictures" button grayed out
8. Added `raven-himself-hoarse` (Lady Macbeth Act 1 Sc 5) — 16 chunks, 5 hand-authored beats
9. Local `/ship` command + project `.claude/settings.local.json`
10. `gh auth switch` to venuv account, fixed git HTTPS credentials

### Open questions
- Is test-complete zero a bug or a UX gap? (verify next session)
- Does forum.artofmemory traffic behave differently from reddit? (need >5 users from there to say)
- Do returning users (login-return: 6) come back to the same soliloquy or explore? (join events by userKey next entry)

---

<!-- Next entry template

## YYYY-MM-DD — Short label

### Dashboard snapshot
| ... |

### New patterns
- ...

### Ships
- ...

### Open questions carried over
- ...

-->
