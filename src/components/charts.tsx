import * as d3 from 'd3';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { Series } from '../lib/types';
import { FOCUS_YEAR, fmt } from '../lib/metrics';
import { useTooltip, TipRows } from './Tooltip';

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  data: Series;
  dashed?: boolean;
}

interface RefLine {
  value: number;
  label: string;
  tone?: 'danger' | 'watch' | 'neutral';
}

const yearsOf = (series: LineSeries[], from: number, to: number) => {
  const ys = new Set<number>();
  for (const s of series) for (const y of Object.keys(s.data)) if (+y >= from && +y <= to) ys.add(+y);
  return [...ys].sort((a, b) => a - b);
};

function ProjectionShade({ x, h, top }: { x: number; h: number; top: number }) {
  return (
    <g>
      <rect x={x} y={top} width={9999} height={h} fill="var(--projection)" />
      <text x={x + 6} y={top + 12} style={{ fontSize: 10, letterSpacing: '0.08em' }}>
        IMF PROJECTION
      </text>
    </g>
  );
}

/** Multi-series time-series line chart with crosshair tooltip and projection shading. */
export function LineChart({
  series,
  metricKey,
  from = 2010,
  to = 2031,
  height = 240,
  refLines = [],
  zero = false,
}: {
  series: LineSeries[];
  metricKey: string;
  from?: number;
  to?: number;
  height?: number;
  refLines?: RefLine[];
  zero?: boolean;
}) {
  const [ref, width] = useSize<HTMLDivElement>();
  const tip = useTooltip();
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const m = { t: 16, r: series.length > 1 ? 86 : 44, b: 26, l: 44 };
  const years = yearsOf(series, from, to);
  const x = d3.scaleLinear().domain([years[0] ?? from, years.at(-1) ?? to]).range([m.l, Math.max(m.l + 10, width - m.r)]);
  const vals = series.flatMap((s) => years.map((y) => s.data[y]).filter((v) => v != null)).concat(refLines.map((r) => r.value));
  if (zero) vals.push(0);
  const ext = d3.extent(vals) as [number, number];
  const y = d3.scaleLinear().domain(ext[0] == null ? [0, 1] : ext).nice(5).range([height - m.b, m.t]);
  const line = (s: Series) =>
    d3
      .line<number>()
      .defined((yr) => s[yr] != null)
      .x((yr) => x(yr))
      .y((yr) => y(s[yr]))
      .curve(d3.curveMonotoneX)(years) ?? '';

  if (!years.length) return <Empty height={height} />;

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const yr = Math.round(x.invert(e.clientX - box.left));
    const yy = Math.max(years[0], Math.min(years.at(-1)!, yr));
    setHoverYear(yy);
    tip.show(e, <TipRows title={`${yy}${yy > FOCUS_YEAR ? ' · projection' : ''}`} rows={series.map((s) => [s.label, fmt(metricKey, s.data[yy])])} />);
  };

  // direct end labels, de-collided
  const ends = series
    .map((s) => {
      const last = [...years].reverse().find((yr) => s.data[yr] != null);
      return last == null ? null : { s, yr: last, y: y(s.data[last]) };
    })
    .filter(Boolean) as { s: LineSeries; yr: number; y: number }[];
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;

  return (
    <div ref={ref} style={{ width: '100%' }}>
      {width > 0 && (
        <svg width={width} height={height} role="img">
          {to > FOCUS_YEAR && <ProjectionShade x={x(FOCUS_YEAR + 0.5)} top={m.t} h={height - m.t - m.b} />}
          {y.ticks(5).map((t) => (
            <g key={t}>
              <line className="grid-line" x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="tnum">
                {fmt(metricKey, t, { unit: false, sign: false })}
              </text>
            </g>
          ))}
          {(zero || (ext[0] < 0 && ext[1] > 0)) && <line className="axis-line" x1={m.l} x2={width - m.r} y1={y(0)} y2={y(0)} />}
          {x.ticks(Math.min(8, Math.floor(width / 70))).map((t) => (
            <text key={t} x={x(t)} y={height - 6} textAnchor="middle" className="tnum">
              {t}
            </text>
          ))}
          {refLines.map((r) => (
            <g key={r.label}>
              <line
                x1={m.l}
                x2={width - m.r}
                y1={y(r.value)}
                y2={y(r.value)}
                stroke={r.tone === 'danger' ? 'var(--critical)' : r.tone === 'watch' ? 'var(--warning)' : 'var(--axis)'}
                strokeWidth={1.25}
                strokeDasharray="4 4"
              />
              <text x={width - m.r - 4} y={y(r.value) - 5} textAnchor="end" style={{ fontSize: 10 }}>
                {r.label}
              </text>
            </g>
          ))}
          {series.map((s) => (
            <motion.path
              key={s.id}
              d={line(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
              // pathLength animation rewrites stroke-dasharray, so dashed series fade in instead
              initial={s.dashed ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
              animate={s.dashed ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          ))}
          {hoverYear != null && (
            <g>
              <line x1={x(hoverYear)} x2={x(hoverYear)} y1={m.t} y2={height - m.b} stroke="var(--axis)" />
              {series.map((s) =>
                s.data[hoverYear] != null ? (
                  <circle key={s.id} cx={x(hoverYear)} cy={y(s.data[hoverYear])} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                ) : null,
              )}
            </g>
          )}
          {series.length > 1 &&
            ends.map((e) => (
              <text key={e.s.id} x={x(e.yr) + 8} y={e.y + 4} style={{ fill: 'var(--ink-2)', fontWeight: 600 }}>
                {e.s.label.length > 12 ? e.s.label.slice(0, 11) + '…' : e.s.label}
              </text>
            ))}
          <rect
            x={m.l}
            y={m.t}
            width={Math.max(0, width - m.l - m.r)}
            height={height - m.t - m.b}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => {
              setHoverYear(null);
              tip.hide();
            }}
          />
        </svg>
      )}
    </div>
  );
}

/** Time-series bars (diverging around zero), projections lighter. */
export function BarSeries({
  data,
  metricKey,
  from = 2010,
  to = 2031,
  height = 220,
  colorFor,
  refLines = [],
}: {
  data: Series;
  metricKey: string;
  from?: number;
  to?: number;
  height?: number;
  colorFor?: (v: number) => string;
  refLines?: RefLine[];
}) {
  const [ref, width] = useSize<HTMLDivElement>();
  const tip = useTooltip();
  const years = Object.keys(data).map(Number).filter((y) => y >= from && y <= to).sort((a, b) => a - b);
  if (!years.length) return <Empty height={height} />;
  const m = { t: 16, r: 12, b: 26, l: 44 };
  const x = d3.scaleBand<number>().domain(years).range([m.l, Math.max(m.l + 10, width - m.r)]).padding(0.22);
  const vals = years.map((y) => data[y]).concat(refLines.map((r) => r.value), [0]);
  const y = d3.scaleLinear().domain(d3.extent(vals) as [number, number]).nice(5).range([height - m.b, m.t]);
  const col = colorFor ?? ((v: number) => (v >= 0 ? 'var(--s1)' : 'var(--div-neg)'));
  const projX = years.includes(FOCUS_YEAR + 1) ? x(FOCUS_YEAR + 1)! - (x.step() * x.paddingInner()) / 2 : null;
  return (
    <div ref={ref} style={{ width: '100%' }}>
      {width > 0 && (
        <svg width={width} height={height}>
          {projX != null && <ProjectionShade x={projX} top={m.t} h={height - m.t - m.b} />}
          {y.ticks(5).map((t) => (
            <g key={t}>
              <line className="grid-line" x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="tnum">
                {fmt(metricKey, t, { unit: false, sign: false })}
              </text>
            </g>
          ))}
          {years.map((yr, i) => {
            const v = data[yr];
            const y0 = y(0), y1 = y(v);
            const h = Math.abs(y1 - y0);
            const r = Math.min(4, x.bandwidth() / 2, h);
            const top = Math.min(y0, y1);
            // rounded data-end, square at baseline
            const bw = x.bandwidth(), bx = x(yr)!;
            const d =
              v >= 0
                ? `M${bx},${y0} V${top + r} Q${bx},${top} ${bx + r},${top} H${bx + bw - r} Q${bx + bw},${top} ${bx + bw},${top + r} V${y0} Z`
                : `M${bx},${y0} V${y1 - r} Q${bx},${y1} ${bx + r},${y1} H${bx + bw - r} Q${bx + bw},${y1} ${bx + bw},${y1 - r} V${y0} Z`;
            return (
              <motion.path
                key={yr}
                d={d}
                fill={col(v)}
                opacity={yr > FOCUS_YEAR ? 0.45 : 1}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                style={{ transformOrigin: `0px ${y0}px` }}
                transition={{ delay: i * 0.015, duration: 0.4 }}
                onMouseMove={(e) => tip.show(e, <TipRows title={`${yr}${yr > FOCUS_YEAR ? ' · projection' : ''}`} rows={[['Value', fmt(metricKey, v)]]} />)}
                onMouseLeave={tip.hide}
              />
            );
          })}
          <line className="axis-line" x1={m.l} x2={width - m.r} y1={y(0)} y2={y(0)} />
          {refLines.map((r) => (
            <g key={r.label}>
              <line x1={m.l} x2={width - m.r} y1={y(r.value)} y2={y(r.value)} stroke={r.tone === 'danger' ? 'var(--critical)' : 'var(--warning)'} strokeDasharray="4 4" />
              <text x={width - m.r - 4} y={y(r.value) - 5} textAnchor="end" style={{ fontSize: 10 }}>
                {r.label}
              </text>
            </g>
          ))}
          {years
            .filter((yr) => yr % (width < 520 ? 4 : 2) === 0)
            .map((yr) => (
              <text key={yr} x={x(yr)! + x.bandwidth() / 2} y={height - 6} textAnchor="middle" className="tnum">
                {yr}
              </text>
            ))}
        </svg>
      )}
    </div>
  );
}

export function Sparkline({ data, color = 'var(--s1)', width = 96, height = 28, from = 2014, to = 2028 }: { data?: Series; color?: string; width?: number; height?: number; from?: number; to?: number }) {
  if (!data) return <svg width={width} height={height} />;
  const years = Object.keys(data).map(Number).filter((y) => y >= from && y <= to).sort((a, b) => a - b);
  if (years.length < 2) return <svg width={width} height={height} />;
  const x = d3.scaleLinear().domain([years[0], years.at(-1)!]).range([2, width - 2]);
  const y = d3.scaleLinear().domain(d3.extent(years.map((yr) => data[yr])) as [number, number]).range([height - 3, 3]);
  const hist = years.filter((yr) => yr <= FOCUS_YEAR), proj = years.filter((yr) => yr >= FOCUS_YEAR);
  const path = (ys: number[]) => d3.line<number>().x((yr) => x(yr)).y((yr) => y(data[yr])).curve(d3.curveMonotoneX)(ys) ?? '';
  const last = hist.at(-1);
  return (
    <svg width={width} height={height} aria-hidden>
      <path d={path(hist)} fill="none" stroke={color} strokeWidth={1.75} />
      {proj.length > 1 && <path d={path(proj)} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="2 3" opacity={0.7} />}
      {last != null && <circle cx={x(last)} cy={y(data[last])} r={2.5} fill={color} />}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Yield curve
// ---------------------------------------------------------------------------
export const TENORS: [string, number][] = [
  ['1M', 1 / 12], ['3M', 0.25], ['6M', 0.5], ['1Y', 1], ['2Y', 2], ['3Y', 3], ['5Y', 5], ['7Y', 7], ['10Y', 10], ['15Y', 15], ['20Y', 20], ['30Y', 30],
];

export interface Curve {
  id: string;
  label: string;
  color: string;
  points: Record<string, number | null | undefined>;
  dashed?: boolean;
}

export function YieldCurveChart({ curves, height = 280, policyRate }: { curves: Curve[]; height?: number; policyRate?: number | null }) {
  const [ref, width] = useSize<HTMLDivElement>();
  const tip = useTooltip();
  const m = { t: 18, r: 90, b: 30, l: 44 };
  const pts = curves.map((c) => ({
    ...c,
    pts: TENORS.filter(([t]) => c.points?.[t] != null).map(([t, yrs]) => ({ t, yrs, v: c.points[t] as number })),
  })).filter((c) => c.pts.length);
  if (!pts.length) return <Empty height={height} label="No yield curve data" />;
  const x = d3.scaleSqrt().domain([0, 30]).range([m.l, Math.max(m.l + 10, width - m.r)]);
  const all = pts.flatMap((c) => c.pts.map((p) => p.v)).concat(policyRate != null ? [policyRate] : []);
  const ext = d3.extent(all) as [number, number];
  const pad = Math.max(0.25, (ext[1] - ext[0]) * 0.12);
  const y = d3.scaleLinear().domain([Math.max(ext[0] - pad, Math.min(0, ext[0])), ext[1] + pad]).nice(5).range([height - m.b, m.t]);
  const line = d3.line<{ yrs: number; v: number }>().x((p) => x(p.yrs)).y((p) => y(p.v)).curve(d3.curveMonotoneX);
  const ends = pts.map((c) => ({ c, y: y(c.pts.at(-1)!.v), x: x(c.pts.at(-1)!.yrs) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  return (
    <div ref={ref} style={{ width: '100%' }}>
      {width > 0 && (
        <svg width={width} height={height}>
          {y.ticks(5).map((t) => (
            <g key={t}>
              <line className="grid-line" x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="tnum">
                {t.toFixed(t % 1 ? 1 : 0)}%
              </text>
            </g>
          ))}
          {['3M', '1Y', '2Y', '5Y', '10Y', '20Y', '30Y'].map((t) => {
            const yrs = TENORS.find((d) => d[0] === t)![1];
            return (
              <text key={t} x={x(yrs)} y={height - 8} textAnchor="middle">
                {t}
              </text>
            );
          })}
          {policyRate != null && (
            <g>
              <line x1={m.l} x2={width - m.r} y1={y(policyRate)} y2={y(policyRate)} stroke="var(--accent)" strokeDasharray="4 4" />
              <text x={m.l + 4} y={y(policyRate) - 5} style={{ fill: 'var(--accent)', fontSize: 10, fontWeight: 600 }}>
                Policy rate {policyRate.toFixed(2)}%
              </text>
            </g>
          )}
          {pts.map((c) => (
            <g key={c.id}>
              <motion.path
                d={line(c.pts) ?? ''}
                fill="none"
                stroke={c.color}
                strokeWidth={2}
                strokeDasharray={c.dashed ? '5 4' : undefined}
                initial={c.dashed ? { opacity: 0 } : { pathLength: 0 }}
                animate={c.dashed ? { opacity: 1 } : { pathLength: 1 }}
                transition={{ duration: 0.8 }}
              />
              {c.pts.map((p) => (
                <g key={p.t}>
                  <circle cx={x(p.yrs)} cy={y(p.v)} r={4} fill={c.color} stroke="var(--surface)" strokeWidth={2} />
                  <circle
                    cx={x(p.yrs)}
                    cy={y(p.v)}
                    r={12}
                    fill="transparent"
                    onMouseMove={(e) => tip.show(e, <TipRows title={`${c.label} · ${p.t}`} rows={[['Yield', `${p.v.toFixed(2)}%`]]} />)}
                    onMouseLeave={tip.hide}
                  />
                </g>
              ))}
            </g>
          ))}
          {ends.map((e) => (
            <text key={e.c.id} x={e.x + 10} y={e.y + 4} style={{ fill: 'var(--ink-2)', fontWeight: 600 }}>
              {e.c.label.length > 13 ? e.c.label.slice(0, 12) + '…' : e.c.label}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Radar (pillar scorecard)
// ---------------------------------------------------------------------------
export function Radar({
  axes,
  layers,
  size = 280,
}: {
  axes: string[];
  layers: { id: string; label: string; color: string; values: (number | null)[]; fillOpacity?: number }[];
  size?: number;
}) {
  const tip = useTooltip();
  const r = size / 2 - 42;
  const cx = size / 2, cy = size / 2;
  const ang = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const pt = (i: number, v: number) => [cx + Math.cos(ang(i)) * (r * v) / 100, cy + Math.sin(ang(i)) * (r * v) / 100];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%', overflow: 'visible' }}>
      {[25, 50, 75, 100].map((lvl) => (
        <polygon key={lvl} points={axes.map((_, i) => pt(i, lvl).join(',')).join(' ')} fill="none" stroke="var(--hairline)" />
      ))}
      {axes.map((a, i) => {
        const [x2, y2] = pt(i, 100);
        const [lx, ly] = pt(i, 122);
        return (
          <g key={a}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--hairline)" />
            <text x={lx} y={ly + 4} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontWeight: 600, fontSize: 11 }}>
              {a}
            </text>
          </g>
        );
      })}
      {layers.map((l) => (
        <motion.polygon
          key={l.id}
          points={axes.map((_, i) => pt(i, l.values[i] ?? 0).join(',')).join(' ')}
          fill={l.color}
          fillOpacity={l.fillOpacity ?? 0.16}
          stroke={l.color}
          strokeWidth={2}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        />
      ))}
      {layers.map((l) =>
        l.values.map((v, i) => {
          if (v == null) return null;
          const [px, py] = pt(i, v);
          return (
            <circle
              key={l.id + i}
              cx={px}
              cy={py}
              r={4}
              fill={l.color}
              stroke="var(--surface)"
              strokeWidth={2}
              onMouseMove={(e) => tip.show(e, <TipRows title={`${l.label} · ${axes[i]}`} rows={[['Score (percentile)', Math.round(v)]]} />)}
              onMouseLeave={tip.hide}
            />
          );
        }),
      )}
    </svg>
  );
}

/** 100% horizontal stacked bar with 2px surface gaps, legend below. */
export function StackBar({ parts, height = 22 }: { parts: { label: string; value: number; color: string }[]; height?: number }) {
  const tip = useTooltip();
  const total = parts.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div>
      <div style={{ display: 'flex', gap: 2, height, borderRadius: 6, overflow: 'hidden' }}>
        {parts.map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ flexGrow: 0 }}
            animate={{ flexGrow: p.value / total }}
            transition={{ duration: 0.7, delay: i * 0.05 }}
            style={{ background: p.color, flexBasis: 0, minWidth: p.value > 0 ? 2 : 0 }}
            onMouseMove={(e) => tip.show(e, <TipRows title={p.label} rows={[['Share', `${p.value.toFixed(1)}%`]]} />)}
            onMouseLeave={tip.hide}
          />
        ))}
      </div>
      <div className="row" style={{ marginTop: 10, gap: 14, fontSize: 12 }}>
        {parts.map((p) => (
          <span key={p.label} className="row" style={{ gap: 6 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: p.color, display: 'inline-block' }} />
            <span className="ink2">{p.label}</span>
            <b className="tnum">{p.value.toFixed(0)}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Empty({ height = 200, label = 'No data available' }: { height?: number; label?: ReactNode }) {
  return (
    <div style={{ height, display: 'grid', placeItems: 'center', color: 'var(--muted)', border: '1px dashed var(--hairline)', borderRadius: 10, fontSize: 13 }}>
      {label}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="row" style={{ gap: 14, fontSize: 12 }}>
      {items.map((it) => (
        <span key={it.label} className="row" style={{ gap: 6 }}>
          <svg width="18" height="8">
            <line x1="0" x2="18" y1="4" y2="4" stroke={it.color} strokeWidth="2.5" strokeDasharray={it.dashed ? '4 3' : undefined} />
          </svg>
          <span className="ink2">{it.label}</span>
        </span>
      ))}
    </div>
  );
}

