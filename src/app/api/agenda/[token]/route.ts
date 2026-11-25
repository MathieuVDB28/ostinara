import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadAgenda, type AgendaEvent } from "@/lib/agenda";
import { shiftWallDays } from "@/lib/time-zone";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 86_400_000;

function text(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** 75 octets par ligne au plus (RFC 5545), sans couper un caractere. */
function fold(line: string): string {
  const lines: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    if (size + bytes > 73) {
      lines.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  return [...lines, current].join("\r\n ");
}

function stamp(value: string | Date): string {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function dayAfter(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const next = shiftWallDays({ year, month, day: date, hour: 0, minute: 0 }, 1);
  return `${next.year}${String(next.month).padStart(2, "0")}${String(next.day).padStart(2, "0")}`;
}

function vevent(event: AgendaEvent, now: Date, origin: string): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${event.key}@ostinara.app`,
    `DTSTAMP:${stamp(now)}`,
    ...(event.day
      ? [`DTSTART;VALUE=DATE:${event.day.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${dayAfter(event.day)}`]
      : [`DTSTART:${stamp(event.starts_at)}`, `DTEND:${stamp(event.ends_at)}`]),
    `SUMMARY:${text(event.withName ? `${event.title} - ${event.withName}` : event.title)}`,
    ...(event.location ? [`LOCATION:${text(event.location)}`] : []),
    `URL:${origin}${event.href}`,
    "END:VEVENT",
  ];
}

/**
 * L'abonnement agenda : le lien secret suffit, Google et Apple ne se
 * connectent pas. Un compte repasse en Free rend un agenda vide, pour que ses
 * evenements disparaissent proprement.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/, "");
  if (!UUID.test(token)) return new NextResponse("Not found", { status: 404 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: feed, error } = await db
    .from("calendar_feeds")
    .select("user_id, profile:profiles(plan)")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    console.error("[agenda] feed:", error);
    return new NextResponse("Error", { status: 500 });
  }
  if (!feed) return new NextResponse("Not found", { status: 404 });

  const now = new Date();
  const plan = (feed.profile as unknown as { plan: string } | null)?.plan;
  let events: AgendaEvent[] = [];
  if (plan === "pro" || plan === "band") {
    try {
      events = await loadAgenda(db, feed.user_id, new Date(now.getTime() - 31 * DAY), new Date(now.getTime() + 366 * DAY));
    } catch (err) {
      // Pas d'agenda vide sur une erreur : l'abonne perdrait ses evenements.
      console.error("[agenda] load:", err);
      return new NextResponse("Error", { status: 500 });
    }
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ostinara//Agenda//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Ostinara",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    ...events.flatMap((event) => vevent(event, now, origin)),
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");

  return new NextResponse(`${ics}\r\n`, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
