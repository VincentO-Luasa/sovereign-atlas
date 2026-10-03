export type Series = Record<number, number>;

export interface AgencyRating {
  rating: string;
  outlook?: string;
}

export interface Ratings {
  sp: AgencyRating | null;
  moodys: AgencyRating | null;
  fitch: AgencyRating | null;
  lastAction?: string;
  note?: string;
  unverified?: boolean;
}

export interface Markets {
  currency?: string;
  policyRate?: number | null;
  cds5y?: number | null;
  localCurve?: Record<string, number | null> | null;
  usdEurobond?: {
    yield?: number | null;
    spread?: number | null;
    curve?: Record<string, number | null> | null;
    spreadBp?: number | null;
    priceCents?: number | null;
    [k: string]: unknown;
  } | null;
  unverified?: boolean;
  note?: string;
  notes?: string[];
  policyRateNote?: string;
}

export interface Programme {
  imf: {
    type: string;
    approved?: string;
    size?: string;
    ends?: string;
    note?: string;
  } | null;
  defaults?: { year: string; desc: string }[];
  headline?: string;
  unverified?: boolean;
}

export interface Country {
  iso3: string;
  iso2: string;
  name: string;
  region: string;
  income: string;
  capital: string | null;
  series: Record<string, Series>;
  ratings?: Ratings;
  markets?: Markets;
  programme?: Programme;
  /** IMF classification used to pick thresholds */
  group: 'AE' | 'EM' | 'LIC';
  /** short display name */
  short: string;
}

export interface Dataset {
  generatedAt: string;
  sources: Record<string, unknown>;
  countries: Record<string, Country>;
  list: Country[];
}

export type Status = 'good' | 'watch' | 'danger';
