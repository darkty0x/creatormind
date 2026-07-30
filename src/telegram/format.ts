import type { Mode, ModeOutput } from "../types.js";

/** Escape for Telegram HTML parse_mode. */
export function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function modeLabel(mode: Mode): string {
  if (mode === "repurpose") return "Repurpose";
  if (mode === "growth") return "Growth";
  return "Moderation";
}

export function welcomeMessage(webUrl?: string): string {
  const site = webUrl ? `\n🌐 Web: ${esc(webUrl)}` : "";
  return [
    "<b>ShowRunner</b> is ready.",
    "",
    "I'm your creator-ops Mind — I remember voice, goals, and follow-ups across sessions.",
    "",
    "<b>Quick start</b>",
    "• /run repurpose — turn long-form into channel drafts",
    "• /run growth — hooks + next audience moves",
    "• /run moderation — triage comments with your norms",
    "• /goal repurpose | Ship weekly clips — save a goal",
    "• /status — what's on the board",
    "• /help — full command list",
    "",
    "Or just send a note — I'll save it to memory.",
    site,
    "",
    "<i>Open DMs for testers · drafts only until you approve publish</i>",
  ].join("\n");
}

export function helpMessage(): string {
  return [
    "<b>ShowRunner commands</b>",
    "",
    "<b>/start</b> — welcome + link this chat for digests",
    "<b>/help</b> — this guide",
    "<b>/status</b> — goals, memory, last success",
    "<b>/goal</b> <code>mode | title</code>",
    "  Modes: <code>repurpose</code> · <code>growth</code> · <code>moderation</code>",
    "  Example: <code>/goal growth | Grow Shorts watch time</code>",
    "<b>/run</b> <code>[mode]</code> — run a cycle now",
    "  Example: <code>/run repurpose</code>",
    "",
    "Paste free text anytime to add a memory note, then /run.",
    "",
    "<i>Tip: set content on the web workbench for richer repurpose/moderation runs.</i>",
  ].join("\n");
}

export function statusMessage(opts: {
  goalsActive: number;
  memoryCount: number;
  testers: number;
  lastSuccessAt?: string | null;
  llmEnabled: boolean;
  topGoals: Array<{ mode: Mode; title: string }>;
}): string {
  const last = opts.lastSuccessAt
    ? esc(new Date(opts.lastSuccessAt).toLocaleString())
    : "—";
  const goals =
    opts.topGoals.length === 0
      ? "None yet — try /goal repurpose | Ship weekly clips"
      : opts.topGoals
          .map((g) => `• <b>${esc(modeLabel(g.mode))}</b> — ${esc(g.title)}`)
          .join("\n");

  return [
    "<b>ShowRunner status</b>",
    "",
    `✅ Last success: ${last}`,
    `🎯 Active goals: ${opts.goalsActive}`,
    `🧠 Memory notes: ${opts.memoryCount}`,
    `👥 Linked testers: ${opts.testers}`,
    `✨ Generation: ${opts.llmEnabled ? "LLM on" : "smart heuristics"}`,
    "",
    "<b>Active goals</b>",
    goals,
  ].join("\n");
}

export function goalSavedMessage(mode: Mode, title: string): string {
  return [
    "<b>Goal saved</b>",
    "",
    `Mode: <b>${esc(modeLabel(mode))}</b>`,
    `Title: ${esc(title)}`,
    "",
    "Next: /run " + esc(mode) + " — or open the web workbench to add source/comments.",
  ].join("\n");
}

export function runningMessage(mode?: Mode): string {
  const label = mode ? modeLabel(mode) : "your latest goal";
  return `⏳ Running <b>${esc(label)}</b>… hang tight.`;
}

export function successRunMessage(opts: {
  mode: Mode;
  summary: string;
  output: ModeOutput;
  webUrl?: string;
}): string {
  const drafts = opts.output.drafts.slice(0, 3).map((d, i) => {
    const body = esc(d.body.slice(0, 420)) + (d.body.length > 420 ? "…" : "");
    return `<b>${i + 1}. ${esc(d.channel)}</b> — ${esc(d.title)}\n${body}`;
  });

  const flags =
    opts.output.flags
      ?.filter((f) => f.severity !== "info")
      .slice(0, 4)
      .map((f) => `• <b>${esc(f.severity)}</b>: ${esc(f.text.slice(0, 160))}`)
      .join("\n") ?? "";

  const parts = [
    `<b>Done · ${esc(modeLabel(opts.mode))}</b>`,
    "",
    esc(opts.summary),
    "",
    "<b>Drafts</b> (copy what you need)",
    drafts.join("\n\n") || "No drafts this run.",
  ];

  if (flags) {
    parts.push("", "<b>Flags</b>", flags);
  }

  parts.push(
    "",
    "<i>Draft-only — nothing was published.</i>",
  );
  if (opts.webUrl) {
    parts.push(`Full board: ${esc(opts.webUrl)}`);
  }
  return parts.join("\n");
}

export function blockedRunMessage(reason: string): string {
  return [
    "<b>Paused</b>",
    "",
    esc(reason),
    "",
    "Common fixes:",
    "• Repurpose needs source text (add on web, or /goal then paste content on web)",
    "• Moderation needs a comments snapshot",
    "• Wait a few seconds if cooldown just fired",
    "",
    "Then try /run again.",
  ].join("\n");
}

export function failedRunMessage(error: string): string {
  return [
    "<b>Something went wrong</b>",
    "",
    esc(error),
    "",
    "Try /status, then /run again. If it keeps failing, check the Live web board.",
  ].join("\n");
}

export function memoryNoteMessage(): string {
  return [
    "<b>Saved to memory</b>",
    "",
    "Got it — ShowRunner will use this on the next run.",
    "When you're ready: /run repurpose · /run growth · /run moderation",
  ].join("\n");
}

export function unauthorizedMessage(): string {
  return "This chat isn't allowed to talk to ShowRunner yet.";
}

export function digestMessage(opts: {
  mode: Mode;
  summary: string;
  draftLines: string[];
  webUrl?: string;
}): string {
  const lines = opts.draftLines.slice(0, 3).map((l) => `• ${esc(l)}`);
  const parts = [
    `<b>ShowRunner follow-up · ${esc(modeLabel(opts.mode))}</b>`,
    "",
    esc(opts.summary),
    "",
    "<b>Ready for you</b>",
    lines.join("\n") || "• Open the board for drafts",
    "",
    "<i>Autonomous digest — drafts only</i>",
  ];
  if (opts.webUrl) parts.push(esc(opts.webUrl));
  return parts.join("\n");
}
