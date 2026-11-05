import { getBand } from "@/lib/actions/bands";
import { getTechRider } from "@/lib/actions/tech-riders";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ProUpsell } from "@/components/subscription/pro-upsell";
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

  if (!band) redirect("/setlists");

  // Le bouton est visible par tout le groupe : on explique plutot que de
  // renvoyer ailleurs sans un mot.
  if (profile?.plan !== "band") {
    const t = await getTranslations("techRider.view");
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <ProUpsell plan="band" feature={t("upsellTitle")} description={t("upsellBody")} />
        <Link
          href={`/commu/groupes/${band.id}`}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {t("upsellBack", { band: band.name })}
        </Link>
      </div>
    );
  }

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
