import type { Country } from './types';

// Notch scale: 1 = AAA/Aaa … 21 = C, 22 = SD/D (default)
export const SP_SCALE = [
  'AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-',
  'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-', 'CC', 'C', 'D',
];
export const MOODYS_SCALE = [
  'Aaa', 'Aa1', 'Aa2', 'Aa3', 'A1', 'A2', 'A3', 'Baa1', 'Baa2', 'Baa3',
  'Ba1', 'Ba2', 'Ba3', 'B1', 'B2', 'B3', 'Caa1', 'Caa2', 'Caa3', 'Ca', 'C', 'D',
];

const DEFAULT_LABELS = new Set(['SD', 'RD', 'D', 'DDD', 'DD']);

export function notch(rating: string | undefined | null): number | null {
  if (!rating) return null;
  const r = rating.replace(/\(.*\)|\*.*$|u$/g, '').trim();
  if (DEFAULT_LABELS.has(r.toUpperCase())) return 22;
  let i = SP_SCALE.indexOf(r.toUpperCase().replace(/^([A-Z]+)([+-]?)$/, (_, a, b) => a + b));
  if (i >= 0) return i + 1;
  i = MOODYS_SCALE.findIndex((m) => m.toLowerCase() === r.toLowerCase());
  if (i >= 0) return i + 1;
  return null;
}

export const notchLabel = (n: number) => SP_SCALE[Math.min(21, Math.max(0, Math.round(n) - 1))];

/** Average notch across the three agencies (lower = better). */
export function compositeNotch(c: Country): number | null {
  const r = c.ratings;
  if (!r) return null;
  const ns = [r.sp?.rating, r.moodys?.rating, r.fitch?.rating].map(notch).filter((x): x is number => x != null);
  if (!ns.length) return null;
  return ns.reduce((a, b) => a + b, 0) / ns.length;
}

export function ratingBand(n: number | null): { label: string; tone: 'ig-high' | 'ig' | 'hy' | 'distress' | 'default' } | null {
  if (n == null) return null;
  if (n <= 4.5) return { label: 'High grade', tone: 'ig-high' };
  if (n <= 10.5) return { label: 'Investment grade', tone: 'ig' };
  if (n <= 16.5) return { label: 'High yield', tone: 'hy' };
  if (n < 21.5) return { label: 'Distressed', tone: 'distress' };
  return { label: 'Default', tone: 'default' };
}

export function outlookArrow(o?: string) {
  if (!o) return '';
  const s = o.toLowerCase();
  if (s.includes('pos')) return '↗';
  if (s.includes('neg')) return '↘';
  if (s.includes('dev')) return '↔';
  if (s.includes('stable')) return '→';
  return '';
}
