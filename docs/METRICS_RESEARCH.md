# Sovereign Macro Profile – Metrics Research (for sovereign advisory webapp)

Scope: what rating agencies and the IMF/World Bank look at, which metrics an advisor (restructuring, ratings advisory, Eurobond issuance, IMF programmes) needs on one screen, and the warning thresholds each one uses.
Status: researched Oct 2026. Thresholds marked **[verified]** were checked against the source text. Thresholds marked **[convention]** are market or analyst rules of thumb, not official cut-offs.

---

## 1. Framework pillars: how sovereign risk is structured

| Framework | Pillars / structure | Notes for UI |
|---|---|---|
| **Moody's** (Sovereigns methodology, Nov 2022) | 1) **Economic strength** (growth, volatility, scale, GDP per capita). 2) **Institutions & governance strength**. These two combine into "economic resiliency". 3) **Fiscal strength**: debt burden (GG debt/GDP, debt/revenue) and debt affordability (interest/revenue, interest/GDP). 4) **Susceptibility to event risk**: political, government liquidity, banking sector, external vulnerability. | Event risk works as a "weakest link" cap. Liquidity or external risk alone can pull the rating down. |
| **S&P** (Sovereign Rating Methodology) | 5 scores from 1 (best) to 6: **Institutional**, **Economic** → "institutional & economic profile"; **External**, **Fiscal** (budgetary performance + debt burden), **Monetary** → "flexibility & performance profile". These give an indicative rating, then ±1 notch adjustments. The local-currency (LC) rating can sit above the foreign-currency (FC) rating. | Key ratios: net GG debt/GDP, interest/revenue, gross external financing needs/(CAR + usable reserves), narrow net external debt/CAR. |
| **Fitch** (SRM + Qualitative Overlay) | 18-variable regression model (SRM). Weights from the Feb 2025 model **[verified]**: **Structural features 53.7%** (governance 22.0, share of world GDP 14.3, GDP per capita 11.8, default record 4.5, broad money 1.1). **Macro performance 9.9%** (growth volatility 4.5, inflation 3.6, real growth 1.8). **Public finances 18.8%** (gross GG debt 9.0, interest/revenue 4.6, FC debt share 3.0, budget balance 2.1). **External finances 17.6%** (sovereign net foreign assets 7.5, reserve-currency flexibility 7.2, reserves in months of current external payments (CXP) 1.3, commodity dependence 1.1, CAB+net FDI 0.3, external interest service 0.2). The QO adds ±2 notches per pillar, capped at ±3 in total. | Governance and income level carry the most weight. Debt level matters less than most users expect. This is a good educational point. |
| **IMF SRDSF** (market-access countries (MACs), 2021/22) | **Near-term** (1–2y): logit stress probability. **Medium-term** (5y): Debt Fanchart Index + GFN Financeability Index, averaged into the Medium-Term Index (MTI). **Long-term**: demographics, climate, natural resources. Outputs: risk of sovereign stress (low / moderate / high) and debt verdict (sustainable / sustainable but not with high probability / unsustainable). | MTI thresholds **[verified]**: low < 0.257, moderate 0.257–0.395, high > 0.395. GFN Financeability Index: low < 7.6, high > 17.9. Debt Fanchart Index: low < 1.13, high > 2.08. |
| **IMF–WB LIC DSF** (2018 framework; PRGT-eligible countries) | Composite Indicator (CPIA, growth, reserves, remittances, world growth) sets **debt-carrying capacity**: weak / medium / strong. 4 external thresholds + 1 total public debt benchmark. Rating: **low / moderate / high risk / in debt distress**. | **A reviewed LIC DSF was approved by the IMF/WB Boards in Sept 2026 and should become operational around mid-2027.** It recalibrates thresholds and adds public/domestic-debt modules. Until then the 2018 thresholds below apply. |
| **IMF 2013 MAC DSA** (replaced by the SRDSF, still widely quoted) | Heat map: debt 70% / GFN 15% of GDP for EMs (85% / 20% for AEs) + debt-profile benchmarks (spreads, external financing requirement, FX share, non-resident holdings, change in short-term (ST) debt). | Easiest public, transparent thresholds to use for traffic lights. |

Proposed app grouping (combines the frameworks above): **Economy · Institutions · Fiscal & Debt · External & Reserves · Monetary & Markets · Official sector / Event risk**.

---

## 2. Recommended metrics (traffic-light thresholds)

Legend: C = comfortable, W = watch, D = danger. EM = emerging market. AE = advanced economy. GG = general government. CAR = current account receipts. LIC thresholds are given as Weak / Medium / Strong debt-carrying capacity: the danger threshold for each class.

### A. Economy & institutions
| # | Metric | Definition | Why it matters to an advisor | C / W / D | Threshold source | Free data (code) |
|---|---|---|---|---|---|---|
| 1 | Nominal GDP (USD) | Size of economy | Scale (Fitch: share of world GDP 14.3%), index eligibility, deal size vs market depth | Context only | Fitch SRM | IMF WEO `NGDPD` |
| 2 | Real GDP growth (+ 5y avg & volatility) | % y/y, constant prices | Drives g in r–g. Volatility is penalised by Moody's and Fitch | C > 4% EM (> 2% AE) · W 1–4% · D < 1% or below population growth **[convention]** | Moody's/Fitch growth & volatility factors | WEO `NGDP_RPCH` |
| 3 | GDP per capita (USD & PPP) | GDP / population | Strongest single correlate of rating. Proxy for tax base and shock absorption | Benchmark vs WB income groups (FY26 GNI pc Atlas: LIC ≤ ~$1.1k, LMIC ≤ ~$4.5k, UMIC ≤ ~$13.9k) | Fitch (11.8%), S&P economic score | WEO `NGDPDPC`, `PPPPC`; WDI `NY.GNP.PCAP.CD` |
| 4 | Governance (WGI) | Gov. effectiveness, rule of law, control of corruption, political stability, regulatory quality, voice (–2.5 to +2.5 / percentile) | Largest Fitch SRM weight (22%). Moody's institutions pillar. Drives LIC DSF capacity via CPIA | C > 60th pctile · W 30–60 · D < 30th **[convention]** | Fitch, Moody's, S&P institutional | WGI `GE.EST`, `RL.EST`, `CC.EST`, `PV.EST` (WB source 3). CPIA `IQ.CPA.IRAI.XQ` for IDA |
| 5 | Inflation (avg CPI) | % y/y | Monetary credibility. High inflation erodes LC debt but signals stress | C < 5% EM (≈ target) · W 5–10% · D > 10% (double digits) **[convention]** | Fitch macro pillar; S&P monetary score | WEO `PCPIPCH` (avg), `PCPIEPCH` (eop) |
| 6 | Policy rate & real policy rate | CB rate − expected inflation | Monetary stance, FX defence, domestic funding cost | D if real rate deeply negative with FX pressure, or extreme hikes (> +500bp in 12m) **[convention]** | S&P monetary assessment | BIS `WS_CBPOL` (data.bis.org); WDI `FR.INR.LEND` as proxy |

### B. Fiscal & public debt
| # | Metric | Definition | Why it matters | C / W / D | Threshold source | Free data (code) |
|---|---|---|---|---|---|---|
| 7 | GG gross debt % GDP | Gross GG debt / GDP | Core solvency metric. Headline for every rating and DSA | **EM**: C < 50 · W 50–70 · D > 70. **AE**: D > 85. **LIC** PV public debt benchmark: 35 / 55 / 70 | IMF MAC DSA 2013 **[verified]**; LIC DSF 2018 | WEO `GGXWDG_NGDP` |
| 8 | Net GG debt % GDP | Gross debt − liquid financial assets | S&P's primary debt measure | C < 30 · W 30–60 · elevated 60–100 · D > 100 | S&P debt-burden grid (bands < 30 / 30–60 / 60–80 / 80–100 / > 100) | WEO `GGXWDN_NGDP` (patchy) |
| 9 | Debt / revenue | GG debt / GG revenue | Better than debt/GDP for low-tax countries (e.g., Nigeria, Egypt). Moody's debt burden factor | C < 200% · W 200–350% · D > 350% **[convention]** | Moody's fiscal strength | Compute: `GGXWDG_NGDP` / `GGR_NGDP` |
| 10 | **Interest / revenue** | GG interest paid / GG revenue | Best single affordability metric. Key to restructuring and IMF talks | C < 5% · W 5–15% · D > 15% (> 25–30% = acute) | S&P grid (< 5 / 5–10 / 10–15 / > 15); Moody's, Fitch (4.6%) | WDI `GC.XPN.INTP.RV.ZS`; or WEO (`GGXONLB_NGDP` − `GGXCNL_NGDP`) / `GGR_NGDP` |
| 11 | Overall fiscal balance % GDP | GG net lending/borrowing | Headline deficit. Drives GFN and debt path | C > −3 · W −3 to −6 · D < −6 **[convention; −3 = EU Maastricht anchor]** | Fitch public finances; S&P budgetary performance (Δ net debt/GDP) | WEO `GGXCNL_NGDP` |
| 12 | Primary balance vs debt-stabilising PB | PB = balance excl. interest. Debt-stabilising PB = (r−g)/(1+g) × d | Shows the fiscal effort needed. Sets the IMF programme targets | C: PB ≥ stabilising PB · W: gap < 2pp · D: gap > 2pp or 3y adjustment needed > 2pp **[2pp = IMF 2013 MAC "3-yr cumulative PB adjustment" flag]** | IMF MAC DSA / SRDSF | WEO `GGXONLB_NGDP` |
| 13 | **r − g differential** | Effective nominal interest rate on debt − nominal GDP growth | If > 0, debt rises even with a balanced primary budget. Snowball effect | C < 0 · W 0–2pp · D > 2pp (persistent) **[convention]** | IMF DSA debt dynamics decomposition | Compute: r = interest_t / debt_{t−1}; g from WEO `NGDP` |
| 14 | **Gross financing needs (GFN) % GDP** | Deficit + amortisation of all GG debt in the year | Rollover/liquidity risk. Defines issuance size and Eurobond windows | **EM**: C < 10 · W 10–15 · D > 15. **AE**: D > 20 | IMF MAC DSA 2013 **[verified]**; SRDSF GFN module | IMF DSAs / Fiscal Monitor tables; compute from budget + maturity profile |
| 15 | **FX-denominated share of public debt** | FX debt / total public debt | Currency mismatch. Devaluation inflates debt (original sin) | C < 20% · W 20–60% · D > 60% (S&P negative adjustment if > 40%) | IMF MAC DSA EM heat map **[verified]**; S&P criteria **[verified]** | WB Quarterly Public Sector Debt (QPSD); IMF DSAs; Fitch SRM |
| 16 | Non-resident holdings of public debt | Share held by non-residents | Sudden-stop and outflow risk, plus creditor composition for a restructuring | **EM**: C < 15% · W 15–45% · D > 45% (S&P: > 60% of central gov. commercial debt) | IMF MAC DSA **[verified]**; S&P **[verified]** | QPSD; national DMO |
| 17 | Debt profile: avg maturity & ST share | Avg time to maturity; Δ ST debt share | Refinancing wall. S&P also flags amortisation swings > 5% GDP y/y and bank holdings of gov. debt > 20% of bank assets | D: avg maturity < 3y (S&P) **[verified]**; Δ ST share > 1pp/yr EM (IMF) **[verified]** | S&P; IMF MAC DSA | National DMO; Eurobond maturity calendar (Bloomberg/Cbonds; free: DMO sites) |

### C. External sector & reserves
| # | Metric | Definition | Why it matters | C / W / D | Threshold source | Free data (code) |
|---|---|---|---|---|---|---|
| 18 | Current account balance % GDP | CA balance | External funding need. Mirror of the fiscal deficit (twin deficits) | C > −3 · W −3 to −5 · D < −5 (unless FDI-financed) **[convention]** | Fitch uses CAB + net FDI | WEO `BCA_NGDPD`; WDI `BN.CAB.XOKA.GD.ZS` |
| 19 | Exports (G&S) % GDP & concentration | Exports / GDP; commodity share of exports | FX-earning capacity is the denominator of external ratios. Commodity dependence adds volatility | W if top commodity > 50% of exports **[convention]** | Fitch commodity dependence; Moody's diversification | WDI `NE.EXP.GNFS.ZS`, `NE.EXP.GNFS.CD`; WEO `TX_RPCH` (volume growth) |
| 20 | **External financing requirement % GDP** | CA deficit + amortisation of ST external debt (remaining maturity) | Liquidity counterpart of the GFN. Basis of S&P's GEFN/(CAR + usable reserves) | **EM**: C < 5 · W 5–15 · D > 15 | IMF MAC DSA **[verified]** | Compute: WEO CA + WB IDS ST debt (`DT.DOD.DSTC.CD`) |
| 21 | External debt (PV) % GDP / GNI | Total external debt (public + private) | External solvency | **LIC** PV ext. debt/GDP: 30 / 40 / 55. Nominal % GNI: W > 40, D > 60 for EM **[convention]** | LIC DSF 2018 | WDI/IDS `DT.DOD.DECT.GN.ZS`, `DT.DOD.DECT.CD` |
| 22 | PV external debt / exports | PV of PPG external debt / exports | Solvency vs FX earnings | **LIC**: 140 / 180 / 240% **[verified]** | LIC DSF 2018 | IMF-WB LIC DSAs; IDS `DT.DOD.DECT.EX.ZS` (nominal) |
| 23 | **External debt service / exports** | PPG ext. debt service / exports of G&S | Liquidity: the first ratio to break before a default | **LIC**: 10 / 15 / 21% | LIC DSF 2018 | WDI `DT.TDS.DECT.EX.ZS` (total), `DT.TDS.DPPG.XP.ZS` (PPG) |
| 24 | **External debt service / revenue** | PPG ext. debt service / gov. revenue | Fiscal side of FX debt service. Key in restructuring capacity-to-pay | **LIC**: 14 / 18 / 23% **[verified]** | LIC DSF 2018 | IMF-WB LIC DSAs; compute IDS ÷ WEO revenue |
| 25 | **FX reserves: months of imports** | Gross reserves / monthly imports of G&S | Classic buffer measure | C > 5 · W 3–5 · D < 3 months | IMF traditional rule (3 months; LICs often target 4–6) | WDI `FI.RES.TOTL.MO`, `FI.RES.TOTL.CD` |
| 26 | **Reserves / IMF ARA metric** | Reserves / risk-weighted metric (exports, broad money, ST debt, other liabilities) | IMF's preferred EM adequacy measure | C 100–150% · W 60–100% · D < 60% (SRDSF flags < 60% as high stress) **[verified]** | IMF ARA framework; SRDSF guidance note | IMF ARA dataset (imf.org "Assessing Reserve Adequacy") |
| 27 | Reserves / ST external debt (Greenspan-Guidotti) | Reserves / external debt due ≤ 12m (remaining maturity) | Can the country survive 12m without market access? | C > 150% · W 100–150% · D < 100% | Greenspan-Guidotti rule | WDI `DT.DOD.DSTC.IR.ZS` (inverse: ST debt % reserves) |

### D. Markets, ratings & official sector
| # | Metric | Definition | Why it matters | C / W / D | Threshold source | Free data |
|---|---|---|---|---|---|---|
| 28 | Credit ratings (S&P / Moody's / Fitch) + outlook | LT FC & LC issuer ratings | Investor base, index eligibility, pricing | IG ≥ BBB−/Baa3 · HY BB+ to B− · D ≤ CCC+/Caa1 · SD/RD = default | Agency scales | Agency websites; Wikipedia country-ratings list |
| 29 | Eurobond spread / CDS (5y) | Spread vs UST/Bund of same tenor (EMBI-style), or 5y CDS | Market access test. Pricing for new issuance | C < 200bp · W 200–600bp · D > 600bp (3-month average). > 1000bp = distressed / no access **[convention]** | IMF MAC DSA **[verified]** | worldgovernmentbonds.com (yields, CDS); compute from Eurobond YTM − UST (FRED `DGS5`, `DGS10`) |
| 30 | Local yield curve (2y / 5y / 10y) | LC sovereign yields by tenor | Domestic funding cost. Inversion = stress or tight policy. Feeds r in r–g | D: curve inverted plus rising front end with FX pressure **[convention]** | — | National CB/DMO; worldgovernmentbonds.com; FRED OECD `IRLTLT01{CC}M156N` (10y) |
| 31 | IMF programme status & DSA rating | Current arrangement (SBA / EFF / ECF / RSF / FCL / PLL / PCI / SMP), reviews on track; LIC DSA risk rating | Anchor for creditors and ratings. Reviews unlock disbursements. DSA verdict decides whether a restructuring is needed | FCL/PLL = strong · on-track UCT programme = watch · off-track, or "high risk / in debt distress" / "unsustainable" = danger | IMF lending policy; LIC DSA list | IMF "Lending arrangements" (MONA), monthly `dsalist.pdf`; IMF country pages |
| 32 | Default & arrears history | Years since last default/restructuring; arrears to official creditors | Fitch SRM variable. IMF lending-into-arrears policy. Common Framework eligibility | D: default < 10y ago or arrears outstanding | Fitch SRM; IMF LIA policy | Bank of Canada–BoE sovereign default database (CRAG); Reinhart-Rogoff |

Also worth a "contingent liabilities" note card: SOE debt, bank-sovereign nexus (S&P: banks holding > 20% of assets in gov. debt), PPPs. Data: IMF DSAs, IMF Fiscal Monitor.

**Minimum set for v1 (≈ 20):** 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 18, 19, 21, 23, 25, 26, 28, 29, 30, 31.

---

## 3. Rule-of-thumb tooltips (educational)

1. **Debt dynamics in one line:** Δd ≈ (r − g)/(1+g)·d − primary balance. If r > g, a country must run a primary surplus just to keep debt stable.
2. **Interest/revenue beats debt/GDP.** Japan has ~230% debt/GDP and very low interest/revenue. Egypt or Pakistan with ~90% can spend 50%+ of revenue on interest. Above ~15% S&P scores the debt burden in its worst band.
3. **Liquidity kills before solvency.** Most sovereign defaults are rollover crises. Watch GFN > 15% of GDP (EM) and reserves < 100% of debt due within 12 months.
4. **EMs default at lower debt than AEs** ("debt intolerance"): IMF uses 70% of GDP for EMs vs 85% for AEs, and LIC benchmarks start at 35% (PV).
5. **FX debt is the multiplier.** With 60% FX debt, a 30% devaluation adds ~18% to the debt stock overnight.
6. **Spreads tell you about market access:** < 200bp IG-like; 200–600bp issuance possible but costly; > 600bp high risk (IMF); > 1000bp the market is pricing a restructuring.
7. **Reserves:** 3 months of imports is the floor for most countries. EMs with an open capital account need 100–150% of the IMF ARA metric. Below 60% of ARA, the IMF requires a deeper analysis.
8. **Governance and income dominate ratings.** In Fitch's model, structural features are ~54% of the weight versus ~19% for public finances.
9. **Twin deficits:** a fiscal deficit plus a current account deficit means the state is funded by foreigners. Check non-resident holdings (> 45% = IMF high-risk flag).
10. **Investment grade cliff:** BBB−/Baa3 → BB+ (a "fallen angel") triggers forced selling by IG mandates, so the step costs far more than one notch normally would.
11. **IMF programme ≠ restructuring:** the IMF can only lend if debt is "sustainable" (or made so via restructuring with financing assurances). An "unsustainable" DSA verdict therefore requires a restructuring first.
12. **LIC vs MAC:** PRGT-eligible countries use the LIC DSF (thresholds depend on debt-carrying capacity). Everyone else uses the SRDSF. A new LIC DSF was approved in Sept 2026 and applies from ~mid-2027.
13. **Current account deficits funded by FDI are benign.** Those funded by portfolio flows or ST debt are fragile. Fitch looks at CA + net FDI for this reason.
14. **Inflation helps then hurts:** high inflation erodes LC debt in real terms, but it raises the r on new borrowing and signals that the central bank is not credible.

---

### Sources
- IMF (2013) Staff Guidance Note for Public DSA in MACs – heat-map benchmarks (EM: debt 70, GFN 15, EMBI 200/600, EFR 5/15, FX debt 20/60, non-resident 15/45, ΔST 0.5/1.0) – https://www.imf.org/external/np/pp/eng/2013/050913.pdf
- IMF (2022) Staff Guidance Note on the SRDSF – Annex IV thresholds; ARA < 60% flag – https://www.imf.org/-/media/Files/Publications/PP/2022/English/PPEA2022039.ashx
- IMF–WB LIC DSF factsheet – https://www.imf.org/en/about/factsheets/sheets/2023/imf-world-bank-debt-sustainability-framework-for-low-income-countries ; 2026 review press release PR26/296 – https://www.imf.org/en/news/articles/2026/09/21/pr26296-lics-imf-executive-board-reviews-the-joint-world-bank-debt-sustainability-framework
- Fitch Interactive SRM annual presentation (Feb 2025) – pillar weights – https://assets.ctfassets.net/03fbs7oah13w/XJlag78EMxlWaUH3qlBy8/a205840c68c0e9cf0e8fd93cc5860a4b/Interactive_SRM_Annual_Presenation_202410_coefficients_20250206.pdf
- S&P Sovereign Government Rating Methodology (2011 text; structure kept in later versions) – debt-structure adjustments (FX > 40%, non-resident > 60%, maturity < 3y, banks > 20%) – https://www.concertedaction.com/wp-content/uploads/2012/05/Standard-Poors-Sovereign-Government-Rating-And-Methodology.pdf ; current version: https://www.spglobal.com/content/dam/spglobal/ratings/en/documents/pdfs/021519_howweratesovereigns.pdf
- Moody's Sovereigns Methodology (Nov 2022) – https://ratings.moodys.com/api/rmc-documents/395819
