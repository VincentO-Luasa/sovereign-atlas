# Sovereign Atlas

**Live app:** https://vincento-luasa.github.io/sovereign-atlas/

An interactive, playful-but-rigorous web app for getting up to speed on a sovereign credit in minutes — built for sovereign advisory work (ratings advisory, Eurobond issuance, IMF programmes, debt restructurings).

## What's inside

| View | What it does |
|---|---|
| **Atlas** | Spinning, draggable 3D globe (or flat map) coloured by any of 30 metrics. Scrub or *play* through 2010 → 2031 (IMF projections shaded). 🎲 *Spin the globe* flies to a random sovereign. Live feeds of the latest rating actions and a distress watch-list. |
| **Country dossier** | Agency ratings & outlooks on an AAA→D ladder with the IG cliff, IMF arrangement, one-line credit story, 16 traffic-lit **vital signs** (with world rank and sparkline), a **Sovereign DNA** radar (5 pillars vs regional median), auto-generated **red flags & strengths**, growth / fiscal / external / export-mix charts, the **yield curve** vs UST & Bund (plus any peer), CDS & Eurobond pricing, and a default/restructuring timeline. |
| **Debt dynamics lab** | Inside each dossier: sliders for primary balance, growth, inflation, effective interest rate, FX share and a devaluation shock, versus the IMF WEO debt path and the debt-stabilising primary balance. One-click *combined shock / austerity / growth boom* scenarios. |
| **Head-to-head** | Up to 4 sovereigns, 14 "rounds" (the stronger credit wins each), rating ladder, DNA overlay, overlaid time series and yield curves. |
| **Explorer** | Scatter any metric against any other (bubble = GDP), with regression fit and correlation. Presets: *Rating vs CDS*, *Debt vs interest burden*, *Twin deficits*, … |
| **League table** | Every sovereign on one sortable screen with status dots; CSV export. |
| **Play** | *Higher or lower*, *Mystery sovereign* (guess from clues) and *Be the agency* (rate a blind sovereign). |
| **Playbook** | Rating-agency & IMF frameworks, flip-card rules of thumb, full metric glossary with thresholds, and the metrics that matter but aren't in free data. |

Press **⌘K** (or **/**) anywhere to jump to a country. Light & dark themes.

## Metrics

Your must-haves — **GDP, fiscal deficit, current account deficit, exports, yield curve, rating, debt** — are marked ★. Research into S&P / Moody's / Fitch methodologies and the IMF SRDSF, MAC DSA and LIC DSF frameworks (see [`docs/METRICS_RESEARCH.md`](docs/METRICS_RESEARCH.md)) added:

- **Economy:** real growth, GDP per capita, inflation, unemployment
- **Fiscal & debt:** primary balance, **interest / revenue**, debt / revenue, revenue, **r − g**, gap to the **debt-stabilising primary balance**
- **External:** **FX reserves (months of imports)**, external debt / GNI, **external debt service / exports**, commodity export dependence, export mix, FDI, remittances
- **Markets:** 5Y CDS, 10Y yield, 2s10s slope, policy rate (and real policy rate), USD Eurobond yield & spread
- **Institutions & event risk:** World Bank governance indicators, IMF programme status, default/restructuring history

Traffic-light thresholds follow the IMF MAC DSA benchmarks (e.g. debt 70% of GDP for EMs / 85% for AEs, spreads 200/600bp), the LIC DSF, S&P's interest/revenue bands and standard conventions; they adapt to whether a country is an advanced, emerging or low-income economy.

## Data

| Source | Content | Refresh |
|---|---|---|
| IMF WEO & Fiscal Monitor (DataMapper API) | GDP, growth, inflation, fiscal & primary balance, revenue, expenditure, debt, current account — 2008–2031 | `npm run data` (monthly GitHub Action) |
| World Bank WDI / IDS / WGI | Exports, reserves, external debt & debt service, FDI, remittances, export composition, governance | same |
| `data/curated/ratings.json` | S&P / Moody's / Fitch LT FC ratings & outlooks, last action | manual snapshot, 2026-10-03 |
| `data/curated/markets.json` | Local yield curves, USD Eurobond yields/spreads, 5Y CDS, policy rates | manual snapshot, 2026-10-03 |
| `data/curated/programmes.json` | IMF arrangements, default history, credit headline | manual snapshot, 2026-10-03 |

Curated snapshots cover 75 sovereigns (DM, EM and the frontier names most relevant to sovereign advisory); a few entries are flagged `"unverified": true` where the sources disagreed. **All market and rating data are indicative — verify against Bloomberg / agency sites before any client use.** Derived metrics (interest/revenue, r − g, debt-stabilising balance) are approximations computed from IMF aggregates.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run data       # re-pull IMF + World Bank data and merge curated files
```

To update ratings or market data, edit the JSON in `data/curated/` and run `npm run data`.

## Deploy

Live at **https://vincento-luasa.github.io/sovereign-atlas/** — every push to `main` redeploys via `.github/workflows/deploy.yml`. The build is a static site (`dist/`) with relative paths, so it can be hosted anywhere.

## Stack

React 19 + TypeScript + Vite, D3 (geo, scales, Delaunay), TopoJSON, Framer Motion. No backend.
