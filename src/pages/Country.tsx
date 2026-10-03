import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { flag, useData, PILLARS, scorecard, rank, isCovered } from '../lib/data';
import { FOCUS_YEAR, METRIC, fmt, getObs, statusOf } from '../lib/metrics';
import { insights, medianSeries } from '../lib/insights';
import { compositeNotch, ratingBand } from '../lib/ratings';
import type { Country } from '../lib/types';
import { BarSeries, LineChart, Legend, Radar, Sparkline, StackBar, YieldCurveChart, Empty, type Curve } from '../components/charts';
import { RatingChips, RatingLadder, StatusPill, InfoTip, CountrySelect } from '../components/ui';
import { DebtSimulator } from '../components/DebtSimulator';
import { go } from '../lib/router';

const VITALS = [
  'gdp', 'growth', 'gdpPc', 'inflation',
  'fiscalBalance', 'primaryBalance', 'debt', 'interestRevenue',
  'currentAccount', 'exportsGdp', 'reservesMonths', 'extDebtGni',
  'debtServiceExports', 'rMinusG', 'yield10y', 'cds5y',
];

export function CountryPage({ iso3 }: { iso3: string }) {
  const { countries, list } = useData();
  const c = countries[iso3.toUpperCase()];
  if (!c)
    return (
      <div className="card">
        Unknown country “{iso3}”. <a href="#/">Back to the atlas</a>
      </div>
    );
  return <Dossier c={c} list={list} />;
}

function Section({ id, title, eyebrow, children, right }: { id: string; title: string; eyebrow?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 80, marginTop: 28 }}>
      <div className="row" style={{ marginBottom: 12, alignItems: 'baseline' }}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 style={{ fontSize: 22 }}>{title}</h2>
        <span className="spacer" />
        {right}
      </div>
      {children}
    </section>
  );
}

function Dossier({ c, list }: { c: Country; list: Country[] }) {
  const peers = useMemo(() => list.filter((x) => x.region === c.region && x.iso3 !== c.iso3), [list, c]);
  const score = useMemo(() => scorecard(list, c), [list, c]);
  const peerScore = useMemo(() => {
    const per = peers.map((p) => scorecard(list, p));
    return PILLARS.map((_, i) => {
      const v = per.map((s) => s[i].score).filter((x): x is number => x != null).sort((a, b) => a - b);
      return v.length ? v[Math.floor(v.length / 2)] : null;
    });
  }, [peers, list]);
  const notes = useMemo(() => insights(c), [c]);
  const n = compositeNotch(c);
  const band = ratingBand(n);
  const pop = getObs(c, 'population');
  const regionLabel = `${c.region} median`;

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <motion.div className="card" style={{ padding: '24px 26px', position: 'relative', overflow: 'hidden' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ position: 'absolute', right: -30, top: -50, fontSize: 220, opacity: 0.07, pointerEvents: 'none', lineHeight: 1 }}>{flag(c.iso2)}</div>
        <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
          <div style={{ flex: '1 1 380px' }}>
            <div className="row" style={{ gap: 12 }}>
              <span style={{ fontSize: 48, lineHeight: 1 }}>{flag(c.iso2)}</span>
              <div>
                <div className="eyebrow">
                  {c.region} · {c.income} · {c.group === 'AE' ? 'Advanced economy' : c.group === 'LIC' ? 'Low-income country' : 'Emerging / frontier market'}
                </div>
                <h1 style={{ fontSize: 38 }}>{c.short}</h1>
              </div>
            </div>
            <div className="row ink2" style={{ marginTop: 10, gap: 18, fontSize: 13 }}>
              {c.capital && <span>🏛 {c.capital}</span>}
              {c.markets?.currency && <span>💱 {c.markets.currency}</span>}
              {pop && <span>👥 {pop.value.toFixed(1)}m people</span>}
              <span>📈 {fmt('gdp', getObs(c, 'gdp')?.value)} GDP</span>
            </div>
            {c.programme?.headline && (
              <p style={{ fontSize: 15, marginTop: 14, maxWidth: 720, fontFamily: 'var(--font-display)' }}>
                “{c.programme.headline}”
              </p>
            )}
            <div className="row" style={{ marginTop: 10, gap: 8 }}>
              <a className="btn" href={`#/compare?c=${c.iso3},${peers.filter(isCovered)[0]?.iso3 ?? 'USA'}`} style={{ textDecoration: 'none' }}>⚔️ Compare</a>
              <button className="btn" onClick={() => window.print()}>🖨 Print one-pager</button>
              <SectionNav />
            </div>
          </div>
          <div style={{ flex: '0 1 420px', minWidth: 300 }}>
            <div className="row" style={{ marginBottom: 6, justifyContent: 'space-between' }}>
              <span className="eyebrow">Credit ratings · LT foreign currency</span>
              {band && <span className="badge">{band.label}</span>}
            </div>
            <RatingChips c={c} />
            {n != null && <RatingLadder countries={[{ c, color: 'var(--accent)' }]} />}
            {c.ratings?.lastAction && <div className="muted" style={{ fontSize: 12 }}>Last action: {c.ratings.lastAction}</div>}
            {c.ratings?.note && <div className="muted" style={{ fontSize: 12 }}>{c.ratings.note}</div>}
            <ProgrammeBadge c={c} />
          </div>
        </div>
      </motion.div>

      {/* ---------- Vital signs ---------- */}
      <Section id="vitals" title="Vital signs" eyebrow={`${FOCUS_YEAR} · traffic lights vs IMF / agency thresholds`}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
          {VITALS.map((k, i) => (
            <VitalTile key={k} c={c} k={k} list={list} delay={i * 0.025} />
          ))}
        </div>
      </Section>

      {/* ---------- DNA + flags ---------- */}
      <Section id="dna" title="Sovereign DNA" eyebrow="Pillar scores · percentile vs all sovereigns">
        <div className="grid" style={{ gridTemplateColumns: 'minmax(280px, 380px) minmax(0, 1fr)', gap: 16 }} id="dna-grid">
          <div className="card" style={{ display: 'grid', placeItems: 'center' }}>
            <Radar
              axes={score.map((s) => s.label)}
              layers={[
                { id: 'peer', label: regionLabel, color: 'var(--muted)', values: peerScore, fillOpacity: 0.06 },
                { id: c.iso3, label: c.short, color: 'var(--s1)', values: score.map((s) => s.score) },
              ]}
              size={320}
            />
            <Legend items={[{ label: c.short, color: 'var(--s1)' }, { label: regionLabel, color: 'var(--muted)' }]} />
            <p className="muted" style={{ fontSize: 11, textAlign: 'center', margin: '8px 0 0' }}>
              100 = best in the world on that pillar. Economy: GDP/capita, growth, size · Fiscal: debt, deficit, interest/revenue · External: CA, reserves, debt service · Monetary: inflation · Institutions: WGI.
            </p>
          </div>
          <div className="card">
            <div className="card-head">
              <h3>Red flags &amp; strengths</h3>
              <span className="eyebrow">Auto-generated</span>
            </div>
            {notes.length ? (
              <div className="grid" style={{ gap: 8 }}>
                {notes.map((it, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '22px 1fr',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 10,
                      background: 'var(--surface-2)',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{it.tone === 'danger' ? '🔴' : it.tone === 'watch' ? '🟠' : it.tone === 'good' ? '🟢' : '🔵'}</span>
                    <span>{it.text}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="muted">Not enough data to generate flags.</p>
            )}
          </div>
        </div>
      </Section>

      {/* ---------- Growth & economy ---------- */}
      <Section id="economy" title="Growth & GDP" eyebrow="Economy">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
          <ChartCard title="Nominal GDP" k="gdp">
            <BarSeries data={c.series.gdp ?? {}} metricKey="gdp" colorFor={() => 'var(--s1)'} />
          </ChartCard>
          <ChartCard title="Real GDP growth vs regional median" k="growth">
            <LineChart
              series={[
                { id: 'c', label: c.short, color: 'var(--s1)', data: c.series.growth ?? {} },
                { id: 'p', label: 'Region', color: 'var(--muted)', data: medianSeries(peers, 'growth'), dashed: true },
              ]}
              metricKey="growth"
              zero
            />
          </ChartCard>
          <ChartCard title="Inflation" k="inflation">
            <LineChart series={[{ id: 'c', label: c.short, color: 'var(--s1)', data: c.series.inflation ?? {} }]} metricKey="inflation" zero refLines={[{ value: c.group === 'AE' ? 6 : 10, label: 'danger', tone: 'danger' }]} />
          </ChartCard>
        </div>
      </Section>

      {/* ---------- Fiscal ---------- */}
      <Section id="fiscal" title="Public finances" eyebrow="Fiscal & debt">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
          <ChartCard title="Fiscal balance (deficit < 0)" k="fiscalBalance">
            <BarSeries data={c.series.fiscalBalance ?? {}} metricKey="fiscalBalance" refLines={[{ value: -3, label: '−3% anchor', tone: 'watch' }]} />
          </ChartCard>
          <ChartCard title="Government debt vs regional median" k="debt">
            <LineChart
              series={[
                { id: 'c', label: c.short, color: 'var(--s1)', data: c.series.debt ?? {} },
                { id: 'p', label: 'Region', color: 'var(--muted)', data: medianSeries(peers, 'debt'), dashed: true },
              ]}
              metricKey="debt"
              zero
              refLines={[{ value: c.group === 'AE' ? 85 : c.group === 'LIC' ? 55 : 70, label: `IMF ${c.group} benchmark`, tone: 'danger' }]}
            />
          </ChartCard>
          <ChartCard title="Revenue vs expenditure" k="revenue">
            <LineChart
              series={[
                { id: 'r', label: 'Revenue', color: 'var(--s1)', data: c.series.revenue ?? {} },
                { id: 'e', label: 'Expenditure', color: 'var(--s2)', data: c.series.expenditure ?? {} },
              ]}
              metricKey="revenue"
            />
          </ChartCard>
          <ChartCard title="Interest / revenue" k="interestRevenue">
            <LineChart
              series={[{ id: 'c', label: c.short, color: 'var(--s1)', data: c.series.interestRevenue ?? {} }]}
              metricKey="interestRevenue"
              zero
              refLines={[
                { value: 15, label: 'S&P weakest band', tone: 'danger' },
                { value: 5, label: 'strong', tone: 'neutral' },
              ]}
            />
          </ChartCard>
        </div>
      </Section>

      <Section id="simulator" title="Debt dynamics lab" eyebrow="What-if">
        <div className="card">
          <DebtSimulator c={c} />
        </div>
      </Section>

      {/* ---------- External ---------- */}
      <Section id="external" title="External accounts & exports" eyebrow="External">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
          <ChartCard title="Current account balance" k="currentAccount">
            <BarSeries data={c.series.currentAccount ?? {}} metricKey="currentAccount" refLines={[{ value: -5, label: '−5% danger', tone: 'danger' }]} />
          </ChartCard>
          <ChartCard title="Exports of goods & services, US$" k="exportsUsd">
            <BarSeries data={c.series.exportsUsd ?? {}} metricKey="exportsUsd" colorFor={() => 'var(--s1)'} to={FOCUS_YEAR} />
          </ChartCard>
          <ChartCard title="Export DNA · merchandise exports by type" k="commodityShare">
            <ExportMix c={c} />
          </ChartCard>
          <ChartCard title="FX reserves, months of imports" k="reservesMonths">
            <BarSeries
              data={c.series.reservesMonths ?? {}}
              metricKey="reservesMonths"
              to={FOCUS_YEAR}
              colorFor={(v) => (v < 3 ? 'var(--critical)' : 'var(--s1)')}
              refLines={[{ value: 3, label: '3-month floor', tone: 'danger' }]}
            />
          </ChartCard>
        </div>
      </Section>

      {/* ---------- Markets ---------- */}
      <Section id="markets" title="Yield curve & market pricing" eyebrow="Markets">
        <YieldSection c={c} />
      </Section>

      {/* ---------- History ---------- */}
      <Section id="history" title="Default & restructuring track record" eyebrow="Event risk">
        <History c={c} />
      </Section>
    </div>
  );
}

function SectionNav() {
  const items = [
    ['vitals', 'Vitals'], ['dna', 'DNA'], ['economy', 'Growth'], ['fiscal', 'Fiscal'], ['simulator', 'Debt lab'], ['external', 'External'], ['markets', 'Curve'], ['history', 'History'],
  ];
  return (
    <div className="seg">
      {items.map(([id, l]) => (
        <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>
          {l}
        </button>
      ))}
    </div>
  );
}

function ProgrammeBadge({ c }: { c: Country }) {
  const imf = c.programme?.imf;
  if (!c.programme) return null;
  const active = imf && imf.type && imf.type !== 'none';
  return (
    <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: active ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="eyebrow" style={{ color: active ? 'var(--accent)' : undefined }}>IMF</span>
        <b>{active ? `${imf!.type} arrangement` : 'No current arrangement'}</b>
        {active && imf!.size && <span className="ink2" style={{ fontSize: 12 }}>{imf!.size}</span>}
      </div>
      {active && (imf!.approved || imf!.ends) && (
        <div className="muted" style={{ fontSize: 12 }}>
          {imf!.approved && `Approved ${imf!.approved}`} {imf!.ends && `· ends ${imf!.ends}`}
        </div>
      )}
      {imf?.note && <div className="ink2" style={{ fontSize: 12, marginTop: 2 }}>{imf.note}</div>}
    </div>
  );
}

function VitalTile({ c, k, list, delay }: { c: Country; k: string; list: Country[]; delay: number }) {
  const m = METRIC[k];
  const o = getObs(c, k);
  const st = statusOf(c, k, o?.value ?? null);
  const r = o ? rank(list, c, k) : null;
  return (
    <motion.div
      className="card"
      style={{ padding: '14px 16px', borderTop: `3px solid ${st === 'danger' ? 'var(--critical)' : st === 'watch' ? 'var(--warning)' : st === 'good' ? 'var(--good)' : 'var(--hairline)'}` }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
    >
      <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
        <span className="ink2" style={{ fontSize: 12, fontWeight: 600 }}>
          {m.label} {m.mustHave && <span title="Core metric" style={{ color: 'var(--accent)' }}>★</span>}
        </span>
        <InfoTip metricKey={k} />
      </div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}>{fmt(k, o?.value)}</div>
        {m.timeseries && <Sparkline data={c.series[k]} />}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 6, minHeight: 18 }}>
        <StatusPill status={st} />
        <span className="muted tnum" style={{ fontSize: 11 }}>
          {r ? `#${r.rank} of ${r.of}` : ''}
          {o?.year && o.year !== FOCUS_YEAR ? ` · ${o.year}` : ''}
        </span>
      </div>
    </motion.div>
  );
}

function ChartCard({ title, k, children }: { title: string; k: string; children: ReactNode }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="row" style={{ gap: 6 }}>
          <h3>{title}</h3>
          <InfoTip metricKey={k} />
        </div>
        <span className="muted" style={{ fontSize: 12 }}>{METRIC[k]?.source}</span>
      </div>
      {children}
    </div>
  );
}

function ExportMix({ c }: { c: Country }) {
  const keys: [string, string, string][] = [
    ['manufExports', 'Manufactures', 'var(--s1)'],
    ['fuelExports', 'Fuel', 'var(--s2)'],
    ['oresExports', 'Ores & metals', 'var(--s3)'],
    ['foodExports', 'Food', 'var(--s4)'],
    ['agriExports', 'Agri raw materials', 'var(--s7)'],
  ];
  // latest year where the composition is reported
  const yr = Object.keys(c.series.manufExports ?? {}).map(Number).filter((y) => y <= FOCUS_YEAR).sort().at(-1);
  const obs = keys.map(([k, l, col]) => ({ o: yr != null && c.series[k]?.[yr] != null ? { value: c.series[k][yr] } : null, l, col }));
  if (!obs.some((x) => x.o)) return <Empty height={120} />;
  const parts = obs.map((x) => ({ label: x.l, value: Math.max(0, x.o?.value ?? 0), color: x.col }));
  const rest = Math.max(0, 100 - parts.reduce((a, b) => a + b.value, 0));
  if (rest > 0.5) parts.push({ label: 'Other', value: rest, color: 'var(--axis)' });
  const ex = getObs(c, 'exportsGdp');
  const comm = getObs(c, 'commodityShare');
  return (
    <div>
      <div className="row" style={{ gap: 24, marginBottom: 16 }}>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>Exports, % of GDP</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{fmt('exportsGdp', ex?.value)}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>Commodity share</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{fmt('commodityShare', comm?.value)}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>Exports, US$</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{fmt('exportsUsd', getObs(c, 'exportsUsd')?.value)}</div>
        </div>
      </div>
      <StackBar parts={parts} />
      <p className="muted" style={{ fontSize: 11, marginBottom: 0 }}>Share of merchandise exports, {yr}. Source: World Bank WDI (UN Comtrade).</p>
    </div>
  );
}

const BENCH = ['USA', 'DEU'];

function YieldSection({ c }: { c: Country }) {
  const { countries } = useData();
  const [peer, setPeer] = useState<string | null>(null);
  const [bench, setBench] = useState(true);
  const mk = c.markets;
  const curves: Curve[] = [];
  if (mk?.localCurve) curves.push({ id: 'lc', label: `${c.short} (${mk.currency ?? 'LC'})`, color: 'var(--s1)', points: mk.localCurve });
  const usd = mk?.usdEurobond;
  const usdCurve = usd?.curve ?? (usd ? Object.fromEntries(Object.entries(usd).filter(([k, v]) => /^\d+[YM]$/.test(k) && typeof v === 'number')) : null);
  if (usdCurve && Object.keys(usdCurve).length) curves.push({ id: 'usd', label: `${c.short} USD bonds`, color: 'var(--s2)', points: usdCurve as Record<string, number> });
  const benchIso = BENCH.filter((b) => b !== c.iso3);
  if (bench) benchIso.forEach((b, i) => {
    const bc = countries[b];
    if (bc?.markets?.localCurve) curves.push({ id: b, label: bc.short === 'United States' ? 'UST' : bc.short === 'Germany' ? 'Bund' : bc.short, color: i === 0 ? 'var(--s3)' : 'var(--s4)', points: bc.markets.localCurve, dashed: true });
  });
  if (peer && countries[peer]?.markets?.localCurve)
    curves.push({ id: peer, label: countries[peer].short, color: 'var(--s7)', points: countries[peer].markets!.localCurve! });

  const slope = getObs(c, 'curveSlope')?.value;
  const y10 = getObs(c, 'yield10y')?.value;
  const infl = getObs(c, 'inflation')?.value;
  const ust10 = countries.USA?.markets?.localCurve?.['10Y'];
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const usdY = num(usd?.['10Y']) ?? num(usd?.yield);
  const usdSpread = num(usd?.spreadBp) ?? num(usd?.spread);

  if (!mk) return <div className="card"><Empty height={160} label="No market snapshot for this sovereign" /></div>;
  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)' }} id="yc-grid">
      <div className="card">
        <div className="card-head">
          <div className="row" style={{ gap: 6 }}>
            <h3>Sovereign yield curve</h3>
            <InfoTip metricKey="curveSlope" />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <label className="row" style={{ gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={bench} onChange={(e) => setBench(e.target.checked)} /> UST &amp; Bund
            </label>
            <CountrySelect value={peer ?? ''} onChange={setPeer} exclude={[c.iso3, ...BENCH]} placeholder="+ overlay a peer" />
          </div>
        </div>
        <YieldCurveChart curves={curves} policyRate={mk.policyRate} />
        <Legend items={curves.map((cv) => ({ label: cv.label, color: cv.color, dashed: cv.dashed }))} />
        {mk.notes?.map((n) => (
          <p key={n} className="muted" style={{ fontSize: 11, margin: '6px 0 0' }}>• {n}</p>
        ))}
        {mk.unverified && <p className="muted" style={{ fontSize: 11 }}>⚠︎ Some points for this sovereign could not be verified against a live source — indicative only.</p>}
      </div>
      <div className="grid" style={{ alignContent: 'start' }}>
        <Stat label="10Y yield" value={y10 != null ? `${y10.toFixed(2)}%` : '—'} sub={y10 != null && infl != null ? `Real ≈ ${(y10 - infl).toFixed(1)}pp vs ${FOCUS_YEAR} CPI` : undefined} />
        <Stat
          label="Curve slope (10Y − 2Y)"
          value={slope != null ? `${slope > 0 ? '+' : ''}${slope.toFixed(0)}bp` : '—'}
          sub={slope == null ? undefined : slope < -25 ? 'Inverted — tight policy or near-term stress' : slope > 150 ? 'Steep — term / fiscal premium' : 'Normal shape'}
        />
        <Stat label="5Y CDS" value={mk.cds5y != null ? `${Math.round(mk.cds5y)}bp` : '—'} sub={mk.cds5y != null ? (mk.cds5y > 1000 ? 'Distressed' : mk.cds5y > 600 ? 'High risk (IMF > 600bp)' : mk.cds5y > 200 ? 'Watch (200–600bp)' : 'Low risk (< 200bp)') : undefined} status={statusOf(c, 'cds5y', mk.cds5y ?? null)} />
        {usdY != null && (
          <Stat
            label="USD Eurobond (≈10Y)"
            value={`${usdY.toFixed(2)}%`}
            sub={usdSpread != null ? `Spread ≈ ${Math.round(usdSpread)}bp over UST` : ust10 != null ? `≈ ${Math.round((usdY - ust10) * 100)}bp over UST 10Y` : undefined}
          />
        )}
        {usd?.priceCents != null && <Stat label="Eurobond price" value={`${usd.priceCents}c`} sub="Distressed — trading well below par" status="danger" />}
        <Stat label="Policy rate" value={mk.policyRate != null ? `${mk.policyRate.toFixed(2)}%` : '—'} sub={mk.policyRateNote ?? mk.currency} />
      </div>
      <style>{`@media (max-width: 900px){ #yc-grid, #dna-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function Stat({ label, value, sub, status }: { label: string; value: string; sub?: string; status?: ReturnType<typeof statusOf> }) {
  return (
    <div className="card" style={{ padding: '12px 16px' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: 12 }}>{label}</span>
        {status && <StatusPill status={status} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      {sub && <div className="ink2" style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function History({ c }: { c: Country }) {
  const d = c.programme?.defaults ?? [];
  if (!d.length)
    return (
      <div className="card">
        <p style={{ margin: 0 }}>
          {c.programme ? '✨ No external default or restructuring on record since 1980.' : 'No curated history for this sovereign.'}
        </p>
      </div>
    );
  const sorted = [...d].sort((a, b) => a.year.localeCompare(b.year));
  return (
    <div className="card">
      <div style={{ position: 'relative', paddingLeft: 22 }}>
        <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: 'var(--hairline)' }} />
        {sorted.map((e, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} style={{ position: 'relative', padding: '6px 0 10px' }}>
            <span style={{ position: 'absolute', left: -21, top: 10, width: 12, height: 12, borderRadius: '50%', background: 'var(--critical)', border: '2px solid var(--surface)' }} />
            <b className="tnum" style={{ marginRight: 10 }}>{e.year}</b>
            <span className="ink2">{e.desc}</span>
          </motion.div>
        ))}
      </div>
      {c.programme?.unverified && <p className="muted" style={{ fontSize: 11, marginBottom: 0 }}>⚠︎ Partly compiled from secondary sources — verify before external use.</p>}
      <div style={{ marginTop: 8 }}>
        <a href="#/" onClick={(e) => { e.preventDefault(); go('atlas'); }} className="muted" style={{ fontSize: 12 }}>
          ← Back to the atlas
        </a>
      </div>
    </div>
  );
}
