import { getCoversFeed, canUploadCover } from "@/lib/actions/covers";
import { getSongs } from "@/lib/actions/songs";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { CoversFeedView } from "@/components/covers/covers-feed-view";

export const metadata = {
  title: "Covers | Ostinara",
  description: "Les covers de ton cercle",
};

/**
 * Le feed de covers.
 *
 * Les covers etaient rangees dans « Biblio › Covers », a cote des
 * morceaux et des albums : un inventaire. Elles ont maintenant leur place
 * dans « Commu », parmi les gens — c'est la seule chose de l'app qu'on
 * publie pour etre vu.
 *
 * « Biblio › Covers » reste : c'est l'archive personnelle, celle qui
 * montre aussi les covers privees.
 */
export default async function CommuCoversPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const [items, songs, uploadStatus] = await Promise.all([
    getCoversFeed(),
    // Les morceaux servent a rattacher une reponse sans aller-retour :
    // si le morceau de l'ami est deja en bibliotheque, on le reutilise.
    getSongs(),
    canUploadCover(),
  ]);

  return (
    <CoversFeedView
      initialItems={items}
      currentUserId={user.id}
      songs={songs}
      canUpload={uploadStatus.allowed}
      uploadBlockedReason={uploadStatus.reason}
    />
  );
}
