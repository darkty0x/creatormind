import type { AppConfig, Decision, Observation, PolicyResult } from "./types.js";
import type { Store } from "./store.js";

export function checkPolicy(
  config: AppConfig,
  store: Store,
  observation: Observation,
  _decision: Decision,
): PolicyResult {
  const reasons: string[] = [];

  if (config.killSwitch) {
    reasons.push("Kill switch is on");
  }

  const recent = store.jobsInLastHour();
  if (recent.length >= config.maxJobsPerHour) {
    reasons.push(`Rate limit: ${config.maxJobsPerHour} jobs/hour`);
  }

  const last = store.meta().lastCycleAt;
  if (last) {
    const elapsed = (Date.now() - Date.parse(last)) / 1000;
    if (elapsed < config.cooldownSeconds) {
      reasons.push(`Cooldown ${Math.ceil(config.cooldownSeconds - elapsed)}s`);
    }
  }

  if (observation.mode === "repurpose" && !observation.sourceContent?.trim()) {
    reasons.push("Repurpose needs source content");
  }

  if (observation.mode === "moderation" && !observation.commentsSnapshot?.trim()) {
    reasons.push("Moderation needs a comments snapshot");
  }

  return { allowed: reasons.length === 0, reasons };
}
