import { notFound, redirect } from "next/navigation";
import { getBand } from "@/lib/actions/bands";
import { getBandSong } from "@/lib/actions/band-songs";
import { bandStatus } from "@/lib/band-access";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { BandSongView } from "@/components/repertoire/band-song-view";

/** La fiche d'un morceau du repertoire. */
export default async function BandSongPage({
  params,
}: {
  params: Promise<{ bandId: string; songId: string }>;
}) {
  const { bandId, songId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const [band, details] = await Promise.all([getBand(bandId), getBandSong(bandId, songId)]);
  if (!band || !details || !band.members.some((member) => member.user_id === user.id)) notFound();

  return (
    <BandSongView
      // Une nouvelle version repart d'un formulaire neuf.
      key={details.song.updated_at}
      bandId={band.id}
      bandName={band.name}
      details={details}
      currentUserId={user.id}
      readOnly={bandStatus(band) === "read_only"}
    />
  );
}
