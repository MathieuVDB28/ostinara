import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserSpotifyToken } from "@/lib/services/spotify";

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

  const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Erreur Spotify" }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
