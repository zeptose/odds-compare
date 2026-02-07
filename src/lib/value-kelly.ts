/**
 * Value detection + Kelly Criterion stake sizing
 */

export type KellyFraction = 1 | 0.5 | 0.25;

/**
 * Kelly: f* = (bp - q) / b
 * b = decimal odds - 1, p = your prob, q = 1 - p
 * Returns fraction of bankroll to bet (0 to 1), or 0 if negative EV
 */
export function kellyStake(
  decimalOdds: number,
  yourImpliedProb: number,
  fraction: KellyFraction = 0.5
): number {
  const b = decimalOdds - 1;
  const p = yourImpliedProb;
  const q = 1 - p;
  const full = (b * p - q) / b;
  const frac = Math.max(0, full * fraction);
  return Math.min(frac, 1); // cap at 100%
}

/**
 * Check if an offer is +EV: offered implied prob < fair implied prob
 * (i.e. the book is giving better odds than "fair")
 */
export function isValueBet(
  offeredImpliedProb: number,
  fairImpliedProb: number,
  minEdge = 0.01
): boolean {
  // Lower implied prob = better odds = value
  return fairImpliedProb - offeredImpliedProb >= minEdge;
}

/**
 * Compute "fair" implied prob from all offers (inverse of best decimal odds, or average)
 */
export function fairImpliedProb(
  offers: { decimalOdds: number }[],
  useBest = true
): number {
  if (offers.length === 0) return 0.5;
  if (useBest) {
    const bestOdds = Math.max(...offers.map((o) => o.decimalOdds));
    return 1 / bestOdds;
  }
  const avgImplied =
    offers.reduce((s, o) => s + 1 / o.decimalOdds, 0) / offers.length;
  return avgImplied;
}
