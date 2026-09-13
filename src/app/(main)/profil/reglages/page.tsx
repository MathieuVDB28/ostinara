import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/actions/profile";
import { getSpotifyConnectionStatus } from "@/lib/actions/spotify";
import { SettingsList } from "@/components/profile/settings-list";

export const metadata = {
  title: "Réglages | Ostinara",
};

export default async function ProfilReglagesPage() {
  const [profile, spotifyStatus] = await Promise.all([
    getMyProfile(),
    getSpotifyConnectionStatus(),
  ]);

  if (!profile) {
    redirect("/login");
  }

  return (
    <SettingsList profile={profile} spotifyConnected={spotifyStatus.connected} />
  );
}
