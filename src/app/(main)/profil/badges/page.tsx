import { getMyBadges } from "@/lib/actions/badges";
import { getMyPrimaryInstrument } from "@/lib/instruments-server";
import { BadgesView } from "@/components/badges/badges-view";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("meta.badges");
  return { title: t("title"), description: t("description") };
}

export default async function ProfilBadgesPage() {
  const [badges, instrument] = await Promise.all([getMyBadges(), getMyPrimaryInstrument()]);

  return <BadgesView badges={badges} instrument={instrument} />;
}
