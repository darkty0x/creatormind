import { Bot, webhookCallback } from "grammy";
import type { AppConfig, Mode } from "../types.js";
import type { Store } from "../store.js";
import { runCycle } from "../agent/cycle.js";

function allowed(config: AppConfig, chatId: number | string) {
  // Empty allowlist = open DMs (testers welcome)
  if (config.telegramAllowedChatIds.length === 0) return true;
  return config.telegramAllowedChatIds.includes(String(chatId));
}

export function createTelegramBot(config: AppConfig, store: Store) {
  if (!config.telegramBotToken) return null;
  const bot = new Bot(config.telegramBotToken);

  bot.command("start", async (ctx) => {
    if (!allowed(config, ctx.chat.id)) return ctx.reply("Unauthorized chat.");
    store.rememberTelegramChat(ctx.chat.id);
    await ctx.reply(
      "ShowRunner online (open DM).\n/goal <mode> | title — create goal\n/status — snapshot\n/run [mode] — run a cycle\nModes: repurpose | growth | moderation\n\nAnyone can test — just /start here.",
    );
  });

  bot.command("status", async (ctx) => {
    if (!allowed(config, ctx.chat.id)) return;
    store.rememberTelegramChat(ctx.chat.id);
    const goals = store.listGoals().filter((g) => g.status === "active");
    const meta = store.meta();
    await ctx.reply(
      `Goals active: ${goals.length}\nLast success: ${meta.lastSuccessAt ?? "—"}\nMemory entries: ${store.listMemory(100).length}\nKnown testers: ${store.listTelegramChats().length}`,
    );
  });

  bot.command("goal", async (ctx) => {
    if (!allowed(config, ctx.chat.id)) return;
    store.rememberTelegramChat(ctx.chat.id);
    const text = (ctx.match as string | undefined)?.trim() ?? "";
    const [modeRaw, ...rest] = text.split("|").map((s) => s.trim());
    const mode = (modeRaw || "repurpose") as Mode;
    if (!["repurpose", "growth", "moderation"].includes(mode)) {
      return ctx.reply("Use: /goal repurpose | Ship weekly clips");
    }
    const title = rest.join("|") || "Untitled goal";
    const goal = store.upsertGoal({
      title,
      mode,
      brief: title,
    });
    await ctx.reply(`Goal saved (${goal.mode}): ${goal.title}`);
  });

  bot.command("run", async (ctx) => {
    if (!allowed(config, ctx.chat.id)) return;
    store.rememberTelegramChat(ctx.chat.id);
    const modeRaw = ((ctx.match as string | undefined) ?? "").trim();
    const mode = modeRaw && ["repurpose", "growth", "moderation"].includes(modeRaw)
      ? (modeRaw as Mode)
      : undefined;
    await ctx.reply("Running cycle…");
    const result = await runCycle({
      config,
      store,
      trigger: "telegram",
      mode,
      // Reply in this DM; skip broadcast notify to avoid double message
      notify: false,
    });
    const outcome = result.audit.outcome;
    await ctx.reply(
      outcome === "success"
        ? `Done · ${result.output?.summary}`
        : `${outcome}: ${result.audit.error ?? result.policy.reasons.join("; ")}`,
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
    await ctx.reply("Noted in memory. Use /run when you want a cycle.");
  });

  return bot;
}

export function telegramWebhook(bot: Bot) {
  return webhookCallback(bot, "express");
}
