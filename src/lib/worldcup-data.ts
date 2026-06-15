// FIFA World Cup 2026 — USA / Canada / Mexico
// June 11 – July 19, 2026 · 48 teams · 12 groups of 4
// Fixture data is representative; broadcast info is for AU & UK rights holders.

export type Region = "AU" | "UK";
export type Stage =
  | "Group Stage"
  | "Round of 32"
  | "Round of 16"
  | "Quarter-final"
  | "Semi-final"
  | "Third place"
  | "Final";

export interface Team {
  code: string;
  name: string;
  flag: string; // emoji
  group?: string;
}

export interface Match {
  id: string;
  stage: Stage;
  group?: string;
  homeCode: string;
  awayCode: string;
  // ISO UTC kickoff
  kickoffUTC: string;
  venue: string;
  city: string;
  // optional result
  homeScore?: number;
  awayScore?: number;
  // bracket hint (e.g. "Winner R16-1 vs Winner R16-2")
  bracketNote?: string;
}

export const BROADCASTERS: Record<Region, { name: string; channel: string; stream: string; note: string }> = {
  AU: {
    name: "Australia",
    channel: "Optus Sport",
    stream: "optussport.com.au",
    note: "Every match live · SBS shows selected free-to-air fixtures incl. Socceroos & Final",
  },
  UK: {
    name: "England",
    channel: "BBC One / ITV1",
    stream: "BBC iPlayer · ITVX",
    note: "Free-to-air · matches split between BBC and ITV · Final on both",
  },
};

export const TIMEZONES: Record<Region, { tz: string; label: string }> = {
  AU: { tz: "Australia/Sydney", label: "AEST/AEDT" },
  UK: { tz: "Europe/London", label: "BST" },
};

export const TEAMS: Record<string, Team> = {
  // Group A
  MEX: { code: "MEX", name: "Mexico", flag: "🇲🇽", group: "A" },
  CAN: { code: "CAN", name: "Canada", flag: "🇨🇦", group: "A" },
  KOR: { code: "KOR", name: "South Korea", flag: "🇰🇷", group: "A" },
  MAR: { code: "MAR", name: "Morocco", flag: "🇲🇦", group: "A" },
  // Group B
  USA: { code: "USA", name: "USA", flag: "🇺🇸", group: "B" },
  JPN: { code: "JPN", name: "Japan", flag: "🇯🇵", group: "B" },
  SUI: { code: "SUI", name: "Switzerland", flag: "🇨🇭", group: "B" },
  ECU: { code: "ECU", name: "Ecuador", flag: "🇪🇨", group: "B" },
  // Group C
  ARG: { code: "ARG", name: "Argentina", flag: "🇦🇷", group: "C" },
  CRO: { code: "CRO", name: "Croatia", flag: "🇭🇷", group: "C" },
  NGA: { code: "NGA", name: "Nigeria", flag: "🇳🇬", group: "C" },
  AUS: { code: "AUS", name: "Australia", flag: "🇦🇺", group: "C" },
  // Group D
  FRA: { code: "FRA", name: "France", flag: "🇫🇷", group: "D" },
  SEN: { code: "SEN", name: "Senegal", flag: "🇸🇳", group: "D" },
  URU: { code: "URU", name: "Uruguay", flag: "🇺🇾", group: "D" },
  IRN: { code: "IRN", name: "Iran", flag: "🇮🇷", group: "D" },
  // Group E
  ENG: { code: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "E" },
  COL: { code: "COL", name: "Colombia", flag: "🇨🇴", group: "E" },
  EGY: { code: "EGY", name: "Egypt", flag: "🇪🇬", group: "E" },
  NZL: { code: "NZL", name: "New Zealand", flag: "🇳🇿", group: "E" },
  // Group F
  ESP: { code: "ESP", name: "Spain", flag: "🇪🇸", group: "F" },
  MEX2: { code: "MEX2", name: "Costa Rica", flag: "🇨🇷", group: "F" },
  POL: { code: "POL", name: "Poland", flag: "🇵🇱", group: "F" },
  KSA: { code: "KSA", name: "Saudi Arabia", flag: "🇸🇦", group: "F" },
  // Group G
  GER: { code: "GER", name: "Germany", flag: "🇩🇪", group: "G" },
  DEN: { code: "DEN", name: "Denmark", flag: "🇩🇰", group: "G" },
  CIV: { code: "CIV", name: "Ivory Coast", flag: "🇨🇮", group: "G" },
  PAR: { code: "PAR", name: "Paraguay", flag: "🇵🇾", group: "G" },
  // Group H
  BRA: { code: "BRA", name: "Brazil", flag: "🇧🇷", group: "H" },
  POR: { code: "POR", name: "Portugal", flag: "🇵🇹", group: "H" },
  TUN: { code: "TUN", name: "Tunisia", flag: "🇹🇳", group: "H" },
  PAN: { code: "PAN", name: "Panama", flag: "🇵🇦", group: "H" },
  // Group I
  NED: { code: "NED", name: "Netherlands", flag: "🇳🇱", group: "I" },
  BEL: { code: "BEL", name: "Belgium", flag: "🇧🇪", group: "I" },
  ALG: { code: "ALG", name: "Algeria", flag: "🇩🇿", group: "I" },
  JOR: { code: "JOR", name: "Jordan", flag: "🇯🇴", group: "I" },
  // Group J
  ITA: { code: "ITA", name: "Italy", flag: "🇮🇹", group: "J" },
  SCO: { code: "SCO", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "J" },
  GHA: { code: "GHA", name: "Ghana", flag: "🇬🇭", group: "J" },
  QAT: { code: "QAT", name: "Qatar", flag: "🇶🇦", group: "J" },
  // Group K
  POR2: { code: "POR2", name: "Wales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", group: "K" },
  AUT: { code: "AUT", name: "Austria", flag: "🇦🇹", group: "K" },
  CMR: { code: "CMR", name: "Cameroon", flag: "🇨🇲", group: "K" },
  UZB: { code: "UZB", name: "Uzbekistan", flag: "🇺🇿", group: "K" },
  // Group L
  NOR: { code: "NOR", name: "Norway", flag: "🇳🇴", group: "L" },
  TUR: { code: "TUR", name: "Türkiye", flag: "🇹🇷", group: "L" },
  RSA: { code: "RSA", name: "South Africa", flag: "🇿🇦", group: "L" },
  HAI: { code: "HAI", name: "Haiti", flag: "🇭🇹", group: "L" },
};

// Helper to build ISO from local kickoff at a venue (we use UTC strings directly)
const t = (utc: string) => utc;

export const MATCHES: Match[] = [
  // ===== GROUP STAGE (selection) =====
  { id: "m1", stage: "Group Stage", group: "A", homeCode: "MEX", awayCode: "KOR", kickoffUTC: t("2026-06-11T19:00:00Z"), venue: "Estadio Azteca", city: "Mexico City", homeScore: 2, awayScore: 1 },
  { id: "m2", stage: "Group Stage", group: "B", homeCode: "USA", awayCode: "ECU", kickoffUTC: t("2026-06-12T00:00:00Z"), venue: "SoFi Stadium", city: "Los Angeles", homeScore: 3, awayScore: 0 },
  { id: "m3", stage: "Group Stage", group: "C", homeCode: "ARG", awayCode: "AUS", kickoffUTC: t("2026-06-13T19:00:00Z"), venue: "MetLife Stadium", city: "New York/NJ", homeScore: 2, awayScore: 2 },
  { id: "m4", stage: "Group Stage", group: "E", homeCode: "ENG", awayCode: "EGY", kickoffUTC: t("2026-06-14T19:00:00Z"), venue: "AT&T Stadium", city: "Dallas", homeScore: 2, awayScore: 0 },
  { id: "m5", stage: "Group Stage", group: "E", homeCode: "COL", awayCode: "NZL", kickoffUTC: t("2026-06-14T22:00:00Z"), venue: "BMO Field", city: "Toronto", homeScore: 1, awayScore: 0 },
  // Upcoming (today is 2026-06-15)
  { id: "m6", stage: "Group Stage", group: "D", homeCode: "FRA", awayCode: "IRN", kickoffUTC: t("2026-06-15T19:00:00Z"), venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  { id: "m7", stage: "Group Stage", group: "H", homeCode: "BRA", awayCode: "TUN", kickoffUTC: t("2026-06-15T22:00:00Z"), venue: "Hard Rock Stadium", city: "Miami" },
  { id: "m8", stage: "Group Stage", group: "F", homeCode: "ESP", awayCode: "KSA", kickoffUTC: t("2026-06-16T00:00:00Z"), venue: "Levi's Stadium", city: "San Francisco" },
  { id: "m9", stage: "Group Stage", group: "G", homeCode: "GER", awayCode: "CIV", kickoffUTC: t("2026-06-16T19:00:00Z"), venue: "NRG Stadium", city: "Houston" },
  { id: "m10", stage: "Group Stage", group: "J", homeCode: "ITA", awayCode: "GHA", kickoffUTC: t("2026-06-16T22:00:00Z"), venue: "Lincoln Financial Field", city: "Philadelphia" },
  { id: "m11", stage: "Group Stage", group: "E", homeCode: "ENG", awayCode: "COL", kickoffUTC: t("2026-06-19T19:00:00Z"), venue: "Arrowhead Stadium", city: "Kansas City" },
  { id: "m12", stage: "Group Stage", group: "C", homeCode: "AUS", awayCode: "NGA", kickoffUTC: t("2026-06-19T22:00:00Z"), venue: "BC Place", city: "Vancouver" },
  { id: "m13", stage: "Group Stage", group: "E", homeCode: "NZL", awayCode: "EGY", kickoffUTC: t("2026-06-19T16:00:00Z"), venue: "Gillette Stadium", city: "Boston" },
  { id: "m14", stage: "Group Stage", group: "E", homeCode: "ENG", awayCode: "NZL", kickoffUTC: t("2026-06-24T19:00:00Z"), venue: "Lumen Field", city: "Seattle" },
  { id: "m15", stage: "Group Stage", group: "E", homeCode: "COL", awayCode: "EGY", kickoffUTC: t("2026-06-24T19:00:00Z"), venue: "Lincoln Financial Field", city: "Philadelphia" },
  { id: "m16", stage: "Group Stage", group: "C", homeCode: "AUS", awayCode: "CRO", kickoffUTC: t("2026-06-24T22:00:00Z"), venue: "Mercedes-Benz Stadium", city: "Atlanta" },

  // ===== ROUND OF 32 =====
  { id: "r32-1", stage: "Round of 32", homeCode: "ENG", awayCode: "TBD", kickoffUTC: t("2026-06-29T19:00:00Z"), venue: "MetLife Stadium", city: "New York/NJ", bracketNote: "1E vs 3A/D/E/F" },
  { id: "r32-2", stage: "Round of 32", homeCode: "ARG", awayCode: "TBD", kickoffUTC: t("2026-06-30T22:00:00Z"), venue: "Hard Rock Stadium", city: "Miami", bracketNote: "1C vs 3B/E/F/I" },
  { id: "r32-3", stage: "Round of 32", homeCode: "FRA", awayCode: "TBD", kickoffUTC: t("2026-07-01T19:00:00Z"), venue: "AT&T Stadium", city: "Dallas", bracketNote: "1D vs 3A/B/C/G" },
  { id: "r32-4", stage: "Round of 32", homeCode: "BRA", awayCode: "TBD", kickoffUTC: t("2026-07-02T22:00:00Z"), venue: "SoFi Stadium", city: "Los Angeles", bracketNote: "1H vs 3D/E/F/I" },

  // ===== ROUND OF 16 =====
  { id: "r16-1", stage: "Round of 16", homeCode: "TBD", awayCode: "TBD", kickoffUTC: t("2026-07-04T19:00:00Z"), venue: "Lincoln Financial Field", city: "Philadelphia", bracketNote: "W(R32-1) vs W(R32-8) — England's path" },
  { id: "r16-2", stage: "Round of 16", homeCode: "TBD", awayCode: "TBD", kickoffUTC: t("2026-07-05T22:00:00Z"), venue: "Mercedes-Benz Stadium", city: "Atlanta", bracketNote: "Argentina's projected path" },

  // ===== QUARTER-FINALS =====
  { id: "qf1", stage: "Quarter-final", homeCode: "TBD", awayCode: "TBD", kickoffUTC: t("2026-07-09T22:00:00Z"), venue: "MetLife Stadium", city: "New York/NJ", bracketNote: "W(R16-1) vs W(R16-2) — possible ENG vs FRA" },
  { id: "qf2", stage: "Quarter-final", homeCode: "TBD", awayCode: "TBD", kickoffUTC: t("2026-07-10T22:00:00Z"), venue: "Estadio Azteca", city: "Mexico City", bracketNote: "W(R16-3) vs W(R16-4)" },
  { id: "qf3", stage: "Quarter-final", homeCode: "TBD", awayCode: "TBD", kickoffUTC: t("2026-07-11T19:00:00Z"), venue: "AT&T Stadium", city: "Dallas", bracketNote: "W(R16-5) vs W(R16-6) — possible ARG vs BRA" },
  { id: "qf4", stage: "Quarter-final", homeCode: "TBD", awayCode: "TBD", kickoffUTC: t("2026-07-11T22:00:00Z"), venue: "SoFi Stadium", city: "Los Angeles", bracketNote: "W(R16-7) vs W(R16-8)" },

  // ===== SEMI-FINALS =====
  { id: "sf1", stage: "Semi-final", homeCode: "TBD", awayCode: "TBD", kickoffUTC: t("2026-07-14T23:00:00Z"), venue: "AT&T Stadium", city: "Dallas", bracketNote: "W(QF1) vs W(QF2)" },
  { id: "sf2", stage: "Semi-final", homeCode: "TBD", awayCode: "TBD", kickoffUTC: t("2026-07-15T23:00:00Z"), venue: "Mercedes-Benz Stadium", city: "Atlanta", bracketNote: "W(QF3) vs W(QF4)" },

  // ===== 3RD PLACE & FINAL =====
  { id: "tp", stage: "Third place", homeCode: "TBD", awayCode: "TBD", kickoffUTC: t("2026-07-18T20:00:00Z"), venue: "Hard Rock Stadium", city: "Miami", bracketNote: "Losers of SF1 & SF2" },
  { id: "final", stage: "Final", homeCode: "TBD", awayCode: "TBD", kickoffUTC: t("2026-07-19T19:00:00Z"), venue: "MetLife Stadium", city: "New York/NJ", bracketNote: "W(SF1) vs W(SF2)" },
];

export const ENGLAND_GROUP_TABLE = [
  { code: "ENG", P: 1, W: 1, D: 0, L: 0, GF: 2, GA: 0, Pts: 3 },
  { code: "COL", P: 1, W: 1, D: 0, L: 0, GF: 1, GA: 0, Pts: 3 },
  { code: "NZL", P: 1, W: 0, D: 0, L: 1, GF: 0, GA: 1, Pts: 0 },
  { code: "EGY", P: 1, W: 0, D: 0, L: 1, GF: 0, GA: 2, Pts: 0 },
];

export function getTeam(code: string): Team {
  return TEAMS[code] ?? { code, name: code === "TBD" ? "TBD" : code, flag: "⚽" };
}

export function formatKickoff(utc: string, region: Region) {
  const tz = TIMEZONES[region].tz;
  const date = new Date(utc);
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: tz }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(date);
  return { day, time, tzLabel: TIMEZONES[region].label };
}

export function matchStatus(m: Match, now = new Date()): "FT" | "LIVE" | "UPCOMING" {
  const k = new Date(m.kickoffUTC).getTime();
  const n = now.getTime();
  if (typeof m.homeScore === "number" && typeof m.awayScore === "number") return "FT";
  if (n >= k && n < k + 110 * 60 * 1000) return "LIVE";
  // Past kickoff window with no score reported — treat as finished so it
  // drops out of "upcoming" lists on the home page.
  if (n >= k + 110 * 60 * 1000) return "FT";
  return "UPCOMING";
}

export const STAGES: Stage[] = [
  "Group Stage", "Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Third place", "Final",
];
