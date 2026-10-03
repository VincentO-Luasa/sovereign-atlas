import { useMemo, useState, type ReactNode } from 'react';
import type { Country, Status } from '../lib/types';
import { STATUS_COLOR, STATUS_LABEL, METRICS, METRIC, type Pillar } from '../lib/metrics';
import { outlookArrow, notch, ratingBand, compositeNotch } from '../lib/ratings';
import { flag, useData, isCovered } from '../lib/data';

export function StatusPill({ status }: { status: Status | null }) {
  if (!status) return null;
  const icon = status === 'good' ? '✓' : status === 'watch' ? '!' : '✕';
  return (
    <span className="status" title={STATUS_LABEL[status]}>
      <i style={{ background: STATUS_COLOR[status], display: 'inline-grid', placeItems: 'center', width: 14, height: 14, fontSize: 9, color: '#fff', fontStyle: 'normal' }}>
        {icon}
      </i>
      {STATUS_LABEL[status]}
    </span>
  );
}

const TONE_BG: Record<string, string> = {
  'ig-high': 'var(--s1)',
  ig: 'var(--s1)',
  hy: 'var(--warning)',
  distress: 'var(--serious)',
  default: 'var(--critical)',
};

export function RatingChip({ agency, rating, outlook }: { agency: string; rating?: string | null; outlook?: string }) {
  const n = notch(rating);
  const band = ratingBand(n);
  return (
    <div
      style={{
        border: '1px solid var(--ring)',
        borderRadius: 12,
        padding: '8px 12px',
        minWidth: 92,
        background: 'var(--surface)',
        position: 'relative',
        overflow: 'hidden',
      }}
      title={outlook ? `Outlook: ${outlook}` : undefined}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: band ? TONE_BG[band.tone] : 'var(--hairline)' }} />
      <div className="eyebrow" style={{ fontSize: 10 }}>{agency}</div>
      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
        {rating ?? <span className="muted" style={{ fontSize: 14 }}>Not rated</span>}
        {rating && outlook && (
          <span className="ink2" style={{ fontSize: 13, fontWeight: 500, marginLeft: 6 }}>
            {outlookArrow(outlook)} {outlook === 'n.a.' ? '' : outlook}
          </span>
        )}
      </div>
    </div>
  );
}

export function RatingChips({ c }: { c: Country }) {
  const r = c.ratings;
  if (!r) return <span className="muted">No agency ratings in dataset</span>;
  return (
    <div className="row" style={{ gap: 8 }}>
      <RatingChip agency="S&P" rating={r.sp?.rating} outlook={r.sp?.outlook} />
      <RatingChip agency="Moody’s" rating={r.moodys?.rating} outlook={r.moodys?.outlook} />
      <RatingChip agency="Fitch" rating={r.fitch?.rating} outlook={r.fitch?.outlook} />
    </div>
  );
}

/** Horizontal AAA→D ladder with the country’s composite position. */
export function RatingLadder({ countries }: { countries: { c: Country; color: string }[] }) {
  const W = 22;
  const items = countries.map(({ c, color }) => ({ c, color, n: compositeNotch(c) })).filter((x) => x.n != null);
  const labels = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'];
  const pos: Record<string, number> = { AAA: 1, AA: 3, A: 6, BBB: 9, BB: 12, B: 15, CCC: 18, CC: 20, C: 21, D: 22 };
  return (
    <div style={{ position: 'relative', padding: '28px 0 22px' }}>
      <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
        <div style={{ flex: 10, background: 'color-mix(in srgb, var(--s1) 55%, transparent)' }} />
        <div style={{ flex: 6, background: 'color-mix(in srgb, var(--warning) 65%, transparent)' }} />
        <div style={{ flex: 5, background: 'color-mix(in srgb, var(--serious) 70%, transparent)' }} />
        <div style={{ flex: 1, background: 'var(--critical)' }} />
      </div>
      <div style={{ position: 'absolute', left: `${(10 / W) * 100}%`, top: 18, bottom: 16, borderLeft: '2px solid var(--ink)' }} />
      <div style={{ position: 'absolute', left: `calc(${(10 / W) * 100}% + 6px)`, top: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }} className="ink2">
        IG CLIFF
      </div>
      {labels.map((l) => (
        <span key={l} className="muted" style={{ position: 'absolute', left: `${((pos[l] - 0.5) / W) * 100}%`, bottom: 0, fontSize: 10, transform: 'translateX(-50%)' }}>
          {l}
        </span>
      ))}
      {items.map(({ c, color, n }, i) => {
        // nudge markers that share (almost) the same notch so none is hidden
        const dup = items.slice(0, i).filter((o) => Math.abs(o.n! - n!) < 0.5).length;
        return (
        <div
          key={c.iso3}
          title={`${c.short}: composite ${n!.toFixed(1)}`}
          style={{
            position: 'absolute',
            left: `${((n! - 0.5) / W) * 100}%`,
            top: 10,
            transform: `translateX(calc(-50% + ${dup * 14}px))`,
            transition: 'left 0.6s cubic-bezier(.2,.8,.2,1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: color, border: '3px solid var(--surface)', boxShadow: '0 1px 4px rgba(0,0,0,.25)', display: 'grid', placeItems: 'center', fontSize: 10, marginTop: 6 }} />
        </div>
        );
      })}
    </div>
  );
}

export function CountrySelect({ value, onChange, exclude = [], placeholder = 'Add a country…', coveredFirst = true }: { value?: string; onChange: (iso3: string) => void; exclude?: string[]; placeholder?: string; coveredFirst?: boolean }) {
  const { list } = useData();
  const opts = useMemo(() => {
    const l = list.filter((c) => !exclude.includes(c.iso3));
    return coveredFirst ? [...l.filter(isCovered), ...l.filter((c) => !isCovered(c))] : l;
  }, [list, exclude, coveredFirst]);
  return (
    <select className="select" value={value ?? ''} onChange={(e) => e.target.value && onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {opts.map((c) => (
        <option key={c.iso3} value={c.iso3}>
          {flag(c.iso2)} {c.short}
        </option>
      ))}
    </select>
  );
}

export function MetricSelect({ value, onChange, filter }: { value: string; onChange: (k: string) => void; filter?: (k: string) => boolean }) {
  const groups = METRICS.reduce<Record<Pillar, typeof METRICS>>((acc, m) => {
    if (!filter || filter(m.key)) (acc[m.pillar] ??= []).push(m);
    return acc;
  }, {} as Record<Pillar, typeof METRICS>);
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(groups).map(([g, ms]) => (
        <optgroup key={g} label={g}>
          {ms.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function InfoTip({ metricKey, children }: { metricKey: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const m = METRIC[metricKey];
  if (!m) return null;
  return (
    <span style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children ?? (
        <span
          style={{ display: 'inline-grid', placeItems: 'center', width: 15, height: 15, borderRadius: '50%', border: '1px solid var(--axis)', fontSize: 9, color: 'var(--muted)', cursor: 'help', fontWeight: 700 }}
          aria-label={`About ${m.label}`}
        >
          i
        </span>
      )}
      {open && (
        <div className="tooltip" style={{ position: 'absolute', top: 20, left: -8, width: 300, maxWidth: 300, pointerEvents: 'none' }}>
          <div className="tt-title">{m.label}</div>
          <div className="ink2" style={{ marginBottom: 6 }}>{m.what}</div>
          <div style={{ marginBottom: m.rule ? 6 : 0 }}>
            <b>Why it matters · </b>
            {m.why}
          </div>
          {m.rule && (
            <div>
              <b>Rule of thumb · </b>
              {m.rule}
            </div>
          )}
          <div className="muted" style={{ marginTop: 6, fontSize: 11 }}>
            Source: {m.source}
          </div>
        </div>
      )}
    </span>
  );
}
