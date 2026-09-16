"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createPracticeSession } from "@/lib/actions/practice";
import {
  MAX_SYNC_ATTEMPTS,
  enqueueSession,
  markQueueFailure,
  readQueue,
  readSnapshot,
  removeFromQueue,
  resetQueueAttempts,
  writeSnapshot,
} from "@/lib/offline/db";
import type {
  CreatePracticeSessionInput,
  OfflineSnapshot,
  QueuedPracticeSession,
} from "@/types";

/**
 * Le hors-ligne, pour de vrai.
 *
 * L'app etait installable et se declarait PWA, mais chaque ecran passait
 * par un Server Component : dans une salle de repet' au sous-sol, ouvrir
 * l'app installee donnait une page blanche. C'est exactement la situation
 * ou on en a besoin.
 *
 * Trois responsabilites, et rien d'autre :
 *   1. garder une copie a jour de la bibliotheque et du journal ;
 *   2. accepter une session enregistree sans reseau, et la garder ;
 *   3. l'envoyer des que le reseau revient, sans rien demander.
 */

interface OfflineValue {
  /** `navigator.onLine`, corrige par les evenements. */
  isOnline: boolean;
  /** L'instantane local, `null` tant qu'il n'a jamais ete constitue. */
  snapshot: OfflineSnapshot | null;
  queue: QueuedPracticeSession[];
  /** Une synchronisation est en cours. */
  isSyncing: boolean;
  /**
   * Enregistre une session : directement si le reseau est la, en file
   * sinon. Rend `queued` pour que l'appelant sache quoi dire.
   */
  saveSession: (
    input: CreatePracticeSessionInput
  ) => Promise<{ success: boolean; queued: boolean; error?: string }>;
  /** Force l'envoi de la file. `force` relance aussi les envois abandonnes. */
  sync: (force?: boolean) => Promise<void>;
  /** Force le rafraichissement de l'instantane. */
  refreshSnapshot: () => Promise<void>;
}

const OfflineContext = createContext<OfflineValue | null>(null);

/**
 * Hors du provider, on rend un objet inerte plutot que de lever.
 *
 * Les modales de session sont montees dans des arbres varies (layout
 * principal, page de repli hors ligne) : les obliger toutes a vivre sous
 * le provider ferait echouer un ecran pour une commodite.
 */
export function useOffline(): OfflineValue {
  const context = useContext(OfflineContext);
  if (context) return context;

  return {
    isOnline: true,
    snapshot: null,
    queue: [],
    isSyncing: false,
    saveSession: async (input) => {
      const result = await createPracticeSession(input);
      return {
        success: result.success,
        queued: false,
        error: result.error,
      };
    },
    sync: async () => {},
    refreshSnapshot: async () => {},
  };
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Le rendu serveur ne connait pas l'etat du reseau : on part de
  // « en ligne » et on corrige au montage. L'inverse afficherait le
  // bandeau une fraction de seconde a chaque chargement.
  const [isOnline, setIsOnline] = useState(true);
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);
  const [queue, setQueue] = useState<QueuedPracticeSession[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Deux evenements « online » rapproches ne doivent pas lancer deux
  // vidages concurrents : la meme session partirait deux fois.
  const syncingRef = useRef(false);

  const refreshSnapshot = useCallback(async () => {
    try {
      const response = await fetch("/api/offline/snapshot", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const fresh = (await response.json()) as OfflineSnapshot;
      await writeSnapshot(fresh);
      setSnapshot(fresh);
    } catch {
      // Hors ligne : l'instantane precedent reste valable, c'est tout
      // l'interet d'en avoir un.
    }
  }, []);

  /**
   * Vide la file.
   *
   * `force` relance aussi les sessions qui ont epuise leurs tentatives :
   * c'est ce que fait le bouton « Réessayer » du bandeau. Sans lui, ce
   * bouton n'aurait aucun effet sur les seules sessions dont on se
   * preoccupe encore.
   */
  const sync = useCallback(async (force = false) => {
    if (syncingRef.current) return;

    if (force) await resetQueueAttempts();

    const pending = await readQueue();
    const sendable = pending.filter(
      (entry) => force || entry.attempts < MAX_SYNC_ATTEMPTS
    );
    if (sendable.length === 0) {
      setQueue(pending);
      return;
    }

    syncingRef.current = true;
    setIsSyncing(true);

    let sent = 0;

    // En serie, pas en parallele : l'ordre des sessions est celui dans
    // lequel elles ont ete jouees, et chaque insertion declenche le
    // recalcul de la progression du morceau.
    for (const entry of sendable) {
      try {
        const result = await createPracticeSession(entry.input);
        if (result.success) {
          await removeFromQueue(entry.localId);
          sent += 1;
        } else {
          await markQueueFailure(entry, result.error ?? "Échec");
        }
      } catch (error) {
        await markQueueFailure(
          entry,
          error instanceof Error ? error.message : "Réseau indisponible"
        );
        // Le reseau est reparti : inutile d'insister sur les suivantes.
        break;
      }
    }

    setQueue(await readQueue());
    syncingRef.current = false;
    setIsSyncing(false);

    if (sent > 0) {
      await refreshSnapshot();
      router.refresh();
    }
  }, [refreshSnapshot, router]);

  const saveSession = useCallback<OfflineValue["saveSession"]>(
    async (input) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueSession(input);
        setQueue(await readQueue());
        return { success: true, queued: true };
      }

      try {
        const result = await createPracticeSession(input);
        if (result.success) return { success: true, queued: false };
        return { success: false, queued: false, error: result.error };
      } catch {
        /*
         * Le reseau a lache pendant l'envoi. `navigator.onLine` disait
         * « en ligne » — il ment souvent, notamment sur un wifi capte
         * mais sans route. On met en file plutot que de perdre la
         * session : c'est le seul cas ou l'app a vraiment quelque chose
         * a perdre.
         */
        await enqueueSession(input);
        setQueue(await readQueue());
        return { success: true, queued: true };
      }
    },
    []
  );

  // Etat initial : ce qu'on a en local, puis ce que le serveur en dit.
  useEffect(() => {
    let cancelled = false;

    setIsOnline(navigator.onLine);

    void (async () => {
      const [stored, pending] = await Promise.all([readSnapshot(), readQueue()]);
      if (cancelled) return;
      if (stored) setSnapshot(stored);
      setQueue(pending);

      if (navigator.onLine) {
        await refreshSnapshot();
        await sync();
      }
    })();

    return () => {
      cancelled = true;
    };
    // Au montage uniquement : `sync` et `refreshSnapshot` sont stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le retour du reseau vide la file, sans rien demander.
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void sync();
      void refreshSnapshot();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sync, refreshSnapshot]);

  /*
   * L'instantane se rafraichit aussi au retour dans l'onglet.
   *
   * Descendre au sous-sol, c'est souvent ouvrir l'app juste avant : la
   * copie doit dater de quelques secondes, pas du dernier chargement
   * complet de la page.
   */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void refreshSnapshot();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshSnapshot]);

  const value = useMemo<OfflineValue>(
    () => ({
      isOnline,
      snapshot,
      queue,
      isSyncing,
      saveSession,
      sync,
      refreshSnapshot,
    }),
    [isOnline, snapshot, queue, isSyncing, saveSession, sync, refreshSnapshot]
  );

  return (
    <OfflineContext.Provider value={value}>
      {children}
      <OfflineBanner />
    </OfflineContext.Provider>
  );
}

/**
 * Le bandeau.
 *
 * Il ne s'affiche que quand il dit quelque chose : hors ligne, ou en
 * ligne avec des sessions encore en attente. Un indicateur permanent
 * « connecte » serait du bruit.
 */
function OfflineBanner() {
  const { isOnline, queue, isSyncing, sync } = useOffline();

  const pending = queue.filter((entry) => entry.attempts < MAX_SYNC_ATTEMPTS);
  const stuck = queue.filter((entry) => entry.attempts >= MAX_SYNC_ATTEMPTS);

  if (isOnline && pending.length === 0 && stuck.length === 0) return null;

  const label = !isOnline
    ? pending.length > 0
      ? `Hors ligne · ${pending.length} session${pending.length > 1 ? "s" : ""} en attente`
      : "Hors ligne · bibliothèque et journal en cache"
    : stuck.length > 0
      ? `${stuck.length} session${stuck.length > 1 ? "s" : ""} n'ont pas pu être envoyées`
      : isSyncing
        ? "Envoi des sessions enregistrées hors ligne…"
        : `${pending.length} session${pending.length > 1 ? "s" : ""} à envoyer`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:bottom-4 lg:left-64"
    >
      <p
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-lg ${
          stuck.length > 0
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-border bg-card text-muted-foreground"
        }`}
      >
        <span
          aria-hidden="true"
          className={`material-symbols-outlined text-[18px] ${
            isSyncing ? "animate-spin" : ""
          }`}
        >
          {isSyncing ? "progress_activity" : isOnline ? "cloud_upload" : "cloud_off"}
        </span>
        <span>{label}</span>

        {isOnline && !isSyncing && (pending.length > 0 || stuck.length > 0) && (
          <button
            type="button"
            onClick={() => void sync(true)}
            className="ml-1 rounded-lg px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Réessayer
          </button>
        )}
      </p>
    </div>
  );
}
