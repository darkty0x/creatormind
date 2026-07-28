import express from "express";
import cors from "cors";
import { loadConfig } from "./config.js";
import { Store } from "./store.js";
import { runCycle } from "./agent/cycle.js";
import { mindsStatus } from "./minds/bridge.js";
import { createTelegramBot, telegramWebhook } from "./telegram/bot.js";
import { startScheduler } from "./scheduler.js";
import type { Mode } from "./types.js";

const config = loadConfig();
const store = new Store(config);
const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (
        !origin ||
        config.corsOrigins.includes("*") ||
        config.corsOrigins.includes(origin)
      ) {
        return cb(null, true);
      }
      return cb(new Error(`CORS blocked: ${origin}`));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

function requireKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (!config.apiKey) return next();
  const key = req.header("x-api-key");
  if (key !== config.apiKey) return res.status(401).json({ error: "Unauthorized" });
  return next();
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    product: "CreatorMind",
    mind: config.mindsName ?? "ShowRunner",
    killSwitch: config.killSwitch,
    build: "creatormind-v1",
  });
});

app.get("/api/status", (_req, res) => {
  const profile = store.getProfile();
  res.json({
    product: {
      name: "CreatorMind",
      mind: config.mindsName ?? "ShowRunner",
      tagline: "Persistent Mind for repurpose, growth, and community",
      hackathon: "https://dorahacks.io/hackathon/creativeminds",
      github: process.env.PUBLIC_GITHUB_URL ?? null,
      demoVideo: process.env.PUBLIC_DEMO_VIDEO_URL ?? null,
    },
    live: true,
    killSwitch: config.killSwitch,
    allowAutoPublish: config.allowAutoPublish,
    cooldownSeconds: config.cooldownSeconds,
    maxJobsPerHour: config.maxJobsPerHour,
    profile,
    minds: mindsStatus(config, store),
    meta: store.meta(),
    goals: store.listGoals().slice(0, 20),
    jobs: store.listJobs(20),
    memory: store.listMemory(20),
    audit: store.listAudit(20),
  });
});

app.get("/api/audit", (_req, res) => {
  res.json({ records: store.listAudit(100) });
});

app.post("/api/profile", requireKey, (req, res) => {
  const profile = store.updateProfile(req.body ?? {});
  res.json({ profile });
});

app.post("/api/goals", requireKey, (req, res) => {
  const { title, mode, brief, sourceContent, commentsSnapshot, dueAt } = req.body ?? {};
  if (!title || !mode) {
    return res.status(400).json({ error: "title and mode required" });
  }
  if (!["repurpose", "growth", "moderation"].includes(mode)) {
    return res.status(400).json({ error: "invalid mode" });
  }
  const goal = store.upsertGoal({
    title,
    mode,
    brief: brief ?? title,
    sourceContent,
    commentsSnapshot,
    dueAt,
  });
  store.addMemory({
    kind: "note",
    mode,
    text: `Goal created: ${title}`,
  });
  res.json({ goal });
});

app.post("/api/cycle", requireKey, async (req, res, next) => {
  try {
    const mode = req.body?.mode as Mode | undefined;
    const result = await runCycle({
      config,
      store,
      trigger: req.body?.trigger ?? "api",
      mode,
      goalId: req.body?.goalId,
      sourceContent: req.body?.sourceContent,
      commentsSnapshot: req.body?.commentsSnapshot,
      notify: req.body?.notify !== false,
      notifyChatId: req.body?.notifyChatId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const bot = createTelegramBot(config, store);
const publicApi = process.env.PUBLIC_API_URL?.replace(/\/$/, "");

async function registerTelegramWebhook() {
  if (!bot || !config.telegramBotToken || !publicApi) return;
  const hook = `${publicApi}/telegram/webhook`;
  const res = await fetch(
    `https://api.telegram.org/bot${config.telegramBotToken}/setWebhook`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: hook, drop_pending_updates: false }),
    },
  );
  const body = await res.json();
  console.log("[telegram] setWebhook", hook, body);
}

if (bot) {
  if (process.env.TELEGRAM_POLLING === "1") {
    bot.start({
      onStart: () => console.log("[telegram] polling as @showrunner_mind_bot"),
    });
  } else {
    app.post("/telegram/webhook", telegramWebhook(bot));
    console.log("[telegram] webhook route /telegram/webhook");
    registerTelegramWebhook().catch((err) =>
      console.error("[telegram] webhook register failed", err),
    );
  }
}

const scheduler = startScheduler(config, store);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  },
);

app.listen(config.port, () => {
  console.log(`CreatorMind API on :${config.port}`);
});

process.on("SIGINT", () => {
  scheduler.stop();
  process.exit(0);
});
