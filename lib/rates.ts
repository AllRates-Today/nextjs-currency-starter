import { AllRatesToday } from "@allratestoday/sdk";

/**
 * Server-side data layer for exchange rates.
 *
 * Two modes:
 *  - "live"  — ALLRATES_API_KEY is set: real-time mid-market rates for 160+
 *              currencies via @allratestoday/sdk. The key never leaves the server.
 *  - "ecb"   — no key: the open ECB endpoint (official European Central Bank
 *              daily reference rates, ~30 currencies, keyless, attribution required).
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

interface OpenEcbResponse {
  bank?: string;
  rate_date?: string;
  source?: string;
  target?: string;
  rate?: number;
  derived?: boolean;
  attribution?: { source?: string; url?: string };
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
        date: res.date ?? new Date().toISOString().slice(0, 10),
        mode: "live" as const,
        attribution: LIVE_ATTRIBUTION,
      };
    }

    const url = `${OPEN_ECB_URL}?source=${from}&target=${to}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`ECB endpoint responded ${res.status} for ${from}/${to}`);
    }
    const data = (await res.json()) as OpenEcbResponse;
    if (typeof data.rate !== "number") {
      throw new Error(`No ECB rate available for ${from}/${to}`);
    }
    return {
      from,
      to,
      rate: data.rate,
      date: data.rate_date ?? new Date().toISOString().slice(0, 10),
      mode: "ecb" as const,
      derived: data.derived,
      attribution: ECB_ATTRIBUTION,
    };
  });
}

/** The ~31 currencies on the ECB's daily reference-rate table (keyless mode). */
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
  { code: "BGN", name: "Bulgarian Lev" },
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

export async function getCurrencies(): Promise<Currency[]> {
  if (!apiKey) return ECB_CURRENCIES;

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
