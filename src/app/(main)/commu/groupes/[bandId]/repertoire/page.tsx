import { notFound, redirect } from "next/navigation";
import { getBand } from "@/lib/actions/bands";
import { getBandSongs } from "@/lib/actions/band-songs";
import { bandStatus } from "@/lib/band-access";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { RepertoireListView } from "@/components/repertoire/repertoire-list-view";

/** Tout le repertoire d'un groupe, avec un filtre. */
export default async function RepertoirePage({ params }: { params: Promise<{ bandId: string }> }) {
  const { bandId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const [band, songs] = await Promise.all([getBand(bandId), getBandSongs(bandId)]);
  if (!band || !band.members.some((member) => member.user_id === user.id)) notFound();

  return (
    <RepertoireListView
      bandId={band.id}
      bandName={band.name}
      songs={songs}
      readOnly={bandStatus(band) === "read_only"}
    />
  );
}
