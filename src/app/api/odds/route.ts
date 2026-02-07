import { NextRequest } from "next/server";
import { fetchOddsApi } from "@/lib/odds-api";
import { fetchPolymarketEvents } from "@/lib/polymarket";
import { mergeAndEnrich } from "@/lib/merge";

// Cache for 2 min to save API credits
export const revalidate = 120;

function parseError(e: unknown): { status: number; message: string } {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("429") || msg.includes("rate limit"))
    return { status: 429, message: "Odds API rate limit reached (500 free/month). Try again later." };
  if (msg.includes("401") || msg.includes("Invalid API"))
    return { status: 401, message: "Invalid Odds API key. Check .env.local" };
  return { status: 502, message: msg };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport") ?? "americanfootball_nfl";
  const bankroll = searchParams.get("bankroll");
  const kelly = searchParams.get("kelly") as "1" | "0.5" | "0.25" | null;

  let events: Awaited<ReturnType<typeof mergeAndEnrich>> = [];

  const apiKey = process.env.ODDS_API_KEY;
  if (apiKey) {
    try {
      const oddsEvents = await fetchOddsApi(sport, apiKey);
      const opts =
        bankroll && kelly
          ? {
              bankroll: Number(bankroll),
              kellyFraction: Number(kelly) as 1 | 0.5 | 0.25,
            }
          : undefined;
      events = mergeAndEnrich(oddsEvents, opts);
    } catch (e) {
      console.error("Odds API error:", e);
      const { status, message } = parseError(e);
      return Response.json({ error: "Odds API error", details: message }, { status });
    }
  }

  let polymarketEvents: Awaited<ReturnType<typeof mergeAndEnrich>> = [];
  try {
    const pm = await fetchPolymarketEvents();
    polymarketEvents = mergeAndEnrich(pm);
  } catch (e) {
    console.error("Polymarket error:", e);
    // Don't fail - sportsbook data still useful
  }

  return Response.json({
    sport,
    sportsbookEvents: events,
    polymarketEvents,
    timestamp: Date.now(),
  });
}
