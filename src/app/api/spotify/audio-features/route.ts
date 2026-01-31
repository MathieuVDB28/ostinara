import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAudioFeatures } from "@/lib/services/spotify";

export async function GET(request: NextRequest) {
  const spotifyId = request.nextUrl.searchParams.get("spotify_id");

  if (!spotifyId) {
    return NextResponse.json({ error: "spotify_id requis" }, { status: 400 });
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

  const features = await getAudioFeatures(spotifyId);
  if (!features) {
    return NextResponse.json({ error: "Données audio non disponibles" }, { status: 404 });
  }

  return NextResponse.json(features);
}
