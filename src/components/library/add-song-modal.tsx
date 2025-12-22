"use client";

import { useState, useEffect, useCallback } from "react";
import { createSong } from "@/lib/actions/songs";
import type { CreateSongInput, SongDifficulty } from "@/types";

interface SpotifyResult {
  title: string;
  artist: string;
  album: string;
  cover_url: string;
  spotify_id: string;
  preview_url: string | null;
}

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddSongModal({ isOpen, onClose, onSuccess }: AddSongModalProps) {
  const [step, setStep] = useState<"search" | "details">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulaire détails
  const [difficulty, setDifficulty] = useState<SongDifficulty | "">("");
  const [tuning, setTuning] = useState("Standard");
  const [capo, setCapo] = useState(0);
  const [tabsUrl, setTabsUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch {
        console.error("Search error");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectTrack = (track: SpotifyResult) => {
    setSelectedTrack(track);
    setStep("details");
  };

  const handleSave = async () => {
    if (!selectedTrack) return;

    setSaving(true);
    setError(null);

    const input: CreateSongInput = {
      title: selectedTrack.title,
      artist: selectedTrack.artist,
      album: selectedTrack.album,
      cover_url: selectedTrack.cover_url,
      spotify_id: selectedTrack.spotify_id,
      preview_url: selectedTrack.preview_url || undefined,
      difficulty: difficulty || undefined,
      tuning,
      capo_position: capo,
      tabs_url: tabsUrl || undefined,
      notes: notes || undefined,
    };

    const result = await createSong(input);

    if (result.success) {
      onSuccess();
      handleClose();
    } else {
      setError(result.error || "Erreur lors de l'ajout");
    }

    setSaving(false);
  };

  const handleClose = useCallback(() => {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelectedTrack(null);
    setDifficulty("");
    setTuning("Standard");
    setCapo(0);
    setTabsUrl("");
    setNotes("");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {step === "search" ? "Ajouter un morceau" : "Détails du morceau"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "search" ? (
          <>
            {/* Search input */}
            <div className="relative mb-4">
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un morceau..."
                className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>

            {/* Results */}
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {results.map((track) => (
                <button
                  key={track.spotify_id}
                  onClick={() => handleSelectTrack(track)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                >
                  {track.cover_url ? (
                    <img
                      src={track.cover_url}
                      alt={track.album}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                      <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 truncate">
                    <div className="truncate font-medium">{track.title}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {track.artist}
                    </div>
                  </div>
                </button>
              ))}

              {query && !loading && results.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Aucun résultat pour &quot;{query}&quot;
                </div>
              )}

              {!query && (
                <div className="py-8 text-center text-muted-foreground">
                  Recherche un morceau sur Spotify
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Selected track preview */}
            {selectedTrack && (
              <div className="mb-6 flex items-center gap-4 rounded-lg bg-accent/50 p-3">
                {selectedTrack.cover_url && (
                  <img
                    src={selectedTrack.cover_url}
                    alt={selectedTrack.album}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 truncate">
                  <div className="truncate font-semibold">{selectedTrack.title}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {selectedTrack.artist}
                  </div>
                </div>
                <button
                  onClick={() => setStep("search")}
                  className="text-sm text-primary hover:underline"
                >
                  Changer
                </button>
              </div>
            )}

            {/* Details form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Difficulté</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as SongDifficulty)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Non définie</option>
                    <option value="beginner">Débutant</option>
                    <option value="intermediate">Intermédiaire</option>
                    <option value="advanced">Avancé</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Tuning</label>
                  <select
                    value={tuning}
                    onChange={(e) => setTuning(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="Standard">Standard (EADGBE)</option>
                    <option value="Drop D">Drop D</option>
                    <option value="Half Step Down">Half Step Down</option>
                    <option value="Open G">Open G</option>
                    <option value="Open D">Open D</option>
                    <option value="DADGAD">DADGAD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Capo</label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={capo}
                  onChange={(e) => setCapo(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Lien tablature</label>
                <input
                  type="url"
                  value={tabsUrl}
                  onChange={(e) => setTabsUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarques, astuces..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("search")}
                  className="flex-1 rounded-lg border border-border py-2.5 font-medium transition-colors hover:bg-accent"
                >
                  Retour
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-primary py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
