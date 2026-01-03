"use client";

import { useState, useEffect } from "react";
import { createSetlist } from "@/lib/actions/setlists";
import type { BandWithMembers } from "@/types";

interface CreateSetlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bands: BandWithMembers[];
}

export function CreateSetlistModal({
  isOpen,
  onClose,
  onSuccess,
  bands,
}: CreateSetlistModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [concertDate, setConcertDate] = useState("");
  const [venue, setVenue] = useState("");
  const [bandId, setBandId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setConcertDate("");
      setVenue("");
      setBandId("");
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await createSetlist({
      name: name.trim(),
      description: description.trim() || undefined,
      concert_date: concertDate || undefined,
      venue: venue.trim() || undefined,
      band_id: bandId || undefined,
    });

    setSaving(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Une erreur est survenue");
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
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Nouvelle setlist</h2>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nom de la setlist *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Concert du 15 janvier"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes sur cette setlist..."
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Grid for date and venue */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Concert date */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Date du concert
              </label>
              <input
                type="date"
                value={concertDate}
                onChange={(e) => setConcertDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            {/* Venue */}
            <div>
              <label className="mb-1 block text-sm font-medium">Lieu</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Ex: Le Bataclan"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Band selection (if user has bands) */}
          {bands.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Groupe (optionnel)
              </label>
              <select
                value={bandId}
                onChange={(e) => setBandId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Setlist personnelle</option>
                {bands.map((band) => (
                  <option key={band.id} value={band.id}>
                    {band.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {bandId
                  ? "Cette setlist sera partagee avec tous les membres du groupe"
                  : "Cette setlist ne sera visible que par toi"}
              </p>
            </div>
          )}

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
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Creation..." : "Creer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
