// Reads the SFX cue list the composition computes (window.SFX), mixes the kit under the voice,
// and muxes it with the rendered picture. Usage: NODE_PATH=... node tools/mix.mjs <video-only.mp4> <out.mp4>
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join((process.env.NODE_PATH || ".").split(":")[0], "x.js"));
const puppeteer = require("puppeteer-core");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [videoIn, out] = process.argv.slice(2).map((p) => path.resolve(p));

// Playbook starting mix against a voice peaking around -7 dB.
const GAIN = { pop: 0.32, whoosh: 0.3, whip: 0.3, stamp: 0.5, impact: 0.5, tick: 0.42, ding: 0.4, drip: 0.35 };

const chrome = fs.readdirSync("/root/.cache/hyperframes/chrome/chrome-headless-shell")
  .map((d) => `/root/.cache/hyperframes/chrome/chrome-headless-shell/${d}/chrome-headless-shell-linux64/chrome-headless-shell`)
  .find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto("file://" + path.join(root, "index.html"));
const { cues, duration } = await page.evaluate(() => ({ cues: window.SFX, duration: window.__meta.duration }));
await browser.close();

const inputs = ["-i", path.join(root, "assets/voice.wav")];
const parts = [];
cues.forEach((c, i) => {
  inputs.push("-i", path.join(root, `sfx/${c.kind}.wav`));
  const ms = Math.max(0, Math.round(c.t * 1000));
  parts.push(`[${i + 1}:a]adelay=${ms}|${ms},volume=${GAIN[c.kind] ?? 0.3}[s${i}]`);
});
const mixIns = ["[0:a]", ...cues.map((_, i) => `[s${i}]`)].join("");
const filter = `${parts.join(";")};${mixIns}amix=inputs=${cues.length + 1}:normalize=0:duration=first,alimiter=limit=0.95[mix]`;
const mixWav = path.join(root, "assets/mix.wav");
execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filter, "-map", "[mix]", "-t", String(duration), mixWav], { stdio: "inherit" });
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", videoIn, "-i", mixWav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
console.log(`${cues.length} SFX hits mixed -> ${out}`);
