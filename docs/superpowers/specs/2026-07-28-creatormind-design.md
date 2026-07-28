# CreatorMind — Design Spec

**Date:** 2026-07-28  
**Hackathon:** Creative Minds Jam #1 (Hong Kong) — https://dorahacks.io/hackathon/creativeminds  
**Deadline:** 2026-08-28 23:59 HKT  
**Prize pool:** $10,000  

## Vision

CreatorMind is a production-ready creator operating system powered by a persistent **Animoca Minds** agent. One Mind remembers brand voice, audience, and community norms, then runs **repurpose**, **growth**, and **moderation** goals across **Telegram** and the **web** without being babysat.

## Non-negotiables (hackathon)

- Mind is **integral** to operation (not optional chrome)
- Demonstrate **memory**, **continuity**, **autonomous follow-up**
- All three tracks ship as first-class modes
- GitHub + demo video (~1.5–2 min)
- Production quality on day one: no mock success paths, real audit trail, kill switch

## Tracks / modes

| Mode | Job |
|------|-----|
| Repurpose | Long-form → platform variants (shorts script, X thread, LinkedIn, email) |
| Growth | Audience hypotheses, hooks, reply drafts, next growth actions from goals |
| Moderation | Comment/community triage using learned norms; escalate vs suggest |

Creator profiles (YouTuber, streamer, multi-platform, Web3) are **config**, not separate products.

## Architecture

```text
Telegram bot ──┐
Web dashboard ─┼──► API gateway ──► observe → decide → policy → act → audit
Scheduler ─────┘         │
                         ├── Memory store (brand, goals, jobs, decisions)
                         └── Minds bridge (Animoca Mind identity + notify/ingest)
```

### Why a bridge

Animoca Minds is operated via email/Telegram (no public embed SDK documented for builders). CreatorMind owns the product control plane (goals, jobs, memory UI, policy). The creator’s **Animoca Mind** is the persistent agent identity: digests and follow-ups are pushed to Telegram/email so the Mind’s long-term memory and autonomy are part of the operating loop. Our scheduler provides deterministic autonomous jobs the demo can prove.

### Core loop

1. **Observe** — ingest content URL/script, comments feed snapshot, open goals  
2. **Decide** — Mind-assisted planning (LLM + stored memory) picks mode actions  
3. **Policy** — kill switch, rate limits, approval gates (no silent public publish in v1)  
4. **Act** — create drafts, queue follow-ups, notify Telegram + Mind digest  
5. **Audit** — append-only JSONL/SQLite of every cycle

## Surfaces

- **Telegram** — chat with the bot; receive autonomous pings  
- **Web** — goals, job queue, memory snapshot, audit, Live badge  
Equal priority; same API.

## Safety (v1)

- Kill switch  
- Cooldown / max jobs per hour  
- Draft-only publish policy (auto-publish behind `ALLOW_AUTO_PUBLISH=0` default)  
- Allowlisted destinations for notifications  

## Out of v1

- Auto-post to every social network without approval  
- Full Discord moderation bot fleet  
- SANDchain payments (stretch if Minds wallet tooling is trivial)

## Demo proof (judges)

1. Create goal + paste content in web  
2. Leave — scheduler runs overnight/batch job  
3. Telegram ping: repurpose pack + growth next steps + flagged comments  
4. Reopen web next day — continuity from memory  

## Submission

- DoraHacks track label: **Content repurposing** (product still demos all three)  
- AI Agent: Yes  
- Live URL + GitHub + video  

## Name / brand

**CreatorMind** — cream/ink creator-tool aesthetic (not purple-glow AI cliché); expressive typography; one composition hero.
