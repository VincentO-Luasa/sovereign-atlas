// Builds src/data/countries.json from public APIs (IMF DataMapper, World Bank WDI)
// merged with curated snapshots in data/curated/*.json (ratings, markets, programmes).
//
// Usage: node scripts/fetch-data.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'public/data/countries.json');
const CURATED = path.join(ROOT, 'data/curated');
const FIRST_YEAR = 2008;
const LAST_YEAR = 2031;

// IMF DataMapper indicators (WEO + Fiscal Monitor + FPP)
const IMF = {
  gdp: 'NGDPD', // GDP, US$ bn
  gdpPc: 'NGDPDPC', // GDP per capita, US$
  growth: 'NGDP_RPCH', // real GDP growth, %
  inflation: 'PCPIPCH', // CPI inflation avg, %
  unemployment: 'LUR', // %
  population: 'LP', // millions
  fiscalBalance: 'GGXCNL_NGDP', // GG net lending/borrowing, % GDP
  debt: 'GGXWDG_NGDP', // GG gross debt, % GDP
  currentAccount: 'BCA_NGDPD', // % GDP
  currentAccountUsd: 'BCA', // US$ bn
  primaryBalance: 'GGXONLB_G01_GDP_PT', // FM
  revenue: 'GGR_G01_GDP_PT', // FM
  expenditure: 'G_X_G01_GDP_PT', // FM
  interestGdp: 'ie', // FPP: interest paid, % GDP
};

// World Bank WDI indicators
const WB = {
  exportsGdp: 'NE.EXP.GNFS.ZS', // exports G&S % GDP
  exportsUsd: 'BX.GSR.GNFS.CD', // exports G&S BoP, US$
  importsGdp: 'NE.IMP.GNFS.ZS',
  reservesMonths: 'FI.RES.TOTL.MO', // total reserves in months of imports
  reservesUsd: 'FI.RES.TOTL.CD',
  extDebtGni: 'DT.DOD.DECT.GN.ZS', // external debt stocks % GNI (IDS)
  debtServiceExports: 'DT.TDS.DECT.EX.ZS', // total debt service % of exports G&S + primary income
  interestRevenue: 'GC.XPN.INTP.RV.ZS', // interest payments % revenue
  fdiGdp: 'BX.KLT.DINV.WD.GD.ZS',
  remittancesGdp: 'BX.TRF.PWKR.DT.GD.ZS',
  fuelExports: 'TX.VAL.FUEL.ZS.UN', // % merchandise exports
  oresExports: 'TX.VAL.MMTL.ZS.UN',
  foodExports: 'TX.VAL.FOOD.ZS.UN',
  agriExports: 'TX.VAL.AGRI.ZS.UN',
  manufExports: 'TX.VAL.MANF.ZS.UN',
  wgiGov: 'GOV_WGI_GE.SC@3', // WGI score 0-100: government effectiveness
  wgiRule: 'GOV_WGI_RL.SC@3', // rule of law
  wgiCorruption: 'GOV_WGI_CC.SC@3', // control of corruption
  wgiPolitical: 'GOV_WGI_PV.SC@3', // political stability
  wgiRegulatory: 'GOV_WGI_RQ.SC@3', // regulatory quality
  wgiVoice: 'GOV_WGI_VA.SC@3', // voice & accountability
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'sovereign-atlas/1.0' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1500 * (i + 1));
    }
  }
}

const round = (v, d = 2) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

async function fetchImf(code) {
  const j = await getJson(`https://www.imf.org/external/datamapper/api/v1/${code}`);
  const byCountry = j.values?.[code] ?? {};
  const out = {};
  for (const [iso, years] of Object.entries(byCountry)) {
    const s = {};
    for (const [y, v] of Object.entries(years)) {
      const yr = +y;
      if (yr >= FIRST_YEAR && yr <= LAST_YEAR && v != null) s[yr] = round(+v);
    }
    if (Object.keys(s).length) out[iso] = s;
  }
  return out;
}

async function fetchWb(spec) {
  // "CODE@3" selects a non-default WB source (3 = Worldwide Governance Indicators)
  const [code, source] = spec.split('@');
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&date=${FIRST_YEAR}:${LAST_YEAR}${source ? `&source=${source}` : ''}`;
  const j = await getJson(url);
  const rows = j[1] ?? [];
  const out = {};
  for (const r of rows) {
    if (r.value == null || !r.countryiso3code) continue;
    (out[r.countryiso3code] ??= {})[+r.date] = round(r.value);
  }
  return out;
}

async function readCurated(name) {
  const p = path.join(CURATED, name);
  return existsSync(p) ? JSON.parse(await readFile(p, 'utf8')) : null;
}

async function main() {
  console.log('Fetching World Bank country metadata…');
  const meta = (await getJson('https://api.worldbank.org/v2/country?format=json&per_page=400'))[1];
  const countries = {};
  for (const c of meta) {
    if (c.region?.value === 'Aggregates') continue;
    countries[c.id] = {
      iso3: c.id,
      iso2: c.iso2Code,
      name: c.name,
      region: c.region?.value?.trim(),
      income: c.incomeLevel?.value,
      capital: c.capitalCity || null,
      series: {},
    };
  }

  for (const [key, code] of Object.entries(IMF)) {
    process.stdout.write(`IMF ${code}… `);
    const data = await fetchImf(code);
    let n = 0;
    for (const [iso, s] of Object.entries(data)) if (countries[iso]) { countries[iso].series[key] = s; n++; }
    console.log(n);
  }
  for (const [key, code] of Object.entries(WB)) {
    process.stdout.write(`WB ${code}… `);
    const data = await fetchWb(code);
    let n = 0;
    for (const [iso, s] of Object.entries(data)) if (countries[iso]) { countries[iso].series[key] = s; n++; }
    console.log(n);
  }

  const ratings = await readCurated('ratings.json');
  const markets = await readCurated('markets.json');
  const programmes = await readCurated('programmes.json');
  for (const c of Object.values(countries)) {
    if (ratings?.ratings?.[c.iso3]) c.ratings = ratings.ratings[c.iso3];
    if (markets?.markets?.[c.iso3]) c.markets = markets.markets[c.iso3];
    if (programmes?.countries?.[c.iso3]) c.programme = programmes.countries[c.iso3];
  }

  // Drop territories with no macro data at all
  for (const [iso, c] of Object.entries(countries)) {
    if (!c.series.gdp && !c.series.exportsGdp) delete countries[iso];
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString().slice(0, 10),
    sources: {
      imf: 'IMF World Economic Outlook & Fiscal Monitor via DataMapper API',
      wb: 'World Bank World Development Indicators, International Debt Statistics, Worldwide Governance Indicators',
      ratings: ratings ? { asOf: ratings.asOf, sources: ratings.sources } : null,
      markets: markets ? { asOf: markets.asOf, sources: markets.sources } : null,
      programmes: programmes ? { asOf: programmes.asOf, sources: programmes.sources } : null,
    },
    countries,
  };
  await writeFile(OUT, JSON.stringify(payload));
  console.log(`Wrote ${Object.keys(countries).length} countries → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
