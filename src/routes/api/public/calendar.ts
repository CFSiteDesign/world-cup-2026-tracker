import { createFileRoute } from "@tanstack/react-router";

function decodeCalendarPayload(value: string | null) {
  if (!value || value.length > 20_000) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const content = Buffer.from(padded, "base64").toString("utf8");
    if (!content.startsWith("BEGIN:VCALENDAR") || !content.includes("END:VCALENDAR")) return null;
    return content;
  } catch {
    return null;
  }
}

function safeFilename(value: string | null) {
  const fallback = "world-cup-2026.ics";
  if (!value) return fallback;
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  return cleaned.endsWith(".ics") ? cleaned : fallback;
}

export const Route = createFileRoute("/api/public/calendar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const calendar = decodeCalendarPayload(url.searchParams.get("ics"));
        if (!calendar) return new Response("Invalid calendar", { status: 400 });

        const filename = safeFilename(url.searchParams.get("filename"));
        return new Response(calendar, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});