import { createClient } from "@/lib/supabase/client";

export type UploadImageError = "type" | "size" | "upload";

/**
 * Envoie une image depuis le navigateur dans un bucket public, sous le
 * dossier de l'utilisateur (les policies du bucket l'exigent), et rend son
 * URL publique. Sert le blog (bucket `blog`) et le forum (`forum`).
 */
export async function uploadPublicImage(
  bucket: string,
  file: File,
  userId: string,
  options: { maxBytes: number; types: RegExp }
): Promise<{ url: string } | { error: UploadImageError }> {
  if (!options.types.test(file.type)) return { error: "type" };
  if (file.size > options.maxBytes) return { error: "size" };

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "31536000", upsert: false });

  if (error) {
    console.error(`Image upload to ${bucket} failed:`, error);
    return { error: "upload" };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}
