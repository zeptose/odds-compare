# Sports Value / Odds Comparison App — Spec & Data Sources

Build: **Idea #1** — Compare odds across books + Polymarket, surface +EV bets, optional Kelly-style sizing. Data strategy and APIs below.

---

## Data sources — what to use

### 1. **Sportsbooks (traditional betting odds)**

| Source | Best for | Cost | Notes |
|--------|----------|------|--------|
| **The Odds API** (the-odds-api.com) | Primary sportsbook data | **500 requests/mo free**; then $30/mo (20K) | Many books (DraftKings, FanDuel, BetMGM, etc.), NFL/NBA/MLB/NHL/soccer. Free tier enough for MVP. |
| SportsGameOdds | Alternative / more books | Free tier limited; from $99/mo | 80+ bookmakers, charged per event. Use if you outgrow The Odds API. |
| odds-api.io | Another option | Check site | 250+ bookmakers claimed. |

**Recommendation:** Start with **The Odds API**. Free tier (500 requests/mo) is enough to build and test; paid is cheap when you have revenue.

- **Endpoints you need:** odds per sport, per event, multiple bookmakers (e.g. `GET /v4/sports/{sport}/odds/?regions=us&oddsFormat=decimal`).
- **Format:** Request decimal odds so your EV/Kelly math is straightforward.

---

### 2. **Polymarket (prediction markets — sports + other)**

Polymarket has a **public API, no key required** for reading data. You get sports markets (NBA, NFL, etc.) plus politics, crypto, and other events.

| What | Endpoint / URL | Auth |
|------|----------------|------|
| **Gamma API** (events, markets, sports) | `https://gamma-api.polymarket.com/` | None |
| List sports leagues | `GET /sports` | None |
| Events for a league | `GET /events?series_id={id}&active=true&closed=false` | None |
| Event/market by slug | `GET /markets?slug=...` | None |
| **CLOB** (live price, orderbook) | `https://clob.polymarket.com/price?token_id=...` | None for read |
| Orderbook depth | `GET /book?token_id=...` | None |

**Recommendation:** Use Polymarket in parallel with sportsbooks.

- **Sports:** Use `/sports` then `events?series_id=...` for game-level markets; map to your "event" (e.g. Team A vs Team B) so you can compare "Polymarket implied prob" vs "sportsbook implied prob."
- **Non-sports:** Great differentiator — politics, "Will X happen by date?" — same value/EV logic applies. One app, sports + prediction markets.

**Data shape:** Events have `markets[]`; each market has `outcomes` (e.g. Yes/No) and `outcomePrices` (implied probabilities). CLOB gives current bid/ask if you want live price.

---

## Best combo for your app

1. **The Odds API** — Sportsbook odds (US books, main sports). Free tier → paid when you scale.
2. **Polymarket Gamma + CLOB** — Prediction markets (sports + politics/crypto/etc.). Free, no key.

Why both:

- **Comparison:** "DraftKings has this at 2.10, Polymarket Yes at 0.48 (≈ 2.08) — best price is…"
- **Value/EV:** You can treat Polymarket as one "book" and compare implied probabilities across books + Polymarket.
- **Differentiation:** Few tools combine sportsbooks + Polymarket in one place; good for growth and SEO ("Polymarket vs sportsbooks").

---

## High-level architecture

```
[Your backend or edge functions]
        │
        ├── The Odds API (sport, region, oddsFormat=decimal)
        │       → normalize to: event, outcome, decimal odds, book name
        │
        └── Polymarket Gamma + CLOB
                → /events, /markets, /price, /book
                → normalize to: event, outcome, implied prob (≈ decimal odds), source "Polymarket"
        │
        ▼
  Normalized odds store (per event/outcome)
        │
        ▼
  Value/EV layer: your_prob or "fair" from average/max odds
  Kelly layer: bankroll %, risk tolerance
        │
        ▼
  [Web / mobile app] — comparison table, +EV highlights, suggested stake
```

- **Normalize early:** Convert everything to decimal odds (or implied probability) and one "event + outcome" key so sportsbooks and Polymarket sit in the same tables/views.
- **Caching:** Cache Odds API and Gamma responses (e.g. 1–5 min) to stay within free tier and reduce latency.

---

## v1 feature set (first build)

1. **Odds comparison**
   - Pick sport (e.g. NFL) → list upcoming events.
   - Per event/outcome: show odds from each book + Polymarket (if that market exists).
   - Highlight "best odds" per outcome.

2. **Value flag (simple)**
   - "Fair" odds = e.g. inverse of average implied probability across books (or use best available).
   - Flag when any single book/Polymarket offers better than "fair" (e.g. implied prob < fair implied prob).

3. **Optional: Kelly / stake suggestion**
   - Input: bankroll, risk (full / half / quarter Kelly).
   - Output: "Bet X% of bankroll" for that outcome (only show when you also mark it as value, or let user choose).

4. **Data sources in v1**
   - The Odds API: one sport (e.g. `americanfootball_nfl`), US regions, decimal odds.
   - Polymarket: same sport via `/sports` → `series_id` → events; match by team names or event title.

---

## Tech stack suggestion

| Layer | Suggestion |
|-------|------------|
| Frontend | Next.js (or React + Vite) — one app for web, responsive for mobile later. |
| Backend | Next API routes or a small Node service — call Odds API + Polymarket, normalize, cache. |
| Auth (for paid) | NextAuth or Clerk — only needed when you add subscriptions. |
| Payments | Stripe — subscriptions for "pro" (alerts, full Kelly, more sports). |
| Hosting | Vercel (Next) or similar; cron or edge for periodic odds refresh. |

---

## Cost to run (early)

- **The Odds API:** $0 (500 req/mo) then ~$30/mo.
- **Polymarket:** $0.
- **Hosting:** Free tier (Vercel etc.) then ~$20/mo.
- **Total:** $0 to launch; ~$50/mo once you need more Odds API quota and paid hosting.

---

## Next steps

1. **Get keys:** Sign up at [the-odds-api.com](https://the-odds-api.com) and grab an API key (free).
2. **Test Polymarket:** `curl "https://gamma-api.polymarket.com/sports"` and `curl "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=5"`.
3. **Define normalized schema:** One JSON shape for "event + outcome + decimal odds + source."
4. **Build v1:** One sport, comparison table, "best odds" and "value" column; optional Kelly in a second pass.
