"use client";

import { useState, useEffect, useCallback } from "react";
import { updateCover, deleteCover } from "@/lib/actions/covers";
import type { CoverWithSong, CoverVisibility } from "@/types";

interface CoverDetailModalProps {
  cover: CoverWithSong | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const visibilityOptions: { value: CoverVisibility; label: string }[] = [
  { value: "private", label: "Privé" },
  { value: "friends", label: "Amis" },
  { value: "public", label: "Public" },
];

export function CoverDetailModal({ cover, isOpen, onClose, onUpdate }: CoverDetailModalProps) {
  const [visibility, setVisibility] = useState<CoverVisibility>("friends");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (cover) {
      setVisibility(cover.visibility);
      setDescription(cover.description || "");
      setHasChanges(false);
    }
  }, [cover]);

  useEffect(() => {
    if (cover) {
      const changed = visibility !== cover.visibility || description !== (cover.description || "");
      setHasChanges(changed);
    }
  }, [visibility, description, cover]);

  const handleSave = async () => {
    if (!cover) return;

    setSaving(true);
    setError(null);

    const result = await updateCover(cover.id, {
      visibility,
      description: description || undefined,
    });

    if (result.success) {
      onUpdate();
      onClose();
    } else {
      setError(result.error || "Erreur lors de la sauvegarde");
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!cover) return;

    setDeleting(true);
    const result = await deleteCover(cover.id);

    if (result.success) {
      onUpdate();
      onClose();
    } else {
      setError(result.error || "Erreur lors de la suppression");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = useCallback(() => {
    setError(null);
    setShowDeleteConfirm(false);
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

  if (!isOpen || !cover) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
        {/* Lecteur vidéo/audio */}
        <div className="relative aspect-video bg-black">
          {cover.media_type === "video" ? (
            <video
              src={cover.media_url}
              controls
              autoPlay
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-muted p-8">
              <svg className="h-16 w-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <audio src={cover.media_url} controls autoPlay className="w-full max-w-md" />
            </div>
          )}

          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-lg bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Infos et formulaire */}
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold">{cover.song.title}</h2>
            <p className="text-muted-foreground">{cover.song.artist}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajouté le {formatDate(cover.created_at)}
            </p>
          </div>

          {/* Sélecteur de visibilité */}
          <div>
            <label className="mb-2 block text-sm font-medium">Visibilité</label>
            <div className="flex gap-2">
              {visibilityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setVisibility(option.value)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    visibility === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-accent"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajoute une description..."
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Confirmation de suppression */}
          {showDeleteConfirm && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">Supprimer ce cover ?</p>
              <p className="mt-1 text-sm text-muted-foreground">Cette action est irréversible.</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-colors hover:opacity-90 disabled:opacity-50"
                >
                  {deleting ? "Suppression..." : "Confirmer"}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 border-t border-border pt-4">
            {!showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                Supprimer
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Fermer
            </button>
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
