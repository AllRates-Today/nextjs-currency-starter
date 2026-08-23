"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Currency {
  code: string;
  name: string;
}

interface RateResult {
  from: string;
  to: string;
  rate: number;
  date: string;
  mode: "live" | "ecb";
  derived?: boolean;
  attribution: { text: string; url: string };
}

const FALLBACK_CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
];

function formatAmount(value: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

export default function Converter() {
  const [currencies, setCurrencies] = useState<Currency[]>(FALLBACK_CURRENCIES);
  const [mode, setMode] = useState<"live" | "ecb" | null>(null);
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [result, setResult] = useState<RateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/currencies")
      .then((res) => res.json())
      .then((data: { mode?: "live" | "ecb"; currencies?: Currency[] }) => {
        if (cancelled) return;
        if (data.mode) setMode(data.mode);
        if (data.currencies && data.currencies.length > 0) {
          setCurrencies(data.currencies);
        }
      })
      .catch(() => {
        /* fall back to the static list */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/rate?from=${from}&to=${to}`)
      .then(async (res) => {
        const data = (await res.json()) as RateResult & { error?: string };
        if (cancelled) return;
        if (!res.ok || data.error) {
          setError(data.error ?? "Failed to fetch rate");
          setResult(null);
        } else {
          setResult(data);
          setMode(data.mode);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Network error — is the dev server running?");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  const numericAmount = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [amount]);

  const converted =
    result && numericAmount !== null ? numericAmount * result.rate : null;

  return (
    <>
      {mode === "ecb" && (
        <div className="banner" role="note">
          Running on ECB reference rates (daily, ~30 currencies).{" "}
          <a
            href="https://allratestoday.com/register"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get a free key
          </a>{" "}
          for 160+ currencies in real time.
        </div>
      )}

      <div className="card">
        <div className="field">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="pair">
          <div className="field">
            <label htmlFor="from">From</label>
            <select
              id="from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="swap"
            onClick={swap}
            aria-label="Swap currencies"
            title="Swap currencies"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 3 4 7l4 4" />
              <path d="M4 7h16" />
              <path d="m16 21 4-4-4-4" />
              <path d="M20 17H4" />
            </svg>
          </button>

          <div className="field">
            <label htmlFor="to">To</label>
            <select id="to" value={to} onChange={(e) => setTo(e.target.value)}>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={`result${loading ? " skeleton" : ""}`} aria-live="polite">
          {error ? (
            <p className="error">{error}</p>
          ) : result && converted !== null ? (
            <>
              <div className="result-amount">
                {formatAmount(converted, result.to)}
              </div>
              <div className="result-rate">
                1 {result.from} = {result.rate.toLocaleString(undefined, {
                  maximumSignificantDigits: 7,
                })}{" "}
                {result.to}
              </div>
              <div className="result-date">
                {result.mode === "ecb"
                  ? `ECB reference rate for ${result.date}${result.derived ? " (derived pair)" : ""}`
                  : `Real-time mid-market rate, ${result.date}`}
              </div>
            </>
          ) : (
            <div className="result-rate">
              {numericAmount === null ? "Enter an amount to convert" : "Loading rate…"}
            </div>
          )}
        </div>

        <p className="attribution">
          Powered by{" "}
          <a
            href={result?.attribution.url ?? "https://allratestoday.com"}
            target="_blank"
            rel="noopener noreferrer"
          >
            AllRatesToday
          </a>
        </p>
      </div>
    </>
  );
}
