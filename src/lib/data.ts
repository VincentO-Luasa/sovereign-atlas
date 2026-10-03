import { createContext, useContext } from 'react';
import type { Country, Dataset } from './types';
import { deriveSeries, getValue, METRIC, FOCUS_YEAR } from './metrics';

// IMF advanced economies (WEO classification)
const AE = new Set([
  'AND', 'AUS', 'AUT', 'BEL', 'CAN', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HKG', 'ISL', 'IRL', 'ISR',
  'ITA', 'JPN', 'KOR', 'LVA', 'LTU', 'LUX', 'MAC', 'MLT', 'NLD', 'NZL', 'NOR', 'PRT', 'PRI', 'SMR', 'SGP', 'SVK', 'SVN', 'ESP',
  'SWE', 'CHE', 'TWN', 'GBR', 'USA',
]);

const SHORT: Record<string, string> = {
  EGY: 'Egypt', IRN: 'Iran', KOR: 'South Korea', PRK: 'North Korea', RUS: 'Russia', SYR: 'Syria', VEN: 'Venezuela', YEM: 'Yemen',
  LAO: 'Laos', KGZ: 'Kyrgyzstan', SVK: 'Slovakia', TUR: 'Türkiye', COD: 'DR Congo', COG: 'Congo', GMB: 'Gambia', BHS: 'Bahamas',
  HKG: 'Hong Kong', MAC: 'Macao', MIC: 'Micronesia', FSM: 'Micronesia', LCA: 'St Lucia', VCT: 'St Vincent', KNA: 'St Kitts & Nevis',
  STP: 'São Tomé', CIV: "Côte d'Ivoire", CPV: 'Cabo Verde', PSE: 'West Bank & Gaza', VIR: 'US Virgin Is.', BRN: 'Brunei',
};

export const flag = (iso2: string) =>
  iso2 && /^[A-Z]{2}$/.test(iso2) ? String.fromCodePoint(...[...iso2].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)) : '🏳️';

let promise: Promise<Dataset> | null = null;

export function loadDataset(): Promise<Dataset> {
  promise ??= (async () => {
    const base = import.meta.env.BASE_URL;
    const raw = await (await fetch(`${base}data/countries.json`)).json();
    const countries: Record<string, Country> = raw.countries;
    for (const c of Object.values(countries)) {
      c.group = AE.has(c.iso3) ? 'AE' : c.income === 'Low income' ? 'LIC' : 'EM';
      c.short = SHORT[c.iso3] ?? c.name.replace(/, The$/, '').replace(/,.*$/, '').replace(/ Republic$/, '');
      c.region = c.region.replace('Middle East, North Africa, Afghanistan & Pakistan', 'Middle East & North Africa');
      deriveSeries(c);
    }
    const list = Object.values(countries).sort((a, b) => a.short.localeCompare(b.short));
    return { generatedAt: raw.generatedAt, sources: raw.sources, countries, list };
  })();
  return promise;
}

export const DataContext = createContext<Dataset | null>(null);
export function useData() {
  const d = useContext(DataContext);
  if (!d) throw new Error('Dataset not loaded');
  return d;
}

/** "Covered" = has curated rating/market data — the advisory universe. */
export const isCovered = (c: Country) => !!(c.ratings || c.markets);

// ---------------------------------------------------------------------------
// Percentiles & scorecard
// ---------------------------------------------------------------------------
const pctCache = new Map<string, number[]>();

function sortedValues(list: Country[], key: string, year: number) {
  const id = `${key}:${year}:${list.length}`;
  let v = pctCache.get(id);
  if (!v) {
    v = list.map((c) => getValue(c, key, year)).filter((x): x is number => x != null).sort((a, b) => a - b);
    pctCache.set(id, v);
  }
  return v;
}

/** Percentile 0–100 where 100 = best (direction-aware). */
export function percentile(list: Country[], c: Country, key: string, year = FOCUS_YEAR): number | null {
  const v = getValue(c, key, year);
  if (v == null) return null;
  const vals = sortedValues(list, key, year);
  if (vals.length < 5) return null;
  let below = 0;
  for (const x of vals) if (x < v) below++;
  const p = (below / (vals.length - 1)) * 100;
  const m = METRIC[key];
  return m?.better === 'lower' ? 100 - p : p;
}

export function rank(list: Country[], c: Country, key: string, year = FOCUS_YEAR) {
  const v = getValue(c, key, year);
  if (v == null) return null;
  const vals = sortedValues(list, key, year);
  const desc = METRIC[key]?.better !== 'lower';
  const r = desc ? vals.filter((x) => x > v).length + 1 : vals.filter((x) => x < v).length + 1;
  return { rank: r, of: vals.length };
}

export const PILLARS: { key: string; label: string; metrics: { key: string; transform?: (v: number) => number }[] }[] = [
  { key: 'economy', label: 'Economy', metrics: [{ key: 'gdpPc' }, { key: 'growth' }, { key: 'gdp' }] },
  { key: 'fiscal', label: 'Fiscal', metrics: [{ key: 'debt' }, { key: 'fiscalBalance' }, { key: 'interestRevenue' }] },
  { key: 'external', label: 'External', metrics: [{ key: 'currentAccount' }, { key: 'reservesMonths' }, { key: 'debtServiceExports' }] },
  { key: 'monetary', label: 'Monetary', metrics: [{ key: 'inflation' }] },
  { key: 'institutions', label: 'Institutions', metrics: [{ key: 'governance' }] },
];

/** 0–100 pillar scores = average percentile of the pillar’s metrics. */
export function scorecard(list: Country[], c: Country, year = FOCUS_YEAR) {
  return PILLARS.map((p) => {
    const ps = p.metrics.map((m) => percentile(list, c, m.key, year)).filter((x): x is number => x != null);
    return { ...p, score: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null };
  });
}

export function median(list: Country[], key: string, year = FOCUS_YEAR) {
  const v = sortedValues(list, key, year);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
