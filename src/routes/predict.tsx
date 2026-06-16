import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MATCHES as FALLBACK_MATCHES, getTeam, matchStatus, type Match, type Region,
} from "@/lib/worldcup-data";
import { getWorldCup } from "@/lib/worldcup.functions";
import {
  ENG, isEnglandMatch, dualKickoff, scorePrediction, type Prediction,
} from "@/lib/england-utils";
import { MobileTabBar } from "@/components/MobileTabBar";
import { EnglandCountdown } from "@/components/EnglandCountdown";
import { toast } from "sonner";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Predictions — World Cup 26 England" },
      { name: "description", content: "Shared score predictions board for England's World Cup 2026 matches." },
    ],
  }),
  component: PredictPage,
});

function PredictPage() {
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<string>("");
  const [nameInput, setNameInput] = useState("");
  const [region, setRegion] = useState<Region>("UK");
  const qc = useQueryClient();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("wc-player");
    if (saved) setPlayer(saved);
    const savedRegion = localStorage.getItem("wc-region");
    if (savedRegion === "AU" || savedRegion === "UK") setRegion(savedRegion);
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("wc-region", region);
  }, [region]);

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
  const liveNames = wc?.names ?? {};
  const crests = wc?.crests ?? {};

  const englandMatches = useMemo(
    () => matches.filter(isEnglandMatch).sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC)),
    [matches]
  );

  const teamName = (code: string) => (liveNames[code] ?? getTeam(code).name).toUpperCase();
  const teamView = (code: string) => ({
    code,
    name: liveNames[code] ?? getTeam(code).name,
    crest: crests[code],
    flag: getTeam(code).flag,
  });

  const setName = (name: string) => {
    const n = name.trim().slice(0, 40);
    if (!n) return;
    setPlayer(n);
    localStorage.setItem("wc-player", n);
  };

  /* leaderboard */
  const board = useMemo(() => {
    if (!preds) return [];
    const byPlayer = new Map<string, { name: string; points: number; exacts: number; perMatch: Record<string, number> }>();
    for (const p of preds) {
      const m = matches.find(x => x.id === p.match_id);
      if (!m) continue;
      const s = scorePrediction(p, m);
      const entry = byPlayer.get(p.player_name) ?? { name: p.player_name, points: 0, exacts: 0, perMatch: {} };
      if (s) {
        entry.points += s.points;
        if (s.exact) entry.exacts += 1;
        entry.perMatch[p.match_id] = s.points;
      }
      byPlayer.set(p.player_name, entry);
    }
    return Array.from(byPlayer.values()).sort((a, b) => b.points - a.points || b.exacts - a.exacts);
  }, [preds, matches]);

  return (
    <div className="relative min-h-screen bg-broadcast bg-grain">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl hairline-b">
        <div className="max-w-6xl mx-auto px-3 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="size-20 sm:size-24 rounded-lg overflow-hidden grid place-items-center shrink-0">
              <img src="/__l5e/assets-v1/2fd63e31-5ec5-43e8-99cb-7ff96b8c50d3/wc26-logo.png" alt="World Cup 26 Tracker logo" className="w-full h-full object-contain" />
            </div>
            <div className="leading-none min-w-0">
              <div className="font-display text-base sm:text-xl font-extrabold tracking-tight uppercase truncate">
                Predictions
              </div>
              <div className="label-micro mt-1.5 hidden sm:block group-hover:text-foreground transition-colors">
                ← Back to schedule
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link to="/" className="hidden sm:inline-block font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Home
            </Link>
            <Link to="/bracket" className="hidden sm:inline-block font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Bracket
            </Link>
            <Link to="/leaderboard" className="hidden sm:inline-block font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Board
            </Link>
            <Link to="/results" className="hidden sm:inline-block font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Results
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10 pb-28 sm:pb-12">
        <div>
          <div className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-pitch mb-2">
            Group board
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
            England score predictions
          </h1>
          <div className="label-micro mt-3">
            3 pts exact scoreline · 1 pt correct result · locks at kickoff
          </div>
        </div>

        <EnglandCountdown matches={matches} names={liveNames} variant="banner" />



        {/* Player picker */}
        <section className="rounded-xl bg-card shadow-card p-5 sm:p-6 animate-fade-up">
          {!mounted ? (
            <div className="label-micro">Loading…</div>
          ) : !player ? (
            <form
              onSubmit={(e) => { e.preventDefault(); setName(nameInput); }}
              className="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
            >
              <div className="label-micro">Who's predicting?</div>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                maxLength={40}
                className="flex-1 bg-surface ring-hairline rounded-lg px-3 py-2 font-display text-sm font-extrabold uppercase tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pitch"
              />
              <button
                type="submit"
                className="font-display text-xs font-extrabold uppercase tracking-wider px-4 py-2 rounded-lg bg-pitch text-background hover:opacity-90 transition-opacity"
              >
                Enter
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="label-micro">Playing as</div>
                <div className="font-display text-xl font-extrabold uppercase tracking-tight mt-1">{player}</div>
              </div>
              <button
                onClick={() => { localStorage.removeItem("wc-player"); setPlayer(""); setNameInput(""); }}
                className="label-micro hover:text-foreground transition-colors"
              >
                Switch name
              </button>
            </div>
          )}
        </section>

        {/* Predictions */}
        <section>
          <SectionHeader label="Your predictions" />
          <div className="space-y-3">
            {englandMatches.map((m, i) => (
              <div key={m.id} className="animate-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
                <PredictionRow
                  match={m}
                  now={now}
                  mounted={mounted}
                  player={player}
                  preds={preds ?? []}
                  teamName={teamName}
                  teamView={teamView}
                  onChange={() => qc.invalidateQueries({ queryKey: ["predictions"] })}
                />
              </div>
            ))}
            {englandMatches.length === 0 && (
              <div className="label-micro text-center py-10">No England fixtures yet.</div>
            )}
          </div>
        </section>

        {/* Leaderboard */}
        <section>
          <SectionHeader label="Leaderboard" />
          <div className="overflow-hidden rounded-xl bg-card shadow-card">
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <th className="text-left px-3 py-2.5 label-micro w-8">#</th>
                  <th className="text-left px-2 py-2.5 label-micro">Player</th>
                  <th className="px-2 py-2.5 label-micro">Exact</th>
                  <th className="px-2 py-2.5 label-micro" style={{ color: "var(--pitch)" }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {board.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-10 label-micro">No scored predictions yet.</td></tr>
                )}
                {board.map((row, i) => (
                  <tr key={row.name} className="hairline-b last:border-0">
                    <td className="px-3 py-3 font-display text-sm font-extrabold tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-3 font-display text-sm font-extrabold uppercase tracking-tight">
                      <span className={row.name === player ? "text-pitch" : ""}>{row.name}</span>
                    </td>
                    <td className="text-center px-2 py-3 font-display text-sm font-extrabold tabular-nums">{row.exacts}</td>
                    <td className="text-center px-2 py-3 font-display text-base font-extrabold tabular-nums text-pitch">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="hairline-t pt-6 pb-12 flex items-center justify-between flex-wrap gap-2">
          <Link to="/" className="label-micro hover:text-foreground transition-colors">← Back to schedule</Link>
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

function PredictionRow({ match, now, mounted, player, preds, teamName, teamView, onChange }: {
  match: Match; now: Date; mounted: boolean; player: string;
  preds: Prediction[]; teamName: (c: string) => string;
  teamView: (c: string) => { code: string; name: string; crest?: string; flag?: string };
  onChange: () => void;
}) {
  const status = matchStatus(match, now);
  const locked = status !== "UPCOMING";
  const dual = dualKickoff(match.kickoffUTC);

  const mine = preds.find(p => p.match_id === match.id && p.player_name === player);
  const [home, setHome] = useState<string>("");
  const [away, setAway] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHome(mine ? String(mine.home_pred) : "");
    setAway(mine ? String(mine.away_pred) : "");
  }, [mine?.id, mine?.home_pred, mine?.away_pred]);

  const otherPreds = preds.filter(p => p.match_id === match.id && p.player_name !== player);

  const submit = async () => {
    if (!player || locked) return;
    const h = parseInt(home, 10), a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      toast.error("Enter valid scores");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("predictions").upsert(
      { player_name: player, match_id: match.id, home_pred: h, away_pred: a, updated_at: new Date().toISOString() },
      { onConflict: "player_name,match_id" }
    );
    setSaving(false);
    if (error) {
      toast.error("Could not save", { description: error.message });
      return;
    }
    toast.success(`${teamName(match.homeCode)} ${h}–${a} ${teamName(match.awayCode)}`, {
      description: "Prediction saved",
    });
    onChange();
  };


  const homeName = teamName(match.homeCode);
  const awayName = teamName(match.awayCode);
  const ftScore = typeof match.homeScore === "number" && typeof match.awayScore === "number"
    ? `${match.homeScore}–${match.awayScore}` : null;

  return (
    <article className="rounded-xl bg-card shadow-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="label-micro">
          {match.stage.toUpperCase()}{match.group ? ` · GRP ${match.group}` : ""}
        </div>
        {ftScore ? (
          <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            FT {ftScore}
          </span>
        ) : locked ? (
          <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.12em] text-pitch">LOCKED</span>
        ) : (
          mounted && (
            <div className="text-right leading-tight">
              <div className="font-display text-xs font-extrabold tabular-nums">{dual.uk.time} {dual.uk.tz}</div>
              <div className="label-micro">{dual.au.time} {dual.au.tz} ({dual.au.day})</div>
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
        <div className="flex items-center justify-end gap-2 min-w-0">
          <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-tight truncate">
            {homeName}
          </span>
          <PredictCrest team={teamView(match.homeCode)} />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} max={30}
            value={home} onChange={e => setHome(e.target.value)}
            disabled={locked || !player}
            className="w-14 text-center bg-surface ring-hairline rounded-lg py-2 scoreline text-xl text-foreground disabled:opacity-50"
          />
          <span className="font-display text-xs font-extrabold text-muted-foreground">–</span>
          <input
            type="number" min={0} max={30}
            value={away} onChange={e => setAway(e.target.value)}
            disabled={locked || !player}
            className="w-14 text-center bg-surface ring-hairline rounded-lg py-2 scoreline text-xl text-foreground disabled:opacity-50"
          />
        </div>
        <div className="flex items-center justify-start gap-2 min-w-0">
          <PredictCrest team={teamView(match.awayCode)} />
          <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-tight truncate">
            {awayName}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 hairline-t flex items-center justify-between gap-3 flex-wrap">
        <div className="label-micro">
          {otherPreds.length === 0 ? "No one else predicted yet" :
            otherPreds.map(p => `${p.player_name} ${p.home_pred}–${p.away_pred}`).join(" · ")}
        </div>
        {!locked && player && (
          <button
            onClick={submit}
            disabled={saving}
            className="font-display text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-pitch text-background hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : mine ? "Update" : "Submit"}
          </button>
        )}
        
      </div>
    </article>
  );
}

function PredictCrest({ team }: { team: { code: string; name: string; crest?: string; flag?: string } }) {
  if (team.code === "ENG") {
    return (
      <div className="size-7 rounded-md bg-surface grid place-items-center shrink-0 ring-hairline overflow-hidden" aria-label="England flag">
        <svg viewBox="0 0 5 3" className="size-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="5" height="3" fill="#ffffff" />
          <rect x="2" width="1" height="3" fill="#CE1124" />
          <rect y="1" width="5" height="1" fill="#CE1124" />
        </svg>
      </div>
    );
  }
  const flag = team.flag;
  if (flag && flag !== "⚽" && team.code !== "TBD") {
    return (
      <div className="size-7 rounded-md bg-surface grid place-items-center shrink-0 ring-hairline">
        <span role="img" aria-label={`${team.name} flag`} className="text-lg leading-none">
          {flag}
        </span>
      </div>
    );
  }
  return (
    <div className="size-7 rounded-md bg-surface grid place-items-center shrink-0 ring-hairline">
      <span className="font-display text-[10px] font-extrabold uppercase tracking-tighter">{team.code}</span>
    </div>
  );
}

