"use client";

import Image from "next/image";
import dynamic from "next/dynamic";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updateSong, deleteSong } from "@/lib/actions/songs";
import { getCoversBySong, canUploadCover } from "@/lib/actions/covers";
// AddCoverModal entraine video-upload → tus-js-client, et video-upload
// charge lui-meme @ffmpeg a l'execution. Rien de tout cela n'est necessaire
// pour editer le titre d'un morceau.
const AddCoverModal = dynamic(() =>
  import("@/components/covers/add-cover-modal").then((m) => m.AddCoverModal)
);
const CoverDetailModal = dynamic(() =>
  import("@/components/covers/cover-detail-modal").then((m) => m.CoverDetailModal)
);
import { SongSessionsPanel } from "@/components/progress/song-sessions-panel";
const AddSessionModal = dynamic(() =>
  import("@/components/progress/add-session-modal").then((m) => m.AddSessionModal)
);
const AddToPlaylistModal = dynamic(() =>
  import("./add-to-playlist-modal").then((m) => m.AddToPlaylistModal)
);
import { AudioFeaturesBadge } from "./audio-features-badge";
import { TabsSearchPanel } from "./tabs-search-panel";
import { TempoLadder } from "@/components/ui/tempo-ladder";
import { SongBpmCurve } from "@/components/progress/song-bpm-curve";
import { getSongBpmProgress } from "@/lib/actions/practice";
import { saveSongTabStructure } from "@/lib/actions/songs";
import { songTargetBpm, slowPracticeFloor } from "@/lib/song-progress";
import type {
  Song,
  SongBpmPoint,
  SongDifficulty,
  SongStatus,
  SongsterrTabStructure,
  Cover,
  CoverWithSong,
  UserPlan,
} from "@/types";

interface EditSongModalProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: (songId: string) => void;
  userPlan?: UserPlan;
  /** Meilleur tempo tenu en session — l'axe de la progression. */
  bestBpm?: number | null;
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

import { TUNING_GROUPS } from "@/lib/tunings";

export function EditSongModal({
  song,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  userPlan = "free",
  bestBpm = null,
}: EditSongModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "tablatures" | "covers" | "sessions">("details");

  // Covers state
  const [covers, setCovers] = useState<Cover[]>([]);
  const [loadingCovers, setLoadingCovers] = useState(false);
  const [showAddCover, setShowAddCover] = useState(false);
  const [selectedCover, setSelectedCover] = useState<CoverWithSong | null>(null);
  const [canUpload, setCanUpload] = useState<{ allowed: boolean; limit?: number; current?: number }>({ allowed: true });

  // Sessions state
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionsPanelKey, setSessionsPanelKey] = useState(0);

  // Playlist state
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [difficulty, setDifficulty] = useState<SongDifficulty | "">("");
  const [status, setStatus] = useState<SongStatus>("want_to_learn");
  /*
   * Le curseur « 0-100 % » a disparu. Ce qu'un guitariste decide a propos
   * d'un morceau, c'est un tempo a atteindre ; ce qu'il constate, c'est le
   * tempo qu'il tient. Le pourcentage se deduit des deux, il ne se saisit
   * plus (cf. syncSongProgressFromTempo).
   */
  const [targetBpm, setTargetBpm] = useState("");
  const [bpmPoints, setBpmPoints] = useState<SongBpmPoint[] | null>(null);
  const [tabStructure, setTabStructure] = useState<SongsterrTabStructure | null>(
    null
  );
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
      setTargetBpm(song.target_bpm ? String(song.target_bpm) : "");
      setTabStructure(null);
      setTuning(song.tuning);
      setCapo(song.capo_position);
      setTabsUrl(song.tabs_url || "");
      setNotes(song.notes || "");
      setActiveTab("details");
    }
  }, [song]);

  /*
   * La courbe de tempo du morceau.
   *
   * Chargee a l'ouverture, en meme temps que les covers : c'est la
   * premiere chose qu'on vient regarder sur la fiche d'un morceau qu'on
   * travaille, et elle ne coute qu'une lecture de deux colonnes.
   */
  useEffect(() => {
    if (!song || !isOpen) return;
    let cancelled = false;
    getSongBpmProgress(song.id).then((points) => {
      if (!cancelled) setBpmPoints(points);
    });
    return () => {
      cancelled = true;
    };
  }, [song, isOpen]);

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

    const parsedTarget = targetBpm ? parseInt(targetBpm, 10) : null;
    if (parsedTarget !== null && (isNaN(parsedTarget) || parsedTarget < 20 || parsedTarget > 300)) {
      setError("Le tempo cible doit être compris entre 20 et 300 BPM");
      setSaving(false);
      return;
    }

    const result = await updateSong(song.id, {
      title,
      artist,
      difficulty: difficulty || undefined,
      status,
      target_bpm: parsedTarget ?? undefined,
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
      if (onDelete) {
        onDelete(song.id);
      } else {
        onUpdate();
        onClose();
      }
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
          <button aria-label="Fermer"
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
            <Image
              src={song.cover_url}
              alt={song.album || song.title}
              className="h-24 w-24 rounded-lg object-cover shadow-lg"
              width={96}
              height={96}
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

        {/* Spotify embed player */}
        {song.spotify_id && userPlan !== "free" && (
          <div className="mx-6 mt-4">
            <iframe
              src={`https://open.spotify.com/embed/track/${song.spotify_id}?theme=0`}
              width="100%"
              height="80"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl border-0"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveTab("details")}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "details"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Détails
          </button>
          <button
            onClick={() => setActiveTab("tablatures")}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "tablatures"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tablatures
          </button>
          <button
            onClick={() => setActiveTab("covers")}
            className={`flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
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
            className={`flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
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
          {/* Statut */}
          <div className="rounded-xl bg-accent/50 p-4">
            <label className="mb-3 block text-sm font-medium">Statut</label>
            <div className="flex gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatus(option.value)}
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
          </div>

          {/*
            La progression, au tempo.

            C'etait un curseur 0-100 % : une valeur saisie une fois, jamais
            revue, et fausse des la deuxieme semaine. Ici, deux nombres qui
            existent : la cible qu'on se donne et le meilleur tempo tenu en
            session. Le reste — barre, pourcentage, courbe — n'est qu'une
            lecture de ces deux-la.
          */}
          <TempoBlock
            song={song}
            targetBpm={targetBpm}
            onTargetBpmChange={setTargetBpm}
            bestBpm={bestBpm}
            points={bpmPoints}
            onWorkOnSong={() => {
              onClose();
              router.push(`/jouer?song=${song.id}`);
            }}
          />

          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Titre</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Artiste</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
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
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
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
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              >
                {TUNING_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.tunings.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} ({t.notes})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Capo</label>
              <select
                value={capo}
                onChange={(e) => setCapo(parseInt(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
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

          {/* Audio Features */}
          <AudioFeaturesBadge
            bpm={song.spotify_bpm}
            musicalKey={song.spotify_key != null ? undefined : undefined}
            energy={song.spotify_energy}
            spotifyId={song.spotify_id}
            songId={song.id}
            userPlan={userPlan}
            onFetched={() => onUpdate()}
          />

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium">Notes personnelles</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Astuces, passages difficiles, remarques..."
              rows={4}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </div>

          {/* Add to playlist */}
          <button
            onClick={() => setShowAddToPlaylist(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-accent"
          >
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="font-medium">Ajouter à une playlist</span>
          </button>

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

        {/* Tablatures Tab */}
        {activeTab === "tablatures" && (
          <div className="space-y-4 p-6">
            <TabsSearchPanel
              title={title}
              artist={artist}
              currentTabsUrl={tabsUrl}
              onSelectTab={(url) => setTabsUrl(url)}
              /*
                L'analyse etait calculee puis jetee : rouvrir le morceau
                relancait le telechargement du fichier Guitar Pro. Elle se
                range maintenant sur le morceau, et le tempo de la
                partition devient la cible quand aucune n'est reglee.
              */
              onTabStructure={async (structure, songsterrId) => {
                setTabStructure(structure);
                const saved = await saveSongTabStructure(song.id, {
                  songsterrId: songsterrId ?? null,
                  tabsUrl: tabsUrl || undefined,
                  structure,
                });
                if (saved.targetBpmApplied) {
                  setTargetBpm(String(saved.targetBpmApplied));
                }
                onUpdate();
              }}
              userPlan={userPlan}
            />

            <TabStructureSummary
              structure={
                tabStructure ??
                (song.tab_bpm
                  ? {
                      bpm: song.tab_bpm,
                      totalMeasures: song.tab_total_measures ?? 0,
                      timeSignatureBeats: song.tab_time_signature_beats ?? 4,
                      timeSignatureValue: song.tab_time_signature_value ?? 4,
                      sections: song.tab_sections ?? [],
                    }
                  : null)
              }
              syncedAt={song.tab_synced_at}
              onUseAsTarget={(bpm) => setTargetBpm(String(bpm))}
            />
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
      {showAddCover && (
      <AddCoverModal
        song={song}
        isOpen={showAddCover}
        onClose={() => setShowAddCover(false)}
        onSuccess={() => {
          loadCovers();
          onUpdate();
        }}
      />
      )}

      {/* Cover Detail Modal */}
      {selectedCover && (
      <CoverDetailModal
        cover={selectedCover}
        isOpen={!!selectedCover}
        onClose={() => setSelectedCover(null)}
        onUpdate={() => {
          loadCovers();
          onUpdate();
        }}
      />
      )}

      {/* Add Session Modal */}
      {showAddSession && (
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
      )}

      {/* Add to Playlist Modal */}
      {showAddToPlaylist && (
      <AddToPlaylistModal
        songId={song.id}
        isOpen={showAddToPlaylist}
        onClose={() => setShowAddToPlaylist(false)}
        onSuccess={() => {
          router.refresh();
          onUpdate();
        }}
      />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// La progression, au tempo
// ---------------------------------------------------------------------------

interface TempoBlockProps {
  song: Song;
  targetBpm: string;
  onTargetBpmChange: (value: string) => void;
  bestBpm: number | null;
  /** `null` tant que la courbe n'est pas revenue du serveur. */
  points: SongBpmPoint[] | null;
  onWorkOnSong: () => void;
}

/**
 * Le bloc qui a remplace le curseur de progression.
 *
 * Trois choses, dans l'ordre ou on les consulte : ou j'en suis
 * (l'echelle de tempo), comment j'y suis arrive (la courbe), et ou je
 * veux aller (la cible, le seul champ de saisie).
 */
function TempoBlock({
  song,
  targetBpm,
  onTargetBpmChange,
  bestBpm,
  points,
  onWorkOnSong,
}: TempoBlockProps) {
  const parsed = targetBpm ? parseInt(targetBpm, 10) : NaN;
  const effectiveTarget = !isNaN(parsed) && parsed > 0 ? parsed : null;

  // Les propositions : la partition d'abord, l'enregistrement ensuite.
  // Ce sont des raccourcis, pas des valeurs imposees.
  const suggestions = [
    song.tab_bpm ? { bpm: song.tab_bpm, label: "Tablature" } : null,
    song.spotify_bpm
      ? { bpm: Math.round(song.spotify_bpm), label: "Original" }
      : null,
  ].filter(Boolean) as { bpm: number; label: string }[];

  const fallbackTarget = songTargetBpm(song);
  const ladderTarget = effectiveTarget ?? fallbackTarget?.bpm ?? null;

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Progression au tempo</h3>
        <button
          type="button"
          onClick={onWorkOnSong}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            play_arrow
          </span>
          Travailler
        </button>
      </div>

      {ladderTarget ? (
        <TempoLadder
          targetBpm={ladderTarget}
          achievedBpm={bestBpm}
          floorBpm={slowPracticeFloor(ladderTarget)}
        />
      ) : (
        <p className="rounded-lg bg-accent/50 p-3 text-sm text-muted-foreground">
          Donne-toi un tempo à atteindre : c&apos;est lui qui mesurera la
          progression, séance après séance.
        </p>
      )}

      {/* La courbe : l'histoire, pas l'instantane. */}
      {points !== null && points.length > 0 && (
        <SongBpmCurve
          points={points}
          targetBpm={ladderTarget}
          floorBpm={ladderTarget ? slowPracticeFloor(ladderTarget) : null}
        />
      )}

      <div>
        <label
          htmlFor="target-bpm"
          className="mb-1 block text-sm font-medium"
        >
          Tempo cible
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <input
              id="target-bpm"
              type="number"
              inputMode="numeric"
              min={20}
              max={300}
              value={targetBpm}
              onChange={(event) => onTargetBpmChange(event.target.value)}
              placeholder="—"
              className="tabular w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
            />
            <span className="text-sm text-muted-foreground">BPM</span>
          </div>

          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => onTargetBpmChange(String(suggestion.bpm))}
              className="tabular inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {suggestion.label} · {suggestion.bpm}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Le pourcentage affiché ailleurs se déduit de ce tempo et du
          meilleur que tu aies tenu — il ne se saisit plus.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ce que la tablature a livre
// ---------------------------------------------------------------------------

interface TabStructureSummaryProps {
  structure: SongsterrTabStructure | null;
  syncedAt?: string;
  onUseAsTarget: (bpm: number) => void;
}

/**
 * Le resultat de l'analyse, garde sur le morceau.
 *
 * Sans ca, « Analyser la tab » etait un bouton qui affichait un spinner
 * puis ne montrait rien : le tempo et les sections partaient dans un
 * callback que personne n'ecoutait sur cet ecran.
 */
function TabStructureSummary({
  structure,
  syncedAt,
  onUseAsTarget,
}: TabStructureSummaryProps) {
  if (!structure) return null;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-medium">Ce que dit la tablature</h4>
        {syncedAt && (
          <span className="text-xs text-muted-foreground">
            Analysée le{" "}
            {new Date(syncedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-muted-foreground">Tempo</dt>
          <dd className="tabular text-lg font-bold text-primary">
            {structure.bpm}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Mesure</dt>
          <dd className="tabular text-lg font-bold">
            {structure.timeSignatureBeats}/{structure.timeSignatureValue}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Mesures</dt>
          <dd className="tabular text-lg font-bold">
            {structure.totalMeasures || "—"}
          </dd>
        </div>
      </dl>

      {structure.sections.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-muted-foreground">
            {structure.sections.length} section
            {structure.sections.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {structure.sections.map((section) => (
              <span
                key={`${section.name}-${section.startMeasure}`}
                className="tabular rounded-full bg-accent px-2.5 py-1 text-xs"
              >
                {section.name}
                <span className="text-muted-foreground">
                  {" "}
                  {section.startMeasure}–{section.endMeasure}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onUseAsTarget(structure.bpm)}
        className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
          speed
        </span>
        Prendre {structure.bpm} BPM comme cible
      </button>
    </div>
  );
}
