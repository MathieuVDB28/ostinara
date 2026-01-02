"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updateSong, deleteSong } from "@/lib/actions/songs";
import { getCoversBySong, canUploadCover } from "@/lib/actions/covers";
import { AddCoverModal } from "@/components/covers/add-cover-modal";
import { CoverDetailModal } from "@/components/covers/cover-detail-modal";
import { SongSessionsPanel } from "@/components/progress/song-sessions-panel";
import { AddSessionModal } from "@/components/progress/add-session-modal";
import type { Song, SongDifficulty, SongStatus, Cover, CoverWithSong } from "@/types";

interface EditSongModalProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const statusOptions: { value: SongStatus; label: string }[] = [
  { value: "want_to_learn", label: "À apprendre" },
  { value: "learning", label: "En cours" },
  { value: "mastered", label: "Maîtrisé" },
];

const difficultyOptions: { value: SongDifficulty | ""; label: string }[] = [
  { value: "", label: "Non définie" },
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
  { value: "expert", label: "Expert" },
];

const tuningOptions = [
  "Standard",
  "Drop D",
  "Half Step Down",
  "Full Step Down",
  "Open G",
  "Open D",
  "DADGAD",
  "Open C",
];

export function EditSongModal({ song, isOpen, onClose, onUpdate }: EditSongModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "covers" | "sessions">("details");

  // Covers state
  const [covers, setCovers] = useState<Cover[]>([]);
  const [loadingCovers, setLoadingCovers] = useState(false);
  const [showAddCover, setShowAddCover] = useState(false);
  const [selectedCover, setSelectedCover] = useState<CoverWithSong | null>(null);
  const [canUpload, setCanUpload] = useState<{ allowed: boolean; limit?: number; current?: number }>({ allowed: true });

  // Sessions state
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionsPanelKey, setSessionsPanelKey] = useState(0);

  // Form state
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [difficulty, setDifficulty] = useState<SongDifficulty | "">("");
  const [status, setStatus] = useState<SongStatus>("want_to_learn");
  const [progress, setProgress] = useState(0);
  const [tuning, setTuning] = useState("Standard");
  const [capo, setCapo] = useState(0);
  const [tabsUrl, setTabsUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Sync form with song
  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist);
      setDifficulty(song.difficulty || "");
      setStatus(song.status);
      setProgress(song.progress_percent);
      setTuning(song.tuning);
      setCapo(song.capo_position);
      setTabsUrl(song.tabs_url || "");
      setNotes(song.notes || "");
      setActiveTab("details");
    }
  }, [song]);

  // Load covers for the song
  useEffect(() => {
    if (song && isOpen) {
      setLoadingCovers(true);
      Promise.all([getCoversBySong(song.id), canUploadCover()])
        .then(([coversData, uploadStatus]) => {
          setCovers(coversData);
          setCanUpload(uploadStatus);
        })
        .finally(() => setLoadingCovers(false));
    }
  }, [song, isOpen]);

  const loadCovers = async () => {
    if (!song) return;
    setLoadingCovers(true);
    const [coversData, uploadStatus] = await Promise.all([
      getCoversBySong(song.id),
      canUploadCover()
    ]);
    setCovers(coversData);
    setCanUpload(uploadStatus);
    setLoadingCovers(false);
  };

  const handleSave = async () => {
    if (!song) return;

    setSaving(true);
    setError(null);

    const result = await updateSong(song.id, {
      title,
      artist,
      difficulty: difficulty || undefined,
      status,
      progress_percent: progress,
      tuning,
      capo_position: capo,
      tabs_url: tabsUrl || undefined,
      notes: notes || undefined,
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
    if (!song) return;
    if (!confirm("Supprimer ce morceau de ta bibliothèque ?")) return;

    setDeleting(true);
    const result = await deleteSong(song.id);

    if (result.success) {
      onUpdate();
      onClose();
    } else {
      setError(result.error || "Erreur lors de la suppression");
      setDeleting(false);
    }
  };

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

  if (!isOpen || !song) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
        {/* Header with cover */}
        <div className="relative h-32 bg-gradient-to-b from-primary/20 to-transparent">
          {song.cover_url && (
            <img
              src={song.cover_url}
              alt={song.album || song.title}
              className="absolute inset-0 h-full w-full object-cover opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-lg bg-background/50 p-2 backdrop-blur-sm transition-colors hover:bg-background"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Song info header */}
        <div className="-mt-16 flex gap-4 px-6">
          {song.cover_url ? (
            <img
              src={song.cover_url}
              alt={song.album || song.title}
              className="h-24 w-24 rounded-lg object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted shadow-lg">
              <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}
          <div className="flex-1 pt-8">
            <h2 className="text-xl font-bold">{song.title}</h2>
            <p className="text-muted-foreground">{song.artist}</p>
            {song.album && (
              <p className="text-sm text-muted-foreground">{song.album}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-border px-6">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "details"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Détails
          </button>
          <button
            onClick={() => setActiveTab("covers")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "covers"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Covers
            {covers.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {covers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "sessions"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sessions
          </button>
        </div>

        {/* Details Tab */}
        {activeTab === "details" && (
        <div className="space-y-6 p-6">
          {/* Status & Progress */}
          <div className="rounded-xl bg-accent/50 p-4">
            <label className="mb-3 block text-sm font-medium">Statut</label>
            <div className="flex gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setStatus(option.value);
                    if (option.value === "mastered") setProgress(100);
                    else if (option.value === "want_to_learn") setProgress(0);
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    status === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {status === "learning" && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Progression</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(parseInt(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
              </div>
            )}
          </div>

          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Titre</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Artiste</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Guitar settings */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Difficulté</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as SongDifficulty)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {difficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tuning</label>
              <select
                value={tuning}
                onChange={(e) => setTuning(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {tuningOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Capo</label>
              <select
                value={capo}
                onChange={(e) => setCapo(parseInt(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value={0}>Pas de capo</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>
                    Case {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs URL */}
          <div>
            <label className="mb-1 block text-sm font-medium">Lien tablature</label>
            <input
              type="url"
              value={tabsUrl}
              onChange={(e) => setTabsUrl(e.target.value)}
              placeholder="https://ultimate-guitar.com/..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium">Notes personnelles</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Astuces, passages difficiles, remarques..."
              rows={4}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

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
              disabled={saving || !title || !artist}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
        )}

        {/* Covers Tab */}
        {activeTab === "covers" && (
          <div className="p-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {covers.length} cover{covers.length > 1 ? "s" : ""} pour ce morceau
                </p>
              </div>
              <button
                onClick={() => setShowAddCover(true)}
                disabled={!canUpload.allowed}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>
            </div>

            {/* Limite message */}
            {!canUpload.allowed && (
              <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Tu as atteint la limite de {canUpload.limit} covers. Passe en Pro pour en ajouter plus !
              </div>
            )}

            {loadingCovers ? (
              <div className="flex items-center justify-center py-12">
                <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : covers.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {covers.map((cover) => (
                  <button
                    key={cover.id}
                    onClick={() => setSelectedCover({ ...cover, song })}
                    className="group relative overflow-hidden rounded-xl border border-border bg-muted text-left transition-all hover:border-primary/50"
                  >
                    <div className="relative aspect-video">
                      {cover.media_type === "video" ? (
                        <video
                          src={cover.media_url}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground">
                          <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      {/* Visibility badge */}
                      <div className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-1 text-xs backdrop-blur-sm">
                        {cover.visibility === "private" ? "Privé" : cover.visibility === "friends" ? "Amis" : "Public"}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(cover.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                      {cover.description && (
                        <p className="mt-1 truncate text-sm">{cover.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M10 9L15 12L10 15V9Z" fill="currentColor" stroke="none"/>
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">Aucun cover pour ce morceau</p>
                <button
                  onClick={() => setShowAddCover(true)}
                  disabled={!canUpload.allowed}
                  className="mt-3 text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  Ajouter ton premier cover
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="p-6">
            <SongSessionsPanel
              key={sessionsPanelKey}
              songId={song.id}
              onAddSession={() => setShowAddSession(true)}
            />
          </div>
        )}
      </div>

      {/* Add Cover Modal */}
      <AddCoverModal
        song={song}
        isOpen={showAddCover}
        onClose={() => setShowAddCover(false)}
        onSuccess={() => {
          loadCovers();
          onUpdate();
        }}
      />

      {/* Cover Detail Modal */}
      <CoverDetailModal
        cover={selectedCover}
        isOpen={!!selectedCover}
        onClose={() => setSelectedCover(null)}
        onUpdate={() => {
          loadCovers();
          onUpdate();
        }}
      />

      {/* Add Session Modal */}
      <AddSessionModal
        isOpen={showAddSession}
        onClose={() => setShowAddSession(false)}
        onSuccess={() => {
          setSessionsPanelKey(prev => prev + 1);
          router.refresh();
          onUpdate();
        }}
        songs={[song]}
        timerSong={song}
        mode="manual"
      />
    </div>
  );
}
