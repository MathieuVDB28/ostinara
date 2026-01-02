"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SongCard } from "./song-card";
import { AddSongModal } from "./add-song-modal";
import { EditSongModal } from "./edit-song-modal";
import { FilterPopover } from "./filter-popover";
import { SortDropdown } from "./sort-dropdown";
import type { Song, SongStatus, SongDifficulty, FilterState, SortOption } from "@/types";

// Helper pour ordonner les difficultés
function difficultyOrder(difficulty: SongDifficulty | undefined): number {
  const order: Record<SongDifficulty, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4,
  };
  return difficulty ? order[difficulty] : 0;
}

// Helper pour compter les filtres actifs
function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.difficulties.length > 0) count++;
  if (filters.tunings.length > 0) count++;
  if (filters.hasCapo !== null) count++;
  return count;
}

interface LibraryViewProps {
  initialSongs: Song[];
}

const statusTabs: { value: SongStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "want_to_learn", label: "À apprendre" },
  { value: "learning", label: "En cours" },
  { value: "mastered", label: "Maîtrisés" },
];

export function LibraryView({ initialSongs }: LibraryViewProps) {
  const router = useRouter();
  const [songs, setSongs] = useState(initialSongs);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [activeFilter, setActiveFilter] = useState<SongStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    difficulties: [],
    tunings: [],
    hasCapo: null,
  });
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");

  // Synchroniser l'état local avec les props du serveur
  useEffect(() => {
    setSongs(initialSongs);
  }, [initialSongs]);

  // Extraire les tunings uniques disponibles
  const availableTunings = useMemo(() => {
    const tunings = new Set(songs.map((s) => s.tuning).filter(Boolean));
    return Array.from(tunings).sort();
  }, [songs]);

  // Filtrage et tri combinés
  const filteredSongs = useMemo(() => {
    let result = songs.filter((song) => {
      // Filtre status existant
      const matchesStatus = activeFilter === "all" || song.status === activeFilter;

      // Recherche existante
      const matchesSearch =
        !searchQuery ||
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtre difficulté
      const matchesDifficulty =
        filters.difficulties.length === 0 ||
        (song.difficulty && filters.difficulties.includes(song.difficulty));

      // Filtre tuning
      const matchesTuning =
        filters.tunings.length === 0 || filters.tunings.includes(song.tuning);

      // Filtre capo
      const matchesCapo =
        filters.hasCapo === null ||
        (filters.hasCapo ? song.capo_position > 0 : song.capo_position === 0);

      return matchesStatus && matchesSearch && matchesDifficulty && matchesTuning && matchesCapo;
    });

    // Tri
    result = [...result].sort((a, b) => {
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

    return result;
  }, [songs, activeFilter, searchQuery, filters, sortBy]);

  const handleRefresh = () => {
    router.refresh();
  };

  // Stats
  const stats = {
    total: songs.length,
    learning: songs.filter((s) => s.status === "learning").length,
    mastered: songs.filter((s) => s.status === "mastered").length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ma bibliothèque</h1>
          <p className="mt-1 text-muted-foreground">
            {stats.total} morceau{stats.total > 1 ? "x" : ""} • {stats.learning} en cours • {stats.mastered} maîtrisé{stats.mastered > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un morceau
        </button>
      </div>

      {songs.length > 0 ? (
        <>
          {/* Filters and search */}
          <div className="mb-6 flex flex-col gap-4">
            {/* Status tabs */}
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveFilter(tab.value)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeFilter === tab.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search, Filters and Sort */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none sm:w-64"
                />
              </div>

              {/* Filters and Sort */}
              <div className="flex items-center gap-2">
                <FilterPopover
                  filters={filters}
                  onFiltersChange={setFilters}
                  activeCount={countActiveFilters(filters)}
                  availableTunings={availableTunings}
                />
                <SortDropdown value={sortBy} onChange={setSortBy} />
              </div>
            </div>
          </div>

          {/* Songs grid */}
          {filteredSongs.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <button
                onClick={() => {
                  setActiveFilter("all");
                  setSearchQuery("");
                  setFilters({ difficulties: [], tunings: [], hasCapo: null });
                  setSortBy("date_desc");
                }}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Ta bibliothèque est vide</h3>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">
            Ajoute ton premier morceau pour commencer à tracker ta progression
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un morceau
          </button>
        </div>
      )}

      {/* Add song modal */}
      <AddSongModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Edit song modal */}
      <EditSongModal
        song={selectedSong}
        isOpen={!!selectedSong}
        onClose={() => setSelectedSong(null)}
        onUpdate={handleRefresh}
      />
    </div>
  );
}
