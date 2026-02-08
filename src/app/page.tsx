"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { SPORTS } from "@/lib/schema";
import type { EventWithBestOdds, SportId } from "@/lib/schema";
import { getBookLink } from "@/lib/book-links";

const PREFS_KEY = "odds-compare-prefs";

function loadPrefs() {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(PREFS_KEY);
    if (!s) return null;
    const p = JSON.parse(s) as { sport?: string; bankroll?: string; kelly?: string };
    return p;
  } catch {
    return null;
  }
}

function savePrefs(p: { sport?: string; bankroll?: string; kelly?: string }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {}
}

const FAVES_KEY = "odds-compare-faves";

function loadFaves(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const s = localStorage.getItem(FAVES_KEY);
    if (!s) return new Set();
    return new Set(JSON.parse(s) as string[]);
  } catch {
    return new Set();
  }
}

function saveFaves(faves: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVES_KEY, JSON.stringify([...faves]));
  } catch {}
}

function formatEventTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatLastUpdated(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  if (s < 120) return "1 min ago";
  const m = Math.floor(s / 60);
  return `${m} min ago`;
}

type ArbOpportunity = {
  eventName: string;
  outcome1: string;
  outcome2: string;
  book1: string;
  book2: string;
  odds1: number;
  odds2: number;
  profitPct: number;
};

type EVBet = {
  eventName: string;
  selection: string;
  odds: number;
  book: string;
  edgePct: number;
  kellyPct?: number;
};

type LowHoldEvent = {
  eventName: string;
  outcome1: string;
  outcome2: string;
  book1: string;
  book2: string;
  odds1: number;
  odds2: number;
  holdPct: number; // vig %
};

type MiddleOpportunity = {
  eventName: string;
  side1: string; // e.g. "Over 51.5"
  side2: string; // e.g. "Under 52.5"
  book1: string;
  book2: string;
  odds1: number;
  odds2: number;
  middleZone: string; // e.g. "52 wins both"
};

export default function Home() {
  const [sport, setSport] = useState<SportId>(SPORTS[0].id);
  const [bankroll, setBankroll] = useState("");
  const [kelly, setKelly] = useState<"1" | "0.5" | "0.25">("0.5");
  const [sportsbookEvents, setSportsbookEvents] = useState<EventWithBestOdds[]>(
    []
  );
  const [polymarketEvents, setPolymarketEvents] = useState<EventWithBestOdds[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const p = loadPrefs();
    if (p) {
      if (p.sport && SPORTS.some((s) => s.id === p.sport))
        setSport(p.sport as SportId);
      if (p.bankroll != null) setBankroll(p.bankroll);
      if (p.kelly === "1" || p.kelly === "0.5" || p.kelly === "0.25") setKelly(p.kelly);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    savePrefs({ sport, bankroll, kelly });
  }, [mounted, sport, bankroll, kelly]);

  const fetchOdds = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ sport });
    if (bankroll) params.set("bankroll", bankroll);
    if (kelly) params.set("kelly", kelly);

    fetch(`/api/odds?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.details || data.error);
        setSportsbookEvents(data.sportsbookEvents ?? []);
        setPolymarketEvents(data.polymarketEvents ?? []);
        setLastUpdated(data.timestamp ?? Date.now());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sport, bankroll, kelly]);

  useEffect(() => {
    if (!mounted) return;
    fetchOdds();
  }, [mounted, fetchOdds]);

  // Auto-refresh every 5 min
  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(fetchOdds, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [mounted, fetchOdds]);

  const evBets = useMemo((): EVBet[] => {
    const out: EVBet[] = [];
    for (const ev of sportsbookEvents) {
      for (const [sel, data] of Object.entries(ev.outcomesBySelection)) {
        if (!data.isValue) continue;
        const edgePct = (data.fairImpliedProb - data.allOffers.find((o) => o.book === data.bestBook)!.impliedProb) * 100;
        out.push({
          eventName: ev.eventName,
          selection: sel,
          odds: data.bestOdds,
          book: data.bestBook,
          edgePct,
          kellyPct: data.kellyFraction ? data.kellyFraction * 100 : undefined,
        });
      }
      if (ev.spreadsBySelection) {
        for (const [sel, data] of Object.entries(ev.spreadsBySelection)) {
          if (!data.isValue) continue;
          const edgePct = (data.fairImpliedProb - (data.allOffers.find((o) => o.book === data.bestBook)?.impliedProb ?? 0)) * 100;
          out.push({
            eventName: ev.eventName,
            selection: sel,
            odds: data.bestOdds,
            book: data.bestBook,
            edgePct,
            kellyPct: data.kellyFraction ? data.kellyFraction * 100 : undefined,
          });
        }
      }
      if (ev.totalsBySelection) {
        for (const [sel, data] of Object.entries(ev.totalsBySelection)) {
          if (!data.isValue) continue;
          const edgePct = (data.fairImpliedProb - (data.allOffers.find((o) => o.book === data.bestBook)?.impliedProb ?? 0)) * 100;
          out.push({
            eventName: ev.eventName,
            selection: sel,
            odds: data.bestOdds,
            book: data.bestBook,
            edgePct,
            kellyPct: data.kellyFraction ? data.kellyFraction * 100 : undefined,
          });
        }
      }
    }
    return out.sort((a, b) => b.edgePct - a.edgePct);
  }, [sportsbookEvents]);

  const arbs = useMemo((): ArbOpportunity[] => {
    const out: ArbOpportunity[] = [];
    for (const ev of sportsbookEvents) {
      const outcomes = Object.entries(ev.outcomesBySelection);
      if (outcomes.length !== 2) continue;
      const [[name1, data1], [name2, data2]] = outcomes;
      for (const o1 of data1.allOffers) {
        for (const o2 of data2.allOffers) {
          if (o1.book === o2.book) continue;
          const total = 1 / o1.decimalOdds + 1 / o2.decimalOdds;
          if (total < 1) {
            out.push({
              eventName: ev.eventName,
              outcome1: name1,
              outcome2: name2,
              book1: o1.book,
              book2: o2.book,
              odds1: o1.decimalOdds,
              odds2: o2.decimalOdds,
              profitPct: ((1 / total - 1) * 100),
            });
          }
        }
      }
    }
    return out.sort((a, b) => b.profitPct - a.profitPct);
  }, [sportsbookEvents]);

  const lowHoldEvents = useMemo((): LowHoldEvent[] => {
    const out: LowHoldEvent[] = [];
    for (const ev of sportsbookEvents) {
      const outcomes = Object.entries(ev.outcomesBySelection);
      if (outcomes.length !== 2) continue;
      const [[name1, data1], [name2, data2]] = outcomes;
      const best1 = data1.allOffers.reduce((a, b) => (a.decimalOdds > b.decimalOdds ? a : b));
      const best2 = data2.allOffers.reduce((a, b) => (a.decimalOdds > b.decimalOdds ? a : b));
      if (best1.book === best2.book) continue;
      const total = 1 / best1.decimalOdds + 1 / best2.decimalOdds;
      const holdPct = (total - 1) * 100;
      if (holdPct < 5) {
        out.push({
          eventName: ev.eventName,
          outcome1: name1,
          outcome2: name2,
          book1: best1.book,
          book2: best2.book,
          odds1: best1.decimalOdds,
          odds2: best2.decimalOdds,
          holdPct,
        });
      }
    }
    return out.sort((a, b) => a.holdPct - b.holdPct);
  }, [sportsbookEvents]);

  const middles = useMemo((): MiddleOpportunity[] => {
    const out: MiddleOpportunity[] = [];
    for (const ev of sportsbookEvents) {
      if (!ev.totalsBySelection) continue;
      const entries = Object.entries(ev.totalsBySelection);
      const overs = entries.filter(([k]) => k.startsWith("Over "));
      const unders = entries.filter(([k]) => k.startsWith("Under "));
      for (const [overLabel, overData] of overs) {
        const overPoint = parseFloat(overLabel.replace("Over ", ""));
        if (isNaN(overPoint)) continue;
        for (const [underLabel, underData] of unders) {
          const underPoint = parseFloat(underLabel.replace("Under ", ""));
          if (isNaN(underPoint)) continue;
          if (overPoint >= underPoint) continue; // no overlap
          const overBook = overData.bestBook;
          const underBook = underData.bestBook;
          if (overBook === underBook) continue;
          const midStart = Math.ceil(overPoint + 0.5);
          const midEnd = Math.floor(underPoint - 0.5);
          if (midStart > midEnd) continue;
          const zone = midStart === midEnd ? `${midStart}` : `${midStart}-${midEnd}`;
          out.push({
            eventName: ev.eventName,
            side1: overLabel,
            side2: underLabel,
            book1: overBook,
            book2: underBook,
            odds1: overData.bestOdds,
            odds2: underData.bestOdds,
            middleZone: `${zone} wins both`,
          });
        }
      }
    }
    return out;
  }, [sportsbookEvents]);

  const [calculatorsOpen, setCalculatorsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [faves, setFaves] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("odds-compare-theme") as "dark" | "light" | null;
    if (stored === "dark" || stored === "light") setTheme(stored);
    setFaves(loadFaves());
  }, [mounted]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("odds-compare-theme", theme);
  }, [theme]);

  const toggleFave = (id: string) => {
    const next = new Set(faves);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFaves(next);
    saveFaves(next);
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors ${
        theme === "light"
          ? "bg-gray-50 text-gray-900"
          : "bg-zinc-950 text-zinc-100"
      }`}
      data-theme={theme}
    >
      <header
        className={`border-b px-4 py-4 md:px-8 ${
          theme === "light" ? "border-gray-200" : "border-zinc-800"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-emerald-500">
              Odds Compare · +EV Finder
            </h1>
            <p
              className={`text-sm mt-0.5 ${
                theme === "light" ? "text-gray-500" : "text-zinc-500"
              }`}
            >
              Sportsbooks + Polymarket · Best odds · Value bets · Kelly sizing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                theme === "light"
                  ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
              }`}
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button
              onClick={() => setLearnOpen(!learnOpen)}
              className="px-4 py-2 rounded-lg border border-emerald-700/50 bg-emerald-950/30 text-emerald-400 text-sm font-medium hover:bg-emerald-900/20 transition-colors"
            >
              {learnOpen ? "Hide" : "How it works"}
            </button>
          </div>
        </div>
      </header>

      {/* Learn - prominent top section */}
      {learnOpen && (
        <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-4 md:px-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <LearnCard
              title="Decimal odds"
              content="2.50 = bet $1, get $2.50 back (profit $1.50). Higher = less likely. Implied prob = 1 ÷ odds."
            />
            <LearnCard
              title="+EV"
              content="Positive expected value = odds better than true probability. We flag green when a book offers value."
            />
            <LearnCard
              title="Bankroll"
              content="Your total betting budget. Enter it above to see: stake per bet (Kelly % × bankroll), profit if you win, loss if you lose."
            />
            <LearnCard
              title="Kelly fraction"
              content="Tells you what % of bankroll to bet. Full Kelly = optimal but volatile; half or quarter = safer."
            />
            <LearnCard
              title="Arbitrage"
              content="Bet both sides at different books for guaranteed profit. Both sides win — rare pairs disappear fast."
            />
            <LearnCard
              title="Middles"
              content="Over 51.5 at one book, Under 52.5 at another. If exactly 52, you win both. Chance to win both sides."
            />
            <LearnCard
              title="Low Hold"
              content="Low vig (house edge). Good for bonus rollover, VIP points, moving money between books with minimal loss."
            />
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 lg:p-8">
        {/* Controls + Refresh */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex-1">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Sport</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value as SportId)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2.5 text-sm min-h-[44px] touch-manipulation"
            >
              {SPORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Bankroll ($)
            </label>
            <input
              type="number"
              placeholder="100"
              value={bankroll}
              onChange={(e) => setBankroll(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2.5 text-sm w-28 min-h-[44px] touch-manipulation"
            />
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Your budget — shows stake, profit & loss per bet
            </p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Kelly fraction
            </label>
            <select
              value={kelly}
              onChange={(e) =>
                setKelly(e.target.value as "1" | "0.5" | "0.25")
              }
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2.5 text-sm min-h-[44px] touch-manipulation"
            >
              <option value="1">Full Kelly</option>
              <option value="0.5">Half Kelly</option>
              <option value="0.25">Quarter Kelly</option>
            </select>
          </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={fetchOdds}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-800/50 border border-emerald-700 text-emerald-300 text-sm font-medium hover:bg-emerald-800/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] touch-manipulation"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            {lastUpdated && !loading && (
              <span className="text-[10px] text-zinc-600 text-right">
                {formatLastUpdated(lastUpdated)}
              </span>
            )}
          </div>
        </div>

        {loading && !sportsbookEvents.length && (
          <LoadingSkeleton />
        )}
        {error && (
          <div className="text-red-400 py-4 px-4 rounded bg-red-950/30 border border-red-900">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* OddsJam-inspired: +EV, Arb, Low Hold, Middles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              <section className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4">
                <h2 className="text-base font-semibold text-emerald-400 mb-3">
                  Suggested +EV bets
                </h2>
                {evBets.length === 0 ? (
                  <p className="text-zinc-500 text-sm">
                    No +EV bets right now. Try another sport.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {evBets.slice(0, 10).map((b, i) => {
                      const br = Number(bankroll) || 0;
                      const stake =
                        br > 0 && b.kellyPct != null && b.kellyPct > 0
                          ? br * (b.kellyPct / 100)
                          : 0;
                      const profitIfWin = stake > 0 ? stake * (b.odds - 1) : 0;
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-start gap-3 text-sm py-2 border-b border-zinc-800/50 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-zinc-300">
                              {b.eventName}
                            </span>
                            <span className="text-zinc-500"> · {b.selection}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <a
                              href={getBookLink(b.book)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 font-mono hover:underline"
                            >
                              {b.odds.toFixed(2)} @ {b.book} ↗
                            </a>
                            <div className="text-zinc-500 text-xs mt-0.5">
                              edge {b.edgePct.toFixed(1)}%
                              {b.kellyPct != null &&
                                b.kellyPct > 0 &&
                                ` · Kelly ${b.kellyPct.toFixed(1)}%`}
                            </div>
                            {stake > 0 && (
                              <div className="text-xs mt-1 space-y-0.5">
                                <span className="text-zinc-400">
                                  Stake ${stake.toFixed(2)}
                                </span>
                                <span className="text-emerald-400 block">
                                  +${profitIfWin.toFixed(2)} profit
                                </span>
                                <span className="text-red-400/80 block">
                                  −${stake.toFixed(2)} loss
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-4">
                <h2 className="text-base font-semibold text-amber-400 mb-1">
                  Arbitrage — both sides win
                </h2>
                <p className="text-[10px] text-zinc-500 mb-3">
                  Guaranteed profit when you bet both sides at different books
                </p>
                {arbs.length === 0 ? (
                  <p className="text-zinc-500 text-sm">
                    No arb right now. These pairs disappear in seconds.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {arbs.slice(0, 10).map((a, i) => {
                      const total = 1 / a.odds1 + 1 / a.odds2;
                      const br = Number(bankroll) || 0;
                      const profitDollars =
                        br > 0 ? br * (1 / total - 1) : 0;
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-start gap-3 text-sm py-2 border-b border-zinc-800/50 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-zinc-300">
                              {a.eventName}
                            </span>
                            <div className="text-xs mt-1 space-y-0.5">
                              <a
                                href={getBookLink(a.book1)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-400 hover:underline block"
                              >
                                {a.outcome1} @ {a.book1} ↗
                              </a>
                              <a
                                href={getBookLink(a.book2)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-400 hover:underline block"
                              >
                                {a.outcome2} @ {a.book2} ↗
                              </a>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-amber-400 font-mono">
                              {a.odds1.toFixed(2)} / {a.odds2.toFixed(2)}
                            </span>
                            <span className="text-amber-400/80 text-xs block font-medium">
                              +{a.profitPct.toFixed(2)}% profit
                            </span>
                            {br > 0 && profitDollars > 0 && (
                              <span className="text-emerald-400 text-xs block">
                                ${br} total → +${profitDollars.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Low Hold - OddsJam inspired */}
              <section className="rounded-lg border border-cyan-800/40 bg-cyan-950/20 p-4">
                <h2 className="text-base font-semibold text-cyan-400 mb-1">
                  Low Hold
                </h2>
                <p className="text-[10px] text-zinc-500 mb-3">
                  Low vig · good for bonus rollover
                </p>
                {lowHoldEvents.length === 0 ? (
                  <p className="text-zinc-500 text-sm">
                    No low-hold events (&lt;5%).
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {lowHoldEvents.slice(0, 6).map((l, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-xs py-2 border-b border-zinc-800/50 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-zinc-300 block truncate">
                            {l.eventName}
                          </span>
                          <span className="text-zinc-500 text-[10px]">
                            {l.outcome1} @ {l.book1} · {l.outcome2} @ {l.book2}
                          </span>
                        </div>
                        <span className="text-cyan-400 font-mono shrink-0 ml-2">
                          {l.holdPct.toFixed(1)}% hold
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Middles - OddsJam inspired */}
              <section className="rounded-lg border border-violet-800/40 bg-violet-950/20 p-4">
                <h2 className="text-base font-semibold text-violet-400 mb-1">
                  Middles
                </h2>
                <p className="text-[10px] text-zinc-500 mb-3">
                  Chance to win both sides
                </p>
                {middles.length === 0 ? (
                  <p className="text-zinc-500 text-sm">
                    No middles found.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {middles.slice(0, 6).map((m, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-start gap-2 text-xs py-2 border-b border-zinc-800/50 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-zinc-300 block truncate">
                            {m.eventName}
                          </span>
                          <a
                            href={getBookLink(m.book1)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:underline block"
                          >
                            {m.side1} @ {m.book1} ↗
                          </a>
                          <a
                            href={getBookLink(m.book2)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:underline block"
                          >
                            {m.side2} @ {m.book2} ↗
                          </a>
                        </div>
                        <span className="text-emerald-400 text-[10px] shrink-0 font-medium">
                          {m.middleZone}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Calculators - OddsJam inspired */}
            <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <button
                onClick={() => setCalculatorsOpen(!calculatorsOpen)}
                className="w-full px-4 py-3 text-left text-sm font-semibold text-zinc-300 hover:bg-zinc-800/50 flex items-center justify-between"
              >
                Calculators
                <span className="text-zinc-500 text-xs">Arb · Kelly · Odds</span>
                <span className="text-zinc-500">{calculatorsOpen ? "▲" : "▼"}</span>
              </button>
              {calculatorsOpen && (
                <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-zinc-800">
                  <CalculatorArb />
                  <CalculatorKelly />
                  <CalculatorOdds />
                </div>
              )}
            </div>

            {/* Favorites */}
            {faves.size > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-zinc-200 mb-3">
                  Favorites ({faves.size})
                </h2>
                <div className="space-y-4">
                  {[...sportsbookEvents, ...polymarketEvents]
                    .filter((ev) => faves.has(ev.eventId))
                    .map((ev) => (
                      <EventCard
                        key={ev.eventId}
                        event={ev}
                        bankroll={Number(bankroll) || 0}
                        isFave
                        onToggleFave={() => toggleFave(ev.eventId)}
                      />
                    ))}
                </div>
              </section>
            )}

            {/* Main content grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
              <div className="xl:col-span-2">
                <h2 className="text-lg font-semibold text-zinc-200 mb-3">
                  Sportsbooks — {SPORTS.find((s) => s.id === sport)?.label}
                </h2>
                {sportsbookEvents.length === 0 ? (
                  <p className="text-zinc-500 text-sm">
                    No events. Check API key or try another sport.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sportsbookEvents.map((ev) => (
                      <EventCard
                        key={ev.eventId}
                        event={ev}
                        bankroll={Number(bankroll) || 0}
                        isFave={faves.has(ev.eventId)}
                        onToggleFave={() => toggleFave(ev.eventId)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <section>
                  <h2 className="text-lg font-semibold text-zinc-200 mb-3">
                    Polymarket
                  </h2>
                  {polymarketEvents.length === 0 ? (
                    <p className="text-zinc-500 text-sm">No active events.</p>
                  ) : (
                    <div className="space-y-3">
                      {polymarketEvents.slice(0, 8).map((ev) => (
                        <EventCard
                          key={ev.eventId}
                          event={ev}
                          compact
                          isFave={faves.has(ev.eventId)}
                          onToggleFave={() => toggleFave(ev.eventId)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-8">
      <div className="h-10 w-48 rounded bg-zinc-800/80 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3"
          >
            <div className="h-4 w-3/4 rounded bg-zinc-800 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-zinc-800/70 animate-pulse" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 rounded bg-zinc-800/70 animate-pulse" />
              <div className="h-12 rounded bg-zinc-800/70 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearnCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
      <h3 className="text-sm font-medium text-zinc-200 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 leading-relaxed">{content}</p>
    </div>
  );
}

function CalculatorArb() {
  const [odds1, setOdds1] = useState("2.10");
  const [odds2, setOdds2] = useState("2.10");
  const [stake, setStake] = useState("100");
  const total = 1 / (Number(odds1) || 0) + 1 / (Number(odds2) || 0);
  const isArb = total < 1;
  const profitPct = total < 1 ? (1 / total - 1) * 100 : 0;
  const st = Number(stake) || 0;
  const profit = isArb ? st * (1 / total - 1) : 0;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Arbitrage</h3>
      <div className="space-y-2 text-xs">
        <div>
          <label className="text-zinc-500">Odds 1</label>
          <input
            type="text"
            value={odds1}
            onChange={(e) => setOdds1(e.target.value)}
            className="w-full mt-0.5 rounded bg-zinc-700 px-2 py-1.5 font-mono"
          />
        </div>
        <div>
          <label className="text-zinc-500">Odds 2</label>
          <input
            type="text"
            value={odds2}
            onChange={(e) => setOdds2(e.target.value)}
            className="w-full mt-0.5 rounded bg-zinc-700 px-2 py-1.5 font-mono"
          />
        </div>
        <div>
          <label className="text-zinc-500">Total stake ($)</label>
          <input
            type="text"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="w-full mt-0.5 rounded bg-zinc-700 px-2 py-1.5 font-mono"
          />
        </div>
        {isArb ? (
          <div className="mt-3 text-emerald-400 font-mono">
            +{profitPct.toFixed(2)}% profit · ${profit.toFixed(2)}
          </div>
        ) : (
          <div className="mt-3 text-zinc-500">No arb</div>
        )}
      </div>
    </div>
  );
}

function CalculatorKelly() {
  const [odds, setOdds] = useState("2.50");
  const [prob, setProb] = useState("45");
  const [bankroll, setBankroll] = useState("1000");
  const [frac, setFrac] = useState("0.5");
  const o = Number(odds) || 2;
  const p = (Number(prob) || 40) / 100;
  const q = 1 - p;
  const b = o - 1;
  const full = b > 0 ? (b * p - q) / b : 0;
  const kelly = Math.max(0, Math.min(1, full * (Number(frac) || 0.5)));
  const br = Number(bankroll) || 0;
  const stake = br * kelly;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Kelly</h3>
      <div className="space-y-2 text-xs">
        <div>
          <label className="text-zinc-500">Decimal odds</label>
          <input
            type="text"
            value={odds}
            onChange={(e) => setOdds(e.target.value)}
            className="w-full mt-0.5 rounded bg-zinc-700 px-2 py-1.5 font-mono"
          />
        </div>
        <div>
          <label className="text-zinc-500">Your prob (%)</label>
          <input
            type="text"
            value={prob}
            onChange={(e) => setProb(e.target.value)}
            className="w-full mt-0.5 rounded bg-zinc-700 px-2 py-1.5 font-mono"
          />
        </div>
        <div>
          <label className="text-zinc-500">Bankroll ($)</label>
          <input
            type="text"
            value={bankroll}
            onChange={(e) => setBankroll(e.target.value)}
            className="w-full mt-0.5 rounded bg-zinc-700 px-2 py-1.5 font-mono"
          />
        </div>
        <div>
          <label className="text-zinc-500">Fraction (0.5 = half)</label>
          <input
            type="text"
            value={frac}
            onChange={(e) => setFrac(e.target.value)}
            className="w-full mt-0.5 rounded bg-zinc-700 px-2 py-1.5 font-mono"
          />
        </div>
        <div className="mt-3 text-emerald-400 font-mono">
          {(kelly * 100).toFixed(1)}% · ${stake.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function CalculatorOdds() {
  const [decimal, setDecimal] = useState("2.50");
  const d = Number(decimal) || 2;
  const implied = d > 0 ? (1 / d) * 100 : 0;
  const american = d >= 2 ? (d - 1) * 100 : d <= 1 ? -100 / (d - 1) : 0;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Odds converter</h3>
      <div className="space-y-2 text-xs">
        <div>
          <label className="text-zinc-500">Decimal</label>
          <input
            type="text"
            value={decimal}
            onChange={(e) => setDecimal(e.target.value)}
            className="w-full mt-0.5 rounded bg-zinc-700 px-2 py-1.5 font-mono"
          />
        </div>
        <div className="mt-3 space-y-1 font-mono text-zinc-300">
          <div>Implied: {implied.toFixed(1)}%</div>
          <div>American: {american >= 0 ? `+${american.toFixed(0)}` : american.toFixed(0)}</div>
        </div>
      </div>
    </div>
  );
}

function EventCard({
  event,
  compact = false,
  bankroll = 0,
  isFave = false,
  onToggleFave,
}: {
  event: EventWithBestOdds;
  compact?: boolean;
  bankroll?: number;
  isFave?: boolean;
  onToggleFave?: () => void;
}) {
  const date = new Date(event.commenceTime);
  return (
    <div
      className={`rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 ${
        compact ? "p-3" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-sm font-medium text-zinc-300 min-w-0">
          {event.eventName}
        </div>
        {onToggleFave && (
          <button
            onClick={onToggleFave}
            className="shrink-0 p-1 rounded hover:bg-zinc-800/50 transition-colors"
            title={isFave ? "Remove from favorites" : "Add to favorites"}
            aria-label={isFave ? "Remove from favorites" : "Add to favorites"}
          >
            {isFave ? "★" : "☆"}
          </button>
        )}
      </div>
      <div className="text-xs text-zinc-500 mb-3">{formatEventTime(event.commenceTime)}</div>

      {/* Moneyline */}
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(event.outcomesBySelection).map(([name, data]) => {
          const stake =
            bankroll > 0 &&
            data.kellyFraction != null &&
            data.kellyFraction > 0
              ? bankroll * data.kellyFraction
              : 0;
          const profitIfWin = stake > 0 ? stake * (data.bestOdds - 1) : 0;
          return (
            <div
              key={name}
              className={`flex items-center justify-between gap-3 rounded px-3 py-2 ${
                data.isValue
                  ? "bg-emerald-950/40 border border-emerald-800/50"
                  : "bg-zinc-800/50"
              }`}
            >
              <div className="flex min-w-0 shrink-0 items-center gap-2">
                <span className="font-medium leading-none">{name}</span>
                {data.isValue && (
                  <span className="shrink-0 text-[10px] font-semibold uppercase leading-none text-emerald-400 bg-emerald-900/50 px-1.5 py-0.5 rounded">
                    +EV
                  </span>
                )}
              </div>
              <div className="flex min-w-0 shrink-0 flex-col items-end justify-center text-right">
                <a
                  href={getBookLink(data.bestBook)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 font-mono text-sm leading-none hover:underline"
                >
                  {data.bestOdds.toFixed(2)} @ {data.bestBook} ↗
                </a>
                {data.kellyFraction !== undefined && data.kellyFraction > 0 && (
                  <div className="text-xs text-zinc-500">
                    Kelly: {(data.kellyFraction * 100).toFixed(1)}%
                  </div>
                )}
                {stake > 0 && (
                  <div className="text-[10px] text-zinc-500 mt-0.5 space-y-0.5">
                    <span className="text-zinc-400">Stake ${stake.toFixed(2)}</span>
                    <span className="text-emerald-400 block">
                      +${profitIfWin.toFixed(2)} profit
                    </span>
                    <span className="text-red-400/80 block">
                      −${stake.toFixed(2)} loss
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Spreads */}
      {event.spreadsBySelection &&
        Object.keys(event.spreadsBySelection).length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-zinc-500 mb-2 font-medium">
              Spreads
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {Object.entries(event.spreadsBySelection).map(([label, data]) => (
                <div
                  key={label}
                  className={`flex items-center justify-between gap-2 rounded px-2.5 py-1.5 text-sm ${
                    data.isValue
                      ? "bg-emerald-950/30 border border-emerald-800/40"
                      : "bg-zinc-800/40"
                  }`}
                >
                  <span className="font-mono text-zinc-300 leading-none">{label}</span>
                  <a
                    href={getBookLink(data.bestBook)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 font-mono text-xs leading-none hover:underline"
                  >
                    {data.bestOdds.toFixed(2)} @ {data.bestBook} ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Totals */}
      {event.totalsBySelection &&
        Object.keys(event.totalsBySelection).length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-zinc-500 mb-2 font-medium">
              Totals (O/U)
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {Object.entries(event.totalsBySelection).map(([label, data]) => (
                <div
                  key={label}
                  className={`flex items-center justify-between gap-2 rounded px-2.5 py-1.5 text-sm ${
                    data.isValue
                      ? "bg-emerald-950/30 border border-emerald-800/40"
                      : "bg-zinc-800/40"
                  }`}
                >
                  <span className="font-mono text-zinc-300 leading-none">{label}</span>
                  <a
                    href={getBookLink(data.bestBook)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 font-mono text-xs leading-none hover:underline"
                  >
                    {data.bestOdds.toFixed(2)} @ {data.bestBook} ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* All books */}
      {!compact && (
        <details className="mt-3">
          <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
            All books
          </summary>
          <div className="mt-3 space-y-3">
            {Object.entries(event.outcomesBySelection).map(([name, data]) => (
              <div key={name}>
                <div className="text-xs font-medium text-zinc-400 mb-1.5">
                  {name}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                  {data.allOffers.map((o) => (
                    <div
                      key={o.book}
                      className="flex justify-between text-xs font-mono"
                    >
                      <span className="text-zinc-500">{o.book}</span>
                      <span className="text-zinc-300 tabular-nums">
                        {o.decimalOdds.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {event.spreadsBySelection &&
              Object.entries(event.spreadsBySelection).map(
                ([label, data]) =>
                  data.allOffers.length > 0 && (
                    <div key={label}>
                      <div className="text-xs font-medium text-zinc-400 mb-1.5">
                        {label}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                        {data.allOffers.map((o) => (
                          <div
                            key={o.book}
                            className="flex justify-between text-xs font-mono"
                          >
                            <span className="text-zinc-500">{o.book}</span>
                            <span className="text-zinc-300 tabular-nums">
                              {o.decimalOdds.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
              )}
            {event.totalsBySelection &&
              Object.entries(event.totalsBySelection).map(
                ([label, data]) =>
                  data.allOffers.length > 0 && (
                    <div key={label}>
                      <div className="text-xs font-medium text-zinc-400 mb-1.5">
                        {label}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                        {data.allOffers.map((o) => (
                          <div
                            key={o.book}
                            className="flex justify-between text-xs font-mono"
                          >
                            <span className="text-zinc-500">{o.book}</span>
                            <span className="text-zinc-300 tabular-nums">
                              {o.decimalOdds.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
              )}
          </div>
        </details>
      )}
    </div>
  );
}
