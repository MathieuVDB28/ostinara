import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AudioIdentificationResult } from "@/types";

export async function POST(request: NextRequest) {
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
    return NextResponse.json(
      { error: "Fonctionnalité réservée aux plans Pro et Band" },
      { status: 403 }
    );
  }

  const apiToken = process.env.AUDD_API_TOKEN;
  if (!apiToken) {
    console.error("[Audio Identify] AUDD_API_TOKEN not configured");
    return NextResponse.json(
      { error: "Service de reconnaissance non configuré" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob | null;

    if (!audioFile) {
      return NextResponse.json({ error: "Aucun fichier audio fourni" }, { status: 400 });
    }

    // Forward to AudD.io
    const auddFormData = new FormData();
    auddFormData.append("api_token", apiToken);
    auddFormData.append("return", "spotify");
    auddFormData.append("file", audioFile, "recording.webm");

    const auddResponse = await fetch("https://api.audd.io/", {
      method: "POST",
      body: auddFormData,
    });

    if (!auddResponse.ok) {
      console.error("[Audio Identify] AudD API error:", auddResponse.status);
      return NextResponse.json(
        { error: "Erreur du service de reconnaissance" },
        { status: 502 }
      );
    }

    const auddData = await auddResponse.json();

    if (auddData.status === "error") {
      console.error("[Audio Identify] AudD error:", auddData.error);
      return NextResponse.json(
        { error: "Erreur du service de reconnaissance" },
        { status: 502 }
      );
    }

    // No match found
    if (!auddData.result) {
      return NextResponse.json({ result: null, message: "Morceau non reconnu" });
    }

    const r = auddData.result;
    const spotifyData = r.spotify;

    const result: AudioIdentificationResult = {
      title: r.title || "Inconnu",
      artist: r.artist || "Inconnu",
      album: r.album || spotifyData?.album?.name,
      release_date: r.release_date,
      cover_url: spotifyData?.album?.images?.[0]?.url,
      spotify_id: spotifyData?.id,
      preview_url: spotifyData?.preview_url,
    };

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[Audio Identify] Unexpected error:", err);
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue" },
      { status: 500 }
    );
  }
}
