"use client";

import { useState, useEffect, useCallback } from "react";
import { updatePlaylist, deletePlaylist, removeSongFromPlaylist } from "@/lib/actions/playlists";
import type { PlaylistWithSongs } from "@/types";

interface EditPlaylistModalProps {
  playlist: PlaylistWithSongs | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPlaylistModal({ playlist, isOpen, onClose, onSuccess }: EditPlaylistModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingSongId, setRemovingSongId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || "");
      setError(null);
    }
  }, [playlist]);

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

  const handleSave = async () => {
    if (!playlist || !name.trim()) return;

    setSaving(true);
    setError(null);

    const result = await updatePlaylist(playlist.id, {
      name: name.trim(),
      description: description.trim() || undefined,
    });

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Erreur lors de la mise à jour");
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!playlist) return;
    if (!confirm("Supprimer cette playlist ? Les morceaux ne seront pas supprimés de ta bibliothèque.")) return;

    setDeleting(true);
    const result = await deletePlaylist(playlist.id);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Erreur lors de la suppression");
      setDeleting(false);
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!playlist) return;
    setRemovingSongId(songId);

    const result = await removeSongFromPlaylist(playlist.id, songId);
    if (result.success) {
      onSuccess();
    }
    setRemovingSongId(null);
  };

  if (!isOpen || !playlist) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="text-lg font-semibold">Modifier la playlist</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 transition-colors hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Description <span className="text-muted-foreground">(optionnel)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décris ta playlist..."
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Songs list */}
          {playlist.songs.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Morceaux ({playlist.songs.length})
              </label>
              <div className="space-y-2 rounded-lg border border-border">
                {playlist.songs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 border-b border-border p-3 last:border-b-0"
                  >
                    {/* Song cover */}
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                    )}

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{song.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveSong(song.id)}
                      disabled={removingSongId === song.id}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 border-t border-border pt-4">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </button>
            <div className="flex-1" />
            <button
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
