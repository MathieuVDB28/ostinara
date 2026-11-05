"use client";

import { useEffect } from "react";

/**
 * Garde l'ecran allume tant que `active` est vrai. Le navigateur relache le
 * verrou quand la page passe en arriere-plan : on le reprend au retour. Sans
 * prise en charge ou en cas de refus, l'ecran suit simplement ses reglages.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Refus du navigateur (batterie faible, cadre restreint) : rien a faire.
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", acquire);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release();
    };
  }, [active]);
}
