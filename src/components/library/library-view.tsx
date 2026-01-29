"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SongCard } from "./song-card";
import { AddSongModal, SpotifyResult } from "./add-song-modal";
import { EditSongModal } from "./edit-song-modal";
import { FilterPopover } from "./filter-popover";
import { SortDropdown } from "./sort-dropdown";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { AddToWishlistModal } from "@/components/wishlist/add-to-wishlist-modal";
import { PlaylistCard } from "./playlist-card";
import { CreatePlaylistModal } from "./create-playlist-modal";
import { EditPlaylistModal } from "./edit-playlist-modal";
import { PlaylistDetailView } from "./playlist-detail-view";
import { removeFromWishlist } from "@/lib/actions/wishlist";
import type { Song, SongStatus, SongDifficulty, FilterState, SortOption, WishlistSong, PlaylistWithSongs } from "@/types";

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
  initialWishlistSongs: WishlistSong[];
  initialPlaylists: PlaylistWithSongs[];
}

type MainTab = "library" | "wishlist" | "playlists";

const mainTabs: { value: MainTab; label: string; icon: React.ReactNode }[] = [
  {
    value: "library",
    label: "Bibliothèque",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
  {
    value: "playlists",
    label: "Playlists",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    value: "wishlist",
    label: "Wishlist",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

const statusTabs: { value: SongStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "want_to_learn", label: "À apprendre" },
  { value: "learning", label: "En cours" },
  { value: "mastered", label: "Maîtrisés" },
];

export function LibraryView({ initialSongs, initialWishlistSongs, initialPlaylists }: LibraryViewProps) {
  const router = useRouter();
  const [songs, setSongs] = useState(initialSongs);
  const [wishlistSongs, setWishlistSongs] = useState(initialWishlistSongs);
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistWithSongs | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistWithSongs | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("library");
  const [activeFilter, setActiveFilter] = useState<SongStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    difficulties: [],
    tunings: [],
    hasCapo: null,
  });
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");

  // Pour le modal "Apprendre" depuis la wishlist
  const [wishlistToLearn, setWishlistToLearn] = useState<WishlistSong | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Synchroniser l'état local avec les props du serveur
  useEffect(() => {
    setSongs(initialSongs);
  }, [initialSongs]);

  useEffect(() => {
    setWishlistSongs(initialWishlistSongs);
  }, [initialWishlistSongs]);

  useEffect(() => {
    setPlaylists(initialPlaylists);
  }, [initialPlaylists]);

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

  // Handler pour supprimer de la wishlist
  const handleRemoveFromWishlist = async (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    const result = await removeFromWishlist(id);
    if (result.success) {
      handleRefresh();
    }
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Handler pour "Apprendre" depuis la wishlist
  const handleLearnFromWishlist = (wishlistSong: WishlistSong) => {
    setWishlistToLearn(wishlistSong);
  };

  // Après ajout réussi depuis la wishlist
  const handleLearnSuccess = () => {
    if (wishlistToLearn) {
      // Supprimer de la wishlist après ajout à la bibliothèque
      removeFromWishlist(wishlistToLearn.id);
      setWishlistToLearn(null);
      handleRefresh();
    }
  };

  // Conversion WishlistSong vers SpotifyResult pour le modal
  const wishlistToSpotifyResult = (ws: WishlistSong): SpotifyResult => ({
    title: ws.title,
    artist: ws.artist,
    album: ws.album || "",
    cover_url: ws.cover_url || "",
    spotify_id: ws.spotify_id || "",
    preview_url: ws.preview_url || null,
  });

  // Filtrage wishlist par recherche
  const filteredWishlist = useMemo(() => {
    if (!searchQuery) return wishlistSongs;
    return wishlistSongs.filter(
      (song) =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [wishlistSongs, searchQuery]);

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
          <h1 className="text-3xl font-bold">
            {mainTab === "library" ? "Ma bibliothèque" : mainTab === "wishlist" ? "Ma wishlist" : "Mes playlists"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {mainTab === "library" ? (
              <>
                {stats.total} morceau{stats.total > 1 ? "x" : ""} • {stats.learning} en cours • {stats.mastered} maîtrisé{stats.mastered > 1 ? "s" : ""}
              </>
            ) : mainTab === "wishlist" ? (
              <>
                {wishlistSongs.length} morceau{wishlistSongs.length > 1 ? "x" : ""} à apprendre un jour
              </>
            ) : (
              <>
                {playlists.length} playlist{playlists.length > 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            if (mainTab === "library") setIsAddModalOpen(true);
            else if (mainTab === "wishlist") setIsWishlistModalOpen(true);
            else setIsCreatePlaylistModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {mainTab === "library" ? "Ajouter un morceau" : mainTab === "wishlist" ? "Ajouter à la wishlist" : "Créer une playlist"}
        </button>
      </div>

      {/* Main tabs (Library / Wishlist) */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {mainTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setMainTab(tab.value);
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              mainTab === tab.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
              mainTab === tab.value ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {tab.value === "library" ? songs.length : tab.value === "wishlist" ? wishlistSongs.length : playlists.length}
            </span>
          </button>
        ))}
      </div>

      {/* Library Tab Content */}
      {mainTab === "library" && (
        <>
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
        </>
      )}

      {/* Wishlist Tab Content */}
      {mainTab === "wishlist" && (
        <>
          {wishlistSongs.length > 0 ? (
            <>
              {/* Search only for wishlist */}
              <div className="mb-6">
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
                    placeholder="Rechercher dans la wishlist..."
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none sm:w-64"
                  />
                </div>
              </div>

              {/* Wishlist grid */}
              {filteredWishlist.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredWishlist.map((song) => (
                    <WishlistCard
                      key={song.id}
                      song={song}
                      onLearn={() => handleLearnFromWishlist(song)}
                      onRemove={() => handleRemoveFromWishlist(song.id)}
                      isRemoving={removingIds.has(song.id)}
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
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Effacer la recherche
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Empty wishlist state */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <svg className="h-8 w-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Ta wishlist est vide</h3>
              <p className="mb-6 max-w-sm text-center text-muted-foreground">
                Ajoute les morceaux que tu veux apprendre un jour pour ne pas les oublier
              </p>
              <button
                onClick={() => setIsWishlistModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter à la wishlist
              </button>
            </div>
          )}
        </>
      )}

      {/* Playlists Tab Content */}
      {mainTab === "playlists" && (
        <>
          {selectedPlaylist ? (
            <PlaylistDetailView
              playlist={selectedPlaylist}
              onBack={() => setSelectedPlaylist(null)}
              onEdit={() => setEditingPlaylist(selectedPlaylist)}
              onSongClick={(song) => setSelectedSong(song)}
            />
          ) : playlists.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onClick={() => setSelectedPlaylist(playlist)}
                  onEdit={() => setEditingPlaylist(playlist)}
                  onRefresh={handleRefresh}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold">Aucune playlist</h3>
              <p className="mb-6 max-w-sm text-center text-muted-foreground">
                Crée des playlists pour organiser tes morceaux par thème, humeur ou projet
              </p>
              <button
                onClick={() => setIsCreatePlaylistModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Créer une playlist
              </button>
            </div>
          )}
        </>
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
        onDelete={(songId) => {
          setSongs((prev) => prev.filter((s) => s.id !== songId));
          setSelectedSong(null);
          handleRefresh();
        }}
      />

      {/* Add to wishlist modal */}
      <AddToWishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Learn from wishlist modal (AddSongModal with prefill) */}
      {wishlistToLearn && (
        <AddSongModal
          isOpen={!!wishlistToLearn}
          onClose={() => setWishlistToLearn(null)}
          onSuccess={handleLearnSuccess}
          prefillTrack={wishlistToSpotifyResult(wishlistToLearn)}
        />
      )}

      {/* Create playlist modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Edit playlist modal */}
      <EditPlaylistModal
        playlist={editingPlaylist}
        isOpen={!!editingPlaylist}
        onClose={() => {
          setEditingPlaylist(null);
          // Refresh the selected playlist if it was being edited
          if (selectedPlaylist && editingPlaylist?.id === selectedPlaylist.id) {
            setSelectedPlaylist(null);
          }
        }}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
