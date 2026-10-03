import type { Country, Status } from './types';
import { compositeNotch, notchLabel } from './ratings';

export const FOCUS_YEAR = 2025; // latest full year; IMF projections thereafter
export const FIRST_YEAR = 2008;
export const LAST_YEAR = 2031;

export type Pillar = 'Economy' | 'Fiscal & Debt' | 'External' | 'Markets & Ratings' | 'Institutions';
export type Unit = '%GDP' | '%' | 'pp' | 'USD bn' | 'USD' | 'months' | 'bp' | 'score' | 'm' | 'notch';
type Band = { good: number; danger: number }; // direction implied by metric.better

export interface MetricDef {
  key: string;
  label: string;
  short: string;
  pillar: Pillar;
  unit: Unit;
  better: 'higher' | 'lower' | 'none';
  /** colour scale used on the map */
  scale: 'seq' | 'div' | 'rating';
  /** time series available (vs snapshot) */
  timeseries: boolean;
  /** tolerance in years when looking for the latest observation (WB data lags) */
  lag?: number;
  thresholds?: (c: Country) => Band | null;
  what: string;
  why: string;
  rule?: string;
  source: string;
  decimals?: number;
  mustHave?: boolean;
}

const byGroup = (ae: Band, em: Band, lic: Band = em) => (c: Country) =>
  c.group === 'AE' ? ae : c.group === 'LIC' ? lic : em;

export const METRICS: MetricDef[] = [
  // ---------- Economy ----------
  {
    key: 'gdp', label: 'Nominal GDP', short: 'GDP', pillar: 'Economy', unit: 'USD bn', better: 'none', scale: 'seq', timeseries: true, mustHave: true,
    what: 'Gross domestic product at current prices, US$ billions.',
    why: 'Scale of the economy: drives market depth, index weight and how large a deal the market can absorb. Share of world GDP is ~14% of Fitch’s model weight.',
    source: 'IMF WEO (NGDPD)', decimals: 0,
  },
  {
    key: 'growth', label: 'Real GDP growth', short: 'Growth', pillar: 'Economy', unit: '%', better: 'higher', scale: 'div', timeseries: true,
    thresholds: byGroup({ good: 2, danger: 0.5 }, { good: 4, danger: 1 }, { good: 5, danger: 2 }),
    what: 'Annual % change in real GDP.',
    why: 'Growth is the “g” in r − g: it decides whether debt ratios fall on their own. Volatility is penalised by Moody’s and Fitch.',
    rule: 'EM: > 4% comfortable, < 1% danger. AE: > 2% comfortable.',
    source: 'IMF WEO (NGDP_RPCH)', decimals: 1,
  },
  {
    key: 'gdpPc', label: 'GDP per capita', short: 'GDP / capita', pillar: 'Economy', unit: 'USD', better: 'higher', scale: 'seq', timeseries: true,
    thresholds: () => ({ good: 14000, danger: 4500 }),
    what: 'GDP divided by population, current US$.',
    why: 'The single strongest correlate of sovereign ratings — a proxy for tax base and shock-absorption capacity.',
    rule: 'Roughly: < $4.5k lower-middle income, > $14k high income (World Bank bands).',
    source: 'IMF WEO (NGDPDPC)', decimals: 0,
  },
  {
    key: 'inflation', label: 'Inflation (CPI, avg)', short: 'Inflation', pillar: 'Economy', unit: '%', better: 'lower', scale: 'seq', timeseries: true,
    thresholds: byGroup({ good: 3, danger: 6 }, { good: 5, danger: 10 }),
    what: 'Average annual consumer price inflation.',
    why: 'Monetary credibility. High inflation erodes local-currency debt in real terms but raises the cost of new borrowing and signals policy weakness.',
    rule: 'EM: < 5% comfortable, double digits = danger.',
    source: 'IMF WEO (PCPIPCH)', decimals: 1,
  },
  {
    key: 'unemployment', label: 'Unemployment', short: 'Unemployment', pillar: 'Economy', unit: '%', better: 'lower', scale: 'seq', timeseries: true,
    thresholds: () => ({ good: 6, danger: 12 }),
    what: 'Unemployment rate, % of labour force.', why: 'Social and political capacity to sustain fiscal adjustment.',
    source: 'IMF WEO (LUR)', decimals: 1,
  },
  {
    key: 'population', label: 'Population', short: 'Population', pillar: 'Economy', unit: 'm', better: 'none', scale: 'seq', timeseries: true,
    what: 'Population, millions.', why: 'Context for per-capita metrics and market size.', source: 'IMF WEO (LP)', decimals: 1,
  },

  // ---------- Fiscal & debt ----------
  {
    key: 'fiscalBalance', label: 'Fiscal balance', short: 'Fiscal bal.', pillar: 'Fiscal & Debt', unit: '%GDP', better: 'higher', scale: 'div', timeseries: true, mustHave: true,
    thresholds: () => ({ good: -3, danger: -6 }),
    what: 'General government net lending (+) / borrowing (−), % of GDP. A negative number is the fiscal deficit.',
    why: 'The headline deficit drives the gross financing need and the debt path.',
    rule: '> −3% comfortable (Maastricht anchor), < −6% danger.',
    source: 'IMF WEO (GGXCNL_NGDP)', decimals: 1,
  },
  {
    key: 'primaryBalance', label: 'Primary balance', short: 'Primary bal.', pillar: 'Fiscal & Debt', unit: '%GDP', better: 'higher', scale: 'div', timeseries: true,
    thresholds: () => ({ good: 0, danger: -3 }),
    what: 'Fiscal balance excluding interest payments, % of GDP.',
    why: 'The fiscal effort under the government’s control — the anchor of every IMF programme and restructuring capacity-to-pay analysis.',
    source: 'IMF Fiscal Monitor', decimals: 1,
  },
  {
    key: 'debt', label: 'Government debt', short: 'Debt', pillar: 'Fiscal & Debt', unit: '%GDP', better: 'lower', scale: 'seq', timeseries: true, mustHave: true,
    thresholds: byGroup({ good: 60, danger: 85 }, { good: 50, danger: 70 }, { good: 35, danger: 55 }),
    what: 'General government gross debt, % of GDP.',
    why: 'The core solvency metric. Emerging markets get into trouble at much lower levels than advanced economies (“debt intolerance”).',
    rule: 'IMF benchmarks: 70% for EMs, 85% for AEs; LIC public-debt benchmarks 35/55/70% (PV).',
    source: 'IMF WEO (GGXWDG_NGDP)', decimals: 1,
  },
  {
    key: 'interestRevenue', label: 'Interest / revenue', short: 'Int./revenue', pillar: 'Fiscal & Debt', unit: '%', better: 'lower', scale: 'seq', timeseries: true,
    thresholds: () => ({ good: 5, danger: 15 }),
    what: 'Government interest payments as % of government revenue (computed as primary minus overall balance, over revenue).',
    why: 'The best single debt-affordability metric — often more telling than debt/GDP. Key in restructuring and IMF discussions.',
    rule: 'S&P bands: < 5% strong, > 15% weakest band; > 25–30% is acute stress.',
    source: 'IMF WEO / Fiscal Monitor (computed)', decimals: 1,
  },
  {
    key: 'debtRevenue', label: 'Debt / revenue', short: 'Debt/revenue', pillar: 'Fiscal & Debt', unit: '%', better: 'lower', scale: 'seq', timeseries: true,
    thresholds: () => ({ good: 200, danger: 350 }),
    what: 'Government gross debt as % of government revenue.',
    why: 'Adjusts debt for the state’s capacity to tax — low-revenue countries (e.g. Nigeria, Egypt) look riskier than debt/GDP suggests.',
    source: 'IMF WEO / Fiscal Monitor (computed)', decimals: 0,
  },
  {
    key: 'revenue', label: 'Government revenue', short: 'Revenue', pillar: 'Fiscal & Debt', unit: '%GDP', better: 'higher', scale: 'seq', timeseries: true,
    thresholds: () => ({ good: 25, danger: 15 }),
    what: 'General government revenue, % of GDP.', why: 'Fiscal capacity; a thin revenue base limits debt-carrying capacity.',
    source: 'IMF Fiscal Monitor', decimals: 1,
  },
  {
    key: 'rMinusG', label: 'r − g differential', short: 'r − g', pillar: 'Fiscal & Debt', unit: 'pp', better: 'lower', scale: 'div', timeseries: true,
    thresholds: () => ({ good: 0, danger: 2 }),
    what: 'Effective nominal interest rate on public debt minus nominal GDP growth (approximation: interest_t / debt_t−1 vs (1+real growth)(1+CPI) − 1).',
    why: 'If r > g, debt rises even with a balanced primary budget (“snowball effect”).',
    rule: 'Δdebt ≈ (r − g)/(1+g) × debt − primary balance.',
    source: 'Computed from IMF WEO / Fiscal Monitor', decimals: 1,
  },
  {
    key: 'stabilisingGap', label: 'Primary balance vs debt-stabilising', short: 'PB gap', pillar: 'Fiscal & Debt', unit: 'pp', better: 'higher', scale: 'div', timeseries: true,
    thresholds: () => ({ good: 0, danger: -2 }),
    what: 'Actual primary balance minus the primary balance that would keep debt/GDP stable ((r−g)/(1+g) × debt).',
    why: 'Negative = debt ratio is rising on current policies; the size is the fiscal adjustment required.',
    source: 'Computed from IMF WEO / Fiscal Monitor', decimals: 1,
  },

  // ---------- External ----------
  {
    key: 'currentAccount', label: 'Current account balance', short: 'Current acct.', pillar: 'External', unit: '%GDP', better: 'higher', scale: 'div', timeseries: true, mustHave: true,
    thresholds: () => ({ good: -3, danger: -5 }),
    what: 'Current account balance, % of GDP. A negative number is the current account deficit.',
    why: 'The external funding need. Twin deficits (fiscal + current account) mean the state is effectively funded by foreigners. FDI-funded deficits are more benign.',
    rule: '> −3% comfortable, < −5% danger unless FDI-financed.',
    source: 'IMF WEO (BCA_NGDPD)', decimals: 1,
  },
  {
    key: 'exportsGdp', label: 'Exports (goods & services)', short: 'Exports', pillar: 'External', unit: '%GDP', better: 'higher', scale: 'seq', timeseries: true, lag: 3, mustHave: true,
    thresholds: () => ({ good: 30, danger: 15 }),
    what: 'Exports of goods and services, % of GDP.',
    why: 'Export receipts are the denominator of every external-liquidity ratio — the FX the country earns to service FX debt.',
    source: 'World Bank WDI (NE.EXP.GNFS.ZS)', decimals: 1,
  },
  {
    key: 'exportsUsd', label: 'Exports, US$ bn', short: 'Exports $bn', pillar: 'External', unit: 'USD bn', better: 'none', scale: 'seq', timeseries: true, lag: 3,
    what: 'Exports of goods and services (BoP), US$ billions.', why: 'Absolute FX earnings.', source: 'World Bank WDI (BX.GSR.GNFS.CD)', decimals: 1,
  },
  {
    key: 'commodityShare', label: 'Commodity export share', short: 'Commodity dep.', pillar: 'External', unit: '%', better: 'lower', scale: 'seq', timeseries: true, lag: 4,
    thresholds: () => ({ good: 30, danger: 60 }),
    what: 'Fuel + ores & metals + food + agricultural raw materials, % of merchandise exports.',
    why: 'Commodity dependence makes FX receipts and revenues volatile (Fitch SRM variable).',
    source: 'World Bank WDI (TX.VAL.*)', decimals: 0,
  },
  {
    key: 'reservesMonths', label: 'FX reserves (months of imports)', short: 'Reserves', pillar: 'External', unit: 'months', better: 'higher', scale: 'seq', timeseries: true, lag: 3,
    thresholds: () => ({ good: 5, danger: 3 }),
    what: 'Gross international reserves in months of imports of goods and services.',
    why: 'The classic liquidity buffer: how long the country can pay for imports without new inflows.',
    rule: '3 months is the floor; > 5 comfortable. Open-capital-account EMs should also be checked against the IMF ARA metric (100–150%).',
    source: 'World Bank WDI (FI.RES.TOTL.MO)', decimals: 1,
  },
  {
    key: 'extDebtGni', label: 'External debt', short: 'Ext. debt', pillar: 'External', unit: '%', better: 'lower', scale: 'seq', timeseries: true, lag: 3,
    thresholds: () => ({ good: 40, danger: 60 }),
    what: 'Total external debt stocks (public + private), % of GNI. Low- and middle-income countries only.',
    why: 'External solvency: how much the whole economy owes abroad.',
    source: 'World Bank IDS (DT.DOD.DECT.GN.ZS)', decimals: 1,
  },
  {
    key: 'debtServiceExports', label: 'External debt service / exports', short: 'Debt svc / X', pillar: 'External', unit: '%', better: 'lower', scale: 'seq', timeseries: true, lag: 3,
    thresholds: byGroup({ good: 15, danger: 21 }, { good: 15, danger: 21 }, { good: 10, danger: 15 }),
    what: 'Total external debt service as % of exports of goods, services and primary income.',
    why: 'The external liquidity ratio — usually the first to break before a default.',
    rule: 'LIC DSF thresholds: 10 / 15 / 21% for weak / medium / strong debt-carrying capacity.',
    source: 'World Bank IDS (DT.TDS.DECT.EX.ZS)', decimals: 1,
  },
  {
    key: 'fdiGdp', label: 'FDI net inflows', short: 'FDI', pillar: 'External', unit: '%GDP', better: 'higher', scale: 'seq', timeseries: true, lag: 3,
    thresholds: () => ({ good: 3, danger: 1 }),
    what: 'Foreign direct investment, net inflows, % of GDP.', why: 'Stable, non-debt financing of the current account.',
    source: 'World Bank WDI', decimals: 1,
  },
  {
    key: 'remittancesGdp', label: 'Remittances', short: 'Remittances', pillar: 'External', unit: '%GDP', better: 'none', scale: 'seq', timeseries: true, lag: 3,
    what: 'Personal remittances received, % of GDP.', why: 'A large and resilient FX source for many frontier economies (Egypt, Pakistan, Central America).',
    source: 'World Bank WDI', decimals: 1,
  },

  // ---------- Markets & ratings ----------
  {
    key: 'rating', label: 'Credit rating (avg. of 3 agencies)', short: 'Rating', pillar: 'Markets & Ratings', unit: 'notch', better: 'lower', scale: 'rating', timeseries: false, mustHave: true,
    thresholds: () => ({ good: 10, danger: 16.5 }),
    what: 'Average long-term foreign-currency rating across S&P, Moody’s and Fitch, on a 1 (AAA) to 22 (default) notch scale.',
    why: 'Sets the investor base, index eligibility and pricing. The BBB−/BB+ “investment-grade cliff” triggers forced selling.',
    rule: 'IG ≥ BBB−/Baa3 · HY BB+ to B− · distressed ≤ CCC+ · SD/RD = default.',
    source: 'S&P, Moody’s, Fitch (curated snapshot)', decimals: 1,
  },
  {
    key: 'cds5y', label: '5Y CDS spread', short: 'CDS 5Y', pillar: 'Markets & Ratings', unit: 'bp', better: 'lower', scale: 'seq', timeseries: false,
    thresholds: () => ({ good: 200, danger: 600 }),
    what: '5-year sovereign credit default swap spread, basis points.',
    why: 'The market’s real-time default pricing and a test of market access.',
    rule: 'IMF: < 200bp low risk, > 600bp high risk; > 1,000bp = market is pricing a restructuring.',
    source: 'Market snapshot (indicative)', decimals: 0,
  },
  {
    key: 'yield10y', label: '10Y government bond yield', short: '10Y yield', pillar: 'Markets & Ratings', unit: '%', better: 'lower', scale: 'seq', timeseries: false, mustHave: true,
    what: 'Local-currency 10-year government bond yield (or closest tenor).',
    why: 'Domestic funding cost — feeds the “r” in r − g. Compare with inflation for the real yield.',
    source: 'Market snapshot (indicative)', decimals: 2,
  },
  {
    key: 'curveSlope', label: 'Yield curve slope (10Y − 2Y)', short: '2s10s', pillar: 'Markets & Ratings', unit: 'bp', better: 'none', scale: 'div', timeseries: false, mustHave: true,
    what: '10-year minus 2-year local yield, basis points.',
    why: 'An inverted curve signals tight policy or near-term stress; a steep curve signals term/fiscal risk premia.',
    source: 'Market snapshot (indicative)', decimals: 0,
  },
  {
    key: 'policyRate', label: 'Policy rate', short: 'Policy rate', pillar: 'Markets & Ratings', unit: '%', better: 'none', scale: 'seq', timeseries: false,
    what: 'Central bank policy rate.', why: 'Monetary stance; real policy rate (minus inflation) shows how hard the central bank is defending the currency.',
    source: 'Central banks (curated snapshot)', decimals: 2,
  },

  // ---------- Institutions ----------
  {
    key: 'governance', label: 'Governance (WGI avg.)', short: 'Governance', pillar: 'Institutions', unit: 'score', better: 'higher', scale: 'seq', timeseries: true, lag: 3,
    thresholds: () => ({ good: 60, danger: 30 }),
    what: 'Average of the six World Bank Worldwide Governance Indicators, 0–100 score.',
    why: 'The largest single weight in Fitch’s rating model (~22%) and the core of Moody’s institutions pillar.',
    source: 'World Bank WGI', decimals: 0,
  },
];

export const METRIC = Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<string, MetricDef>;

// ---------------------------------------------------------------------------
// Derived series — computed once at load
// ---------------------------------------------------------------------------
const WGI = ['wgiGov', 'wgiRule', 'wgiCorruption', 'wgiPolitical', 'wgiRegulatory', 'wgiVoice'];

export function deriveSeries(c: Country) {
  const s = c.series;
  const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
  const put = (k: string, y: number, v: number | null) => {
    if (v == null || !Number.isFinite(v)) return;
    (s[k] ??= {})[y] = Math.round(v * 100) / 100;
  };
  for (const y of years) {
    const pb = s.primaryBalance?.[y], fb = s.fiscalBalance?.[y], rev = s.revenue?.[y];
    const debt = s.debt?.[y], debtPrev = s.debt?.[y - 1];
    const interest = pb != null && fb != null ? pb - fb : s.interestGdp?.[y];
    if (interest != null) put('interestGdp', y, interest);
    if (interest != null && rev) put('interestRevenue', y, (interest / rev) * 100);
    if (debt != null && rev) put('debtRevenue', y, (debt / rev) * 100);
    const g = s.growth?.[y], pi = s.inflation?.[y];
    if (g != null && pi != null && interest != null && debtPrev) {
      const gn = (1 + g / 100) * (1 + pi / 100) - 1;
      const r = (interest * (1 + gn)) / debtPrev;
      if (r < 0.5 && Math.abs(gn) < 1) {
        put('rMinusG', y, (r - gn) * 100);
        if (pb != null) put('stabilisingGap', y, pb - ((r - gn) / (1 + gn)) * debtPrev);
      }
    }
    if (s.exportsUsd?.[y] != null) s.exportsUsd[y] = Math.round(s.exportsUsd[y] / 1e7) / 100;
    if (s.reservesUsd?.[y] != null) s.reservesUsd[y] = Math.round(s.reservesUsd[y] / 1e7) / 100;
    const comm = ['fuelExports', 'oresExports', 'foodExports', 'agriExports'].map((k) => s[k]?.[y]);
    if (comm.every((v) => v != null)) put('commodityShare', y, comm.reduce((a, b) => a! + b!, 0)!);
    const w = WGI.map((k) => s[k]?.[y]).filter((v): v is number => v != null);
    if (w.length >= 4) put('governance', y, w.reduce((a, b) => a + b, 0) / w.length);
  }
}

// ---------------------------------------------------------------------------
// Value access
// ---------------------------------------------------------------------------
export interface Obs {
  value: number;
  year: number | null;
  projected?: boolean;
}

function curveValue(curve: Record<string, number | null> | null | undefined, tenors: string[]) {
  if (!curve) return null;
  for (const t of tenors) if (curve[t] != null) return curve[t] as number;
  return null;
}

export function getObs(c: Country | undefined, key: string, year = FOCUS_YEAR): Obs | null {
  if (!c) return null;
  const m = METRIC[key];
  if (m && !m.timeseries) {
    const mk = c.markets;
    let v: number | null | undefined = null;
    if (key === 'rating') v = compositeNotch(c);
    else if (key === 'cds5y') v = mk?.cds5y;
    else if (key === 'policyRate') v = mk?.policyRate;
    else if (key === 'yield10y') v = curveValue(mk?.localCurve, ['10Y', '7Y', '15Y', '5Y']);
    else if (key === 'curveSlope') {
      const l = curveValue(mk?.localCurve, ['10Y', '7Y']);
      const s = curveValue(mk?.localCurve, ['2Y', '1Y', '3Y']);
      v = l != null && s != null ? (l - s) * 100 : null;
    }
    return v == null || !Number.isFinite(v) ? null : { value: v, year: null };
  }
  const s = c.series[key];
  if (!s) return null;
  if (s[year] != null) return { value: s[year], year, projected: year > FOCUS_YEAR };
  const lag = m?.lag ?? 0;
  for (let y = year - 1; y >= year - lag; y--) if (s[y] != null) return { value: s[y], year: y };
  return null;
}

export const getValue = (c: Country | undefined, key: string, year = FOCUS_YEAR) => getObs(c, key, year)?.value ?? null;

export function statusOf(c: Country, key: string, value: number | null): Status | null {
  const m = METRIC[key];
  if (value == null || !m?.thresholds) return null;
  const t = m.thresholds(c);
  if (!t) return null;
  if (m.better === 'higher') return value >= t.good ? 'good' : value <= t.danger ? 'danger' : 'watch';
  if (m.better === 'lower') return value <= t.good ? 'good' : value >= t.danger ? 'danger' : 'watch';
  return null;
}

export const STATUS_LABEL: Record<Status, string> = { good: 'Comfortable', watch: 'Watch', danger: 'Danger' };
export const STATUS_COLOR: Record<Status, string> = { good: 'var(--good)', watch: 'var(--warning)', danger: 'var(--critical)' };

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export function fmt(key: string, v: number | null | undefined, opts: { unit?: boolean; sign?: boolean } = {}) {
  if (v == null || !Number.isFinite(v)) return '—';
  const m = METRIC[key];
  const unit = opts.unit ?? true;
  if (m?.unit === 'notch') return notchLabel(v);
  const d = m?.decimals ?? 1;
  const sign = opts.sign ?? (m?.scale === 'div' && m.unit !== 'bp');
  const abs = Math.abs(v);
  let num: string;
  if (m?.unit === 'USD bn') {
    num = abs >= 1000 ? `${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })}tn` : `${v.toLocaleString('en-US', { maximumFractionDigits: abs < 10 ? 1 : 0 })}bn`;
    return unit ? `$${num}` : num;
  }
  num = v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  if (sign && v > 0) num = '+' + num;
  if (!unit) return num;
  switch (m?.unit) {
    case '%GDP': return `${num}%`;
    case '%': return `${num}%`;
    case 'pp': return `${num}pp`;
    case 'USD': return `$${num}`;
    case 'months': return `${num} mo`;
    case 'bp': return `${num}bp`;
    case 'm': return `${num}m`;
    default: return num;
  }
}

export const unitNote = (key: string) => {
  const u = METRIC[key]?.unit;
  return u === '%GDP' ? '% of GDP' : u === 'USD bn' ? 'US$' : u === 'USD' ? 'US$' : u === 'months' ? 'months of imports' : u === 'bp' ? 'basis points' : u === 'score' ? '0–100' : u === 'pp' ? 'percentage points' : u === 'notch' ? 'rating' : u === 'm' ? 'millions' : '%';
};
