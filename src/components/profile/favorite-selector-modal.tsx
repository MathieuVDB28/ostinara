"use client";

import { useState, useEffect } from "react";
import type { Song } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface FavoriteSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong?: (song: Song) => void;
  onSelectAlbum?: (album: { album_name: string; artist_name: string; cover_url?: string; spotify_id?: string }) => void;
  type: "song" | "album";
}

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
}

interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover_url?: string;
  spotify_id: string;
  preview_url?: string | null;
}

export function FavoriteSelectorModal({
  isOpen,
  onClose,
  onSelectSong,
  onSelectAlbum,
  type,
}: FavoriteSelectorModalProps) {
  // Pour les albums, commencer directement sur l'onglet Spotify
  const [activeTab, setActiveTab] = useState<"library" | "spotify">(type === "album" ? "spotify" : "library");
  const [searchQuery, setSearchQuery] = useState("");
  const [librarySongs, setLibrarySongs] = useState<Song[]>([]);
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([]);
  const [spotifyAlbums, setSpotifyAlbums] = useState<SpotifyAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Charger les morceaux de la bibliothèque
  useEffect(() => {
    if (isOpen && activeTab === "library" && type === "song") {
      const supabase = createClient();
      supabase
        .from("songs")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setLibrarySongs(data);
        });
    }
  }, [isOpen, activeTab, type]);

  // Recherche Spotify avec debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.length > 2 && activeTab === "spotify") {
      const timeout = setTimeout(() => {
        searchSpotify(searchQuery);
      }, 500);
      setSearchTimeout(timeout);
    } else {
      setSpotifyTracks([]);
      setSpotifyAlbums([]);
    }

    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchQuery, activeTab]);

  const searchSpotify = async (query: string) => {
    setLoading(true);
    try {
      const searchType = type === "song" ? "track" : "album";
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&type=${searchType}`);
      const data = await response.json();

      if (type === "album") {
        setSpotifyAlbums(data);
      } else if (type === "song") {
        setSpotifyTracks(data);
      }
    } catch (error) {
      console.error("Spotify search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSong = (song: Song | SpotifyTrack) => {
    if (onSelectSong) {
      // Convertir SpotifyTrack en Song si nécessaire
      const songData: Song = "user_id" in song ? song : {
        id: song.id,
        user_id: "",
        title: song.title,
        artist: song.artist,
        album: song.album,
        cover_url: song.cover_url,
        spotify_id: song.spotify_id,
        preview_url: song.preview_url || undefined,
        status: "want_to_learn",
        progress_percent: 0,
        tuning: "Standard",
        capo_position: 0,
        created_at: "",
        updated_at: "",
      };
      onSelectSong(songData);
      onClose();
    }
  };

  const handleSelectAlbum = (album: SpotifyAlbum) => {
    if (onSelectAlbum) {
      onSelectAlbum({
        album_name: album.name,
        artist_name: album.artists.map(a => a.name).join(", "),
        cover_url: album.images[0]?.url,
        spotify_id: album.id,
      });
      onClose();
    }
  };

  const filteredLibrarySongs = librarySongs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border p-6">
          <h2 className="text-xl font-bold">
            {type === "song" ? "Sélectionner un morceau" : "Sélectionner un album"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6">
          <div className="flex gap-4">
            {type === "song" && (
              <button
                onClick={() => setActiveTab("library")}
                className={`relative pb-3 text-sm font-medium transition-colors ${
                  activeTab === "library"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ma bibliothèque
                {activeTab === "library" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab("spotify")}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === "spotify"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rechercher sur Spotify
              {activeTab === "spotify" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 p-6 pb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "library"
                  ? "Rechercher dans ta bibliothèque..."
                  : type === "song"
                  ? "Rechercher un morceau sur Spotify..."
                  : "Rechercher un album sur Spotify..."
              }
              className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : activeTab === "library" && type === "song" ? (
            // Library songs
            filteredLibrarySongs.length > 0 ? (
              <div className="space-y-2">
                {filteredLibrarySongs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleSelectSong(song)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-all hover:bg-accent"
                  >
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                        <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{song.title}</div>
                      <div className="truncate text-sm text-muted-foreground">{song.artist}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                {searchQuery ? "Aucun morceau trouvé" : "Ta bibliothèque est vide"}
              </div>
            )
          ) : activeTab === "spotify" && type === "song" ? (
            // Spotify tracks
            spotifyTracks.length > 0 ? (
              <div className="space-y-2">
                {spotifyTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleSelectSong(track)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-all hover:bg-accent"
                  >
                    {track.cover_url ? (
                      <img
                        src={track.cover_url}
                        alt={track.title}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                        <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{track.title}</div>
                      <div className="truncate text-sm text-muted-foreground">{track.artist}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.length > 2 ? (
              <div className="py-12 text-center text-muted-foreground">
                Aucun morceau trouvé
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Commence à taper pour rechercher sur Spotify
              </div>
            )
          ) : activeTab === "spotify" && type === "album" ? (
            // Spotify albums
            spotifyAlbums.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {spotifyAlbums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => handleSelectAlbum(album)}
                    className="overflow-hidden rounded-lg border border-border text-left transition-all hover:shadow-lg"
                  >
                    <div className="relative aspect-square bg-muted">
                      {album.images[0]?.url ? (
                        <img
                          src={album.images[0].url}
                          alt={album.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg className="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="truncate font-medium">{album.name}</div>
                      <div className="truncate text-sm text-muted-foreground">
                        {album.artists.map((a) => a.name).join(", ")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.length > 2 ? (
              <div className="py-12 text-center text-muted-foreground">
                Aucun album trouvé
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Commence à taper pour rechercher sur Spotify
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
