# CreatorMind / ShowRunner

Production creator OS for **Creative Minds Jam #1** (Animoca Minds).

**Mind:** [ShowRunner](https://app.hellominds.ai/?mindId=a130523e-f36b-1410-8465-00039ce7df11)  
**Live web:** https://web-production-c0a0b2.up.railway.app  
**Live API:** https://api-production-428c.up.railway.app  
**Telegram (open DM):** [@showrunner_mind_bot](https://t.me/showrunner_mind_bot)  
**Hackathon:** https://dorahacks.io/hackathon/creativeminds  
**GitHub:** https://github.com/darkty0x/creatormind  

## Requirements checklist (official)

| Requirement | Status |
|-------------|--------|
| Working product with Mind integral | ShowRunner + Live web/API/Telegram |
| Memory across sessions | Durable `/data` volume on Railway |
| Continuity | Goals + jobs + audit trail |
| Autonomous follow-up | Cron scheduler + Telegram digests |
| Creator-economy track fit | Repurpose / Growth / Moderation |
| GitHub + docs | https://github.com/darkty0x/creatormind |
| Demo video (1.5–2 min) | **Still needed** — record against Live URL |
| Live website | https://web-production-c0a0b2.up.railway.app |

Official submit fields require **GitHub** + **Demo video**. Live site is strongly recommended for “working product / execution.”

## Modes

- **Repurpose** — long-form → shorts / X / newsletter drafts  
- **Growth** — hooks, replies, follow-up experiments  
- **Moderation** — comment triage with learned norms  

## Quick start (local)

```bash
cp .env.example .env
# set TELEGRAM_BOT_TOKEN, MINDS_PROFILE_URL, MINDS_ID
npm install
npm run dev          # API :8787
npm run web:dev      # Web :3000
```

Open DMs: leave `TELEGRAM_ALLOWED_CHAT_IDS` empty. Testers `/start` then `/run`.

## Production

- API: `npm run build && npm start` (Node 22)  
- Web: `apps/web` with `NEXT_PUBLIC_API_URL`  
- Persist `DATA_DIR` on a volume (e.g. `/data`)  
- Set `PUBLIC_API_URL` so Telegram webhook registers  
- `TELEGRAM_POLLING=0` in production (webhook)

## Safety

Kill switch, cooldown, rate limit, draft-only publish (`ALLOW_AUTO_PUBLISH=false`).

## Spec

[docs/superpowers/specs/2026-07-28-creatormind-design.md](docs/superpowers/specs/2026-07-28-creatormind-design.md)
