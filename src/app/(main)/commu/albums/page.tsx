import { getWeeklyAlbums } from "@/lib/actions/albums";
import { WeeklyAlbumsView } from "@/components/albums/weekly-albums-view";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("meta.communityAlbums");
  return { title: t("title"), description: t("description") };
}

/**
 * Les albums de la semaine, cote communaute. La meme vue est l'onglet
 * « Semaine » de « Biblio › Albums » : la-bas on note, ici on decouvre.
 */
export default async function CommuAlbumsPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  // `?semaine=` : la semaine parcourue avant d'ouvrir un album.
  const { semaine } = await searchParams;
  const week = await getWeeklyAlbums(Number(semaine) || 0);

  if (!week) {
    return null;
  }

  // Le titre de la semaine porte deja le contexte ; la pastille « Albums »
  // au-dessus dit le reste.
  return <WeeklyAlbumsView initial={week} />;
}
