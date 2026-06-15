import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  MATCHES, STAGES, BROADCASTERS, TIMEZONES, ENGLAND_GROUP_TABLE,
  getTeam, formatKickoff, matchStatus, type Region, type Match, type Stage,
} from "@/lib/worldcup-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "World Cup 2026 Tracker — Every Match, Every Time" },
      { name: "description", content: "Fixtures, kickoff times, broadcasters and bracket paths for the 2026 FIFA World Cup. Switch between Australia and England." },
    ],
  }),
  component: Tracker,
});

type Filter = Stage | "ALL" | "ENGLAND";

function Tracker() {
  const [region, setRegion] = useState<Region>("UK");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("wc-region")) as Region | null;
    if (saved === "AU" || saved === "UK") setRegion(saved);
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("wc-region", region);
  }, [region]);

  const filtered = useMemo(() => {
    let list = [...MATCHES].sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC));
    if (filter === "ENGLAND") list = list.filter(m => m.homeCode === "ENG" || m.awayCode === "ENG");
    else if (filter !== "ALL") list = list.filter(m => m.stage === filter);
    return list;
  }, [filter]);

  const nextMatch = useMemo(
    () => [...MATCHES].sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC))
      .find(m => matchStatus(m, now) !== "FT"),
    [now]
  );

  const live = MATCHES.filter(m => matchStatus(m, now) === "LIVE");
  const bc = BROADCASTERS[region];

  return (
    <div className="min-h-screen bg-hero">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-gold-gradient grid place-items-center text-xl shadow-glow">⚽</div>
            <div>
              <div className="display text-xl sm:text-2xl leading-none shimmer-text">WORLD CUP 26</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground tracking-wider uppercase">USA · Canada · Mexico</div>
            </div>
          </div>
          <RegionToggle region={region} setRegion={setRegion} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
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
        <section>
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill active={filter === "ALL"} onClick={() => setFilter("ALL")}>All</FilterPill>
            <button
              onClick={() => setFilter("ENGLAND")}
              className={`px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-200 hover:scale-105 ${
                filter === "ENGLAND"
                  ? "bg-gold-gradient text-gold-foreground shadow-glow"
                  : "bg-card border border-border text-foreground hover:border-gold"
              }`}
            >
              🏴󠁧󠁢󠁥󠁮󠁧󠁿 ENGLAND
            </button>
            {STAGES.map(s => (
              <FilterPill key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</FilterPill>
            ))}
          </div>
        </section>

        {/* England spotlight */}
        {filter === "ENGLAND" && <EnglandPanel region={region} now={now} />}

        {/* Matches */}
        <section>
          <SectionTitle label={filter === "ALL" ? "All fixtures" : filter === "ENGLAND" ? "Three Lions fixtures" : filter} />
          <div className="space-y-3">
            {filtered.map((m, i) => (
              <div key={m.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <MatchCard match={m} region={region} now={now} />
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-muted-foreground text-sm">No matches for this filter yet.</div>
            )}
          </div>
        </section>

        {/* How to watch */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <SectionTitle label="How to watch" />
          <div className="grid sm:grid-cols-2 gap-4">
            {(["UK", "AU"] as Region[]).map(r => {
              const b = BROADCASTERS[r];
              const active = r === region;
              return (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`text-left rounded-xl p-4 border transition-all duration-200 hover:scale-[1.01] ${
                    active ? "border-gold bg-secondary shadow-glow" : "border-border bg-background/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="display text-lg">{r === "UK" ? "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England" : "🇦🇺 Australia"}</div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{TIMEZONES[r].label}</span>
                  </div>
                  <div className="text-sm font-semibold text-gold">{b.channel}</div>
                  <div className="text-xs text-muted-foreground mt-1">{b.note}</div>
                  <div className="text-xs text-muted-foreground mt-2">Stream: {b.stream}</div>
                </button>
              );
            })}
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground py-8">
          Times shown in <span className="text-foreground font-semibold">{TIMEZONES[region].label}</span> · Schedule indicative · Stay onside ⚽
        </footer>
      </main>
    </div>
  );
}

/* ---------- pieces ---------- */

function RegionToggle({ region, setRegion }: { region: Region; setRegion: (r: Region) => void }) {
  return (
    <div className="relative inline-flex p-1 rounded-full bg-card border border-border">
      <div
        className="absolute top-1 bottom-1 w-1/2 rounded-full bg-gold-gradient shadow-glow transition-transform duration-300"
        style={{ transform: region === "UK" ? "translateX(0%)" : "translateX(100%)" }}
      />
      {(["UK", "AU"] as Region[]).map(r => (
        <button
          key={r}
          onClick={() => setRegion(r)}
          className={`relative z-10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-full transition-colors ${
            region === r ? "text-gold-foreground" : "text-muted-foreground"
          }`}
        >
          {r === "UK" ? "🇬🇧 UK" : "🇦🇺 AUS"}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      {accent && <span className="size-2.5 rounded-full bg-live animate-live" />}
      <h2 className="display text-2xl sm:text-3xl">{label}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all duration-200 hover:scale-105 ${
        active
          ? "bg-foreground text-background"
          : "bg-card/60 border border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function NextMatchCard({ match, region, now, broadcaster }: { match: Match; region: Region; now: Date; broadcaster: string }) {
  const home = getTeam(match.homeCode);
  const away = getTeam(match.awayCode);
  const { day, time, tzLabel } = formatKickoff(match.kickoffUTC, region);
  const status = matchStatus(match, now);
  const countdown = useCountdown(match.kickoffUTC, now);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border shadow-card pitch-stripes animate-fade-up">
      <div className="absolute inset-0 bg-gradient-to-br from-background/30 via-background/60 to-background/90" />
      <div className="relative p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] uppercase tracking-[0.2em] text-gold font-bold">
            {status === "LIVE" ? "● Live" : "Up next"} · {match.stage}{match.group ? ` · Group ${match.group}` : ""}
          </span>
          <span className="text-xs text-muted-foreground">{match.city}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <TeamBlock code={match.homeCode} align="right" />
          <div className="text-center">
            <div className="display text-4xl sm:text-6xl shimmer-text leading-none">VS</div>
            <div className="mt-2 text-xs sm:text-sm text-muted-foreground">{day}</div>
            <div className="display text-2xl sm:text-3xl">{time} <span className="text-xs text-muted-foreground font-sans">{tzLabel}</span></div>
          </div>
          <TeamBlock code={match.awayCode} align="left" />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            📺 <span className="text-foreground font-semibold">{broadcaster}</span>
          </div>
          {status !== "LIVE" && (
            <div className="font-mono tabular-nums text-gold font-bold">{countdown}</div>
          )}
          <div className="text-muted-foreground">📍 {match.venue}</div>
        </div>
      </div>
    </div>
  );
}

function TeamBlock({ code, align }: { code: string; align: "left" | "right" }) {
  const t = getTeam(code);
  return (
    <div className={`flex flex-col ${align === "right" ? "items-end text-right" : "items-start text-left"}`}>
      <div className="text-4xl sm:text-6xl leading-none">{t.flag}</div>
      <div className="display text-lg sm:text-2xl mt-2 leading-tight">{t.name}</div>
      {t.group && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Group {t.group}</div>}
    </div>
  );
}

function MatchCard({ match, region, now }: { match: Match; region: Region; now: Date }) {
  const home = getTeam(match.homeCode);
  const away = getTeam(match.awayCode);
  const { day, time, tzLabel } = formatKickoff(match.kickoffUTC, region);
  const status = matchStatus(match, now);

  return (
    <div className="group rounded-2xl border border-border bg-card/80 hover:bg-card transition-all duration-200 hover:border-gold/60 hover:-translate-y-0.5 shadow-card overflow-hidden">
      <div className="px-4 sm:px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">{match.stage}</span>
            {match.group && <span className="text-muted-foreground">Group {match.group}</span>}
            {status === "LIVE" && <span className="px-2 py-0.5 rounded-full bg-live text-white font-bold animate-live">LIVE</span>}
            {status === "FT" && <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground font-bold">FT</span>}
          </div>
          <div className="text-[11px] text-muted-foreground">{day} · <span className="text-foreground font-semibold">{time}</span> {tzLabel}</div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-3 justify-end text-right">
            <div className="font-semibold truncate">{home.name}</div>
            <div className="text-2xl sm:text-3xl">{home.flag}</div>
          </div>
          <div className="display text-xl sm:text-2xl px-3 py-1 rounded-lg bg-background/60 min-w-[3.5rem] text-center">
            {typeof match.homeScore === "number"
              ? `${match.homeScore} - ${match.awayScore}`
              : "v"}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl sm:text-3xl">{away.flag}</div>
            <div className="font-semibold truncate">{away.name}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>📍 {match.venue}, {match.city}</span>
          {match.bracketNote && <span className="italic">{match.bracketNote}</span>}
        </div>
      </div>
    </div>
  );
}

function EnglandPanel({ region, now }: { region: Region; now: Date }) {
  const englandMatches = MATCHES.filter(m => m.homeCode === "ENG" || m.awayCode === "ENG");
  const next = englandMatches.find(m => matchStatus(m, now) !== "FT");
  const nextCountdown = useCountdown(next?.kickoffUTC ?? new Date().toISOString(), now);

  return (
    <section className="rounded-2xl border border-gold/40 bg-gradient-to-br from-secondary to-card p-5 sm:p-6 shadow-glow animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="display text-3xl sm:text-4xl flex items-center gap-3">
            🏴󠁧󠁢󠁥󠁮󠁧󠁿 <span className="shimmer-text">THREE LIONS</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Group E · {englandMatches.length} fixtures tracked</div>
        </div>
        {next && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Next up</div>
            <div className="font-bold">
              vs {getTeam(next.homeCode === "ENG" ? next.awayCode : next.homeCode).name}
            </div>
            <div className="text-xs text-gold">{nextCountdown}</div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-background/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Group E</th>
              <th className="px-2 py-2">P</th><th className="px-2 py-2">W</th><th className="px-2 py-2">D</th><th className="px-2 py-2">L</th>
              <th className="px-2 py-2">GF</th><th className="px-2 py-2">GA</th><th className="px-2 py-2 text-gold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {ENGLAND_GROUP_TABLE.map((row, i) => {
              const t = getTeam(row.code);
              const isEng = row.code === "ENG";
              return (
                <tr key={row.code} className={`border-t border-border ${isEng ? "bg-gold/10" : ""}`}>
                  <td className="px-3 py-2 flex items-center gap-2">
                    <span className="text-muted-foreground tabular-nums w-4">{i + 1}</span>
                    <span>{t.flag}</span>
                    <span className={isEng ? "font-bold text-gold" : ""}>{t.name}</span>
                  </td>
                  <td className="text-center px-2 py-2 tabular-nums">{row.P}</td>
                  <td className="text-center px-2 py-2 tabular-nums">{row.W}</td>
                  <td className="text-center px-2 py-2 tabular-nums">{row.D}</td>
                  <td className="text-center px-2 py-2 tabular-nums">{row.L}</td>
                  <td className="text-center px-2 py-2 tabular-nums">{row.GF}</td>
                  <td className="text-center px-2 py-2 tabular-nums">{row.GA}</td>
                  <td className="text-center px-2 py-2 tabular-nums font-bold text-gold">{row.Pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Projected route: <span className="text-foreground font-semibold">R32 → R16 → QF (possible France) → SF → Final at MetLife, 19 Jul</span>
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
