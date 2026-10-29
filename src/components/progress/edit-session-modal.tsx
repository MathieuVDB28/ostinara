"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { formatDuration as formatMinutes } from "./stats-summary";
import { updatePracticeSession, updatePracticeSessionGroup, deletePracticeSession } from "@/lib/actions/practice";
import { Cover } from "@/components/ui/cover";
import { X } from "lucide-react";
import { MoodSelector, getMoodEmoji } from "./mood-selector";
import { SectionsSelector, getSectionsLabels } from "./sections-selector";
import { EnergySelector, getEnergyLabel } from "./energy-selector";
import type { PracticeSessionWithSong, Song, SessionMood, EnergyLevel, SongSection } from "@/types";
import { useDepsChanged } from "@/lib/hooks/use-deps-changed";

/** Une ligne d'une session a plusieurs morceaux, telle qu'on la corrige. */
interface GroupRow {
  session: PracticeSessionWithSong;
  minutes: number | "";
  bpm: string;
}

/** Le temps des exercices rattaches a une ligne : elle ne peut pas descendre en dessous. */
function exerciseMinutes(session: PracticeSessionWithSong): number {
  return (session.exercises ?? []).reduce((sum, exercise) => sum + exercise.duration_minutes, 0);
}

interface EditSessionModalProps {
  session: PracticeSessionWithSong | null;
  /**
   * Toutes les lignes de la session quand elle a plusieurs morceaux : la
   * modale corrige alors la session entiere, le temps de chaque morceau
   * compris, au lieu d'une seule ligne.
   */
  group?: PracticeSessionWithSong[] | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  songs: Song[];
}

export function EditSessionModal({
  session,
  group,
  isOpen,
  onClose,
  onSuccess,
  songs,
}: EditSessionModalProps) {
  const t = useTranslations("progress.form");
  const ts = useTranslations("progress.session");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Champs du formulaire
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | "">(30);
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

  // Session a plusieurs morceaux : chaque ligne garde son temps et son tempo.
  const isGroup = Boolean(group && group.length > 1);
  const [groupRows, setGroupRows] = useState<GroupRow[]>([]);
  const groupTotal = groupRows.reduce((sum, row) => sum + (Number(row.minutes) || 0), 0);

  // Charger les données de la session, pendant le rendu.
  const reset = useDepsChanged([session, group, isOpen]);
  if (reset && session && isOpen) {
    setGroupRows(
      (group ?? []).map((row) => ({
        session: row,
        minutes: row.duration_minutes,
        bpm: row.bpm_achieved?.toString() || "",
      }))
    );
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

  const handleSaveGroup = async () => {
    if (!session || !group) return;

    const short = groupRows.find(
      (row) => !row.minutes || row.minutes < Math.max(1, exerciseMinutes(row.session))
    );
    if (short) {
      const floor = exerciseMinutes(short.session);
      setError(floor > 0 ? t("exercisesFloor", { minutes: floor }) : t("durationMin"));
      return;
    }

    setLoading(true);
    setError(null);

    const kept = new Set(groupRows.map((row) => row.session.id));
    const result = await updatePracticeSessionGroup(session.session_group_id!, {
      rows: groupRows.map((row) => ({
        id: row.session.id,
        duration_minutes: Number(row.minutes),
        bpm_achieved: row.bpm ? parseInt(row.bpm) : null,
      })),
      removed: group.filter((row) => !kept.has(row.id)).map((row) => row.id),
      shared: {
        practiced_at: new Date(practicedAt).toISOString(),
        mood,
        energy_level: energyLevel,
        sections_worked: sectionsWorked,
        session_goals: sessionGoals || null,
        goals_achieved: goalsAchieved,
        notes: notes || null,
      },
    });

    setLoading(false);

    if (result.success) {
      router.refresh();
      onSuccess();
      handleClose();
    } else {
      setError(result.error || tc("genericError"));
    }
  };

  const handleSave = async () => {
    if (!session) return;
    if (isGroup) return handleSaveGroup();

    if (!durationMinutes || durationMinutes < 1) {
      setError(t("durationMin"));
      return;
    }

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
      setError(result.error || tc("genericError"));
    }
  };

  const handleDelete = async () => {
    if (!session) return;

    setDeleting(true);
    setError(null);

    // Une session a plusieurs morceaux part en entier, comme depuis le journal.
    const results = await Promise.all(
      (isGroup ? group! : [session]).map((row) => deletePracticeSession(row.id))
    );
    const result = results.find((item) => !item.success) ?? results[0];

    setDeleting(false);

    if (result.success) {
      router.refresh();
      onSuccess();
      handleClose();
    } else {
      setError(result.error || tc("genericError"));
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return tc("duration.minutesLong", { m: minutes });
    return formatMinutes(minutes, tc);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString(intlLocale, {
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
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-md">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-3xl font-extrabold uppercase leading-none">
            {isEditing ? t("editTitle") : t("detailTitle")}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                title={tc("edit")}
                aria-label={tc("edit")}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            )}
            <button aria-label={tc("close")}
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
            {/* Morceaux de la session, chacun avec son temps */}
            {isGroup && (
              <div>
                <label className="mb-2 block text-sm font-medium">{t("songsCount", { count: groupRows.length })}</label>
                <ul className="border-t border-border">
                  {groupRows.map((row, index) => (
                    <GroupRowEditor
                      key={row.session.id}
                      row={row}
                      canRemove={groupRows.length > 1}
                      onChange={(patch) =>
                        setGroupRows((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
                      }
                      onRemove={() => setGroupRows((current) => current.filter((_, i) => i !== index))}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* Morceau */}
            {!isGroup && (
            <div>
              <label className="mb-2 block text-sm font-medium">{t("song")}</label>
              {selectedSong ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted p-3">
                  {selectedSong.cover_url ? (
                    <Image src={selectedSong.cover_url} alt={selectedSong.title} className="h-12 w-12 rounded-lg object-cover"
                      width={48}
                      height={48}
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
                  <button type="button" onClick={() => setShowSongSearch(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowSongSearch(true)} className="w-full rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground hover:border-primary hover:bg-primary/5">
                  {t("chooseSongOptional")}
                </button>
              )}
            </div>
            )}

            {/* Durée et Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">{t("durationMinutes")}</label>
                {/* Plusieurs morceaux : la duree est la somme de leurs temps. */}
                <input type="number" inputMode="numeric" min="1" max="480" value={isGroup ? groupTotal : durationMinutes} disabled={isGroup} onChange={(e) => setDurationMinutes(e.target.value === "" ? "" : parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary disabled:opacity-60" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t("dateTime")}</label>
                <input type="datetime-local" value={practicedAt} onChange={(e) => setPracticedAt(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary" />
              </div>
            </div>

            {/* Humeur */}
            <div>
              <label className="mb-3 block text-sm font-medium">{t("howFelt")}</label>
              <MoodSelector value={mood} onChange={setMood} />
            </div>

            {/* Énergie */}
            <div>
              <label className="mb-3 block text-sm font-medium">{t("energyLevel")}</label>
              <EnergySelector value={energyLevel} onChange={setEnergyLevel} />
            </div>

            {/* BPM (plusieurs morceaux : sur chaque ligne) */}
            {!isGroup && (
            <div>
              <label className="mb-2 block text-sm font-medium">{t("bpmReached")}</label>
              <input type="number" min="20" max="300" placeholder={t("bpmPlaceholder")} value={bpmAchieved} onChange={(e) => setBpmAchieved(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary" />
            </div>
            )}

            {/* Sections */}
            <div>
              <label className="mb-3 block text-sm font-medium">{t("sectionsWorked")}</label>
              <SectionsSelector value={sectionsWorked} onChange={setSectionsWorked} />
            </div>

            {/* Objectifs */}
            <div>
              <label className="mb-2 block text-sm font-medium">{t("goals")}</label>
              <textarea placeholder={t("goalsPlaceholder")} value={sessionGoals} onChange={(e) => setSessionGoals(e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary" />
              {sessionGoals && (
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={goalsAchieved} onChange={(e) => setGoalsAchieved(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
                  <span className="text-sm">{t("goalsAchieved")}</span>
                </label>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium">{t("notes")}</label>
              <textarea placeholder={t("notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(true)} className="rounded-lg border border-destructive px-4 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground">
                {tc("delete")}
              </button>
              <div className="flex-1" />
              <button onClick={() => setIsEditing(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent">
                {tc("cancel")}
              </button>
              <button onClick={handleSave} disabled={loading} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50">
                {loading ? tc("saving") : tc("save")}
              </button>
            </div>
          </div>
        ) : (
          /* Mode visualisation */
          <div className="space-y-6">
            {/* Morceaux de la session, avec leur temps */}
            {isGroup && (
              <ul className="border-t border-border">
                {group!.map((row) => (
                  <li key={row.id} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5">
                    <Cover src={row.song?.cover_url} className="h-11 w-11 rounded-[3px]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.song?.title || ts("free")}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.song?.artist || exerciseNames(row)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-sm font-semibold">{formatDuration(row.duration_minutes)}</p>
                      {row.bpm_achieved && (
                        <p className="tabular text-xs text-primary">{row.bpm_achieved} BPM</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Morceau */}
            {!isGroup && (
            <div className="flex items-center gap-4">
              {session.song?.cover_url ? (
                <Image src={session.song.cover_url} alt={session.song.title} className="h-20 w-20 rounded-xl object-cover"
                  width={80}
                  height={80}
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted">
                  <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">{session.song?.title || ts("free")}</h3>
                {session.song?.artist && <p className="text-muted-foreground">{session.song.artist}</p>}
              </div>
            </div>
            )}

            {/* Infos principales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t("duration")}</p>
                <p className="font-semibold">
                  {formatDuration(isGroup ? group!.reduce((sum, row) => sum + row.duration_minutes, 0) : session.duration_minutes)}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t("date")}</p>
                <p className="font-semibold text-sm">{formatDate(session.practiced_at)}</p>
              </div>
            </div>

            {/* Mood et Énergie */}
            {(session.mood || session.energy_level) && (
              <div className="flex gap-4">
                {session.mood && (
                  <div className="flex-1 rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t("mood")}</p>
                    <span className="text-2xl">{getMoodEmoji(session.mood)}</span>
                  </div>
                )}
                {session.energy_level && (
                  <div className="flex-1 rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t("energy")}</p>
                    <p className="font-medium">{getEnergyLabel(session.energy_level, te)}</p>
                  </div>
                )}
              </div>
            )}

            {/* BPM */}
            {!isGroup && session.bpm_achieved && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t("bpmReached")}</p>
                <p className="text-xl font-bold text-primary">{session.bpm_achieved} BPM</p>
              </div>
            )}

            {/* Sections */}
            {session.sections_worked.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t("sectionsWorked")}</p>
                <p className="font-medium">{getSectionsLabels(session.sections_worked, te)}</p>
              </div>
            )}

            {/* Objectifs */}
            {session.session_goals && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium text-muted-foreground">{t("goals")}</p>
                  {session.goals_achieved && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {t("reached")}
                    </span>
                  )}
                </div>
                <p className="text-sm">{session.session_goals}</p>
              </div>
            )}

            {/* Notes */}
            {session.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t("notes")}</p>
                <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Modal de recherche de morceau */}
        {showSongSearch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowSongSearch(false)} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">{t("chooseSong")}</h3>
                <button onClick={() => setShowSongSearch(false)} aria-label={tc("close")} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" placeholder={t("searchPlaceholder")} value={songSearchQuery} onChange={(e) => setSongSearchQuery(e.target.value)} className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary" />
              </div>

              <button onClick={() => { setSelectedSong(null); setShowSongSearch(false); }} className="mb-2 w-full rounded-lg border border-dashed border-border p-3 text-left text-sm text-muted-foreground hover:border-primary hover:bg-primary/5">
                {t("freeSession")}
              </button>

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {filteredSongs.map((song) => (
                  <button key={song.id} onClick={() => { setSelectedSong(song); setShowSongSearch(false); }} className={`w-full flex items-center gap-3 rounded-lg p-2 text-left transition-all ${selectedSong?.id === song.id ? "bg-primary/10 border border-primary" : "hover:bg-accent"}`}>
                    {song.cover_url ? <Image src={song.cover_url} alt={song.title} className="h-10 w-10 rounded-md object-cover"
        width={40}
        height={40}
      /> : <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted"><svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg></div>}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{song.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                    </div>
                  </button>
                ))}
                {filteredSongs.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">{t("noSongFound")}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-md">
              <h3 className="text-lg font-bold mb-2">{t("confirmDeleteTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-6">{t("irreversible")}</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">{tc("cancel")}</button>
                <button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50">
                  {deleting ? tc("deleting") : tc("delete")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Les exercices d'une ligne sans morceau, a la place de l'artiste. */
function exerciseNames(session: PracticeSessionWithSong): string {
  return (session.exercises ?? [])
    .map((exercise) => exercise.exercise_name)
    .filter(Boolean)
    .join(", ");
}

/** Un morceau d'une session a plusieurs morceaux : son temps, son tempo. */
function GroupRowEditor({
  row,
  canRemove,
  onChange,
  onRemove,
}: {
  row: GroupRow;
  canRemove: boolean;
  onChange: (patch: Partial<GroupRow>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("progress.form");
  const ts = useTranslations("progress.session");
  const title = row.session.song?.title || ts("free");
  const floor = exerciseMinutes(row.session);

  return (
    <li className="space-y-2.5 border-b border-border py-3">
      <div className="flex items-center gap-3">
        <Cover src={row.session.song?.cover_url} className="h-11 w-11 rounded-[3px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.session.song?.artist || exerciseNames(row.session)}
          </p>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("removeSong", { name: title })}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="flex gap-3">
        <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
          <input
            type="number"
            inputMode="numeric"
            min={Math.max(1, floor)}
            max="480"
            value={row.minutes}
            onChange={(e) => onChange({ minutes: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })}
            onFocus={(e) => e.target.select()}
            aria-label={t("minutesOf", { name: title })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary"
          />
          {t("min")}
        </label>
        {row.session.song_id && (
          <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
            <input
              type="number"
              inputMode="numeric"
              min="20"
              max="300"
              placeholder={t("bpmPlaceholder")}
              value={row.bpm}
              onChange={(e) => onChange({ bpm: e.target.value })}
              aria-label={t("bpmOf", { name: title })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary"
            />
            BPM
          </label>
        )}
      </div>
      {floor > 0 && <p className="text-xs text-muted-foreground">{t("exercisesFloor", { minutes: floor })}</p>}
    </li>
  );
}
