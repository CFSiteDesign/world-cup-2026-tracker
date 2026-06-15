import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MATCHES as FALLBACK_MATCHES, getTeam, type Match, type Stage,
} from "@/lib/worldcup-data";
import { getWorldCup } from "@/lib/worldcup.functions";
import { isEnglandMatch, scorePrediction, type Prediction } from "@/lib/england-utils";
import { MobileTabBar } from "@/components/MobileTabBar";
import { EnglandCountdown } from "@/components/EnglandCountdown";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — World Cup 26 Predictions" },
      { name: "description", content: "Predictions leaderboard for the FIFA World Cup 2026. Filter by England, group stage and knockouts." },
    ],
  }),
  component: LeaderboardPage,
});

type FilterKey =
  | "ENG"
  | "ALL"
  | "Group Stage"
  | "Round of 32"
  | "Round of 16"
  | "Quarter-final"
  | "Semi-final"
  | "Third place"
  | "Final";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ENG", label: "England" },
  { key: "ALL", label: "All" },
  { key: "Group Stage", label: "Groups" },
  { key: "Round of 32", label: "R32" },
  { key: "Round of 16", label: "R16" },
  { key: "Quarter-final", label: "QF" },
  { key: "Semi-final", label: "SF" },
  { key: "Third place", label: "3rd" },
  { key: "Final", label: "Final" },
];

function LeaderboardPage() {
  const [filter, setFilter] = useState<FilterKey>("ENG");
  const [player, setPlayer] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("wc-player");
    if (saved) setPlayer(saved);
  }, []);

  const { data: wc } = useQuery({
    queryKey: ["worldcup"],
    queryFn: () => getWorldCup(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: preds } = useQuery({
    queryKey: ["predictions"],
    queryFn: async (): Promise<Prediction[]> => {
      const { data, error } = await supabase
        .from("predictions")
        .select("id,player_name,match_id,home_pred,away_pred");
      if (error) throw error;
      return data as Prediction[];
    },
    refetchInterval: 15_000,
  });

  const matches: Match[] = wc?.matches?.length ? wc.matches : FALLBACK_MATCHES;

  const filteredMatches = useMemo(() => {
    if (filter === "ALL") return matches;
    if (filter === "ENG") return matches.filter(isEnglandMatch);
    return matches.filter(m => m.stage === (filter as Stage));
  }, [matches, filter]);

  const matchIds = useMemo(() => new Set(filteredMatches.map(m => m.id)), [filteredMatches]);

  const board = useMemo(() => {
    if (!preds) return [];
    const byPlayer = new Map<string, { name: string; points: number; exacts: number; scored: number }>();
    for (const p of preds) {
      if (!matchIds.has(p.match_id)) continue;
      const m = matches.find(x => x.id === p.match_id);
      if (!m) continue;
      const s = scorePrediction(p, m);
      const entry = byPlayer.get(p.player_name) ?? { name: p.player_name, points: 0, exacts: 0, scored: 0 };
      if (s) {
        entry.points += s.points;
        if (s.exact) entry.exacts += 1;
        entry.scored += 1;
      }
      byPlayer.set(p.player_name, entry);
    }
    return Array.from(byPlayer.values())
      .filter(r => r.scored > 0)
      .sort((a, b) => b.points - a.points || b.exacts - a.exacts);
  }, [preds, matches, matchIds]);

  const scoredFixtures = filteredMatches.filter(
    m => typeof m.homeScore === "number" && typeof m.awayScore === "number"
  );

  return (
    <div className="relative min-h-screen bg-broadcast bg-grain">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl hairline-b">
        <div className="max-w-6xl mx-auto px-3 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="size-8 sm:size-9 rounded-lg bg-card grid place-items-center ring-hairline shrink-0">
              <span className="font-display text-[10px] font-extrabold text-pitch">LB</span>
            </div>
            <div className="leading-none min-w-0">
              <div className="font-display text-base sm:text-xl font-extrabold tracking-tight uppercase truncate">
                Leaderboard
              </div>
              <div className="label-micro mt-1.5 hidden sm:block group-hover:text-foreground transition-colors">
                ← Back to schedule
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link to="/" className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Home
            </Link>
            <Link to="/predict" className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Predict
            </Link>
            <Link to="/bracket" className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Bracket
            </Link>
            <Link to="/results" className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Results
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8 pb-28 sm:pb-12">
        <div>
          <div className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-pitch mb-2">
            Shared board
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
            Predictions leaderboard
          </h1>
          <div className="label-micro mt-3">
            3 pts exact scoreline · 1 pt correct result · only finished matches count
          </div>
        </div>

        {/* Stage filter — horizontal scroll on mobile */}
        <div className="-mx-4 sm:mx-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 px-4 sm:px-0 min-w-max">
            {FILTERS.map(f => {
              const active = f.key === filter;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={
                    "font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider px-3.5 py-2 rounded-lg ring-hairline transition-colors " +
                    (active
                      ? "bg-pitch text-background"
                      : "bg-surface text-muted-foreground hover:text-foreground")
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatTile label="Players" value={board.length} />
          <StatTile label="Scored" value={scoredFixtures.length} />
          <StatTile label="Fixtures" value={filteredMatches.length} />
        </div>

        {/* Leaderboard table */}
        <section>
          <SectionHeader label={FILTERS.find(f => f.key === filter)?.label ?? "Leaderboard"} />
          <div className="overflow-hidden rounded-xl bg-card shadow-card">
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <th className="text-left px-3 py-2.5 label-micro w-8">#</th>
                  <th className="text-left px-2 py-2.5 label-micro">Player</th>
                  <th className="px-2 py-2.5 label-micro">Scored</th>
                  <th className="px-2 py-2.5 label-micro">Exact</th>
                  <th className="px-2 py-2.5 label-micro" style={{ color: "var(--pitch)" }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {board.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="size-10 rounded-full bg-surface ring-hairline grid place-items-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-pitch" aria-hidden="true">
                            <path d="M5 4h14v6a7 7 0 0 1-14 0V4zM9 21h6M12 17v4" />
                          </svg>
                        </div>
                        <div className="font-display text-sm font-extrabold uppercase tracking-tight">
                          {scoredFixtures.length === 0 ? "Nothing to score yet" : "No predictions land here"}
                        </div>
                        <div className="label-micro max-w-xs">
                          {scoredFixtures.length === 0
                            ? "Once a match wraps up, points appear here automatically."
                            : "Be the first to put a tip on these fixtures."}
                        </div>
                        <Link
                          to="/predict"
                          className="mt-1 font-display text-[11px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-pitch text-background hover:opacity-90 transition-opacity"
                        >
                          Make a prediction
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
                {board.map((row, i) => (
                  <tr key={row.name} className="hairline-b last:border-0">
                    <td className="px-3 py-3 font-display text-sm font-extrabold tabular-nums text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="px-2 py-3 font-display text-sm font-extrabold uppercase tracking-tight">
                      <span className={row.name === player ? "text-pitch" : ""}>{row.name}</span>
                    </td>
                    <td className="text-center px-2 py-3 font-display text-sm font-extrabold tabular-nums text-muted-foreground">
                      {row.scored}
                    </td>
                    <td className="text-center px-2 py-3 font-display text-sm font-extrabold tabular-nums">
                      {row.exacts}
                    </td>
                    <td className="text-center px-2 py-3 font-display text-base font-extrabold tabular-nums text-pitch">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Scored fixtures snapshot */}
        {scoredFixtures.length > 0 && (
          <section>
            <SectionHeader label="Counted fixtures" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scoredFixtures.map(m => {
                const home = wc?.names?.[m.homeCode] ?? getTeam(m.homeCode).name;
                const away = wc?.names?.[m.awayCode] ?? getTeam(m.awayCode).name;
                return (
                  <div key={m.id} className="rounded-lg bg-card ring-hairline px-3 py-2.5 flex items-center justify-between gap-3">
                    <div className="font-display text-xs font-extrabold uppercase tracking-tight truncate">
                      {home} <span className="text-muted-foreground">vs</span> {away}
                    </div>
                    <div className="scoreline text-base tabular-nums text-foreground shrink-0">
                      {m.homeScore}–{m.awayScore}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <footer className="hairline-t pt-6 pb-12 flex items-center justify-between flex-wrap gap-2">
          <Link to="/predict" className="label-micro hover:text-foreground transition-colors">
            ← Make a prediction
          </Link>
          <div className="label-micro">Shared board</div>
        </footer>
      </main>
      <MobileTabBar />
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.12em] text-foreground">{label}</h2>
      <div className="flex-1 h-px bg-[var(--hairline)]" />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card shadow-card px-4 py-3 ring-hairline">
      <div className="label-micro">{label}</div>
      <div className="scoreline text-2xl sm:text-3xl text-foreground mt-1 tabular-nums">{value}</div>
    </div>
  );
}
