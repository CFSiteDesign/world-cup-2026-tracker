import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MATCHES as FALLBACK_MATCHES, STAGES, BROADCASTERS, TIMEZONES, ENGLAND_GROUP_TABLE,
  getTeam, formatKickoff, matchStatus, type Region, type Match, type Stage,
} from "@/lib/worldcup-data";
import { getWorldCup, type GroupTable } from "@/lib/worldcup.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "World Cup 2026 Tracker — Every Match, Every Time" },
      { name: "description", content: "Live fixtures, scores, group tables and broadcasters for the 2026 FIFA World Cup. Switch between Australia and England." },
    ],
  }),
  component: Tracker,
});

type Filter = Stage | "ALL" | "ENGLAND";

const FALLBACK_GROUPS: GroupTable[] = [
  { group: "E", rows: ENGLAND_GROUP_TABLE.map(r => ({ ...r, name: getTeam(r.code).name })) },
];

function Tracker() {
  const [region, setRegion] = useState<Region>("UK");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [now, setNow] = useState(new Date());

  const { data, isError } = useQuery({
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

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("wc-region")) as Region | null;
    if (saved === "AU" || saved === "UK") setRegion(saved);
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("wc-region", region);
  }, [region]);

  const sorted = useMemo(
    () => [...matches].sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC)),
    [matches]
  );

  const filtered = useMemo(() => {
    if (filter === "ENGLAND") return sorted.filter(m => m.homeCode === "ENG" || m.awayCode === "ENG");
    if (filter === "ALL") return sorted;
    return sorted.filter(m => m.stage === filter);
  }, [filter, sorted]);

  const nextMatch = useMemo(
    () => sorted.find(m => matchStatus(m, now) !== "FT"),
    [sorted, now]
  );

  const live = sorted.filter(m => matchStatus(m, now) === "LIVE");
  const bc = BROADCASTERS[region];

  const teamView = (code: string) => {
    const base = getTeam(code);
    return {
      ...base,
      name: liveNames[code] ?? base.name,
      crest: crests[code],
    };
  };

  return (
    <div className="min-h-screen bg-hero">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/75 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-brand-gradient grid place-items-center text-sm shadow-glow">⚽</div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">World Cup 26</div>
              <div className="text-[10px] text-muted-foreground tracking-wide">USA · Canada · Mexico</div>
            </div>
          </div>
          <RegionToggle region={region} setRegion={setRegion} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Hero / Next match */}
        {nextMatch && <NextMatchCard match={nextMatch} region={region} now={now} broadcaster={bc.channel} />}

        {/* Live strip */}
        {live.length > 0 && (
          <section className="animate-fade-up">
            <SectionTitle label="Live now" accent />
            <div className="grid sm:grid-cols-2 gap-3">
              {live.map(m => <MatchCard key={m.id} match={m} region={region} now={now} />)}
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="space-y-3">
          <SectionTitle label="Fixtures" muted />
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            <button
              onClick={() => setFilter("ENGLAND")}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                filter === "ENGLAND"
                  ? "bg-brand-gradient text-brand-foreground shadow-glow"
                  : "bg-surface ring-hairline text-foreground hover:bg-surface-2"
              }`}
            >
              <span>🏴󠁧󠁢󠁥󠁮󠁧󠁿</span> England
            </button>
            <span className="shrink-0 h-5 w-px bg-border mx-1" />
            <FilterPill active={filter === "ALL"} onClick={() => setFilter("ALL")}>All</FilterPill>
            {STAGES.map(s => (
              <FilterPill key={s} active={filter === s} onClick={() => setFilter(s)}>
                {shortStage(s)}
              </FilterPill>
            ))}
          </div>
        </section>

        {/* England spotlight */}
        {filter === "ENGLAND" && <EnglandPanel now={now} />}

        {/* Matches grouped by day */}
        <section>
          <DayGroupedList matches={filtered} region={region} now={now} />
          {filtered.length === 0 && (
            <div className="text-muted-foreground text-sm text-center py-12">No matches for this filter.</div>
          )}
        </section>

        {/* How to watch */}
        <section>
          <SectionTitle label="How to watch" muted />
          <div className="grid sm:grid-cols-2 gap-3">
            {(["UK", "AU"] as Region[]).map(r => {
              const b = BROADCASTERS[r];
              const active = r === region;
              return (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`text-left rounded-2xl p-4 transition-all duration-200 ring-hairline ${
                    active ? "bg-surface-2 shadow-glow" : "bg-surface hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-base">{r === "UK" ? "🏴󠁧󠁢󠁥󠁮󠁧󠁿" : "🇦🇺"}</span>
                      {r === "UK" ? "England" : "Australia"}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{TIMEZONES[r].label}</span>
                  </div>
                  <div className="text-sm font-semibold text-brand">{b.channel}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.note}</div>
                  <div className="text-[11px] text-muted-foreground mt-2">Stream · {b.stream}</div>
                </button>
              );
            })}
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-4 pb-10">
          Times shown in <span className="text-foreground font-medium">{TIMEZONES[region].label}</span> · Schedule indicative
        </footer>
      </main>
    </div>
  );
}

/* ---------- pieces ---------- */

function shortStage(s: Stage) {
  return s
    .replace("Group Stage", "Groups")
    .replace("Round of 32", "R32")
    .replace("Round of 16", "R16")
    .replace("Quarter-final", "QF")
    .replace("Semi-final", "SF")
    .replace("Third place", "3rd");
}

function RegionToggle({ region, setRegion }: { region: Region; setRegion: (r: Region) => void }) {
  return (
    <div className="relative inline-flex p-1 rounded-full bg-surface ring-hairline">
      <div
        className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-full bg-brand-gradient shadow-glow transition-transform duration-300"
        style={{ transform: region === "UK" ? "translateX(0)" : "translateX(100%)" }}
      />
      {(["UK", "AU"] as Region[]).map(r => (
        <button
          key={r}
          onClick={() => setRegion(r)}
          className={`relative z-10 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
            region === r ? "text-brand-foreground" : "text-muted-foreground"
          }`}
        >
          {r === "UK" ? "UK" : "AUS"}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ label, accent = false, muted = false }: { label: string; accent?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {accent && <span className="size-2 rounded-full bg-live animate-live" />}
      <h2 className={`${muted ? "text-xs uppercase tracking-[0.14em] text-muted-foreground font-semibold" : "text-lg font-bold"}`}>
        {label}
      </h2>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
        active
          ? "bg-foreground text-background"
          : "bg-surface ring-hairline text-muted-foreground hover:text-foreground hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function NextMatchCard({ match, region, now, broadcaster }: { match: Match; region: Region; now: Date; broadcaster: string }) {
  const { day, time, tzLabel } = formatKickoff(match.kickoffUTC, region);
  const status = matchStatus(match, now);
  const countdown = useCountdown(match.kickoffUTC, now);

  return (
    <div className="relative overflow-hidden rounded-3xl ring-hairline shadow-soft animate-fade-up">
      <div className="absolute inset-0 bg-brand-gradient opacity-[0.12]" />
      <div className="absolute -top-24 -right-24 size-64 rounded-full bg-brand/30 blur-3xl" />
      <div className="relative bg-surface/60 backdrop-blur-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            {status === "LIVE" ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-live text-white">
                <span className="size-1.5 rounded-full bg-white animate-live" /> LIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-brand-soft text-brand uppercase tracking-wider">Up next</span>
            )}
            <span className="text-muted-foreground">
              {match.stage}{match.group ? ` · Group ${match.group}` : ""}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{match.city}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          <TeamBlock code={match.homeCode} align="right" />
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{day}</div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight mt-1 tabular-nums">{time}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{tzLabel}</div>
          </div>
          <TeamBlock code={match.awayCode} align="left" />
        </div>

        <div className="mt-7 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-foreground">📺</span>
            <span className="text-foreground font-semibold">{broadcaster}</span>
          </div>
          {status !== "LIVE" && (
            <div className="font-mono tabular-nums text-brand font-bold">{countdown}</div>
          )}
          <div className="text-muted-foreground truncate max-w-[60%]">📍 {match.venue}</div>
        </div>
      </div>
    </div>
  );
}

function TeamBlock({ code, align }: { code: string; align: "left" | "right" }) {
  const t = getTeam(code);
  return (
    <div className={`flex flex-col gap-2 ${align === "right" ? "items-end text-right" : "items-start text-left"}`}>
      <div className="size-14 sm:size-16 rounded-2xl bg-surface-2 ring-hairline grid place-items-center text-3xl sm:text-4xl">
        {t.flag}
      </div>
      <div>
        <div className="text-sm sm:text-base font-bold leading-tight">{t.name}</div>
        {t.group && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Group {t.group}</div>}
      </div>
    </div>
  );
}

function DayGroupedList({ matches, region, now }: { matches: Match[]; region: Region; now: Date }) {
  const groups = useMemo(() => {
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
    <div className="space-y-6">
      {groups.map(([day, list]) => (
        <div key={day} className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">{day}</div>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-2">
            {list.map((m, i) => (
              <div key={m.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 6) * 25}ms` }}>
                <MatchCard match={m} region={region} now={now} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ match, region, now }: { match: Match; region: Region; now: Date }) {
  const home = getTeam(match.homeCode);
  const away = getTeam(match.awayCode);
  const { time, tzLabel } = formatKickoff(match.kickoffUTC, region);
  const status = matchStatus(match, now);

  return (
    <div className="group rounded-2xl bg-surface hover:bg-surface-2 ring-hairline transition-all duration-200 shadow-soft">
      <div className="px-4 py-3.5 sm:px-5">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4">
          {/* Time column */}
          <div className="w-14 sm:w-16 text-center">
            {status === "LIVE" ? (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-live text-white text-[10px] font-bold">
                <span className="size-1 rounded-full bg-white animate-live" />LIVE
              </div>
            ) : status === "FT" ? (
              <div className="text-[10px] font-bold text-muted-foreground tracking-wider">FT</div>
            ) : (
              <>
                <div className="text-sm font-bold tabular-nums">{time}</div>
                <div className="text-[9px] text-muted-foreground tracking-wider">{tzLabel}</div>
              </>
            )}
          </div>

          {/* Teams */}
          <div className="min-w-0 space-y-1">
            <TeamRow team={home} score={match.homeScore} status={status} />
            <TeamRow team={away} score={match.awayScore} status={status} />
          </div>

          {/* Stage badge */}
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {shortStage(match.stage)}{match.group ? ` · ${match.group}` : ""}
            </div>
            <div className="text-[10px] text-muted-foreground/70 mt-0.5 truncate max-w-[140px]">{match.city}</div>
          </div>
        </div>

        {match.bracketNote && (
          <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground italic">
            {match.bracketNote}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamRow({ team, score, status }: { team: ReturnType<typeof getTeam>; score?: number; status: "FT" | "LIVE" | "UPCOMING" }) {
  const isTbd = team.code === "TBD";
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg leading-none w-5 text-center">{team.flag}</span>
        <span className={`text-sm font-semibold truncate ${isTbd ? "text-muted-foreground" : ""}`}>{team.name}</span>
      </div>
      {typeof score === "number" && (
        <span className={`text-sm font-bold tabular-nums w-5 text-right ${status === "FT" ? "text-foreground" : "text-brand"}`}>
          {score}
        </span>
      )}
    </div>
  );
}

function EnglandPanel({ now }: { now: Date }) {
  const englandMatches = MATCHES.filter(m => m.homeCode === "ENG" || m.awayCode === "ENG");
  const next = englandMatches.find(m => matchStatus(m, now) !== "FT");
  const nextCountdown = useCountdown(next?.kickoffUTC ?? new Date().toISOString(), now);

  return (
    <section className="rounded-2xl ring-hairline bg-surface p-5 sm:p-6 shadow-soft animate-fade-up overflow-hidden relative">
      <div className="absolute -top-20 -right-20 size-56 rounded-full bg-brand/20 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-surface-2 ring-hairline grid place-items-center text-xl">🏴󠁧󠁢󠁥󠁮󠁧󠁿</div>
            <div>
              <div className="text-base font-bold leading-tight">Three Lions</div>
              <div className="text-[11px] text-muted-foreground">Group E · {englandMatches.length} fixtures</div>
            </div>
          </div>
          {next && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Next</div>
              <div className="text-sm font-semibold">
                vs {getTeam(next.homeCode === "ENG" ? next.awayCode : next.homeCode).name}
              </div>
              <div className="text-[11px] text-brand font-mono">{nextCountdown}</div>
            </div>
          )}
        </div>

        <div className="rounded-xl ring-hairline overflow-hidden bg-background/40">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 font-semibold">#</th>
                <th className="text-left px-1 py-2 font-semibold">Team</th>
                <th className="px-2 py-2 font-semibold">P</th>
                <th className="px-2 py-2 font-semibold">W</th>
                <th className="px-2 py-2 font-semibold">D</th>
                <th className="px-2 py-2 font-semibold">L</th>
                <th className="px-2 py-2 font-semibold">GD</th>
                <th className="px-2 py-2 font-semibold text-brand">Pts</th>
              </tr>
            </thead>
            <tbody>
              {ENGLAND_GROUP_TABLE.map((row, i) => {
                const t = getTeam(row.code);
                const isEng = row.code === "ENG";
                return (
                  <tr key={row.code} className={`border-t border-border ${isEng ? "bg-brand-soft" : ""}`}>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-1 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span>{t.flag}</span>
                        <span className={isEng ? "font-bold text-brand" : "font-medium"}>{t.name}</span>
                      </span>
                    </td>
                    <td className="text-center px-2 py-2 tabular-nums">{row.P}</td>
                    <td className="text-center px-2 py-2 tabular-nums">{row.W}</td>
                    <td className="text-center px-2 py-2 tabular-nums">{row.D}</td>
                    <td className="text-center px-2 py-2 tabular-nums">{row.L}</td>
                    <td className="text-center px-2 py-2 tabular-nums">{row.GF - row.GA > 0 ? `+${row.GF - row.GA}` : row.GF - row.GA}</td>
                    <td className="text-center px-2 py-2 tabular-nums font-bold text-brand">{row.Pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
          Projected route · <span className="text-foreground font-medium">R32 → R16 → QF (possible France) → SF → Final at MetLife, 19 Jul</span>
        </div>
      </div>
    </section>
  );
}

function useCountdown(targetUTC: string, now: Date) {
  const diff = new Date(targetUTC).getTime() - now.getTime();
  if (diff <= 0) return "Kicked off";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}
