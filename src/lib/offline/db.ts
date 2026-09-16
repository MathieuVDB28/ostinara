/**
 * Le magasin hors ligne.
 *
 * Ostinara est une PWA installable dont chaque ecran est un Server
 * Component : au sous-sol, sans barre, l'app installee ouvrait une page
 * blanche. Ce qu'un guitariste a besoin de lire la-bas tient en deux
 * choses — sa bibliotheque et son journal — et ce qu'il a besoin
 * d'ecrire en une : la session qu'il vient de faire.
 *
 * IndexedDB, sans dependance : `localStorage` est synchrone et plafonne
 * a quelques megaoctets, ce qui ne suffit pas pour deux cents morceaux
 * avec leurs pochettes en cache. Toutes les fonctions rendent une valeur
 * de repli plutot que de lever : en navigation privee, en mode « site
 * data bloque » ou pendant une capture de vignette, l'API peut echouer
 * a l'ouverture, et l'app doit continuer a marcher.
 */

import type {
  CreatePracticeSessionInput,
  OfflineSnapshot,
  QueuedPracticeSession,
} from "@/types";

const DB_NAME = "ostinara-offline";
const DB_VERSION = 1;

const SNAPSHOT_STORE = "snapshot";
const QUEUE_STORE = "queue";

/** Une seule cle : il n'y a qu'un instantane, celui du compte connecte. */
const SNAPSHOT_KEY = "current";

/** Au-dela, on cesse de reessayer : la session reste, visible et signalee. */
export const MAX_SYNC_ATTEMPTS = 5;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE);
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "localId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    // Une version plus recente est ouverte dans un autre onglet : on
    // renonce silencieusement plutot que de rester en attente.
    request.onblocked = () => resolve(null);
  });
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  return openDatabase().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const transaction = db.transaction(storeName, mode);
          const request = work(transaction.objectStore(storeName));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
          transaction.oncomplete = () => db.close();
        } catch {
          resolve(null);
        }
      })
  );
}

// ---------------------------------------------------------------------------
// L'instantane
// ---------------------------------------------------------------------------

export async function readSnapshot(): Promise<OfflineSnapshot | null> {
  const value = await runTransaction<OfflineSnapshot>(
    SNAPSHOT_STORE,
    "readonly",
    (store) => store.get(SNAPSHOT_KEY)
  );
  return value ?? null;
}

export async function writeSnapshot(snapshot: OfflineSnapshot): Promise<void> {
  await runTransaction(SNAPSHOT_STORE, "readwrite", (store) =>
    store.put(snapshot, SNAPSHOT_KEY)
  );
}

/** A la deconnexion : l'instantane d'un compte ne doit pas survivre a un autre. */
export async function clearSnapshot(): Promise<void> {
  await runTransaction(SNAPSHOT_STORE, "readwrite", (store) =>
    store.delete(SNAPSHOT_KEY)
  );
}

// ---------------------------------------------------------------------------
// La file d'attente
// ---------------------------------------------------------------------------

export async function readQueue(): Promise<QueuedPracticeSession[]> {
  const value = await runTransaction<QueuedPracticeSession[]>(
    QUEUE_STORE,
    "readonly",
    (store) => store.getAll()
  );
  return (value ?? []).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

/**
 * Met une session en attente d'envoi.
 *
 * L'identifiant est local et le restera : la ligne en base recevra le
 * sien a l'envoi. Les deux ne se confondent jamais — c'est ce qui permet
 * d'afficher une session en attente a cote des sessions enregistrees
 * sans risquer de la compter deux fois.
 */
export async function enqueueSession(
  input: CreatePracticeSessionInput
): Promise<QueuedPracticeSession> {
  const entry: QueuedPracticeSession = {
    localId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queuedAt: new Date().toISOString(),
    input: {
      ...input,
      // Sans horodatage explicite, la session prendrait la date de
      // l'envoi — c'est-a-dire le moment ou l'on retrouve du reseau,
      // parfois le lendemain.
      practiced_at: input.practiced_at ?? new Date().toISOString(),
    },
    attempts: 0,
  };

  await runTransaction(QUEUE_STORE, "readwrite", (store) => store.put(entry));
  return entry;
}

export async function removeFromQueue(localId: string): Promise<void> {
  await runTransaction(QUEUE_STORE, "readwrite", (store) =>
    store.delete(localId)
  );
}

export async function markQueueFailure(
  entry: QueuedPracticeSession,
  message: string
): Promise<void> {
  await runTransaction(QUEUE_STORE, "readwrite", (store) =>
    store.put({ ...entry, attempts: entry.attempts + 1, lastError: message })
  );
}

/**
 * Remet les compteurs de tentatives a zero.
 *
 * Une session abandonnee apres cinq echecs ne doit pas l'etre
 * definitivement : le bouton « Réessayer » du bandeau passe par ici.
 */
export async function resetQueueAttempts(): Promise<void> {
  const entries = await readQueue();
  for (const entry of entries) {
    if (entry.attempts === 0) continue;
    await runTransaction(QUEUE_STORE, "readwrite", (store) =>
      store.put({ ...entry, attempts: 0, lastError: undefined })
    );
  }
}

export async function clearQueue(): Promise<void> {
  await runTransaction(QUEUE_STORE, "readwrite", (store) => store.clear());
}
