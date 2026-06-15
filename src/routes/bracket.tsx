import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MATCHES as FALLBACK_MATCHES, getTeam, formatKickoff, matchStatus,
  type Match, type Stage,
} from "@/lib/worldcup-data";
import { getWorldCup } from "@/lib/worldcup.functions";
import { ENG, dualKickoff } from "@/lib/england-utils";

export const Route = createFileRoute("/bracket")({
  head: () => ({
    meta: [
      { title: "Knockout bracket — World Cup 26 England" },
      { name: "description", content: "Road to the Final for the 2026 World Cup knockouts, with England's path highlighted." },
    ],
  }),
  component: BracketPage,
});

const KO_STAGES: Stage[] = ["Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Third place", "Final"];

const SHORT: Record<Stage, string> = {
  "Group Stage": "Group",
  "Round of 32": "R32",
  "Round of 16": "R16",
  "Quarter-final": "QF",
  "Semi-final": "SF",
  "Third place": "3rd",
  "Final": "Final",
};

type TeamView = (code: string) => { code: string; name: string; crest?: string };

function BracketPage() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  const { data } = useQuery({
    queryKey: ["worldcup"],
    queryFn: () => getWorldCup(),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const matches: Match[] = data?.matches?.length ? data.matches : FALLBACK_MATCHES;
  const liveNames = data?.names ?? {};
  const crests = data?.crests ?? {};
  const teamView: TeamView = (code) => ({
    code,
    name: liveNames[code] ?? getTeam(code).name,
    crest: crests[code],
  });

  // group KO matches by stage
  const byStage = useMemo(() => {
    const map = new Map<Stage, Match[]>();
    for (const s of KO_STAGES) map.set(s, []);
    for (const m of matches) {
      if (KO_STAGES.includes(m.stage)) {
        map.get(m.stage)!.push(m);
      }
    }
    for (const s of KO_STAGES) {
      map.get(s)!.sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC));
    }
    return map;
  }, [matches]);

  // England path: any tie containing ENG or any tie whose bracketNote mentions England
  const isEnglandTie = (m: Match) =>
    m.homeCode === ENG || m.awayCode === ENG || /england/i.test(m.bracketNote ?? "");

  // feeder ties: when England's next KO opponent isn't decided, surface ties in the same stage
  const englandNextKO = useMemo(() => {
    const upcoming = matches
      .filter(m => KO_STAGES.includes(m.stage) && (m.homeCode === ENG || m.awayCode === ENG))
      .filter(m => matchStatus(m, now) !== "FT")
      .sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC));
    return upcoming[0];
  }, [matches, now]);

  const feederIds = useMemo(() => {
    if (!englandNextKO) return new Set<string>();
    return new Set(
      matches
        .filter(m =>
          m.stage === englandNextKO.stage &&
          m.id !== englandNextKO.id &&
          m.homeCode !== ENG && m.awayCode !== ENG &&
          matchStatus(m, now) !== "FT"
        )
        .map(m => m.id)
    );
  }, [matches, englandNextKO, now]);

  return (
    <div className="relative min-h-screen bg-broadcast bg-grain">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl hairline-b">
        <div className="max-w-6xl mx-auto px-3 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="size-8 sm:size-9 rounded-lg bg-card grid place-items-center ring-hairline shrink-0">
              <span className="font-display text-[10px] font-extrabold text-pitch">KO</span>
            </div>
            <div className="leading-none min-w-0">
              <div className="font-display text-base sm:text-xl font-extrabold tracking-tight uppercase truncate">
                Bracket
              </div>
              <div className="label-micro mt-1.5 hidden sm:block group-hover:text-foreground transition-colors">
                ← Back to schedule
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link to="/predict" className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Predict
            </Link>
            <Link to="/results" className="font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200">
              Results
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        <div>
          <div className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-pitch mb-2">
            Knockout phase
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
            Road to the Final
          </h1>
          <div className="label-micro mt-3">
            R32 through Final · England's path highlighted in pitch green
          </div>
        </div>

        {/* Mobile: vertical accordion by round · Desktop: 6-column grid */}
        <div className="sm:hidden space-y-3">
          {KO_STAGES.map(stage => (
            <RoundAccordion
              key={stage}
              stage={stage}
              ties={byStage.get(stage) ?? []}
              now={now}
              teamView={teamView}
              isEnglandTie={isEnglandTie}
              feederIds={feederIds}
              defaultOpen={
                // open the round England are next in, else R32
                stage === (englandNextKO?.stage ?? "Round of 32")
              }
            />
          ))}
        </div>

        <div className="hidden sm:grid sm:grid-cols-6 gap-4">
          {KO_STAGES.map(stage => (
            <Column
              key={stage}
              stage={stage}
              ties={byStage.get(stage) ?? []}
              now={now}
              teamView={teamView}
              isEnglandTie={isEnglandTie}
              feederIds={feederIds}
            />
          ))}
        </div>

        <div className="hairline-t pt-4 label-micro">
          Click any tie to see venue and dual kickoff times.
        </div>
      </main>
    </div>
  );
}

function Column({ stage, ties, now, teamView, isEnglandTie, feederIds }: {
  stage: Stage;
  ties: Match[];
  now: Date;
  teamView: TeamView;
  isEnglandTie: (m: Match) => boolean;
  feederIds: Set<string>;
}) {
  return (
    <section className="shrink-0 snap-start w-[78vw] sm:w-auto">
      <div className="label-micro mb-3 flex items-center gap-2">
        <span>{SHORT[stage]}</span>
        <span className="text-muted-foreground/60">·</span>
        <span className="text-muted-foreground">{ties.length}</span>
      </div>
      <div className="space-y-3">
        {ties.length === 0 && (
          <div className="rounded-xl bg-card shadow-card p-4 label-micro">
            To be scheduled
          </div>
        )}
        {ties.map(m => (
          <TieCard
            key={m.id}
            match={m}
            now={now}
            teamView={teamView}
            isEngland={isEnglandTie(m)}
            isFeeder={feederIds.has(m.id)}
          />
        ))}
      </div>
    </section>
  );
}

function TieCard({ match, now, teamView, isEngland, isFeeder }: {
  match: Match;
  now: Date;
  teamView: TeamView;
  isEngland: boolean;
  isFeeder: boolean;
}) {
  const [open, setOpen] = useState(false);
  const home = teamView(match.homeCode);
  const away = teamView(match.awayCode);
  const status = matchStatus(match, now);
  const ft = status === "FT";
  const live = status === "LIVE";
  const { time, tzLabel } = formatKickoff(match.kickoffUTC, "UK");
  const showDual = isEngland || match.stage === "Final";
  const dual = showDual ? dualKickoff(match.kickoffUTC) : null;

  return (
    <button
      type="button"
      onClick={() => setOpen(v => !v)}
      className={`group block w-full text-left rounded-xl bg-card shadow-card transition-all duration-200 hover:bg-[#1f242b] ${
        isEngland ? "ring-1 ring-pitch shadow-elevated" : "ring-hairline"
      } ${live ? "live-border" : ""}`}
    >
      <div className="p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`label-micro ${isEngland ? "text-pitch" : ""}`}>
            {isEngland ? "England's path" : isFeeder ? "Feeder tie" : SHORT[match.stage]}
          </span>
          {live ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pitch-soft">
              <span className="size-1 rounded-full bg-pitch animate-live" />
              <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.12em] text-pitch">Live</span>
            </span>
          ) : ft ? (
            <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">FT</span>
          ) : (
            <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground tabular-nums">
              {time} {tzLabel}
            </span>
          )}
        </div>

        <TieRow team={home} score={match.homeScore} ft={ft} highlight={isEngland && home.code === ENG} />
        <TieRow team={away} score={match.awayScore} ft={ft} highlight={isEngland && away.code === ENG} />

        {match.bracketNote && (home.code === "TBD" || away.code === "TBD") && (
          <div className="label-micro mt-2 text-muted-foreground/80 truncate">
            {match.bracketNote}
          </div>
        )}

        {open && (
          <div className="hairline-t mt-3 pt-3 space-y-1.5">
            <div className="label-micro">
              {match.venue} · {match.city}
            </div>
            {dual ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-display text-[11px] font-extrabold uppercase tracking-wider tabular-nums">
                <span>{dual.uk.day} {dual.uk.time} <span className="text-muted-foreground">{dual.uk.tz}</span></span>
                <span>{dual.au.day} {dual.au.time} <span className="text-muted-foreground">{dual.au.tz}</span></span>
              </div>
            ) : (
              <div className="font-display text-[11px] font-extrabold uppercase tracking-wider tabular-nums">
                {time} <span className="text-muted-foreground">{tzLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function TieRow({ team, score, ft, highlight }: {
  team: { code: string; name: string; crest?: string };
  score?: number;
  ft: boolean;
  highlight: boolean;
}) {
  const isTBD = team.code === "TBD";
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <TeamCrest team={team} />
        <span className={`font-display text-xs sm:text-sm font-extrabold uppercase tracking-tight truncate ${
          highlight ? "text-pitch" : isTBD ? "text-muted-foreground" : ""
        }`}>
          {isTBD ? "TBD" : team.name}
        </span>
      </div>
      {ft && typeof score === "number" ? (
        <span className="scoreline text-base sm:text-lg tabular-nums">{score}</span>
      ) : (
        <span className="font-display text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {team.code !== "TBD" ? team.code : ""}
        </span>
      )}
    </div>
  );
}

function TeamCrest({ team }: { team: { code: string; name: string; crest?: string } }) {
  if (team.crest) {
    return (
      <div className="size-6 rounded-md bg-surface grid place-items-center overflow-hidden shrink-0 ring-hairline">
        <img src={team.crest} alt="" className="w-[72%] h-[72%] object-contain" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="size-6 rounded-md bg-surface grid place-items-center shrink-0 ring-hairline">
      <span className="font-display text-[10px] font-extrabold uppercase tracking-tighter">
        {team.code === "TBD" ? "—" : team.code}
      </span>
    </div>
  );
}
