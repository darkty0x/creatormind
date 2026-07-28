import "dotenv/config";
import type { AppConfig } from "./types.js";

function bool(v: string | undefined, fallback: boolean) {
  if (v == null || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 8787),
    dataDir: process.env.DATA_DIR ?? "./data",
    killSwitch: bool(process.env.KILL_SWITCH, false),
    cooldownSeconds: Number(process.env.COOLDOWN_SECONDS ?? 30),
    maxJobsPerHour: Number(process.env.MAX_JOBS_PER_HOUR ?? 20),
    allowAutoPublish: bool(process.env.ALLOW_AUTO_PUBLISH, false),
    openaiApiKey: process.env.OPENAI_API_KEY || undefined,
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || undefined,
    telegramAllowedChatIds: (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    mindsNotifyChatId: process.env.MINDS_NOTIFY_CHAT_ID || undefined,
    mindsProfileUrl: process.env.MINDS_PROFILE_URL || undefined,
    mindsId: process.env.MINDS_ID || undefined,
    mindsName: process.env.MINDS_NAME || "ShowRunner",
    mindsEmail: process.env.MINDS_EMAIL || undefined,
    publicWebUrl: process.env.PUBLIC_WEB_URL ?? "http://localhost:3000",
    corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    schedulerCron: process.env.SCHEDULER_CRON ?? "*/5 * * * *",
    apiKey: process.env.API_KEY || undefined,
  };
}
