import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MATCHES as FALLBACK_MATCHES, STAGES, BROADCASTERS, TIMEZONES, ENGLAND_GROUP_TABLE,
  getTeam, formatKickoff, matchStatus, type Region, type Match, type Stage,
} from "@/lib/worldcup-data";
import { getWorldCup, type GroupTable } from "@/lib/worldcup.functions";
import {
  ENG, isGroupEMatch, dualKickoff, englandScenarios,
} from "@/lib/england-utils";
import { MobileTabBar } from "@/components/MobileTabBar";
import { EnglandCountdown } from "@/components/EnglandCountdown";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "World Cup 26 — Broadcast Tracker" },
      { name: "description", content: "Live FIFA World Cup 2026 fixtures, scores, group tables and broadcasters. Switch between Australia and England." },
    ],
  }),
  component: Tracker,
});

type Filter = Stage | "ALL" | "ENGLAND";

const FALLBACK_GROUPS: GroupTable[] = [
  { group: "E", rows: ENGLAND_GROUP_TABLE.map(r => ({ ...r, name: getTeam(r.code).name })) },
];

type TeamView = (code: string) => { code: string; name: string; crest?: string };

function Tracker() {
  const [region, setRegion] = useState<Region>("UK");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [now, setNow] = useState(new Date());

  const { data, isError, isLoading } = useQuery({
    queryKey: ["worldcup"],
    queryFn: () => getWorldCup(),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const matches: Match[] = data?.matches?.length ? data.matches : FALLBACK_MATCHES;
  const groups: GroupTable[] = data?.groups?.length ? data.groups : FALLBACK_GROUPS;
  const crests = data?.crests ?? {};
  const liveNames = data?.names ?? {};
  const isLive = !!data && data.matches.length > 0 && !isError;
  const dataReady = !isLoading && !!data;

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("wc-region")) as Region | null;
    if (saved === "AU" || saved === "UK") setRegion(saved);
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("wc-region", region);
  }, [region]);

  const teamView: TeamView = (code) => {
    const base = getTeam(code);
    return {
      code,
      name: (liveNames[code] ?? base.name).toUpperCase(),
      crest: crests[code],
    };
  };

  const sorted = useMemo(
    () => [...matches].sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC)),
    [matches]
  );

  const upcoming = useMemo(
    () => sorted.filter(m => matchStatus(m, now) !== "FT"),
    [sorted, now]
  );

  const filtered = useMemo(() => {
    if (filter === "ENGLAND") return upcoming.filter(isGroupEMatch);
    if (filter === "ALL") return upcoming;
    return upcoming.filter(m => m.stage === filter);
  }, [filter, upcoming]);

  const nextMatch = useMemo(
    () => sorted.find(m => matchStatus(m, now) !== "FT"),
    [sorted, now]
  );

  const live = sorted.filter(m => matchStatus(m, now) === "LIVE");
  const bc = BROADCASTERS[region];

  return (
    <div className="relative min-h-screen bg-broadcast bg-grain">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl hairline-b">
        <div className="max-w-6xl mx-auto px-3 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="size-12 sm:size-14 rounded-lg overflow-hidden grid place-items-center shrink-0">
              <img src="/__l5e/assets-v1/2fd63e31-5ec5-43e8-99cb-7ff96b8c50d3/wc26-logo.png" alt="World Cup 26 Tracker logo" className="w-full h-full object-contain" />
            </div>
            <div className="leading-none min-w-0">
              <div className="font-display text-base sm:text-xl font-extrabold tracking-tight uppercase truncate">
                WC 26
              </div>
              <div className="label-micro mt-1 sm:mt-1.5 truncate hidden sm:block">
                {isLive ? "Live · Football-Data" : "USA · Canada · Mexico"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              to="/bracket"
              className="hidden sm:inline-block font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Bracket
            </Link>
            <Link
              to="/predict"
              className="hidden sm:inline-block font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Predict
            </Link>
            <Link
              to="/leaderboard"
              className="hidden sm:inline-block font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Board
            </Link>
            <Link
              to="/results"
              className="hidden sm:inline-block font-display text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Results
            </Link>
            <RegionToggle region={region} setRegion={setRegion} />
          </div>
        </div>
      </header>


      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12 pb-28 sm:pb-12">
        {/* Hero / Next match */}
        {dataReady && nextMatch && <HeroMatch match={nextMatch} region={region} now={now} broadcaster={bc.channel} teamView={teamView} />}
        {!dataReady && <div className="h-48 sm:h-64 rounded-2xl bg-card/40 animate-pulse hairline" />}

        {/* England countdown */}
        <EnglandCountdown matches={matches} names={data?.names ?? {}} variant="hero" />

        {/* Live strip */}
        {live.length > 0 && (
          <section>
            <SectionHeader label="Live now" accent dot />
            <div className="grid sm:grid-cols-2 gap-3">
              {live.map((m, i) => (
                <div key={m.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <MatchCard match={m} region={region} now={now} teamView={teamView} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab bar — broadcast style */}
        <section>
          <TabBar filter={filter} setFilter={setFilter} />
        </section>

        {/* England spotlight */}
        {filter === "ENGLAND" && (
          <EnglandPanel now={now} matches={matches} groups={groups} teamView={teamView} region={region} />
        )}

        {/* Matches grouped by day */}
        <section>
          <DayGroupedList matches={filtered} region={region} now={now} teamView={teamView} />
          {filtered.length === 0 && (
            <div className="text-muted-foreground text-sm text-center py-16 label-micro">
              No matches for this filter
            </div>
          )}
        </section>

        {/* How to watch */}
        <section>
          <SectionHeader label="How to watch" />
          <div className="grid sm:grid-cols-2 gap-3">
            {(["UK", "AU"] as Region[]).map(r => {
              const b = BROADCASTERS[r];
              const active = r === region;
              return (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`group text-left rounded-xl p-5 transition-all duration-200 bg-card shadow-card ${active ? "ring-hairline" : "hover:bg-[#1f242b]"}`}
                  style={active ? { boxShadow: "inset 0 0 0 1px var(--pitch), 0 12px 28px -16px rgba(0,0,0,0.7)" } : undefined}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-display text-lg font-extrabold uppercase tracking-tight">
                      {r === "UK" ? "England" : "Australia"}
                    </div>
                    <span className="label-micro">{TIMEZONES[r].label}</span>
                  </div>
                  <div className={`font-display text-base font-extrabold uppercase ${active ? "text-pitch" : ""}`}>
                    {b.channel}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 leading-relaxed">{b.note}</div>
                  <div className="label-micro mt-3">Stream · {b.stream}</div>
                </button>
              );
            })}
          </div>
        </section>

        <footer className="hairline-t pt-6 pb-12 flex items-center justify-between flex-wrap gap-2">
          <div className="label-micro">
            Times in <span className="text-foreground">{TIMEZONES[region].label}</span>
          </div>
          <div className="label-micro">Data · football-data.org</div>
        </footer>
      </main>
      <MobileTabBar />
    </div>
  );
}

/* ============================================================
   PIECES
   ============================================================ */

function shortStage(s: Stage) {
  return s
    .replace("Group Stage", "Groups")
    .replace("Round of 32", "R32")
    .replace("Round of 16", "R16")
    .replace("Quarter-final", "QF")
    .replace("Semi-final", "SF")
    .replace("Third place", "3RD")
    .replace("Final", "Final")
    .toUpperCase();
}

function RegionToggle({ region, setRegion }: { region: Region; setRegion: (r: Region) => void }) {
  return (
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
  );
}

function SectionHeader({ label, accent = false, dot = false }: { label: string; accent?: boolean; dot?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {dot && <span className="size-1.5 rounded-full bg-pitch animate-live" />}
      <h2 className={`font-display text-sm font-extrabold uppercase tracking-[0.12em] ${accent ? "text-pitch" : "text-foreground"}`}>
        {label}
      </h2>
      <div className="flex-1 h-px bg-[var(--hairline)]" />
    </div>
  );
}

function TabBar({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  const tabs: Array<{ key: Filter; label: string }> = [
    { key: "ENGLAND", label: "England" },
    { key: "ALL", label: "All" },
    ...STAGES.map(s => ({ key: s as Filter, label: shortStage(s) })),
  ];
  return (
    <div className="hairline-b">
      <div className="flex items-center gap-1 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        {tabs.map(t => {
          const active = filter === t.key;
          const isEngland = t.key === "ENGLAND";
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`relative shrink-0 px-4 py-3 font-display text-sm font-extrabold uppercase tracking-wider transition-colors duration-200 ${
                active ? (isEngland ? "text-pitch" : "text-foreground") : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span
                className={`absolute left-3 right-3 -bottom-px h-0.5 transition-all duration-200 ${
                  active ? "bg-pitch opacity-100" : "bg-pitch opacity-0"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   HERO MATCH
   ============================================================ */

function HeroMatch({ match, region, now, broadcaster, teamView }: {
  match: Match; region: Region; now: Date; broadcaster: string; teamView: TeamView;
}) {
  const { day, time, tzLabel } = formatKickoff(match.kickoffUTC, region);
  const status = matchStatus(match, now);
  const countdown = useCountdown(match.kickoffUTC, now);
  const home = teamView(match.homeCode);
  const away = teamView(match.awayCode);
  const live = status === "LIVE";

  return (
    <article
      className={`relative overflow-hidden rounded-xl bg-card shadow-elevated animate-fade-up ${live ? "live-border" : ""}`}
    >
      {/* faint stripe behind score for depth */}
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(0,230,118,0.06),transparent_70%)] pointer-events-none" />

      <div className="relative p-6 sm:p-10">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            {live ? <StatusPill kind="live" /> : <StatusPill kind="next" />}
            <span className="label-micro">
              {match.stage}{match.group ? ` · Group ${match.group}` : ""}
            </span>
          </div>
          {match.city && <span className="label-micro">{match.city}</span>}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-10">
          <TeamHero team={home} align="right" />

          <div className="text-center min-w-[120px]">
            {typeof match.homeScore === "number" && typeof match.awayScore === "number" ? (
              <div className="flex items-end justify-center gap-3 sm:gap-5">
                <ScoreDigit value={match.homeScore} large />
                <div className="scoreline text-3xl sm:text-5xl text-muted-foreground pb-1">·</div>
                <ScoreDigit value={match.awayScore} large />
              </div>
            ) : (
              <>
                <div className="label-micro mb-1">{day}</div>
                <div className="scoreline text-5xl sm:text-7xl">{time}</div>
                <div className="label-micro mt-2">{tzLabel}</div>
                {/* dual-timezone line removed for clarity */}
              </>
            )}
          </div>

          <TeamHero team={away} align="left" />
        </div>

        <div className="mt-10 pt-5 hairline-t flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="label-micro">Broadcast</span>
            <span className="font-display text-sm font-extrabold uppercase tracking-wider">{broadcaster}</span>
          </div>
          {!live && (
            <div className="flex items-center gap-2">
              <span className="label-micro">Kickoff</span>
              <span suppressHydrationWarning className="font-display text-sm font-extrabold uppercase tracking-wider text-pitch tabular-nums">
                {countdown}
              </span>
            </div>
          )}
          {match.venue && (
            <div className="flex items-center gap-2">
              <span className="label-micro">Venue</span>
              <span className="font-display text-sm font-extrabold uppercase tracking-wider truncate max-w-[200px]">
                {match.venue}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function TeamHero({ team, align }: { team: ReturnType<TeamView>; align: "left" | "right" }) {
  return (
    <div className={`flex flex-col gap-3 ${align === "right" ? "items-end text-right" : "items-start text-left"}`}>
      <TeamCrest team={team} size="hero" />
      <div>
        <div className="font-display text-xl sm:text-3xl font-extrabold uppercase tracking-tight leading-none">
          {team.name}
        </div>
        <div className="label-micro mt-2">{team.code}</div>
      </div>
    </div>
  );
}

function StatusPill({ kind }: { kind: "live" | "next" | "ft" }) {
  if (kind === "live") {
    return (
      <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-pitch-soft">
        <span className="size-1.5 rounded-full bg-pitch animate-live" />
        <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.12em] text-pitch">Live</span>
      </span>
    );
  }
  if (kind === "ft") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface">
        <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">FT</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface">
      <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground">Up next</span>
    </span>
  );
}

/* ============================================================
   TEAM CREST — no emoji, ever
   ============================================================ */

function TeamCrest({ team, size = "md" }: { team: ReturnType<TeamView>; size?: "sm" | "md" | "hero" }) {
  const dim = size === "hero"
    ? "size-16 sm:size-20"
    : size === "sm"
    ? "size-6"
    : "size-9";
  const text = size === "hero" ? "text-base" : size === "sm" ? "text-[10px]" : "text-xs";

  if (team.crest) {
    return (
      <div className={`${dim} rounded-lg bg-surface grid place-items-center overflow-hidden shrink-0 ring-hairline`}>
        <img src={team.crest} alt="" className="w-[72%] h-[72%] object-contain" loading="lazy" />
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-lg bg-surface grid place-items-center shrink-0 ring-hairline`}>
      <span className={`font-display ${text} font-extrabold uppercase tracking-tighter text-foreground`}>
        {team.code}
      </span>
    </div>
  );
}

/* ============================================================
   MATCH CARD
   ============================================================ */

function MatchCard({ match, region, now, teamView }: { match: Match; region: Region; now: Date; teamView: TeamView }) {
  const home = teamView(match.homeCode);
  const away = teamView(match.awayCode);
  const { time, tzLabel } = formatKickoff(match.kickoffUTC, region);
  const status = matchStatus(match, now);
  const live = status === "LIVE";

  return (
    <article
      className={`relative rounded-xl bg-card shadow-card transition-all duration-200 hover:bg-[#1f242b] ${live ? "live-border" : ""}`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="label-micro">
            {shortStage(match.stage)}{match.group ? ` · GRP ${match.group}` : ""}
          </div>
          {live ? <StatusPill kind="live" /> : status === "FT" ? <StatusPill kind="ft" /> : (
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-extrabold tabular-nums">{time}</span>
              <span className="label-micro">{tzLabel}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
          {/* Home */}
          <div className="flex items-center gap-3 min-w-0 justify-end">
            <span className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight truncate">
              {home.name}
            </span>
            <TeamCrest team={home} size="md" />
          </div>

          {/* Score / vs */}
          <div className="flex items-center gap-2 sm:gap-3">
            {typeof match.homeScore === "number" ? (
              <ScoreDigit value={match.homeScore} />
            ) : (
              <span className="font-display text-xl font-extrabold text-muted-foreground">–</span>
            )}
            <span className="font-display text-xs font-extrabold text-muted-foreground uppercase tracking-widest">vs</span>
            {typeof match.awayScore === "number" ? (
              <ScoreDigit value={match.awayScore} />
            ) : (
              <span className="font-display text-xl font-extrabold text-muted-foreground">–</span>
            )}
          </div>

          {/* Away */}
          <div className="flex items-center gap-3 min-w-0">
            <TeamCrest team={away} size="md" />
            <span className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight truncate">
              {away.name}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 hairline-t flex items-center justify-between gap-3">
          <div className="label-micro truncate min-w-0">
            {match.venue || ""}{match.venue && match.city ? " · " : ""}{match.city || ""}
            {match.bracketNote ? (match.venue || match.city ? " · " : "") + match.bracketNote : ""}
          </div>
        </div>
      </div>
    </article>
  );
}




function ScoreDigit({ value, large = false }: { value: number; large?: boolean }) {
  // Animate when value changes
  const prev = useRef(value);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setTick(t => t + 1);
    }
  }, [value]);
  return (
    <span
      key={tick}
      className={`scoreline animate-tick ${large ? "text-6xl sm:text-8xl" : "text-2xl sm:text-3xl"} text-foreground`}
    >
      {value}
    </span>
  );
}

/* ============================================================
   DAY GROUPED LIST — sticky condensed date headers
   ============================================================ */

function DayGroupedList({ matches, region, now, teamView }: { matches: Match[]; region: Region; now: Date; teamView: TeamView }) {
  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const key = formatKickoff(m.kickoffUTC, region).day;
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [matches, region]);

  return (
    <div className="space-y-10">
      {grouped.map(([day, list]) => (
        <div key={day}>
          <div className="sticky top-16 z-20 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/85 backdrop-blur-md hairline-b">
            <div className="font-display text-sm font-extrabold uppercase tracking-[0.14em] flex items-center gap-3">
              <span>{day}</span>
              <span className="label-micro">{list.length} {list.length === 1 ? "match" : "matches"}</span>
            </div>
          </div>
          <div className="space-y-3 pt-4">
            {list.map((m, i) => (
              <div key={m.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 6) * 35}ms` }}>
                <MatchCard match={m} region={region} now={now} teamView={teamView} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   ENGLAND PANEL
   ============================================================ */

function EnglandPanel({ now, matches, groups, teamView, region }: {
  now: Date; matches: Match[]; groups: GroupTable[]; teamView: TeamView; region: Region;
}) {
  const englandMatches = matches.filter(m => m.homeCode === ENG || m.awayCode === ENG);
  const groupE = groups.find(g => g.rows.some(r => r.code === ENG)) ?? groups.find(g => g.group === "E");
  const rows = groupE?.rows ?? [];
  const groupCodes = useMemo(() => new Set(rows.map(r => r.code)), [rows]);
  const groupEMatches = useMemo(
    () => matches.filter(m =>
      (groupE && m.group === groupE.group) ||
      (groupCodes.has(m.homeCode) && groupCodes.has(m.awayCode))
    ),
    [matches, groupE, groupCodes],
  );
  const rivalMatches = groupEMatches.filter(m => m.homeCode !== ENG && m.awayCode !== ENG);
  const next = englandMatches.find(m => matchStatus(m, now) !== "FT");
  const nextCountdown = useCountdown(next?.kickoffUTC ?? new Date().toISOString(), now);
  const nextTime = next ? formatKickoff(next.kickoffUTC, region) : null;
  const nextDual = next ? dualKickoff(next.kickoffUTC) : null;

  const scenario = useMemo(() => englandScenarios(rows, groupEMatches, now), [rows, groupEMatches, now]);

  // Knockout feeders: matches that could decide England's next KO opponent.
  // While England's own KO fixture isn't a real team yet (TBD), surface matches in the same stage.
  const englandKO = englandMatches.find(m => m.stage !== "Group Stage" && matchStatus(m, now) !== "FT");
  const feederMatches = useMemo(() => {
    if (!englandKO) return [];
    return matches.filter(m =>
      m.stage === englandKO.stage &&
      m.id !== englandKO.id &&
      m.homeCode !== ENG && m.awayCode !== ENG &&
      matchStatus(m, now) !== "FT"
    ).slice(0, 4);
  }, [matches, englandKO, now]);





  return (
    <section className="rounded-xl bg-card shadow-elevated p-6 sm:p-8 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-lg bg-surface ring-hairline grid place-items-center">
            <span className="text-2xl leading-none">{getTeam(ENG).flag}</span>
          </div>
          <div>
            <div className="font-display text-2xl font-extrabold uppercase tracking-tight leading-none">
              Three Lions
            </div>
            <div className="label-micro mt-2">
              Group {groupE?.group ?? "E"} · {englandMatches.length} fixtures
            </div>
          </div>
        </div>
        {next && nextTime && nextDual && (
          <div className="text-right ml-auto">

            <div className="label-micro">Next match</div>
            <div className="font-display text-lg font-extrabold uppercase tracking-tight mt-1">
              vs {teamView(next.homeCode === ENG ? next.awayCode : next.homeCode).name}
            </div>
            <div suppressHydrationWarning className="font-display text-sm font-extrabold text-pitch tabular-nums mt-1">{nextCountdown}</div>
            <div className="label-micro mt-1">{nextDual.uk.time} {nextDual.uk.tz}</div>
          </div>
        )}
      </div>

      {/* Qualification scenarios */}
      <div className="mb-6 rounded-lg bg-surface ring-hairline p-4">
        <div className="label-micro mb-2" style={{ color: "var(--pitch)" }}>Scenarios</div>
        <ul className="space-y-1.5">
          {scenario.lines.map((l, i) => (
            <li key={i} className="font-display text-sm font-extrabold uppercase tracking-tight leading-snug">
              {l}
            </li>
          ))}
        </ul>
      </div>

      {rows.length > 0 && (
        <div className="mb-6">
          <div className="label-micro mb-3">Group standings</div>
          <div className="overflow-hidden rounded-lg bg-surface">
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <th className="text-left px-3 py-2.5 label-micro w-8">#</th>
                  <th className="text-left px-2 py-2.5 label-micro">Team</th>
                  <th className="px-2 py-2.5 label-micro">P</th>
                  <th className="px-2 py-2.5 label-micro">W</th>
                  <th className="px-2 py-2.5 label-micro">D</th>
                  <th className="px-2 py-2.5 label-micro">L</th>
                  <th className="px-2 py-2.5 label-micro">GD</th>
                  <th className="px-2 py-2.5 label-micro" style={{ color: "var(--pitch)" }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const t = teamView(row.code);
                  const isEng = row.code === ENG;
                  const qualified = i < 2;
                  const gd = row.GF - row.GA;
                  return (
                    <tr key={row.code} className="hairline-b last:border-0 transition-colors duration-200">
                      <td className="relative px-3 py-3 font-display text-sm font-extrabold tabular-nums">
                        {qualified && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm" style={{ background: "var(--gold)" }} />}
                        <span className={qualified ? "text-gold" : "text-muted-foreground"}>{i + 1}</span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2.5">
                          <TeamCrest team={t} size="sm" />
                          <span className={`font-display text-sm font-extrabold uppercase tracking-tight ${isEng ? "text-pitch" : ""}`}>{t.name}</span>
                          {qualified && <span className="label-micro" style={{ color: "var(--gold)", letterSpacing: "0.1em" }}>Q</span>}
                        </div>
                      </td>
                      <td className="text-center px-2 py-3 font-display text-sm font-extrabold tabular-nums text-muted-foreground">{row.P}</td>
                      <td className="text-center px-2 py-3 font-display text-sm font-extrabold tabular-nums">{row.W}</td>
                      <td className="text-center px-2 py-3 font-display text-sm font-extrabold tabular-nums text-muted-foreground">{row.D}</td>
                      <td className="text-center px-2 py-3 font-display text-sm font-extrabold tabular-nums text-muted-foreground">{row.L}</td>
                      <td className="text-center px-2 py-3 font-display text-sm font-extrabold tabular-nums">{gd > 0 ? `+${gd}` : gd}</td>
                      <td className="text-center px-2 py-3 font-display text-base font-extrabold tabular-nums text-pitch">{row.Pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* What affects England */}
      <div className="mb-6">
        <div className="label-micro mb-3">What affects England</div>
        <div className="space-y-2">
          {englandMatches.filter(m => matchStatus(m, now) !== "FT").map(m => (
            <FeedRow
              key={m.id} match={m} now={now} teamView={teamView}
              label="England play"
            />

          ))}
          {rivalMatches.filter(m => matchStatus(m, now) !== "FT").map(m => (
            <FeedRow
              key={m.id} match={m} now={now} teamView={teamView}
              label="Rival fixture"
            />
          ))}
          {feederMatches.map(m => (
            <FeedRow
              key={m.id} match={m} now={now} teamView={teamView}
              label={`Decides England's ${shortStage(m.stage)} opponent`}
            />
          ))}
          {englandMatches.filter(m => matchStatus(m, now) !== "FT").length === 0 &&
           rivalMatches.filter(m => matchStatus(m, now) !== "FT").length === 0 &&
           feederMatches.length === 0 && (
            <div className="label-micro">Nothing on the radar right now.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function FeedRow({ match, teamView, label }: {
  match: Match; now: Date; teamView: TeamView; label: string;
}) {
  const home = teamView(match.homeCode);
  const away = teamView(match.awayCode);
  const dual = dualKickoff(match.kickoffUTC);
  return (
    <div className="rounded-lg bg-surface ring-hairline p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="label-micro" style={{ color: "var(--pitch)" }}>{label}</span>
        <span className="label-micro">{match.stage.toUpperCase()}{match.group ? ` · GRP ${match.group}` : ""}</span>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="font-display text-sm font-extrabold uppercase tracking-tight">
          {home.name} <span className="text-muted-foreground mx-1">vs</span> {away.name}
        </div>
        <div className="label-micro tabular-nums">
          {dual.uk.time} {dual.uk.tz}
        </div>
      </div>
    </div>
  );
}



function useCountdown(targetUTC: string, now: Date) {
  const diff = new Date(targetUTC).getTime() - now.getTime();
  if (diff <= 0) return "Kicked off";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}D ${h}H ${m}M`;
  return `${h}H ${m}M`;
}
