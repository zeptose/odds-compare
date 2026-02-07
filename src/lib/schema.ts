/**
 * Normalized schema for odds across sportsbooks + Polymarket
 */

export type Source = "sportsbook" | "polymarket";

export interface NormalizedOdds {
  eventId: string;
  eventName: string;
  sport: string;
  commenceTime: string; // ISO string
  outcomes: NormalizedOutcome[];
}

export interface NormalizedOutcome {
  name: string; // "Team A", "Yes", "Over", etc.
  book: string;
  decimalOdds: number;
  impliedProb: number;
  source: Source;
  point?: number; // spread/total: -3.5, 225.5, etc.
  marketType?: "h2h" | "spreads" | "totals";
}

export interface OutcomeData {
  bestOdds: number;
  bestBook: string;
  allOffers: { book: string; decimalOdds: number; impliedProb: number }[];
  isValue: boolean;
  fairImpliedProb: number;
  kellyFraction?: number;
  point?: number;
}

export interface EventWithBestOdds extends NormalizedOdds {
  outcomesBySelection: Record<string, OutcomeData>;
  spreadsBySelection?: Record<string, OutcomeData>;
  totalsBySelection?: Record<string, OutcomeData>; // "Over 225.5", etc.
}

export const SPORTS = [
  { id: "americanfootball_nfl", label: "NFL" },
  { id: "americanfootball_ncaaf", label: "NCAAF" },
  { id: "basketball_nba", label: "NBA" },
  { id: "basketball_ncaab", label: "NCAAB" },
  { id: "basketball_wnba", label: "WNBA" },
  { id: "baseball_mlb", label: "MLB" },
  { id: "icehockey_nhl", label: "NHL" },
  { id: "mma_ufc", label: "UFC" },
  { id: "soccer_epl", label: "EPL" },
  { id: "soccer_mls", label: "MLS" },
  { id: "americanfootball_nfl_preseason", label: "NFL Preseason" },
  { id: "basketball_nba_preseason", label: "NBA Preseason" },
] as const;

export type SportId = (typeof SPORTS)[number]["id"];
