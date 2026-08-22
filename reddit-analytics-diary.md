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

## 2026-08-22 — Day 2 (reddit tail + first proper reddit-side metrics)

### Reddit post analytics (48h view since launch)
- **1,700 views total**, peak ~02:00–03:00 UTC on Aug 22 (US late-night traffic)
- Classic decay curve — post now in long tail
- **4 upvotes, 70% upvote ratio** (~1/3 of voters downvoted — most common cause on niche subs is "reads as self-promotion")
- **3 comments** (one substantive — Euphoric-Rest1919, see below)
- Geo mix: US 63%, UK 11.2%, Canada 7.5%, Other 18.3% (Berlin visitor in "Other")

### App-side snapshot at 12:36 UTC
| Total keys | New 24h | Active 24h | Return rate | Sessions | Events log |
|---|---|---|---|---|---|
| 30 | 26 | 28 | 10/26 = 38% | 42 (2 test) | 233 |

### Combined day-1 funnel (reddit → product)
```
Reddit post view                        1,700
  → clicked through                       ~50–80 (est., 3–5% CTR)
  → registered a key                       30    (1.8% overall conv)
  → completed onboarding                   22    (73% of registered)
  → opened a soliloquy                     12    (40%)
  → finished a memorize pass                6    (20%)
  → tested themselves                       0
  → returned within a day                   6    (20%, of which ~3 are same-session refresh false-positives)
  → engaged deeply (>1 min per pass)        2    (533339, 497990)
  → gave actionable feedback                1    (533339 → shipped)
```

**1.8% signup conversion is above the reddit-post baseline** (typical 0.5–1%). Product commitment step (onboarding + first click) is where most beta apps lose people; this one held them.

### Engaged users — how they actually used it

**`533339` — "Berlin Macbeth hobbyist" (aka Euphoric-Rest1919 on reddit)**

Session 1 — 19:54 UTC, 2026-08-21:
```
19:54:40  login-first
19:54:40  onboarding-open
19:54:54  onboarding-close (completed all 4 slides in 14s)
19:55:21  home
19:55:31  catalog (shakespeare)
19:55:38  practice-open: is-this-a-dagger
20:04:34  session-complete: is-this-a-dagger (duration 529s = 8.8 min, learn mode, no score)
20:04:36  catalog
20:05:06  practice-open: now-is-the-winter
20:05:20  practice-open: now-is-the-winter (re-mount)
20:05:35  catalog
20:08:30  practice-open: is-this-a-dagger (back to first pick)
20:08:36  catalog
[left]
```

Session 2 — 22:07 UTC (~2h later, same device):
```
22:07:45  login-return (devices:1)
22:07:45  catalog
22:40     [last seen — no further events recorded, likely just browsing]
```

Behavioral read: went straight to a Macbeth work he already knew ("is this a dagger"), gave it a proper 8.8-minute learn pass, then window-shopped several others before leaving. On return, only browsed — probably checking what got added. Then commented on reddit asking for Lady M Act 1 Sc 5 ("The raven himself is hoarse"). We shipped it within the hour.

Subreddit-inferred profile (public reddit memberships): Berlin resident, German/English bilingual, poly, Berghain-scene, indie-electronic taste, non-actor, self-described bedtime Shakespeare reciter.

**`497990` — "Beats-mode power user"**

Single session — 23:53 UTC, 2026-08-21, no return in >12h since:
```
23:53:05  login-first
23:54:25  session-complete: how-all-occasions      (duration 39s,  beats mode, no score)
23:56:26  session-complete: quality-of-mercy       (duration 100s, lines mode, no score)
[left]
```

Behavioral read: two substantial, non-famous picks in <4 minutes — Hamlet's "How all occasions do inform against me" (which most casual readers wouldn't name) followed by Portia's "The quality of mercy is not strain'd." First one **in beats mode** (Stanislavsky action-by-action structure — a power-user feature), second in lines mode. That's someone comparing modes, or an actor rehearsing.

No onboarding-open/close events in the visible slice — either they skipped/closed the modal without a tracked exit (worth checking) or the event was outside the last-50 window.

### Patterns confirmed / new
- **Reddit funnel behaves as expected:** 48h decay curve, ~1.8% signup rate, sampling-heavy first cohort with a handful of real users buried in the noise.
- **Return-rate signal is inflated by same-session refresh.** 815682, 711859, 342267 each fire `login-return` 2×+ in the same visit — probably tab refresh or nav bounce. Real day-over-day returns closer to 5–7 out of 26.
- **Session-complete pipeline stalled.** No new completions in 12+ hours since the day-1 cohort. New arrivals sample but don't finish.
- **Zero test-completes across 2 days and 12 practice-opens.** Now a real problem, not a fluke. Need to walk the loop manually to determine bug vs UX.

### Decisions made today
- **Not editing the reddit post.** In decay, editing is marginal, "(edited)" tag is a slight trust hit. Post did its job; effort better spent on next community.
- **HN "Show HN" is the next post to draft** — different audience (technical hobbyists), needs to lead with the *interesting engineering choices*, not the actor pitch. Candidate hooks: append-only events log at 512MB scale-to-zero, Groq gpt-oss-120b for Stanislavsky coaching, hand-authored beats vs LLM-generated. Space it out from the reddit post — same-week posts to different communities dilute attribution.
- **artofmemory forum post is the higher-intent watch.** Lower volume, but a single memorizer returning 5× in a week outweighs 100 samplers. Filter events by post-timestamp of that thread next entry.

### Ships today
- Observation day, no code shipped.
- Diary itself committed and pushed.

### Open questions
- Test-complete = 0: bug or UX? **[carried, unresolved]** — verify by walking the loop yourself
- Do 533339 and 497990 return on day 2? (as of 12:36, neither has)
- Does artofmemory bring different behavior (deeper sessions, more test-completes)?
- Reddit downvoters: title tone? "actors" framing?

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
