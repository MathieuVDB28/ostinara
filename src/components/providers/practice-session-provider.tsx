"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSongs } from "@/lib/actions/songs";
import { getExercises } from "@/lib/actions/exercises";
import { AddSessionModal } from "@/components/progress/add-session-modal";
import { SessionSavePrompt } from "@/components/play/session-save-prompt";
import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import type { ExerciseCategory, ExerciseWithProgress, Song } from "@/types";
import type { SaveSessionItemInput } from "@/lib/actions/setlists";

/**
 * Un seul chronometre de session pour toute l'app.
 *
 * Il y en avait deux, independants et divergents :
 *
 *  - celui de "Jouer" vivait en memoire et mourait a la navigation ;
 *    surtout, son "Terminer" n'ecrivait la session que si un *exercice*
 *    etait selectionne. Qui chronometrait un morceau perdait sa session
 *    sans le moindre message.
 *  - celui de Profil > Progression persistait dans localStorage et
 *    ouvrait bien la modale d'enregistrement.
 *
 * On pouvait donc lancer les deux en meme temps, et n'en voir aucun
 * depuis l'autre ecran. Ici : un etat, persistant, et "Terminer" ouvre
 * toujours la modale, quel que soit ce qu'on travaillait.
 */

export type PracticeSessionStatus = "idle" | "running" | "paused";

interface StoredSession {
  status: PracticeSessionStatus;
  /** Debut du segment courant. null des que le chrono est en pause. */
  startedAt: number | null;
  /** Temps cumule des segments precedents. */
  accumulatedMs: number;
  songId: string | null;
  exerciseId: string | null;
  bpm: number | null;
  /**
   * De quoi afficher le morceau en plein ecran sans recharger la
   * bibliotheque. Optionnel : une session sans morceau reste une session.
   */
  song?: SessionSong | null;
  /**
   * Le temps passe sur chaque morceau, en ms, dans l'ordre ou on les a
   * ouverts. Cle "" pour le temps joue sans morceau ni exercice, « ex:… »
   * pour un exercice. Le morceau courant n'y est credite qu'au changement
   * de morceau ou a l'arret.
   */
  songTimes?: Record<string, number>;
  /** L'exercice en cours (sa cle, cf. exerciseKeyOf), null sinon. */
  exerciseKey?: string | null;
  /** Les exercices ouverts pendant la session, par cle. */
  exerciseInfo?: Record<string, SessionExercise>;
  /** Le temps ecoule au moment ou le morceau courant a ete ouvert. */
  songStartMs?: number;
  /** Le dernier tempo regle sur chaque morceau. */
  songBpms?: Record<string, number>;
  /**
   * Les elements de la session quand elle a ete lancee depuis un deroule
   * (onglet Session, ou une setlist). Sert a proposer, en fin de session,
   * d'en faire une routine ou une setlist. Absent pour un travail a l'unite.
   */
  programItems?: SaveSessionItemInput[];
}

/** Une ligne de fin de session : un morceau, son temps, son tempo. */
export interface SessionSongTime {
  songId: string | null;
  minutes: number;
  bpm: number | null;
}

/** Un exercice de la session : une fiche, ou un exo express (nom seul). */
export interface SessionExercise {
  id: string | null;
  name: string;
  category?: ExerciseCategory | null;
}

/** Une ligne d'exercice de fin de session. */
export interface SessionExerciseTime {
  exercise: SessionExercise;
  minutes: number;
  bpm: number | null;
}

/** La cle d'un exercice : sa fiche, ou son nom pour un exo express. */
export function exerciseKeyOf(exercise: SessionExercise): string {
  return exercise.id ?? `express:${exercise.name}`;
}

const EXERCISE_PREFIX = "ex:";

/** La cle de temps de ce qu'on joue : le morceau, l'exercice, ou "". */
function timeKeyOf(session: StoredSession): string {
  if (session.songId) return session.songId;
  if (session.exerciseKey) return EXERCISE_PREFIX + session.exerciseKey;
  return "";
}

/** En dessous, on a ouvert le morceau sans le jouer. */
const MIN_SONG_MS = 30_000;

/** Credite le temps du morceau courant, jusqu'a maintenant. */
function creditCurrentSong(session: StoredSession): Pick<StoredSession, "songTimes" | "songStartMs"> {
  const elapsed = elapsedOf(session);
  const key = timeKeyOf(session);
  const times = { ...(session.songTimes ?? {}) };
  times[key] = (times[key] ?? 0) + Math.max(0, elapsed - (session.songStartMs ?? 0));
  return { songTimes: times, songStartMs: elapsed };
}

/**
 * Les morceaux de la session, avec leurs minutes. Un morceau ouvert moins
 * de 30 s n'a pas ete joue ; le temps sans morceau n'apparait que s'il
 * pese au moins une minute ou s'il n'y a rien d'autre.
 */
function sessionSongTimes(
  session: StoredSession,
  bpms: Record<string, number>,
  hasExercises: boolean
): SessionSongTime[] {
  const { songTimes = {} } = creditCurrentSong(session);
  const entries = Object.entries(songTimes);
  const played = entries.filter(
    ([key, ms]) => key !== "" && !key.startsWith(EXERCISE_PREFIX) && ms >= MIN_SONG_MS
  );
  const free = songTimes[""] ?? 0;

  const rows: SessionSongTime[] = played.map(([key, ms]) => ({
    songId: key,
    minutes: Math.max(1, Math.round(ms / 60000)),
    bpm: bpms[key] ?? null,
  }));

  // Rien de joue nommement : toute la session est du jeu libre.
  const nothingNamed = rows.length === 0 && !hasExercises;
  if (nothingNamed || free >= 60_000) {
    rows.push({
      songId: null,
      minutes: Math.max(1, Math.round((nothingNamed ? elapsedOf(session) : free) / 60000)),
      bpm: nothingNamed ? session.bpm : null,
    });
  }

  return rows;
}

/** Les exercices de la session, avec leurs minutes (30 s au moins). */
function sessionExerciseTimes(session: StoredSession, bpms: Record<string, number>): SessionExerciseTime[] {
  const { songTimes = {} } = creditCurrentSong(session);
  return Object.entries(songTimes).flatMap(([key, ms]) => {
    if (!key.startsWith(EXERCISE_PREFIX) || ms < MIN_SONG_MS) return [];
    const exercise = session.exerciseInfo?.[key.slice(EXERCISE_PREFIX.length)];
    if (!exercise) return [];
    return [{ exercise, minutes: Math.max(1, Math.round(ms / 60000)), bpm: bpms[key] ?? null }];
  });
}

/** Le strict necessaire pour nommer le morceau travaille. */
export interface SessionSong {
  title: string;
  artist: string;
  cover_url?: string | null;
}

const IDLE: StoredSession = {
  status: "idle",
  startedAt: null,
  accumulatedMs: 0,
  songId: null,
  exerciseId: null,
  bpm: null,
  song: null,
};

const STORAGE_KEY = "ostinara_practice_session";
/** Ancienne cle du chrono de Progression — purgee au premier chargement. */
const LEGACY_STORAGE_KEY = "ostinara_practice_timer";

// ---------------------------------------------------------------------------
// Store externe.
//
// useSyncExternalStore plutot qu'un useState hydrate dans un effet : l'etat
// vient de localStorage, donc il differe du rendu serveur. getServerSnapshot
// sert au rendu et a l'hydratation, getSnapshot prend le relais ensuite —
// pas de setState dans un effet, pas de mismatch d'hydratation.
// ---------------------------------------------------------------------------

let snapshot: StoredSession = IDLE;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): StoredSession {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return IDLE;
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed.status !== "running" && parsed.status !== "paused") return IDLE;
    return parsed;
  } catch {
    return IDLE;
  }
}

function writeStorage(next: StoredSession) {
  try {
    if (next.status === "idle") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Navigation privee ou stockage bloque : le chrono marche quand meme,
    // il ne survit simplement pas au rechargement.
  }
}

function getSnapshot(): StoredSession {
  if (!hydrated) {
    hydrated = true;
    snapshot = readStorage();
  }
  return snapshot;
}

function getServerSnapshot(): StoredSession {
  return IDLE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setSession(update: (current: StoredSession) => StoredSession) {
  snapshot = update(getSnapshot());
  writeStorage(snapshot);
  for (const listener of listeners) listener();
}

function elapsedOf(session: StoredSession): number {
  if (session.status === "running" && session.startedAt !== null) {
    return session.accumulatedMs + (Date.now() - session.startedAt);
  }
  return session.accumulatedMs;
}

// ---------------------------------------------------------------------------

export interface StartOptions {
  songId?: string | null;
  exerciseId?: string | null;
  bpm?: number | null;
  song?: SessionSong | null;
  /** L'exercice qu'on commence par travailler (au lieu d'un morceau). */
  exercise?: SessionExercise | null;
  /** Ouvre la session en plein ecran (depuis « Jouer »). */
  focus?: boolean;
  /** Les elements du deroule, pour proposer de l'enregistrer en fin de session. */
  programItems?: SaveSessionItemInput[];
}

interface PracticeSessionValue {
  status: PracticeSessionStatus;
  isActive: boolean;
  elapsedMs: number;
  elapsedSeconds: number;
  songId: string | null;
  exerciseId: string | null;
  bpm: number | null;
  start: (options?: StartOptions) => void;
  pause: () => void;
  resume: () => void;
  /** Arrete le chrono et ouvre la modale d'enregistrement. */
  stop: () => void;
  /** Arrete le chrono et jette la session. */
  cancel: () => void;
  song: SessionSong | null;
  setSongId: (songId: string | null, song?: SessionSong | null) => void;
  /** Passe a un exercice : son temps est compte a part, comme un morceau. */
  setExercise: (exercise: SessionExercise | null) => void;
  setBpm: (bpm: number | null) => void;
  /** Le mode plein ecran : chrono en grand, sans la barre d'onglets. */
  isFocused: boolean;
  openFocus: () => void;
  closeFocus: () => void;
  /** Ouvre la modale vide, pour une saisie manuelle. */
  openManualEntry: () => void;
  /**
   * Une session deja jouee, montee comme une session a jouer : la modale
   * s'ouvre avec ses morceaux, il ne reste qu'a dire combien de temps.
   */
  openPastSession: (songIds: string[], exercises?: SessionExercise[]) => void;
}

const PracticeSessionContext = createContext<PracticeSessionValue | null>(null);

export function usePracticeSession(): PracticeSessionValue {
  const context = useContext(PracticeSessionContext);
  if (!context) {
    throw new Error(
      "usePracticeSession doit être utilisé dans PracticeSessionProvider"
    );
  }
  return context;
}

interface PendingEntry {
  mode: "timer" | "manual";
  durationMinutes?: number;
  songId?: string | null;
  exerciseId?: string | null;
  bpm?: number | null;
  /** Les morceaux joues pendant le chrono, avec leur temps. */
  songTimes?: SessionSongTime[];
  /** Les exercices joues pendant le chrono, avec leur temps. */
  exerciseTimes?: SessionExerciseTime[];
  /** Le deroule joue, s'il y en avait un : propose routine/setlist en sortie. */
  programItems?: SaveSessionItemInput[];
  /** Saisie apres coup d'une session montee : ses morceaux et ses exercices. */
  songIds?: string[];
  exercises?: SessionExercise[];
}

export function PracticeSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [tick, setTick] = useState(0);
  const [pending, setPending] = useState<PendingEntry | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [exerciseCatalog, setExerciseCatalog] = useState<ExerciseWithProgress[]>([]);
  const [focused, setFocused] = useState(false);
  // En fin de session issue d'un deroule : proposer d'en faire une routine/setlist.
  const [savePrompt, setSavePrompt] = useState<SaveSessionItemInput[] | null>(null);

  // Le chrono n'est pas dans le state : on le recalcule a partir des
  // timestamps. Un onglet en arriere-plan ne fait pas deriver l'affichage,
  // et un rechargement retrouve la duree exacte.
  useEffect(() => {
    if (session.status !== "running") return;
    const interval = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [session.status]);

  const elapsedMs = useMemo(
    () => elapsedOf(session),
    // `tick` force le recalcul chaque seconde pendant que ca tourne.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, tick]
  );

  // Les morceaux ne servent qu'a la modale : on les charge a son ouverture
  // plutot que sur chaque page du layout.
  const loadSongs = useCallback(async () => {
    if (songs.length > 0) return;
    try {
      setSongs(await getSongs());
    } catch {
      setSongs([]);
    }
  }, [songs.length]);

  // De meme pour les exercices qu'on peut ajouter a la session.
  const loadExercises = useCallback(async () => {
    if (exerciseCatalog.length > 0) return;
    try {
      setExerciseCatalog(await getExercises());
    } catch {
      setExerciseCatalog([]);
    }
  }, [exerciseCatalog.length]);

  const start = useCallback((options?: StartOptions) => {
    const exercise = options?.songId ? null : options?.exercise ?? null;
    const exerciseKey = exercise ? exerciseKeyOf(exercise) : null;
    setSession(() => ({
      status: "running",
      startedAt: Date.now(),
      accumulatedMs: 0,
      songId: options?.songId ?? null,
      exerciseId: options?.exerciseId ?? null,
      exerciseKey,
      exerciseInfo: exercise && exerciseKey ? { [exerciseKey]: exercise } : {},
      bpm: options?.bpm ?? null,
      song: options?.song ?? null,
      songTimes: {},
      songStartMs: 0,
      songBpms: options?.songId && options?.bpm ? { [options.songId]: options.bpm } : {},
      programItems:
        options?.programItems && options.programItems.length > 0
          ? options.programItems
          : undefined,
    }));
    if (options?.focus) setFocused(true);
  }, []);

  const pause = useCallback(() => {
    setSession((current) =>
      current.status !== "running"
        ? current
        : {
            ...current,
            status: "paused",
            startedAt: null,
            accumulatedMs: elapsedOf(current),
          }
    );
  }, []);

  const resume = useCallback(() => {
    setSession((current) =>
      current.status !== "paused"
        ? current
        : { ...current, status: "running", startedAt: Date.now() }
    );
  }, []);

  const stop = useCallback(() => {
    const current = getSnapshot();
    if (current.status === "idle") return;

    // Une minute plancher : une session de 40 secondes reste une session.
    const durationMinutes = Math.max(1, Math.round(elapsedOf(current) / 60000));

    const bpms = { ...(current.songBpms ?? {}) };
    const key = timeKeyOf(current);
    if (key && current.bpm) bpms[key] = current.bpm;
    const exerciseTimes = sessionExerciseTimes(current, bpms);

    setSession(() => IDLE);
    setFocused(false);
    void loadSongs();
    void loadExercises();
    setPending({
      mode: "timer",
      durationMinutes,
      songId: current.songId,
      exerciseId: current.exerciseId,
      bpm: current.bpm,
      songTimes: sessionSongTimes(current, bpms, exerciseTimes.length > 0),
      exerciseTimes,
      // On ne propose d'enregistrer qu'un vrai deroule (au moins deux elements).
      programItems:
        current.programItems && current.programItems.length >= 2
          ? current.programItems
          : undefined,
    });
  }, [loadSongs, loadExercises]);

  const cancel = useCallback(() => {
    setSession(() => IDLE);
    setFocused(false);
  }, []);

  /*
   * Changer de morceau pendant la session ne remplace plus le precedent :
   * son temps est credite, et la session finit avec la liste de tout ce
   * qui a ete joue.
   */
  const setSongId = useCallback((songId: string | null, song?: SessionSong | null) => {
    setSession((current) => {
      if (songId === current.songId && !current.exerciseKey) {
        return { ...current, song: song === undefined ? current.song : song };
      }
      const bpms = { ...(current.songBpms ?? {}) };
      const key = timeKeyOf(current);
      if (key && current.bpm) bpms[key] = current.bpm;
      return {
        ...current,
        ...creditCurrentSong(current),
        songBpms: bpms,
        songId,
        exerciseKey: null,
        song: song === undefined ? current.song : song,
      };
    });
  }, []);

  const setExercise = useCallback((exercise: SessionExercise | null) => {
    setSession((current) => {
      const exerciseKey = exercise ? exerciseKeyOf(exercise) : null;
      if (current.status === "idle") return current;
      if (exerciseKey === (current.exerciseKey ?? null) && current.songId === null) return current;
      const bpms = { ...(current.songBpms ?? {}) };
      const key = timeKeyOf(current);
      if (key && current.bpm) bpms[key] = current.bpm;
      return {
        ...current,
        ...creditCurrentSong(current),
        songBpms: bpms,
        songId: null,
        song: null,
        exerciseId: exercise?.id ?? null,
        exerciseKey,
        exerciseInfo:
          exercise && exerciseKey
            ? { ...(current.exerciseInfo ?? {}), [exerciseKey]: exercise }
            : current.exerciseInfo,
      };
    });
  }, []);

  const openFocus = useCallback(() => setFocused(true), []);
  const closeFocus = useCallback(() => setFocused(false), []);

  const setBpm = useCallback((bpm: number | null) => {
    setSession((current) => ({ ...current, bpm }));
  }, []);

  const openManualEntry = useCallback(() => {
    void loadSongs();
    void loadExercises();
    setPending({ mode: "manual" });
  }, [loadSongs, loadExercises]);

  const openPastSession = useCallback((songIds: string[], exercises?: SessionExercise[]) => {
    void loadSongs();
    void loadExercises();
    setPending({ mode: "manual", songIds, exercises });
  }, [loadSongs, loadExercises]);

  const value = useMemo<PracticeSessionValue>(
    () => ({
      status: session.status,
      isActive: session.status !== "idle",
      elapsedMs,
      elapsedSeconds: Math.floor(elapsedMs / 1000),
      songId: session.songId,
      exerciseId: session.exerciseId,
      bpm: session.bpm,
      song: session.song ?? null,
      start,
      pause,
      resume,
      stop,
      cancel,
      setSongId,
      setExercise,
      setBpm,
      isFocused: focused && session.status !== "idle",
      openFocus,
      closeFocus,
      openManualEntry,
      openPastSession,
    }),
    [
      session.status,
      session.songId,
      session.exerciseId,
      session.bpm,
      session.song,
      focused,
      openFocus,
      closeFocus,
      elapsedMs,
      start,
      pause,
      resume,
      stop,
      cancel,
      setSongId,
      setExercise,
      setBpm,
      openManualEntry,
      openPastSession,
    ]
  );

  const pendingSong =
    pending?.songId != null
      ? songs.find((song) => song.id === pending.songId) ?? null
      : null;

  // Progression affiche deja le chrono en grand : y superposer la barre
  // dirait deux fois la meme chose au meme moment.
  const showBar = session.status !== "idle" && pathname !== "/profil" && !focused;
  const showFocus = session.status !== "idle" && focused;

  return (
    <PracticeSessionContext.Provider value={value}>
      {children}

      {showBar && <SessionBar />}
      {showFocus && <SessionFocus />}

      {pending && (
        <AddSessionModal
          isOpen
          mode={pending.mode}
          songs={songs}
          exercises={exerciseCatalog}
          timerDuration={pending.durationMinutes}
          timerSong={pendingSong}
          timerBpm={pending.bpm ?? undefined}
          timerSongTimes={pending.songTimes}
          initialSongIds={pending.songIds}
          timerExerciseTimes={pending.exerciseTimes}
          initialExercises={pending.exercises}
          onClose={() => {
            // Fermer sans enregistrer n'ecrit pas la session, mais on
            // propose quand meme d'en garder le deroule (routine/setlist).
            const program = pending.programItems;
            setPending(null);
            if (program && program.length >= 2) setSavePrompt(program);
          }}
          onSuccess={() => {
            // La progression des exercices s'ecrit avec la session, cote
            // serveur : abandonner la modale ne laisse rien a moitie ecrit.
            const entry = pending;
            setPending(null);
            if (entry.programItems && entry.programItems.length >= 2) {
              setSavePrompt(entry.programItems);
            }
            router.refresh();
          }}
        />
      )}

      {savePrompt && (
        <SessionSavePrompt
          items={savePrompt}
          onClose={() => setSavePrompt(null)}
        />
      )}
    </PracticeSessionContext.Provider>
  );
}

function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = rest.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * La barre de session, au-dessus de la barre d'onglets.
 *
 * Elle vivait dans PlayView : quitter "Jouer" la faisait disparaitre, et
 * avec elle le seul moyen d'arreter le chrono.
 */
function SessionBar() {
  const t = useTranslations("practice.sessionBar");
  const { status, elapsedSeconds, bpm, song, pause, resume, stop, cancel, openFocus } =
    usePracticeSession();

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 border-t border-border bg-card px-4 py-2.5 lg:bottom-0 lg:left-64">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        {/* Toute la partie gauche agrandit la session : c'est la plus grande cible. */}
        <button
          type="button"
          onClick={openFocus}
          aria-label={t("expand")}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${
              status === "running" ? "animate-pulse bg-destructive" : "bg-muted-foreground"
            }`}
          />
          <span className="tabular font-display text-2xl font-bold leading-none">
            {formatElapsed(elapsedSeconds)}
          </span>
          <span className="sr-only">
            {status === "paused" ? t("srPaused") : t("srRunning")}
          </span>
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {status === "paused" ? t("paused") : song?.title ?? t("session")}
            {bpm !== null && (
              <span className="tabular font-semibold text-primary"> · {bpm} BPM</span>
            )}
          </span>
          <Maximize2 className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={status === "running" ? pause : resume}
            aria-label={status === "running" ? t("pause") : t("resume")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent"
          >
            {status === "running" ? (
              <Pause className="h-4 w-4 fill-current" strokeWidth={0} aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-current" strokeWidth={0} aria-hidden="true" />
            )}
          </button>
          <button
            onClick={cancel}
            className="hidden min-h-[40px] rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent sm:block"
          >
            {t("cancel")}
          </button>
          <button
            onClick={stop}
            className="min-h-[40px] rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            {t("finish")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * La session en plein ecran (style Atelier, docs/refonte-ui.md).
 *
 * On joue : la barre d'onglets et la page s'effacent, le chrono prend
 * l'ecran et se lit a un metre du pupitre. « Reduire » rend la page
 * (le metronome est dessous) sans arreter quoi que ce soit.
 */
function SessionFocus() {
  const t = useTranslations("practice.sessionBar");
  const { status, elapsedSeconds, bpm, song, pause, resume, stop, cancel, closeFocus } =
    usePracticeSession();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFocus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeFocus]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("dialog")}
      className="fixed inset-0 z-[60] flex flex-col bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+16px)]"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full bg-current ${status === "running" ? "animate-pulse" : "opacity-50"}`}
          />
          {status === "paused" ? t("paused") : t("session")}
        </span>
        <button
          type="button"
          onClick={closeFocus}
          className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Minimize2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t("minimize")}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="tabular font-display text-[min(30vw,9rem)] font-extrabold leading-none" aria-live="off">
          {formatElapsed(elapsedSeconds)}
        </p>
        {bpm !== null && (
          <p className="tabular font-display text-2xl font-bold text-primary">
            {bpm} <span className="text-base text-muted-foreground">BPM</span>
          </p>
        )}

        {song && (
          <div className="mt-6 flex items-center gap-3 text-left">
            <Cover src={song.cover_url} className="h-12 w-12 rounded-[4px]" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{song.title}</p>
              <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto grid w-full max-w-md grid-cols-[auto_1fr] gap-2">
        <button
          onClick={status === "running" ? pause : resume}
          aria-label={status === "running" ? t("pause") : t("resume")}
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-border transition-colors hover:bg-accent"
        >
          {status === "running" ? (
            <Pause className="h-5 w-5 fill-current" strokeWidth={0} aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 h-5 w-5 fill-current" strokeWidth={0} aria-hidden="true" />
          )}
        </button>
        <button
          onClick={stop}
          className="h-14 rounded-xl bg-primary text-base font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t("finishSession")}
        </button>
        <button
          onClick={cancel}
          className="col-span-2 min-h-[40px] text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t("discard")}
        </button>
      </div>
    </div>
  );
}
