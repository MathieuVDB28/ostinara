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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold">Albums de la semaine</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ce que la communauté a écouté, classé par note moyenne
        </p>
      </div>
      <WeeklyAlbumsView initial={week} />
    </div>
  );
}
