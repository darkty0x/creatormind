import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.js";
import { runCycle } from "../src/agent/cycle.js";
import type { AppConfig } from "../src/types.js";

function testConfig(dataDir: string): AppConfig {
  return {
    port: 0,
    dataDir,
    killSwitch: false,
    cooldownSeconds: 0,
    maxJobsPerHour: 50,
    allowAutoPublish: false,
    openaiModel: "gpt-4o-mini",
    telegramAllowedChatIds: [],
    publicWebUrl: "http://localhost:3000",
    corsOrigins: ["http://localhost:3000"],
    schedulerCron: "*/5 * * * *",
  };
}

describe("runCycle", () => {
  let dir: string;
  let store: Store;
  let config: AppConfig;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cm-"));
    config = testConfig(dir);
    store = new Store(config);
  });

  it("repurposes source content into drafts", async () => {
    const goal = store.upsertGoal({
      title: "Ship clip from essay",
      mode: "repurpose",
      brief: "Turn essay into clips",
      sourceContent:
        "Most creators fail because they publish once and vanish. Consistency compounds when systems remember what worked.",
    });
    const result = await runCycle({
      config,
      store,
      trigger: "test",
      goalId: goal.id,
      notify: false,
    });
    expect(result.audit.outcome).toBe("success");
    expect(result.output?.drafts.length).toBeGreaterThan(0);
    expect(store.listMemory().some((m) => m.mode === "repurpose")).toBe(true);
  });

  it("blocks moderation without comments", async () => {
    const goal = store.upsertGoal({
      title: "Night triage",
      mode: "moderation",
      brief: "Triage chat",
    });
    const result = await runCycle({
      config,
      store,
      trigger: "test",
      goalId: goal.id,
      notify: false,
    });
    expect(result.audit.outcome).toBe("blocked");
  });
});
