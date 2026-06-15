import { TIMEZONES, type Match, type Region, matchStatus, getTeam } from "./worldcup-data";
import type { GroupRow } from "./worldcup.functions";

export const ENG = "ENG";
export const GROUP_E_CODES = ["ENG", "COL", "EGY", "NZL"];

export function isEnglandMatch(m: Match) {
  return m.homeCode === ENG || m.awayCode === ENG;
}

export function isGroupEMatch(m: Match) {
  if (m.group === "E") return true;
  return GROUP_E_CODES.includes(m.homeCode) && GROUP_E_CODES.includes(m.awayCode);
}

/* ---------- Dual timezone ---------- */

export interface DualTime {
  uk: { day: string; time: string; tz: string };
  au: { day: string; time: string; tz: string };
}

export function dualKickoff(utc: string): DualTime {
  const date = new Date(utc);
  const fmt = (region: Region) => {
    const tz = TIMEZONES[region].tz;
    return {
      day: new Intl.DateTimeFormat("en-GB", {
        weekday: "short", day: "2-digit", month: "short", timeZone: tz,
      }).format(date),
      time: new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
      }).format(date),
      tz: TIMEZONES[region].label,
    };
  };
  return { uk: fmt("UK"), au: fmt("AU") };
}

/* ---------- Scoring ---------- */

export interface Prediction {
  id: string;
  player_name: string;
  match_id: string;
  home_pred: number;
  away_pred: number;
}

export function scorePrediction(p: Prediction, m: Match): { points: number; exact: boolean } | null {
  if (typeof m.homeScore !== "number" || typeof m.awayScore !== "number") return null;
  const exact = p.home_pred === m.homeScore && p.away_pred === m.awayScore;
  if (exact) return { points: 3, exact: true };
  const predRes = Math.sign(p.home_pred - p.away_pred);
  const realRes = Math.sign(m.homeScore - m.awayScore);
  if (predRes === realRes) return { points: 1, exact: false };
  return { points: 0, exact: false };
}

/* ---------- Qualification scenarios (2026 format) ---------- */

export interface ScenarioResult {
  lines: string[];
  status: "through-top2" | "through-best3-likely" | "in-contention" | "eliminated";
}

/**
 * Compute simple England qualification messages.
 * 2026 format: top 2 of each group + best 8 third-placed teams advance to Round of 32.
 */
export function englandScenarios(rows: GroupRow[], groupMatches: Match[], now: Date): ScenarioResult {
  const eng = rows.find(r => r.code === ENG);
  if (!eng || rows.length === 0) {
    return { lines: ["England's group data isn't available yet."], status: "in-contention" };
  }

  const remaining = groupMatches.filter(m => matchStatus(m, now) !== "FT");
  const engRemaining = remaining.filter(m => m.homeCode === ENG || m.awayCode === ENG);
  const totalGames = 3;
  const gamesLeftForEng = totalGames - eng.P;

  const sorted = [...rows].sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    const gdA = a.GF - a.GA, gdB = b.GF - b.GA;
    if (gdB !== gdA) return gdB - gdA;
    return b.GF - a.GF;
  });
  const engPos = sorted.findIndex(r => r.code === ENG) + 1;
  const maxEngPts = eng.Pts + gamesLeftForEng * 3;

  const lines: string[] = [];

  // Already through top 2?
  if (gamesLeftForEng === 0 && engPos <= 2) {
    lines.push(`England finish ${engPos === 1 ? "top of" : "2nd in"} Group E and are through to the Round of 32.`);
    return { lines, status: "through-top2" };
  }

  // Can any team behind still pass England?
  const teamsBehind = sorted.filter(r => r.code !== ENG);
  const threatsToTop2 = teamsBehind.filter(t => {
    const tLeft = totalGames - t.P;
    return t.Pts + tLeft * 3 > eng.Pts || (t.Pts + tLeft * 3 === eng.Pts);
  });

  // Mathematically certain top-2
  const ahead = sorted.filter(r => r.Pts > maxEngPts).length;
  if (ahead < 2 && engPos <= 2) {
    // Check if remaining results can drop England to 3rd
    const couldDropTo3rd = teamsBehind.filter(t => {
      const tLeft = totalGames - t.P;
      return t.Pts + tLeft * 3 > eng.Pts;
    }).length >= 2;
    if (!couldDropTo3rd && engPos <= 2) {
      lines.push("England are mathematically through to the Round of 32 as a top-two finisher.");
      return { lines, status: "through-top2" };
    }
  }

  // Eliminated entirely (cannot finish top 2 AND no realistic best-3rd hope)
  const certainTop2 = sorted.filter(r => r.code !== ENG && r.Pts > maxEngPts).length;
  if (certainTop2 >= 2 && maxEngPts < 3) {
    lines.push("England cannot finish in the top two and have no points to chase a best third place. Out.");
    return { lines, status: "eliminated" };
  }

  // In contention messaging
  if (engRemaining.length > 0) {
    const next = engRemaining[0];
    const opp = next.homeCode === ENG ? next.awayCode : next.homeCode;
    const oppName = getTeam(opp).name;
    if (eng.Pts >= 6) {
      lines.push(`England already on ${eng.Pts} points — a draw against ${oppName} guarantees the top two.`);
    } else if (eng.Pts >= 3) {
      lines.push(`England need a win against ${oppName} to take control of Group E.`);
    } else if (eng.Pts === 1) {
      lines.push(`England must win against ${oppName} to keep top-two qualification in their own hands.`);
    } else {
      lines.push(`England need a result against ${oppName}; a loss leaves them relying on a best third-place finish.`);
    }
  }

  if (engPos === 3 && maxEngPts >= 3) {
    lines.push("Even outside the top two, the best 8 third-placed teams advance — third place is still alive.");
    return { lines, status: "through-best3-likely" };
  }

  if (threatsToTop2.length === 0 && gamesLeftForEng > 0 && engPos <= 2) {
    lines.push("No team can mathematically catch England — top-two qualification is virtually secured.");
  }

  return { lines, status: "in-contention" };
}

/* ---------- ICS calendar export ---------- */

function icsDate(utc: string) {
  // YYYYMMDDTHHMMSSZ
  return utc.replace(/[-:]/g, "").replace(/\.\d+/, "");
}

function icsEscape(s: string) {
  return s.replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
}

export function buildEnglandIcs(matches: Match[], names: Record<string, string> = {}): string {
  const englandMatches = matches.filter(isEnglandMatch);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//World Cup 26 Tracker//England//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const m of englandMatches) {
    const start = new Date(m.kickoffUTC);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const opp = m.homeCode === ENG ? m.awayCode : m.homeCode;
    const oppName = names[opp] ?? getTeam(opp).name;
    const summary = `England vs ${oppName} — World Cup 26`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id}@worldcup26-tracker`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(start.toISOString())}`,
      `DTEND:${icsDate(end.toISOString())}`,
      `SUMMARY:${icsEscape(summary)}`,
      `LOCATION:${icsEscape([m.venue, m.city].filter(Boolean).join(", "))}`,
      `DESCRIPTION:${icsEscape(`${m.stage}${m.group ? ` · Group ${m.group}` : ""}`)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:England kicks off in 15 minutes",
      "TRIGGER:-PT15M",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function buildMatchIcs(m: Match, names: Record<string, string> = {}): string {
  const start = new Date(m.kickoffUTC);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const homeName = names[m.homeCode] ?? getTeam(m.homeCode).name;
  const awayName = names[m.awayCode] ?? getTeam(m.awayCode).name;
  const summary = `${homeName} vs ${awayName} — World Cup 26`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//World Cup 26 Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${m.id}@worldcup26-tracker`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(start.toISOString())}`,
    `DTEND:${icsDate(end.toISOString())}`,
    `SUMMARY:${icsEscape(summary)}`,
    `LOCATION:${icsEscape([m.venue, m.city].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${icsEscape(`${m.stage}${m.group ? ` · Group ${m.group}` : ""}`)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Kick off in 15 minutes",
    "TRIGGER:-PT15M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && "ontouchend" in document);
}

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function isMobile() {
  return isIOS() || isAndroid();
}

function base64UrlEncode(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function calendarFileUrl(filename: string, content: string) {
  return `/api/public/calendar?filename=${encodeURIComponent(filename)}&ics=${base64UrlEncode(content)}`;
}

function googleCalendarUrl(m: Match, names: Record<string, string> = {}) {
  const start = new Date(m.kickoffUTC);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const homeName = names[m.homeCode] ?? getTeam(m.homeCode).name;
  const awayName = names[m.awayCode] ?? getTeam(m.awayCode).name;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${homeName} vs ${awayName} — World Cup 26`,
    dates: `${icsDate(start.toISOString())}/${icsDate(end.toISOString())}`,
    details: `${m.stage}${m.group ? ` · Group ${m.group}` : ""}`,
    location: [m.venue, m.city].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcs(filename: string, content: string) {
  // Mobile browsers do not reliably hand blob: or data: URLs to Calendar.
  // Route through a real HTTPS text/calendar response so iOS/Android can open
  // the native calendar/add-event flow instead of a Lovable blob page.
  if (isMobile()) {
    window.location.href = calendarFileUrl(filename, content);
    return;
  }

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Android Chrome handles .ics downloads but some browsers prefer a new tab.
  if (isAndroid()) a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}


export function addMatchToCalendar(m: Match, names: Record<string, string> = {}) {
  const ics = buildMatchIcs(m, names);
  const home = (names[m.homeCode] ?? getTeam(m.homeCode).name).toLowerCase().replace(/\s+/g, "-");
  const away = (names[m.awayCode] ?? getTeam(m.awayCode).name).toLowerCase().replace(/\s+/g, "-");
  if (isAndroid()) {
    window.location.href = googleCalendarUrl(m, names);
    return;
  }
  downloadIcs(`wc26-${home}-vs-${away}.ics`, ics);
}

