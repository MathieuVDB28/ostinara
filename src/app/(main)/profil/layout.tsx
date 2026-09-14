import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/actions/profile";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import { ProfileShowcase } from "@/components/profile/profile-showcase";
import { NAV_TABS } from "@/lib/navigation";

const profilTab = NAV_TABS.find((tab) => tab.href === "/profil")!;

export default async function ProfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getMyProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <>
      <ProfileIdentity profile={profile} />
      <ProfileShowcase profile={profile} />
      <SegmentedNav tab={profilTab} />
      {children}
    </>
  );
}
