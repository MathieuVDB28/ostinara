import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSpotifyToken, formatTrackForSong } from "@/lib/services/spotify";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const token = await getUserSpotifyToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "Connexion Spotify expirée" }, { status: 401 });
  }

  // Fetch first page of tracks
  const firstResponse = await fetch(
    `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!firstResponse.ok) {
    return NextResponse.json({ error: "Erreur Spotify" }, { status: firstResponse.status });
  }

  const firstPage = await firstResponse.json();
  const allTracks: ReturnType<typeof formatTrackForSong>[] = [];

  for (const item of firstPage.items) {
    if (item.track) {
      allTracks.push(formatTrackForSong(item.track));
    }
  }

  // Fetch remaining pages if any
  let nextUrl: string | null = firstPage.next;
  while (nextUrl) {
    const pageResponse: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!pageResponse.ok) break;

    const pageData: { items: { track: Parameters<typeof formatTrackForSong>[0] | null }[]; next: string | null } = await pageResponse.json();

    for (const item of pageData.items) {
      if (item.track) {
        allTracks.push(formatTrackForSong(item.track));
      }
    }

    nextUrl = pageData.next;
  }

  return NextResponse.json({ tracks: allTracks, total: allTracks.length });
}
