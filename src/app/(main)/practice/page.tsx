import { createClient } from "@/lib/supabase/server";
import { getSongs } from "@/lib/actions/songs";
import { getExercises } from "@/lib/actions/exercises";
import { getSongPracticeStats } from "@/lib/actions/practice";
import { PracticeView } from "@/components/practice/practice-view";
import type { SongPracticeStats } from "@/types";

export const metadata = {
  title: "Practice | Ostinara",
  description: "Mode Practice avec métronome intégré et exercices structurés",
};

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Charger les données en parallèle
  const [songs, exercises] = await Promise.all([
    getSongs(),
    getExercises(),
  ]);

  // Charger les stats de pratique pour chaque morceau
  const songPracticeStats: Record<string, SongPracticeStats> = {};
  for (const song of songs) {
    const stats = await getSongPracticeStats(song.id);
    if (stats) {
      songPracticeStats[song.id] = stats;
    }
  }

  return (
    <PracticeView
      songs={songs}
      exercises={exercises}
      songPracticeStats={songPracticeStats}
    />
  );
}
