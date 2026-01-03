"use client";

import { useState, useEffect } from "react";
import { updateSetlistItem } from "@/lib/actions/setlists";
import type { SetlistItemWithSongOwner } from "@/types";

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: SetlistItemWithSongOwner | null;
}

export function EditItemModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: EditItemModalProps) {
  const [notes, setNotes] = useState("");
  const [transitionSeconds, setTransitionSeconds] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [sectionName, setSectionName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setNotes(item.notes || "");
      setTransitionSeconds(item.transition_seconds || 0);
      setDurationMinutes(
        item.duration_seconds ? Math.round(item.duration_seconds / 60) : 0
      );
      setSectionName(item.section_name || "");
      setError(null);
    }
  }, [item]);

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

  if (!isOpen || !item) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const result = await updateSetlistItem(item.id, {
      notes: notes.trim() || undefined,
      transition_seconds: transitionSeconds,
      duration_seconds:
        durationMinutes > 0 ? durationMinutes * 60 : undefined,
      section_name:
        item.item_type === "section" ? sectionName.trim() : undefined,
    });

    setSaving(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Erreur lors de la sauvegarde");
    }
  };

  const isSong = item.item_type === "song";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {isSong ? "Modifier le morceau" : "Modifier la section"}
            </h2>
            {isSong && (
              <p className="mt-1 text-sm text-muted-foreground">
                {item.song_title} - {item.song_artist}
              </p>
            )}
          </div>
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

        {/* Form */}
        <div className="space-y-4">
          {/* Section name (only for sections) */}
          {!isSong && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Nom de la section
              </label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="Ex: Pause, Rappel..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes pour ce morceau..."
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Duration and Transition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Duree (minutes)
              </label>
              <input
                type="number"
                value={durationMinutes || ""}
                onChange={(e) =>
                  setDurationMinutes(parseInt(e.target.value) || 0)
                }
                placeholder="0"
                min="0"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Transition (sec)
              </label>
              <input
                type="number"
                value={transitionSeconds || ""}
                onChange={(e) =>
                  setTransitionSeconds(parseInt(e.target.value) || 0)
                }
                placeholder="0"
                min="0"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Temps avant le morceau suivant
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
