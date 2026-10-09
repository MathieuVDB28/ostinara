"use client";

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
import { updateUserExerciseProgress } from "@/lib/actions/exercises";
import { AddSessionModal } from "@/components/progress/add-session-modal";
import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import type { Song } from "@/types";

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
  /** Ouvre la session en plein ecran (depuis « Jouer »). */
  focus?: boolean;
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
  setBpm: (bpm: number | null) => void;
  /** Le mode plein ecran : chrono en grand, sans la barre d'onglets. */
  isFocused: boolean;
  openFocus: () => void;
  closeFocus: () => void;
  /** Ouvre la modale vide, pour une saisie manuelle. */
  openManualEntry: () => void;
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
}

export function PracticeSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [tick, setTick] = useState(0);
  const [pending, setPending] = useState<PendingEntry | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [focused, setFocused] = useState(false);

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

  const start = useCallback((options?: StartOptions) => {
    setSession(() => ({
      status: "running",
      startedAt: Date.now(),
      accumulatedMs: 0,
      songId: options?.songId ?? null,
      exerciseId: options?.exerciseId ?? null,
      bpm: options?.bpm ?? null,
      song: options?.song ?? null,
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

    setSession(() => IDLE);
    setFocused(false);
    void loadSongs();
    setPending({
      mode: "timer",
      durationMinutes,
      songId: current.songId,
      exerciseId: current.exerciseId,
      bpm: current.bpm,
    });
  }, [loadSongs]);

  const cancel = useCallback(() => {
    setSession(() => IDLE);
    setFocused(false);
  }, []);

  const setSongId = useCallback((songId: string | null, song?: SessionSong | null) => {
    setSession((current) => ({
      ...current,
      songId,
      song: song === undefined ? current.song : song,
    }));
  }, []);

  const openFocus = useCallback(() => setFocused(true), []);
  const closeFocus = useCallback(() => setFocused(false), []);

  const setBpm = useCallback((bpm: number | null) => {
    setSession((current) => ({ ...current, bpm }));
  }, []);

  const openManualEntry = useCallback(() => {
    void loadSongs();
    setPending({ mode: "manual" });
  }, [loadSongs]);

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
      setBpm,
      isFocused: focused && session.status !== "idle",
      openFocus,
      closeFocus,
      openManualEntry,
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
      setBpm,
      openManualEntry,
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
          timerDuration={pending.durationMinutes}
          timerSong={pendingSong}
          timerBpm={pending.bpm ?? undefined}
          onClose={() => setPending(null)}
          onSuccess={() => {
            // La progression de l'exercice suit l'enregistrement de la
            // session, pas le clic sur "Terminer" : abandonner la modale
            // ne doit pas laisser une trace a moitie ecrite.
            const entry = pending;
            // Sans tempo, une progression d'exercice ne dit rien : la
            // progression d'un exercice, c'est le tempo atteint.
            if (entry.exerciseId && entry.durationMinutes && entry.bpm) {
              void updateUserExerciseProgress({
                exercise_id: entry.exerciseId,
                current_bpm: entry.bpm,
                duration_minutes: entry.durationMinutes,
                bpm_achieved: entry.bpm,
              });
            }
            setPending(null);
            router.refresh();
          }}
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
  const { status, elapsedSeconds, bpm, song, pause, resume, stop, cancel, openFocus } =
    usePracticeSession();

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 border-t border-border bg-card px-4 py-2.5 lg:bottom-0 lg:left-64">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        {/* Toute la partie gauche agrandit la session : c'est la plus grande cible. */}
        <button
          type="button"
          onClick={openFocus}
          aria-label="Afficher la session en plein écran"
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
            Session de pratique {status === "paused" ? "en pause" : "en cours"}
          </span>
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {status === "paused" ? "En pause" : song?.title ?? "Session"}
            {bpm !== null && (
              <span className="tabular font-semibold text-primary"> · {bpm} BPM</span>
            )}
          </span>
          <Maximize2 className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={status === "running" ? pause : resume}
            aria-label={status === "running" ? "Mettre en pause" : "Reprendre"}
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
            Annuler
          </button>
          <button
            onClick={stop}
            className="min-h-[40px] rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Terminer
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
      aria-label="Session de pratique"
      className="fixed inset-0 z-[60] flex flex-col bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+16px)]"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-destructive">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full bg-current ${status === "running" ? "animate-pulse" : "opacity-50"}`}
          />
          {status === "paused" ? "En pause" : "Session"}
        </span>
        <button
          type="button"
          onClick={closeFocus}
          className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Minimize2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Réduire
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
          aria-label={status === "running" ? "Mettre en pause" : "Reprendre"}
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
          Terminer la session
        </button>
        <button
          onClick={cancel}
          className="col-span-2 min-h-[40px] text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Annuler sans enregistrer
        </button>
      </div>
    </div>
  );
}
