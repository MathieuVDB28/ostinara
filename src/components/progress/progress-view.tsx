"use client";

import Image from "next/image";
import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  PracticeSessionWithSong,
  PracticeStats,
  Song,
  ChartData,
  AlbumReview,
} from "@/types";
import { RecentAlbumsCard } from "./recent-albums-card";
import { RecentSongsCard } from "./recent-songs-card";
import { EditSessionModal } from "./edit-session-modal";
import { SessionList } from "./session-list";
import { StatsSummary } from "./stats-summary";
import { StatsTab } from "./charts";
import { usePracticeSession } from "@/components/providers/practice-session-provider";
import { getPracticeSessions } from "@/lib/actions/practice";
import { SESSIONS_PER_PAGE } from "@/lib/pagination";

type TabType = "journal" | "stats";

/** Cinq lignes par bloc de contexte : un apercu, pas une seconde liste. */
const RECENT_ITEMS = 5;

interface ProgressViewProps {
  initialSessions: PracticeSessionWithSong[];
  initialStats: PracticeStats;
  songs: Song[];
  chartData: ChartData;
  /** Les derniers albums notes — donc ecoutes. */
  recentAlbums: AlbumReview[];
}

export function ProgressView({
  initialSessions,
  initialStats,
  songs,
  chartData,
  recentAlbums,
}: ProgressViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("journal");
  const [selectedSession, setSelectedSession] =
    useState<PracticeSessionWithSong | null>(null);

  const stats = initialStats;

  /*
   * Le journal se lit en trois morceaux plutot qu'en un etat unique
   * recopie depuis les props :
   *
   *  - `initialSessions` est la premiere page, qui vient du serveur et se
   *    rafraichit toute seule apres une creation ou une modification ;
   *  - `loadedSessions` porte les pages suivantes, chargees ici. Elles
   *    survivent a un `router.refresh()` : supprimer une session de la
   *    page 5 renvoyait sinon a la page 1 ;
   *  - `deletedIds` retire immediatement ce qui vient d'etre supprime,
   *    sans attendre le retour du serveur.
   */
  const [loadedSessions, setLoadedSessions] = useState<PracticeSessionWithSong[]>(
    []
  );
  const [deletedIds, setDeletedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const sessions = useMemo(() => {
    const byId = new Map<string, PracticeSessionWithSong>();
    // La page serveur passe en premier : c'est elle qui porte la version
    // a jour d'une session modifiee.
    for (const session of [...initialSessions, ...loadedSessions]) {
      if (!byId.has(session.id)) byId.set(session.id, session);
    }
    return [...byId.values()]
      .filter((session) => !deletedIds.has(session.id))
      .sort(
        (a, b) =>
          new Date(b.practiced_at).getTime() - new Date(a.practiced_at).getTime()
      );
  }, [initialSessions, loadedSessions, deletedIds]);

  const remaining = Math.max(0, stats.totalSessions - sessions.length);

  const { openManualEntry } = usePracticeSession();

  // Callback de succès
  const handleSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      /*
       * Le decalage, c'est le nombre de sessions deja affichees — pas le
       * nombre de pages chargees. Apres une suppression, la premiere page
       * se recompose cote serveur et remonte d'un cran ce qui suivait :
       * compter les lignes visibles retombe juste, compter les pages
       * sauterait une session.
       */
      const next = await getPracticeSessions(
        undefined,
        SESSIONS_PER_PAGE,
        sessions.length
      );
      setLoadedSessions((previous) => [...previous, ...next]);
    } finally {
      setIsLoadingMore(false);
    }
  }, [sessions.length]);

  /**
   * Suppression par glissement : la carte disparait tout de suite, les
   * stats et les graphiques se recalculent au rafraichissement.
   */
  const handleSessionDeleted = useCallback(
    (sessionId: string) => {
      setDeletedIds((previous) => new Set(previous).add(sessionId));
      router.refresh();
    },
    [router]
  );

  return (
    <div>
      {/*
        Le titre "Progression" et son sous-titre ont disparu : le segment
        actif de la barre du profil le dit deja, et la page portait deux
        <h1> — celui du nom de profil et celui-ci.
      */}
      <div className="mb-5">
        <StatsSummary stats={stats} />
      </div>

      {/* Onglets + action, sur la meme ligne */}
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-border">
        <div role="tablist" aria-label="Vue de la progression" className="flex gap-5">
          <button
            role="tab"
            aria-selected={activeTab === "journal"}
            onClick={() => setActiveTab("journal")}
            className={`flex min-h-[44px] items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "journal"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              menu_book
            </span>
            Journal
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "stats"}
            onClick={() => setActiveTab("stats")}
            className={`flex min-h-[44px] items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "stats"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              bar_chart
            </span>
            Statistiques
          </button>
        </div>

        <button
          onClick={openManualEntry}
          className="mb-2 inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            add
          </span>
          <span className="hidden sm:inline">Ajouter une session</span>
          <span className="sm:hidden">Session</span>
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === "journal" ? (
        /*
         * L'historique passe en premier, le chrono en colonne laterale.
         *
         * Avant : identite + vitrine + segments + titre + stats + onglets
         * + chrono + "morceau le plus pratique" s'empilaient au-dessus de
         * la liste — plus de 1 700 px a faire defiler sur un ecran de
         * 700 px avant de voir la premiere session, alors que consulter
         * ses sessions est la raison d'ouvrir l'ecran.
         */
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* Historique */}
          <div className="order-1 min-w-0">
            <h2 className="sr-only">Historique des sessions</h2>
            <SessionList
              sessions={sessions}
              onSessionClick={(session) => setSelectedSession(session)}
              onSessionDeleted={handleSessionDeleted}
            />

            {/*
              Le bouton dit combien il reste : « Charger plus » seul ne
              permet pas de savoir si on est a deux sessions de la fin ou
              a deux cents.
            */}
            {remaining > 0 && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleLoadMore()}
                  disabled={isLoadingMore}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
                >
                  {isLoadingMore ? (
                    "Chargement…"
                  ) : (
                    <>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-[20px]"
                      >
                        expand_more
                      </span>
                      Charger {Math.min(SESSIONS_PER_PAGE, remaining)} sessions de
                      plus
                    </>
                  )}
                </button>
                <p className="tabular text-xs text-muted-foreground">
                  {sessions.length} sur {stats.totalSessions}
                </p>
              </div>
            )}
          </div>

          {/*
            Contexte, secondaire : apres la liste sur mobile, en colonne
            laterale sur desktop.

            Le chronometre vivait ici. Il en a ete retire : depuis que
            PracticeSessionProvider porte l'unique chrono de l'app, celui
            de « Jouer » et celui-ci etaient deux entrees vers la meme
            chose — et la barre de session suit deja d'un ecran a l'autre.
          */}
          <aside className="order-2 flex flex-col gap-6 lg:sticky lg:top-6">
            {stats.mostPracticedSong && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Morceau le plus pratiqué
                </p>
                <div className="flex items-center gap-3">
                  {stats.mostPracticedSong.song.cover_url ? (
                    <Image
                      src={stats.mostPracticedSong.song.cover_url}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                      width={48}
                      height={48}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-muted-foreground"
                      >
                        music_note
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {stats.mostPracticedSong.song.title}
                    </p>
                    <p className="tabular text-sm text-muted-foreground">
                      {stats.mostPracticedSong.count} session
                      {stats.mostPracticedSong.count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <RecentAlbumsCard albums={recentAlbums} />

            {/* getSongs() trie deja par date d'ajout : la tete de liste suffit. */}
            <RecentSongsCard songs={songs.slice(0, RECENT_ITEMS)} />
          </aside>
        </div>
      ) : (
        <StatsTab data={chartData} />
      )}

      {/* Modal d'édition */}
      <EditSessionModal
        session={selectedSession}
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        onSuccess={handleSuccess}
        songs={songs}
      />
    </div>
  );
}
