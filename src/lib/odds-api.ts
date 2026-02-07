/**
 * The Odds API (the-odds-api.com) fetcher
 * Requires API key: https://the-odds-api.com
 */

import type { NormalizedOdds, NormalizedOutcome } from "./schema";

const BASE = "https://api.the-odds-api.com/v4";

interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    title: string;
    last_update: string;
    markets: {
      key: string;
      last_update: string;
      outcomes: OddsApiOutcome[];
    }[];
  }[];
}

export async function fetchOddsApi(
  sport: string,
  apiKey: string
): Promise<NormalizedOdds[]> {
  const url = `${BASE}/sports/${sport}/odds/?regions=us&markets=h2h,spreads,totals&oddsFormat=decimal&apiKey=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Odds API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as OddsApiEvent[];
  return data.map(normalizeEvent);
}

function normalizeEvent(e: OddsApiEvent): NormalizedOdds {
  const eventName = `${e.away_team} @ ${e.home_team}`;
  const outcomes: NormalizedOutcome[] = [];

  for (const book of e.bookmakers) {
    for (const market of book.markets) {
      const marketType = (market.key === "spreads" ? "spreads" : market.key === "totals" ? "totals" : "h2h") as "h2h" | "spreads" | "totals";
      for (const o of market.outcomes) {
        outcomes.push({
          name: o.name,
          book: book.title,
          decimalOdds: o.price,
          impliedProb: 1 / o.price,
          source: "sportsbook",
          point: o.point,
          marketType,
        });
      }
    }
  }

  return {
    eventId: e.id,
    eventName,
    sport: e.sport_key,
    commenceTime: e.commence_time,
    outcomes,
  };
}
