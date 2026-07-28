import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AppConfig,
  AuditEvent,
  CreatorProfile,
  Goal,
  Job,
  MemoryEntry,
} from "./types.js";

type DbShape = {
  profile: CreatorProfile;
  memory: MemoryEntry[];
  goals: Goal[];
  jobs: Job[];
  meta: {
    lastSuccessAt?: string;
    lastCycleAt?: string;
    telegramChats?: string[];
  };
};

const defaultProfile = (): CreatorProfile => ({
  id: "default",
  kind: "multiplatform",
  displayName: "ShowRunner",
  brandVoice: "Clear, direct, useful. No hype. Talk like a peer.",
  platforms: ["youtube", "x", "tiktok", "newsletter"],
  communityNorms: [
    "No harassment",
    "Stay on topic",
    "No spam links",
    "Assume good intent once, then escalate",
  ],
  updatedAt: new Date().toISOString(),
});

export class Store {
  private path: string;
  private auditPath: string;
  private db: DbShape;

  constructor(private config: AppConfig) {
    mkdirSync(config.dataDir, { recursive: true });
    this.path = join(config.dataDir, "store.json");
    this.auditPath = join(config.dataDir, "audit.jsonl");
    this.db = this.load();
  }

  private load(): DbShape {
    if (!existsSync(this.path)) {
      const fresh: DbShape = {
        profile: {
          ...defaultProfile(),
          displayName: this.config.mindsName ?? "ShowRunner",
          mindsProfileUrl: this.config.mindsProfileUrl,
          mindsId: this.config.mindsId,
          mindsName: this.config.mindsName ?? "ShowRunner",
          mindsEmail: this.config.mindsEmail,
          telegramChatId: this.config.mindsNotifyChatId,
        },
        memory: [
          {
            id: randomUUID(),
            at: new Date().toISOString(),
            kind: "brand",
            text: "Brand voice initialized. Prefer concrete next actions over fluff.",
          },
        ],
        goals: [],
        jobs: [],
        meta: {},
      };
      this.persist(fresh);
      return fresh;
    }
    return JSON.parse(readFileSync(this.path, "utf8")) as DbShape;
  }

  private persist(db = this.db) {
    writeFileSync(this.path, JSON.stringify(db, null, 2));
  }

  getProfile() {
    return this.db.profile;
  }

  updateProfile(patch: Partial<CreatorProfile>) {
    this.db.profile = {
      ...this.db.profile,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.db.profile;
  }

  listMemory(limit = 40) {
    return [...this.db.memory].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  }

  addMemory(entry: Omit<MemoryEntry, "id" | "at"> & { id?: string; at?: string }) {
    const row: MemoryEntry = {
      id: entry.id ?? randomUUID(),
      at: entry.at ?? new Date().toISOString(),
      kind: entry.kind,
      text: entry.text,
      mode: entry.mode,
      meta: entry.meta,
    };
    this.db.memory.push(row);
    this.persist();
    return row;
  }

  listGoals() {
    return [...this.db.goals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getGoal(id: string) {
    return this.db.goals.find((g) => g.id === id);
  }

  upsertGoal(input: Omit<Goal, "id" | "createdAt" | "updatedAt" | "status"> & {
    id?: string;
    status?: Goal["status"];
  }) {
    const now = new Date().toISOString();
    if (input.id) {
      const existing = this.getGoal(input.id);
      if (existing) {
        Object.assign(existing, input, { updatedAt: now });
        this.persist();
        return existing;
      }
    }
    const goal: Goal = {
      id: input.id ?? randomUUID(),
      title: input.title,
      mode: input.mode,
      status: input.status ?? "active",
      brief: input.brief,
      sourceContent: input.sourceContent,
      commentsSnapshot: input.commentsSnapshot,
      dueAt: input.dueAt,
      createdAt: now,
      updatedAt: now,
    };
    this.db.goals.unshift(goal);
    this.persist();
    return goal;
  }

  listJobs(limit = 50) {
    return [...this.db.jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  getJob(id: string) {
    return this.db.jobs.find((j) => j.id === id);
  }

  createJob(partial: Omit<Job, "id" | "createdAt" | "updatedAt" | "status"> & {
    status?: Job["status"];
  }) {
    const now = new Date().toISOString();
    const job: Job = {
      id: randomUUID(),
      goalId: partial.goalId,
      mode: partial.mode,
      status: partial.status ?? "queued",
      trigger: partial.trigger,
      createdAt: now,
      updatedAt: now,
      output: partial.output,
      error: partial.error,
      auditId: partial.auditId,
    };
    this.db.jobs.unshift(job);
    this.persist();
    return job;
  }

  updateJob(id: string, patch: Partial<Job>) {
    const job = this.getJob(id);
    if (!job) return undefined;
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    this.persist();
    return job;
  }

  jobsInLastHour() {
    const cutoff = Date.now() - 60 * 60 * 1000;
    return this.db.jobs.filter((j) => Date.parse(j.createdAt) >= cutoff);
  }

  markCycle(at = new Date().toISOString(), success = false) {
    this.db.meta.lastCycleAt = at;
    if (success) this.db.meta.lastSuccessAt = at;
    this.persist();
  }

  rememberTelegramChat(chatId: string | number) {
    const id = String(chatId);
    const list = this.db.meta.telegramChats ?? [];
    if (!list.includes(id)) {
      this.db.meta.telegramChats = [id, ...list].slice(0, 100);
    }
    this.db.profile.telegramChatId = id;
    this.db.profile.updatedAt = new Date().toISOString();
    this.persist();
  }

  listTelegramChats() {
    const fromMeta = this.db.meta.telegramChats ?? [];
    const fallback = this.db.profile.telegramChatId
      ? [this.db.profile.telegramChatId]
      : [];
    return [...new Set([...fromMeta, ...fallback])];
  }

  meta() {
    return this.db.meta;
  }

  appendAudit(event: Omit<AuditEvent, "id" | "at"> & { id?: string; at?: string }) {
    const row: AuditEvent = {
      id: event.id ?? randomUUID(),
      at: event.at ?? new Date().toISOString(),
      trigger: event.trigger,
      mode: event.mode,
      goalId: event.goalId,
      jobId: event.jobId,
      outcome: event.outcome,
      rationale: event.rationale,
      summary: event.summary,
      error: event.error,
    };
    appendFileSync(this.auditPath, `${JSON.stringify(row)}\n`);
    return row;
  }

  listAudit(limit = 50): AuditEvent[] {
    if (!existsSync(this.auditPath)) return [];
    const lines = readFileSync(this.auditPath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean);
    return lines
      .slice(-limit)
      .map((l) => JSON.parse(l) as AuditEvent)
      .reverse();
  }
}
