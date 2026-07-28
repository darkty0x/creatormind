# CreatorMind Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Ship a production-ready CreatorMind (Animoca Minds–integral) with repurpose, growth, and moderation modes on Telegram + web, plus autonomous scheduler follow-ups, for Creative Minds Jam (deadline 2026-08-28).

**Architecture:** TypeScript monorepo — Express API (observe → decide → policy → act → audit), SQLite memory, Next.js dashboard, Grammy Telegram bot, node-cron scheduler, Minds bridge adapter.

**Tech Stack:** Node 22+, TypeScript, Express, better-sqlite3 (or sql.js), Next.js App Router, Grammy, Zod, Vitest, Railway deploy.

## Global Constraints

- No mock success / fake job completions  
- Mind integral via `src/minds/` bridge (notify + ingest + profile)  
- Draft-only social actions unless `ALLOW_AUTO_PUBLISH=1`  
- Kill switch + rate limits always enforced  
- Plain-language UI; Live badge when API healthy  

---

### Task 1: Monorepo scaffold + health

**Files:**
- Create: `package.json`, `tsconfig.json`, `src/server.ts`, `src/config.ts`, `.env.example`, `README.md`, `apps/web/` (Next stub)

- [ ] Init npm workspaces (`apps/web`, root API)
- [ ] Express `/api/health` + `/api/status`
- [ ] Commit scaffold

---

### Task 2: Memory + goals + audit store

**Files:**
- Create: `src/db.ts`, `src/memory.ts`, `src/goals.ts`, `src/audit.ts`, `tests/memory.test.ts`

- [ ] SQLite schema: profiles, memory_entries, goals, jobs, audit_events
- [ ] CRUD helpers + tests
- [ ] Commit

---

### Task 3: Agent core (three modes)

**Files:**
- Create: `src/observe.ts`, `src/decide.ts`, `src/policy.ts`, `src/act.ts`, `src/agent/cycle.ts`, `tests/cycle.test.ts`

- [ ] `runCycle({ trigger, mode?, goalId? })` pipeline
- [ ] Mode handlers: repurpose, growth, moderation (draft outputs)
- [ ] Policy: killSwitch, cooldown, maxJobsPerHour
- [ ] Tests with fixture content
- [ ] Commit

---

### Task 4: Minds bridge + Telegram + scheduler

**Files:**
- Create: `src/minds/bridge.ts`, `src/telegram/bot.ts`, `src/scheduler.ts`

- [ ] `notifyMind` / `ingestMessage` / profile link fields
- [ ] Grammy commands: `/start`, `/goal`, `/status`, `/run`
- [ ] Cron: process due goals → cycle → Telegram notify
- [ ] Commit

---

### Task 5: Web dashboard

**Files:**
- Create: `apps/web/app/page.tsx`, API client, CSS module

- [ ] Goals, run job, memory panel, audit, Live badge
- [ ] Mode tabs: Repurpose / Growth / Moderation
- [ ] Commit

---

### Task 6: Deploy + BUIDL pack + demo script

**Files:**
- Create: `docs/buidl/submit.md`, `docs/demo-script.md`, Railway configs

- [ ] Deploy API + web
- [ ] Paste-ready DoraHacks fields
- [ ] Record submission video against Live URLs
