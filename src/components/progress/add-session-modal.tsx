"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { ChevronDown, CloudOff, Dumbbell, Plus, X } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { useOffline } from "@/components/offline/offline-provider";
import { updateSong } from "@/lib/actions/songs";
import { getShareSessionsDefault } from "@/lib/actions/practice";
import { songTargetBpm } from "@/lib/song-progress";
import { EXERCISE_CATEGORIES } from "@/lib/instruments";
import { useNextSteps } from "@/components/next-steps/next-steps-provider";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { InstrumentSwitch } from "@/components/instruments/instrument-switch";
import {
  exerciseKeyOf,
  type SessionExercise,
  type SessionExerciseTime,
  type SessionSongTime,
} from "@/components/providers/practice-session-provider";
import { MoodSelector } from "./mood-selector";
import { SectionsSelector } from "./sections-selector";
import { EnergySelector } from "./energy-selector";
import type {
  Instrument,
  Song,
  SongStatus,
  SessionMood,
  EnergyLevel,
  SongSection,
  ExerciseWithProgress,
  ExerciseCategory,
} from "@/types";

/** Un morceau de la session, tel qu'on l'edite dans la modale. */
interface Entry {
  /** Null : le temps joue sans morceau. */
  songId: string | null;
  minutes: number | "";
  bpm: string;
  /** Null tant qu'on ne touche pas au statut du morceau. */
  status: SongStatus | null;
  /** Null tant qu'on ne touche pas a la progression. */
  percent: number | null;
}

/** Un exercice de la session, tel qu'on l'edite dans la modale. */
interface ExerciseEntry {
  exercise: SessionExercise;
  minutes: number | "";
  bpm: string;
}

function initialEntries(
  timerSongTimes: SessionSongTime[] | undefined,
  timerSong: Song | null | undefined,
  timerDuration: number | undefined,
  timerBpm: number | undefined,
  initialSongIds?: string[],
  hasExercises = false
): Entry[] {
  if (timerSongTimes && timerSongTimes.length > 0) {
    // Le temps sans morceau ne merite une ligne que s'il y a aussi des
    // morceaux ou des exercices : seul, c'est simplement une session libre.
    const rows = hasExercises || timerSongTimes.some((row) => row.songId)
      ? timerSongTimes
      : [];
    return rows.map((row) => ({
      songId: row.songId,
      minutes: row.minutes,
      bpm: row.bpm ? String(row.bpm) : "",
      status: null,
      percent: null,
    }));
  }
  if (timerSong) {
    return [{
      songId: timerSong.id,
      minutes: timerDuration || 30,
      bpm: timerBpm ? String(timerBpm) : "",
      status: null,
      percent: null,
    }];
  }
  // Une session passee montee comme une session a jouer : ses morceaux,
  // sans temps — on donne le total, il se repartit.
  if (initialSongIds && initialSongIds.length > 0) {
    return [...new Set(initialSongIds)].map((songId) => ({
      songId,
      minutes: "",
      bpm: "",
      status: null,
      percent: null,
    }));
  }
  return [];
}

function initialExerciseEntries(
  timerExerciseTimes: SessionExerciseTime[] | undefined,
  initialExercises: SessionExercise[] | undefined
): ExerciseEntry[] {
  if (timerExerciseTimes && timerExerciseTimes.length > 0) {
    return timerExerciseTimes.map((row) => ({
      exercise: row.exercise,
      minutes: row.minutes,
      bpm: row.bpm ? String(row.bpm) : "",
    }));
  }
  const seen = new Set<string>();
  return (initialExercises ?? []).flatMap((exercise) => {
    const key = exerciseKeyOf(exercise);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ exercise, minutes: "" as const, bpm: "" }];
  });
}

/**
 * Le temps total d'une session saisie apres coup, reparti entre les
 * morceaux et exercices dont on n'a pas donne la duree : a parts egales,
 * la minute qui reste aux premiers. Null si le total ne laisse pas une
 * minute a chacun.
 */
function splitRemaining(minutes: (number | "")[], total: number): number[] | null {
  const blanks = minutes.filter((value) => !value).length;
  const remaining = total - minutes.reduce<number>((sum, value) => sum + (Number(value) || 0), 0);
  if (remaining < blanks) return null;
  let index = 0;
  return minutes.map((value) => {
    if (value) return Number(value);
    const share = Math.floor(remaining / blanks) + (index < remaining % blanks ? 1 : 0);
    index += 1;
    return share;
  });
}

const STATUS_OPTIONS: SongStatus[] = ["want_to_learn", "learning", "mastered"];

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  songs: Song[];
  /** Les exercices qu'on peut ajouter a la session. */
  exercises?: ExerciseWithProgress[];
  // Props pour le mode timer
  timerDuration?: number;
  timerSong?: Song | null;
  /** Tempo du metronome au moment du "Terminer", quand il y en avait un. */
  timerBpm?: number;
  /** Les morceaux joues pendant le chrono, avec leur temps. */
  timerSongTimes?: SessionSongTime[];
  /** Les exercices joues pendant le chrono, avec leur temps. */
  timerExerciseTimes?: SessionExerciseTime[];
  /** Saisie manuelle : les morceaux deja choisis (la session montee dans Jouer). */
  initialSongIds?: string[];
  /** Saisie manuelle : les exercices de la session montee. */
  initialExercises?: SessionExercise[];
  mode: "timer" | "manual";
}

export function AddSessionModal({
  isOpen,
  onClose,
  onSuccess,
  songs,
  exercises = [],
  timerDuration,
  timerSong,
  timerBpm,
  timerSongTimes,
  timerExerciseTimes,
  initialSongIds,
  initialExercises,
  mode,
}: AddSessionModalProps) {
  const t = useTranslations("progress.add");
  const tf = useTranslations("progress.form");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
  const router = useRouter();
  const nextSteps = useNextSteps();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * L'ecriture passe par le magasin hors ligne.
   *
   * C'est le seul formulaire de l'app ou l'absence de reseau fait perdre
   * quelque chose : une session qu'on vient de jouer, dont la duree, le
   * tempo et les sections ne sont nulle part ailleurs. `saveSession`
   * ecrit directement si le reseau est la, met en file sinon.
   */
  const { saveSession, isOnline } = useOffline();

  // L'instrument de la session : le principal, sauf si on en joue plusieurs
  // et qu'on choisit l'autre. Le statut des morceaux vise cette partie-la.
  const myInstruments = useMyInstruments();
  const [instrument, setInstrument] = useState<Instrument>(myInstruments.primary);

  // Champs du formulaire
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>(() =>
    initialExerciseEntries(timerExerciseTimes, initialExercises)
  );
  const [entries, setEntries] = useState<Entry[]>(() =>
    initialEntries(
      timerSongTimes,
      timerSong,
      timerDuration,
      timerBpm,
      initialSongIds,
      Boolean(timerExerciseTimes?.length || initialExercises?.length)
    )
  );
  const [durationMinutes, setDurationMinutes] = useState<number | "">(timerDuration || 30);
  const [practicedAt, setPracticedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [bpmAchieved, setBpmAchieved] = useState<string>(
    timerBpm ? String(timerBpm) : ""
  );
  const [mood, setMood] = useState<SessionMood | null>(null);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [sectionsWorked, setSectionsWorked] = useState<SongSection[]>([]);
  const [sessionGoals, setSessionGoals] = useState("");
  const [goalsAchieved, setGoalsAchieved] = useState(false);
  const [notes, setNotes] = useState("");
  /*
   * Partager avec les amis : le reglage du profil, lu a l'ouverture. Null
   * tant qu'il n'est pas arrive (ou hors ligne) et qu'on n'a pas touche a
   * la case : le serveur appliquera le reglage lui-meme.
   */
  const [share, setShare] = useState<boolean | null>(null);

  // Sections collapsibles
  const [showPerformance, setShowPerformance] = useState(false);
  const [showFeeling, setShowFeeling] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  // Recherche de morceau
  const [showSongSearch, setShowSongSearch] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState("");
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  // Exo libre : un nom, une categorie, sans fiche (comme l'exo express de la file).
  const [freeExerciseName, setFreeExerciseName] = useState("");
  const [freeExerciseCategory, setFreeExerciseCategory] = useState<ExerciseCategory | "">("");

  // Reset au changement de mode ou props
  useEffect(() => {
    if (isOpen) {
      setExerciseEntries(initialExerciseEntries(timerExerciseTimes, initialExercises));
      setEntries(
        initialEntries(
          timerSongTimes,
          timerSong,
          timerDuration,
          timerBpm,
          initialSongIds,
          Boolean(timerExerciseTimes?.length || initialExercises?.length)
        )
      );
      setDurationMinutes(timerDuration || 30);
      setPracticedAt(new Date().toISOString().slice(0, 16));
      setBpmAchieved(timerBpm ? String(timerBpm) : "");
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
      setShare(null);
    }
  }, [isOpen, timerDuration, timerSong, timerBpm, timerSongTimes, initialSongIds, timerExerciseTimes, initialExercises]);

  useEffect(() => {
    if (!isOpen || !isOnline) return;
    let cancelled = false;
    getShareSessionsDefault()
      .then((value) => {
        if (!cancelled) setShare((current) => current ?? value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, isOnline]);

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

  // Plusieurs morceaux ou exercices : la duree est la somme des leurs. Un
  // seul ou aucun : la duree du chrono, ou celle saisie.
  const allMinutes = [...entries.map((entry) => entry.minutes), ...exerciseEntries.map((entry) => entry.minutes)];
  const isMulti = allMinutes.length > 1;
  /*
   * Apres coup, on se souvient du temps passe, rarement de celui de chaque
   * morceau : en saisie manuelle, on donne le total et ce qui n'a pas de
   * duree se partage ce qui reste.
   */
  const splitsTotal = mode === "manual" && isMulti && allMinutes.some((value) => !value);
  const totalMinutes: number | "" = isMulti && !splitsTotal
    ? allMinutes.reduce<number>((sum, value) => sum + (Number(value) || 0), 0)
    : durationMinutes;

  const updateExerciseEntry = (index: number, patch: Partial<ExerciseEntry>) => {
    setExerciseEntries((current) => current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addFreeExercise = () => {
    const name = freeExerciseName.trim();
    if (!name) return;
    const picked: SessionExercise = { id: null, name, category: freeExerciseCategory || null };
    setExerciseEntries((current) =>
      current.some((entry) => exerciseKeyOf(entry.exercise) === exerciseKeyOf(picked))
        ? current
        : [...current, { exercise: picked, minutes: "", bpm: "" }]
    );
    setFreeExerciseName("");
    setFreeExerciseCategory("");
    setShowExerciseSearch(false);
  };

  const addExercise = (exercise: ExerciseWithProgress) => {
    const picked: SessionExercise = { id: exercise.id, name: exercise.name, category: exercise.category };
    setExerciseEntries((current) =>
      current.some((entry) => exerciseKeyOf(entry.exercise) === exercise.id)
        ? current
        : [...current, { exercise: picked, minutes: "", bpm: "" }]
    );
  };

  const updateEntry = (index: number, patch: Partial<Entry>) => {
    setEntries((current) => current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addSong = (song: Song) => {
    setEntries((current) => {
      if (current.some((entry) => entry.songId === song.id)) return current;
      // Le premier morceau ajoute a une session libre la remplace (sauf si
      // des exercices s'y rattachent : c'est alors du temps a part).
      const base = current.filter(
        (entry) => entry.songId !== null || current.length > 1 || exerciseEntries.length > 0
      );
      // En saisie manuelle, le morceau prend sa part du total tant qu'on ne
      // lui donne pas de duree.
      const minutes = mode === "timer" && base.length === 0 ? durationMinutes : "";
      return [...base, { songId: song.id, minutes, bpm: "", status: null, percent: null }];
    });
  };

  const handleSubmit = async () => {
    if (!totalMinutes || totalMinutes < 1) {
      setError(tf("durationMin"));
      return;
    }
    // Un seul element : il prend toute la duree. Plusieurs : chacun la
    // sienne, ou sa part du total.
    const minutes = !isMulti
      ? allMinutes.map(() => Number(totalMinutes))
      : splitsTotal
        ? splitRemaining(allMinutes, Number(totalMinutes))
        : allMinutes.map((value) => Number(value) || 0);
    if (!minutes) {
      setError(t("notEnoughMinutes"));
      return;
    }
    if (isMulti && minutes.some((value) => value < 1)) {
      setError(t("minutesPerSong"));
      return;
    }
    const songMinutes = minutes.slice(0, entries.length);
    const exerciseMinutes = minutes.slice(entries.length);
    const hasExercises = exerciseEntries.length > 0;

    setLoading(true);
    setError(null);

    const single = entries.length === 1 && !hasExercises ? entries[0] : null;
    const result = await saveSession({
      // Avec des exercices, toujours la liste des morceaux (meme vide) :
      // le temps des exercices s'ajoute a part, cote serveur.
      songs: isMulti || hasExercises
        ? entries.map((entry, index) => ({
            song_id: entry.songId,
            duration_minutes: songMinutes[index],
            bpm_achieved: entry.bpm ? parseInt(entry.bpm) : undefined,
          }))
        : undefined,
      exercises: hasExercises
        ? exerciseEntries.map((entry, index) => ({
            exercise_id: entry.exercise.id,
            name: entry.exercise.name,
            category: entry.exercise.category ?? null,
            duration_minutes: exerciseMinutes[index],
            bpm_achieved: entry.bpm ? parseInt(entry.bpm) : undefined,
          }))
        : undefined,
      song_id: single?.songId ?? undefined,
      instrument,
      duration_minutes: totalMinutes,
      practiced_at: new Date(practicedAt).toISOString(),
      bpm_achieved: single ? (single.bpm ? parseInt(single.bpm) : undefined) : bpmAchieved ? parseInt(bpmAchieved) : undefined,
      mood: mood || undefined,
      energy_level: energyLevel || undefined,
      sections_worked: sectionsWorked.length > 0 ? sectionsWorked : undefined,
      session_goals: sessionGoals || undefined,
      goals_achieved: goalsAchieved,
      notes: notes || undefined,
      share: share ?? undefined,
    });

    if (result.success && !result.queued) {
      /*
       * Statut et progression touches dans la modale. Apres la session,
       * pour que le morceau maitrise le soit apres le tempo enregistre.
       * Hors ligne, ces champs sont caches : rien a envoyer.
       */
      await Promise.all(
        entries
          .filter((entry) => entry.songId && (entry.status !== null || entry.percent !== null))
          .map((entry) =>
            updateSong(entry.songId!, {
              instrument,
              ...(entry.status !== null ? { status: entry.status } : {}),
              ...(entry.status === "mastered"
                ? { progress_percent: 100 }
                : entry.percent !== null
                  ? { progress_percent: entry.percent }
                  : {}),
            })
          )
      );

      // Chaque morceau boucle pendant la session ouvre sa suite.
      for (const entry of entries) {
        const song = songs.find((item) => item.id === entry.songId);
        if (entry.status === "mastered" && song && partOf(song, instrument).status !== "mastered") {
          nextSteps.show({
            kind: "song_mastered",
            song: { ...song, status: "mastered", progress_percent: 100 },
          });
        }
      }
    }

    setLoading(false);

    if (result.success) {
      // Une session mise en file n'a rien change cote serveur : un
      // refresh renverrait la page telle quelle. Le bandeau hors ligne
      // dit deja ce qu'il faut savoir.
      if (!result.queued) router.refresh();
      onSuccess();
      handleClose();
    } else {
      setError(result.error || tc("genericError"));
    }
  };

  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
  );

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
      {/*
        Fin de session, style Atelier (docs/refonte-ui.md) : le recapitulatif
        tient en chiffres, l'humeur en un appui, la note en serif — c'est la
        voix du musicien, pas un champ de formulaire.
      */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-md sm:p-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-4xl font-extrabold uppercase leading-none tracking-[0.01em]">
              {mode === "timer" ? t("wellPlayed") : t("addTitle")}
            </h2>
            {mode === "timer" && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t("sessionOf", { date: new Date().toLocaleDateString(intlLocale, { day: "numeric", month: "long" }) })}
              </p>
            )}
          </div>
          <button aria-label={tc("close")}
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {mode === "timer" && (
          <dl className="mb-6 grid grid-cols-3 gap-3 border-y border-border py-3">
            <RecapStat label={t("recapDuration")} value={<>{totalMinutes || 0}<small className="text-base text-muted-foreground"> {t("min")}</small></>} />
            {isMulti ? (
              <RecapStat label={t("recapSongs")} value={<>{entries.filter((entry) => entry.songId).length}</>} />
            ) : (
              <RecapStat
                label={t("recapBpm")}
                value={
                  (entries[0]?.bpm || bpmAchieved)
                    ? <>{entries[0]?.bpm || bpmAchieved}</>
                    : <span className="text-muted-foreground">—</span>
                }
              />
            )}
            <RecapStat label={t("recapSections")} value={<>{sectionsWorked.length}</>} />
          </dl>
        )}

        {/* Erreur */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/*
          Hors ligne : on le dit avant l'enregistrement, pas apres. Savoir
          que la session part plus tard change la confiance qu'on accorde
          au bouton.
        */}
        {!isOnline && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-accent/60 px-4 py-3 text-sm text-muted-foreground">
            <CloudOff className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {t("offline")}
          </p>
        )}

        <div className="space-y-6">
          {myInstruments.isMulti && (
            <div>
              <p className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("instrument")}
              </p>
              <InstrumentSwitch
                options={myInstruments.instruments}
                value={instrument}
                onChange={setInstrument}
                label={t("instrumentPlayed")}
              />
            </div>
          )}

          {/*
            Les morceaux de la session. Le chrono les a suivis : chaque
            morceau ouvert pendant la session y est, avec son temps. On
            peut en ajouter, en retirer, et regler leur statut au passage.
          */}
          <div>
            <label className="mb-2 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {entries.length > 1 ? t("songsCount", { count: entries.length }) : t("song")}
            </label>
            {entries.length > 0 && (
              <ul className="border-t border-border">
                {entries.map((entry, index) => (
                  <EntryRow
                    key={entry.songId ?? "free"}
                    entry={entry}
                    song={entry.songId ? songs.find((song) => song.id === entry.songId) ?? null : null}
                    instrument={instrument}
                    showMinutes={isMulti}
                    minutesOptional={mode === "manual"}
                    canEditSong={isOnline}
                    onChange={(patch) => updateEntry(index, patch)}
                    onRemove={() => setEntries((current) => current.filter((_, i) => i !== index))}
                  />
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setShowSongSearch(true)}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {entries.length === 0 ? t("chooseOptional") : t("addSong")}
            </button>
          </div>

          {/*
            Les exercices : ceux du chrono ou de la session montee, avec
            leur temps et leur tempo. Une session peut n'etre que ca.
          */}
          <div>
            <label className="mb-2 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("exercisesCount", { count: exerciseEntries.length })}
            </label>
            {exerciseEntries.length > 0 && (
              <ul className="border-t border-border">
                {exerciseEntries.map((entry, index) => (
                  <ExerciseRow
                    key={exerciseKeyOf(entry.exercise)}
                    entry={entry}
                    showMinutes={isMulti}
                    minutesOptional={mode === "manual"}
                    onChange={(patch) => updateExerciseEntry(index, patch)}
                    onRemove={() => setExerciseEntries((current) => current.filter((_, i) => i !== index))}
                  />
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setShowExerciseSearch(true)}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("addExercise")}
            </button>
          </div>

          {/* Durée et Date : le chrono les a deja, on ne les montre qu'en saisie manuelle */}
          <div className={`grid grid-cols-2 gap-4 ${mode === "timer" ? "hidden" : ""}`}>
            <div>
              <label className="mb-2 block text-sm font-medium">{tf("durationMinutes")}</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="480"
                value={totalMinutes}
                onChange={(e) => setDurationMinutes(e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary disabled:opacity-60"
                // Plusieurs morceaux tous chronometres : la duree est leur somme.
                disabled={mode === "timer" || (isMulti && !splitsTotal)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{tf("dateTime")}</label>
              <input
                type="datetime-local"
                value={practicedAt}
                onChange={(e) => setPracticedAt(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                disabled={mode === "timer"}
              />
            </div>
            {splitsTotal && (
              <p className="col-span-2 -mt-2 text-xs text-muted-foreground">{t("splitHint")}</p>
            )}
          </div>

          {/* Humeur */}
          <div>
            <label className="mb-2 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("howWent")}</label>
            <MoodSelector value={mood} onChange={setMood} />
          </div>

          {/* Section Performance (collapsible) */}
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => setShowPerformance(!showPerformance)}
              className="flex w-full items-center justify-between py-3"
            >
              <span className="text-sm font-semibold">{t("performance")}</span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${showPerformance ? "rotate-180" : ""}`}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
            {showPerformance && (
              <div className="space-y-4 pb-4">
                {/* Avec un morceau, le tempo se note sur sa ligne. */}
                {entries.length === 0 && exerciseEntries.length === 0 && <div>
                  <label className="mb-2 block text-sm font-medium">{tf("bpmReached")}</label>
                  <input
                    type="number"
                    min="20"
                    max="300"
                    placeholder={tf("bpmPlaceholder")}
                    value={bpmAchieved}
                    onChange={(e) => setBpmAchieved(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                  />
                </div>}
                <div>
                  <label className="mb-3 block text-sm font-medium">{tf("sectionsWorked")}</label>
                  <SectionsSelector value={sectionsWorked} onChange={setSectionsWorked} />
                </div>
              </div>
            )}
          </div>

          {/* Section Ressenti (collapsible) */}
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => setShowFeeling(!showFeeling)}
              className="flex w-full items-center justify-between py-3"
            >
              <span className="text-sm font-semibold">{t("energy")}</span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${showFeeling ? "rotate-180" : ""}`}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
            {showFeeling && (
              <div className="pb-4">
                <EnergySelector value={energyLevel} onChange={setEnergyLevel} />
              </div>
            )}
          </div>

          {/* Section Objectifs (collapsible) */}
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => setShowGoals(!showGoals)}
              className="flex w-full items-center justify-between py-3"
            >
              <span className="text-sm font-semibold">{t("goals")}</span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${showGoals ? "rotate-180" : ""}`}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
            {showGoals && (
              <div className="space-y-4 pb-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("sessionGoals")}</label>
                  <textarea
                    placeholder={tf("goalsPlaceholder")}
                    value={sessionGoals}
                    onChange={(e) => setSessionGoals(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
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
                    <span className="text-sm">{tf("goalsAchieved")}</span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium">{tf("notes")}</label>
            <textarea
              placeholder={tf("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 font-serif text-[15px] italic leading-relaxed focus:border-primary focus:outline-none"
            />
          </div>

          {/* Partager : la session arrive dans le feed des amis, avec une notification */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3">
            <input
              type="checkbox"
              checked={share ?? true}
              onChange={(e) => setShare(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-primary"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t("shareWithFriends")}</span>
              <span className="block text-xs text-muted-foreground">{t("shareHint")}</span>
            </span>
          </label>

          {/* Bouton de validation */}
          <button
            onClick={handleSubmit}
            disabled={loading || !totalMinutes || totalMinutes < 1}
            className="min-h-[48px] w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                {tc("saving")}
              </span>
            ) : isOnline ? (
              t("saveSession")
            ) : (
              t("keepOffline")
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
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">{t("addSong")}</h3>
                <button
                  onClick={() => setShowSongSearch(false)}
                  aria-label={tc("close")}
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
                  placeholder={tf("searchPlaceholder")}
                  value={songSearchQuery}
                  onChange={(e) => setSongSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary"
                />
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {filteredSongs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => {
                      addSong(song);
                      setShowSongSearch(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 rounded-lg p-2 text-left transition-all
                      ${entries.some((entry) => entry.songId === song.id)
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-accent"
                      }
                    `}
                  >
                    {song.cover_url ? (
                      <Image
                        src={song.cover_url}
                        alt={song.title}
                        className="h-10 w-10 rounded-md object-cover"
                        width={40}
                        height={40}
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
                    {tf("noSongFound")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de recherche d'exercice */}
        {showExerciseSearch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowExerciseSearch(false)}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">{t("addExercise")}</h3>
                <button
                  onClick={() => setShowExerciseSearch(false)}
                  aria-label={tc("close")}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>

              <input
                type="text"
                placeholder={t("searchExercise")}
                value={exerciseSearchQuery}
                onChange={(e) => setExerciseSearchQuery(e.target.value)}
                className="mb-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />

              <div className="max-h-64 space-y-1 overflow-y-auto">
                {filteredExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => {
                      addExercise(exercise);
                      setShowExerciseSearch(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                      exerciseEntries.some((entry) => entry.exercise.id === exercise.id)
                        ? "border border-primary bg-primary/10"
                        : "hover:bg-accent"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Dumbbell className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{exercise.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {te(`exerciseCategory.${exercise.category}`)}
                      </span>
                    </span>
                  </button>
                ))}

                {filteredExercises.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t("noExerciseFound")}</p>
                )}
              </div>

              {/* Exo libre : ce qu'on a travaille sans fiche */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addFreeExercise();
                }}
                className="mt-4 rounded-lg border border-dashed border-border p-3"
              >
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t("freeExercise")}</p>
                <input
                  type="text"
                  value={freeExerciseName}
                  onChange={(e) => setFreeExerciseName(e.target.value)}
                  placeholder={t("freeExercisePlaceholder")}
                  maxLength={80}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                />
                <div className="mt-2 flex gap-2">
                  <select
                    value={freeExerciseCategory}
                    onChange={(e) => setFreeExerciseCategory(e.target.value as ExerciseCategory | "")}
                    aria-label={t("freeExerciseCategory")}
                    className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-2 text-sm focus:border-primary"
                  >
                    <option value="">{t("freeExerciseCategory")}</option>
                    {EXERCISE_CATEGORIES[instrument].map((category) => (
                      <option key={category} value={category}>
                        {te(`exerciseCategory.${category}`)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!freeExerciseName.trim()}
                    className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {tc("add")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Une ligne d'exercice : son temps et son tempo. */
function ExerciseRow({
  entry,
  showMinutes,
  minutesOptional,
  onChange,
  onRemove,
}: {
  entry: ExerciseEntry;
  showMinutes: boolean;
  minutesOptional: boolean;
  onChange: (patch: Partial<ExerciseEntry>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("progress.add");
  const te = useTranslations("enums");
  const category = entry.exercise.category;

  return (
    <li className="space-y-3 border-b border-border py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-secondary text-muted-foreground">
          <Dumbbell className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{entry.exercise.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {category ? te(`exerciseCategory.${category}`) : t("expressExercise")}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("remove", { name: entry.exercise.name })}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex gap-3">
        {showMinutes && (
          <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="480"
              value={entry.minutes}
              placeholder={minutesOptional ? t("autoMinutes") : undefined}
              onChange={(e) => onChange({ minutes: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary"
            />
            {t("min")}
          </label>
        )}
        <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
          <input
            type="number"
            inputMode="numeric"
            min="20"
            max="300"
            placeholder={t("bpmHeld")}
            value={entry.bpm}
            onChange={(e) => onChange({ bpm: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary"
          />
          {t("bpm")}
        </label>
      </div>
    </li>
  );
}

function RecapStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd className="tabular font-display text-[32px] font-bold leading-none">{value}</dd>
    </div>
  );
}

/**
 * Une ligne de morceau : son temps et son tempo, puis son statut et, sans
 * tempo cible, sa progression en frettes. Avec un tempo cible, la
 * progression reste calculee par le meilleur tempo tenu.
 */
function EntryRow({
  entry,
  song,
  showMinutes,
  minutesOptional,
  canEditSong,
  instrument,
  onChange,
  onRemove,
}: {
  entry: Entry;
  song: Song | null;
  /** L'instrument de la session : on lit et on regle cette partie du morceau. */
  instrument: Instrument;
  showMinutes: boolean;
  /** Saisie manuelle : sans duree, le morceau prend sa part du total. */
  minutesOptional: boolean;
  /** Hors ligne, statut et progression ne partiraient pas : on les cache. */
  canEditSong: boolean;
  onChange: (patch: Partial<Entry>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("progress.add");
  const te = useTranslations("enums");
  const part = song ? partOf(song, instrument) : null;
  const status = entry.status ?? part?.status ?? null;
  const hasTarget = song ? songTargetBpm(song) !== null : false;
  const percent = entry.percent ?? part?.progress_percent ?? 0;

  return (
    <li className="space-y-3 border-b border-border py-3">
      <div className="flex items-center gap-3">
        <Cover src={song?.cover_url} className="h-11 w-11 rounded-[3px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{song?.title ?? (entry.songId ? t("song") : t("noSong"))}</p>
          {song?.artist && <p className="truncate text-xs text-muted-foreground">{song.artist}</p>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("remove", { name: song?.title ?? t("thisRow") })}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex gap-3">
        {showMinutes && (
          <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="480"
              value={entry.minutes}
              placeholder={minutesOptional ? t("autoMinutes") : undefined}
              onChange={(e) => onChange({ minutes: e.target.value === "" ? "" : parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary"
            />
            {t("min")}
          </label>
        )}
        {entry.songId && (
          <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
            <input
              type="number"
              inputMode="numeric"
              min="20"
              max="300"
              placeholder={t("bpmHeld")}
              value={entry.bpm}
              onChange={(e) => onChange({ bpm: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary"
            />
            {t("bpm")}
          </label>
        )}
      </div>

      {song && canEditSong && (
        <div className="space-y-2.5">
          <div role="radiogroup" aria-label={t("statusOf", { title: song.title })} className="flex gap-1.5">
            {STATUS_OPTIONS.map((value) => ({ value, label: te(`songStatus.${value}`) })).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={status === option.value}
                onClick={() => onChange({ status: option.value })}
                className={`min-h-[36px] flex-1 rounded-full border px-2 text-xs font-semibold transition-colors ${
                  status === option.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {status !== "mastered" &&
            (hasTarget ? (
              <p className="text-xs text-muted-foreground">
                {t("tempoComputed")}
              </p>
            ) : (
              <FretsInput
                value={percent}
                label={t("progressOf", { title: song.title })}
                onChange={(value) => onChange({ percent: value })}
              />
            ))}
        </div>
      )}
    </li>
  );
}

/**
 * La partie d'un morceau pour un instrument. Pas encore travaille sur cet
 * instrument : « à apprendre », a zero.
 */
function partOf(song: Song, instrument: Instrument): { status: SongStatus; progress_percent: number } {
  const part = song.parts?.find((row) => row.instrument === instrument);
  if (part) return part;
  // Morceau charge sans ses parties (cache hors ligne) : la synthese.
  if (!song.parts) return { status: song.status, progress_percent: song.progress_percent };
  return { status: "want_to_learn", progress_percent: 0 };
}

/** La progression en douze frettes, a toucher. */
function FretsInput({ value, label, onChange }: { value: number; label: string; onChange: (value: number) => void }) {
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * 12);

  return (
    <div className="flex items-center gap-3">
      <div role="group" aria-label={label} className="grid flex-1 grid-cols-12 gap-1">
        {Array.from({ length: 12 }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${Math.round(((i + 1) / 12) * 100)} %`}
            aria-pressed={i < filled}
            // Retoucher la derniere frette pleine la vide : on peut revenir a 0.
            onClick={() => onChange(i + 1 === filled ? Math.round((i / 12) * 100) : Math.round(((i + 1) / 12) * 100))}
            className={`h-6 rounded-[2px] transition-colors ${i < filled ? "bg-primary" : "bg-muted hover:bg-muted-foreground/30"}`}
          />
        ))}
      </div>
      <span className="tabular w-10 text-right font-display text-lg font-bold leading-none">
        {Math.round(value)}
        <small className="text-xs text-muted-foreground">%</small>
      </span>
    </div>
  );
}
