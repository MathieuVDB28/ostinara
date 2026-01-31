import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchSongsterr, getSongsterrUrl } from "@/lib/services/songsterr";
import { getTabSources } from "@/lib/services/ultimate-guitar";
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
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Check plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!profile || profile.plan === "free") {
    return NextResponse.json({ error: "Fonctionnalité Pro/Band uniquement" }, { status: 403 });
  }

  // Fetch from both sources in parallel
  const [songsterrResults, ugSources] = await Promise.all([
    searchSongsterr(title, artist),
    Promise.resolve(getTabSources(title, artist)),
  ]);

  // Convert Songsterr results to TabSource format
  const songsterrSources: TabSource[] = songsterrResults.map((result) => ({
    source: "songsterr" as const,
    title: result.title,
    artist: result.artist.name,
    url: getSongsterrUrl(result.id),
  }));

  const allSources = [...songsterrSources, ...ugSources];

  return NextResponse.json({ sources: allSources });
}
