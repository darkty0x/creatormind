"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createGoal, getStatus, runCycle } from "../lib/api";
import styles from "./page.module.css";

type Mode = "repurpose" | "growth" | "moderation";

const MODE_META: Record<
  Mode,
  { label: string; hint: string; field: "source" | "goal" | "comments" }
> = {
  repurpose: {
    label: "Repurpose",
    hint: "One piece → every channel",
    field: "source",
  },
  growth: {
    label: "Growth",
    hint: "Hooks, replies, next moves",
    field: "goal",
  },
  moderation: {
    label: "Moderation",
    hint: "Triage with your norms",
    field: "comments",
  },
};

export default function HomePage() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("repurpose");
  const [title, setTitle] = useState("Ship this week's multi-platform pack");
  const [source, setSource] = useState(
    "Most creators fail because they publish once and vanish. Consistency compounds when a system remembers what worked last week and follows up without being asked.",
  );
  const [comments, setComments] = useState(
    "Love this — more please\nBuy now http://spam.example\nThis is stupid and you suck\nHow do you schedule without burning out?",
  );
  const [lastOutput, setLastOutput] = useState<any>(null);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await getStatus();
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const live = Boolean(status?.live);
  const minds = status?.minds;
  const modeMeta = MODE_META[mode];

  const telegramHref = useMemo(
    () => "https://t.me/showrunner_mind_bot",
    [],
  );

  async function onSaveGoal(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      await createGoal({
        title,
        mode,
        brief: title,
        sourceContent: mode === "repurpose" || mode === "growth" ? source : undefined,
        commentsSnapshot:
          mode === "moderation" || mode === "growth" ? comments : undefined,
      });
      await refresh();
      setOkMsg("Goal saved to ShowRunner memory.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRun() {
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      await createGoal({
        title,
        mode,
        brief: title,
        sourceContent: mode === "repurpose" || mode === "growth" ? source : undefined,
        commentsSnapshot:
          mode === "moderation" || mode === "growth" ? comments : undefined,
      });
      const result = await runCycle({
        mode,
        sourceContent: source,
        commentsSnapshot: comments,
        trigger: "web",
        notify: true,
      });
      setLastOutput(result.output);
      setLastOutcome(result.audit?.outcome ?? null);
      await refresh();
      if (result.audit?.outcome !== "success") {
        setError(
          result.audit?.error ??
            result.policy?.reasons?.join("; ") ??
            "Blocked by policy",
        );
      } else {
        setOkMsg("Cycle complete — drafts ready. Telegram digests sent to known testers.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyDraft(key: string, body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  function scrollToWork() {
    document.getElementById("workbench")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.top}>
          <div className={styles.brandBlock}>
            <p className={styles.brand}>
              Show<span className={styles.brandMark}>Runner</span>
            </p>
            <p className={styles.product}>CreatorMind · Animoca Minds</p>
          </div>
          <nav className={styles.nav} aria-label="Links">
            <a href="https://github.com/darkty0x/creatormind" target="_blank" rel="noreferrer">
              Code
            </a>
            <a href="https://dorahacks.io/hackathon/creativeminds" target="_blank" rel="noreferrer">
              Hackathon
            </a>
            <a
              href={minds?.profileUrl ?? "https://app.hellominds.ai"}
              target="_blank"
              rel="noreferrer"
            >
              Mind
            </a>
            <span className={styles.badge} aria-live="polite">
              <span className={live ? styles.dot : styles.dotDown} />
              {live ? "Live" : "Connecting"}
            </span>
          </nav>
        </div>

        <div className={styles.heroCopy}>
          <h1>Your creator ops Mind that remembers — and follows up.</h1>
          <p>
            Repurpose, grow, and moderate from one persistent ShowRunner. Web and Telegram share
            memory. Drafts only until you approve publish.
          </p>
          <div className={styles.ctaRow}>
            <button type="button" className={styles.primary} onClick={scrollToWork}>
              Open workbench
            </button>
            <a className={styles.ghost} href={telegramHref} target="_blank" rel="noreferrer">
              DM @showrunner_mind_bot
            </a>
          </div>
          <p className={styles.metaLine}>
            Open DMs for testers · {minds?.knownTesters ?? 0} known
            {minds?.llmEnabled ? " · LLM on" : " · heuristic mode"} · Last success{" "}
            {status?.meta?.lastSuccessAt
              ? new Date(status.meta.lastSuccessAt).toLocaleString()
              : "—"}
          </p>
        </div>
      </header>

      <main className={styles.work} id="workbench">
        <div className={styles.sectionHead}>
          <div>
            <h2>Workbench</h2>
            <p>Pick a mode. Feed ShowRunner. Run. Continuity stays in memory.</p>
          </div>
        </div>

        <div className={styles.modes} role="tablist" aria-label="Modes">
          {(Object.keys(MODE_META) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={mode === m ? styles.modeOn : styles.mode}
              onClick={() => setMode(m)}
            >
              <span className={styles.modeLabel}>{MODE_META[m].label}</span>
              <span className={styles.modeHint}>{MODE_META[m].hint}</span>
            </button>
          ))}
        </div>

        <div className={styles.bench}>
          <form className={styles.form} onSubmit={onSaveGoal}>
            <label>
              Goal title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="What should ShowRunner own this week?"
              />
            </label>

            {(modeMeta.field === "source" || modeMeta.field === "goal") && (
              <label>
                {mode === "growth" ? "Context / source (optional)" : "Source content"}
                <textarea
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  rows={mode === "repurpose" ? 8 : 5}
                  placeholder="Paste the long-form piece or brief…"
                />
              </label>
            )}

            {(modeMeta.field === "comments" || mode === "growth") && (
              <label>
                {mode === "moderation" ? "Comments / community snapshot" : "Audience signals (optional)"}
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={mode === "moderation" ? 8 : 4}
                  placeholder="One comment per line…"
                />
              </label>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                disabled={busy}
                onClick={onRun}
              >
                {busy ? "Running…" : `Run ${modeMeta.label}`}
              </button>
              <button type="submit" className={styles.secondary} disabled={busy}>
                Save goal only
              </button>
            </div>
            {error ? <p className={styles.err}>{error}</p> : null}
            {okMsg ? <p className={styles.okMsg}>{okMsg}</p> : null}
          </form>

          <section className={styles.out} aria-live="polite">
            <div className={styles.outHead}>
              <h3>Output</h3>
              {lastOutcome ? <span className={styles.outcome}>{lastOutcome}</span> : null}
            </div>

            {!lastOutput ? (
              <p className={styles.empty}>
                Nothing yet. Run {modeMeta.label.toLowerCase()} to see drafts, flags, and follow-ups
                here — same trail Telegram testers get.
              </p>
            ) : (
              <>
                <p className={styles.summary}>{lastOutput.summary}</p>
                {lastOutput.drafts?.map((d: any) => {
                  const key = `${d.channel}-${d.title}`;
                  return (
                    <article key={key} className={styles.draft}>
                      <div className={styles.draftTop}>
                        <strong>
                          {d.channel} · {d.title}
                        </strong>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => copyDraft(key, d.body)}
                        >
                          {copied === key ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre>{d.body}</pre>
                    </article>
                  );
                })}
                {lastOutput.flags?.length ? (
                  <div className={styles.flags}>
                    {lastOutput.flags.map((f: any, i: number) => (
                      <div
                        key={`${f.severity}-${i}`}
                        className={
                          f.severity === "critical"
                            ? styles.flagCritical
                            : f.severity === "warn"
                              ? styles.flagWarn
                              : styles.flag
                        }
                      >
                        <strong>{f.severity}</strong> — {f.text}
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>

        <section className={styles.trail}>
          <div>
            <h3>Memory</h3>
            <p>What ShowRunner keeps across sessions.</p>
            <ul className={styles.list}>
              {(status?.memory ?? []).slice(0, 6).map((m: any) => (
                <li key={m.id}>
                  <strong>{m.kind}</strong> — {m.text}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Audit</h3>
            <p>Real outcomes — success, blocked, failed.</p>
            <ul className={styles.list}>
              {(status?.audit ?? []).slice(0, 6).map((a: any) => (
                <li key={a.id}>
                  <strong>{a.outcome}</strong> · {a.mode} ·{" "}
                  {a.summary ?? a.error ?? a.rationale}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className={styles.foot}>
        <p>
          Mind{" "}
          <a href={minds?.profileUrl} target="_blank" rel="noreferrer">
            {minds?.name ?? "ShowRunner"}
          </a>{" "}
          ·{" "}
          <a href="https://github.com/darkty0x/creatormind" target="_blank" rel="noreferrer">
            GitHub
          </a>{" "}
          · open DMs on{" "}
          <a href={telegramHref} target="_blank" rel="noreferrer">
            @showrunner_mind_bot
          </a>{" "}
          · Creative Minds Jam
        </p>
      </footer>
    </div>
  );
}
