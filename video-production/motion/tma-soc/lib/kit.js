// Shared building blocks for the Span of Control scene pages (segments E to K).
// A page sets window.SCENE_LEN = {scene: seconds} and calls KIT.start(build), where build(K) adds tweens to K.tl
// at times taken from Rick's words (seconds from the scene start). The renderer waits for window.__meta.
// Query: ?scene=N picks the scene, ?preview adds a stand-in caption gradient, ?from/?to are handled by render.cjs.
(function () {
  const q = new URLSearchParams(location.search);
  const K = {};
  K.q = q;
  K.SCENE = Number(q.get("scene"));
  K.root = null;
  K.tl = gsap.timeline({ paused: true });
  const tl = K.tl;

  // ------------------------------------------------------------------ DOM helpers
  K.el = (cls, css = {}, html = "", parent) => {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    Object.assign(d.style, css);
    d.innerHTML = html;
    (parent || K.root).appendChild(d);
    return d;
  };
  K.px = (v) => (typeof v === "number" ? `${v}px` : v);
  K.at = (node, x, y) => Object.assign(node.style, { left: K.px(x), top: K.px(y) });

  // ------------------------------------------------------------------ motion helpers
  K.hide = (n) => gsap.set(n, { opacity: 0 });
  K.pop = (n, t, from = 0.6, ease = "back.out(2)", d = 0.32) => {
    K.hide(n);
    tl.fromTo(n, { opacity: 0, scale: from }, { opacity: 1, scale: 1, duration: d, ease, immediateRender: false }, t);
  };
  K.slam = (n, t, from = 2.2) => {
    K.hide(n);
    tl.fromTo(n, { opacity: 0, scale: from }, { opacity: 1, scale: 1, duration: 0.2, ease: "power4.in", immediateRender: false }, t);
  };
  K.rise = (n, t, dy = 40, d = 0.35) => {
    K.hide(n);
    tl.fromTo(n, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: d, ease: "power3.out", immediateRender: false }, t);
  };
  K.slide = (n, t, dx = 120, d = 0.4) => {
    K.hide(n);
    tl.fromTo(n, { opacity: 0, x: dx }, { opacity: 1, x: 0, duration: d, ease: "power3.out", immediateRender: false }, t);
  };
  K.fadeIn = (n, t, d = 0.3) => { K.hide(n); tl.fromTo(n, { opacity: 0 }, { opacity: 1, duration: d, immediateRender: false }, t); };
  K.out = (n, t, d = 0.25) => tl.to(n, { opacity: 0, duration: d }, t);
  K.dim = (n, t, o = 0.18, d = 0.3) => tl.to(n, { opacity: o, duration: d }, t);
  K.shake = (n, t, amp = 14, reps = 5) => tl.fromTo(n, { x: 0 }, { x: amp, duration: 0.04, yoyo: true, repeat: reps, ease: "none", immediateRender: false }, t);
  K.pulse = (n, t, s = 1.12, reps = 1) => tl.to(n, { scale: s, duration: 0.18, yoyo: true, repeat: reps * 2 - 1, ease: "sine.inOut" }, t);
  K.call = (fn, t) => tl.call(fn, null, t);

  // A header (kicker + title) that opens big and centred, then scales up-left into its place.
  // Final place: kicker at (120, 92), title below it. Returns the group.
  K.header = (kicker, title, t, hold = 0.9, opts = {}) => {
    const g = K.el("hdr", { position: "absolute", left: "120px", top: "88px", transformOrigin: "0 0" },
      `<div class="kicker" style="position:relative;left:0;top:0;font-size:${opts.kSize || 26}px"><span class="bar"></span>${kicker}</div>` +
      `<div style="font:900 ${opts.tSize || 64}px/1.05 Roboto;color:var(--ink);margin-top:14px;white-space:nowrap">${title}</div>`);
    const r = g.getBoundingClientRect();
    const S = opts.big || Math.min(1.9, 1500 / r.width);
    const dx = 960 - (120 + (r.width * S) / 2), dy = 400 - (88 + (r.height * S) / 2);
    K.hide(g);
    tl.fromTo(g, { opacity: 0, x: dx, y: dy + 30, scale: S * 0.85 }, { opacity: 1, y: dy, scale: S, duration: 0.35, ease: "back.out(1.6)", immediateRender: false }, t);
    if (hold !== null) tl.to(g, { x: 0, y: 0, scale: 1, duration: 0.55, ease: "power3.inOut" }, t + 0.35 + hold);
    return g;
  };
  // Big centred type, no header move (for short scenes).
  K.big = (html, t, css = {}) => {
    const n = K.el("bigt", Object.assign({ position: "absolute", left: "0", right: "0", top: "300px", textAlign: "center",
      font: "900 120px/1.05 Roboto", color: "var(--ink)" }, css), html);
    K.pop(n, t, 1.4, "power3.out");
    return n;
  };

  // ------------------------------------------------------------------ org chart
  // box(id, x, y, label, kind): x,y are the box centre. kind: ic | sec | sup | pos | grp | div | ghost
  const KIND = {
    ic: { bg: "var(--blue)", fg: "#fff", bd: "var(--blue)" },
    sec: { bg: "#fff", fg: "var(--ink)", bd: "var(--blue)" },
    sup: { bg: "var(--amber)", fg: "var(--ink)", bd: "var(--amber-deep)" },
    pos: { bg: "#fff", fg: "var(--ink)", bd: "var(--amber-deep)" },
    grp: { bg: "#e8f1ff", fg: "var(--ink)", bd: "var(--blue)" },
    red: { bg: "#fff", fg: "var(--red)", bd: "var(--red)" },
    ghost: { bg: "rgba(255,255,255,0.5)", fg: "var(--line)", bd: "var(--line)" },
  };
  K.boxes = {};
  K.box = (id, x, y, label, kind = "pos", w = 240, h = 76, fs = 28) => {
    const k = KIND[kind];
    const b = K.el("obox", { position: "absolute", left: `${x - w / 2}px`, top: `${y - h / 2}px`, width: `${w}px`, height: `${h}px`,
      borderRadius: "14px", background: k.bg, color: k.fg, border: `4px solid ${k.bd}`, boxShadow: "var(--shadow)",
      display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
      font: `700 ${fs}px/1.1 Roboto`, padding: "0 10px" }, label);
    b.dataset.x = x; b.dataset.y = y; b.dataset.w = w; b.dataset.h = h;
    K.boxes[id] = b;
    return b;
  };
  K.restyle = (b, kind, t) => {
    const k = KIND[kind];
    tl.to(b, { backgroundColor: k.bg, color: k.fg, borderColor: k.bd, duration: 0.25 }, t);
  };
  // An SVG layer for connectors, under the boxes.
  K.svg = null;
  K.lines = {};
  const NS = "http://www.w3.org/2000/svg";
  K.ensureSvg = () => {
    if (K.svg) return K.svg;
    K.svg = document.createElementNS(NS, "svg");
    K.svg.setAttribute("width", 1920); K.svg.setAttribute("height", 1080);
    Object.assign(K.svg.style, { position: "absolute", left: 0, top: 0 });
    K.root.insertBefore(K.svg, K.root.firstChild);
    return K.svg;
  };
  // Elbow connector from the bottom of box a to the top of box b. Draws on at t.
  K.conn = (id, a, b, t, color = "var(--line)", w = 5, d = 0.4) => {
    const A = K.boxes[a], B = K.boxes[b];
    const x1 = +A.dataset.x, y1 = +A.dataset.y + +A.dataset.h / 2, x2 = +B.dataset.x, y2 = +B.dataset.y - +B.dataset.h / 2;
    const my = (y1 + y2) / 2;
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", `M${x1},${y1} V${my} H${x2} V${y2}`);
    p.setAttribute("fill", "none"); p.setAttribute("stroke", color); p.setAttribute("stroke-width", w);
    p.setAttribute("stroke-linejoin", "round");
    K.ensureSvg().appendChild(p);
    const len = Math.abs(y2 - y1) + Math.abs(x2 - x1) + 2;
    p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
    if (t !== null) tl.to(p.style, { strokeDashoffset: 0, duration: d, ease: "power2.out" }, t);
    K.lines[id] = p;
    return p;
  };
  K.lineColor = (p, color, t, d = 0.2) => tl.to(p, { attr: { stroke: color }, duration: d }, t);

  // A "direct reports" counter card (top right), like pilot 4.
  K.counter = (label, val, t) => {
    const c = K.el("card", { left: "1560px", top: "70px", width: "260px", height: "150px", padding: "18px 26px", textAlign: "right" },
      `<div style="font:700 18px/1 Roboto;letter-spacing:0.16em;color:var(--slate)">${label}</div><div class="cv" style="font:900 92px/1 Roboto;margin-top:12px">${val}</div>`);
    if (t === null) gsap.set(c, { opacity: 1 }); else K.pop(c, t, 0.7);
    c.set = (v, tt, color = "var(--ink)") => {
      tl.call(() => { c.querySelector(".cv").textContent = v; }, null, tt);
      tl.fromTo(c.querySelector(".cv"), { scale: 1.5, color }, { scale: 1, color, duration: 0.35, ease: "back.out(2)", immediateRender: false }, tt);
    };
    return c;
  };

  // A small person icon (head + shoulders), colour via `color`.
  K.person = (x, y, color = "var(--blue)", s = 1) => K.el("", { position: "absolute", left: `${x - 35 * s}px`, top: `${y - 48 * s}px`,
    width: `${70 * s}px`, height: `${96 * s}px`, color },
    `<div style="position:absolute;left:${19 * s}px;top:0;width:${32 * s}px;height:${32 * s}px;border-radius:50%;background:currentColor"></div>` +
    `<div style="position:absolute;left:${6 * s}px;top:${38 * s}px;width:${58 * s}px;height:${54 * s}px;border-radius:${29 * s}px ${29 * s}px ${10 * s}px ${10 * s}px;background:currentColor"></div>`);

  K.chip = (txt, x, y, bg = "var(--blue)", fg = "#fff", fs = 34) => K.el("", { position: "absolute", left: `${x}px`, top: `${y}px`,
    height: `${fs * 1.9}px`, padding: `0 ${fs * 0.75}px`, borderRadius: "999px", background: bg, color: fg,
    font: `900 ${fs}px/${fs * 1.9}px Roboto`, whiteSpace: "nowrap", boxShadow: "0 10px 26px rgba(0,0,0,0.22)" }, txt);

  // ------------------------------------------------------------------ start
  K.start = (build, opts = {}) => {
    const fullScenes = opts.full || [];
    const isFull = fullScenes.includes(K.SCENE);
    if (isFull) document.documentElement.classList.add("full");
    if (q.has("preview")) document.documentElement.classList.add("preview");
    K.full = isFull;
    Promise.all(["400", "500", "700", "900"].map((w) => document.fonts.load(`${w} 40px Roboto`))).then(() => {
      K.root = document.getElementById("root");
      build(K);
      const D = (window.SCENE_LEN[K.SCENE] || 5) + 0.05;
      M.register(tl, { duration: D, width: 1920, height: 1080 }, opts.update);
    });
  };
  window.KIT = K;
})();
