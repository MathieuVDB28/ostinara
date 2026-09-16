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
}

const IDLE: StoredSession = {
  status: "idle",
  startedAt: null,
  accumulatedMs: 0,
  songId: null,
  exerciseId: null,
  bpm: null,
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
  setSongId: (songId: string | null) => void;
  setBpm: (bpm: number | null) => void;
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
    }));
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
  }, []);

  const setSongId = useCallback((songId: string | null) => {
    setSession((current) => ({ ...current, songId }));
  }, []);

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
      start,
      pause,
      resume,
      stop,
      cancel,
      setSongId,
      setBpm,
      openManualEntry,
    }),
    [
      session.status,
      session.songId,
      session.exerciseId,
      session.bpm,
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
  const showBar = session.status !== "idle" && pathname !== "/profil";

  return (
    <PracticeSessionContext.Provider value={value}>
      {children}

      {showBar && <SessionBar />}

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
  const { status, elapsedSeconds, bpm, pause, resume, stop, cancel } =
    usePracticeSession();

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 border-t border-border bg-card p-3 lg:bottom-0 lg:left-64">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              status === "running"
                ? "animate-pulse bg-success"
                : "bg-muted-foreground"
            }`}
          />
          <span className="tabular font-mono text-lg font-semibold">
            {formatElapsed(elapsedSeconds)}
          </span>
          <span className="sr-only">
            Session de pratique {status === "paused" ? "en pause" : "en cours"}
          </span>
          {status === "paused" && (
            <span className="text-sm text-muted-foreground">En pause</span>
          )}
          {bpm !== null && (
            <span className="tabular text-sm font-medium text-primary">
              {bpm} BPM
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={status === "running" ? pause : resume}
            className="min-h-[44px] rounded-xl border border-input px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            {status === "running" ? "Pause" : "Reprendre"}
          </button>
          <button
            onClick={cancel}
            className="min-h-[44px] rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            Annuler
          </button>
          <button
            onClick={stop}
            className="min-h-[44px] rounded-xl bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-opacity hover:opacity-90"
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}
