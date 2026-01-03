import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFriendsCount } from "@/lib/actions/friends";
import { PushNotificationManager } from "@/components/pwa";
import { SidebarWrapper } from "@/components/layout/sidebar-wrapper";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";

const navItems = [
  { href: "/library", label: "Bibliothèque", icon: "library" },
  { href: "/progress", label: "Progression", icon: "chart" },
  { href: "/covers", label: "Covers", icon: "video" },
  { href: "/setlists", label: "Setlists", icon: "setlist" },
  { href: "/friends", label: "Amis", icon: "users" },
  { href: "/feed", label: "Feed", icon: "feed" },
];

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Récupérer le profil et le nombre d'amis
  const [{ data: profile }, friendsCount] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .single(),
    getFriendsCount(),
  ]);

  const navItemsWithBadge = navItems.map((item) => ({
    ...item,
    badge: item.href === "/friends" ? friendsCount : undefined,
  }));

  const userInfo = {
    displayName: profile?.display_name || profile?.username || "User",
    initial: profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U",
    email: user.email || "",
    avatarUrl: profile?.avatar_url,
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile Sidebar */}
      <SidebarWrapper navItems={navItemsWithBadge} userInfo={userInfo} />

      {/* Desktop Sidebar */}
      <DesktopSidebar navItems={navItemsWithBadge} userInfo={userInfo} />

      {/* Main content */}
      <main className="w-full flex-1 p-4 pt-20 lg:ml-64 lg:p-8 lg:pt-8">
        {children}
      </main>

      {/* Push notifications */}
      <PushNotificationManager userId={user.id} />
    </div>
  );
}
