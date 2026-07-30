import type { AppConfig } from "../types.js";
import type { Store } from "../store.js";
import { digestMessage } from "../telegram/format.js";
import type { Mode } from "../types.js";

async function sendTelegram(
  config: AppConfig,
  chatId: string,
  text: string,
) {
  const res = await fetch(
    `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) {
    return { ok: false as const, err: await res.text(), chatId };
  }
  return { ok: true as const, chatId };
}

/** Animoca Minds bridge — ShowRunner identity + Telegram digests into known DMs. */
export async function notifyMind(
  config: AppConfig,
  store: Store,
  payload: {
    title: string;
    body: string;
    mode?: Mode;
    summary?: string;
    draftLines?: string[];
  },
  opts?: { chatId?: string },
) {
  const profile = store.getProfile();
  const text =
    payload.mode && payload.summary
      ? digestMessage({
          mode: payload.mode,
          summary: payload.summary,
          draftLines: payload.draftLines ?? [],
          webUrl: config.publicWebUrl,
        })
      : `<b>${payload.title.replace(/[<>&]/g, "")}</b>\n\n${payload.body
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}`;

  const targets = opts?.chatId
    ? [opts.chatId]
    : config.mindsNotifyChatId
      ? [config.mindsNotifyChatId]
      : store.listTelegramChats();

  store.addMemory({
    kind: "note",
    text: `Mind digest queued: ${payload.title} → ${targets.join(",") || "no-chat"}`,
    meta: {
      mindsProfileUrl: profile.mindsProfileUrl ?? config.mindsProfileUrl,
      mindsId: profile.mindsId ?? config.mindsId,
      targets,
    },
  });

  if (!config.telegramBotToken || targets.length === 0) {
    return { delivered: false, reason: "telegram_not_configured" as const, targets };
  }

  const results = [];
  for (const chatId of targets.slice(0, 25)) {
    results.push(await sendTelegram(config, chatId, text));
  }
  const delivered = results.some((r) => r.ok);
  return { delivered, reason: delivered ? undefined : "telegram_error", results, targets };
}

export function mindsStatus(config: AppConfig, store: Store) {
  const profile = store.getProfile();
  const chats = store.listTelegramChats();
  const linked = Boolean(
    profile.mindsId ??
      config.mindsId ??
      profile.mindsProfileUrl ??
      config.mindsProfileUrl,
  );
  const notifyReady = Boolean(config.telegramBotToken) && chats.length > 0;
  return {
    // Honest: ShowRunner is linked and digests flow through the product loop.
    // Not claiming Hellominds hosted runtime executes decide/act.
    linked,
    operational: linked && (notifyReady || Boolean(config.openaiApiKey)),
    name: profile.mindsName ?? config.mindsName ?? "ShowRunner",
    id: config.mindsId ?? profile.mindsId ?? null,
    profileUrl: config.mindsProfileUrl ?? profile.mindsProfileUrl ?? null,
    email: profile.mindsEmail ?? config.mindsEmail ?? null,
    openDm: config.telegramAllowedChatIds.length === 0,
    knownTesters: chats.length,
    notifyChatId: config.mindsNotifyChatId ?? profile.telegramChatId ?? null,
    bot: "@ShowRunner_CMind_Bot",
    llmEnabled: Boolean(config.openaiApiKey),
    setup:
      "ShowRunner Mind linked. Testers DM @ShowRunner_CMind_Bot (/start, /run). Digests + memory live in CreatorMind.",
  };
}
