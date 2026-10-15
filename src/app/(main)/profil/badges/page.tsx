import { getMyBadges } from "@/lib/actions/badges";
import { BadgesView } from "@/components/badges/badges-view";

export const metadata = {
  title: "Badges | Ostinara",
  description: "Tes badges et ce qu'il reste à faire pour les suivants",
};

export default async function ProfilBadgesPage() {
  const badges = await getMyBadges();

  return <BadgesView badges={badges} />;
}
