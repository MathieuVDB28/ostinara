"use client";

import dynamic from "next/dynamic";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SongCard } from "./song-card";
import { SongSwipeRow } from "./song-swipe-row";
import { SongShelf } from "./song-shelf";
import { ChevronDown, ChevronLeft, ChevronRight, ListPlus, Music, Plus, SearchX } from "lucide-react";
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
 * "A apprendre" est l'ancienne wishlist : un seul endroit ou ajouter un
 * morceau qu'on veut travailler, un seul endroit ou le chercher.
 *
 * L'ordre des etageres de la vue "Tous" : ce qu'on travaille en ce moment
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
 * lignes dans le DOM et un ascenseur de la taille d'un timbre.
 *
 * La pagination reste ici, pas au serveur : recherche, filtres, tri et
 * compteurs d'onglets travaillent sur la liste entiere. Paginer en base
 * les rendrait tous faux — « Maitrises 4 » quand il y en a quarante.
 */
const SONGS_PER_PAGE = 20;
/** Les maitrises en apercu, sous les deux etageres. */
const MASTERED_PREVIEW = 4;

interface SongGroupProps {
  songs: Song[];
  /** Combien on en montre avant de demander. */
  limit: number;
  /** Meilleur tempo tenu, par identifiant de morceau. */
  bestBpm: Record<string, number | null>;
  onSelect: (song: Song) => void;
  onStatusChange: (songId: string, status: SongStatus) => void;
  /** Remplace le depliage sur place par un renvoi vers la liste complete. */
  onShowAll?: () => void;
}

/**
 * Une pile de lignes qui ne se deplie qu'a la demande.
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
  onShowAll,
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
    <div className="flex flex-col">
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
          onClick={onShowAll ?? (() => setIsExpanded((value) => !value))}
          aria-expanded={onShowAll ? undefined : isExpanded}
          className="mt-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 self-center rounded-xl px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            strokeWidth={2.25}
            aria-hidden="true"
          />
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
        <div className="flex flex-col items-center py-16 text-center">
          <Music className="mb-4 h-10 w-10 text-muted-foreground" strokeWidth={1.25} aria-hidden="true" />
          <h2 className="mb-2 text-lg font-bold">Ta bibliothèque est vide</h2>
          <p className="mb-6 max-w-sm text-muted-foreground">
            Ajoute un morceau que tu veux apprendre : il ira dans « À apprendre »
            jusqu&apos;à ce que tu commences à le travailler.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
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

  const chip =
    "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const chipIdle = "border-border text-muted-foreground hover:text-foreground";
  const chipActive = "border-border bg-secondary text-foreground";

  const listSection = STATUS_SECTIONS.find((section) => section.value === activeFilter);

  return (
    <div>
      {/*
        Actions. Sur mobile, "Ajouter un morceau" quitte le haut de page
        pour un bouton flottant a portee du pouce (voir plus bas) : c'est
        l'action qu'on repete, et elle etait la ou le pouce n'atteint pas.
        C'est le seul aplat ambre de l'ecran.
      */}
      <div className="mb-4 hidden items-center justify-end gap-2 sm:flex">
        {spotifyConnected && userPlan !== "free" && (
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ListPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Importer une playlist
          </button>
        )}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Ajouter un morceau
        </button>
      </div>

      <SpotifySuggestions
        userPlan={userPlan}
        spotifyConnected={spotifyConnected}
        existingSpotifyIds={songs.filter((s) => s.spotify_id).map((s) => s.spotify_id!)}
        onAddSong={() => setIsAddModalOpen(true)}
      />

      {/*
        Filtres, tri et playlists sur une seule rangee de puces. L'ecran en
        empilait trois (playlists, statuts, filtres) avant le premier
        morceau ; le statut est devenu les etageres elles-memes.
      */}
      <div className="-mr-4 flex items-center gap-1.5 lg:mr-0">
        {/* Hors de la zone qui defile : leurs panneaux y seraient coupes. */}
        <FilterPopover
          filters={filters}
          onFiltersChange={setFilters}
          activeCount={countActiveFilters(filters)}
          availableTunings={availableTunings}
        />
        <SortDropdown value={sortBy} onChange={setSortBy} />

        <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-border" />

        <div
          role="group"
          aria-label="Filtrer par playlist"
          className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] lg:pr-0 [&::-webkit-scrollbar]:hidden"
        >
          <button
            onClick={() => setActivePlaylistId(ALL_PLAYLISTS)}
            aria-pressed={activePlaylistId === ALL_PLAYLISTS}
            className={`${chip} ${activePlaylistId === ALL_PLAYLISTS ? chipActive : chipIdle}`}
          >
            Tous
            <span className="tabular opacity-70">{statusCounts.all}</span>
          </button>

          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => setActivePlaylistId(playlist.id)}
              aria-pressed={activePlaylistId === playlist.id}
              className={`${chip} ${activePlaylistId === playlist.id ? chipActive : chipIdle}`}
            >
              {playlist.name}
              <span className="tabular opacity-70">{playlist.song_count}</span>
            </button>
          ))}

          <button
            onClick={() => setIsCreatePlaylistModalOpen(true)}
            className={`${chip} border-dashed ${chipIdle}`}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Playlist
          </button>
        </div>
      </div>

      {/* Edition de la playlist active */}
      {activePlaylist && (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold">{activePlaylist.name}</span>
          {activePlaylist.description && (
            <span className="text-muted-foreground">{activePlaylist.description}</span>
          )}
          <button
            onClick={() => setEditingPlaylist(activePlaylist)}
            className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Modifier
          </button>
        </p>
      )}

      <div aria-hidden="true" className="-mx-4 mt-3 h-px bg-border lg:mx-0" />

      {/* Liste */}
      {filteredSongs.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <SearchX className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-muted-foreground">Aucun morceau trouvé</p>
          {hasActiveNarrowing && (
            <button
              onClick={() => {
                setActiveFilter("all");
                setActivePlaylistId(ALL_PLAYLISTS);
                setFilters({ difficulties: [], tunings: [], hasCapo: null });
                setSortBy("date_desc");
              }}
              className="mt-2 min-h-[44px] text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : sections ? (
        /*
          La vue d'ensemble : une etagere par etat de travail. Le chevron
          ouvre la liste complete du statut — c'est l'ancien onglet.
        */
        <div className="space-y-6 pt-5">
          {sections.map((section) => (
            <section key={section.value} aria-labelledby={`section-${section.value}`}>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 id={`section-${section.value}`} className="text-lg font-extrabold tracking-[-0.01em]">
                  {section.label}
                  <span className="tabular font-bold text-muted-foreground">
                    <span aria-hidden="true"> · </span>
                    {section.songs.length}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveFilter(section.value)}
                  aria-label={`Voir tous les morceaux : ${section.label}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                </button>
              </div>

              {section.value === "mastered" ? (
                // Le repertoire acquis se consulte plus qu'il ne se parcourt :
                // une courte liste suffit, le chevron mene au reste.
                <SongGroup
                  songs={section.songs}
                  limit={MASTERED_PREVIEW}
                  bestBpm={bestBpm}
                  onSelect={setSelectedSong}
                  onStatusChange={handleStatusChange}
                  onShowAll={() => setActiveFilter(section.value)}
                />
              ) : (
                <SongShelf songs={section.songs} bestBpm={bestBpm} onSelect={setSelectedSong} />
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="pt-4">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className="-ml-1 mb-2 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
            Tous les morceaux
          </button>
          <h2 className="mb-2 text-2xl font-extrabold tracking-[-0.01em]">
            {listSection?.label}
            <span className="tabular font-bold text-muted-foreground">
              <span aria-hidden="true"> · </span>
              {filteredSongs.length}
            </span>
          </h2>
          <SongGroup
            // Changer de statut repart du haut d'une liste repliee : la
            // longueur depliee du precedent n'a rien a voir avec celui-ci.
            key={activeFilter}
            songs={filteredSongs}
            limit={SONGS_PER_PAGE}
            bestBpm={bestBpm}
            onSelect={setSelectedSong}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {/*
        Bouton flottant mobile : l'ajout est l'action la plus repetee de
        l'ecran, et la zone du pouce est en bas. Il se place au-dessus de
        la pilule de navigation et de l'encoche.
      */}
      <div className="fixed bottom-0 right-0 z-30 flex flex-col items-center gap-3 p-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:hidden">
        {spotifyConnected && userPlan !== "free" && (
          <button
            onClick={() => setIsImportModalOpen(true)}
            aria-label="Importer une playlist Spotify"
            className="glass flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ListPlus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        <button
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Ajouter un morceau"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
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
