import * as d3 from 'd3';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { flag, useData, isCovered } from '../lib/data';
import { FOCUS_YEAR, METRIC, fmt, getValue } from '../lib/metrics';
import { go } from '../lib/router';
import { useSize } from '../components/charts';
import { useTooltip } from '../components/Tooltip';
import { MetricSelect, InfoTip } from '../components/ui';
import type { Country } from '../lib/types';

const PRESETS: { label: string; x: string; y: string; blurb: string }[] = [
  { label: 'Rating vs CDS', x: 'rating', y: 'cds5y', blurb: 'Spot mispricings: names trading wide of their rating peers (above the curve) or tight (below).' },
  { label: 'Debt vs rating', x: 'debt', y: 'rating', blurb: 'Debt explains surprisingly little of the rating — governance and income dominate.' },
  { label: 'Debt vs interest burden', x: 'debt', y: 'interestRevenue', blurb: 'Same debt, very different affordability. Top-left = cheap debt; top-right = squeezed.' },
  { label: 'Twin deficits', x: 'fiscalBalance', y: 'currentAccount', blurb: 'Bottom-left quadrant: both fiscal and external deficits — reliant on foreign funding.' },
  { label: 'Income vs rating', x: 'gdpPc', y: 'rating', blurb: 'The strongest single correlate of sovereign ratings is GDP per capita.' },
  { label: 'Inflation vs 10Y yield', x: 'inflation', y: 'yield10y', blurb: 'Below the diagonal = negative real yields.' },
];

const REGIONS = ['Europe & Central Asia', 'Latin America & Caribbean', 'Middle East & North Africa', 'Sub-Saharan Africa', 'East Asia & Pacific', 'South Asia', 'North America'];

export function ExplorerPage() {
  const { list } = useData();
  const [x, setX] = useState('rating');
  const [y, setY] = useState('cds5y');
  const [region, setRegion] = useState<string | null>(null);
  const [coveredOnly, setCoveredOnly] = useState(true);
  const [logX, setLogX] = useState(false);
  const preset = PRESETS.find((p) => p.x === x && p.y === y);

  const pts = useMemo(
    () =>
      list
        .filter((c) => !coveredOnly || isCovered(c))
        .map((c) => ({ c, x: getValue(c, x), y: getValue(c, y), size: getValue(c, 'gdp') ?? 1 }))
        .filter((p): p is { c: Country; x: number; y: number; size: number } => p.x != null && p.y != null),
    [list, x, y, coveredOnly],
  );

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="eyebrow">Explorer</div>
          <h1>Find the outliers</h1>
          <p>Plot any two metrics against each other. Bubble size = nominal GDP. Hover to inspect, click to open the dossier.</p>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        {PRESETS.map((p) => (
          <button key={p.label} className={`chip ${preset === p ? 'active' : ''}`} onClick={() => (setX(p.x), setY(p.y), setLogX(p.x === 'gdpPc'))}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <span className="muted">Y</span>
          <MetricSelect value={y} onChange={setY} />
          <InfoTip metricKey={y} />
          <span className="muted" style={{ marginLeft: 8 }}>X</span>
          <MetricSelect value={x} onChange={setX} />
          <InfoTip metricKey={x} />
          <label className="row" style={{ gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={logX} onChange={(e) => setLogX(e.target.checked)} /> log X
          </label>
          <span className="spacer" />
          <label className="row" style={{ gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={coveredOnly} onChange={(e) => setCoveredOnly(e.target.checked)} /> Rated universe only
          </label>
        </div>
        <div className="row" style={{ marginBottom: 6, gap: 6 }}>
          <span className="muted" style={{ fontSize: 12 }}>Highlight:</span>
          <button className={`chip ${!region ? 'active' : ''}`} onClick={() => setRegion(null)}>All</button>
          {REGIONS.map((r) => (
            <button key={r} className={`chip ${region === r ? 'active' : ''}`} onClick={() => setRegion(region === r ? null : r)}>
              {r}
            </button>
          ))}
        </div>
        {preset && <p className="ink2" style={{ margin: '8px 0', fontFamily: 'var(--font-display)', fontSize: 15 }}>💡 {preset.blurb}</p>}
        <Scatter pts={pts} xk={x} yk={y} region={region} logX={logX} />
        <p className="muted" style={{ fontSize: 11 }}>
          {pts.length} sovereigns · {FOCUS_YEAR} values (latest available for World Bank series; market data = latest snapshot). Dashed line = least-squares fit.
        </p>
      </div>
    </div>
  );
}

function Scatter({ pts, xk, yk, region, logX }: { pts: { c: Country; x: number; y: number; size: number }[]; xk: string; yk: string; region: string | null; logX: boolean }) {
  const [ref, width] = useSize<HTMLDivElement>();
  const tip = useTooltip();
  const [hover, setHover] = useState<string | null>(null);
  const height = 540;
  const m = { t: 20, r: 24, b: 44, l: 60 };
  const canLog = logX && pts.every((p) => p.x > 0);
  const xs = (canLog ? d3.scaleLog() : d3.scaleLinear()).domain(d3.extent(pts, (p) => p.x) as [number, number]).nice().range([m.l, width - m.r]);
  const yDomain = d3.extent(pts, (p) => p.y) as [number, number];
  const ys = d3.scaleLinear().domain(yDomain[0] == null ? [0, 1] : yDomain).nice().range(METRIC[yk].unit === 'notch' ? [m.t, height - m.b] : [height - m.b, m.t]);
  if (METRIC[xk].unit === 'notch') xs.range([width - m.r, m.l]);
  const r = d3.scaleSqrt().domain([0, d3.max(pts, (p) => p.size) ?? 1]).range([3, 30]);

  const fit = useMemo(() => {
    if (pts.length < 5) return null;
    const X = pts.map((p) => (canLog ? Math.log(p.x) : p.x)), Y = pts.map((p) => p.y);
    const mx = d3.mean(X)!, my = d3.mean(Y)!;
    const b = d3.sum(X, (v, i) => (v - mx) * (Y[i] - my)) / d3.sum(X, (v) => (v - mx) ** 2);
    const a = my - b * mx;
    const corr = d3.sum(X, (v, i) => (v - mx) * (Y[i] - my)) / Math.sqrt(d3.sum(X, (v) => (v - mx) ** 2) * d3.sum(Y, (v) => (v - my) ** 2));
    return { a, b, corr };
  }, [pts, canLog]);

  const delaunay = useMemo(() => d3.Delaunay.from(pts, (p) => xs(p.x), (p) => ys(p.y)), [pts, xs, ys]);
  // label the biggest + most extreme points
  const labelled = useMemo(() => {
    const s = new Set<string>();
    [...pts].sort((a, b) => b.size - a.size).slice(0, 8).forEach((p) => s.add(p.c.iso3));
    [...pts].sort((a, b) => b.y - a.y).slice(0, 4).forEach((p) => s.add(p.c.iso3));
    [...pts].sort((a, b) => b.x - a.x).slice(0, 3).forEach((p) => s.add(p.c.iso3));
    return s;
  }, [pts]);

  const tickFmt = (k: string) => (v: d3.NumberValue) => (METRIC[k].unit === 'notch' ? fmt(k, +v) : fmt(k, +v, { unit: false, sign: false }));
  const fitLine = fit && (() => {
    const [x0, x1] = xs.domain();
    const f = (xv: number) => fit.a + fit.b * (canLog ? Math.log(xv) : xv);
    return { x1: xs(x0), y1: ys(f(x0)), x2: xs(x1), y2: ys(f(x1)) };
  })();

  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          onMouseMove={(e) => {
            const b = e.currentTarget.getBoundingClientRect();
            const i = delaunay.find(e.clientX - b.left, e.clientY - b.top);
            const p = pts[i];
            if (!p) return;
            const dist = Math.hypot(xs(p.x) - (e.clientX - b.left), ys(p.y) - (e.clientY - b.top));
            if (dist > 40) {
              setHover(null);
              tip.hide();
              return;
            }
            setHover(p.c.iso3);
            tip.show(
              e,
              <>
                <div className="tt-title">
                  {flag(p.c.iso2)} {p.c.short}
                </div>
                <div className="tt-row"><span>{METRIC[yk].short}</span><b>{fmt(yk, p.y)}</b></div>
                <div className="tt-row"><span>{METRIC[xk].short}</span><b>{fmt(xk, p.x)}</b></div>
                <div className="tt-row"><span>GDP</span><b>{fmt('gdp', p.size)}</b></div>
              </>,
            );
          }}
          onMouseLeave={() => {
            setHover(null);
            tip.hide();
          }}
          onClick={() => hover && go(`country/${hover}`)}
          style={{ cursor: hover ? 'pointer' : 'default' }}
        >
          {ys.ticks(6).map((t) => (
            <g key={'y' + t}>
              <line className="grid-line" x1={m.l} x2={width - m.r} y1={ys(t)} y2={ys(t)} />
              <text x={m.l - 8} y={ys(t) + 4} textAnchor="end" className="tnum">{tickFmt(yk)(t)}</text>
            </g>
          ))}
          {(canLog ? (xs as d3.ScaleLogarithmic<number, number>).ticks(6) : xs.ticks(8)).map((t) => (
            <text key={'x' + t} x={xs(+t)} y={height - m.b + 18} textAnchor="middle" className="tnum">{tickFmt(xk)(t)}</text>
          ))}
          {ys.domain()[0] < 0 && ys.domain()[1] > 0 && <line className="axis-line" x1={m.l} x2={width - m.r} y1={ys(0)} y2={ys(0)} />}
          {!canLog && xs.domain()[0] < 0 && xs.domain()[1] > 0 && <line className="axis-line" y1={m.t} y2={height - m.b} x1={xs(0)} x2={xs(0)} />}
          <text x={width - m.r} y={height - 6} textAnchor="end" style={{ fontWeight: 600, fill: 'var(--ink-2)' }}>{METRIC[xk].label} →</text>
          <text x={m.l} y={12} style={{ fontWeight: 600, fill: 'var(--ink-2)' }}>↑ {METRIC[yk].label}{METRIC[yk].unit === 'notch' ? ' (AAA at top)' : ''}</text>
          <clipPath id="plot-clip">
            <rect x={m.l} y={m.t} width={Math.max(0, width - m.l - m.r)} height={height - m.t - m.b} />
          </clipPath>
          {fitLine && <line clipPath="url(#plot-clip)" {...fitLine} stroke="var(--muted)" strokeDasharray="5 5" strokeWidth={1.25} />}
          {[...pts].sort((a, b) => b.size - a.size).map((p) => {
            const dim = region && p.c.region !== region;
            const hl = hover === p.c.iso3;
            return (
              <motion.circle
                key={p.c.iso3}
                initial={false}
                animate={{ cx: xs(p.x), cy: ys(p.y), r: r(p.size) }}
                transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                fill={dim ? 'var(--axis)' : 'var(--s1)'}
                fillOpacity={dim ? 0.25 : hl ? 0.9 : 0.55}
                stroke={hl ? 'var(--ink)' : 'var(--surface)'}
                strokeWidth={hl ? 2 : 1.5}
              />
            );
          })}
          {pts
            .filter((p) => labelled.has(p.c.iso3) || hover === p.c.iso3 || (region && p.c.region === region))
            .map((p) => (
              <text key={'l' + p.c.iso3} x={xs(p.x) + r(p.size) + 3} y={ys(p.y) + 4} style={{ fill: 'var(--ink-2)', fontWeight: 600, pointerEvents: 'none' }}>
                {p.c.iso3}
              </text>
            ))}
        </svg>
      )}
      {fit && (
        <div className="badge" style={{ position: 'absolute', right: 24, top: 24 }}>
          correlation ρ = {fit.corr.toFixed(2)}
        </div>
      )}
    </div>
  );
}
