import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getSongs } from "@/lib/actions/songs";
import { getExercises } from "@/lib/actions/exercises";
import {
  getAllSongPracticeStats,
  getLastPracticeSession,
  getPracticeCalendar,
  getPracticeSessions,
  getPracticeStats,
} from "@/lib/actions/practice";
import { requirePaidPlan } from "@/lib/actions/spotify";
import { getWeeklyPlan } from "@/lib/actions/weekly-plan";
import { PlayView } from "@/components/play/play-view";

export const metadata = {
  title: "Jouer | Ostinara",
  description: "Métronome, exercices et accordeur",
};

export default async function JouerPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string; song?: string }>;
}) {
  const { exercise: initialExerciseId, song: initialSongId } = await searchParams;
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  // Les stats de pratique arrivent en une lecture, pas une par morceau,
  // et elles partent en parallele du reste.
  const [
    songs,
    exercises,
    planCheck,
    songPracticeStats,
    lastSession,
    weeklyPlan,
    practiceStats,
    calendar,
    recentSessions,
  ] = await Promise.all([
    getSongs(),
    getExercises(),
    requirePaidPlan(),
    getAllSongPracticeStats(),
    getLastPracticeSession(),
    // Le plan se genere a la premiere ouverture de la semaine : c'est ici
    // que l'app est ouverte, pas dans un cron qui ecrirait pour des
    // comptes dormants.
    getWeeklyPlan(),
    // Le Carnet : les chiffres de Progression remontent la ou l'on decide
    // de jouer, avec 15 semaines de calendrier et les dernieres sessions.
    getPracticeStats(),
    getPracticeCalendar(105),
    getPracticeSessions(undefined, 3),
  ]);

  // Le morceau en cours ouvre la page : c'est la raison pour laquelle
  // on ouvre l'app.
  const learningSongs = songs.filter((s) => s.status === "learning");
  const currentFocus = learningSongs[0] ?? null;

  // Le meilleur tempo est deja agrege ci-dessus : le relire session par
  // session etait une requete de plus pour une valeur deja connue.
  const focusBestBpm = currentFocus
    ? songPracticeStats[currentFocus.id]?.bestBpm ?? null
    : null;

  return (
    <PlayView
      songs={songs}
      exercises={exercises}
      songPracticeStats={songPracticeStats}
      currentFocus={currentFocus}
      focusBestBpm={focusBestBpm}
      lastSession={lastSession}
      initialExerciseId={initialExerciseId}
      initialSongId={initialSongId}
      weeklyPlan={weeklyPlan}
      practiceStats={practiceStats}
      calendar={calendar}
      recentSessions={recentSessions}
      userPlan={planCheck.plan}
      isPaid={planCheck.allowed}
    />
  );
}
