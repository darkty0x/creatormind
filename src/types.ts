export type CreatorProfileKind =
  | "youtuber"
  | "streamer"
  | "multiplatform"
  | "web3";

export type Mode = "repurpose" | "growth" | "moderation";

export type GoalStatus = "active" | "blocked" | "done";

export type JobStatus = "queued" | "running" | "done" | "failed" | "blocked";

export interface CreatorProfile {
  id: string;
  kind: CreatorProfileKind;
  displayName: string;
  brandVoice: string;
  platforms: string[];
  communityNorms: string[];
  mindsProfileUrl?: string;
  mindsId?: string;
  mindsName?: string;
  mindsEmail?: string;
  telegramChatId?: string;
  updatedAt: string;
}

export interface MemoryEntry {
  id: string;
  at: string;
  kind: "brand" | "audience" | "content" | "moderation" | "decision" | "note";
  text: string;
  mode?: Mode;
  meta?: Record<string, unknown>;
}

export interface Goal {
  id: string;
  title: string;
  mode: Mode;
  status: GoalStatus;
  brief: string;
  sourceContent?: string;
  commentsSnapshot?: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  goalId: string;
  mode: Mode;
  status: JobStatus;
  trigger: string;
  createdAt: string;
  updatedAt: string;
  output?: ModeOutput;
  error?: string;
  auditId?: string;
}

export interface ModeOutput {
  mode: Mode;
  summary: string;
  drafts: Array<{ channel: string; title: string; body: string }>;
  actions: Array<{ label: string; detail: string }>;
  flags?: Array<{ severity: "info" | "warn" | "critical"; text: string }>;
}

export interface Observation {
  at: string;
  profile: CreatorProfile;
  goal?: Goal;
  mode: Mode;
  sourceContent?: string;
  commentsSnapshot?: string;
  recentMemory: MemoryEntry[];
  openGoals: Goal[];
}

export interface Decision {
  mode: Mode;
  rationale: string;
  plan: string[];
  fromMemory: boolean;
}

export interface PolicyResult {
  allowed: boolean;
  reasons: string[];
}

export interface AuditEvent {
  id: string;
  at: string;
  trigger: string;
  mode: Mode;
  goalId?: string;
  jobId?: string;
  outcome: "success" | "blocked" | "failed" | "noop";
  rationale?: string;
  summary?: string;
  error?: string;
}

export interface AppConfig {
  port: number;
  dataDir: string;
  killSwitch: boolean;
  cooldownSeconds: number;
  maxJobsPerHour: number;
  allowAutoPublish: boolean;
  openaiApiKey?: string;
  openaiModel: string;
  telegramBotToken?: string;
  telegramAllowedChatIds: string[];
  mindsNotifyChatId?: string;
  mindsProfileUrl?: string;
  mindsId?: string;
  mindsName?: string;
  mindsEmail?: string;
  publicWebUrl: string;
  corsOrigins: string[];
  schedulerCron: string;
  apiKey?: string;
  telegramWebhookSecret?: string;
}
