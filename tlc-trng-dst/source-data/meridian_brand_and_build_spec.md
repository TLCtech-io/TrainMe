# Meridian DST — Brand and Build Spec

Reference document for the demo Decision Support Tool built around the fictional org "Meridian Industries." Use this as a pattern for spinning up a new base-model DST: change the org-specific values, keep the structural decisions.

---

## 1. Organization

| Field | Value |
|-------|-------|
| Display name | Meridian Industries |
| Short name / acronym | Meridian |
| App title | Meridian DST |
| Sector framing | Generic regional industrial. Deliberately non-specific so it reads as plausibly any mid-size operating company without anchoring to one industry. |
| Email domain (demo) | `meridian-demo.com` |
| Phone format (demo) | `555-XXXX` (US 7-digit, non-routable test prefix) |

When swapping orgs, the only fields that should change are the display name, acronym, app title, sector framing, and the email/phone formats. Everything else (department list, asset taxonomy, scoring rules) is industry-agnostic.

---

## 2. Departments

Nine departments, ordered roughly by operational centrality. This list is the spine of the data: every asset has a `dept`, every department has a director, and the contacts directory is grouped by department.

1. Operations
2. Engineering & Maintenance
3. Information Technology
4. Facilities Management
5. Security
6. Human Resources
7. Finance
8. Emergency Management
9. Supply Chain

For a different org, you'd typically keep 7–10 departments. Going below 6 makes the cascade math feel sparse; going above 12 clutters the contacts directory and the department-touched chips on scenario builder.

---

## 3. Color palette — Slate & Amber

The palette is two-tone by design: cool slate for structure and chrome, warm amber for accents and calls-to-action. Avoids the generic "industrial blue" trap while still reading as serious and professional.

### Core colors

| Role | Token | Hex | Tailwind |
|------|-------|-----|----------|
| Primary (headers, dark surfaces) | slate-800 | `#1E293B` | `bg-slate-800` |
| Mid (body chrome, borders) | slate-600 | `#475569` | `text-slate-600` |
| Surface (background, cards) | slate-100 | `#F1F5F9` | `bg-slate-100` |
| Accent (CTAs, badges, highlights) | amber-500 | `#F59E0B` | `bg-amber-500` |
| Accent light (chips, soft fills) | amber-100 | `#FEF3C7` | `bg-amber-100` |
| Accent on dark (dark-bg labels) | amber-300 | `#FCD34D` | `text-amber-300` |

### Score band tones (cascade tree, asset rows)

Warm-for-urgent, cool-for-routine. Critical and High use peach/amber soft fills; Elevated and below use slate gradients.

| Band | Background | Text |
|------|-----------|------|
| Critical (90+) | `#FED7AA` (orange-200) | `#7C2D12` (orange-900) |
| High (70–89) | `#FEF3C7` (amber-100) | `#78350F` (amber-900) |
| Elevated (55–69) | `#E2E8F0` (slate-200) | `#1E293B` (slate-800) |
| Moderate (40–54) | `#F1F5F9` (slate-100) | `#334155` (slate-700) |
| Standard (<40) | `#F8FAFC` (slate-50) | `#64748B` (slate-500) |

### State colors (what-if states)

| State | Color (text/border) | Soft fill | In cascade? |
|-------|---------------------|-----------|-------------|
| Disrupted (default) | `#B91C1C` (red-700) | `#FEE2E2` (red-100) | Yes |
| Unable to Repair | `#1E293B` (slate-800) | `#E2E8F0` (slate-200) | Yes |
| Manual Ops | `#B45309` (amber-700) | `#FEF3C7` (amber-100) | No |
| Being Fixed | `#047857` (emerald-700) | `#D1FAE5` (emerald-100) | No |

### Department chip colors

Nine departments, each gets a distinct soft-toned chip. Used everywhere a department appears (asset rows, contacts, prioritization). Pulled from Tailwind's 100/700 pairs to keep contrast accessible.

| Department | Background | Text |
|------------|-----------|------|
| Operations | amber-100 | amber-800 |
| Engineering & Maintenance | slate-200 | slate-700 |
| Information Technology | sky-100 | sky-800 |
| Facilities Management | stone-200 | stone-700 |
| Security | rose-100 | rose-800 |
| Human Resources | violet-100 | violet-800 |
| Finance | emerald-100 | emerald-800 |
| Emergency Management | orange-100 | orange-900 |
| Supply Chain | yellow-100 | yellow-800 |

When swapping orgs, you can keep this dept-color mapping and just rename departments — the colors are tuned for variety, not semantic meaning.

---

## 4. Typography

Two-font system mirroring the PCCA reference build.

| Use | Font | Where |
|-----|------|-------|
| Display / asset names / scores | Zilla Slab | Asset names in tree rows, score chip numerals |
| Body / labels / chrome | Poppins | Headers, badges, all UI text |
| System fallback | system sans | Outside the cascade tree where typographic precision is less critical |

Loaded via Google Fonts `@import`:

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Zilla+Slab:wght@400;500;600;700&display=swap');
```

Fallback chains:
- `'"Zilla Slab", Georgia, "Times New Roman", serif'`
- `'"Poppins", system-ui, -apple-system, BlinkMacSystemFont, sans-serif'`

The slab serif on names is what gives the cascade tree its distinctive weight — replacing it with system sans flattens the visual hierarchy noticeably. Worth keeping.

---

## 5. Logo

Placeholder is a single amber-on-slate "M" in a 32x32 rounded square. Used in the home screen header and the report cover. Replace with real artwork at the same dimensions. Logo file should be SVG for the dashboard and a 512x512 PNG for the report.

When swapping orgs, the placeholder is a single uppercase letter (first letter of the acronym) — works for most short names. For longer acronyms, switch to a wordmark or a 2-character monogram.

---

## 6. Data scale

The "medium" dataset chosen for this build:

| Entity | Count |
|--------|-------|
| Processes | 25 |
| Systems | 35 |
| Facilities | 15 |
| **Total assets** | **75** |
| Personnel | 40 |
| Department directors | 9 (one per dept) |
| Downstream dependency edges | 166 |

This is the sweet spot for a demo: enough variety to show meaningful cascade depth (the heaviest seed produces a 4-hop, 71-asset cascade) without overwhelming a stakeholder reviewing it for the first time. Smaller (e.g. 30 assets) feels toy-like; larger (e.g. 200+) makes load times sluggish in the artifact viewer and clutters the lists.

### Asset ID conventions

- Process IDs use a category prefix: `1LS` (Life Safety), `2C` (Critical Operations), `3CA` (Customer-Affecting), `4OT` (Other). Numeric suffix is sequence within category.
- System IDs are sequential `S001`–`S035`.
- Facility IDs are sequential `F001`–`F015`.
- Personnel IDs are sequential `P001`–`P040`.

Process IDs encode the operational category in the prefix because Process is the only type with category banding; Systems and Facilities are flat sequences.

### Scoring formula

Restoration score is derived, not hand-set:

```
score = base(opCategory) − priority_penalty + capped_cascade_bonus
```

- `base(opCategory)` — Life Safety = 90, Critical Operations = 70, Customer-Affecting = 50, Other = 30
- `priority_penalty` — `(priority − 1) × 1.5`, where priority is 1-N within each opCategory
- `capped_cascade_bonus` — `min(20, total_cascade × 0.3)` — caps at +20 so a single mega-cascade doesn't blow out the whole curve

Result is clamped to 0–100. The actual numbers in `meridian_assets.csv` were computed by `generate_data.py` (Python script that does BFS over the edge list).

### Killer cascades (sanity benchmarks)

When generating a new org's data, aim for at least one or two of these "killer" assets so demos have something dramatic to show:

| Asset | Direct | Total | Depth |
|-------|--------|-------|-------|
| Primary Power Grid (S001) | 27 | 71 | 4 |
| Network Core Switching (S005) | 21 | 40 | 2 |
| Primary Data Center (F009) | 4 | 41 | 3 |

If your generated data has no asset above ~15 direct downstream, the demo lacks an "oh no" moment. Add convergence by making more assets depend on one or two foundational systems (power, network, data center).

---

## 7. CSV files included

| File | Rows | What it is |
|------|------|------------|
| `meridian_assets.csv` | 75 | All processes, systems, facilities. Includes computed cascade columns and restoration scores. |
| `meridian_dependencies.csv` | 166 | Long-format edge list: `source_id → target_id`. The graph that drives all cascade math. |
| `meridian_personnel.csv` | 40 | Full contacts directory with titles, departments, emails, phone numbers. |
| `meridian_department_directors.csv` | 9 | One director per department. Subset of personnel; convenience lookup for "who runs department X." |

The dependency CSV is the source of truth for the graph. The cascade columns (`direct`, `indirect`, `total`, `depth`, `upstreamCount`) on assets are computed from it. If you regenerate the edge list, recompute those columns rather than hand-editing.

---

## 8. What stays constant across orgs

When building this skill, treat these as fixed (don't re-decide them per org):

- The 4 process categories (Life Safety / Critical Ops / Customer-Affecting / Other) and their numeric scoring bases
- The 4 what-if states (Disrupted / Unable / Manual Ops / Being Fixed) and their cascade-inclusion logic
- The score band thresholds (90 / 70 / 55 / 40)
- The two-tone color philosophy (cool primary + warm accent), even if the specific hues change
- The two-font system (display serif + body sans), even if the specific fonts change
- The asset taxonomy (Process / System / Facility) and ID prefix conventions
- The 9-department-ish default count

## 9. What changes per org

- Org name, acronym, app title, sector framing
- Email domain, phone prefix
- Department names (count usually similar)
- Logo (one-letter placeholder until real artwork lands)
- Specific colors within the two-tone philosophy
- Specific fonts within the display+body system
- Asset names, descriptions, geographic locations
- Personnel names, titles
- The dependency graph itself

A reasonable skill flow: ask the user for the org-changeable fields up front, generate the constants block, then either ask for or generate the asset/dependency data with the killer-cascade benchmark as a quality check.
