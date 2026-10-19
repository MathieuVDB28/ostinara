import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/actions/profile";
import { SettingsList } from "@/components/profile/settings-list";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("meta.settings");
  return { title: t("title") };
}

export default async function ProfilReglagesPage() {
  const profile = await getMyProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <SettingsList profile={profile} />
  );
}
