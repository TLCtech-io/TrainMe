// Capture the DST demo's desktop screens for the commercial (script.md, sections 2-3), at 3840x2160.
//
//   DST_USER=... DST_PASSWORD=... node tools/capture_dst.cjs media/capture
//
// Signs in with the demo login from the environment (never printed), then walks the storyboard: Home, the five assets'
// pages (before and after Add to Scenario), Scenario Builder (summary, ranked list, Total Cascade), SCADA's state
// panel and the list after it goes to Manual Ops, and the Report Preview. Writes PNGs plus boxes.json: where the
// callout targets sit on each shot, in shot pixels. The current scenario lives only in this browser, so nothing is
// left on the shared demo account (the script never saves a scenario).
// The app scrolls inside its own panel, so "full page" screenshots are screen-sized: scrolled shots scroll that panel,
// and the *_tall.png renders use a tall window so a whole screen can be panned in the build.
const fs = require("fs");
const { chromium } = require("playwright");

const OUT = process.argv[2] || "media/capture";
const W = 1280, H = 720, DSF = 3;
const ASSETS = [                                       // narration order
  ["Processes", "Production Operations", "production-operations"],
  ["Systems & Technology", "SCADA / Plant Control", "scada"],
  ["Systems & Technology", "Network Core Switching", "network-core"],
  ["Facilities", "Primary Data Center", "primary-data-center"],
  ["Facilities", "Production Plant A", "production-plant-a"],
];
const boxes = {};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  // times on screen (alert expiry, report timestamps) in the demo organization's zone, not the container's UTC
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF, timezoneId: process.env.DST_TZ || "America/New_York" });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  const pause = (ms) => page.waitForTimeout(ms);
  const shot = async (name) => { await pause(600); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log("  ", name); };
  // labels are often lowercase in the DOM and capitalized by CSS, so match text whole but ignoring case
  const exact = (text) => new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\s*$`, "i");
  const click = async (text) => { await page.getByText(exact(text)).first().click(); await pause(1500); };
  const home = () => click("Home");

  // the box of each element found by its text (a regex), in shot pixels: `up` levels out to its block, or "next" for a
  // heading together with the block after it
  const measure = async (name, targets) => {
    boxes[name] = await page.evaluate(({ targets, dsf }) => {
      const out = {};
      const all = [...document.querySelectorAll("body *")].filter((e) => e.offsetParent !== null || e.tagName === "BODY");
      for (const [key, pat, up] of targets) {
        const re = new RegExp(pat, "i");
        // the smallest visible element whose text matches, then `up` levels out to its block
        let el = all.filter((e) => re.test((e.innerText || "").trim())).sort((a, b) => (a.innerText || "").length - (b.innerText || "").length)[0];
        if (!el) continue;
        let r = el.getBoundingClientRect();
        if (up === "next" && el.nextElementSibling) {       // a heading and the block after it
          const n = el.nextElementSibling.getBoundingClientRect();
          r = { left: Math.min(r.left, n.left), top: r.top, right: Math.max(r.right, n.right), bottom: n.bottom };
        } else {
          for (let k = 0; k < (up || 0) && el.parentElement; k++) el = el.parentElement;
          r = el.getBoundingClientRect();
        }
        out[key] = [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * dsf));
      }
      return out;
    }, { targets, dsf: DSF });
  };
  // scroll the app's content panel so the element with this text sits near the top
  const scrollTo = async (text) => {
    await page.getByText(exact(text)).first().evaluate((el) => el.scrollIntoView({ block: "start" }));
    await pause(800);
  };
  const tall = async (name, height) => {
    await page.setViewportSize({ width: W, height }); await pause(1200);
    await shot(name);
    await page.setViewportSize({ width: W, height: H }); await pause(800);
  };

  await page.goto("https://tlctrng.demo-dst.com/", { waitUntil: "networkidle", timeout: 45000 });
  await page.fill('input[type="email"]', process.env.DST_USER);
  await page.fill('input[type="password"]', process.env.DST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByText(/select the disrupted asset type/i).waitFor({ timeout: 30000 });
  await pause(2000);
  console.log("home");
  await shot("home");

  console.log("assets");
  for (const [type, name, slug] of ASSETS) {
    await home();
    await click(type);
    if (slug === "scada") await shot("list-systems");
    await click(name);
    await shot(`asset-${slug}`);
    await measure(`asset-${slug}`, [
      ["title", `^${name.replace(/[/]/g, "\\/")}$`, 0],
      ["score", "^\\d{2}\\s+(MODERATE|HIGH|LOW|CRITICAL)$", 0],
      ["priority", "^PRIORITY \\d$", 0],
      ["contact", "^CONTACT$", 0],
      ["add", "^\\+?\\s*ADD TO SCENARIO$", 0],
      ["description", "^description$", "next"],
      ["impacts", "^impacts from disruption$", "next"],
      ["downstream", "^downstream dependencies\\s+\\d", 0],
      ["upstream", "^upstream dependencies\\s+\\d", 0],
    ]);
    await page.getByText(/add to scenario/i).first().click(); await pause(1500);
    await shot(`asset-${slug}-added`);
    await measure(`asset-${slug}-added`, [["count", "^\\d$", 0]]);
  }

  console.log("scenario builder");
  await click("Current Scenario");
  await pause(1500);
  await shot("sb-top");
  await measure("sb-top", [["assets", "^ASSETS AFFECTED", 1], ["direct", "^DIRECT DOWNSTREAM", 1], ["cascade", "^TOTAL CASCADE", 1]]);
  await scrollTo("WHAT-IF ANALYSIS");
  await shot("sb-list");
  await measure("sb-list", [["row-scada", "^SCADA / Plant Control$", 3]]);
  await tall("sb-tall", 2700);

  console.log("total cascade");
  await scrollTo("SCENARIO SUMMARY").catch(() => {});
  await page.getByText(/^\s*total cascade/i).first().click(); await pause(2000);
  await shot("sb-cascade");
  await tall("sb-cascade-tall", 2700);
  await page.keyboard.press("Escape"); await pause(800);
  if (!(await page.getByText(exact("What-If Analysis")).count())) { await click("Current Scenario"); }

  console.log("what-if");
  await scrollTo("WHAT-IF ANALYSIS");
  const scadaRow = page.getByText(exact("SCADA / Plant Control")).first()
    .locator("xpath=ancestor::*[.//*[translate(normalize-space(.),'disrupted','DISRUPTED')='DISRUPTED']][1]");
  await scadaRow.getByText(exact("Disrupted")).first().click(); await pause(1500);
  await shot("sb-state-panel");
  await measure("sb-state-panel", [["manual", "^Manual Ops$", 2]]);
  await page.getByText(exact("Manual Ops")).last().click(); await pause(2000);
  await scrollTo("WHAT-IF ANALYSIS");
  await shot("sb-manual-list");
  await page.getByText(exact("Scenario Summary")).first().evaluate((el) => el.scrollIntoView({ block: "start" })).catch(() => {});
  await pause(800);
  await shot("sb-manual-top");
  await measure("sb-manual-top", [["cascade", "^TOTAL CASCADE", 1], ["direct", "^DIRECT DOWNSTREAM", 1]]);

  console.log("report");
  await page.getByText(/generate report/i).first().click(); await pause(3000);
  await shot("report-top");
  await scrollTo("Critical Questions"); await shot("report-cq");
  await scrollTo("Initial Actions / Considerations"); await shot("report-ia");
  await tall("report-tall", 4200);

  fs.writeFileSync(`${OUT}/boxes.json`, JSON.stringify(boxes, null, 1));
  console.log("done:", Object.keys(boxes).length, "measured shots");
  await browser.close();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
