import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { flag, useData, isCovered } from '../lib/data';
import { METRIC, fmt, getValue } from '../lib/metrics';
import { compositeNotch, notchLabel } from '../lib/ratings';
import type { Country } from '../lib/types';

type Game = 'hol' | 'mystery' | 'agency';

function useBest(key: string) {
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem(key) ?? 0);
    } catch {
      return 0;
    }
  });
  const update = (v: number) => {
    if (v > best) {
      setBest(v);
      try {
        localStorage.setItem(key, String(v));
      } catch {
        /* ignore */
      }
    }
  };
  return [best, update] as const;
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

export function PlayPage() {
  const [game, setGame] = useState<Game>('hol');
  return (
    <div>
      <div className="page-title">
        <div>
          <div className="eyebrow">Play</div>
          <h1>Learn the map by playing it</h1>
          <p>Three quick games to build intuition on sovereign credit — five minutes a day and the numbers stick.</p>
        </div>
        <div className="seg">
          <button className={game === 'hol' ? 'active' : ''} onClick={() => setGame('hol')}>⬆⬇ Higher or lower</button>
          <button className={game === 'mystery' ? 'active' : ''} onClick={() => setGame('mystery')}>🕵️ Mystery sovereign</button>
          <button className={game === 'agency' ? 'active' : ''} onClick={() => setGame('agency')}>⚖️ Be the agency</button>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={game} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          {game === 'hol' ? <HigherLower /> : game === 'mystery' ? <Mystery /> : <Agency />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
const HOL_METRICS = ['debt', 'fiscalBalance', 'currentAccount', 'inflation', 'gdpPc', 'growth', 'exportsGdp', 'interestRevenue', 'reservesMonths', 'cds5y', 'yield10y', 'gdp'];

function HigherLower() {
  const { list } = useData();
  const pool = useMemo(() => list.filter(isCovered), [list]);
  const next = useCallback(() => {
    for (let t = 0; t < 50; t++) {
      const k = pick(HOL_METRICS);
      const a = pick(pool), b = pick(pool);
      const va = getValue(a, k), vb = getValue(b, k);
      if (a !== b && va != null && vb != null && Math.abs(va - vb) > Math.abs(va + vb) * 0.03) return { k, a, b, va, vb };
    }
    return null;
  }, [pool]);
  const [round, setRound] = useState(next);
  const [answer, setAnswer] = useState<'a' | 'b' | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useBest('best-hol');
  if (!round) return null;
  const m = METRIC[round.k];
  const correct = round.va > round.vb ? 'a' : 'b';
  const choose = (x: 'a' | 'b') => {
    if (answer) return;
    setAnswer(x);
    if (x === correct) {
      setStreak((s) => s + 1);
      setBest(streak + 1);
    } else setStreak(0);
  };
  const go = () => {
    setAnswer(null);
    setRound(next());
  };
  return (
    <div className="card" style={{ padding: 28 }}>
      <Scoreboard items={[['Streak', streak], ['Best', best]]} />
      <h2 style={{ textAlign: 'center', fontSize: 24, margin: '6px 0 4px' }}>Which has the higher {m.label.toLowerCase()}?</h2>
      <p className="muted" style={{ textAlign: 'center', margin: 0 }}>{m.what}</p>
      <div className="grid" style={{ gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginTop: 24, gap: 18 }} id="hol-grid">
        {(['a', 'b'] as const).map((side, i) => {
          const c = side === 'a' ? round.a : round.b;
          const v = side === 'a' ? round.va : round.vb;
          const state = !answer ? 'idle' : side === correct ? 'win' : 'lose';
          return (
            <motion.button
              key={side + c.iso3}
              onClick={() => choose(side)}
              whileHover={!answer ? { y: -4 } : undefined}
              whileTap={!answer ? { scale: 0.97 } : undefined}
              animate={state === 'lose' && answer === side ? { x: [0, -8, 8, -5, 5, 0] } : {}}
              style={{
                order: i * 2,
                border: `2px solid ${state === 'win' ? 'var(--good)' : state === 'lose' && answer === side ? 'var(--critical)' : 'var(--hairline)'}`,
                background: 'var(--surface)',
                borderRadius: 18,
                padding: '28px 18px',
                cursor: answer ? 'default' : 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 64, lineHeight: 1 }}>{flag(c.iso2)}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginTop: 8 }}>{c.short}</div>
              <div style={{ height: 44, marginTop: 8 }}>
                {answer && (
                  <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} style={{ fontSize: 30, fontWeight: 700 }}>
                    {fmt(round.k, v)}
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
        <div style={{ order: 1, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--muted)' }}>vs</div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 20, minHeight: 80 }}>
        {answer && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: answer === correct ? 'var(--good-text)' : 'var(--critical)' }}>
              {answer === correct ? '✓ Correct!' : '✕ Not quite.'}
            </div>
            <p className="ink2" style={{ maxWidth: 620, margin: '6px auto 12px' }}>💡 {m.why}</p>
            <button className="btn primary" onClick={go} autoFocus>
              Next round →
            </button>
          </motion.div>
        )}
      </div>
      <style>{`@media (max-width: 700px){ #hol-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
const CLUES: { label: string; get: (c: Country) => string | null }[] = [
  { label: 'Composite rating', get: (c) => (compositeNotch(c) != null ? notchLabel(compositeNotch(c)!) : null) },
  { label: 'Government debt', get: (c) => fmt('debt', getValue(c, 'debt')) + ' of GDP' },
  { label: 'Current account', get: (c) => fmt('currentAccount', getValue(c, 'currentAccount')) + ' of GDP' },
  { label: 'Inflation', get: (c) => fmt('inflation', getValue(c, 'inflation')) },
  { label: 'GDP per capita', get: (c) => fmt('gdpPc', getValue(c, 'gdpPc')) },
  { label: 'Region', get: (c) => c.region },
  { label: 'Currency', get: (c) => c.markets?.currency ?? null },
];

function Mystery() {
  const { list } = useData();
  const pool = useMemo(() => list.filter((c) => isCovered(c) && getValue(c, 'debt') != null), [list]);
  const newRound = useCallback(() => {
    const answer = pick(pool);
    const others = shuffle(pool.filter((c) => c !== answer)).slice(0, 3);
    return { answer, options: shuffle([answer, ...others]) };
  }, [pool]);
  const [round, setRound] = useState(newRound);
  const [shown, setShown] = useState(2);
  const [guess, setGuess] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useBest('best-mystery');
  const points = Math.max(1, CLUES.length + 1 - shown);
  const choose = (iso: string) => {
    if (guess) return;
    setGuess(iso);
    if (iso === round.answer.iso3) {
      setScore((s) => s + points);
      setBest(score + points);
    }
  };
  const next = () => {
    setRound(newRound());
    setShown(2);
    setGuess(null);
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Enter' && guess && next();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  return (
    <div className="card" style={{ padding: 28 }}>
      <Scoreboard items={[['Score', score], ['Best', best], ['This round', `${points} pts`]]} />
      <h2 style={{ textAlign: 'center', fontSize: 24, margin: '6px 0 16px' }}>Who am I?</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {CLUES.map((cl, i) => (
          <motion.div
            key={cl.label}
            animate={{ rotateY: i < shown || guess ? 0 : 180 }}
            transition={{ duration: 0.5 }}
            style={{ borderRadius: 14, padding: '14px 12px', textAlign: 'center', background: i < shown || guess ? 'var(--surface-2)' : 'var(--brand)', color: i < shown || guess ? 'var(--ink)' : 'var(--brand-contrast)', minHeight: 78 }}
          >
            {i < shown || guess ? (
              <>
                <div className="muted" style={{ fontSize: 11 }}>{cl.label}</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{cl.get(round.answer) ?? '—'}</div>
              </>
            ) : (
              <div style={{ fontSize: 26, transform: 'rotateY(180deg)' }}>?</div>
            )}
          </motion.div>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
        <button className="btn" disabled={shown >= CLUES.length || !!guess} onClick={() => setShown((s) => s + 1)}>
          Reveal another clue (−1 pt)
        </button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 18 }}>
        {round.options.map((c) => {
          const isAns = c.iso3 === round.answer.iso3;
          const border = guess ? (isAns ? 'var(--good)' : guess === c.iso3 ? 'var(--critical)' : 'var(--hairline)') : 'var(--hairline)';
          return (
            <motion.button key={c.iso3} whileHover={!guess ? { y: -3 } : undefined} onClick={() => choose(c.iso3)} className="btn" style={{ justifyContent: 'center', padding: '14px', fontSize: 16, border: `2px solid ${border}` }}>
              {guess && <span style={{ fontSize: 22 }}>{flag(c.iso2)}</span>} {c.short}
            </motion.button>
          );
        })}
      </div>
      {guess && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginTop: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: guess === round.answer.iso3 ? 'var(--good-text)' : 'var(--critical)' }}>
            {guess === round.answer.iso3 ? `✓ +${points} points` : `✕ It was ${round.answer.short}`}
          </div>
          {round.answer.programme?.headline && <p className="ink2" style={{ maxWidth: 640, margin: '6px auto 10px' }}>{round.answer.programme.headline}</p>}
          <div className="row" style={{ justifyContent: 'center' }}>
            <a className="btn" href={`#/country/${round.answer.iso3}`} style={{ textDecoration: 'none' }}>Open dossier</a>
            <button className="btn primary" onClick={next}>Next mystery →</button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
const BUCKETS = [
  { label: 'AAA / AA', min: 0, max: 4.5 },
  { label: 'A', min: 4.5, max: 7.5 },
  { label: 'BBB', min: 7.5, max: 10.5 },
  { label: 'BB', min: 10.5, max: 13.5 },
  { label: 'B', min: 13.5, max: 16.5 },
  { label: 'CCC & below', min: 16.5, max: 23 },
];
const AGENCY_KEYS = ['gdpPc', 'growth', 'debt', 'interestRevenue', 'fiscalBalance', 'currentAccount', 'reservesMonths', 'inflation', 'governance'];

function Agency() {
  const { list } = useData();
  const pool = useMemo(() => list.filter((c) => compositeNotch(c) != null && getValue(c, 'debt') != null), [list]);
  const [c, setC] = useState(() => pick(pool));
  const [hide, setHide] = useState(true);
  const [guess, setGuess] = useState<number | null>(null);
  const [stats, setStats] = useState({ n: 0, exact: 0, off: 0 });
  const n = compositeNotch(c)!;
  const truth = BUCKETS.findIndex((b) => n >= b.min && n < b.max);
  const choose = (i: number) => {
    if (guess != null) return;
    setGuess(i);
    setStats((s) => ({ n: s.n + 1, exact: s.exact + (i === truth ? 1 : 0), off: s.off + Math.abs(i - truth) }));
  };
  const next = () => {
    setC(pick(pool));
    setGuess(null);
  };
  return (
    <div className="card" style={{ padding: 28 }}>
      <Scoreboard items={[['Rated', stats.n], ['Exact', stats.exact], ['Avg miss', stats.n ? `${(stats.off / stats.n).toFixed(1)} buckets` : '—']]} />
      <div className="row" style={{ justifyContent: 'center', gap: 10, margin: '6px 0 4px' }}>
        <h2 style={{ fontSize: 24 }}>You chair the rating committee for {hide && guess == null ? 'Sovereign X' : <>{flag(c.iso2)} {c.short}</>}</h2>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <label className="row muted" style={{ gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> Blind mode (hide the name)
        </label>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 18 }}>
        {AGENCY_KEYS.map((k) => (
          <div key={k} style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '10px 12px' }}>
            <div className="muted" style={{ fontSize: 11 }}>{METRIC[k].label}</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{fmt(k, getValue(c, k))}</div>
          </div>
        ))}
      </div>
      <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>Where would you rate it?</p>
      <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
        {BUCKETS.map((b, i) => {
          const isT = guess != null && i === truth;
          const isG = guess === i && i !== truth;
          return (
            <motion.button key={b.label} whileHover={guess == null ? { y: -3 } : undefined} className="btn" onClick={() => choose(i)} style={{ minWidth: 92, justifyContent: 'center', border: `2px solid ${isT ? 'var(--good)' : isG ? 'var(--critical)' : 'var(--hairline)'}` }}>
              {b.label}
            </motion.button>
          );
        })}
      </div>
      {guess != null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginTop: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: guess === truth ? 'var(--good-text)' : 'var(--critical)' }}>
            {guess === truth ? '✓ Spot on.' : `${Math.abs(guess - truth)} bucket${Math.abs(guess - truth) > 1 ? 's' : ''} ${guess < truth ? 'too generous' : 'too harsh'}.`}{' '}
            {c.short} is rated {c.ratings?.sp?.rating ?? '—'} / {c.ratings?.moodys?.rating ?? '—'} / {c.ratings?.fitch?.rating ?? '—'} (S&amp;P / Moody’s / Fitch).
          </div>
          <p className="ink2" style={{ maxWidth: 640, margin: '6px auto 10px' }}>
            💡 In Fitch’s model, structural features (governance, income, size) carry ~54% of the weight versus ~19% for public finances — which is why rich, well-governed countries keep high ratings despite heavy debt.
          </p>
          <button className="btn primary" onClick={next}>Next committee →</button>
        </motion.div>
      )}
    </div>
  );
}

function Scoreboard({ items }: { items: [string, string | number][] }) {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
      {items.map(([l, v]) => (
        <motion.div key={l + v} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="badge" style={{ fontSize: 13 }}>
          {l}: <b style={{ color: 'var(--ink)' }}>{v}</b>
        </motion.div>
      ))}
    </div>
  );
}
