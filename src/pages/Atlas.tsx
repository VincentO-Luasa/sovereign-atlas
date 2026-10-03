import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as d3 from 'd3';
import { flag, useData, isCovered } from '../lib/data';
import { FOCUS_YEAR, FIRST_YEAR, LAST_YEAR, METRIC, fmt, getObs, getValue, statusOf } from '../lib/metrics';
import { makeColor, isDark } from '../lib/colors';
import { compositeNotch } from '../lib/ratings';
import { WorldMap, type WorldMapHandle } from '../components/WorldMap';
import { TipRows } from '../components/Tooltip';
import { RatingChips, StatusPill, MetricSelect, InfoTip } from '../components/ui';
import { go } from '../lib/router';
import type { Country } from '../lib/types';

const QUICK = ['gdp', 'growth', 'fiscalBalance', 'currentAccount', 'exportsGdp', 'debt', 'rating', 'yield10y', 'cds5y', 'inflation'];

export function AtlasPage() {
  const { countries, list } = useData();
  const [metric, setMetric] = useState('debt');
  const [year, setYear] = useState(FOCUS_YEAR);
  const [mode, setMode] = useState<'globe' | 'flat'>('globe');
  const [focus, setFocus] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [dark, setDark] = useState(isDark());
  const mapRef = useRef<WorldMapHandle>(null);
  const m = METRIC[metric];

  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDark()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setDark(isDark());
    mq.addEventListener('change', on);
    return () => {
      obs.disconnect();
      mq.removeEventListener('change', on);
    };
  }, []);

  // Animate through the years
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setYear((y) => {
        if (y >= LAST_YEAR) {
          setPlaying(false);
          return y;
        }
        return y + 1;
      });
    }, 650);
    return () => clearInterval(id);
  }, [playing]);

  const effYear = m.timeseries ? year : FOCUS_YEAR;
  const values = useMemo(() => {
    const out = new Map<string, number>();
    for (const c of list) {
      const v = getValue(c, metric, effYear);
      if (v != null) out.set(c.iso3, v);
    }
    return out;
  }, [list, metric, effYear]);

  // Colour domain uses all years for time-series so the animation is comparable over time
  const color = useMemo(() => {
    let vals = [...values.values()];
    if (m.timeseries && m.scale !== 'rating') {
      vals = [];
      for (const c of list) for (const yy of [2010, 2015, 2020, FOCUS_YEAR, 2030]) {
        const v = getValue(c, metric, yy);
        if (v != null) vals.push(v);
      }
    }
    return makeColor(vals, m.scale, m.better, dark);
  }, [values, m, list, metric, dark]);

  const fillFor = useCallback(
    (iso3: string | null) => {
      const v = iso3 ? values.get(iso3) : undefined;
      return v == null ? 'var(--surface-2)' : color(v);
    },
    [values, color],
  );

  const tooltipFor = useCallback(
    (iso3: string | null, name: string) => {
      const c = iso3 ? countries[iso3] : undefined;
      if (!c) return <TipRows title={name} rows={[['', 'No data']]} />;
      const v = values.get(c.iso3);
      const st = statusOf(c, metric, v ?? null);
      return (
        <>
          <div className="tt-title">
            {flag(c.iso2)} {c.short}
          </div>
          <div className="tt-row">
            <span>{m.short}</span>
            <b>{fmt(metric, v)}</b>
          </div>
          {st && (
            <div style={{ marginTop: 4 }}>
              <StatusPill status={st} />
            </div>
          )}
          <div className="muted" style={{ marginTop: 4, fontSize: 11 }}>
            Click to open the dossier
          </div>
        </>
      );
    },
    [countries, values, metric, m],
  );

  const [rankAll, setRankAll] = useState(false);
  const ranked = useMemo(() => {
    const arr = [...values.entries()].map(([iso, v]) => ({ c: countries[iso], v })).filter((x) => x.c && (rankAll || isCovered(x.c)));
    const desc = m.better !== 'lower';
    arr.sort((a, b) => (desc ? b.v - a.v : a.v - b.v));
    return arr;
  }, [values, countries, m, rankAll]);

  const spin = async () => {
    const pool = list.filter(isCovered);
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (mode !== 'globe') setMode('globe');
    setFocus(c.iso3);
    await mapRef.current?.flyTo(c.iso3);
  };

  const focusC = focus ? countries[focus] : null;

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="eyebrow">Atlas</div>
          <h1>The world, sovereign by sovereign</h1>
          <p>Pick a metric, scrub through time, spin the globe. Click any country for its full credit dossier.</p>
        </div>
        <div className="row">
          <button className="btn accent" onClick={spin}>
            🎲 Spin the globe
          </button>
          <div className="seg">
            <button className={mode === 'globe' ? 'active' : ''} onClick={() => setMode('globe')}>
              Globe
            </button>
            <button className={mode === 'flat' ? 'active' : ''} onClick={() => setMode('flat')}>
              Flat
            </button>
          </div>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        {QUICK.map((k) => (
          <button key={k} className={`chip ${metric === k ? 'active' : ''}`} onClick={() => setMetric(k)}>
            {METRIC[k].short}
          </button>
        ))}
        <span className="spacer" />
        <span className="muted" style={{ fontSize: 12 }}>
          More:
        </span>
        <MetricSelect value={metric} onChange={setMetric} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px', alignItems: 'start' }} id="atlas-grid">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="row" style={{ padding: '14px 18px 0', alignItems: 'baseline' }}>
            <h3 style={{ fontSize: 18 }}>{m.label}</h3>
            <InfoTip metricKey={metric} />
            <span className="muted">
              {m.timeseries ? (
                <>
                  {effYear}
                  {effYear > FOCUS_YEAR ? ' · IMF projection' : ''}
                </>
              ) : (
                'Latest snapshot'
              )}
            </span>
            <span className="spacer" />
            <Legend metric={metric} color={color} values={[...values.values()]} />
          </div>
          <WorldMap ref={mapRef} mode={mode} fillFor={fillFor} tooltipFor={tooltipFor} onSelect={(iso) => go(`country/${iso}`)} selected={focus} height={520} />
          {m.timeseries && (
            <div className="row" style={{ padding: '0 18px 16px', gap: 14 }}>
              <button
                className="icon-btn"
                onClick={() => {
                  if (!playing && year >= LAST_YEAR) setYear(FIRST_YEAR + 2);
                  setPlaying((p) => !p);
                }}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? '❚❚' : '▶'}
              </button>
              <input
                type="range"
                min={FIRST_YEAR + 2}
                max={LAST_YEAR}
                value={year}
                onChange={(e) => setYear(+e.target.value)}
                style={{ flex: 1, accentColor: 'var(--brand)' }}
                aria-label="Year"
              />
              <span className="tnum" style={{ fontWeight: 700, fontSize: 18, minWidth: 48 }}>
                {year}
              </span>
              {year !== FOCUS_YEAR && (
                <button className="chip" onClick={() => setYear(FOCUS_YEAR)}>
                  Reset to {FOCUS_YEAR}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="seg" style={{ justifySelf: 'start' }}>
            <button className={!rankAll ? 'active' : ''} onClick={() => setRankAll(false)}>Rated universe</button>
            <button className={rankAll ? 'active' : ''} onClick={() => setRankAll(true)}>All {values.size}</button>
          </div>
          <AnimatePresence mode="wait">
            {focusC ? (
              <motion.div key={focusC.iso3} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SpotlightCard c={focusC} metric={metric} year={effYear} onClose={() => setFocus(null)} />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className="card">
            <div className="card-head">
              <h3>{m.better === 'lower' ? 'Strongest' : 'Highest'}</h3>
              <span className="eyebrow">{m.short}</span>
            </div>
            <RankList items={ranked.slice(0, 6)} metric={metric} onHover={setFocus} />
          </div>
          <div className="card">
            <div className="card-head">
              <h3>{m.better === 'lower' ? 'Weakest' : 'Lowest'}</h3>
              <span className="eyebrow">{m.short}</span>
            </div>
            <RankList items={ranked.slice(-6).reverse()} metric={metric} onHover={setFocus} start={ranked.length} desc />
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 16 }}>
        <RatingActions />
        <DistressWatch />
      </div>
      <style>{`@media (max-width: 1100px){ #atlas-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function RankList({ items, metric, onHover, start = 0, desc = false }: { items: { c: Country; v: number }[]; metric: string; onHover: (iso: string | null) => void; start?: number; desc?: boolean }) {
  const max = d3.max(items, (d) => Math.abs(d.v)) || 1;
  return (
    <div className="grid" style={{ gap: 6 }}>
      {items.map((it, i) => (
        <a
          key={it.c.iso3}
          href={`#/country/${it.c.iso3}`}
          onMouseEnter={() => onHover(it.c.iso3)}
          style={{ textDecoration: 'none', display: 'grid', gridTemplateColumns: '22px 22px 1fr auto', alignItems: 'center', gap: 8 }}
        >
          <span className="muted tnum" style={{ fontSize: 11 }}>
            {desc ? start - i : i + 1}
          </span>
          <span className="flag">{flag(it.c.iso2)}</span>
          <span style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.c.short}</div>
            <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 2, marginTop: 3 }}>
              <div style={{ width: `${(Math.abs(it.v) / max) * 100}%`, height: 3, background: 'var(--s1)', borderRadius: 2 }} />
            </div>
          </span>
          <b className="tnum">{fmt(metric, it.v)}</b>
        </a>
      ))}
    </div>
  );
}

function SpotlightCard({ c, metric, year, onClose }: { c: Country; metric: string; year: number; onClose: () => void }) {
  const keys = ['gdp', 'growth', 'debt', 'fiscalBalance', 'currentAccount', 'inflation'];
  return (
    <div className="card" style={{ borderTop: '3px solid var(--accent)' }}>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="flag" style={{ fontSize: 30 }}>{flag(c.iso2)}</span>
        <div>
          <h3 style={{ fontSize: 20 }}>{c.short}</h3>
          <div className="muted" style={{ fontSize: 12 }}>{c.region}</div>
        </div>
        <span className="spacer" />
        <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div style={{ transform: 'scale(.9)', transformOrigin: 'left', marginBottom: 6 }}>
        <RatingChips c={c} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, margin: '8px 0 12px' }}>
        {[metric, ...keys.filter((k) => k !== metric)].slice(0, 6).map((k) => {
          const o = getObs(c, k, METRIC[k].timeseries ? year : FOCUS_YEAR);
          return (
            <div key={k} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px' }}>
              <div className="muted" style={{ fontSize: 11 }}>{METRIC[k].short}</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt(k, o?.value)}</div>
            </div>
          );
        })}
      </div>
      {c.programme?.headline && <p className="ink2" style={{ fontSize: 13, margin: '0 0 12px' }}>{c.programme.headline}</p>}
      <a className="btn primary" href={`#/country/${c.iso3}`} style={{ textDecoration: 'none', width: '100%', justifyContent: 'center' }}>
        Open dossier →
      </a>
    </div>
  );
}

function Legend({ metric, color, values }: { metric: string; color: (v: number) => string; values: number[] }) {
  const m = METRIC[metric];
  if (!values.length) return null;
  if (m.scale === 'rating') {
    const stops = [
      ['AAA', 1], ['AA', 3.5], ['A', 6], ['BBB', 9], ['BB', 12], ['B', 15], ['CCC−D', 19],
    ] as const;
    return (
      <div className="row" style={{ gap: 2, fontSize: 10 }}>
        {stops.map(([l, v]) => (
          <span key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <i style={{ width: 30, height: 8, background: color(v), borderRadius: 2 }} />
            <span className="muted">{l}</span>
          </span>
        ))}
      </div>
    );
  }
  const sorted = [...values].sort((a, b) => a - b);
  const qs = [0.02, 0.2, 0.4, 0.6, 0.8, 0.98].map((p) => d3.quantileSorted(sorted, p)!);
  return (
    <div className="row" style={{ gap: 2, fontSize: 10 }}>
      {qs.map((v, i) => (
        <span key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <i style={{ width: 34, height: 8, background: color(v), borderRadius: 2 }} />
          <span className="muted tnum">{fmt(metric, v, { unit: true })}</span>
        </span>
      ))}
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginLeft: 6 }}>
        <i style={{ width: 16, height: 8, background: 'var(--surface-2)', borderRadius: 2, border: '1px solid var(--hairline)' }} />
        <span className="muted">n/a</span>
      </span>
    </div>
  );
}

function RatingActions() {
  const { list } = useData();
  const items = list
    .filter((c) => c.ratings?.lastAction && /^\d{4}-\d{2}/.test(c.ratings.lastAction))
    .map((c) => ({ c, date: c.ratings!.lastAction!.slice(0, 10), text: c.ratings!.lastAction!.replace(/^\S+\s*/, '').replace(/^\(|\)$/g, '') }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
  return (
    <div className="card">
      <div className="card-head">
        <h3>Latest rating actions</h3>
        <span className="eyebrow">Curated feed</span>
      </div>
      <div className="grid" style={{ gap: 0 }}>
        {items.map(({ c, date, text }) => (
          <a key={c.iso3} href={`#/country/${c.iso3}`} style={{ textDecoration: 'none', display: 'grid', gridTemplateColumns: '84px 24px 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--hairline)' }}>
            <span className="muted tnum" style={{ fontSize: 12 }}>{date}</span>
            <span className="flag">{flag(c.iso2)}</span>
            <span>
              <b>{c.short}</b> <span className="ink2">— {text}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function DistressWatch() {
  const { list } = useData();
  const items = list
    .map((c) => ({ c, n: compositeNotch(c), cds: c.markets?.cds5y ?? null }))
    .filter((x) => (x.n != null && x.n >= 16.5) || (x.cds != null && x.cds >= 600))
    .sort((a, b) => (b.n ?? 0) - (a.n ?? 0));
  return (
    <div className="card">
      <div className="card-head">
        <h3>Distress watch</h3>
        <span className="eyebrow">≤ CCC+ or CDS ≥ 600bp</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {items.map(({ c, n, cds }) => (
          <a key={c.iso3} href={`#/country/${c.iso3}`} className="chip" style={{ textDecoration: 'none' }} title={c.programme?.headline}>
            <span className="flag">{flag(c.iso2)}</span>
            {c.short}
            <span className="muted tnum" style={{ fontSize: 11 }}>
              {n != null ? fmt('rating', n) : ''}
              {cds != null ? ` · ${Math.round(cds)}bp` : ''}
            </span>
          </a>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
        The IMF’s market-access framework treats spreads above 600bp as high risk; above ~1,000bp markets are typically pricing a restructuring.
      </p>
    </div>
  );
}
