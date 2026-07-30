#!/usr/bin/env node
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { existsSync, unlinkSync } from "node:fs";

const PWCLI = `${process.env.HOME}/.codex/skills/playwright/scripts/playwright_cli.sh`;
const APP = "https://web-production-c0a0b2.up.railway.app/";
const OUT_WEBM = "/Users/dell/Downloads/CreatorMind-ShowRunner-Submission.webm";
const OUT_MP4 = "/Users/dell/Downloads/CreatorMind-ShowRunner-Submission.mp4";

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => {
      if (code !== 0 && !opts.allowFail) reject(new Error(`${cmd} ${args.join(" ")}\n${out}`));
      else resolve(out);
    });
  });
}

async function pw(...args) {
  const out = await run(PWCLI, args, { allowFail: true });
  process.stdout.write(out.slice(0, 400) + (out.length > 400 ? "…\n" : "\n"));
  return out;
}

function cardJs(title, sub) {
  const t = JSON.stringify(title);
  const s = JSON.stringify(sub);
  return `(() => {
    let el = document.getElementById('hack-card');
    if (!el) { el = document.createElement('div'); el.id = 'hack-card'; document.body.appendChild(el); }
    el.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:48px;background:radial-gradient(ellipse at 70% 20%,rgba(26,168,181,.28),transparent 50%),#0a1628;font-family:Sora,Plus Jakarta Sans,sans-serif;text-align:center;';
    el.style.display = 'flex';
    el.innerHTML = '<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1aa8b5;font-weight:600;font-family:IBM Plex Mono,monospace">Creative Minds Jam</div><div style="font-size:44px;line-height:1.1;font-weight:700;color:#fff;max-width:880px;letter-spacing:-.03em">' + ${t} + '</div><div style="font-size:18px;line-height:1.45;color:rgba(232,238,246,.72);max-width:640px">' + ${s} + '</div>';
  })()`;
}

const hide = `(() => { const el = document.getElementById('hack-card'); if (el) el.style.display = 'none'; })()`;

async function card(title, sub, secs = 4) {
  await pw("eval", cardJs(title, sub));
  await sleep(secs * 1000);
}

async function main() {
  for (const f of [OUT_WEBM, OUT_MP4]) if (existsSync(f)) unlinkSync(f);
  await pw("close").catch(() => {});
  await pw("open", APP);
  await sleep(2000);
  await pw("resize", "1440", "900");
  await sleep(4000);
  await pw("video-start", OUT_WEBM);

  // ~110s total target for 1.5–2 min jam requirement
  await card("ShowRunner", "Creator ops Mind that remembers — and follows up", 6);
  await card("The problem", "Creator tools reset every session. Memory and follow-up should not.", 5);
  await pw("eval", hide);
  await sleep(4500); // show redesigned hero
  await pw("eval", "window.scrollTo({top:120,behavior:'smooth'})");
  await sleep(2500);
  await pw("eval", "document.getElementById('workbench')?.scrollIntoView({behavior:'smooth'})");
  await sleep(3000);
  await pw("eval", `[...document.querySelectorAll('button')].find(b=>/Growth/i.test(b.textContent||'') && (b.getAttribute('role')==='tab'))?.click()`);
  await sleep(2500);
  await pw("eval", `[...document.querySelectorAll('button')].find(b=>/Repurpose/i.test(b.textContent||'') && (b.getAttribute('role')==='tab'))?.click()`);
  await sleep(2000);
  await pw("eval", `[...document.querySelectorAll('button')].find(b=>/Run Repurpose/i.test(b.textContent||''))?.click()`);
  await sleep(14000);
  await pw("eval", "window.scrollTo({top: document.body.scrollHeight * 0.45, behavior:'smooth'})");
  await sleep(5000);
  await pw("eval", "window.scrollTo({top: document.body.scrollHeight * 0.72, behavior:'smooth'})");
  await sleep(5000);
  await card("Telegram", "Open DMs · @showrunner_mind_bot · shared memory with the console", 5);
  await pw(
    "eval",
    `(() => {
      const el = document.getElementById('hack-card');
      if (!el) return;
      el.innerHTML = '<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1aa8b5;font-weight:600;font-family:IBM Plex Mono,monospace">Submit</div><div style="font-size:40px;font-weight:700;color:#fff;margin:8px 0 18px;letter-spacing:-.03em">CreatorMind / ShowRunner</div><div style="font-size:17px;color:rgba(232,238,246,.75);line-height:1.75;text-align:left">web-production-c0a0b2.up.railway.app<br/>github.com/darkty0x/creatormind<br/>t.me/showrunner_mind_bot<br/>HelloMinds · ShowRunner</div>';
    })()`,
  );
  await sleep(7000);
  await pw("video-stop");
  await pw("close");
  await run("ffmpeg", [
    "-y",
    "-i",
    OUT_WEBM,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    OUT_MP4,
  ]);
  console.log("Wrote", OUT_MP4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
