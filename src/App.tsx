import { useEffect, useState } from 'react';
import { DataContext, loadDataset } from './lib/data';
import type { Dataset } from './lib/types';
import { useRoute } from './lib/router';
import { TooltipProvider } from './components/Tooltip';
import { CommandPalette } from './components/CommandPalette';
import { AtlasPage } from './pages/Atlas';
import { CountryPage } from './pages/Country';
import { ComparePage } from './pages/Compare';
import { ExplorerPage } from './pages/Explorer';
import { LeaguePage } from './pages/League';
import { PlayPage } from './pages/Play';
import { PlaybookPage } from './pages/Playbook';

const NAV = [
  ['atlas', 'Atlas'],
  ['compare', 'Head-to-head'],
  ['explorer', 'Explorer'],
  ['league', 'League table'],
  ['play', 'Play'],
  ['playbook', 'Playbook'],
] as const;

function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('theme') ?? '';
    } catch {
      return '';
    }
  });
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const dark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return { dark, toggle: () => setTheme(dark ? 'light' : 'dark') };
}

export default function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const route = useRoute();
  const { dark, toggle } = useTheme();

  useEffect(() => {
    loadDataset().then(setData, (e) => setError(String(e)));
  }, []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  if (error) return <div style={{ padding: 40 }}>Failed to load data: {error}</div>;
  if (!data)
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-mark" style={{ fontSize: 28 }}>Sovereign Atlas</div>
          <div className="eyebrow" style={{ marginTop: 8 }}>Loading 200+ sovereigns…</div>
        </div>
      </div>
    );

  let page;
  switch (route.page) {
    case 'country':
      page = <CountryPage iso3={route.param ?? 'FRA'} key={route.param} />;
      break;
    case 'compare':
      page = <ComparePage query={route.query} />;
      break;
    case 'explorer':
      page = <ExplorerPage />;
      break;
    case 'league':
      page = <LeaguePage />;
      break;
    case 'play':
      page = <PlayPage />;
      break;
    case 'playbook':
      page = <PlaybookPage />;
      break;
    default:
      page = <AtlasPage />;
  }

  return (
    <DataContext.Provider value={data}>
      <TooltipProvider>
        <div className="shell">
          <header className="topbar">
            <a className="brand" href="#/">
              <span className="brand-mark">Sovereign Atlas</span>
              <span className="brand-sub">Sovereign Advisory</span>
            </a>
            <nav className="nav">
              {NAV.map(([k, label]) => (
                <a key={k} href={`#/${k}`} className={route.page === k || (k === 'atlas' && route.page === 'atlas') ? 'active' : ''}>
                  {label}
                </a>
              ))}
            </nav>
            <div className="topbar-right">
              <button className="search-trigger" onClick={() => setPalette(true)} aria-label="Search countries">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <span className="lbl">Find a sovereign</span>
                <kbd>⌘K</kbd>
              </button>
              <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" title="Toggle light / dark">
                {dark ? '☀︎' : '☾'}
              </button>
            </div>
          </header>
          <main>{page}</main>
          <footer className="footer">
            <span>
              Data: IMF World Economic Outlook &amp; Fiscal Monitor · World Bank WDI / IDS / WGI · ratings, curves &amp; IMF programmes: curated snapshot (
              {(data.sources.ratings as { asOf?: string } | null)?.asOf ?? 'n.a.'}). Indicative only — verify before external use.
            </span>
            <span>Dataset built {data.generatedAt}</span>
          </footer>
        </div>
        <CommandPalette open={palette} onClose={() => setPalette(false)} />
      </TooltipProvider>
    </DataContext.Provider>
  );
}
