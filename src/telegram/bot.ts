import { Bot, webhookCallback } from "grammy";
import type { AppConfig, Mode } from "../types.js";
import type { Store } from "../store.js";
import { runCycle } from "../agent/cycle.js";
import {
  blockedRunMessage,
  failedRunMessage,
  goalSavedMessage,
  helpMessage,
  memoryNoteMessage,
  runningMessage,
  statusMessage,
  successRunMessage,
  unauthorizedMessage,
  welcomeMessage,
} from "./format.js";

function allowed(config: AppConfig, chatId: number | string) {
  if (config.telegramAllowedChatIds.length === 0) return true;
  return config.telegramAllowedChatIds.includes(String(chatId));
}

async function replyHtml(ctx: { reply: Function }, html: string) {
  const trimmed = html.length > 3900 ? `${html.slice(0, 3890)}…` : html;
  await ctx.reply(trimmed, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

export function createTelegramBot(config: AppConfig, store: Store) {
  if (!config.telegramBotToken) return null;
  const bot = new Bot(config.telegramBotToken);

  bot.api
    .setMyCommands([
      { command: "start", description: "Welcome + link this chat" },
      { command: "help", description: "Friendly command guide" },
      { command: "status", description: "Goals, memory, last success" },
      { command: "goal", description: "Save a goal: mode | title" },
      { command: "run", description: "Run repurpose / growth / moderation" },
    ])
    .catch((err) => console.error("[telegram] setMyCommands", err));

  bot.command("start", async (ctx) => {
    if (!allowed(config, ctx.chat.id)) {
      return replyHtml(ctx, unauthorizedMessage());
    }
    store.rememberTelegramChat(ctx.chat.id);
    await replyHtml(ctx, welcomeMessage(config.publicWebUrl));
  });

  bot.command("help", async (ctx) => {
    if (!allowed(config, ctx.chat.id)) {
      return replyHtml(ctx, unauthorizedMessage());
    }
    store.rememberTelegramChat(ctx.chat.id);
    await replyHtml(ctx, helpMessage());
  });

  bot.command("status", async (ctx) => {
    if (!allowed(config, ctx.chat.id)) return;
    store.rememberTelegramChat(ctx.chat.id);
    const goals = store.listGoals().filter((g) => g.status === "active");
    const meta = store.meta();
    await replyHtml(
      ctx,
      statusMessage({
        goalsActive: goals.length,
        memoryCount: store.listMemory(200).length,
        testers: store.listTelegramChats().length,
        lastSuccessAt: meta.lastSuccessAt,
        llmEnabled: Boolean(config.openaiApiKey),
        topGoals: goals.slice(0, 5).map((g) => ({ mode: g.mode, title: g.title })),
      }),
    );
  });

  bot.command("goal", async (ctx) => {
    if (!allowed(config, ctx.chat.id)) return;
    store.rememberTelegramChat(ctx.chat.id);
    const text = (ctx.match as string | undefined)?.trim() ?? "";
    if (!text) {
      return replyHtml(
        ctx,
        "Try: <code>/goal repurpose | Ship weekly clips</code>\nModes: <code>repurpose</code> · <code>growth</code> · <code>moderation</code>",
      );
    }
    const [modeRaw, ...rest] = text.split("|").map((s) => s.trim());
    const mode = (modeRaw || "repurpose") as Mode;
    if (!["repurpose", "growth", "moderation"].includes(mode)) {
      return replyHtml(
        ctx,
        "Mode should be <code>repurpose</code>, <code>growth</code>, or <code>moderation</code>.\nExample: <code>/goal growth | Grow Shorts watch time</code>",
      );
    }
    const title = rest.join("|").trim() || "Untitled goal";
    const goal = store.upsertGoal({
      title,
      mode,
      brief: title,
    });
    await replyHtml(ctx, goalSavedMessage(goal.mode, goal.title));
  });

  bot.command("run", async (ctx) => {
    if (!allowed(config, ctx.chat.id)) return;
    store.rememberTelegramChat(ctx.chat.id);
    const modeRaw = ((ctx.match as string | undefined) ?? "").trim();
    const mode =
      modeRaw && ["repurpose", "growth", "moderation"].includes(modeRaw)
        ? (modeRaw as Mode)
        : undefined;

    await replyHtml(ctx, runningMessage(mode));

    const result = await runCycle({
      config,
      store,
      trigger: "telegram",
      mode,
      notify: false,
    });

    const outcome = result.audit.outcome;
    if (outcome === "success" && result.output) {
      await replyHtml(
        ctx,
        successRunMessage({
          mode: result.observation.mode,
          summary: result.output.summary,
          output: result.output,
          webUrl: config.publicWebUrl,
        }),
      );
      return;
    }

    if (outcome === "blocked") {
      await replyHtml(
        ctx,
        blockedRunMessage(
          result.audit.error ?? result.policy.reasons.join("; ") ?? "Blocked",
        ),
      );
      return;
    }

    await replyHtml(
      ctx,
      failedRunMessage(result.audit.error ?? "Unknown error"),
    );
  });

  bot.on("message:text", async (ctx) => {
    if (!allowed(config, ctx.chat.id)) return;
    if (ctx.message.text.startsWith("/")) return;
    store.rememberTelegramChat(ctx.chat.id);
    store.addMemory({
      kind: "note",
      text: `Telegram ingest: ${ctx.message.text.slice(0, 500)}`,
    });
    await replyHtml(ctx, memoryNoteMessage());
  });

  bot.catch((err) => {
    console.error("[telegram]", err);
  });

  return bot;
}

export function telegramWebhook(bot: Bot, secretToken?: string) {
  return webhookCallback(bot, "express", {
    secretToken: secretToken || undefined,
  });
}
