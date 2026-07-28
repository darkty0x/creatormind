import type { AppConfig } from "../types.js";
import type { Store } from "../store.js";

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
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) {
    return { ok: false as const, err: await res.text(), chatId };
  }
  return { ok: true as const, chatId };
}

/** Animoca Minds bridge — open DMs: notify requester or all known testers. */
export async function notifyMind(
  config: AppConfig,
  store: Store,
  payload: { title: string; body: string },
  opts?: { chatId?: string },
) {
  const profile = store.getProfile();
  const text = `*${payload.title}*\n\n${payload.body}\n\n_ShowRunner (Animoca Mind) · CreatorMind digest_`;

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
  return {
    integral: true,
    name: profile.mindsName ?? config.mindsName ?? "ShowRunner",
    id: profile.mindsId ?? config.mindsId ?? null,
    profileUrl: profile.mindsProfileUrl ?? config.mindsProfileUrl ?? null,
    email: profile.mindsEmail ?? config.mindsEmail ?? null,
    openDm: config.telegramAllowedChatIds.length === 0,
    knownTesters: chats.length,
    notifyChatId: config.mindsNotifyChatId ?? profile.telegramChatId ?? null,
    bot: "@showrunner_mind_bot",
    setup:
      "Anyone can DM @showrunner_mind_bot — /start then /run. No channel required.",
  };
}
