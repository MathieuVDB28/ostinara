/**
 * Demos et enregistrements du groupe (F6) : regles partagees client / serveur.
 * La base (migration 20261130_band_recordings) reste seule a faire foi.
 */

/** 20 Go par groupe, quel que soit le plan de qui envoie. */
export const BAND_RECORDING_QUOTA_BYTES = 20 * 1024 * 1024 * 1024;
/** Taille d'un fichier choisi, avant compression (limite du bucket : 500 Mo). */
export const BAND_RECORDING_MAX_FILE_BYTES = 500 * 1024 * 1024;
/** Un enregistrement au micro s'arrete tout seul au bout de 3 h. */
export const BAND_RECORDING_MAX_MIC_SECONDS = 3 * 60 * 60;

export const BAND_RECORDING_BUCKET = "band-recordings";

export const BAND_RECORDING_KINDS = ["demo", "rehearsal", "concert", "other"] as const;
export type BandRecordingKind = (typeof BAND_RECORDING_KINDS)[number];

export const BAND_RECORDING_TITLE_MAX = 200;
export const BAND_RECORDING_NOTE_MAX = 2000;
export const BAND_RECORDING_COMMENT_MAX = 1000;

/** Ce que le bucket accepte (allowed_mime_types). */
export const BAND_RECORDING_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
];
export const BAND_RECORDING_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/** Le type sans ses parametres (`audio/webm;codecs=opus` → `audio/webm`). */
export function baseMimeType(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}

/** Audio, video, ou rien si le bucket refuserait le fichier. */
export function recordingMediaType(type: string): "audio" | "video" | null {
  const base = baseMimeType(type);
  if (BAND_RECORDING_AUDIO_TYPES.includes(base)) return "audio";
  if (BAND_RECORDING_VIDEO_TYPES.includes(base)) return "video";
  return null;
}

/** Chemin dans le bucket : <groupe>/<auteur>/<horodatage>.<ext>. */
export function bandRecordingPath(bandId: string, userId: string, extension: string): string {
  const ext = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `${bandId}/${userId}/${Date.now()}.${ext}`;
}

export function bandRecordingsHref(bandId: string): string {
  return `/commu/groupes/${bandId}/enregistrements`;
}

export function bandRecordingHref(bandId: string, recordingId: string): string {
  return `${bandRecordingsHref(bandId)}/${recordingId}`;
}

/** 102 → « 1:42 », 3725 → « 1:02:05 ». */
export function formatRecordingTime(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** « 1:42 », « 1:02:05 » ou « 102 » → secondes ; null si illisible. */
export function parseRecordingTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(:\d{1,2}){0,2}$/.test(trimmed)) return null;
  const parts = trimmed.split(":").map(Number);
  if (parts.slice(1).some((part) => part > 59)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** 1536 → « 1,5 Go » selon la langue. */
export function formatBytes(bytes: number, locale: string): string {
  const units = ["o", "Ko", "Mo", "Go"];
  const unitsEn = ["B", "KB", "MB", "GB"];
  let value = Math.max(0, bytes);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: value < 10 && index > 0 ? 1 : 0 }).format(value);
  return `${number} ${(locale.startsWith("fr") ? units : unitsEn)[index]}`;
}
