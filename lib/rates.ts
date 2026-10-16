import { AllRatesToday } from "@allratestoday/sdk";

/**
 * Server-side data layer for exchange rates.
 *
 * Two modes:
 *  - "live"  — ALLRATES_API_KEY is set: real-time mid-market rates for 160+
 *              currencies via @allratestoday/sdk. The key never leaves the server.
 *  - "ecb"   — no key: the open ECB endpoint (official European Central Bank
 *              daily reference rates, ~30 currencies, keyless, attribution required).
 *              The full EUR-based table is fetched once and any pair is computed
 *              from it (USD→GBP = EUR→GBP / EUR→USD, marked as a cross).
 *
 * Caching best practice: AllRatesToday recommends caching rates on your server
 * instead of calling the API on every page view — mid-market rates move
 * second-to-second but a 5-minute snapshot is accurate enough for display,
 * and it keeps you comfortably inside your plan's quota.
 * See https://allratestoday.com/blog/how-to-cache-exchange-rates-avoid-rate-limits/
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await fetcher();
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export type RateMode = "live" | "ecb";

export interface RateResult {
  from: string;
  to: string;
  rate: number;
  /** The date the rate was published (ECB rate_date) or fetched (live). */
  date: string;
  mode: RateMode;
  /** ECB mode only: true when the pair is computed from published EUR rates. */
  derived?: boolean;
  /** ECB mode only: "direct" (EUR→X as published), "inverse" (X→EUR) or "cross" (via EUR). */
  method?: "direct" | "inverse" | "cross";
  attribution: { text: string; url: string };
}

export interface Currency {
  code: string;
  name: string;
}

const apiKey = process.env.ALLRATES_API_KEY;

export function getMode(): RateMode {
  return apiKey ? "live" : "ecb";
}

const LIVE_ATTRIBUTION = {
  text: "Real-time rates by AllRatesToday",
  url: "https://allratestoday.com",
};

const ECB_ATTRIBUTION = {
  text: "ECB reference rates via AllRatesToday",
  url: "https://allratestoday.com",
};

const OPEN_ECB_URL = "https://allratestoday.com/api/open/central-bank/ecb";

interface OpenEcbTable {
  bank?: string;
  rate_date?: string;
  rates?: { base: string; quote: string; value: number }[];
}

interface EcbTable {
  date: string;
  /** Units of each currency per 1 EUR, EUR itself included as 1. */
  perEur: Map<string, number>;
}

/** The whole ECB table, cached, so every pair costs zero extra upstream calls. */
async function getEcbTable(): Promise<EcbTable> {
  return cached("ecb:table", async () => {
    const res = await fetch(OPEN_ECB_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`ECB endpoint responded ${res.status}`);
    const data = (await res.json()) as OpenEcbTable;
    const perEur = new Map<string, number>([["EUR", 1]]);
    for (const r of data.rates ?? []) {
      if (r.base === "EUR" && typeof r.value === "number" && r.value > 0) {
        perEur.set(r.quote, r.value);
      }
    }
    if (perEur.size < 2) throw new Error("ECB endpoint returned an empty table");
    return { date: data.rate_date ?? new Date().toISOString().slice(0, 10), perEur };
  });
}

/** Normalise "2026-10-16T11:34:01+0000" (or a plain date) to YYYY-MM-DD. */
function toIsoDate(value: string | undefined): string {
  const m = value?.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : new Date().toISOString().slice(0, 10);
}

const CODE_RE = /^[A-Z]{3}$/;

export function isValidCode(code: string): boolean {
  return CODE_RE.test(code);
}

export async function getRate(from: string, to: string): Promise<RateResult> {
  return cached(`rate:${getMode()}:${from}:${to}`, async () => {
    if (apiKey) {
      const fx = new AllRatesToday({ apiKey });
      const res = await fx.latest({ base: from, symbols: [to] });
      const rate = res.rates?.[to];
      if (typeof rate !== "number") {
        throw new Error(`No rate returned for ${from}/${to}`);
      }
      return {
        from,
        to,
        rate,
        date: toIsoDate(res.date),
        mode: "live" as const,
        attribution: LIVE_ATTRIBUTION,
      };
    }

    const table = await getEcbTable();
    const fromPerEur = table.perEur.get(from);
    const toPerEur = table.perEur.get(to);
    if (fromPerEur === undefined || toPerEur === undefined) {
      throw new Error(`No ECB rate available for ${from}/${to}`);
    }
    const method =
      from === "EUR" ? "direct" : to === "EUR" ? "inverse" : "cross";
    return {
      from,
      to,
      rate: toPerEur / fromPerEur,
      date: table.date,
      mode: "ecb" as const,
      derived: method !== "direct",
      method,
      attribution: ECB_ATTRIBUTION,
    };
  });
}

/**
 * Display names for currencies the ECB publishes (or has published). Keyless
 * mode lists only the codes present in the live table, so a currency the ECB
 * drops disappears automatically; a new code falls back to Intl names.
 */
const ECB_CURRENCIES: Currency[] = [
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "US Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "GBP", name: "British Pound" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "ISK", name: "Icelandic Krona" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "RON", name: "Romanian Leu" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "INR", name: "Indian Rupee" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "KRW", name: "South Korean Won" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "THB", name: "Thai Baht" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "ZAR", name: "South African Rand" },
];

const ECB_NAMES = new Map(ECB_CURRENCIES.map((c) => [c.code, c.name]));

function currencyName(code: string): string {
  const known = ECB_NAMES.get(code);
  if (known) return known;
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Keyless list: EUR plus every quote on the live ECB table. */
async function getEcbCurrencies(): Promise<Currency[]> {
  const table = await getEcbTable();
  return [...table.perEur.keys()]
    .filter(isValidCode)
    .map((code) => ({ code, name: currencyName(code) }))
    .sort((a, b) => (a.code === "EUR" ? -1 : b.code === "EUR" ? 1 : a.code.localeCompare(b.code)));
}

export async function getCurrencies(): Promise<Currency[]> {
  if (!apiKey) return getEcbCurrencies();

  return cached("currencies:live", async () => {
    const fx = new AllRatesToday({ apiKey });
    const res = await fx.symbols();
    const symbols = res.symbols ?? {};
    const list = Object.entries(symbols)
      .map(([code, name]) => ({ code, name: name || code }))
      .filter((c) => isValidCode(c.code))
      .sort((a, b) => a.code.localeCompare(b.code));
    return list.length > 0 ? list : ECB_CURRENCIES;
  });
}
