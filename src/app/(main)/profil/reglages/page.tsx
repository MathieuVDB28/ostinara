import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/actions/profile";
import { SettingsList } from "@/components/profile/settings-list";

export const metadata = {
  title: "Réglages | Ostinara",
};

export default async function ProfilReglagesPage() {
  const profile = await getMyProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <SettingsList profile={profile} />
  );
}
