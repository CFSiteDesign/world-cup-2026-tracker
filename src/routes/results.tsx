import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MATCHES as FALLBACK_MATCHES, BROADCASTERS, TIMEZONES,
  getTeam, formatKickoff, matchStatus, type Region, type Match,
} from "@/lib/worldcup-data";
import { getWorldCup } from "@/lib/worldcup.functions";
import { MobileTabBar } from "@/components/MobileTabBar";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results — World Cup 26 Broadcast Tracker" },
      { name: "description", content: "Final scores from completed FIFA World Cup 2026 matches." },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const [region, setRegion] = useState<Region>("UK");
  const [now, setNow] = useState(new Date());

  const { data } = useQuery({
    queryKey: ["worldcup"],
    queryFn: () => getWorldCup(),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("wc-region")) as Region | null;
    if (saved === "AU" || saved === "UK") setRegion(saved);
    const i = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);

  const matches: Match[] = data?.matches?.length ? data.matches : FALLBACK_MATCHES;
  const crests = data?.crests ?? {};
  const liveNames = data?.names ?? {};

  const finished = useMemo(
    () =>
      [...matches]
        .filter(m => matchStatus(m, now) === "FT" && typeof m.homeScore === "number" && typeof m.awayScore === "number")
        .sort((a, b) => b.kickoffUTC.localeCompare(a.kickoffUTC)),
    [matches, now]
  );

  const teamView = (code: string) => {
    const base = getTeam(code);
    return {
      code,
      name: (liveNames[code] ?? base.name).toUpperCase(),
      crest: crests[code] as string | undefined,
    };
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of finished) {
      const key = formatKickoff(m.kickoffUTC, region).day;
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [finished, region]);

  return (
    <div className="relative min-h-screen bg-broadcast bg-grain">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl hairline-b">
        <div className="max-w-6xl mx-auto px-3 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="size-8 sm:size-9 rounded-lg bg-card grid place-items-center ring-hairline shrink-0">
              <span className="font-display text-[10px] font-extrabold text-pitch">FT</span>
            </div>
            <div className="leading-none min-w-0">
              <div className="font-display text-base sm:text-xl font-extrabold tracking-tight uppercase truncate">
                Results
              </div>
              <div className="label-micro mt-1.5 hidden sm:block group-hover:text-foreground transition-colors">
                ← Back to schedule
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link to="/" className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Home
            </Link>
            <Link to="/bracket" className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Bracket
            </Link>
            <Link to="/predict" className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Predict
            </Link>
            <Link to="/leaderboard" className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Board
            </Link>
            <div className="label-micro hidden sm:block">{TIMEZONES[region].label}</div>
            <div className="relative inline-flex p-1 rounded-full bg-card ring-hairline">
              <div
                className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-full bg-pitch transition-transform duration-200 ease-out"
                style={{ transform: region === "UK" ? "translateX(0)" : "translateX(100%)" }}
              />
              {(["UK", "AU"] as Region[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`relative z-10 px-3 sm:px-4 py-1 sm:py-1.5 font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider rounded-full transition-colors duration-200 ${
                    region === r ? "text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "UK" ? "UK" : "AUS"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>


      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        <div>
          <div className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-pitch mb-2">
            Full time
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
            Recent results
          </h1>
          <div className="label-micro mt-3">
            {finished.length} completed {finished.length === 1 ? "match" : "matches"} · {BROADCASTERS[region].channel}
          </div>
        </div>

        {grouped.length === 0 && (
          <div className="rounded-xl bg-card shadow-card py-20 text-center">
            <div className="font-display text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
              No completed matches yet
            </div>
            <div className="label-micro mt-3">Check back once games are full time</div>
          </div>
        )}

        <div className="space-y-10">
          {grouped.map(([day, list]) => (
            <section key={day}>
              <div className="sticky top-16 z-20 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/85 backdrop-blur-md hairline-b">
                <div className="font-display text-sm font-extrabold uppercase tracking-[0.14em] flex items-center gap-3">
                  <span>{day}</span>
                  <span className="label-micro">{list.length} {list.length === 1 ? "result" : "results"}</span>
                </div>
              </div>
              <div className="space-y-3 pt-4">
                {list.map((m, i) => (
                  <div key={m.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 6) * 35}ms` }}>
                    <ResultCard match={m} region={region} teamView={teamView} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="hairline-t pt-6 pb-12 flex items-center justify-between flex-wrap gap-2">
          <Link to="/" className="label-micro hover:text-foreground transition-colors">
            ← Back to schedule
          </Link>
          <div className="label-micro">Data · football-data.org</div>
        </footer>
      </main>
      <MobileTabBar />
    </div>
  );
}

function ResultCard({ match, region, teamView }: {
  match: Match; region: Region;
  teamView: (c: string) => { code: string; name: string; crest?: string };
}) {
  const home = teamView(match.homeCode);
  const away = teamView(match.awayCode);
  const { time, tzLabel } = formatKickoff(match.kickoffUTC, region);
  const hs = match.homeScore ?? 0;
  const as = match.awayScore ?? 0;
  const homeWin = hs > as;
  const awayWin = as > hs;

  return (
    <article className="relative rounded-xl bg-card shadow-card transition-all duration-200 hover:bg-[#1f242b]">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="label-micro">
            {match.stage.toUpperCase()}{match.group ? ` · GRP ${match.group}` : ""}
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface">
            <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">FT</span>
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-3 min-w-0 justify-end">
            <span className={`font-display text-base sm:text-lg font-extrabold uppercase tracking-tight truncate ${homeWin ? "text-foreground" : "text-muted-foreground"}`}>
              {home.name}
            </span>
            <Crest team={home} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`scoreline text-2xl sm:text-3xl ${homeWin ? "text-foreground" : "text-muted-foreground"}`}>{hs}</span>
            <span className="font-display text-xs font-extrabold text-muted-foreground">–</span>
            <span className={`scoreline text-2xl sm:text-3xl ${awayWin ? "text-foreground" : "text-muted-foreground"}`}>{as}</span>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <Crest team={away} />
            <span className={`font-display text-base sm:text-lg font-extrabold uppercase tracking-tight truncate ${awayWin ? "text-foreground" : "text-muted-foreground"}`}>
              {away.name}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 hairline-t flex items-center justify-between gap-3">
          <div className="label-micro truncate">
            {match.venue || ""}{match.venue && match.city ? " · " : ""}{match.city || ""}
          </div>
          <div className="label-micro">{time} {tzLabel}</div>
        </div>
      </div>
    </article>
  );
}

function Crest({ team }: { team: { code: string; name: string; crest?: string } }) {
  if (team.crest) {
    return (
      <div className="size-9 rounded-lg bg-surface grid place-items-center overflow-hidden shrink-0 ring-hairline">
        <img src={team.crest} alt="" className="w-[72%] h-[72%] object-contain" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="size-9 rounded-lg bg-surface grid place-items-center shrink-0 ring-hairline">
      <span className="font-display text-xs font-extrabold uppercase tracking-tighter">{team.code}</span>
    </div>
  );
}
