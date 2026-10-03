import { useMemo, useState } from 'react';
import type { Country, Series } from '../lib/types';
import { FOCUS_YEAR, getValue, statusOf } from '../lib/metrics';
import { LineChart, Legend } from './charts';
import { StatusPill } from './ui';

const avg = (c: Country, k: string, a: number, b: number) => {
  const vs: number[] = [];
  for (let y = a; y <= b; y++) {
    const v = getValue(c, k, y);
    if (v != null) vs.push(v);
  }
  return vs.length ? vs.reduce((x, y) => x + y, 0) / vs.length : null;
};

function Slider({ label, value, min, max, step, onChange, suffix = '%', hint }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string; hint?: string }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
        <span className="ink2" style={{ fontWeight: 600 }}>{label}</span>
        <b className="tnum">
          {value > 0 && suffix !== '%' ? '' : ''}
          {value.toFixed(1)}
          {suffix}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} style={{ accentColor: 'var(--brand)' }} />
      {hint && <span className="muted" style={{ fontSize: 11 }}>{hint}</span>}
    </label>
  );
}

/**
 * Standard public-debt dynamics:
 *   d_t = d_{t−1} · (1 + i) / ((1 + g)(1 + π)) + α · d_{t−1} · ε_t − pb_t
 * i = effective nominal interest rate, g = real growth, π = GDP deflator (CPI proxy),
 * α = FX share of debt, ε = depreciation shock (year 1 only), pb = primary balance.
 */
export function DebtSimulator({ c }: { c: Country }) {
  const baseDebt = getValue(c, 'debt', FOCUS_YEAR) ?? 60;
  const defaults = useMemo(() => {
    const g = avg(c, 'growth', FOCUS_YEAR + 1, FOCUS_YEAR + 5) ?? 3;
    const pi = Math.min(30, avg(c, 'inflation', FOCUS_YEAR + 1, FOCUS_YEAR + 5) ?? 3);
    const pb = avg(c, 'primaryBalance', FOCUS_YEAR + 1, FOCUS_YEAR + 5) ?? getValue(c, 'primaryBalance') ?? 0;
    const intGdp = getValue(c, 'interestGdp', FOCUS_YEAR);
    const prev = getValue(c, 'debt', FOCUS_YEAR - 1);
    let i = intGdp != null && prev ? (intGdp / prev) * 100 * (1 + g / 100) * (1 + pi / 100) : 4;
    i = Math.max(0, Math.min(40, i));
    const fx = c.group === 'AE' ? 0 : c.group === 'LIC' ? 60 : 35;
    return { g, pi, pb, i, fx };
  }, [c]);

  const [g, setG] = useState(defaults.g);
  const [pi, setPi] = useState(defaults.pi);
  const [pb, setPb] = useState(defaults.pb);
  const [i, setI] = useState(defaults.i);
  const [fx, setFx] = useState(defaults.fx);
  const [dep, setDep] = useState(0);

  const { path, stabilising } = useMemo(() => {
    const s: Series = { [FOCUS_YEAR]: baseDebt };
    let d = baseDebt;
    for (let y = FOCUS_YEAR + 1; y <= FOCUS_YEAR + 6; y++) {
      const shock = y === FOCUS_YEAR + 1 ? (fx / 100) * d * (dep / 100) : 0;
      d = (d * (1 + i / 100)) / ((1 + g / 100) * (1 + pi / 100)) + shock - pb;
      s[y] = Math.max(0, d);
    }
    const gn = (1 + g / 100) * (1 + pi / 100) - 1;
    const stab = ((i / 100 - gn) / (1 + gn)) * baseDebt;
    return { path: s, stabilising: stab };
  }, [baseDebt, g, pi, pb, i, fx, dep]);

  const imf: Series = {};
  for (let y = FOCUS_YEAR - 6; y <= FOCUS_YEAR + 6; y++) {
    const v = getValue(c, 'debt', y);
    if (v != null) imf[y] = v;
  }
  const end = path[FOCUS_YEAR + 6];
  const st = statusOf(c, 'debt', end);
  const reset = () => {
    setG(defaults.g);
    setPi(defaults.pi);
    setPb(defaults.pb);
    setI(defaults.i);
    setFx(defaults.fx);
    setDep(0);
  };
  const scenario = (kind: 'shock' | 'austerity' | 'boom') => {
    reset();
    if (kind === 'shock') {
      setDep(30);
      setG(defaults.g - 2);
      setI(defaults.i + 2);
    } else if (kind === 'austerity') setPb(defaults.pb + 2);
    else {
      setG(defaults.g + 1.5);
      setI(Math.max(0, defaults.i - 1));
    }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)', gap: 20 }} id="sim-grid">
      <div className="grid" style={{ gap: 12, alignContent: 'start' }}>
        <div className="row" style={{ gap: 6 }}>
          <button className="chip" onClick={reset}>Baseline</button>
          <button className="chip" onClick={() => scenario('shock')}>💥 Combined shock</button>
          <button className="chip" onClick={() => scenario('austerity')}>✂️ +2pp austerity</button>
          <button className="chip" onClick={() => scenario('boom')}>🚀 Growth boom</button>
        </div>
        <Slider label="Primary balance (% GDP)" value={pb} min={-10} max={8} step={0.1} onChange={setPb} hint={`Debt-stabilising level: ${stabilising.toFixed(1)}%`} />
        <Slider label="Real GDP growth" value={g} min={-6} max={10} step={0.1} onChange={setG} />
        <Slider label="Inflation (deflator)" value={pi} min={-2} max={40} step={0.1} onChange={setPi} />
        <Slider label="Effective interest rate (nominal)" value={i} min={0} max={40} step={0.1} onChange={setI} />
        <Slider label="FX share of debt" value={fx} min={0} max={100} step={1} onChange={setFx} />
        <Slider label={`FX depreciation shock in ${FOCUS_YEAR + 1}`} value={dep} min={0} max={100} step={1} onChange={setDep} />
      </div>
      <div>
        <div className="row" style={{ marginBottom: 6 }}>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Debt in {FOCUS_YEAR + 6} under your scenario</div>
            <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1 }}>{end.toFixed(1)}% <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>of GDP</span></div>
          </div>
          <span className="spacer" />
          <div style={{ textAlign: 'right' }}>
            <StatusPill status={st} />
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {end - baseDebt >= 0 ? '+' : ''}
              {(end - baseDebt).toFixed(1)}pp vs {FOCUS_YEAR}
            </div>
          </div>
        </div>
        <LineChart
          series={[
            { id: 'imf', label: 'IMF WEO', color: 'var(--s1)', data: imf },
            { id: 'sim', label: 'Your scenario', color: 'var(--s2)', data: path, dashed: true },
          ]}
          metricKey="debt"
          from={FOCUS_YEAR - 6}
          to={FOCUS_YEAR + 6}
          height={260}
          refLines={[{ value: c.group === 'AE' ? 85 : c.group === 'LIC' ? 55 : 70, label: `IMF ${c.group} benchmark`, tone: 'danger' }]}
        />
        <Legend items={[{ label: 'IMF WEO path', color: 'var(--s1)' }, { label: 'Your scenario', color: 'var(--s2)', dashed: true }]} />
        <p className="muted" style={{ fontSize: 11, marginBottom: 0 }}>
          d<sub>t</sub> = d<sub>t−1</sub>·(1+i)/((1+g)(1+π)) + α·d<sub>t−1</sub>·ε − pb. Defaults are IMF WEO averages for {FOCUS_YEAR + 1}–{FOCUS_YEAR + 5}; FX share is a placeholder assumption ({defaults.fx}% for {c.group}s) — replace with DMO data.
        </p>
      </div>
      <style>{`@media (max-width: 820px){ #sim-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
