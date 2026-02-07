/**
 * Polymarket Gamma API fetcher (no key required)
 */

import type { NormalizedOdds, NormalizedOutcome } from "./schema";

const GAMMA = "https://gamma-api.polymarket.com";

interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  markets?: {
    id: string;
    question: string;
    outcomes: string;
    outcomePrices: string;
  }[];
}

// Map our sport keys to Polymarket tag/series (simplified - we fetch sports list)
export async function fetchPolymarketSports(): Promise<{ id: number; label: string }[]> {
  const res = await fetch(`${GAMMA}/sports`);
  if (!res.ok) return [];
  const data = (await res.json()) as { id: number; name: string }[];
  return data.map((s) => ({ id: s.id, label: s.name }));
}

export async function fetchPolymarketEvents(
  seriesId?: number
): Promise<NormalizedOdds[]> {
  let url = `${GAMMA}/events?active=true&closed=false&limit=20`;
  if (seriesId) url += `&series_id=${seriesId}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as PolymarketEvent[];
  const results: NormalizedOdds[] = [];

  for (const ev of data) {
    if (!ev.markets?.length) continue;

    for (const m of ev.markets) {
      let outcomes: string[];
      let prices: number[];
      try {
        outcomes = JSON.parse(m.outcomes || "[]") as string[];
        prices = (JSON.parse(m.outcomePrices || "[0.5,0.5]") as string[]).map(
          Number
        );
      } catch {
        continue;
      }

      const normOutcomes: NormalizedOutcome[] = outcomes.map((name, i) => {
        const prob = prices[i] ?? 0.5;
        const decimalOdds = prob > 0 ? 1 / prob : 2;
        return {
          eventId: ev.id,
          eventName: ev.title,
          sport: "polymarket",
          commenceTime: ev.startDate,
          name,
          book: "Polymarket",
          decimalOdds,
          impliedProb: prob,
          source: "polymarket",
        };
      });

      if (normOutcomes.length > 0) {
        results.push({
          eventId: `${ev.id}-${m.id}`,
          eventName: ev.title,
          sport: "polymarket",
          commenceTime: ev.startDate,
          outcomes: normOutcomes,
        });
      }
    }
  }

  return results;
}
