import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getPendingRequestsCount } from "@/lib/actions/friends";
import { getPendingChallengesCount } from "@/lib/actions/challenges";
import { getPendingBandInvitations } from "@/lib/actions/bands";
import { PushNotificationManager } from "@/components/pwa";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { PracticeSessionProvider } from "@/components/providers/practice-session-provider";
import { CommandPaletteProvider } from "@/components/search/command-palette";
import { OfflineProvider } from "@/components/offline/offline-provider";
import type { BadgeCounts } from "@/lib/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  // Un badge signale une information qui appelle une action, pas un total :
  // la barre affichait le nombre d'amis (12) la ou il fallait le nombre de
  // demandes en attente (0).
  const [
    { data: profile },
    pendingFriends,
    pendingChallenges,
    bandInvitations,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .single(),
    getPendingRequestsCount(),
    getPendingChallengesCount(),
    getPendingBandInvitations(),
  ]);

  const badges: BadgeCounts = {
    friends: pendingFriends,
    challenges: pendingChallenges,
    bands: bandInvitations.length,
  };

  const userInfo = {
    displayName: profile?.display_name || profile?.username || "User",
    initial:
      profile?.display_name?.[0]?.toUpperCase() ||
      user.email?.[0]?.toUpperCase() ||
      "U",
    email: user.email || "",
    avatarUrl: profile?.avatar_url,
  };

  return (
    /*
      Le hors-ligne enveloppe tout le reste.

      Il garde une copie de la bibliotheque et du journal, et met en file
      les sessions enregistrees sans reseau. PracticeSessionProvider vit
      dessous parce que sa modale d'enregistrement passe par lui pour
      ecrire : c'est le seul endroit de l'app ou l'on perd quelque chose
      quand le reseau manque.
    */
    <OfflineProvider>
    {/* Le chrono de session vit au-dessus des pages : il survit a la
        navigation, et la barre qui permet de l'arreter aussi. */}
    <PracticeSessionProvider>
      {/*
        La palette enveloppe la sidebar : c'est de la qu'on l'ouvre a la
        souris, et son raccourci cmd-K doit valoir sur toutes les pages.
      */}
      <CommandPaletteProvider>
        <div className="flex min-h-screen">
          <NavigationProgress />

          <BottomTabBar badges={badges} />

          <DesktopSidebar badges={badges} userInfo={userInfo} />

          <main className="w-full min-w-0 flex-1 overflow-x-hidden p-4 pb-24 lg:ml-64 lg:p-8 lg:pb-8">
            {children}
          </main>

          <PushNotificationManager userId={user.id} />
        </div>
      </CommandPaletteProvider>
    </PracticeSessionProvider>
    </OfflineProvider>
  );
}
