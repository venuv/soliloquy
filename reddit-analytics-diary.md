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

### Late-day update (23:52 UTC)

Snapshot delta since 12:36 (~11h): +10 keys (40 total), +66 events (299), **+1 session-complete (7 total)**, +4 login-returns, 0 tests.

**New engaged user: `850945` — "Storm speech rehearser"**

Focused rehearsal pattern on a single work — King Lear's "Blow winds and crack your cheeks" (8 chunks). Three visits in 3.5 hours:

```
17:22:56  login-first
17:23:21  catalog
17:23:29  practice-open: blow-winds
17:24:15  session-complete: blow-winds  (44s, lines mode)
[~1h20 gap]
18:44:53  login-return + practice-open: blow-winds  (same work, no completion this visit)
[~2h20 gap]
21:02:03  login-return  (browsed, left)
```

Behavioral read: **this is the memorization pattern.** Read → sleep on it → come back to test recall → come back again. Not spaced-repetition to the day but to the *hour* — which for an 8-line piece is about right. Best "actually using this tool for its purpose" match of any user so far. Beats 533339 and 497990 on the metric that matters most for a memorization app: *does the user return specifically to keep working on the same piece?*

**Day-2 rehash of the three engaged users:**
| User | Day 1 | Day 2 | Pattern |
|---|---|---|---|
| `533339` (Berlin Macbeth) | 8.8min learn + browse | *no return* | One-shot deep + feature request; possibly one-and-done |
| `497990` (beats power user) | 2 sessions, 2 modes | *no return* | Evaluator, not user? |
| `850945` (storm rehearser) | reg → 44s pass | +2 returns to same work | Textbook memorization discipline |

Day-2 return rate on day-1 engaged users: **0 of 2**. Small sample, but if the pattern holds it suggests deep-first-session ≠ retention. The 850945 pattern (short session + rapid same-day returns) may be the better retention predictor.

**Content signals**
- `raven-himself-hoarse` (added yesterday in response to 533339's request): 2 → 4 opens. New content draws clicks.
- New work discoveries: `this-royal-throne` (Richard II), `once-more-unto-the-breach` (Henry V), `blow-winds` (King Lear). History plays are getting exploratory attention.
- `168029` (22:43): rapid-sampler pattern — 3 different history-play works opened in 90s, no completions. Contrasts sharply with 850945.

**First day-2 completion is significant.** Until 17:24 all 6 session-completes were from the day-1 cohort. 850945 becoming the 7th means at least one day-2 arrival got past the "sampler" barrier. Small n, but the plateau isn't total.

**Still zero test-completes** across 40 keys, 16 practice-opens, 3 named engaged users, 2 days. Test verification is now the top-priority TODO — walk the loop manually to distinguish bug from UX gap.

---

## 2026-08-23 — Day 3 (personas, artofmemory rejection, HN queued)

### Reddit post won't die
- **2K views** total (up 300 since day-2 evening), **5 comments** (up from 3)
- **Marked as user's #1 all-time reddit post**
- Views chart went to 0 for 16 hours (hours 32–48) then trickled back with +8
- Upvote ratio held at 70%
- Second comment produced second engaged user (Minimum-Target-7543 / 850945) → shipped Edmund
- Pattern: **comments, not upvotes, are the leading engagement predictor.** 2 comments → 2 engaged users → 2 content-adds.

### Ships today
- **Edmund's "Thou, Nature, art my goddess"** — King Lear Act 1 Sc 2, 22 chunks, 6 hand-authored beats (Invoke Nature → Challenge Custom → Assert Equality → Boast Superior Origin → Plot Against Edgar → Claim Triumph). Second engaged-user → content-add loop completed.
- **Test mode forced to lines** — regardless of the user's saved `practiceUnit` preference. Beat-based tests ask reciters to deliver several lines from a single intention cue; too hard as a default. Likely explanation for `test-complete = 0` across the first 42 users.
- **Diary itself** — first two entries now committed.

### Engaged user #3 persona: `850945` = Minimum-Target-7543

Subreddit-inferred profile:
- **Location:** UK (r/TeachingUK, r/GCSE, r/veganuk, r/CasualUK — 4 independent UK signals)
- **Occupation:** teacher, most likely English or Classics. r/TeachingUK + r/GCSE + r/classicliterature + r/classics + r/latin + r/shakespeare is a coherent literary-teacher signal. GCSE English Lit set texts include Macbeth — fits the Lear/Macbeth focus perfectly. May be memorizing works they *teach*.
- **Age:** 30–45 (self-identified r/Millennials)
- **Gender:** mild lean female (r/SarahJMaas + self-care + cat cluster) but keep "they"
- **Values:** progressive (r/veganuk, r/SarahJMaas's declared politics)
- **Lifestyle:** cat person (4 cat subs), fitness (r/Garmin), self-care (r/finch), history-podcast listener (r/TheRestIsHistory), genre-fiction fan (r/HannibalTV, r/LV426, r/criminalminds), single (r/Tinder)

Why this profile matters for the product:
- **Teachers = adjacent-audience multiplier.** One recommendation to a colleague or class = another engaged user, unpaid.
- **GCSE/A-level set text bias pays double.** Macbeth, Romeo & Juliet, Julius Caesar, Much Ado — if the app covers what they teach, they'll use it AND recommend it.
- **r/TeachingUK** (59K UK teachers) is a natural follow-up community, queued behind HN.

### Persona archive so far

| App ID | Reddit handle | Location | Persona | Pattern |
|---|---|---|---|---|
| `533339` | Euphoric-Rest1919 | Berlin | Alt-scene hobbyist, non-actor bedtime reciter | 1 deep 8.8min session + 1 browse return; requested Lady M Act 1 Sc 5 |
| `497990` | ? (no comment) | ? | Beats-mode power user; possibly actor or evaluator | 2 mode-comparison sessions in 3min; no return |
| `850945` | Minimum-Target-7543 | UK | English/Classics teacher, ~30-45 | 3 returns to same work over 3.5h; requested Edmund's soliloquy |

Three engaged users, three distinct archetypes, same product need. Cross-persona demand suggests the concept has more shapes of user than the original "actors" framing implied.

### Channels

**artofmemory forum — rejected.**
- Mod (Josh Cohen, "dear johnn-ed") ruefully rejected the post
- Their rule: no commerce-oriented links, no matter the intent (slippery-slope concern)
- Zero traffic from this source

**HN Show HN — deprioritized (not for this app, not now).**
- Instinct: "this isn't exotic AI." Correct. The engineering is competent, not novel by HN standards.
- HN would mostly produce curious engineers who bounce, not the actor/teacher/memorizer audience the app is for.
- Cost of a mediocre HN reception (harsh comments, spikey traffic, novelty burned) outweighs the marginal user count.
- Revisit only if a real technical story appears (multi-speaker scenes, LLM-as-judge on recited audio, 30-day postmortem with data).

**Priority follow-up communities — these ARE the point.**

The r/shakespeare launch validated the concept; the next posts should go where the *actual target users* are, not where novelty-hunters are.

| Priority | Community | Members | Why it fits |
|---|---|---|---|
| 1 | **r/actors** and **r/acting** | ~150K + ~100K | Original target audience; still untested. Actors literally rehearse soliloquies. |
| 2 | **r/TheatreEducation** | ~small, high-intent | Drama teachers = adjacent-audience multiplier (see 850945 persona). One teacher = a class of students. |
| 3 | **Poetry Foundation forum / poets.org** communities | small, very high intent | Poets memorize verse; Shakespeare is their shared reference. Cultural fit is near-perfect. |
| 4 | **r/anki** | 200K | Spaced-repetition adjacency. Framing: "not Anki, but line-by-line verse cards with beat structure." Highest volume of the four. |

**r/TeachingUK** is a #5 — coherent with the Minimum-Target-7543 persona but wait for the r/shakespeare cooldown (7 days from launch) since it's the same country/language cluster.

**Cadence:** post to one per week, in the order above. That lets each channel's users show up on the dashboard with clean attribution (compare a week-over-week snapshot before and after each post). Rushing them dilutes the ability to see which audience actually converts.

**Framing shifts per channel:**
- r/actors / r/acting → lead with "memorize your monologue faster; test yourself line-by-line; Stanislavsky beats are optional"
- r/TheatreEducation → "free tool for students memorizing monologues for auditions or coursework; no signup, no tracking beyond a 6-digit key"
- Poetry Foundation → "line-by-line memorization for verse, built around natural verse-line chunks not arbitrary flashcards"
- r/anki → "not spaced-repetition per se, but complementary — chunked verse cards with intention-based grouping"

### Open questions
- Does the test-mode-lines fix produce any `test-complete` events in the next 24h?
- Do any of the three named engaged users return day 3?
- Does forcing test to lines mode affect users who genuinely liked beats-testing? (small population, probably fine)
- Cross-persona pattern: what other shapes-of-user will show up? Actors, students, elders, ESL learners?

### Late day 3 — Minimum-Target-7543 persona fully confirmed + content roadmap

She replied to the Edmund ship with:
1. **Persona confirmed exactly.** "I teach King Lear at A-level (as a literature text) and this is my favourite speech." UK English/Classics teacher inference was correct.
2. **Explicit multiplier signal.** "I'm going to share this with the teachers and students at my school." One engaged user → potentially a school's worth of trials.
3. **Content roadmap gift.** Her exam-board coverage priorities:
   - **GCSE:** Macbeth, Romeo and Juliet (most-taught)
   - **A-level:** Othello, and to a lesser extent King Lear
4. **Two more requests, same scene:** Gloucester's "These late eclipses" and Edmund's "This is the excellent foppery" (both Act 1 Sc 2). Shipped in ~20 minutes.

**Cumulative for this one user: 3 speeches shipped same-day (Edmund's soliloquy + 2 more Act 1 Sc 2 speeches). All three now cover the opening of Act 1 Sc 2 in narrative order — a student can memorize the whole scene sequentially.**

Content backlog implied by her note (in order of leverage):
- More **Macbeth** (already 4 works; GCSE top play — worth pushing to 8-10)
- **Romeo & Juliet** (currently 3 works — GCSE top play — needs more)
- More **Othello** (currently 1 work — A-level primary — needs more)
- More **King Lear** (currently 4 works incl. today's — A-level secondary — solid for now)

### Reinforced pattern
- **3 engaged users → 3 same-day feature requests → 4 speeches shipped in <24h combined**
- Cost per add: effectively $0 (hand-authored beats, no LLM spend)
- Time per add: ~20 min including deploy
- **Every request fulfilled has come from a user with a clear persona pattern in the events log**
- No requests yet from any of the "sampler" users — signal remains: engaged users produce actionable requests, samplers don't

### Late day 3 — reddit post plateauing, not decaying

Metrics at ~end of day 2 UTC (post is ~48h old):
- **2.5K views** (+500 in ~4h; the plateau is *accelerating slightly*, not decaying)
- **7 upvotes / 76.9% ratio** (up from 70%)
- **8 comments** — but ~4 of those are user's own replies, so audience-originated comments are ~3-4
- UK share up 11.6% → 12.4% (small; watch for whether Minimum-Target-7543's school-sharing is landing)

**Atypical decay curve.** Normal reddit posts drop to near-zero by hour 30-40. This one has plateaued at 15-25 views/hour and stayed there through hours 30-48. Hypotheses (unverified):
- Reddit search / sidebar surfacing to newcomers
- Outbound link-sharing (Minimum-Target's school network in particular)
- Sustained comment activity keeps the post visible in sub feed

**Ratio movement is the more interesting metric.** Initial reddit-front-page skimmers were more downvote-prone; the plateau-baseline audience likes it *more* than early browsers. Unusual — typically posts degrade over time as noise catches up. Here quality-of-audience seems to be improving with time.

### Channel-selection lesson
- User's past attempts to launch things on Twitter and LinkedIn underperformed reddit substantially.
- Reddit-hobby-sub calculus: **"which specific hobby community actively discusses this?"** > "what's the highest-reach platform?"
- Broadcast platforms (Twitter, LinkedIn) reward hot takes and scale; niche hobby subs reward specificity and get you to self-selected users without scale.
- This is worth remembering for future personal projects — always ask "which hobby sub, not which big platform?"

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
