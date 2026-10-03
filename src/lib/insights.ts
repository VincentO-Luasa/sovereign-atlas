import type { Country, Series } from './types';
import { FOCUS_YEAR, METRIC, fmt, getObs, getValue, statusOf } from './metrics';
import { compositeNotch, notch } from './ratings';

export interface Insight {
  tone: 'good' | 'watch' | 'danger' | 'info';
  text: string;
}

export function insights(c: Country): Insight[] {
  const out: Insight[] = [];
  const v = (k: string, y = FOCUS_YEAR) => getValue(c, k, y);

  const fb = v('fiscalBalance'), ca = v('currentAccount');
  if (fb != null && ca != null && fb < -3 && ca < -3)
    out.push({ tone: 'danger', text: `Twin deficits: fiscal ${fmt('fiscalBalance', fb)} and current account ${fmt('currentAccount', ca)} of GDP — the state is reliant on foreign financing.` });

  const ir = v('interestRevenue');
  if (ir != null && ir > 15) out.push({ tone: ir > 25 ? 'danger' : 'watch', text: `Interest absorbs ${ir.toFixed(0)}% of government revenue (S&P’s weakest band starts at 15%).` });
  else if (ir != null && ir < 5) out.push({ tone: 'good', text: `Debt is cheap to carry: interest is only ${ir.toFixed(1)}% of revenue.` });

  const d0 = v('debt'), d1 = v('debt', FOCUS_YEAR + 5);
  if (d0 != null && d1 != null && Math.abs(d1 - d0) >= 5)
    out.push({
      tone: d1 > d0 ? 'watch' : 'good',
      text: `IMF projects debt ${d1 > d0 ? 'rising' : 'falling'} from ${d0.toFixed(0)}% to ${d1.toFixed(0)}% of GDP by ${FOCUS_YEAR + 5}.`,
    });

  const rg = v('rMinusG'), gap = v('stabilisingGap');
  if (rg != null && rg > 0 && gap != null && gap < 0)
    out.push({ tone: 'watch', text: `r > g by ${rg.toFixed(1)}pp and the primary balance is ${Math.abs(gap).toFixed(1)}pp short of the debt-stabilising level — snowball risk.` });
  else if (rg != null && rg < -3) out.push({ tone: 'good', text: `Favourable debt dynamics: nominal growth exceeds the effective interest rate by ${Math.abs(rg).toFixed(1)}pp.` });

  const res = getObs(c, 'reservesMonths');
  if (res && res.value < 3) out.push({ tone: 'danger', text: `Thin FX buffer: reserves cover only ${res.value.toFixed(1)} months of imports (${res.year}).` });
  else if (res && res.value > 8) out.push({ tone: 'good', text: `Ample FX reserves: ${res.value.toFixed(1)} months of import cover.` });

  const dse = getObs(c, 'debtServiceExports');
  if (dse && dse.value > 21) out.push({ tone: 'danger', text: `External debt service eats ${dse.value.toFixed(0)}% of export receipts (${dse.year}) — above the LIC DSF ‘strong capacity’ threshold of 21%.` });

  const infl = v('inflation');
  const pr = c.markets?.policyRate;
  if (infl != null && infl > 10) out.push({ tone: 'danger', text: `Double-digit inflation (${infl.toFixed(1)}%).` });
  if (pr != null && infl != null) {
    const real = pr - infl;
    if (Math.abs(real) > 3) out.push({ tone: 'info', text: `Real policy rate of ${real > 0 ? '+' : ''}${real.toFixed(1)}pp (${pr.toFixed(2)}% policy vs ${infl.toFixed(1)}% inflation) — ${real > 0 ? 'tight stance' : 'deeply negative real rates'}.` });
  }

  const slope = getValue(c, 'curveSlope');
  if (slope != null && slope < -25) out.push({ tone: 'watch', text: `Inverted local curve: 10Y trades ${Math.abs(slope).toFixed(0)}bp below 2Y.` });

  const cds = c.markets?.cds5y;
  if (cds != null && cds > 1000) out.push({ tone: 'danger', text: `CDS at ${Math.round(cds)}bp — markets are pricing a restructuring.` });
  else if (cds != null && cds > 600) out.push({ tone: 'danger', text: `CDS at ${Math.round(cds)}bp — above the IMF’s 600bp high-risk benchmark.` });

  const n = compositeNotch(c);
  if (n != null && n >= 9.5 && n <= 11.5) out.push({ tone: 'watch', text: 'Sits on the investment-grade cliff (BBB−/BB+): a one-notch move changes the investor base.' });
  const rs = c.ratings;
  if (rs) {
    const ns = [rs.sp?.rating, rs.moodys?.rating, rs.fitch?.rating].map(notch).filter((x): x is number => x != null);
    if (ns.length >= 2 && Math.max(...ns) - Math.min(...ns) >= 2) out.push({ tone: 'info', text: `Split rating: ${Math.max(...ns) - Math.min(...ns)} notches between the most and least favourable agency.` });
    const outlooks = [rs.sp?.outlook, rs.moodys?.outlook, rs.fitch?.outlook].filter(Boolean).join(' ').toLowerCase();
    const neg = (outlooks.match(/neg/g) ?? []).length, pos = (outlooks.match(/pos/g) ?? []).length;
    if (neg >= 2) out.push({ tone: 'watch', text: `${neg} agencies on Negative outlook — downgrade momentum.` });
    if (pos >= 2) out.push({ tone: 'good', text: `${pos} agencies on Positive outlook — upgrade momentum.` });
  }

  const comm = getObs(c, 'commodityShare');
  if (comm && comm.value > 60) out.push({ tone: 'watch', text: `Commodity-dependent: ${comm.value.toFixed(0)}% of merchandise exports are commodities.` });

  const gov = getObs(c, 'governance');
  if (gov && statusOf(c, 'governance', gov.value) === 'good') out.push({ tone: 'good', text: `Strong institutions (WGI score ${gov.value.toFixed(0)}/100) — the largest single weight in rating models.` });

  const g = v('growth');
  if (g != null && g < 0) out.push({ tone: 'danger', text: `Economy contracting (${g.toFixed(1)}% real growth in ${FOCUS_YEAR}).` });

  const order = { danger: 0, watch: 1, info: 2, good: 3 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

/** Per-year median across a peer group. */
export function medianSeries(peers: Country[], key: string, from = 2008, to = 2031): Series {
  const s: Series = {};
  for (let y = from; y <= to; y++) {
    const vals = peers.map((c) => c.series[key]?.[y]).filter((x): x is number => x != null).sort((a, b) => a - b);
    if (vals.length >= 3) {
      const m = Math.floor(vals.length / 2);
      s[y] = vals.length % 2 ? vals[m] : (vals[m - 1] + vals[m]) / 2;
    }
  }
  return s;
}

export const metricLabel = (k: string) => METRIC[k]?.label ?? k;
