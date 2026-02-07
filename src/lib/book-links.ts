/**
 * Sportsbook URLs for "Bet now" links
 *
 * AFFILIATE: When you join each sportsbook's affiliate program, replace
 * these direct links with your affiliate URLs for commission on signups.
 * Example: DraftKings -> "https://record.draftkings.com/..." (your link)
 */

export const BOOK_LINKS: Record<string, string> = {
  DraftKings: "https://sportsbook.draftkings.com",
  FanDuel: "https://sportsbook.fanduel.com",
  "BetMGM": "https://sportsbook.betmgm.com",
  BetRivers: "https://www.betrivers.com",
  "BetOnline.ag": "https://www.betonline.ag",
  "MyBookie.ag": "https://www.mybookie.ag",
  BetUS: "https://www.betus.com.pa",
  "LowVig.ag": "https://lowvig.ag",
  "Betway": "https://sports.betway.com",
  "PointsBet": "https://pointsbet.com",
  "Unibet": "https://www.unibet.com/sportsbook",
  "Caesars": "https://www.caesars.com/sportsbook",
  "Borgata": "https://www.borgataonline.com/sportsbook",
  "Bet365": "https://www.bet365.com",
  "William Hill": "https://www.williamhill.com",
  "Barstool": "https://www.barstoolsportsbook.com",
  "WynnBET": "https://www.wynnbet.com",
  "SuperBook": "https://superbook.com",
  Polymarket: "https://polymarket.com",
};

export function getBookLink(bookName: string): string {
  return BOOK_LINKS[bookName] ?? `https://www.google.com/search?q=${encodeURIComponent(bookName + " sportsbook")}`;
}
