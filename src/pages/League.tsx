import { useMemo, useState } from 'react';
import { flag, useData, isCovered } from '../lib/data';
import { FOCUS_YEAR, METRIC, fmt, getValue, statusOf, STATUS_COLOR } from '../lib/metrics';
import { compositeNotch } from '../lib/ratings';
import { go } from '../lib/router';
import { InfoTip } from '../components/ui';

const COLS = ['rating', 'gdp', 'growth', 'gdpPc', 'inflation', 'fiscalBalance', 'debt', 'interestRevenue', 'currentAccount', 'exportsGdp', 'reservesMonths', 'yield10y', 'cds5y', 'governance'];
const REGIONS = ['All', 'Europe & Central Asia', 'Latin America & Caribbean', 'Middle East & North Africa', 'Sub-Saharan Africa', 'East Asia & Pacific', 'South Asia', 'North America'];

export function LeaguePage() {
  const { list } = useData();
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'gdp', dir: -1 });
  const [region, setRegion] = useState('All');
  const [q, setQ] = useState('');
  const [covered, setCovered] = useState(true);
  const [heat, setHeat] = useState(true);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = list
      .filter((c) => (!covered || isCovered(c)) && (region === 'All' || c.region === region) && (!s || c.short.toLowerCase().includes(s) || c.iso3.toLowerCase() === s))
      .map((c) => ({ c, vals: Object.fromEntries(COLS.map((k) => [k, k === 'rating' ? compositeNotch(c) : getValue(c, k)])) as Record<string, number | null> }));
    r.sort((a, b) => {
      if (sort.k === 'name') return sort.dir * a.c.short.localeCompare(b.c.short);
      const va = a.vals[sort.k], vb = b.vals[sort.k];
      if (va == null) return 1;
      if (vb == null) return -1;
      return sort.dir * (va - vb);
    });
    return r;
  }, [list, sort, region, q, covered]);

  const exportCsv = () => {
    const header = ['Country', 'ISO3', 'Region', 'S&P', "Moody's", 'Fitch', ...COLS.map((k) => METRIC[k].label)];
    const lines = rows.map(({ c, vals }) =>
      [c.short, c.iso3, c.region, c.ratings?.sp?.rating ?? '', c.ratings?.moodys?.rating ?? '', c.ratings?.fitch?.rating ?? '', ...COLS.map((k) => (vals[k] == null ? '' : vals[k]!.toFixed(2)))]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sovereign-league-${FOCUS_YEAR}.csv`;
    a.click();
  };

  const th = (k: string, label: string) => (
    <th onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : k === 'name' ? 1 : -1 }))} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      {label} {sort.k === k ? (sort.dir === 1 ? '▲' : '▼') : ''}
    </th>
  );

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="eyebrow">League table</div>
          <h1>Every sovereign, one screen</h1>
          <p>Sort by any column. Dots show traffic-light status against IMF / agency thresholds. {FOCUS_YEAR} data.</p>
        </div>
        <div className="row">
          <input className="select" placeholder="Filter by name…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={covered} onChange={(e) => setCovered(e.target.checked)} /> Rated universe
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={heat} onChange={(e) => setHeat(e.target.checked)} /> Status dots
          </label>
          <button className="btn" onClick={exportCsv}>⬇ CSV</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap" style={{ maxHeight: '72vh' }}>
          <table className="data">
            <thead>
              <tr>
                {th('name', 'Sovereign')}
                {COLS.map((k) => (
                  <th key={k} onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : METRIC[k].better === 'lower' ? 1 : -1 }))}>
                    <span className="row" style={{ gap: 4, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      {METRIC[k].short} {sort.k === k ? (sort.dir === 1 ? '▲' : '▼') : ''}
                      <span onClick={(e) => e.stopPropagation()}><InfoTip metricKey={k} /></span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, vals }) => (
                <tr key={c.iso3} onClick={() => go(`country/${c.iso3}`)}>
                  <td>
                    <span className="flag">{flag(c.iso2)}</span> <b>{c.short}</b>
                  </td>
                  {COLS.map((k) => {
                    const st = heat ? statusOf(c, k, vals[k]) : null;
                    return (
                      <td key={k}>
                        {fmt(k, vals[k])}
                        {st && <i style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[st], marginLeft: 6, verticalAlign: 'middle' }} title={st} />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>{rows.length} sovereigns. Rating = average of S&amp;P, Moody’s and Fitch, expressed on the S&amp;P scale.</p>
    </div>
  );
}
