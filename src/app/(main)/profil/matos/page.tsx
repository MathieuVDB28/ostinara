import { getGearItems, getGearSetups, getGearWishlist } from "@/lib/actions/gear";
import { requirePaidPlan } from "@/lib/actions/spotify";
import { GearView } from "@/components/gear/gear-view";

export default async function ProfilMatosPage({
  searchParams,
}: {
  searchParams: Promise<{ gear?: string }>;
}) {
  const { gear: initialGearId } = await searchParams;

  const [gearItems, gearSetups, wishlistItems, planCheck] = await Promise.all([
    getGearItems(),
    getGearSetups(),
    getGearWishlist(),
    requirePaidPlan(),
  ]);

  return (
    <GearView
      initialGearItems={gearItems}
      initialGearSetups={gearSetups}
      initialWishlistItems={wishlistItems}
      userPlan={planCheck.plan}
      initialGearId={initialGearId}
    />
  );
}
