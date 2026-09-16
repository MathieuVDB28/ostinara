import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getPracticeStats } from "@/lib/actions/practice";
import type { OfflineSnapshot, PracticeSessionWithSong, Song } from "@/types";

/**
 * L'instantane hors ligne.
 *
 * Une route HTTP plutot qu'une Server Action : le service worker doit
 * pouvoir la mettre en cache avec une simple regle d'URL, et la page de
 * repli hors ligne doit pouvoir la relire sans executer de code serveur.
 *
 * Ce qu'elle embarque : la bibliotheque entiere et les deux cents
 * dernieres sessions. Rien de plus — un instantane doit tenir dans
 * IndexedDB et se rafraichir en une requete.
 */

/** Le journal hors ligne se lit, il ne s'archive pas. */
const SESSIONS_IN_SNAPSHOT = 200;

// Un instantane est par definition lie au compte connecte : jamais de
// cache partage cote serveur ou CDN.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const supabase = await createClient();

  const [songsResult, sessionsResult, stats] = await Promise.all([
    supabase
      .from("songs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("practice_sessions")
      .select("*, song:songs(*)")
      .eq("user_id", user.id)
      .order("practiced_at", { ascending: false })
      .limit(SESSIONS_IN_SNAPSHOT),
    getPracticeStats(),
  ]);

  const snapshot: OfflineSnapshot = {
    generatedAt: new Date().toISOString(),
    userId: user.id,
    songs: (songsResult.data ?? []) as Song[],
    sessions: (sessionsResult.data ?? []) as PracticeSessionWithSong[],
    stats,
  };

  return NextResponse.json(snapshot, {
    headers: {
      // Le service worker garde la copie ; le navigateur, lui, doit
      // toujours redemander — sinon une session ajoutee en ligne
      // n'entrerait jamais dans l'instantane.
      "Cache-Control": "no-store",
    },
  });
}
