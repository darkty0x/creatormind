# Creative Minds Jam — requirements vs CreatorMind

Deadline: **2026-08-28 23:59 HKT**

## Official must-haves

| Requirement | Status |
|-------------|--------|
| Working product with Minds agent integral | ShowRunner linked; digests + product loop. Decide/act run in CreatorMind (LLM when `OPENAI_API_KEY` set). |
| Persistence (memory / continuity / autonomous follow-up) | `/data` volume + goals/jobs/audit + scheduler |
| Creator-economy track fit | Repurpose (submit) + Growth + Moderation |
| Demo video 1.5–2 min | [Done](https://github.com/darkty0x/creatormind/releases/download/v1.0.0/CreatorMind-ShowRunner-Submission.mp4) |
| Code repository + docs | https://github.com/darkty0x/creatormind |

## Live

- Web: https://web-production-c0a0b2.up.railway.app  
- API: https://api-production-428c.up.railway.app  
- Telegram: https://t.me/showrunner_mind_bot  
- Mind: https://app.hellominds.ai/?mindId=a130523e-f36b-1410-8465-00039ce7df11  

## Honest notes for judges

- Animoca Minds has no public embed SDK for custom decide/act; ShowRunner is the persistent Mind identity and notify surface.  
- Generation uses OpenAI when configured; otherwise deterministic heuristics (still draft-only, audited).  
- Open Telegram DMs for testers; cycle endpoint rate-limited.
