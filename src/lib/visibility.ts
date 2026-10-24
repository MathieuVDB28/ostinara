import type { CoverVisibility } from "@/types";

/**
 * Ce qu'une visibilite donne vraiment : « Public » va aussi loin que le
 * profil, donc jusqu'aux amis seulement sur un profil prive (la RLS fait
 * de meme, migration 20261109_gear_private).
 */
export function effectiveVisibility(visibility: CoverVisibility, profileIsPrivate: boolean): CoverVisibility {
  return visibility === "public" && profileIsPrivate ? "friends" : visibility;
}
