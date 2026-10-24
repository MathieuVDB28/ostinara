import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

/**
 * Les fichiers des covers (bucket `covers`, prive depuis la migration
 * 20261112_private_covers_bucket) se lisent par des liens signes.
 *
 * Le droit de voir une cover est celui de lire sa ligne : la RLS de
 * `covers` (visibilite, amitie, profil prive) en decide. On ne signe donc
 * que des lignes lues avec le client de l'utilisateur, jamais avec le
 * service role ; la signature, elle, passe par le service role parce que
 * le Storage ne connait pas ces regles.
 *
 * Six heures : de quoi laisser une page ouverte et lancer la video plus
 * tard ; un lien recopie ne sert pas au-dela.
 */
export const COVER_URL_TTL_SECONDS = 60 * 60 * 6;

const BUCKET = "covers";

/**
 * Le chemin dans le bucket. Les lignes anciennes gardent l'URL publique
 * (`…/object/public/covers/<chemin>`), les nouvelles le chemin seul.
 */
export function coverStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^https?:\/\//.test(value)) return value;
  const match = value.match(/\/storage\/v1\/object\/(?:public|sign)\/covers\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function serviceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role credentials not configured");
  return createServiceRoleClient(url, key, { auth: { persistSession: false } });
}

interface CoverMedia {
  media_url?: string | null;
  thumbnail_url?: string | null;
}

/**
 * Remplace `media_url` et `thumbnail_url` par des liens signes, en un seul
 * appel pour toute la liste. A n'appeler que sur des lignes lues sous RLS.
 */
export async function signCoverMedia<T extends CoverMedia>(covers: T[]): Promise<T[]> {
  const paths = new Set<string>();
  for (const cover of covers) {
    const media = coverStoragePath(cover.media_url);
    const thumbnail = coverStoragePath(cover.thumbnail_url);
    if (media) paths.add(media);
    if (thumbnail) paths.add(thumbnail);
  }
  if (paths.size === 0) return covers;

  const { data, error } = await serviceRole()
    .storage.from(BUCKET)
    .createSignedUrls([...paths], COVER_URL_TTL_SECONDS);
  if (error || !data) {
    console.error("Error signing cover media:", error);
    return covers;
  }

  const signed = new Map<string, string>();
  for (const entry of data) {
    if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
  }
  const sign = (value: string | null | undefined) => {
    const path = coverStoragePath(value);
    return (path && signed.get(path)) || value;
  };

  return covers.map((cover) => ({
    ...cover,
    ...("media_url" in cover ? { media_url: sign(cover.media_url) } : {}),
    ...("thumbnail_url" in cover ? { thumbnail_url: sign(cover.thumbnail_url) } : {}),
  }));
}

/** Pour une seule cover (ou rien). */
export async function signOneCoverMedia<T extends CoverMedia>(cover: T | null): Promise<T | null> {
  if (!cover) return cover;
  const [signed] = await signCoverMedia([cover]);
  return signed;
}
