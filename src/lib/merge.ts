/**
 * Merge sportsbook + Polymarket odds, compute best odds, value, Kelly
 */

import type {
  NormalizedOdds,
  EventWithBestOdds,
  OutcomeData,
} from "./schema";
import {
  fairImpliedProb,
  isValueBet,
  kellyStake,
  type KellyFraction,
} from "./value-kelly";

export function mergeAndEnrich(
  events: NormalizedOdds[],
  opts?: {
    bankroll?: number;
    kellyFraction?: KellyFraction;
    yourProb?: number; // user's estimated prob; if absent, use fair
  }
): EventWithBestOdds[] {
  return events.map((ev) => enrichEvent(ev, opts));
}

function buildOutcomes(
  bySelection: Record<
    string,
    { book: string; decimalOdds: number; impliedProb: number; point?: number }[]
  >,
  opts?: { bankroll?: number; kellyFraction?: KellyFraction; yourProb?: number }
): Record<string, OutcomeData> {
  const result: Record<string, OutcomeData> = {};
  for (const [key, offers] of Object.entries(bySelection)) {
    const plain = offers.map(({ book, decimalOdds, impliedProb }) => ({
      book,
      decimalOdds,
      impliedProb,
    }));
    const best = plain.reduce((a, b) =>
      a.decimalOdds > b.decimalOdds ? a : b
    );
    // Use average implied prob as "fair" market consensus; best odds can beat it
    const fair = fairImpliedProb(plain, false);
    const isValue = isValueBet(best.impliedProb, fair);

    let kellyFraction: number | undefined;
    if (opts?.bankroll && opts?.kellyFraction) {
      const yourProb = opts.yourProb ?? fair;
      kellyFraction = kellyStake(best.decimalOdds, yourProb, opts.kellyFraction);
    }

    const point = offers[0]?.point;
    result[key] = {
      bestOdds: best.decimalOdds,
      bestBook: best.book,
      allOffers: plain,
      isValue,
      fairImpliedProb: fair,
      kellyFraction,
      point,
    };
  }
  return result;
}

function enrichEvent(
  ev: NormalizedOdds,
  opts?: {
    bankroll?: number;
    kellyFraction?: KellyFraction;
    yourProb?: number;
  }
): EventWithBestOdds {
  const byH2h: Record<
    string,
    { book: string; decimalOdds: number; impliedProb: number }[]
  > = {};
  const bySpreads: Record<
    string,
    { book: string; decimalOdds: number; impliedProb: number; point?: number }[]
  > = {};
  const byTotals: Record<
    string,
    { book: string; decimalOdds: number; impliedProb: number; point?: number }[]
  > = {};

  for (const o of ev.outcomes) {
    const entry = {
      book: o.book,
      decimalOdds: o.decimalOdds,
      impliedProb: o.impliedProb,
      point: o.point,
    };
    if (o.marketType === "spreads" && o.point != null) {
      const key = `${o.name} ${o.point > 0 ? "+" : ""}${o.point}`;
      if (!bySpreads[key]) bySpreads[key] = [];
      bySpreads[key].push(entry);
    } else if (o.marketType === "totals" && o.point != null) {
      const key = `${o.name} ${o.point}`;
      if (!byTotals[key]) byTotals[key] = [];
      byTotals[key].push(entry);
    } else {
      if (!byH2h[o.name]) byH2h[o.name] = [];
      byH2h[o.name].push(entry);
    }
  }

  const outcomesBySelection = buildOutcomes(byH2h, opts);
  const spreadsBySelection =
    Object.keys(bySpreads).length > 0
      ? buildOutcomes(bySpreads, opts)
      : undefined;
  const totalsBySelection =
    Object.keys(byTotals).length > 0
      ? buildOutcomes(byTotals, opts)
      : undefined;

  return {
    ...ev,
    outcomesBySelection,
    spreadsBySelection,
    totalsBySelection,
  };
}
