# OddsJam Inspiration — Features to Add

[OddsJam](https://oddsjam.com/betting-tools/arbitrage) offers several tools we can emulate:

## Already Implemented ✓
- Arbitrage opportunities
- Positive EV bets
- Kelly sizing

## OddsJam Features to Add

### 1. Middles
Bet both sides (spread/total) where there's **overlap** — chance to **win both**.
- **Totals:** Over 51.5 at one book, Under 52.5 at another → if exactly 52, you win both
- **Spreads:** Team A -3 at one book, Team B +4 at another → gap = middle zone

### 2. Low Hold
Bets where combined implied prob ≈ 100% — minimal vig (house edge).
- Hold = (1/odds1 + 1/odds2 - 1) × 100%
- Good for: bonus rollover, VIP points, moving money between books

### 3. Calculators (OddsJam has 15+)
- **Arbitrage Calculator** — enter two odds + stake → stake split, guaranteed profit
- **Kelly Calculator** — odds, your prob, bankroll → stake %
- **Odds Converter** — American ↔ Decimal ↔ Implied %
- **Hold Calculator** — show vig per event

### 4. Messaging
- "Both sides lose" (house edge) vs "Both sides win" (arb) — like OddsJam's explanation
