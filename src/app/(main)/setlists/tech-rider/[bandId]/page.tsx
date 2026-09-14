import { getBand } from "@/lib/actions/bands";
import { getTechRider } from "@/lib/actions/tech-riders";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TechRiderView } from "@/components/tech-rider/tech-rider-view";

interface Props {
  params: Promise<{ bandId: string }>;
}

export default async function TechRiderPage({ params }: Props) {
  const { bandId } = await params;
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) redirect("/login");

  // Plan, groupe et fiche technique sont independants : trois allers-retours
  // en serie devenaient un seul temps d'attente.
  const [{ data: profile }, band, techRider] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).single(),
    getBand(bandId),
    getTechRider(bandId),
  ]);

  if (profile?.plan !== "band") redirect("/setlists");
  if (!band) redirect("/setlists");

  const currentMember = band.members.find((m) => m.user_id === user.id);
  const canEdit =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  return (
    <TechRiderView
      band={band}
      initialData={techRider}
      canEdit={canEdit}
    />
  );
}
