import { getBand } from "@/lib/actions/bands";
import { getTechRider } from "@/lib/actions/tech-riders";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TechRiderView } from "@/components/tech-rider/tech-rider-view";
import { bandStatus } from "@/lib/band-access";

interface Props {
  params: Promise<{ bandId: string }>;
}

export default async function TechRiderPage({ params }: Props) {
  const { bandId } = await params;
  const user = await getAuthenticatedUser();

  if (!user) redirect("/login");

  // Groupe et fiche technique sont independants : un seul temps d'attente.
  const [band, techRider] = await Promise.all([getBand(bandId), getTechRider(bandId)]);

  if (!band) redirect("/setlists");

  const currentMember = band.members.find((m) => m.user_id === user.id);
  if (!currentMember) redirect("/setlists");

  // Toute la fiche reste lisible quand le groupe passe en lecture seule.
  const canEdit =
    (currentMember.role === "owner" || currentMember.role === "admin") &&
    bandStatus(band) !== "read_only";

  return (
    <TechRiderView
      band={band}
      initialData={techRider}
      canEdit={canEdit}
    />
  );
}
