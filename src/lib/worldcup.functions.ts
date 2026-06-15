import { createServerFn } from "@tanstack/react-start";
import type { Match, Stage } from "./worldcup-data";

export interface GroupRow {
  code: string;
  name: string;
  crest?: string;
  P: number;
  W: number;
  D: number;
  L: number;
  GF: number;
  GA: number;
  Pts: number;
}

export interface GroupTable {
  group: string; // "A", "B", ...
  rows: GroupRow[];
}

export interface LiveWorldCup {
  matches: Match[];
  groups: GroupTable[];
  crests: Record<string, string>; // TLA -> crest url
  names: Record<string, string>; // TLA -> short name
  fetchedAt: string;
  source: "live" | "fallback";
}

const STAGE_MAP: Record<string, Stage> = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINALS: "Quarter-final",
  SEMI_FINALS: "Semi-final",
  THIRD_PLACE: "Third place",
  THIRD_PLACE_FINAL: "Third place",
  FINAL: "Final",
};

interface ApiTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group?: string | null;
  matchday?: number;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
    winner?: string | null;
  };
  venue?: string;
}

interface ApiStanding {
  group?: string;
  type: string;
  table: Array<{
    position: number;
    team: ApiTeam;
    playedGames: number;
    won: number;
    draw: number;
    lost: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
  }>;
}

function tlaOf(t: ApiTeam): string {
  return t.tla ?? `T${t.id}`;
}

function shortName(t: ApiTeam): string {
  return t.shortName ?? t.name ?? tlaOf(t);
}

function groupLetter(g?: string | null): string | undefined {
  if (!g) return undefined;
  // "GROUP_A" or "Group A"
  const m = g.match(/[A-L]$/);
  return m ? m[0] : undefined;
}

export const getWorldCup = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveWorldCup> => {
    const key = process.env.FOOTBALL_DATA_API_KEY;
    if (!key) throw new Error("FOOTBALL_DATA_API_KEY missing");

    const headers = { "X-Auth-Token": key };
    const base = "https://api.football-data.org/v4/competitions/WC";

    const [matchesRes, standingsRes] = await Promise.all([
      fetch(`${base}/matches`, { headers }),
      fetch(`${base}/standings`, { headers }),
    ]);

    if (!matchesRes.ok) {
      throw new Error(`football-data matches ${matchesRes.status}`);
    }

    const matchesJson = (await matchesRes.json()) as { matches: ApiMatch[] };
    const standingsJson = standingsRes.ok
      ? ((await standingsRes.json()) as { standings: ApiStanding[] })
      : { standings: [] };

    const crests: Record<string, string> = {};
    const names: Record<string, string> = {};

    const matches: Match[] = matchesJson.matches.map((m) => {
      const homeTla = tlaOf(m.homeTeam);
      const awayTla = tlaOf(m.awayTeam);
      if (m.homeTeam.crest) crests[homeTla] = m.homeTeam.crest;
      if (m.awayTeam.crest) crests[awayTla] = m.awayTeam.crest;
      names[homeTla] = shortName(m.homeTeam);
      names[awayTla] = shortName(m.awayTeam);

      const stage = STAGE_MAP[m.stage] ?? "Group Stage";
      const homeScore = m.score.fullTime.home;
      const awayScore = m.score.fullTime.away;
      const hasScore =
        (m.status === "FINISHED" || m.status === "IN_PLAY" || m.status === "PAUSED") &&
        homeScore !== null &&
        awayScore !== null;

      return {
        id: `fd-${m.id}`,
        stage,
        group: groupLetter(m.group),
        homeCode: homeTla,
        awayCode: awayTla,
        kickoffUTC: m.utcDate,
        venue: m.venue ?? "",
        city: "",
        homeScore: hasScore ? homeScore! : undefined,
        awayScore: hasScore ? awayScore! : undefined,
      };
    });

    const groups: GroupTable[] = (standingsJson.standings ?? [])
      .filter((s) => s.type === "TOTAL" && s.group)
      .map((s) => {
        const letter = groupLetter(s.group) ?? "";
        return {
          group: letter,
          rows: s.table.map((row) => {
            const tla = tlaOf(row.team);
            if (row.team.crest) crests[tla] = row.team.crest;
            names[tla] = shortName(row.team);
            return {
              code: tla,
              name: shortName(row.team),
              crest: row.team.crest,
              P: row.playedGames,
              W: row.won,
              D: row.draw,
              L: row.lost,
              GF: row.goalsFor,
              GA: row.goalsAgainst,
              Pts: row.points,
            };
          }),
        };
      })
      .sort((a, b) => a.group.localeCompare(b.group));

    return {
      matches,
      groups,
      crests,
      names,
      fetchedAt: new Date().toISOString(),
      source: "live",
    };
  },
);
