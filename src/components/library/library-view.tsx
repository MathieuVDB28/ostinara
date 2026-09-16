"use client";

import dynamic from "next/dynamic";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SongCard } from "./song-card";
import { SongSwipeRow } from "./song-swipe-row";
// Les modales ne sont ni montees ni telechargees tant qu'elles ne sont pas
// ouvertes. EditSongModal entraine toute la chaine d'upload video
// (add-cover-modal → video-upload → tus-js-client), inutile pour qui
// consulte simplement sa bibliotheque.
const AddSongModal = dynamic(() =>
  import("./add-song-modal").then((m) => m.AddSongModal)
);
const EditSongModal = dynamic(() =>
  import("./edit-song-modal").then((m) => m.EditSongModal)
);
import { FilterPopover } from "./filter-popover";
import { SortDropdown } from "./sort-dropdown";
const CreatePlaylistModal = dynamic(() =>
  import("./create-playlist-modal").then((m) => m.CreatePlaylistModal)
);
const EditPlaylistModal = dynamic(() =>
  import("./edit-playlist-modal").then((m) => m.EditPlaylistModal)
);
import { SpotifySuggestions } from "./spotify-suggestions";
const ImportPlaylistModal = dynamic(() =>
  import("./import-playlist-modal").then((m) => m.ImportPlaylistModal)
);
import { useBiblioSearch } from "@/components/biblio/biblio-search";
import { songTempoProgress } from "@/lib/song-progress";
import type {
  Song,
  SongStatus,
  SongDifficulty,
  FilterState,
  SortOption,
  PlaylistWithSongs,
  SongPracticeStats,
  UserPlan,
} from "@/types";

function difficultyOrder(difficulty: SongDifficulty | undefined): number {
  const order: Record<SongDifficulty, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4,
  };
  return difficulty ? order[difficulty] : 0;
}

function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.difficulties.length > 0) count++;
  if (filters.tunings.length > 0) count++;
  if (filters.hasCapo !== null) count++;
  return count;
}

interface LibraryViewProps {
  initialSongs: Song[];
  initialPlaylists: PlaylistWithSongs[];
  userPlan?: UserPlan;
  spotifyConnected?: boolean;
  /** Morceau a ouvrir a l'arrivee — lien profond de la recherche globale. */
  initialSongId?: string;
  /**
   * Meilleur tempo tenu par morceau.
   *
   * Il arrive en une lecture agregee depuis la page : la progression
   * affichee sur chaque carte est une mesure, plus un curseur.
   */
  songPracticeStats?: Record<string, SongPracticeStats>;
}

/**
 * "A apprendre" est desormais l'ancienne wishlist : un seul endroit ou
 * ajouter un morceau qu'on veut travailler, un seul endroit ou le chercher.
 */
const statusTabs: { value: SongStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "want_to_learn", label: "À apprendre" },
  { value: "learning", label: "En cours" },
  { value: "mastered", label: "Maîtrisés" },
];

/**
 * L'ordre des sections de la vue "Tous" : ce qu'on travaille en ce moment
 * d'abord, la file d'attente ensuite, le repertoire acquis en dernier.
 * C'est l'ordre dans lequel on ouvre la bibliotheque — pas l'ordre
 * alphabetique de l'enum.
 */
const STATUS_SECTIONS: { value: SongStatus; label: string; hint: string }[] = [
  { value: "learning", label: "En cours", hint: "Ce que tu travailles" },
  { value: "want_to_learn", label: "À apprendre", hint: "Ta file d'attente" },
  { value: "mastered", label: "Maîtrisés", hint: "Ton répertoire" },
];

const ALL_PLAYLISTS = "all";

/**
 * Combien de morceaux avant le bouton « Voir les autres ».
 *
 * La bibliotheque rendait tout d'un coup : a 200 morceaux, c'est 200
 * cartes dans le DOM et un ascenseur de la taille d'un timbre. Les
 * sections de la vue « Tous » en montrent moins — il y en a trois, et on
 * vient y comparer, pas y lire.
 *
 * La pagination reste ici, pas au serveur : recherche, filtres, tri et
 * compteurs d'onglets travaillent sur la liste entiere. Paginer en base
 * les rendrait tous faux — « Maitrises 4 » quand il y en a quarante.
 */
const SONGS_PER_SECTION = 8;
const SONGS_PER_PAGE = 20;

interface SongGroupProps {
  songs: Song[];
  /** Combien on en montre avant de demander. */
  limit: number;
  /** Meilleur tempo tenu, par identifiant de morceau. */
  bestBpm: Record<string, number | null>;
  onSelect: (song: Song) => void;
  onStatusChange: (songId: string, status: SongStatus) => void;
}

/**
 * Une pile de cartes qui ne se deplie qu'a la demande.
 *
 * Pas de numeros de page : une bibliotheque se parcourt, et un morceau se
 * retrouve par la recherche ou les filtres, pas en se souvenant qu'il
 * etait « page 3 ».
 */
function SongGroup({
  songs,
  limit,
  bestBpm,
  onSelect,
  onStatusChange,
}: SongGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  /*
   * Deux morceaux de tolerance : replier une liste de neuf pour en cacher
   * un seul coute un clic et ne gagne rien. « Voir le 1 autre » est une
   * phrase qu'on ne devrait jamais lire.
   */
  const effectiveLimit = songs.length <= limit + 2 ? songs.length : limit;
  const visible = isExpanded ? songs : songs.slice(0, effectiveLimit);
  const hidden = songs.length - visible.length;

  return (
    <div className="flex flex-col gap-2">
      {visible.map((song) => (
        <SongSwipeRow key={song.id} song={song} onStatusChange={onStatusChange}>
          <SongCard
            song={song}
            bestBpm={bestBpm[song.id] ?? null}
            onClick={() => onSelect(song)}
          />
        </SongSwipeRow>
      ))}

      {/*
        Le bouton porte le nombre restant : « Voir plus » ne dit pas si on
        est a trois morceaux de la fin ou a cent.
      */}
      {(hidden > 0 || isExpanded) && (
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          aria-expanded={isExpanded}
          className="mt-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 self-center rounded-xl px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className={`material-symbols-outlined text-[20px] transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
          {isExpanded
            ? "Réduire"
            : `Voir les ${hidden} autre${hidden > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}

export function LibraryView({
  initialSongs,
  initialPlaylists,
  userPlan = "free",
  spotifyConnected = false,
  initialSongId,
  songPracticeStats = {},
}: LibraryViewProps) {
  const router = useRouter();
  const { query: searchQuery } = useBiblioSearch();

  const [songs, setSongs] = useState(initialSongs);
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  /*
   * Arrivee depuis la recherche globale : la fiche s'ouvre des le premier
   * rendu. En etat initial plutot qu'en effet — sinon la page s'affiche
   * une fois sans la fiche, puis une seconde avec.
   */
  const [selectedSong, setSelectedSong] = useState<Song | null>(
    () => initialSongs.find((song) => song.id === initialSongId) ?? null
  );
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistWithSongs | null>(null);

  // Une playlist est un filtre sur les morceaux, pas une section a part.
  const [activePlaylistId, setActivePlaylistId] = useState<string>(ALL_PLAYLISTS);
  const [activeFilter, setActiveFilter] = useState<SongStatus | "all">("all");
  const [filters, setFilters] = useState<FilterState>({
    difficulties: [],
    tunings: [],
    hasCapo: null,
  });
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");

  useEffect(() => {
    setSongs(initialSongs);
  }, [initialSongs]);

  /*
   * Le meilleur tempo, par morceau. Extrait une fois des stats agregees :
   * chaque carte n'a besoin que de ce nombre, pas de toute la ligne.
   */
  const bestBpm = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const [songId, stats] of Object.entries(songPracticeStats)) {
      map[songId] = stats.bestBpm;
    }
    return map;
  }, [songPracticeStats]);

  useEffect(() => {
    setPlaylists(initialPlaylists);
  }, [initialPlaylists]);

  // Une playlist supprimee ailleurs ne doit pas laisser la liste vide
  // sans explication.
  useEffect(() => {
    if (
      activePlaylistId !== ALL_PLAYLISTS &&
      !playlists.some((playlist) => playlist.id === activePlaylistId)
    ) {
      setActivePlaylistId(ALL_PLAYLISTS);
    }
  }, [playlists, activePlaylistId]);

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) ?? null;

  const availableTunings = useMemo(() => {
    const tunings = new Set(songs.map((s) => s.tuning).filter(Boolean));
    return Array.from(tunings).sort();
  }, [songs]);

  const filteredSongs = useMemo(() => {
    const playlistSongIds = activePlaylist
      ? new Set(activePlaylist.songs.map((song) => song.id))
      : null;

    const result = songs.filter((song) => {
      const matchesPlaylist = !playlistSongIds || playlistSongIds.has(song.id);
      const matchesStatus = activeFilter === "all" || song.status === activeFilter;

      const needle = searchQuery.toLowerCase();
      const matchesSearch =
        !needle ||
        song.title.toLowerCase().includes(needle) ||
        song.artist.toLowerCase().includes(needle);

      const matchesDifficulty =
        filters.difficulties.length === 0 ||
        (song.difficulty && filters.difficulties.includes(song.difficulty));

      const matchesTuning =
        filters.tunings.length === 0 || filters.tunings.includes(song.tuning);

      const matchesCapo =
        filters.hasCapo === null ||
        (filters.hasCapo ? song.capo_position > 0 : song.capo_position === 0);

      return (
        matchesPlaylist &&
        matchesStatus &&
        matchesSearch &&
        matchesDifficulty &&
        matchesTuning &&
        matchesCapo
      );
    });

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "date_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "title_desc":
          return b.title.localeCompare(a.title);
        case "progress_desc": {
          /*
           * Trier « par progression » sur une valeur saisie a la main
           * classait les morceaux par ordre d'optimisme. Le tempo tenu
           * rapporte a la cible les classe par avancee reelle ; les
           * morceaux sans cible retombent sur l'ancienne colonne.
           */
          const progressOf = (song: Song) =>
            songTempoProgress(song, bestBpm[song.id] ?? null)?.percent ??
            song.progress_percent;
          return progressOf(b) - progressOf(a);
        }
        case "difficulty_asc":
          return difficultyOrder(a.difficulty) - difficultyOrder(b.difficulty);
        case "difficulty_desc":
          return difficultyOrder(b.difficulty) - difficultyOrder(a.difficulty);
        default:
          return 0;
      }
    });
  }, [songs, activePlaylist, activeFilter, searchQuery, filters, sortBy, bestBpm]);

  const handleRefresh = () => router.refresh();

  const hasActiveNarrowing =
    activeFilter !== "all" ||
    searchQuery !== "" ||
    activePlaylistId !== ALL_PLAYLISTS ||
    countActiveFilters(filters) > 0;

  /**
   * Les compteurs vivent sur les onglets eux-memes. Une ligne de resume
   * "24 morceaux - 4 en cours - 12 maitrises" au-dessus d'onglets muets
   * disait deux fois la meme chose, et ne disait jamais combien il y
   * avait de morceaux derriere l'onglet ou l'on s'appretait a aller.
   *
   * Le compte se fait apres la playlist, la recherche et les filtres,
   * mais avant le statut : sinon l'onglet actif serait le seul a afficher
   * un nombre non nul.
   */
  const statusCounts = useMemo(() => {
    const playlistSongIds = activePlaylist
      ? new Set(activePlaylist.songs.map((song) => song.id))
      : null;
    const needle = searchQuery.toLowerCase();

    const scoped = songs.filter((song) => {
      if (playlistSongIds && !playlistSongIds.has(song.id)) return false;
      if (
        needle &&
        !song.title.toLowerCase().includes(needle) &&
        !song.artist.toLowerCase().includes(needle)
      )
        return false;
      if (
        filters.difficulties.length > 0 &&
        (!song.difficulty || !filters.difficulties.includes(song.difficulty))
      )
        return false;
      if (filters.tunings.length > 0 && !filters.tunings.includes(song.tuning))
        return false;
      if (filters.hasCapo !== null) {
        const hasCapo = song.capo_position > 0;
        if (hasCapo !== filters.hasCapo) return false;
      }
      return true;
    });

    return {
      all: scoped.length,
      want_to_learn: scoped.filter((s) => s.status === "want_to_learn").length,
      learning: scoped.filter((s) => s.status === "learning").length,
      mastered: scoped.filter((s) => s.status === "mastered").length,
    } satisfies Record<SongStatus | "all", number>;
  }, [songs, activePlaylist, searchQuery, filters]);

  /**
   * "Tous" n'est pas une liste plate : c'est trois etats de travail
   * differents. Les empiler sans separation obligeait a lire le badge de
   * chaque carte pour savoir ou on en etait.
   */
  const sections = useMemo(() => {
    if (activeFilter !== "all") return null;
    return STATUS_SECTIONS.map((section) => ({
      ...section,
      songs: filteredSongs.filter((song) => song.status === section.value),
    })).filter((section) => section.songs.length > 0);
  }, [activeFilter, filteredSongs]);

  /**
   * Le changement de statut par glissement, applique localement avant le
   * serveur. `updateSongStatus` force aussi la progression a 100 % pour un
   * morceau maitrise : la carte doit dire la meme chose que la base.
   */
  const handleStatusChange = useCallback(
    (songId: string, status: SongStatus) => {
      setSongs((previous) =>
        previous.map((song) =>
          song.id === songId
            ? {
                ...song,
                status,
                progress_percent:
                  status === "mastered" ? 100 : song.progress_percent,
              }
            : song
        )
      );
    },
    []
  );

  if (songs.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold">Ta bibliothèque est vide</h2>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">
            Ajoute un morceau que tu veux apprendre : il ira dans « À apprendre »
            jusqu&apos;à ce que tu commences à le travailler.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un morceau
          </button>
        </div>

        {isAddModalOpen && (
          <AddSongModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={handleRefresh}
          />
        )}
      </>
    );
  }

  return (
    <div>
      {/*
        Actions. Sur mobile, "Ajouter un morceau" quitte le haut de page
        pour un bouton flottant a portee du pouce (voir plus bas) : c'est
        l'action qu'on repete, et elle etait la ou le pouce n'atteint pas.
      */}
      <div className="mb-4 hidden items-center justify-end gap-2 sm:flex">
        {spotifyConnected && userPlan !== "free" && (
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              playlist_add
            </span>
            Importer une playlist
          </button>
        )}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            add
          </span>
          Ajouter un morceau
        </button>
      </div>

      <SpotifySuggestions
        userPlan={userPlan}
        spotifyConnected={spotifyConnected}
        existingSpotifyIds={songs.filter((s) => s.spotify_id).map((s) => s.spotify_id!)}
        onAddSong={() => setIsAddModalOpen(true)}
      />

      {/* Selecteur de playlist : un filtre, pas une section */}
      <div
        role="group"
        aria-label="Filtrer par playlist"
        className="mb-2.5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          onClick={() => setActivePlaylistId(ALL_PLAYLISTS)}
          aria-pressed={activePlaylistId === ALL_PLAYLISTS}
          className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            activePlaylistId === ALL_PLAYLISTS
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Toutes les playlists
        </button>

        {playlists.map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => setActivePlaylistId(playlist.id)}
            aria-pressed={activePlaylistId === playlist.id}
            className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activePlaylistId === playlist.id
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {playlist.name}
            <span className="tabular ml-1.5 opacity-70">{playlist.song_count}</span>
          </button>
        ))}

        <button
          onClick={() => setIsCreatePlaylistModalOpen(true)}
          className="flex min-h-[36px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-border px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            add
          </span>
          Playlist
        </button>
      </div>

      {/* Edition de la playlist active */}
      {activePlaylist && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent/40 px-4 py-2.5">
          <p className="text-sm">
            <span className="font-medium">{activePlaylist.name}</span>
            {activePlaylist.description && (
              <span className="text-muted-foreground"> — {activePlaylist.description}</span>
            )}
          </p>
          <button
            onClick={() => setEditingPlaylist(activePlaylist)}
            className="min-h-[36px] rounded-lg px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Modifier la playlist
          </button>
        </div>
      )}

      {/*
        Statut, filtres et tri sur une seule ligne. L'ecran empilait
        quatre rangs de controles (segments biblio, playlists, statuts,
        filtres) avant le premier morceau ; il en reste deux.
      */}
      <div className="mb-5 flex items-center gap-2">
        <div
          role="group"
          aria-label="Filtrer par statut"
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl bg-accent/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {statusTabs.map((tab) => {
            const isActive = activeFilter === tab.value;
            const count = statusCounts[tab.value];

            return (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                aria-pressed={isActive}
                className={`flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span
                  className={`tabular text-[11px] ${
                    isActive ? "text-muted-foreground" : "opacity-60"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <FilterPopover
            filters={filters}
            onFiltersChange={setFilters}
            activeCount={countActiveFilters(filters)}
            availableTunings={availableTunings}
          />
          <SortDropdown value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {/* Liste */}
      {filteredSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <span aria-hidden="true" className="material-symbols-outlined text-muted-foreground">
              search
            </span>
          </div>
          <p className="text-muted-foreground">Aucun morceau trouvé</p>
          {hasActiveNarrowing && (
            <button
              onClick={() => {
                setActiveFilter("all");
                setActivePlaylistId(ALL_PLAYLISTS);
                setFilters({ difficulties: [], tunings: [], hasCapo: null });
                setSortBy("date_desc");
              }}
              className="mt-2 min-h-[44px] text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : sections ? (
        <div className="space-y-7">
          {sections.map((section) => (
            <section key={section.value} aria-labelledby={`section-${section.value}`}>
              <div className="mb-2.5 flex items-baseline gap-2">
                <h2
                  id={`section-${section.value}`}
                  className="text-sm font-semibold uppercase tracking-wider"
                >
                  {section.label}
                </h2>
                <span className="tabular text-xs text-muted-foreground">
                  {section.songs.length}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  — {section.hint}
                </span>
              </div>
              <SongGroup
                songs={section.songs}
                limit={SONGS_PER_SECTION}
                bestBpm={bestBpm}
                onSelect={setSelectedSong}
                onStatusChange={handleStatusChange}
              />
            </section>
          ))}
        </div>
      ) : (
        <SongGroup
          // Changer d'onglet de statut repart du haut d'une liste repliee :
          // la longueur depliee du precedent n'a rien a voir avec celui-ci.
          key={activeFilter}
          songs={filteredSongs}
          limit={SONGS_PER_PAGE}
          bestBpm={bestBpm}
          onSelect={setSelectedSong}
          onStatusChange={handleStatusChange}
        />
      )}

      {/*
        Bouton flottant mobile : l'ajout est l'action la plus repetee de
        l'ecran, et la zone du pouce est en bas. Il se place au-dessus de
        la barre d'onglets et de l'encoche.
      */}
      <div className="fixed bottom-0 right-0 z-30 p-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:hidden">
        {spotifyConnected && userPlan !== "free" && (
          <button
            onClick={() => setIsImportModalOpen(true)}
            aria-label="Importer une playlist Spotify"
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              playlist_add
            </span>
          </button>
        )}
        <button
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Ajouter un morceau"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[28px]">
            add
          </span>
        </button>
      </div>

      {isAddModalOpen && (
        <AddSongModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleRefresh}
        />
      )}

      {selectedSong && (
      <EditSongModal
        song={selectedSong}
        isOpen={!!selectedSong}
        onClose={() => setSelectedSong(null)}
        onUpdate={handleRefresh}
        onDelete={(songId) => {
          setSongs((prev) => prev.filter((s) => s.id !== songId));
          setSelectedSong(null);
          handleRefresh();
        }}
        userPlan={userPlan}
        bestBpm={selectedSong ? bestBpm[selectedSong.id] ?? null : null}
      />
      )}

      {isCreatePlaylistModalOpen && (
        <CreatePlaylistModal
          isOpen={isCreatePlaylistModalOpen}
          onClose={() => setIsCreatePlaylistModalOpen(false)}
          onSuccess={handleRefresh}
        />
      )}

      {editingPlaylist && (
        <EditPlaylistModal
          playlist={editingPlaylist}
          isOpen={!!editingPlaylist}
          onClose={() => setEditingPlaylist(null)}
          onSuccess={handleRefresh}
        />
      )}

      {isImportModalOpen && (
        <ImportPlaylistModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
