import type { AppConfig, Decision, Observation } from "./types.js";
import { chatJson } from "./llm.js";

function heuristicDecide(observation: Observation): Decision {
  const voice = observation.profile.brandVoice;
  const memoryHints = observation.recentMemory
    .slice(0, 5)
    .map((m) => m.text)
    .join(" | ");
  const fromMemory = Boolean(memoryHints);

  if (observation.mode === "repurpose") {
    return {
      mode: "repurpose",
      rationale: `Adapt source into platform drafts using voice: ${voice.slice(0, 80)}`,
      plan: [
        "Extract core claim + proof points",
        "Draft YouTube Shorts / TikTok script",
        "Draft X thread",
        "Draft newsletter blurb",
        "Store format preferences in memory",
      ],
      fromMemory,
    };
  }

  if (observation.mode === "growth") {
    return {
      mode: "growth",
      rationale: `Propose growth next actions for goal "${observation.goal?.title ?? "general"}"`,
      plan: [
        "Review open goal brief",
        "Propose 3 hooks aligned to brand voice",
        "Draft 2 reply starters for likely comments",
        "Queue one follow-up experiment",
      ],
      fromMemory,
    };
  }

  return {
    mode: "moderation",
    rationale: "Triage community snapshot against learned norms",
    plan: [
      "Scan comments for spam, harassment, off-topic",
      "Apply community norms from profile memory",
      "Flag critical items; draft calm replies for warn-level",
      "Escalate critical to human via Telegram",
    ],
    fromMemory,
  };
}

export async function decide(
  observation: Observation,
  config?: AppConfig,
): Promise<Decision> {
  const fallback = heuristicDecide(observation);
  if (!config?.openaiApiKey) return fallback;

  const memory = observation.recentMemory
    .slice(0, 8)
    .map((m) => `- [${m.kind}] ${m.text}`)
    .join("\n");

  const planned = await chatJson<{
    rationale?: string;
    plan?: string[];
  }>(config, [
    {
      role: "system",
      content:
        "You are ShowRunner, a persistent creator-ops Mind. Return JSON with keys rationale (string) and plan (string array, 3-6 steps). Be concrete. Use brand voice and memory.",
    },
    {
      role: "user",
      content: JSON.stringify({
        mode: observation.mode,
        brandVoice: observation.profile.brandVoice,
        platforms: observation.profile.platforms,
        norms: observation.profile.communityNorms,
        goal: observation.goal
          ? { title: observation.goal.title, brief: observation.goal.brief }
          : null,
        sourceContent: observation.sourceContent?.slice(0, 2500) ?? null,
        commentsSnapshot: observation.commentsSnapshot?.slice(0, 2000) ?? null,
        memory,
      }),
    },
  ]);

  if (!planned?.plan?.length) return fallback;

  return {
    mode: observation.mode,
    rationale: planned.rationale?.trim() || fallback.rationale,
    plan: planned.plan.map(String).slice(0, 8),
    fromMemory: fallback.fromMemory || Boolean(memory),
  };
}
