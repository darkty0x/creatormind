import type { Mode, Observation } from "./types.js";
import type { Store } from "./store.js";

export function observe(
  store: Store,
  opts: {
    mode?: Mode;
    goalId?: string;
    sourceContent?: string;
    commentsSnapshot?: string;
  },
): Observation {
  const profile = store.getProfile();
  const goal = opts.goalId ? store.getGoal(opts.goalId) : store.listGoals().find((g) => g.status === "active");
  const mode = opts.mode ?? goal?.mode ?? "repurpose";
  return {
    at: new Date().toISOString(),
    profile,
    goal,
    mode,
    sourceContent: opts.sourceContent ?? goal?.sourceContent,
    commentsSnapshot: opts.commentsSnapshot ?? goal?.commentsSnapshot,
    recentMemory: store.listMemory(20),
    openGoals: store.listGoals().filter((g) => g.status === "active"),
  };
}
