import { cache } from "react";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { Instrument } from "@/types";

/**
 * L'instrument principal du musicien connecte, une fois par requete.
 *
 * Il decide de la partie d'un morceau que touche un changement de statut
 * sans instrument precise (glissement dans la biblio, fiche a un seul
 * instrument), et de l'instrument d'une session. Guitare a defaut, comme
 * la fonction SQL primary_instrument().
 */
export const getMyPrimaryInstrument = cache(async (): Promise<Instrument> => {
  const user = await getAuthenticatedUser();
  if (!user) return "guitar";

  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_instruments")
    .select("instrument")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  return (data?.instrument as Instrument | undefined) ?? "guitar";
});
