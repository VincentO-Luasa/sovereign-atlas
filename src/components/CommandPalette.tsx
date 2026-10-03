import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { flag, useData, isCovered } from '../lib/data';
import { go } from '../lib/router';
import { compositeNotch, notchLabel } from '../lib/ratings';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { list } = useData();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const scored = list
      .map((c) => {
        const hay = [c.short, c.name, c.iso3, c.iso2, c.capital ?? '', c.markets?.currency ?? ''].map((x) => x.toLowerCase());
        let score = -1;
        if (!s) score = isCovered(c) ? 1 : 0;
        else if (hay[2] === s || hay[3] === s) score = 10;
        else if (hay[0].startsWith(s)) score = 8;
        else if (hay.some((h) => h.startsWith(s))) score = 6;
        else if (hay.some((h) => h.includes(s))) score = 3;
        return { c, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score || a.c.short.localeCompare(b.c.short));
    return scored.slice(0, 40).map((x) => x.c);
  }, [q, list]);

  const pick = (iso3: string) => {
    onClose();
    go(`country/${iso3}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="palette-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="palette"
            initial={{ y: -12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -12, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={input}
              autoFocus
              value={q}
              placeholder="Jump to a sovereign — name, ISO code, capital, currency…"
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') setSel((s) => Math.min(results.length - 1, s + 1));
                else if (e.key === 'ArrowUp') setSel((s) => Math.max(0, s - 1));
                else if (e.key === 'Enter' && results[sel]) pick(results[sel].iso3);
                else if (e.key === 'Escape') onClose();
              }}
            />
            <ul>
              {results.map((c, i) => {
                const n = compositeNotch(c);
                return (
                  <li key={c.iso3} className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => pick(c.iso3)}>
                    <span className="flag">{flag(c.iso2)}</span>
                    <span style={{ fontWeight: 600 }}>{c.short}</span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {c.region}
                    </span>
                    <span className="spacer" />
                    {n != null && <span className="badge">{notchLabel(n)}</span>}
                    <span className="muted tnum" style={{ fontSize: 12 }}>
                      {c.iso3}
                    </span>
                  </li>
                );
              })}
              {!results.length && <li className="muted">No match</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
