"use client";

import dynamic from "next/dynamic";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SongCard } from "./song-card";
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
import type {
  Song,
  SongStatus,
  SongDifficulty,
  FilterState,
  SortOption,
  PlaylistWithSongs,
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

const ALL_PLAYLISTS = "all";

export function LibraryView({
  initialSongs,
  initialPlaylists,
  userPlan = "free",
  spotifyConnected = false,
}: LibraryViewProps) {
  const router = useRouter();
  const { query: searchQuery } = useBiblioSearch();

  const [songs, setSongs] = useState(initialSongs);
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
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
        case "progress_desc":
          return b.progress_percent - a.progress_percent;
        case "difficulty_asc":
          return difficultyOrder(a.difficulty) - difficultyOrder(b.difficulty);
        case "difficulty_desc":
          return difficultyOrder(b.difficulty) - difficultyOrder(a.difficulty);
        default:
          return 0;
      }
    });
  }, [songs, activePlaylist, activeFilter, searchQuery, filters, sortBy]);

  const handleRefresh = () => router.refresh();

  const hasActiveNarrowing =
    activeFilter !== "all" ||
    searchQuery !== "" ||
    activePlaylistId !== ALL_PLAYLISTS ||
    countActiveFilters(filters) > 0;

  const stats = {
    total: songs.length,
    learning: songs.filter((s) => s.status === "learning").length,
    mastered: songs.filter((s) => s.status === "mastered").length,
  };

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
      {/* Resume + actions */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {stats.total} morceau{stats.total > 1 ? "x" : ""} • {stats.learning} en
          cours • {stats.mastered} maîtrisé{stats.mastered > 1 ? "s" : ""}
        </p>

        <div className="flex items-center gap-2">
          {spotifyConnected && userPlan !== "free" && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Importer
            </button>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un morceau
          </button>
        </div>
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
        className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          onClick={() => setActivePlaylistId(ALL_PLAYLISTS)}
          aria-pressed={activePlaylistId === ALL_PLAYLISTS}
          className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            activePlaylistId === ALL_PLAYLISTS
              ? "bg-primary text-primary-foreground"
              : "bg-accent/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          Tous
        </button>

        {playlists.map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => setActivePlaylistId(playlist.id)}
            aria-pressed={activePlaylistId === playlist.id}
            className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              activePlaylistId === playlist.id
                ? "bg-primary text-primary-foreground"
                : "bg-accent/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {playlist.name}
            <span className="ml-1.5 opacity-70">{playlist.song_count}</span>
          </button>
        ))}

        <button
          onClick={() => setIsCreatePlaylistModalOpen(true)}
          className="flex min-h-[36px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-border px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Playlist
        </button>
      </div>

      {/* Edition de la playlist active */}
      {activePlaylist && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent/40 px-4 py-2.5">
          <p className="text-sm">
            <span className="font-medium">{activePlaylist.name}</span>
            {activePlaylist.description && (
              <span className="text-muted-foreground"> — {activePlaylist.description}</span>
            )}
          </p>
          <button
            onClick={() => setEditingPlaylist(activePlaylist)}
            className="min-h-[36px] rounded-lg px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent"
          >
            Modifier la playlist
          </button>
        </div>
      )}

      {/* Statut + filtres + tri */}
      <div className="mb-6 flex flex-col gap-4">
        <div
          role="group"
          aria-label="Filtrer par statut"
          className="flex gap-6 overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              aria-pressed={activeFilter === tab.value}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeFilter === tab.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2">
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
      {filteredSongs.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onClick={() => setSelectedSong(song)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
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
              className="mt-2 min-h-[44px] text-sm text-primary hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

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
