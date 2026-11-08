"use server";

import { revalidatePath } from "next/cache";
import { tErr } from "@/i18n/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { BAND_SLUG_PATTERN, bandPublicHref, normalizeSlugInput } from "@/lib/concerts";
import type { BandConcert, PublicBand } from "@/types";

/** La page publique d'un groupe ; null si masquee, en lecture seule ou inconnue. Sans compte. */
export async function getPublicBand(slug: string): Promise<PublicBand | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_band", { p_slug: slug });
  if (error) console.error("Error fetching public band:", error);
  return (data as PublicBand | null) ?? null;
}

/** Les pages en ligne, pour le sitemap. */
export async function getPublicBandSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_public_bands");
  if (error) console.error("Error listing public bands:", error);
  return (data as { slug: string; updated_at: string }[] | null) ?? [];
}

/** Les concerts du groupe (setlists datees), du plus ancien au plus recent. Sous RLS. */
export async function getBandConcerts(bandId: string): Promise<BandConcert[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("setlists")
    .select("id, name, concert_date, concert_time, venue, city, ticket_url")
    .eq("band_id", bandId)
    .not("concert_date", "is", null)
    .order("concert_date", { ascending: true })
    .order("concert_time", { ascending: true, nullsFirst: false });
  if (error) console.error("Error fetching band concerts:", error);
  return (data ?? []) as BandConcert[];
}

/** Masquer ou montrer la page, changer son adresse : titulaire et admins d'un groupe actif. */
export async function setBandPublicPage(
  bandId: string,
  input: { visible?: boolean; slug?: string }
): Promise<{ success: boolean; error?: string; slug?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: await tErr("notAuthenticated") };

  let slug: string | null = null;
  if (input.slug !== undefined) {
    slug = normalizeSlugInput(input.slug).replace(/-+$/, "");
    if (!BAND_SLUG_PATTERN.test(slug)) return { success: false, error: await tErr("bandSlugInvalid") };
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("bands").select("slug").eq("id", bandId).maybeSingle();
  const { data, error } = await supabase.rpc("set_band_public_page", {
    p_band_id: bandId,
    p_public: input.visible ?? null,
    p_slug: slug,
  });

  if (error) {
    console.error("Error updating band public page:", error);
    const key =
      error.code === "23505" ? "bandSlugTaken" : error.code === "22023" ? "bandSlugInvalid" : error.code === "42501" ? "bandPublicPageForbidden" : "updateFailed";
    return { success: false, error: await tErr(key) };
  }

  revalidatePath(`/commu/groupes/${bandId}`);
  if (before?.slug) revalidatePath(bandPublicHref(before.slug));
  if (data) revalidatePath(bandPublicHref(data as string));
  return { success: true, slug: (data as string) ?? undefined };
}
