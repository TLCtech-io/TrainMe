#!/usr/bin/env node
// Local frame-by-frame renderer for the HTML motion compositions in this folder.
// Same model as HyperFrames: one paused GSAP timeline, seeked per frame in headless
// Chrome, frames piped to ffmpeg. Fully local: no network, no accounts.
//
// Page contract:
//   window.__meta = { duration, width, height }   // logical CSS px
//   window.__seek = (t) => {...}                  // or window.__tl (paused GSAP timeline)
//
// Usage:
//   NODE_PATH=<dir with puppeteer-core> node render.cjs --in page.html --out clip.mp4 \
//     [--out-width 3840] [--fps 30] [--alpha] [--from 0] [--to <dur>] [--stills 1.5,8,12 --stills-dir dir]
const puppeteer = require("puppeteer-core");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) a[key] = true;
    else { a[key] = next; i++; }
  }
  return a;
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  ...(() => {
    const base = "/root/.cache/hyperframes/chrome/chrome-headless-shell";
    try {
      return fs.readdirSync(base).map((d) => path.join(base, d, "chrome-headless-shell-linux64/chrome-headless-shell"));
    } catch { return []; }
  })(),
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
].filter(Boolean);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.in) throw new Error("--in is required");
  const input = path.resolve(args.in);
  const fps = Number(args.fps || 30);
  const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!chrome) throw new Error("No Chrome binary found");

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--font-render-hinting=none", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  // Block anything that is not a local file: compositions must be self-contained.
  await page.setRequestInterception(true);
  page.on("request", (r) => (r.url().startsWith("file://") || r.url().startsWith("data:") ? r.continue() : r.abort()));
  page.on("pageerror", (e) => console.error("[page error]", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.error("[console]", m.text()); });

  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto("file://" + input, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.__meta && (window.__seek || window.__tl), { timeout: 15000 });
  const meta = await page.evaluate(() => window.__meta);
  const outWidth = Number(args["out-width"] || meta.width);
  const scale = outWidth / meta.width;
  await page.setViewport({ width: meta.width, height: meta.height, deviceScaleFactor: scale });
  await page.evaluate(() => document.fonts.ready);

  // __seek may return a Promise (e.g. when it swaps in a footage frame); wait for it before capturing.
  const seek = (t) => page.evaluate(async (tt) => { if (window.__seek) await window.__seek(tt); else window.__tl.seek(tt, false); }, t);
  const alpha = !!args.alpha;
  const shot = () => page.screenshot({ type: "png", omitBackground: alpha, optimizeForSpeed: true });

  if (args.stills) {
    const dir = path.resolve(args["stills-dir"] || path.dirname(args.out || input));
    fs.mkdirSync(dir, { recursive: true });
    const base = path.basename(input, ".html");
    for (const t of String(args.stills).split(",").map(Number)) {
      await seek(t);
      const buf = await shot();
      const f = path.join(dir, `${base}_t${t.toFixed(2)}.png`);
      fs.writeFileSync(f, buf);
      console.log("still", f);
    }
    await browser.close();
    return;
  }

  if (!args.out) throw new Error("--out is required");
  const from = Number(args.from || 0);
  const to = Number(args.to || meta.duration);
  const frames = Math.round((to - from) * fps);
  const out = path.resolve(args.out);
  const enc = alpha
    ? ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-vendor", "apl0"]
    : ["-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-g", String(fps), "-keyint_min", String(fps), "-movflags", "+faststart"];
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-", ...enc, "-r", String(fps), out], { stdio: ["pipe", "inherit", "inherit"] });
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    await seek(from + i / fps);
    const buf = await shot();
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % (fps * 2) === 0) process.stderr.write(`\r${path.basename(out)} ${i}/${frames} frames, ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg exit " + c)))));
  process.stderr.write(`\r${path.basename(out)} done: ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)}s\n`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
