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
  process.stdout.write(out.slice(0, 300) + (out.length > 300 ? "…\n" : "\n"));
  return out;
}

function cardJs(title, sub) {
  const t = JSON.stringify(title);
  const s = JSON.stringify(sub);
  return `(() => {
    let el = document.getElementById('hack-card');
    if (!el) { el = document.createElement('div'); el.id = 'hack-card'; document.body.appendChild(el); }
    el.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:48px;background:radial-gradient(ellipse at 30% 20%,#10343a 0%,#0b1220 60%,#071018 100%);font-family:Syne,Manrope,sans-serif;text-align:center;';
    el.style.display = 'flex';
    el.innerHTML = '<div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#2bb7c3;font-weight:700">Creative Minds Jam · ShowRunner</div><div style="font-size:48px;line-height:1.05;font-weight:800;color:#fff;max-width:900px">' + ${t} + '</div><div style="font-size:20px;line-height:1.35;color:#c5d0dc;max-width:720px">' + ${s} + '</div>';
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
  await pw("resize", "1440", "900");
  await sleep(3500);
  await pw("video-start", OUT_WEBM);

  await card("ShowRunner", "Persistent creator Mind — repurpose, growth, moderation", 5);
  await card("The problem", "Creator tools reset every session. ShowRunner remembers and follows up.", 4);
  await pw("eval", hide);
  await sleep(3500);
  await pw("eval", "document.getElementById('workbench')?.scrollIntoView({behavior:'smooth'})");
  await sleep(2500);
  await pw("eval", `[...document.querySelectorAll('button')].find(b=>/Run Repurpose/i.test(b.textContent||''))?.click()`);
  await sleep(12000);
  await pw("eval", "window.scrollTo({top:900,behavior:'smooth'})");
  await sleep(4000);
  await pw("eval", "window.scrollTo({top:1600,behavior:'smooth'})");
  await sleep(4000);
  await card("Testers", "Open DMs · @showrunner_mind_bot · Live on Railway", 4);
  await pw(
    "eval",
    `(() => {
      const el = document.getElementById('hack-card');
      if (!el) return;
      el.innerHTML = '<div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#2bb7c3;font-weight:700">Submission</div><div style="font-size:42px;font-weight:800;color:#fff;margin:8px 0 20px">CreatorMind / ShowRunner</div><div style="font-size:18px;color:#c5d0dc;line-height:1.7;text-align:left">web-production-c0a0b2.up.railway.app<br/>github.com/darkty0x/creatormind<br/>t.me/showrunner_mind_bot<br/>app.hellominds.ai · ShowRunner</div>';
    })()`,
  );
  await sleep(6500);
  await pw("video-stop");
  await pw("close");
  await run("ffmpeg", ["-y", "-i", OUT_WEBM, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT_MP4]);
  console.log("Wrote", OUT_MP4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
