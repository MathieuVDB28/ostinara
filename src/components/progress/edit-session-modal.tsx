"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updatePracticeSession, deletePracticeSession } from "@/lib/actions/practice";
import { MoodSelector, getMoodEmoji } from "./mood-selector";
import { SectionsSelector, getSectionsLabels } from "./sections-selector";
import { EnergySelector, getEnergyLabel } from "./energy-selector";
import type { PracticeSessionWithSong, Song, SessionMood, EnergyLevel, SongSection } from "@/types";

interface EditSessionModalProps {
  session: PracticeSessionWithSong | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  songs: Song[];
}

export function EditSessionModal({
  session,
  isOpen,
  onClose,
  onSuccess,
  songs,
}: EditSessionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Champs du formulaire
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [practicedAt, setPracticedAt] = useState("");
  const [bpmAchieved, setBpmAchieved] = useState<string>("");
  const [mood, setMood] = useState<SessionMood | null>(null);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [sectionsWorked, setSectionsWorked] = useState<SongSection[]>([]);
  const [sessionGoals, setSessionGoals] = useState("");
  const [goalsAchieved, setGoalsAchieved] = useState(false);
  const [notes, setNotes] = useState("");

  // Recherche de morceau
  const [showSongSearch, setShowSongSearch] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState("");

  // Confirmation de suppression
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Charger les données de la session
  useEffect(() => {
    if (session && isOpen) {
      setSelectedSong(session.song);
      setDurationMinutes(session.duration_minutes);
      setPracticedAt(
        new Date(session.practiced_at).toISOString().slice(0, 16)
      );
      setBpmAchieved(session.bpm_achieved?.toString() || "");
      setMood(session.mood);
      setEnergyLevel(session.energy_level);
      setSectionsWorked(session.sections_worked || []);
      setSessionGoals(session.session_goals || "");
      setGoalsAchieved(session.goals_achieved);
      setNotes(session.notes || "");
      setError(null);
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [session, isOpen]);

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

  const handleSave = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    const result = await updatePracticeSession(session.id, {
      song_id: selectedSong?.id || null,
      duration_minutes: durationMinutes,
      practiced_at: new Date(practicedAt).toISOString(),
      bpm_achieved: bpmAchieved ? parseInt(bpmAchieved) : null,
      mood: mood,
      energy_level: energyLevel,
      sections_worked: sectionsWorked,
      session_goals: sessionGoals || null,
      goals_achieved: goalsAchieved,
      notes: notes || null,
    });

    setLoading(false);

    if (result.success) {
      router.refresh();
      onSuccess();
      handleClose();
    } else {
      setError(result.error || "Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async () => {
    if (!session) return;

    setDeleting(true);
    setError(null);

    const result = await deletePracticeSession(session.id);

    setDeleting(false);

    if (result.success) {
      router.refresh();
      onSuccess();
      handleClose();
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(songSearchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(songSearchQuery.toLowerCase())
  );

  if (!isOpen || !session) return null;

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
            {isEditing ? "Modifier la session" : "Détail de la session"}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                title="Modifier"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            )}
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isEditing ? (
          /* Mode édition */
          <div className="space-y-6">
            {/* Morceau */}
            <div>
              <label className="mb-2 block text-sm font-medium">Morceau</label>
              {selectedSong ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted p-3">
                  {selectedSong.cover_url ? (
                    <img src={selectedSong.cover_url} alt={selectedSong.title} className="h-12 w-12 rounded-lg object-cover" />
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
                  <button type="button" onClick={() => setShowSongSearch(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowSongSearch(true)} className="w-full rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground hover:border-primary hover:bg-primary/5">
                  Choisir un morceau (optionnel)
                </button>
              )}
            </div>

            {/* Durée et Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Durée (minutes)</label>
                <input type="number" min="1" max="480" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Date et heure</label>
                <input type="datetime-local" value={practicedAt} onChange={(e) => setPracticedAt(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>

            {/* Humeur */}
            <div>
              <label className="mb-3 block text-sm font-medium">Comment te sentais-tu ?</label>
              <MoodSelector value={mood} onChange={setMood} />
            </div>

            {/* Énergie */}
            <div>
              <label className="mb-3 block text-sm font-medium">Niveau d'énergie</label>
              <EnergySelector value={energyLevel} onChange={setEnergyLevel} />
            </div>

            {/* BPM */}
            <div>
              <label className="mb-2 block text-sm font-medium">BPM atteint</label>
              <input type="number" min="20" max="300" placeholder="ex: 120" value={bpmAchieved} onChange={(e) => setBpmAchieved(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>

            {/* Sections */}
            <div>
              <label className="mb-3 block text-sm font-medium">Sections travaillées</label>
              <SectionsSelector value={sectionsWorked} onChange={setSectionsWorked} />
            </div>

            {/* Objectifs */}
            <div>
              <label className="mb-2 block text-sm font-medium">Objectifs</label>
              <textarea placeholder="Qu'est-ce que tu voulais travailler ?" value={sessionGoals} onChange={(e) => setSessionGoals(e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              {sessionGoals && (
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={goalsAchieved} onChange={(e) => setGoalsAchieved(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
                  <span className="text-sm">Objectifs atteints</span>
                </label>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium">Notes</label>
              <textarea placeholder="Remarques, difficultés, ce qui a bien marché..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(true)} className="rounded-lg border border-destructive px-4 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground">
                Supprimer
              </button>
              <div className="flex-1" />
              <button onClick={() => setIsEditing(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent">
                Annuler
              </button>
              <button onClick={handleSave} disabled={loading} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50">
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        ) : (
          /* Mode visualisation */
          <div className="space-y-6">
            {/* Morceau */}
            <div className="flex items-center gap-4">
              {session.song?.cover_url ? (
                <img src={session.song.cover_url} alt={session.song.title} className="h-20 w-20 rounded-xl object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted">
                  <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">{session.song?.title || "Session libre"}</h3>
                {session.song?.artist && <p className="text-muted-foreground">{session.song.artist}</p>}
              </div>
            </div>

            {/* Infos principales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Durée</p>
                <p className="font-semibold">{formatDuration(session.duration_minutes)}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-semibold text-sm">{formatDate(session.practiced_at)}</p>
              </div>
            </div>

            {/* Mood et Énergie */}
            {(session.mood || session.energy_level) && (
              <div className="flex gap-4">
                {session.mood && (
                  <div className="flex-1 rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Humeur</p>
                    <span className="text-2xl">{getMoodEmoji(session.mood)}</span>
                  </div>
                )}
                {session.energy_level && (
                  <div className="flex-1 rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Énergie</p>
                    <p className="font-medium">{getEnergyLabel(session.energy_level)}</p>
                  </div>
                )}
              </div>
            )}

            {/* BPM */}
            {session.bpm_achieved && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">BPM atteint</p>
                <p className="text-xl font-bold text-primary">{session.bpm_achieved} BPM</p>
              </div>
            )}

            {/* Sections */}
            {session.sections_worked.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Sections travaillées</p>
                <p className="font-medium">{getSectionsLabels(session.sections_worked)}</p>
              </div>
            )}

            {/* Objectifs */}
            {session.session_goals && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Objectifs</p>
                  {session.goals_achieved && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Atteints
                    </span>
                  )}
                </div>
                <p className="text-sm">{session.session_goals}</p>
              </div>
            )}

            {/* Notes */}
            {session.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Modal de recherche de morceau */}
        {showSongSearch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowSongSearch(false)} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Choisir un morceau</h3>
                <button onClick={() => setShowSongSearch(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" placeholder="Rechercher..." value={songSearchQuery} onChange={(e) => setSongSearchQuery(e.target.value)} className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none" />
              </div>

              <button onClick={() => { setSelectedSong(null); setShowSongSearch(false); }} className="mb-2 w-full rounded-lg border border-dashed border-border p-3 text-left text-sm text-muted-foreground hover:border-primary hover:bg-primary/5">
                Session libre (sans morceau)
              </button>

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {filteredSongs.map((song) => (
                  <button key={song.id} onClick={() => { setSelectedSong(song); setShowSongSearch(false); }} className={`w-full flex items-center gap-3 rounded-lg p-2 text-left transition-all ${selectedSong?.id === song.id ? "bg-primary/10 border border-primary" : "hover:bg-accent"}`}>
                    {song.cover_url ? <img src={song.cover_url} alt={song.title} className="h-10 w-10 rounded-md object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted"><svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg></div>}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{song.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                    </div>
                  </button>
                ))}
                {filteredSongs.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucun morceau trouvé</p>}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
              <h3 className="text-lg font-bold mb-2">Supprimer la session ?</h3>
              <p className="text-sm text-muted-foreground mb-6">Cette action est irréversible.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Annuler</button>
                <button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50">
                  {deleting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
