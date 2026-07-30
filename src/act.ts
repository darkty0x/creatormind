import type { AppConfig, Decision, ModeOutput, Observation } from "./types.js";
import type { Store } from "./store.js";
import { chatJson } from "./llm.js";

function clip(text: string, n = 280) {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function claimFrom(source: string) {
  const line = source
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => l.length > 40);
  return clip(line ?? source, 160);
}

function heuristicAct(
  config: AppConfig,
  store: Store,
  observation: Observation,
  decision: Decision,
): ModeOutput {
  const voice = observation.profile.brandVoice;
  const source = observation.sourceContent?.trim() ?? "";
  const comments = observation.commentsSnapshot?.trim() ?? "";

  if (decision.mode === "repurpose") {
    const claim = claimFrom(source || observation.goal?.brief || "Untitled idea");
    const output: ModeOutput = {
      mode: "repurpose",
      summary: `Repurposed into ${observation.profile.platforms.length} channel drafts (draft-only).`,
      drafts: [
        {
          channel: "shorts",
          title: "Vertical script",
          body: `HOOK: ${claim}\n\nBeat 1 — problem\nBeat 2 — proof\nBeat 3 — one concrete tip\nCTA: follow for the long version\n\nVoice: ${voice}`,
        },
        {
          channel: "x",
          title: "Thread",
          body: `1/ ${claim}\n2/ Why it matters now\n3/ The mistake most people make\n4/ Do this instead\n5/ Save + reply with your take`,
        },
        {
          channel: "newsletter",
          title: "Email blurb",
          body: `Subject: ${claim}\n\nHey — quick one.\n\n${clip(source || observation.goal?.brief || "", 500)}\n\nIf you want the full breakdown, hit reply.`,
        },
      ],
      actions: [
        { label: "Review drafts", detail: "Approve in web before any publish" },
        {
          label: "Remember format",
          detail: "Saved shorts→thread→newsletter order to memory",
        },
      ],
    };
    store.addMemory({
      kind: "content",
      mode: "repurpose",
      text: `Repurposed claim: ${claim}`,
    });
    if (!config.allowAutoPublish) {
      store.addMemory({
        kind: "decision",
        mode: "repurpose",
        text: "Publish blocked by policy — drafts only until ALLOW_AUTO_PUBLISH=1",
      });
    }
    return output;
  }

  if (decision.mode === "growth") {
    const topic = observation.goal?.title ?? "audience growth";
    const output: ModeOutput = {
      mode: "growth",
      summary: `Growth pack for "${topic}" grounded in brand voice + memory.`,
      drafts: [
        {
          channel: "hooks",
          title: "Hook options",
          body: `1. ${topic}: what nobody says out loud\n2. I tested this for 7 days — here's what moved\n3. Stop doing X if you care about ${topic}`,
        },
        {
          channel: "replies",
          title: "Reply starters",
          body: `• Appreciate you raising this — here's the short version…\n• Good question. The constraint is usually…\n• If you're stuck at this stage, try…`,
        },
      ],
      actions: [
        {
          label: "Follow-up experiment",
          detail: "Post one hook variant within 48h; Mind will ask for outcome",
        },
        {
          label: "Audience note",
          detail: "Remember creators who engage with concrete questions",
        },
      ],
    };
    store.addMemory({
      kind: "audience",
      mode: "growth",
      text: `Growth experiment queued for goal: ${topic}`,
    });
    return output;
  }

  const norms = observation.profile.communityNorms.join("; ");
  const lines = comments
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const flags = lines.slice(0, 12).map((text) => {
    const lower = text.toLowerCase();
    if (/(https?:\/\/|buy now|crypto pump|dm me)/i.test(lower)) {
      return { severity: "critical" as const, text };
    }
    if (/(idiot|hate|kill|stupid)/i.test(lower)) {
      return { severity: "warn" as const, text };
    }
    return { severity: "info" as const, text };
  });

  const output: ModeOutput = {
    mode: "moderation",
    summary: `Triaged ${lines.length || 0} comments against norms (${norms}).`,
    drafts: flags
      .filter((f) => f.severity !== "info")
      .slice(0, 5)
      .map((f, i) => ({
        channel: "mod-reply",
        title: `Draft reply ${i + 1} (${f.severity})`,
        body:
          f.severity === "critical"
            ? `Remove/report. Public note: "Links and spam get removed — ask in-topic next time."`
            : `Hey — let's keep this constructive. Challenge the idea, not the person.`,
      })),
    actions: [
      {
        label: "Escalate critical",
        detail: "Critical flags notified on Telegram / Mind digest",
      },
    ],
    flags,
  };
  store.addMemory({
    kind: "moderation",
    mode: "moderation",
    text: `Moderation pass: ${flags.filter((f) => f.severity !== "info").length} flagged`,
  });
  return output;
}

type LlmAct = {
  summary?: string;
  drafts?: Array<{ channel?: string; title?: string; body?: string }>;
  actions?: Array<{ label?: string; detail?: string }>;
  flags?: Array<{ severity?: string; text?: string }>;
};

export async function act(
  config: AppConfig,
  store: Store,
  observation: Observation,
  decision: Decision,
): Promise<ModeOutput> {
  const fallback = heuristicAct(config, store, observation, decision);
  if (!config.openaiApiKey) return fallback;

  const memory = observation.recentMemory
    .slice(0, 8)
    .map((m) => `- [${m.kind}] ${m.text}`)
    .join("\n");

  const generated = await chatJson<LlmAct>(config, [
    {
      role: "system",
      content:
        "You are ShowRunner. Produce creator-ready drafts. Return JSON: summary (string), drafts (array of {channel,title,body}), actions (array of {label,detail}), optional flags (array of {severity: info|warn|critical, text}). Draft-only — never claim you published. Match brand voice. Keep bodies concrete and usable.",
    },
    {
      role: "user",
      content: JSON.stringify({
        mode: decision.mode,
        plan: decision.plan,
        rationale: decision.rationale,
        brandVoice: observation.profile.brandVoice,
        platforms: observation.profile.platforms,
        norms: observation.profile.communityNorms,
        goal: observation.goal,
        sourceContent: observation.sourceContent?.slice(0, 3500) ?? null,
        commentsSnapshot: observation.commentsSnapshot?.slice(0, 2500) ?? null,
        memory,
        allowAutoPublish: config.allowAutoPublish,
      }),
    },
  ]);

  if (!generated?.drafts?.length) return fallback;

  const output: ModeOutput = {
    mode: decision.mode,
    summary: generated.summary?.trim() || fallback.summary,
    drafts: generated.drafts
      .filter((d) => d?.body)
      .slice(0, 6)
      .map((d) => ({
        channel: String(d.channel ?? "draft"),
        title: String(d.title ?? "Draft"),
        body: String(d.body),
      })),
    actions: (generated.actions ?? fallback.actions)
      .filter((a) => a?.label)
      .slice(0, 6)
      .map((a) => ({
        label: String(a.label),
        detail: String(a.detail ?? ""),
      })),
    flags: (generated.flags ?? fallback.flags)
      ?.filter((f) => f?.text)
      .slice(0, 12)
      .map((f) => {
        const severity =
          f.severity === "critical" || f.severity === "warn" || f.severity === "info"
            ? f.severity
            : "info";
        return { severity, text: String(f.text) };
      }),
  };

  store.addMemory({
    kind: decision.mode === "moderation" ? "moderation" : decision.mode === "growth" ? "audience" : "content",
    mode: decision.mode,
    text: `LLM ${decision.mode}: ${output.summary}`,
  });
  if (!config.allowAutoPublish) {
    store.addMemory({
      kind: "decision",
      mode: decision.mode,
      text: "Publish blocked by policy — drafts only until ALLOW_AUTO_PUBLISH=1",
    });
  }
  return output;
}
