import { getTranslations } from "next-intl/server";
import { NextRequest, NextResponse } from "next/server";
import { tErr } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Un concert (setlist de groupe datee) a ajouter a son agenda. Heure de Paris. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: await tErr("notAuthenticated") }, { status: 401 });

  // Sous RLS : seuls les membres du groupe (ou l'auteur) lisent la setlist.
  const { data: setlist } = await supabase
    .from("setlists")
    .select("id, name, description, concert_date, concert_time, venue, city, ticket_url, band:bands(name)")
    .eq("id", id)
    .maybeSingle();
  if (!setlist?.concert_date) return NextResponse.json({ error: await tErr("concertNotFound") }, { status: 404 });

  const t = await getTranslations("ics");
  const band = (setlist.band as unknown as { name: string } | null)?.name;
  // Calculs sur l'heure locale traitee comme UTC : seul l'affichage compte (TZID).
  const [y, mo, d] = setlist.concert_date.split("-").map(Number);
  const compact = (date: Date, withTime: boolean) =>
    date.toISOString().slice(0, withTime ? 16 : 10).replace(/[-:]/g, "") + (withTime ? "00" : "");
  let when: string[];
  if (setlist.concert_time) {
    const [h, m] = setlist.concert_time.split(":").map(Number);
    const start = new Date(Date.UTC(y, mo - 1, d, h, m));
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    when = [
      `DTSTART;TZID=Europe/Paris:${compact(start, true)}`,
      `DTEND;TZID=Europe/Paris:${compact(end, true)}`,
    ];
  } else {
    const start = new Date(Date.UTC(y, mo - 1, d));
    const end = new Date(Date.UTC(y, mo - 1, d + 1));
    when = [`DTSTART;VALUE=DATE:${compact(start, false)}`, `DTEND;VALUE=DATE:${compact(end, false)}`];
  }

  const location = [setlist.venue, setlist.city].filter(Boolean).join(", ");
  const summary = band ? `${setlist.name} - ${band}` : setlist.name;
  let description = band ? t("band", { name: band }) : "";
  if (setlist.description) description += `${description ? "\\n\\n" : ""}${escapeICS(setlist.description)}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ostinara//Concert//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:concert-${setlist.id}@ostinara.app`,
    `DTSTAMP:${stamp(new Date())}`,
    ...when,
    `SUMMARY:${escapeICS(summary)}`,
    ...(description ? [`DESCRIPTION:${description}`] : []),
    ...(location ? [`LOCATION:${escapeICS(location)}`] : []),
    ...(setlist.ticket_url ? [`URL:${setlist.ticket_url}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${t("concertTomorrow", { title: escapeICS(setlist.name) })}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t("concertFilename")}-${setlist.id}.ics"`,
    },
  });
}
