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
    const due = store
      .listGoals()
      .filter((g) => g.status === "active")
      .slice(0, 1);
    if (due.length === 0) return;

    const goal = due[0];
    try {
      const result = await runCycle({
        config,
        store,
        trigger: "scheduler",
        goalId: goal.id,
        mode: goal.mode,
        notify: true,
      });
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
