import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/webm"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const songId = formData.get("songId") as string | null;

    if (!file || !songId) {
      return NextResponse.json(
        { error: "Fichier et songId requis" },
        { status: 400 }
      );
    }

    // Valider la taille
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier dépasse la limite de 200 Mo" },
        { status: 400 }
      );
    }

    // Valider le type
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type);

    if (!isVideo && !isAudio) {
      return NextResponse.json(
        { error: "Type de fichier non supporté. Utilisez MP4, WebM, MOV, MP3, ou WAV." },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || (isVideo ? "mp4" : "mp3");
    const filename = `${user.id}/${songId}/${timestamp}.${extension}`;

    // Convertir le File en ArrayBuffer pour l'upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from("covers")
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'upload" },
        { status: 500 }
      );
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from("covers")
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path,
      mediaType: isVideo ? "video" : "audio",
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
