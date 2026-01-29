"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPlaylists,
  getPlaylistsForSong,
  addSongToPlaylist,
  removeSongFromPlaylist,
  createPlaylist,
} from "@/lib/actions/playlists";
import type { Playlist, PlaylistWithSongs } from "@/types";

interface AddToPlaylistModalProps {
  songId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddToPlaylistModal({ songId, isOpen, onClose, onSuccess }: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<PlaylistWithSongs[]>([]);
  const [songPlaylistIds, setSongPlaylistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inline create state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    if (!songId) return;
    setLoading(true);
    try {
      const [allPlaylists, songPlaylists] = await Promise.all([
        getPlaylists(),
        getPlaylistsForSong(songId),
      ]);
      setPlaylists(allPlaylists);
      setSongPlaylistIds(new Set(songPlaylists.map((p) => p.id)));
    } catch {
      setError("Erreur lors du chargement");
    }
    setLoading(false);
  }, [songId]);

  useEffect(() => {
    if (isOpen && songId) {
      loadData();
      setShowCreate(false);
      setNewName("");
      setError(null);
    }
  }, [isOpen, songId, loadData]);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleClose]);

  const handleToggle = async (playlistId: string) => {
    if (!songId) return;
    setTogglingId(playlistId);
    setError(null);

    const isInPlaylist = songPlaylistIds.has(playlistId);

    const result = isInPlaylist
      ? await removeSongFromPlaylist(playlistId, songId)
      : await addSongToPlaylist(playlistId, songId);

    if (result.success) {
      setSongPlaylistIds((prev) => {
        const next = new Set(prev);
        if (isInPlaylist) {
          next.delete(playlistId);
        } else {
          next.add(playlistId);
        }
        return next;
      });
      onSuccess();
    } else {
      setError(result.error || "Erreur");
    }

    setTogglingId(null);
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !songId) return;

    setCreating(true);
    setError(null);

    const result = await createPlaylist({ name: newName.trim() });

    if (result.success && result.playlist) {
      // Add song to the new playlist
      await addSongToPlaylist(result.playlist.id, songId);
      setNewName("");
      setShowCreate(false);
      await loadData();
      onSuccess();
    } else {
      setError(result.error || "Erreur lors de la création");
    }

    setCreating(false);
  };

  if (!isOpen || !songId) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-10 max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-semibold">Ajouter à une playlist</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <>
              {/* Playlist list */}
              {playlists.length > 0 ? (
                <div className="space-y-1">
                  {playlists.map((playlist) => {
                    const isInPlaylist = songPlaylistIds.has(playlist.id);
                    const isToggling = togglingId === playlist.id;
                    return (
                      <button
                        key={playlist.id}
                        onClick={() => handleToggle(playlist.id)}
                        disabled={isToggling}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        {/* Checkbox */}
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          isInPlaylist
                            ? "border-primary bg-primary"
                            : "border-input"
                        }`}>
                          {isInPlaylist && (
                            <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Playlist info */}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{playlist.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {playlist.song_count} morceau{playlist.song_count > 1 ? "x" : ""}
                          </p>
                        </div>

                        {isToggling && (
                          <svg className="h-4 w-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                !showCreate && (
                  <div className="py-6 text-center">
                    <p className="text-sm text-muted-foreground">Aucune playlist</p>
                  </div>
                )
              )}

              {/* Create new playlist inline */}
              {showCreate ? (
                <form onSubmit={handleCreatePlaylist} className="mt-3 space-y-2 rounded-lg border border-border p-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom de la playlist..."
                    autoFocus
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowCreate(false); setNewName(""); }}
                      className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !newName.trim()}
                      className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                    >
                      {creating ? "..." : "Créer et ajouter"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nouvelle playlist
                </button>
              )}

              {error && (
                <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
