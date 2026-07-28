import type { AppConfig, Mode } from "../types.js";
import type { Store } from "../store.js";
import { observe } from "../observe.js";
import { decide } from "../decide.js";
import { checkPolicy } from "../policy.js";
import { act } from "../act.js";
import { notifyMind } from "../minds/bridge.js";

export async function runCycle(opts: {
  config: AppConfig;
  store: Store;
  trigger: string;
  mode?: Mode;
  goalId?: string;
  sourceContent?: string;
  commentsSnapshot?: string;
  notify?: boolean;
  notifyChatId?: string;
}) {
  const { config, store, trigger } = opts;
  const observation = observe(store, {
    mode: opts.mode,
    goalId: opts.goalId,
    sourceContent: opts.sourceContent,
    commentsSnapshot: opts.commentsSnapshot,
  });

  const decision = await decide(observation);
  const policy = checkPolicy(config, store, observation, decision);

  const job = store.createJob({
    goalId: observation.goal?.id ?? "none",
    mode: observation.mode,
    trigger,
    status: "running",
  });

  if (!policy.allowed) {
    store.updateJob(job.id, { status: "blocked", error: policy.reasons.join("; ") });
    const audit = store.appendAudit({
      trigger,
      mode: observation.mode,
      goalId: observation.goal?.id,
      jobId: job.id,
      outcome: "blocked",
      rationale: decision.rationale,
      error: policy.reasons.join("; "),
    });
    store.markCycle(undefined, false);
    return { observation, decision, policy, job, audit, output: null };
  }

  try {
    const output = await act(config, store, observation, decision);
    store.updateJob(job.id, { status: "done", output });
    const audit = store.appendAudit({
      trigger,
      mode: observation.mode,
      goalId: observation.goal?.id,
      jobId: job.id,
      outcome: "success",
      rationale: decision.rationale,
      summary: output.summary,
    });
    store.updateJob(job.id, { auditId: audit.id });
    store.markCycle(undefined, true);

    if (observation.goal && observation.goal.status === "active") {
      store.addMemory({
        kind: "decision",
        mode: observation.mode,
        text: `Continued goal "${observation.goal.title}": ${output.summary}`,
      });
    }

    if (opts.notify !== false) {
      await notifyMind(
        config,
        store,
        {
          title: `ShowRunner · ${observation.mode}`,
          body: `${output.summary}\n\n${output.drafts
            .slice(0, 2)
            .map((d) => `• ${d.channel}: ${d.title}`)
            .join("\n")}`,
        },
        { chatId: opts.notifyChatId },
      );
    }

    return { observation, decision, policy, job: store.getJob(job.id), audit, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.updateJob(job.id, { status: "failed", error: message });
    const audit = store.appendAudit({
      trigger,
      mode: observation.mode,
      goalId: observation.goal?.id,
      jobId: job.id,
      outcome: "failed",
      rationale: decision.rationale,
      error: message,
    });
    store.markCycle(undefined, false);
    return { observation, decision, policy, job: store.getJob(job.id), audit, output: null };
  }
}
