import { NextResponse } from "next/server";
import { getCurrencies, getMode } from "@/lib/rates";

/**
 * GET /api/currencies
 *
 * Lists the currencies available in the current mode:
 *  - keyed ("live"): 160+ currencies from /v1/symbols
 *  - keyless ("ecb"): the ~31 currencies on the ECB daily reference-rate table
 */
export async function GET() {
  try {
    const currencies = await getCurrencies();
    return NextResponse.json(
      { mode: getMode(), currencies },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list currencies";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
