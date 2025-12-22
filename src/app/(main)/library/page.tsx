import { getSongs } from "@/lib/actions/songs";
import { LibraryView } from "@/components/library/library-view";

export default async function LibraryPage() {
  const songs = await getSongs();

  return <LibraryView initialSongs={songs} />;
}
