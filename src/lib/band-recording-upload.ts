"use client";

import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { BAND_RECORDING_BUCKET, bandRecordingPath, baseMimeType } from "@/lib/band-recordings";

/** L'extension d'un fichier, a defaut celle de son type. */
export function recordingExtension(name: string | null, mimeType: string): string {
  const fromName = name?.includes(".") ? name.split(".").pop() : null;
  if (fromName) return fromName;
  const base = baseMimeType(mimeType);
  const known: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  return known[base] ?? "bin";
}

/**
 * Envoie un fichier dans le dossier <groupe>/<moi>/ du bucket prive, par Tus
 * (reprise possible). Renvoie le chemin, a enregistrer sur la ligne.
 */
export async function uploadBandRecordingFile(
  bandId: string,
  file: Blob,
  options: { name: string | null; mimeType: string; onProgress: (percent: number) => void }
): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("not_authenticated");

  const path = bandRecordingPath(bandId, session.user.id, recordingExtension(options.name, options.mimeType));
  const endpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      headers: { authorization: `Bearer ${session.access_token}`, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BAND_RECORDING_BUCKET,
        objectName: path,
        // Sans parametres : le bucket compare le type a sa liste.
        contentType: baseMimeType(options.mimeType),
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      onError: (error) => reject(error),
      onProgress: (sent, total) => options.onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    upload.start();
  });

  return path;
}

/** La duree d'un fichier, lue par le navigateur ; null s'il ne sait pas. */
export function readMediaDuration(file: Blob, kind: "audio" | "video"): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const element = document.createElement(kind);
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      element.removeAttribute("src");
      resolve(value);
    };
    const timer = setTimeout(() => done(null), 8000);
    element.preload = "metadata";
    element.onloadedmetadata = () => {
      clearTimeout(timer);
      done(Number.isFinite(element.duration) ? element.duration : null);
    };
    element.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    element.src = url;
  });
}
