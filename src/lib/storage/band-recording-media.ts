import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { BAND_RECORDING_BUCKET } from "@/lib/band-recordings";

/**
 * Les fichiers des enregistrements de groupe (bucket prive `band-recordings`)
 * se lisent par des liens signes, comme les covers.
 *
 * Le droit d'ecouter est celui de lire la ligne : la RLS de
 * `band_recordings` (membre du groupe) en decide. On ne signe donc que des
 * lignes lues avec le client de l'utilisateur ; la signature et
 * l'effacement passent par le service role, que le Storage exige.
 */
export const BAND_RECORDING_URL_TTL_SECONDS = 60 * 60 * 6;

function serviceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role credentials not configured");
  return createServiceRoleClient(url, key, { auth: { persistSession: false } });
}

/** Un lien de lecture et un lien de telechargement (nom de fichier lisible). */
export async function signBandRecordingMedia(
  path: string,
  downloadName: string
): Promise<{ mediaUrl: string | null; downloadUrl: string | null }> {
  const storage = serviceRole().storage.from(BAND_RECORDING_BUCKET);
  const [play, download] = await Promise.all([
    storage.createSignedUrl(path, BAND_RECORDING_URL_TTL_SECONDS),
    storage.createSignedUrl(path, BAND_RECORDING_URL_TTL_SECONDS, { download: downloadName }),
  ]);
  if (play.error) console.error("Error signing band recording:", play.error);
  return {
    mediaUrl: play.data?.signedUrl ?? null,
    downloadUrl: download.data?.signedUrl ?? null,
  };
}

/** Efface des fichiers dont la ligne vient d'etre supprimee sous RLS. */
export async function removeBandRecordingFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await serviceRole().storage.from(BAND_RECORDING_BUCKET).remove(paths);
  if (error) console.error("Error removing band recording files:", error);
}

/** Tout le dossier d'un groupe supprime : <groupe>/<auteur>/<fichier>. */
export async function removeBandRecordingFolder(bandId: string): Promise<void> {
  const storage = serviceRole().storage.from(BAND_RECORDING_BUCKET);
  const { data: authors, error } = await storage.list(bandId, { limit: 1000 });
  if (error || !authors) return;
  const paths: string[] = [];
  for (const author of authors) {
    let offset = 0;
    for (;;) {
      const { data: files } = await storage.list(`${bandId}/${author.name}`, { limit: 1000, offset });
      if (!files || files.length === 0) break;
      paths.push(...files.map((file) => `${bandId}/${author.name}/${file.name}`));
      if (files.length < 1000) break;
      offset += files.length;
    }
  }
  for (let index = 0; index < paths.length; index += 500) {
    await removeBandRecordingFiles(paths.slice(index, index + 500));
  }
}
