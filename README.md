# Next.js Currency Converter Starter — nextjs-currency-starter

[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/AllRates-Today/nextjs-currency-starter/blob/main/LICENSE)
[![works keyless](https://img.shields.io/badge/API%20key-optional-brightgreen.svg)](https://allratestoday.com/register)

**A polished, production-shaped currency converter built on Next.js 15 (App Router) and the [AllRatesToday](https://allratestoday.com) API. Clone it, `npm install`, `npm run dev` — it works immediately with official ECB reference rates and no API key. Add a free key and the same app serves real-time mid-market rates for 160+ currencies.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAllRates-Today%2Fnextjs-currency-starter&env=ALLRATES_API_KEY&envDescription=Optional%20AllRatesToday%20API%20key%20%E2%80%94%20leave%20empty%20for%20ECB%20demo%20mode&envLink=https%3A%2F%2Fallratestoday.com%2Fregister)

## 🚀 Why this starter?

- ⚡ **Works out of the box** — no signup, no key: keyless mode uses the open ECB endpoint (official European Central Bank daily reference rates, ~30 currencies)
- 🔑 **One env var to go real-time** — set `ALLRATES_API_KEY` and the same code serves live mid-market rates for 160+ currencies via [`@allratestoday/sdk`](https://www.npmjs.com/package/@allratestoday/sdk)
- 🔒 **Key never reaches the browser** — a server-side route (`app/api/rate`) proxies every request; the client only talks to your own domain
- 🗄️ **5-minute server-side cache built in** — the [recommended pattern](https://allratestoday.com/blog/how-to-cache-exchange-rates-avoid-rate-limits/) for staying inside your quota without stale prices
- 📅 **Every rate is dated** — the UI cites the ECB `rate_date` or the live fetch date under the result, and flags derived pairs
- 🎨 **Zero CSS framework** — one hand-written `globals.css`, dark-mode aware via `prefers-color-scheme`, no Tailwind to strip out
- 🔷 **Strict TypeScript** — `tsc --noEmit` clean, typed API responses end to end

## 🏁 Quick start

```bash
git clone https://github.com/AllRates-Today/nextjs-currency-starter.git
cd nextjs-currency-starter
npm install
npm run dev
```

Open http://localhost:3000 — the converter is already live on ECB reference rates.

Or click **Use this template** on GitHub to start your own repo from it.

## 🔑 Two modes, one codebase

| | Keyless (default) | With `ALLRATES_API_KEY` |
|---|---|---|
| Data source | Open ECB endpoint (no auth) | AllRatesToday `/v1` API via the official SDK |
| Rates | Official ECB daily reference rates | Real-time mid-market rates |
| Currencies | ~30 (the ECB's published table) | 160+ |
| Updates | Each ECB business day | Continuous |
| Attribution | Required (link shown in the UI) | Shown by default |

The mode is decided server-side in `lib/rates.ts` by the presence of the env var — the client just renders what the API route returns. In keyless mode the UI shows an upgrade banner linking to the [free key registration](https://allratestoday.com/register) (no credit card).

To switch to real-time rates:

```bash
cp .env.example .env.local
# add: ALLRATES_API_KEY=art_live_your_key_here
npm run dev
```

## 🗂️ What's inside

```
app/
  api/rate/route.ts        # GET /api/rate?from=USD&to=EUR — server proxy, key stays server-side
  api/currencies/route.ts  # GET /api/currencies — 160+ keyed, ECB table keyless
  page.tsx                 # server component shell
  layout.tsx, globals.css  # metadata + hand-written, dark-mode-aware styles
components/
  Converter.tsx            # client component: amount, from/to selects, swap, dated result
lib/
  rates.ts                 # data layer: SDK vs open-ECB fallback + 5-min in-memory cache
```

### The API route

```
GET /api/rate?from=USD&to=EUR
```

```json
{
  "from": "USD",
  "to": "EUR",
  "rate": 0.8547739123,
  "date": "2026-08-21",
  "mode": "ecb",
  "derived": true,
  "attribution": { "text": "ECB reference rates via AllRatesToday", "url": "https://allratestoday.com" }
}
```

Responses carry `Cache-Control: s-maxage=300, stale-while-revalidate=300`, so a CDN in front (Vercel included) shares the snapshot too. The in-memory cache is per server instance — for multi-region or serverless-heavy deployments, swap it for Redis/KV using the same `cached()` helper in `lib/rates.ts`.

## 🚢 Deploy

**Vercel:** click the deploy button above, optionally paste your `ALLRATES_API_KEY` when prompted (leave it empty for ECB demo mode). Any Node 18+ host works the same way: `npm run build && npm start`.

## 📖 More from AllRatesToday

- [API documentation](https://allratestoday.com/docs/) — every endpoint, all output formats
- [For AI agents](https://allratestoday.com/for-ai-agents/) — MCP server, machine-readable docs, agent-friendly auth
- [Central bank rates API](https://allratestoday.com/central-bank-rates-api/) — 60+ official central-bank tables, the compliance-grade counterpart to mid-market
- [`@allratestoday/sdk`](https://www.npmjs.com/package/@allratestoday/sdk) — the zero-dependency SDK this starter uses

## 📄 License

MIT — use it as the base for anything, commercial included. In keyless mode, keep a visible attribution link to [allratestoday.com](https://allratestoday.com) (the ECB endpoint's terms); with an API key, attribution is appreciated but not required.

## 🔗 Links

- **AI agents:** Claude Code plugin `/plugin marketplace add AllRates-Today/claude-code-plugin` · hosted MCP endpoint `https://allratestoday.com/api/mcp` (keyless)
