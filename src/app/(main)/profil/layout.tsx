import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMyProfile } from "@/lib/actions/profile";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import { ProfileShowcase } from "@/components/profile/profile-showcase";
import { NAV_TABS } from "@/lib/navigation";
import { Icon } from "@/components/ui/icon";

const profilTab = NAV_TABS.find((tab) => tab.href === "/profil")!;

export default async function ProfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getMyProfile();
  const t = await getTranslations("profile.header");

  if (!profile) {
    redirect("/login");
  }

  return (
    <>
      <ProfileIdentity
        profile={profile}
        favoriteSongs={profile.favorite_songs}
        favoriteAlbums={profile.favorite_albums}
        stats={[
          { label: t("songs"), value: profile.stats.totalSongs, href: "/biblio" },
          { label: t("mastered"), value: profile.stats.masteredSongs },
          { label: t("covers"), value: profile.stats.totalCovers, href: "/biblio/covers" },
          { label: t("friends"), value: profile.stats.friendsCount, href: "/commu/amis" },
        ]}
        action={
          <Link
            href="/profil/reglages"
            aria-label={t("editAria")}
            className="flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon name="edit" className="h-4 w-4" />
            {t("edit")}
          </Link>
        }
      />
      {/* Les onglets avant la vitrine : sous elle, Matos et Reglages
          tombaient sous le premier ecran et on ne les trouvait plus. */}
      <SegmentedNav tab={profilTab} variant="underline" className="mb-5" />
      <ProfileShowcase
        favoriteSongs={profile.favorite_songs}
        favoriteAlbums={profile.favorite_albums}
        favoriteGear={profile.favorite_gear}
        editable
      />
      {children}
    </>
  );
}
