import cron from "node-cron";
import type { AppConfig } from "./types.js";
import type { Store } from "./store.js";
import { runCycle } from "./agent/cycle.js";

export function startScheduler(config: AppConfig, store: Store) {
  if (!cron.validate(config.schedulerCron)) {
    console.warn("[scheduler] invalid cron, skipping:", config.schedulerCron);
    return { stop() {} };
  }

  const task = cron.schedule(config.schedulerCron, async () => {
    if (config.killSwitch) return;

    const now = Date.now();
    const due = store
      .listGoals()
      .filter((g) => g.status === "active")
      .filter((g) => !g.dueAt || Date.parse(g.dueAt) <= now)
      .sort((a, b) => {
        const ad = a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER;
        const bd = b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER;
        return ad - bd;
      });

    const goal = due[0];
    if (!goal) return;

    // Skip if this goal already succeeded recently (avoid digest spam).
    const recent = store
      .listJobs(20)
      .find(
        (j) =>
          j.goalId === goal.id &&
          j.status === "done" &&
          Date.now() - Date.parse(j.createdAt) < 30 * 60 * 1000,
      );
    if (recent) return;

    // Don't spam audit with blocked "needs source" from incomplete goals.
    if (goal.mode === "repurpose" && !goal.sourceContent?.trim()) return;
    if (goal.mode === "moderation" && !goal.commentsSnapshot?.trim()) return;

    try {
      const result = await runCycle({
        config,
        store,
        trigger: "scheduler",
        goalId: goal.id,
        mode: goal.mode,
        sourceContent: goal.sourceContent,
        commentsSnapshot: goal.commentsSnapshot,
        notify: true,
      });
      if (result.audit.outcome === "success") {
        store.addMemory({
          kind: "decision",
          mode: goal.mode,
          text: `Autonomous follow-up completed for goal "${goal.title}"`,
        });
        // Keep goal active for recurring creator ops, but bump updatedAt via upsert.
        store.upsertGoal({
          id: goal.id,
          title: goal.title,
          mode: goal.mode,
          brief: goal.brief,
          sourceContent: goal.sourceContent,
          commentsSnapshot: goal.commentsSnapshot,
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
        });
      }
      console.log(
        `[scheduler] goal=${goal.id} outcome=${result.audit.outcome}`,
      );
    } catch (err) {
      console.error("[scheduler]", err);
    }
  });

  return {
    stop() {
      task.stop();
    },
  };
}
