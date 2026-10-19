import { tErr } from "@/i18n/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AudioIdentificationResult } from "@/types";

export async function POST(request: NextRequest) {
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
    return NextResponse.json(
      { error: await tErr("proOnly") },
      { status: 403 }
    );
  }

  const apiToken = process.env.AUDD_API_TOKEN;
  if (!apiToken) {
    console.error("[Audio Identify] AUDD_API_TOKEN not configured");
    return NextResponse.json(
      { error: await tErr("recognitionNotConfigured") },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob | null;

    if (!audioFile) {
      return NextResponse.json({ error: await tErr("noAudioFile") }, { status: 400 });
    }

    // Forward to AudD.io
    const auddFormData = new FormData();
    auddFormData.append("api_token", apiToken);
    auddFormData.append("return", "deezer");
    auddFormData.append("file", audioFile, "recording.webm");

    const auddResponse = await fetch("https://api.audd.io/", {
      method: "POST",
      body: auddFormData,
    });

    if (!auddResponse.ok) {
      console.error("[Audio Identify] AudD API error:", auddResponse.status);
      return NextResponse.json(
        { error: await tErr("recognitionServiceError") },
        { status: 502 }
      );
    }

    const auddData = await auddResponse.json();

    if (auddData.status === "error") {
      console.error("[Audio Identify] AudD error:", auddData.error);
      return NextResponse.json(
        { error: await tErr("recognitionServiceError") },
        { status: 502 }
      );
    }

    // No match found
    if (!auddData.result) {
      return NextResponse.json({ result: null, message: await tErr("songNotRecognized") });
    }

    const r = auddData.result;
    // L'objet Deezer d'AudD : la forme publique de l'API (id, preview, album.cover_*).
    const deezerData = r.deezer;

    const result: AudioIdentificationResult = {
      title: r.title || "Inconnu",
      artist: r.artist || "Inconnu",
      album: r.album || deezerData?.album?.title,
      release_date: r.release_date,
      cover_url: deezerData?.album?.cover_xl || deezerData?.album?.cover_big,
      deezer_id: deezerData?.id ? String(deezerData.id) : undefined,
      preview_url: deezerData?.preview,
    };

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[Audio Identify] Unexpected error:", err);
    return NextResponse.json(
      { error: await tErr("unexpected") },
      { status: 500 }
    );
  }
}
