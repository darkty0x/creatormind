import type { Decision, Observation } from "./types.js";

export async function decide(observation: Observation): Promise<Decision> {
  const voice = observation.profile.brandVoice;
  const memoryHints = observation.recentMemory
    .slice(0, 5)
    .map((m) => m.text)
    .join(" | ");

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
      fromMemory: Boolean(memoryHints),
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
      fromMemory: Boolean(memoryHints),
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
    fromMemory: Boolean(memoryHints),
  };
}
