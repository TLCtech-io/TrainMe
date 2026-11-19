# DST Commercial: Fact Brief

Source: the live sandbox app (release 3.3) at https://tlctrng.demo-dst.com and its source code,
checked 2026-10-31.

---

## 1. Who uses it, and the problem it solves

**Who uses it:** leadership and duty officers at organizations that run critical operations (ports,
utilities, local government and other infrastructure operators) when something breaks.

**The problem it solves:** when several things fail at once, leaders lose valuable time working out
what else will fail and what to fix first, because their continuity plans sit in binders and
spreadsheets that cannot answer that question in the moment.

---

## 2. Features

Screen names are exactly as they appear in the app. Where the sidebar label and the screen title
differ, both are given.

| # | Feature | Exact screen name | What is on screen | One-sentence benefit |
|---|---|---|---|---|
| 1 | Understand any asset | **Asset Details**, opened from a list such as **Systems & Technology**. The title bar shows the asset's name (e.g. "Network Core Switching"). | A large **Restoration Score** badge (e.g. 90) with a **Priority** tag, the department, an **Add to Scenario** button, and a **Downstream Dependencies** block showing Direct, Indirect and Total counts (21 / 19 / 40 for Network Core Switching), plus **Impacts from Disruption** text | Anyone can see in seconds how much a single outage will spread and how urgently it ranks. |
| 2 | Find what an incident touches | Sidebar: **Map / Weather**. Screen title: **TLC_TRNG Map**. | Facility pins on a live map; National Weather Service alert polygons and a radar loop; current **Conditions & Forecast**. The circle tool drops an incident point and a radius (or draws a polygon), lists the facilities inside it, and offers an **Add N to scenario** button | Go from "something happened here" to the list of affected facilities in a few taps. |
| 3 | Rank the restoration order | Sidebar: **Current Scenario**. Screen title: **Scenario Builder**. | The **Scenario Summary** tiles: **Assets Affected**, **Departments**, **Direct Downstream**, **Total Cascade**, **Departments Touched**. Below them, the disrupted assets numbered 01, 02, 03…, ranked by Restoration Score, with **Critical Questions** and **Initial Actions** buttons | Leadership gets a restoration order built from the organization's own scores and dependencies, not a debate. |
| 4 | Test "what if" before committing people | **What-If Analysis**, a section inside Scenario Builder | Each asset has a state chip: **Disrupted**, **Unable to Repair**, **Manual Ops**, **Being Fixed**. Changing one (e.g. to Manual Ops) updates the ranking, the actions and the cascade counts at once | See what a workaround buys you, or what a permanent loss costs, before you commit resources. |
| 5 | Brief leadership in one action | **Report Preview** (reached from **Generate Report**). The report itself is titled **Scenario Impact Report**. | The **Executive Summary**, **Critical Questions** and **Initial Actions / Considerations** at the top; a **Configure Report** panel for turning sections on or off (weather, **Affected Area Map**, notes); **Share Summary** and **Print / Save PDF** buttons | A leadership-ready, time-stamped brief, shared from a phone in seconds. |

---

## 3. Best end-to-end demo workflow

Severe weather near the operations area: which facilities are in the path, what breaks next, what to
fix first, and how to tell leadership.

1. Sign in and land on **TLC_TRNG DST Home**, which shows **Processes**, **Systems & Technology** and
   **Facilities** with their counts, and the tool tiles.
2. Open **Map / Weather** (screen title **TLC_TRNG Map**): facility pins, **Conditions & Forecast**,
   the radar loop and NWS alert polygons.
3. Use the circle tool to drop an incident point and set a radius. The app lists the facilities
   inside it (e.g. Operations Center / EOC, Headquarters Building, Security Command Center, Primary
   Data Center).
4. Tap **Add N to scenario**. The facilities move into the scenario and the scenario count updates.
5. Open **Scenario Builder**: the **Scenario Summary** tiles, then the assets ranked 01, 02, 03… by
   Restoration Score.
6. Tap **Total Cascade** (or one asset's dependency block) to see everything downstream that this
   outage takes down.
7. In **What-If Analysis**, change one asset from **Disrupted** to **Manual Ops**. The ranking and
   cascade counts change.
8. Tap **Generate Report** to open **Report Preview**: the **Scenario Impact Report** with
   **Executive Summary**, **Critical Questions** and **Initial Actions**.
9. Tap **Share Summary** to send the summary by text or email from the device's share sheet.

---

## 4. Terms

### Use

| Term | Notes |
|---|---|
| **Decision Support Tool** / **DST** | Full name first, then "DST" |
| **TLC_TRNG** | Written with the underscore, always. Legal name **TLC_TRNG, LLC**. |
| **Critical Assets**: **Processes**, **Systems & Technology**, **Facilities** | The app's three asset types |
| **Restoration Score** | A formula-based score from operational category, priority within that category, and number of downstream dependencies. Higher is addressed first. |
| **Direct Downstream**, **Total Cascade** | What breaks immediately, and everything downstream across all levels |
| **Scenario**, **Scenario Builder**, **What-If Analysis** | As in the app |
| **Critical Questions**, **Initial Actions**, **Short-Term Options** | As in the app |
| **Scenario Impact Report**, **Share Summary**, **Print / Save PDF** | As in the app |
| "prioritization reference for leadership during a disruption" | The product's own positioning line, used in the app and on the website |
| "operationalize your plans" | Existing language from the website and the guide |
| "in use with real customers" | The website says the demo "functions exactly as the live version currently deployed to real customers." Do not name the customer. |
| **tlctrng.com/dst** | Always lowercase; the uppercase form returns an error |

### Avoid

| Avoid | Why |
|---|---|
| Any mention of AI, "AI-powered", machine learning, or how the tool was built | Business rule for all TLC_TRNG material. The tool's logic is formula-based. |
| "Decides", "automates decisions", "predicts" | It ranks and shows consequences. People decide. |
| "Real-time monitoring" of assets | Asset data is the organization's reference baseline, updated in data cycles. Only the weather is live. |
| An unqualified "works offline" | Offline use has a limit today (reopening needs a recent sign-in). "Runs on phone, tablet and desktop" is accurate. |
| Features not yet shipped: team sharing, notifications to Teams or Slack, live data feeds, an EOC dashboard, County or single sign-on, ArcGIS or Esri integration | On the roadmap, not in the product |
| Client names (including PCCA or any port authority by name), client data, exact client figures | No client names or exact figures in marketing. Sample numbers from the demo are fine. |
| "Meridian" | The source name of the sample data. It does not appear in the app. |
| "Certified", "compliant", "FEMA-approved", "guaranteed" | No basis for these |
| "Dashboard" for any current screen | The EOC dashboard is a future feature |
| "TLC Training" or "TLC TRNG" in writing | The brand is written **TLC_TRNG** |
