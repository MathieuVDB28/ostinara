"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BAND_RECORDING_MAX_MIC_SECONDS } from "@/lib/band-recordings";
import { useWakeLock } from "./use-wake-lock";

export type LongRecorderError = "denied" | "unsupported" | null;

export interface LongRecording {
  blob: Blob;
  mimeType: string;
  /** Mesuree au chrono : le webm de MediaRecorder n'annonce pas sa duree. */
  durationSeconds: number;
}

/** Le premier format que le navigateur sait produire (Safari : mp4). */
function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

/**
 * Un enregistrement au micro de longue duree (une repete entiere) : chrono,
 * ecran garde allume, arret automatique au bout de 3 h. Les donnees arrivent
 * par tranches de 5 s, pour ne pas tout perdre si la page se fige.
 */
export function useLongRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<LongRecorderError>(null);
  const [maxReached, setMaxReached] = useState(false);
  const [result, setResult] = useState<LongRecording | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useWakeLock(recording);

  const release = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setMaxReached(false);
    setResult(null);
    const mimeType = pickMimeType();
    if (mimeType === null || !navigator.mediaDevices?.getUserMedia) {
      setError("unsupported");
      return;
    }

    let stream: MediaStream;
    try {
      // Pas de traitement « appel » : on veut la piece telle qu'elle sonne.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      setError("denied");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const durationSeconds = (Date.now() - startedAtRef.current) / 1000;
      const type = recorder.mimeType || mimeType || "audio/webm";
      setResult({ blob: new Blob(chunksRef.current, { type }), mimeType: type, durationSeconds });
      chunksRef.current = [];
      recorderRef.current = null;
      setRecording(false);
      release();
    };

    startedAtRef.current = Date.now();
    setElapsed(0);
    recorder.start(5000);
    setRecording(true);
    timerRef.current = setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= BAND_RECORDING_MAX_MIC_SECONDS) {
        setMaxReached(true);
        stop();
      }
    }, 250);
  }, [release, stop]);

  const reset = useCallback(() => {
    setResult(null);
    setElapsed(0);
    setMaxReached(false);
  }, []);

  // Quitter la page coupe le micro.
  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      release();
    },
    [release]
  );

  return { recording, elapsed, error, maxReached, result, start, stop, reset };
}
