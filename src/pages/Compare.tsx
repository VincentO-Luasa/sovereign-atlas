import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { flag, useData, scorecard } from '../lib/data';
import { METRIC, fmt, getValue } from '../lib/metrics';
import { go } from '../lib/router';
import { LineChart, Legend, Radar, YieldCurveChart, type Curve } from '../components/charts';
import { CountrySelect, RatingLadder, InfoTip } from '../components/ui';
import type { Country } from '../lib/types';

const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
const ROUNDS = ['gdp', 'growth', 'gdpPc', 'inflation', 'fiscalBalance', 'debt', 'interestRevenue', 'currentAccount', 'exportsGdp', 'reservesMonths', 'rating', 'cds5y', 'yield10y', 'governance'];

export function ComparePage({ query }: { query: URLSearchParams }) {
  const { countries, list } = useData();
  const isos = (query.get('c') ?? 'FRA,ITA').split(',').filter((x) => countries[x]).slice(0, 4);
  const cs = isos.map((i) => countries[i]);
  const set = (next: string[]) => go(`compare?c=${next.join(',')}`);

  const rounds = useMemo(
    () =>
      ROUNDS.map((k) => {
        const m = METRIC[k];
        const vals = cs.map((c) => getValue(c, k));
        let winner: number | null = null;
        if (m.better !== 'none' && vals.filter((v) => v != null).length >= 2) {
          let best: number | null = null;
          vals.forEach((v, i) => {
            if (v == null) return;
            if (best == null || (m.better === 'higher' ? v > best : v < best)) {
              best = v;
              winner = i;
            }
          });
        } else if (k === 'gdp') {
          // bigger economy "wins" the scale round
          let best = -Infinity;
          vals.forEach((v, i) => v != null && v > best && ((best = v), (winner = i)));
        }
        return { k, vals, winner };
      }),
    [cs],
  );
  const tally = cs.map((_, i) => rounds.filter((r) => r.winner === i).length);
  const lead = tally.indexOf(Math.max(...tally));

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="eyebrow">Head-to-head</div>
          <h1>Sovereign duel</h1>
          <p>Line up to four sovereigns. Each metric is a round — the stronger credit takes it.</p>
        </div>
        <div className="row">
          {['FRA,ITA', 'EGY,TUR,PAK', 'BRA,MEX,COL', 'GHA,ZMB,LKA', 'SAU,ARE,QAT'].map((p) => (
            <button key={p} className="chip" onClick={() => set(p.split(','))}>
              {p.split(',').map((i) => flag(countries[i]?.iso2 ?? '')).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(4, cs.length + (cs.length < 4 ? 1 : 0))}, minmax(0, 1fr))`, marginBottom: 16 }} id="duel-head">
        {cs.map((c, i) => (
          <motion.div key={c.iso3} className="card" style={{ borderTop: `4px solid ${COLORS[i]}`, position: 'relative' }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            {i === lead && tally[i] > 0 && (
              <motion.span initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} style={{ position: 'absolute', right: 14, top: 10, fontSize: 22 }} title="Wins most rounds">
                🏆
              </motion.span>
            )}
            <div className="row">
              <span style={{ fontSize: 34 }}>{flag(c.iso2)}</span>
              <div>
                <a href={`#/country/${c.iso3}`} style={{ textDecoration: 'none' }}>
                  <h3 style={{ fontSize: 20 }}>{c.short}</h3>
                </a>
                <div className="muted" style={{ fontSize: 12 }}>{c.region}</div>
              </div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>
              {tally[i]} <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>rounds won</span>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <CountrySelect value={c.iso3} onChange={(v) => set(isos.map((x) => (x === c.iso3 ? v : x)))} exclude={isos.filter((x) => x !== c.iso3)} />
              {cs.length > 2 && (
                <button className="icon-btn" onClick={() => set(isos.filter((x) => x !== c.iso3))} aria-label="Remove">
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {cs.length < 4 && (
          <div className="card" style={{ display: 'grid', placeItems: 'center', borderStyle: 'dashed', boxShadow: 'none' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>＋</div>
              <CountrySelect onChange={(v) => set([...isos, v])} exclude={isos} placeholder="Add a challenger" />
            </div>
          </div>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 1fr)' }} id="duel-grid">
        <div className="card">
          <div className="card-head">
            <h3>Tale of the tape</h3>
            <span className="eyebrow">{ROUNDS.length} rounds</span>
          </div>
          <div className="grid" style={{ gap: 2 }}>
            {rounds.map((r) => (
              <Round key={r.k} k={r.k} vals={r.vals} winner={r.winner} cs={cs} />
            ))}
          </div>
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <div className="card-head">
              <h3>Rating ladder</h3>
              <span className="eyebrow">Avg of 3 agencies</span>
            </div>
            <RatingLadder countries={cs.map((c, i) => ({ c, color: COLORS[i] }))} />
            <Legend items={cs.map((c, i) => ({ label: c.short, color: COLORS[i] }))} />
          </div>
          <div className="card" style={{ display: 'grid', placeItems: 'center' }}>
            <div className="card-head" style={{ width: '100%' }}>
              <h3>Sovereign DNA</h3>
              <span className="eyebrow">Percentiles</span>
            </div>
            <Radar
              axes={scorecard(list, cs[0]).map((s) => s.label)}
              layers={cs.map((c, i) => ({ id: c.iso3, label: c.short, color: COLORS[i], values: scorecard(list, c).map((s) => s.score), fillOpacity: 0.08 }))}
              size={300}
            />
            <Legend items={cs.map((c, i) => ({ label: c.short, color: COLORS[i] }))} />
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', marginTop: 16 }}>
        {['debt', 'fiscalBalance', 'growth', 'currentAccount', 'inflation', 'interestRevenue'].map((k) => (
          <div className="card" key={k}>
            <div className="card-head">
              <div className="row" style={{ gap: 6 }}>
                <h3>{METRIC[k].label}</h3>
                <InfoTip metricKey={k} />
              </div>
            </div>
            <LineChart series={cs.map((c, i) => ({ id: c.iso3, label: c.short, color: COLORS[i], data: c.series[k] ?? {} }))} metricKey={k} zero={METRIC[k].scale === 'div'} height={220} />
          </div>
        ))}
        <div className="card">
          <div className="card-head">
            <h3>Yield curves</h3>
            <span className="eyebrow">Local currency</span>
          </div>
          <YieldCurveChart curves={cs.filter((c) => c.markets?.localCurve).map((c) => ({ id: c.iso3, label: c.short, color: COLORS[cs.indexOf(c)], points: c.markets!.localCurve! } as Curve))} height={240} />
        </div>
      </div>
      <style>{`@media (max-width: 1000px){ #duel-grid, #duel-head { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function Round({ k, vals, winner, cs }: { k: string; vals: (number | null)[]; winner: number | null; cs: Country[] }) {
  const m = METRIC[k];
  const max = Math.max(...vals.map((v) => Math.abs(v ?? 0))) || 1;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--hairline)' }}>
      <div className="row" style={{ gap: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{m.short}</span>
        <InfoTip metricKey={k} />
        <span className="muted" style={{ fontSize: 10 }}>{m.better === 'lower' ? '↓ better' : m.better === 'higher' ? '↑ better' : ''}</span>
      </div>
      <div className="grid" style={{ gap: 3 }}>
        {cs.map((c, i) => {
          const v = vals[i];
          const w = m.unit === 'notch' && v != null ? ((23 - v) / 22) * 100 : v != null ? (Math.abs(v) / max) * 100 : 0;
          return (
            <div key={c.iso3} style={{ display: 'grid', gridTemplateColumns: '1fr 82px 18px', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4 }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} style={{ height: 8, borderRadius: 4, background: COLORS[i], opacity: v != null && v < 0 ? 0.55 : 1 }} />
              </div>
              <span className="tnum" style={{ textAlign: 'right', fontWeight: winner === i ? 700 : 500, fontSize: 13 }}>{fmt(k, v)}</span>
              <span style={{ fontSize: 12 }}>{winner === i ? '🏅' : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
