// Reads the SFX cue list the composition computes (window.SFX), mixes the kit under the voice and muxes it with the
// rendered picture. The voice is the Edits audio exactly as delivered (gain 1.0, no processing; it sits at the same
// level as the published Vid 4 and Vid 5). Usage: NODE_PATH=... node tools/mix.mjs <picture.mp4> <out.mp4>
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join((process.env.NODE_PATH || ".").split(":")[0], "x.js"));
const puppeteer = require("puppeteer-core");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [videoIn, out] = process.argv.slice(2).map((p) => path.resolve(p));

// Against a voice peaking near -7.5 dBFS; every SFX file peaks at -3 dBFS.
// SFX peaks land about 6-8 dB under the voice peaks around them: supporting, never competing.
const GAIN = { beep: 0.12, pop: 0.15, whoosh: 0.13, soft: 0.15, tick: 0.16, click: 0.19, hum: 0.07, lock: 0.21, stamp: 0.21,
               thud: 0.25, shimmer: 0.1, powerdown: 0.2, ding: 0.17 };

const chrome = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].filter(Boolean).find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.goto("file://" + path.join(root, "index.html"));
await page.waitForFunction(() => window.__meta && window.SFX);
const { cues, duration } = await page.evaluate(() => ({ cues: window.SFX, duration: window.__meta.duration }));
await browser.close();

const inputs = ["-i", path.join(root, "assets/base.mp4")];
const parts = [];
cues.forEach((c, i) => {
  inputs.push("-i", path.join(root, `sfx/${c.kind}.wav`));
  const ms = Math.max(0, Math.round(c.t * 1000));
  parts.push(`[${i + 1}:a]aresample=48000,adelay=${ms}|${ms},volume=${GAIN[c.kind] ?? 0.25}[s${i}]`);
});
const mixIns = ["[v]", ...cues.map((_, i) => `[s${i}]`)].join("");
const filter = `[0:a]aresample=48000[v];${parts.join(";")};${mixIns}amix=inputs=${cues.length + 1}:normalize=0:duration=first[mix]`;
const mixWav = path.join(root, "assets/mix.wav");
execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filter, "-map", "[mix]", "-t", String(duration), "-c:a", "pcm_s24le", mixWav], { stdio: "inherit" });
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", videoIn, "-i", mixWav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
console.log(`${cues.length} SFX hits mixed -> ${out}`);
