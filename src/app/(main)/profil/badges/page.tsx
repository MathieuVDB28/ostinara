import { getMyBadges } from "@/lib/actions/badges";
import { getMyPrimaryInstrument } from "@/lib/instruments-server";
import { BadgesView } from "@/components/badges/badges-view";

export const metadata = {
  title: "Badges | Ostinara",
  description: "Tes badges et ce qu'il reste à faire pour les suivants",
};

export default async function ProfilBadgesPage() {
  const [badges, instrument] = await Promise.all([getMyBadges(), getMyPrimaryInstrument()]);

  return <BadgesView badges={badges} instrument={instrument} />;
}
