import { NextRequest, NextResponse } from "next/server";
import { getRate, isValidCode } from "@/lib/rates";

/**
 * GET /api/rate?from=USD&to=EUR
 *
 * Server-side proxy to AllRatesToday. The API key stays on the server —
 * the browser only ever talks to this route. Responses are cached in
 * memory for 5 minutes (see lib/rates.ts).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = (searchParams.get("from") ?? "").toUpperCase();
  const to = (searchParams.get("to") ?? "").toUpperCase();

  if (!isValidCode(from) || !isValidCode(to)) {
    return NextResponse.json(
      { error: "Pass ?from and ?to as 3-letter currency codes, e.g. ?from=USD&to=EUR" },
      { status: 400 },
    );
  }

  try {
    const result = await getRate(from, to);
    return NextResponse.json(result, {
      headers: {
        // Let CDNs/browsers share the 5-minute snapshot too.
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch rate";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
