"use client";

import { useState, useEffect } from "react";
import { getSongs } from "@/lib/actions/songs";
import { addSetlistItem } from "@/lib/actions/setlists";
import { SECTION_PRESETS, type Song, type Profile } from "@/types";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  setlistId: string;
  position: number;
  songSources: { member: Profile | null; songs: Song[] }[];
}

type Tab = "song" | "section";

export function AddItemModal({
  isOpen,
  onClose,
  onSuccess,
  setlistId,
  position,
  songSources,
}: AddItemModalProps) {
  const [tab, setTab] = useState<Tab>("song");
  const [query, setQuery] = useState("");
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<
    { title: string; artist: string; cover_url?: string }[]
  >([]);
  const [searchingSpotify, setSearchingSpotify] = useState(false);
  const [customSection, setCustomSection] = useState("");
  const [sectionDuration, setSectionDuration] = useState(0);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab("song");
      setQuery("");
      setSpotifyQuery("");
      setSpotifyResults([]);
      setCustomSection("");
      setSectionDuration(0);
      setError(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Search Spotify
  useEffect(() => {
    if (spotifyQuery.length < 2) {
      setSpotifyResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingSpotify(true);
      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(spotifyQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          // L'API retourne déjà un array formaté avec title, artist, cover_url
          setSpotifyResults(
            data.map(
              (t: {
                title: string;
                artist: string;
                cover_url?: string;
              }) => ({
                title: t.title,
                artist: t.artist,
                cover_url: t.cover_url,
              })
            ) || []
          );
        }
      } catch {
        console.error("Spotify search error");
      }
      setSearchingSpotify(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [spotifyQuery]);

  if (!isOpen) return null;

  // Filter songs from library
  const allSongs = songSources.flatMap((source) =>
    source.songs.map((song) => ({
      ...song,
      owner: source.member,
    }))
  );

  const filteredSongs = query
    ? allSongs.filter(
        (song) =>
          song.title.toLowerCase().includes(query.toLowerCase()) ||
          song.artist.toLowerCase().includes(query.toLowerCase())
      )
    : allSongs;

  const handleAddSong = async (
    song: Song & { owner: Profile | null }
  ) => {
    setAdding(true);
    setError(null);

    const result = await addSetlistItem({
      setlist_id: setlistId,
      position,
      item_type: "song",
      song_id: song.id,
      song_title: song.title,
      song_artist: song.artist,
      song_cover_url: song.cover_url,
      song_owner_id: song.owner?.id,
    });

    setAdding(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Erreur lors de l'ajout");
    }
  };

  const handleAddSpotifySong = async (song: {
    title: string;
    artist: string;
    cover_url?: string;
  }) => {
    setAdding(true);
    setError(null);

    const result = await addSetlistItem({
      setlist_id: setlistId,
      position,
      item_type: "song",
      song_title: song.title,
      song_artist: song.artist,
      song_cover_url: song.cover_url,
    });

    setAdding(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Erreur lors de l'ajout");
    }
  };

  const handleAddSection = async (name: string) => {
    setAdding(true);
    setError(null);

    const result = await addSetlistItem({
      setlist_id: setlistId,
      position,
      item_type: "section",
      section_name: name,
      duration_seconds: sectionDuration > 0 ? sectionDuration * 60 : undefined,
    });

    setAdding(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Erreur lors de l'ajout");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold">Ajouter un element</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border px-4">
          <button
            onClick={() => setTab("song")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "song"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            Morceau
          </button>
          <button
            onClick={() => setTab("section")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "section"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
            Section
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {tab === "song" ? (
            <div className="space-y-4">
              {/* Library search */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Depuis ta bibliotheque
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un morceau..."
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {filteredSongs.slice(0, 10).map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleAddSong(song)}
                      disabled={adding}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {song.cover_url ? (
                          <img
                            src={song.cover_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {song.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {song.artist}
                          {song.owner && ` • ${song.owner.display_name || song.owner.username}`}
                        </p>
                      </div>
                    </button>
                  ))}
                  {filteredSongs.length === 0 && query && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Aucun morceau trouve
                    </p>
                  )}
                </div>
              </div>

              {/* Spotify search */}
              <div className="border-t border-border pt-4">
                <label className="mb-2 block text-sm font-medium">
                  Ou depuis Spotify
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={spotifyQuery}
                    onChange={(e) => setSpotifyQuery(e.target.value)}
                    placeholder="Rechercher sur Spotify..."
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {searchingSpotify && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Recherche...
                    </p>
                  )}
                  {spotifyResults.map((song, i) => (
                    <button
                      key={i}
                      onClick={() => handleAddSpotifySong(song)}
                      disabled={adding}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {song.cover_url ? (
                          <img
                            src={song.cover_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-green-500">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {song.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {song.artist}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preset sections */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Sections predefinies
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SECTION_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleAddSection(preset.name)}
                      disabled={adding}
                      className={`flex items-center gap-2 rounded-lg p-3 text-left transition-colors ${preset.color} hover:opacity-80 disabled:opacity-50`}
                    >
                      <span className="font-medium">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom section */}
              <div className="border-t border-border pt-4">
                <label className="mb-2 block text-sm font-medium">
                  Ou section personnalisee
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSection}
                    onChange={(e) => setCustomSection(e.target.value)}
                    placeholder="Nom de la section..."
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => handleAddSection(customSection)}
                    disabled={adding || !customSection.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Duree (optionnel)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={sectionDuration || ""}
                    onChange={(e) =>
                      setSectionDuration(parseInt(e.target.value) || 0)
                    }
                    placeholder="0"
                    min="0"
                    className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
