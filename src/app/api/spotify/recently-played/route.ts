import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSpotifyToken, formatTrackForSong } from "@/lib/services/spotify";

export async function GET() {
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

  const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Erreur Spotify" }, { status: response.status });
  }

  const data = await response.json();

  // Deduplicate by track ID
  const seen = new Set<string>();
  const tracks = data.items
    .filter((item: { track: { id: string } }) => {
      if (seen.has(item.track.id)) return false;
      seen.add(item.track.id);
      return true;
    })
    .map((item: { track: Parameters<typeof formatTrackForSong>[0] }) => formatTrackForSong(item.track));

  return NextResponse.json({ tracks });
}
