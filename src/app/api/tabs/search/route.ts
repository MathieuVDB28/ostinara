import { tErr } from "@/i18n/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchSongsterr, getSongsterrUrl } from "@/lib/services/songsterr";
import type { TabSource } from "@/types";

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title");
  const artist = request.nextUrl.searchParams.get("artist");

  if (!title || !artist) {
    return NextResponse.json({ error: "title et artist requis" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: await tErr("notAuthenticated") }, { status: 401 });
  }

  // Check plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!profile || profile.plan === "free") {
    return NextResponse.json({ error: await tErr("proOnly") }, { status: 403 });
  }

  // Fetch from Songsterr (new API)
  const songsterrResults = await searchSongsterr(title, artist);

  // Convert to TabSource format
  const sources: TabSource[] = songsterrResults.map((result) => ({
    source: "songsterr" as const,
    title: result.title,
    artist: result.artist,
    url: getSongsterrUrl(result.songId),
    songsterrId: result.songId,
  }));

  return NextResponse.json({ sources });
}
