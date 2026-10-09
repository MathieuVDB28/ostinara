import { getWeeklyAlbums } from "@/lib/actions/albums";
import { WeeklyAlbumsView } from "@/components/albums/weekly-albums-view";

export const metadata = {
  title: "Albums de la semaine | Ostinara",
  description: "Les albums écoutés par la communauté cette semaine",
};

/**
 * Les albums de la semaine, cote communaute. La meme vue est l'onglet
 * « Semaine » de « Biblio › Albums » : la-bas on note, ici on decouvre.
 */
export default async function CommuAlbumsPage() {
  const week = await getWeeklyAlbums();

  if (!week) {
    return null;
  }

  // Le titre de la semaine porte deja le contexte ; la pastille « Albums »
  // au-dessus dit le reste.
  return <WeeklyAlbumsView initial={week} />;
}
