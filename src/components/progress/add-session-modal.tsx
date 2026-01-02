"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPracticeSession } from "@/lib/actions/practice";
import { MoodSelector } from "./mood-selector";
import { SectionsSelector } from "./sections-selector";
import { EnergySelector } from "./energy-selector";
import type { Song, SessionMood, EnergyLevel, SongSection } from "@/types";

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  songs: Song[];
  // Props pour le mode timer
  timerDuration?: number;
  timerSong?: Song | null;
  mode: "timer" | "manual";
}

export function AddSessionModal({
  isOpen,
  onClose,
  onSuccess,
  songs,
  timerDuration,
  timerSong,
  mode,
}: AddSessionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Champs du formulaire
  const [selectedSong, setSelectedSong] = useState<Song | null>(timerSong || null);
  const [durationMinutes, setDurationMinutes] = useState(timerDuration || 30);
  const [practicedAt, setPracticedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [bpmAchieved, setBpmAchieved] = useState<string>("");
  const [mood, setMood] = useState<SessionMood | null>(null);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [sectionsWorked, setSectionsWorked] = useState<SongSection[]>([]);
  const [sessionGoals, setSessionGoals] = useState("");
  const [goalsAchieved, setGoalsAchieved] = useState(false);
  const [notes, setNotes] = useState("");

  // Sections collapsibles
  const [showPerformance, setShowPerformance] = useState(false);
  const [showFeeling, setShowFeeling] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  // Recherche de morceau
  const [showSongSearch, setShowSongSearch] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState("");

  // Reset au changement de mode ou props
  useEffect(() => {
    if (isOpen) {
      setSelectedSong(timerSong || null);
      setDurationMinutes(timerDuration || 30);
      setPracticedAt(new Date().toISOString().slice(0, 16));
      setBpmAchieved("");
      setMood(null);
      setEnergyLevel(null);
      setSectionsWorked([]);
      setSessionGoals("");
      setGoalsAchieved(false);
      setNotes("");
      setError(null);
      setShowPerformance(false);
      setShowFeeling(false);
      setShowGoals(false);
    }
  }, [isOpen, timerDuration, timerSong]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Écoute Escape
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

  const handleSubmit = async () => {
    if (durationMinutes < 1) {
      setError("La durée doit être d'au moins 1 minute");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createPracticeSession({
      song_id: selectedSong?.id,
      duration_minutes: durationMinutes,
      practiced_at: new Date(practicedAt).toISOString(),
      bpm_achieved: bpmAchieved ? parseInt(bpmAchieved) : undefined,
      mood: mood || undefined,
      energy_level: energyLevel || undefined,
      sections_worked: sectionsWorked.length > 0 ? sectionsWorked : undefined,
      session_goals: sessionGoals || undefined,
      goals_achieved: goalsAchieved,
      notes: notes || undefined,
    });

    setLoading(false);

    if (result.success) {
      router.refresh();
      onSuccess();
      handleClose();
    } else {
      setError(result.error || "Erreur lors de l'enregistrement");
    }
  };

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(songSearchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(songSearchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {mode === "timer" ? "Enregistrer la session" : "Ajouter une session"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Morceau */}
          <div>
            <label className="mb-2 block text-sm font-medium">Morceau</label>
            {selectedSong ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted p-3">
                {selectedSong.cover_url ? (
                  <img
                    src={selectedSong.cover_url}
                    alt={selectedSong.title}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedSong.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{selectedSong.artist}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSongSearch(true)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSongSearch(true)}
                className="w-full rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground hover:border-primary hover:bg-primary/5"
              >
                Choisir un morceau (optionnel)
              </button>
            )}
          </div>

          {/* Durée et Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Durée (minutes)</label>
              <input
                type="number"
                min="1"
                max="480"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                disabled={mode === "timer"}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Date et heure</label>
              <input
                type="datetime-local"
                value={practicedAt}
                onChange={(e) => setPracticedAt(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                disabled={mode === "timer"}
              />
            </div>
          </div>

          {/* Humeur */}
          <div>
            <label className="mb-3 block text-sm font-medium">Comment te sentais-tu ?</label>
            <MoodSelector value={mood} onChange={setMood} />
          </div>

          {/* Section Performance (collapsible) */}
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setShowPerformance(!showPerformance)}
              className="flex w-full items-center justify-between p-4"
            >
              <span className="font-medium">Performance</span>
              <svg
                className={`h-5 w-5 transition-transform ${showPerformance ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {showPerformance && (
              <div className="border-t border-border p-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">BPM atteint</label>
                  <input
                    type="number"
                    min="20"
                    max="300"
                    placeholder="ex: 120"
                    value={bpmAchieved}
                    onChange={(e) => setBpmAchieved(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-sm font-medium">Sections travaillées</label>
                  <SectionsSelector value={sectionsWorked} onChange={setSectionsWorked} />
                </div>
              </div>
            )}
          </div>

          {/* Section Ressenti (collapsible) */}
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setShowFeeling(!showFeeling)}
              className="flex w-full items-center justify-between p-4"
            >
              <span className="font-medium">Niveau d'énergie</span>
              <svg
                className={`h-5 w-5 transition-transform ${showFeeling ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {showFeeling && (
              <div className="border-t border-border p-4">
                <EnergySelector value={energyLevel} onChange={setEnergyLevel} />
              </div>
            )}
          </div>

          {/* Section Objectifs (collapsible) */}
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setShowGoals(!showGoals)}
              className="flex w-full items-center justify-between p-4"
            >
              <span className="font-medium">Objectifs</span>
              <svg
                className={`h-5 w-5 transition-transform ${showGoals ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {showGoals && (
              <div className="border-t border-border p-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Objectifs de la session</label>
                  <textarea
                    placeholder="Qu'est-ce que tu voulais travailler ?"
                    value={sessionGoals}
                    onChange={(e) => setSessionGoals(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                {sessionGoals && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={goalsAchieved}
                      onChange={(e) => setGoalsAchieved(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Objectifs atteints</span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium">Notes</label>
            <textarea
              placeholder="Remarques, difficultés, ce qui a bien marché..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Bouton de validation */}
          <button
            onClick={handleSubmit}
            disabled={loading || durationMinutes < 1}
            className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Enregistrement...
              </span>
            ) : (
              "Enregistrer la session"
            )}
          </button>
        </div>

        {/* Modal de recherche de morceau */}
        {showSongSearch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowSongSearch(false)}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Choisir un morceau</h3>
                <button
                  onClick={() => setShowSongSearch(false)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={songSearchQuery}
                  onChange={(e) => setSongSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <button
                onClick={() => {
                  setSelectedSong(null);
                  setShowSongSearch(false);
                }}
                className="mb-2 w-full rounded-lg border border-dashed border-border p-3 text-left text-sm text-muted-foreground hover:border-primary hover:bg-primary/5"
              >
                Session libre (sans morceau)
              </button>

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {filteredSongs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => {
                      setSelectedSong(song);
                      setShowSongSearch(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 rounded-lg p-2 text-left transition-all
                      ${selectedSong?.id === song.id
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-accent"
                      }
                    `}
                  >
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{song.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                    </div>
                  </button>
                ))}

                {filteredSongs.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Aucun morceau trouvé
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
