import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getSongs } from "@/lib/actions/songs";
import { getExercises } from "@/lib/actions/exercises";
import {
  getSongPracticeStats,
  getPracticeSessionsBySong,
} from "@/lib/actions/practice";
import { getMyProfile } from "@/lib/actions/profile";
import { requirePaidPlan } from "@/lib/actions/spotify";
import { PlayView } from "@/components/play/play-view";
import type { SongPracticeStats } from "@/types";

export const metadata = {
  title: "Jouer | Ostinara",
  description: "Métronome, exercices et accordeur",
};

export default async function JouerPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const [songs, exercises, profile, planCheck] = await Promise.all([
    getSongs(),
    getExercises(),
    getMyProfile(),
    requirePaidPlan(),
  ]);

  // Stats de pratique pour tous les morceaux, en parallele
  const statsEntries = await Promise.all(
    songs.map(async (song) => {
      const stats = await getSongPracticeStats(song.id);
      return stats ? ([song.id, stats] as const) : null;
    })
  );
  const songPracticeStats: Record<string, SongPracticeStats> =
    Object.fromEntries(
      statsEntries.filter((e): e is [string, SongPracticeStats] => e !== null)
    );

  // Le morceau en cours ouvre la page : c'est la raison pour laquelle
  // on ouvre l'app.
  const learningSongs = songs.filter((s) => s.status === "learning");
  const currentFocus = learningSongs[0] ?? null;
  const focusBestBpm = currentFocus
    ? (await getPracticeSessionsBySong(currentFocus.id)).reduce<number | null>(
        (best, session) =>
          session.bpm_achieved && session.bpm_achieved > (best ?? 0)
            ? session.bpm_achieved
            : best,
        null
      )
    : null;

  return (
    <PlayView
      songs={songs}
      exercises={exercises}
      songPracticeStats={songPracticeStats}
      displayName={profile?.display_name || profile?.username || "Guitariste"}
      currentFocus={currentFocus}
      focusBestBpm={focusBestBpm}
      isPaid={planCheck.allowed}
    />
  );
}
