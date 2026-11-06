"use client";

import { useCallback, useEffect, useRef } from "react";
import { bestClockOffset, type ClockSample } from "@/lib/metronome-sync";

const SAMPLES = 5;

/**
 * Une horloge commune a tous les appareils d'une jam : celle du serveur, estimee
 * au montage. Sans reseau, l'heure de l'appareil en tient lieu. Elle part de
 * `performance.now`, qu'un reglage de l'heure du telephone ne fait pas sauter.
 */
export function useSharedClock(): () => number {
  const offsetRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const measure = async () => {
      const samples: ClockSample[] = [];
      for (let i = 0; i < SAMPLES && !cancelled; i++) {
        try {
          const sentAt = performance.now();
          const response = await fetch("/api/time", { cache: "no-store" });
          const { now } = (await response.json()) as { now: number };
          samples.push({ sentAt, receivedAt: performance.now(), serverNow: now });
        } catch {
          // Un echantillon de moins : les autres suffisent.
        }
      }
      const offset = bestClockOffset(samples);
      if (!cancelled && offset !== null) offsetRef.current = offset;
    };

    void measure();
    return () => {
      cancelled = true;
    };
  }, []);

  return useCallback(
    () => performance.now() + (offsetRef.current ?? performance.timeOrigin),
    []
  );
}
