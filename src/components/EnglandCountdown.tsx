import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { type Match, getTeam, matchStatus } from "@/lib/worldcup-data";
import { ENG } from "@/lib/england-utils";

interface Props {
  matches: Match[];
  names?: Record<string, string>;
  variant?: "hero" | "banner";
}

export function EnglandCountdown({ matches, names = {}, variant = "hero" }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const next = useMemo(() => {
    return matches
      .filter((m) => (m.homeCode === ENG || m.awayCode === ENG) && matchStatus(m, now) !== "FT")
      .sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC))[0];
  }, [matches, now]);

  if (!next || !mounted) return null;

  const status = matchStatus(next, now);
  const live = status === "LIVE";
  const opp = next.homeCode === ENG ? next.awayCode : next.homeCode;
  const oppName = (names[opp] ?? getTeam(opp).name).toUpperCase();
  const oppFlag = getTeam(opp).flag;

  const diffMs = new Date(next.kickoffUTC).getTime() - now.getTime();
  const total = Math.max(diffMs, 0);
  const d = Math.floor(total / 86_400_000);
  const h = Math.floor((total % 86_400_000) / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  if (variant === "banner") {
    return (
      <div className="rounded-xl bg-card ring-hairline px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="label-micro">Next England match</div>
          <div className="font-display text-sm font-extrabold uppercase tracking-tight truncate mt-0.5">
            ENG <span className="text-muted-foreground">vs</span> {oppName}{" "}
            <span aria-hidden="true" className="ml-0.5">{oppFlag !== "⚽" ? oppFlag : ""}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {live ? (
            <span className="font-display text-xs font-extrabold uppercase tracking-wider text-pitch">Live now</span>
          ) : (
            <span className="scoreline text-lg tabular-nums text-foreground">
              {d > 0 ? `${d}d ` : ""}{pad(h)}:{pad(m)}:{pad(s)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // hero variant
  return (
    <Link
      to="/predict"
      className="block rounded-xl bg-card shadow-card ring-hairline px-5 py-4 sm:px-6 sm:py-5 hover:ring-[color:var(--pitch)] transition-colors duration-200"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="label-micro">Next England match</div>
          <div className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight mt-1 truncate">
            ENG <span className="text-muted-foreground">vs</span> {oppName}{" "}
            <span aria-hidden="true">{oppFlag !== "⚽" ? oppFlag : ""}</span>
          </div>
          <div className="label-micro mt-1.5 hover:text-foreground transition-colors">
            Tap to predict →
          </div>
        </div>
        <div className="shrink-0 text-right">
          {live ? (
            <div>
              <div className="label-micro" style={{ color: "var(--pitch)" }}>Live</div>
              <div className="scoreline text-2xl sm:text-3xl text-pitch animate-live">NOW</div>
            </div>
          ) : (
            <div>
              <div className="label-micro">Kicks off in</div>
              <div className="scoreline text-2xl sm:text-3xl tabular-nums text-foreground mt-1">
                {d > 0 ? `${d}d ` : ""}{pad(h)}:{pad(m)}:{pad(s)}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
