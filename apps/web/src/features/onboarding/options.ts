// Markets the product targets first; labels come from Intl, so they are localised for free.
export const COUNTRIES = ["MR", "SN", "ML", "MA", "DZ", "TN", "NE", "TD", "FR", "BE", "US"] as const;
export const CURRENCIES = ["MRU", "XOF", "MAD", "DZD", "TND", "EUR", "USD"] as const;

export const DEFAULT_CURRENCY: Record<string, string> = {
  MR: "MRU",
  SN: "XOF",
  ML: "XOF",
  NE: "XOF",
  TD: "XAF",
  MA: "MAD",
  DZ: "DZD",
  TN: "TND",
  FR: "EUR",
  BE: "EUR",
  US: "USD",
};

export function regionName(locale: string, code: string): string {
  return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
}

export function currencyName(locale: string, code: string): string {
  return new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
}

export function monthName(locale: string, month: number): string {
  return new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2026, month - 1, 1));
}
