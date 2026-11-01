// Capture the DST map hits while live NWS alerts are up (the alerts and radar are live data), at 3840x2160.
//   node tools/capture_map.cjs <out dir> <tag> <lon> <lat> <zoom> [<tag> <lon> <lat> <zoom> ...]
// e.g. node tools/capture_map.cjs media/capture vegas -115.15 36.25 9.6 phoenix -111.85 33.47 10
// Opens Map / Weather, shoots the default view, draws an area around the facilities and adds what it finds to a
// scenario (shot step by step), then for each spot: moves the map's camera there (the Mapbox map is
// found through the page's React tree, since the app keeps no global handle), makes sure the app's alert polygons
// (layers dst-alerts-fill / dst-alerts-line) are drawn (off and on again if not), shoots them, clicks the biggest
// polygon for its popup, then turns on the radar loop and shoots a run of its frames. Each step is logged, and a
// failure doesn't stop the rest.
const fs = require("fs");
const { chromium } = require("playwright");
const OUT = process.argv[2] || "media/capture";
const SPOTS = [];
for (let i = 3; i + 3 < process.argv.length; i += 4) SPOTS.push([process.argv[i], ...process.argv.slice(i + 1, i + 4).map(Number)]);
const W = 1280, H = 720, DSF = 3;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  // times on screen (alert expiry, report timestamps) in the demo organization's zone, not the container's UTC
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF, timezoneId: process.env.DST_TZ || "America/New_York" });
  const page = await ctx.newPage();
  const pause = (ms) => page.waitForTimeout(ms);
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log("  shot", name); };
  const step = async (label, fn) => { try { await fn(); } catch (e) { console.log("  FAILED", label, "-", e.message.split("\n")[0]); } };
  const hosts = {};
  page.on("response", (r) => { const h = new URL(r.url()).host; if (!/mapbox|tlctrng|amazonaws/.test(h)) hosts[`${h} ${r.status()}`] = (hosts[`${h} ${r.status()}`] || 0) + 1; });

  await page.goto("https://tlctrng.demo-dst.com/", { waitUntil: "networkidle", timeout: 45000 });
  await page.fill('input[type="email"]', process.env.DST_USER);
  await page.fill('input[type="password"]', process.env.DST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByText(/select the disrupted asset type/i).waitFor({ timeout: 30000 });
  await page.getByText(/^\s*map \/ weather\s*$/i).first().click();
  await pause(6000);
  await step("scroll to map", async () => { await page.getByText(/tlc_trng site map/i).first().evaluate((e) => e.scrollIntoView({ block: "start" })); await pause(2500); });
  await shot("map-default");
  // where the map sits in the shots (shot pixels), for laying other map images over them
  const mapBox = await page.locator(".mapboxgl-map").first().boundingBox();
  fs.writeFileSync(`${OUT}/map-box.json`, JSON.stringify({ map: [mapBox.x, mapBox.y, mapBox.x + mapBox.width, mapBox.y + mapBox.height].map((v) => Math.round(v * DSF)) }) + "\n");
  console.log("  map box", fs.readFileSync(`${OUT}/map-box.json`, "utf8").trim());
  await page.evaluate(() => {
    const el = document.querySelector(".mapboxgl-map"), seen = new Set();
    const isMap = (v) => v && typeof v === "object" && typeof v.flyTo === "function" && typeof v.getCenter === "function";
    const search = (v, d) => {
      if (!v || typeof v !== "object" || seen.has(v) || d > 6) return null;
      seen.add(v);
      if (isMap(v)) return v;
      if (isMap(v.current)) return v.current;
      for (const k of ["memoizedState", "current", "next", "queue", "baseState", "memoizedProps", "stateNode"]) { const r = search(v[k], d + 1); if (r) return r; }
      return null;
    };
    for (let n = el; n; n = n.parentElement) {
      const key = Object.keys(n).find((k) => k.startsWith("__reactFiber$"));
      if (!key) continue;
      for (let f = n[key]; f; f = f.return) { const m = search(f.memoizedState, 0) || search(f.stateNode, 0) || search(f.memoizedProps, 0); if (m) { window.__map = m; return; } }
    }
  });
  // draw an area around the tightest cluster of facility pins (Radius mode: click a centre, move out, click), shooting
  // the circle as it grows, the list of facilities it finds, and the scenario after "Add N to scenario"
  await step("area", async () => {
    const names = await page.evaluate(() => [...document.querySelectorAll(".mapboxgl-marker [aria-label], .mapboxgl-marker[aria-label]")]
      .map((e) => e.getAttribute("aria-label")));
    const pins = [];
    for (const n of names) { const b = await page.locator(`[aria-label="${n}"]`).first().boundingBox(); if (b && b.y > 260 && b.y < 700 && b.x > 400 && b.x < 1220) pins.push({ n, x: b.x + b.width / 2, y: b.y + b.height / 2 }); }
    const R = 120;
    const near = (p) => pins.filter((q) => Math.hypot(p.x - q.x, p.y - q.y) < R);
    const hub = pins.sort((a, b) => near(b).length - near(a).length)[0];
    const group = near(hub);
    const cx = group.reduce((t, p) => t + p.x, 0) / group.length, cy = group.reduce((t, p) => t + p.y, 0) / group.length;
    const rad = Math.max(...group.map((p) => Math.hypot(p.x - cx, p.y - cy))) + 22;
    console.log(`  area: ${group.length} pins around (${cx.toFixed(0)}, ${cy.toFixed(0)}), radius ${rad.toFixed(0)}: ${group.map((p) => p.n).join(", ")}`);
    await page.locator('[aria-label="Select facilities by area"]').click(); await pause(1200);
    await page.getByText(/^\s*radius\s*$/i).first().click().catch(() => {}); await pause(600);
    await shot("map-area-01-tool");
    await page.mouse.click(cx, cy); await pause(800);
    await shot("map-area-02-pin");
    for (let k = 1; k <= 8; k++) {
      await page.mouse.move(cx + rad * k / 8, cy, { steps: 4 }); await pause(350);
      await page.screenshot({ path: `${OUT}/map-area-03-grow-${k}.png` });
    }
    await page.mouse.click(cx + rad, cy); await pause(1800);
    await shot("map-area-04-found");                       // "N facilities in X mi radius - tap to review and add"
    await page.getByText(/facilities in .* radius/i).first().click(); await pause(1500);
    await shot("map-area-05-list");
    const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
    const i = t.search(/facilities in .* radius/i); console.log("  list panel:", i >= 0 ? t.slice(i, i + 500) : "(not found)");
    const add = page.getByRole("button", { name: /add/i }).filter({ hasText: /scenario|\d/i }).first();
    console.log("  add button:", (await add.count()) ? (await add.innerText()).replace(/\s+/g, " ") : "(none)");
    if (await add.count()) { await add.click(); await pause(2000); await shot("map-area-06-added"); }
  });

  // the alert polygons drawn in view, each with a point inside it (centroid of its outer ring) in page pixels
  const polygons = () => page.evaluate(() => {
    const m = window.__map, ids = ["dst-alerts-fill"].filter((id) => m.getLayer(id));
    if (!ids.length) return null;
    const r = m.getContainer().getBoundingClientRect();
    return m.queryRenderedFeatures({ layers: ids }).map((f) => {
      const ring = (f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates[0])[0];
      const xs = ring.map((p) => m.project(p).x), ys = ring.map((p) => m.project(p).y);
      const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
      const c = m.project([cx, cy]);
      return { idx: f.properties.idx, area: (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)), x: r.left + c.x, y: r.top + c.y };
    });
  });
  const radarOn = page.locator('[aria-label="Toggle weather radar"]');
  for (const [tag, lon, lat, zoom] of SPOTS) {
    console.log("==", tag);
    await page.evaluate(([lo, la, z]) => window.__map.jumpTo({ center: [lo, la], zoom: z }), [lon, lat, zoom]);
    // a fresh page loads the alerts but draws no polygons until the alert button is switched off and on again
    let polys = null;
    const alertsBtn = page.locator('[aria-label^="Weather alerts"]');
    for (let k = 0; k < 3; k++) {
      await pause(5000);
      polys = await polygons();
      console.log(`  try ${k}: ${polys === null ? "no alert layer" : polys.length + " polygons in view"}`);
      if (polys && polys.length) break;
      await alertsBtn.click(); await pause(1500); await alertsBtn.click();
      console.log("  switched the alert polygons off and on");
    }
    await shot(`map-${tag}-alerts`);
    await step("popup", async () => {
      const best = polys.sort((a, b) => b.area - a.area)[0];
      await page.mouse.click(best.x, best.y); await pause(2500);
      const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
      const i = t.search(/in effect until/i);
      console.log("  popup:", i >= 0 ? t.slice(Math.max(0, i - 160), i + 230) : "(none)");
      await shot(`map-${tag}-popup`);
      const close = page.locator(".mapboxgl-popup-close-button").first();
      if (await close.count()) { await close.click(); await pause(800); }
    });
    await step("radar", async () => {
      if (!(await radarOn.getAttribute("class") || "").match(/active|on|selected/)) await radarOn.click();
      await pause(9000);
      await shot(`map-${tag}-radar`);
      for (let k = 0; k < 16; k++) { await pause(600); await page.screenshot({ path: `${OUT}/map-${tag}-radar-f${String(k).padStart(2, "0")}.png` }); }
      console.log("  radar frames 16");
      await radarOn.click(); await pause(1500);
    });
  }
  console.log("weather hosts:", JSON.stringify(hosts));
  await browser.close();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
