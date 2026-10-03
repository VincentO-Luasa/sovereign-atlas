import { useState } from 'react';
import { motion } from 'framer-motion';
import { METRICS, type Pillar } from '../lib/metrics';

const FRAMEWORKS = [
  {
    name: 'Moody’s',
    body: 'Economic strength + Institutions & governance → economic resiliency; then Fiscal strength (debt burden & affordability) and Susceptibility to event risk (political, liquidity, banking, external) — event risk acts as a “weakest link” cap.',
  },
  {
    name: 'S&P',
    body: 'Five scores from 1 (best) to 6: Institutional and Economic (the “institutional & economic profile”), External, Fiscal and Monetary (the “flexibility & performance profile”). The two profiles map to an indicative rating, then ±1 notch adjustments.',
  },
  {
    name: 'Fitch',
    body: 'An 18-variable Sovereign Rating Model plus a qualitative overlay (±3 notches max). Weights: structural features ~54% (governance 22%), public finances ~19%, external finances ~18%, macro performance ~10%.',
  },
  {
    name: 'IMF SRDSF',
    body: 'For market-access countries: near-term stress probability, a medium-term index (debt fan chart + gross financing needs) and long-term risks. Verdict: sustainable / sustainable but not with high probability / unsustainable.',
  },
  {
    name: 'IMF–WB LIC DSF',
    body: 'For PRGT-eligible countries: debt-carrying capacity (weak / medium / strong) sets thresholds on external debt and debt service. Ratings: low / moderate / high risk / in debt distress. A reviewed framework was approved in Sept 2026, operational ~mid-2027.',
  },
];

const RULES = [
  ['Debt dynamics in one line', 'Δd ≈ (r − g)/(1 + g) · d − primary balance. If r > g a country must run a primary surplus just to keep debt stable.'],
  ['Interest/revenue beats debt/GDP', 'Japan carries ~230% debt/GDP with low interest/revenue; Egypt or Pakistan with ~90% can spend half their revenue on interest.'],
  ['Liquidity kills before solvency', 'Most sovereign defaults are rollover crises. Watch gross financing needs > 15% of GDP (EM) and reserves < 100% of short-term external debt.'],
  ['Debt intolerance', 'EMs get into trouble at lower debt than AEs: the IMF uses 70% of GDP for EMs vs 85% for AEs; LIC benchmarks start at 35% (PV).'],
  ['FX debt is the multiplier', 'With 60% of debt in FX, a 30% devaluation adds ~18% to the debt stock overnight. Try it in the Debt dynamics lab.'],
  ['Spreads = market access', '< 200bp IG-like; 200–600bp issuance possible but costly; > 600bp high risk (IMF); > 1,000bp the market is pricing a restructuring.'],
  ['Reserve adequacy', '3 months of imports is the floor. Open-capital-account EMs need 100–150% of the IMF ARA metric; < 60% is a high-stress flag.'],
  ['Twin deficits', 'A fiscal deficit plus a current account deficit means the state is funded by foreigners — check non-resident holdings (> 45% = IMF high-risk flag).'],
  ['The investment-grade cliff', 'BBB−/Baa3 → BB+ (a “fallen angel”) triggers forced selling by IG-only mandates, so it costs far more than one notch normally would.'],
  ['IMF programme ≠ restructuring', 'The IMF can only lend if debt is sustainable — or made so through a restructuring with financing assurances.'],
  ['FDI-funded deficits are benign', 'Current account deficits funded by FDI are resilient; those funded by portfolio flows or short-term debt are fragile.'],
  ['Inflation helps, then hurts', 'High inflation erodes local-currency debt in real terms, but raises the cost of new borrowing and signals weak policy credibility.'],
];

const NOT_IN_DATA = [
  ['Gross financing needs (% GDP)', 'EM: < 10 comfortable · > 15 danger (AE > 20). Source: IMF DSAs, DMO borrowing plans.'],
  ['FX share of public debt', '< 20% comfortable · > 60% danger (S&P negative adjustment > 40%). Source: WB QPSD, DMO.'],
  ['Non-resident holdings of public debt', 'EM: < 15% · > 45% danger. Source: WB QPSD, central bank.'],
  ['Average maturity / short-term share', 'Danger if average maturity < 3 years (S&P). Source: DMO.'],
  ['Reserves / IMF ARA metric', '100–150% adequate · < 60% high stress. Source: IMF ARA dataset.'],
  ['Reserves / short-term external debt', '> 150% comfortable · < 100% danger (Greenspan–Guidotti). Source: WB IDS.'],
  ['Contingent liabilities', 'SOE debt, bank–sovereign nexus (banks > 20% of assets in government debt), PPPs. Source: IMF DSAs.'],
];

export function PlaybookPage() {
  const [pillar, setPillar] = useState<Pillar | 'All'>('All');
  const pillars: (Pillar | 'All')[] = ['All', 'Economy', 'Fiscal & Debt', 'External', 'Markets & Ratings', 'Institutions'];
  const ms = METRICS.filter((m) => pillar === 'All' || m.pillar === pillar);
  return (
    <div>
      <div className="page-title">
        <div>
          <div className="eyebrow">Playbook</div>
          <h1>How to read a sovereign</h1>
          <p>The frameworks rating agencies and the IMF use, every metric in this app with its warning thresholds, and the rules of thumb worth memorising.</p>
        </div>
      </div>

      <h2 style={{ fontSize: 22, margin: '8px 0 12px' }}>Rules of thumb</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {RULES.map(([t, b], i) => (
          <FlipCard key={t} n={i + 1} title={t} body={b} />
        ))}
      </div>

      <h2 style={{ fontSize: 22, margin: '28px 0 12px' }}>The frameworks</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {FRAMEWORKS.map((f) => (
          <div className="card" key={f.name}>
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>{f.name}</h3>
            <p className="ink2" style={{ margin: 0 }}>{f.body}</p>
          </div>
        ))}
      </div>

      <div className="row" style={{ margin: '28px 0 12px' }}>
        <h2 style={{ fontSize: 22 }}>Metric glossary</h2>
        <span className="spacer" />
        <div className="seg">
          {pillars.map((p) => (
            <button key={p} className={pillar === p ? 'active' : ''} onClick={() => setPillar(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data" style={{ whiteSpace: 'normal' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', cursor: 'default' }}>Metric</th>
                <th style={{ textAlign: 'left', cursor: 'default' }}>Why it matters</th>
                <th style={{ textAlign: 'left', cursor: 'default' }}>Rule of thumb</th>
                <th style={{ textAlign: 'left', cursor: 'default' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {ms.map((m) => (
                <tr key={m.key} style={{ cursor: 'default' }}>
                  <td style={{ whiteSpace: 'normal', verticalAlign: 'top', minWidth: 180 }}>
                    <b>{m.label}</b> {m.mustHave && <span style={{ color: 'var(--accent)' }} title="Core metric">★</span>}
                    <div className="muted" style={{ fontSize: 11 }}>{m.pillar}</div>
                  </td>
                  <td style={{ whiteSpace: 'normal', textAlign: 'left', verticalAlign: 'top', minWidth: 280 }}>{m.why}</td>
                  <td style={{ whiteSpace: 'normal', textAlign: 'left', verticalAlign: 'top', minWidth: 200 }} className="ink2">{m.rule ?? '—'}</td>
                  <td style={{ whiteSpace: 'normal', textAlign: 'left', verticalAlign: 'top' }} className="muted">{m.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 style={{ fontSize: 22, margin: '28px 0 6px' }}>Also check — not in free data</h2>
      <p className="ink2" style={{ marginTop: 0 }}>These matter as much as anything above but need IMF DSAs, debt management office data or paid terminals.</p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {NOT_IN_DATA.map(([t, b]) => (
          <div className="card" key={t} style={{ borderLeft: '3px solid var(--accent)' }}>
            <b>{t}</b>
            <p className="ink2" style={{ margin: '4px 0 0', fontSize: 13 }}>{b}</p>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 20 }}>
        Sources: IMF Staff Guidance Note for Public DSA in MACs (2013); IMF SRDSF Guidance Note (2022); IMF–WB LIC DSF; Fitch SRM (Feb 2025 weights); S&amp;P Sovereign Rating Methodology; Moody’s Sovereigns Methodology (2022). Full research notes in docs/METRICS_RESEARCH.md.
      </p>
    </div>
  );
}

function FlipCard({ n, title, body }: { n: number; title: string; body: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: 1000, height: 170, cursor: 'pointer' }} onClick={() => setFlipped((f) => !f)}>
      <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.5 }} style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}>
        <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--brand)', color: 'var(--brand-contrast)' }}>
          <span style={{ fontSize: 12, letterSpacing: '0.12em', opacity: 0.7 }}>RULE {String(n).padStart(2, '0')}</span>
          <h3 style={{ fontSize: 21 }}>{title}</h3>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Tap to reveal ↻</span>
        </div>
        <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 14 }}>{body}</p>
        </div>
      </motion.div>
    </div>
  );
}
