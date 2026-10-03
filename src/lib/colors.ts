import * as d3 from 'd3';

// Sequential blue ramp (light → dark), validated reference palette steps
export const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
export const SEQ_DARK = ['#0d366b', '#184f95', '#1c5cab', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'];
// Diverging: red (bad/negative) ← grey → blue (positive)
export const DIV_LIGHT = ['#b3261e', '#d03b3b', '#ec9a8f', '#f0efec', '#9ec5f4', '#3987e5', '#184f95'];
export const DIV_DARK = ['#e66767', '#b84444', '#6b3433', '#383835', '#1c4a80', '#3987e5', '#9ec5f4'];

export const isDark = () =>
  document.documentElement.dataset.theme === 'dark' ||
  (document.documentElement.dataset.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

/** Build a colour function for map/table heat given values and scale type. */
export function makeColor(values: number[], kind: 'seq' | 'div' | 'rating', better: 'higher' | 'lower' | 'none', dark: boolean) {
  const seq = dark ? SEQ_DARK : SEQ;
  const div = dark ? DIV_DARK : DIV_LIGHT;
  if (!values.length) return () => 'var(--surface-2)';
  if (kind === 'rating') {
    // notch 1 (AAA) dark → 22 (default) light; distress shades use reds
    const ramp = dark
      ? ['#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#1c5cab', '#b84444', '#e66767']
      : ['#0d366b', '#184f95', '#256abf', '#3987e5', '#86b6ef', '#ec9a8f', '#d03b3b'];
    const s = d3.scaleThreshold<number, string>().domain([2.5, 4.5, 7.5, 10.5, 13.5, 16.5]).range(ramp);
    return (v: number) => s(v);
  }
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => d3.quantileSorted(sorted, p)!;
  if (kind === 'div') {
    const lim = Math.max(Math.abs(q(0.05)), Math.abs(q(0.95))) || 1;
    const flip = better === 'lower';
    const s = d3.scaleQuantize<string>().domain([-lim, lim]).range(flip ? [...div].reverse() : div);
    return (v: number) => s(Math.max(-lim, Math.min(lim, v)));
  }
  // sequential: quantile-ish bins on a skew-robust domain
  const s = d3.scaleQuantile<string>().domain(sorted).range(seq);
  return (v: number) => s(v);
}
