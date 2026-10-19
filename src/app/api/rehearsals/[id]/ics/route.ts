import { getTranslations } from "next-intl/server";
import { tErr } from "@/i18n/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: await tErr("notAuthenticated") }, { status: 401 });
  }

  const { data: rehearsal, error } = await supabase
    .from("rehearsals")
    .select(`
      *,
      band:bands(name),
      setlist:setlists(name),
      participants:rehearsal_participants(
        profile:profiles(display_name, username)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !rehearsal) {
    return NextResponse.json({ error: await tErr("rehearsalNotFound") }, { status: 404 });
  }

  const startDate = new Date(rehearsal.date);
  const endDate = rehearsal.end_date
    ? new Date(rehearsal.end_date)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // default 2h

  const t = await getTranslations("ics");
  const bandName = (rehearsal.band as { name: string })?.name || (await getTranslations("common"))("band");
  const setlistName = (rehearsal.setlist as { name: string })?.name;

  const attendees = (rehearsal.participants as { profile: { display_name: string | null; username: string } }[])
    .map((p) => p.profile?.display_name || p.profile?.username)
    .filter(Boolean)
    .join(", ");

  let description = t("band", { name: bandName });
  if (setlistName) description += `\\nSetlist: ${setlistName}`;
  if (rehearsal.description) description += `\\n\\n${escapeICS(rehearsal.description)}`;
  if (attendees) description += `\\n\\n${t("participants", { names: attendees })}`;

  const location = rehearsal.location ? escapeICS(rehearsal.location) : "";

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ostinara//Rehearsal//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:rehearsal-${rehearsal.id}@ostinara.app`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICS(rehearsal.title)} - ${escapeICS(bandName)}`,
    `DESCRIPTION:${description}`,
    ...(location ? [`LOCATION:${location}`] : []),
    ...(rehearsal.location_url ? [`URL:${rehearsal.location_url}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${t("inOneHour", { title: escapeICS(rehearsal.title) })}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${t("tomorrow", { title: escapeICS(rehearsal.title) })}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t("filename")}-${rehearsal.id}.ics"`,
    },
  });
}
