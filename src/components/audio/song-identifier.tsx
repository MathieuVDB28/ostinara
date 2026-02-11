"use client";

import { useState, useCallback } from "react";
import { useAudioRecorder } from "@/lib/hooks/use-audio-recorder";
import { ListeningAnimation } from "./listening-animation";
import { IdentificationResult } from "./identification-result";
import type { AudioIdentificationResult } from "@/types";

const RECORDING_DURATION = 8;

type IdentifierState = "idle" | "recording" | "identifying" | "result" | "no-match" | "error";

export function SongIdentifier() {
  const [state, setState] = useState<IdentifierState>("idle");
  const [result, setResult] = useState<AudioIdentificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorder = useAudioRecorder({ maxDuration: RECORDING_DURATION });

  const handleListen = useCallback(async () => {
    setState("recording");
    setResult(null);
    setErrorMessage(null);

    await recorder.startRecording();

    // The recorder will auto-stop after RECORDING_DURATION.
    // We wait a bit longer to ensure the onstop event fires.
  }, [recorder]);

  // Watch for recording end to trigger identification
  const handleStopAndIdentify = useCallback(async () => {
    setState("identifying");

    const blob = await recorder.stopRecording();
    if (!blob) {
      setState("error");
      setErrorMessage("Enregistrement échoué. Réessaie.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const response = await fetch("/api/audio/identify", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setState("error");
        setErrorMessage(data.error || "Erreur lors de l'identification");
        return;
      }

      if (data.result) {
        setResult(data.result);
        setState("result");
      } else {
        setState("no-match");
      }
    } catch {
      setState("error");
      setErrorMessage("Erreur de connexion. Vérifie ta connexion internet.");
    }
  }, [recorder]);

  const handleRetry = useCallback(() => {
    setState("idle");
    setResult(null);
    setErrorMessage(null);
  }, []);

  // Auto-identify when recording reaches max duration
  // We detect this by checking if recorder stopped recording
  const isRecordingButShouldStop = !recorder.isRecording && state === "recording";
  if (isRecordingButShouldStop) {
    handleStopAndIdentify();
  }

  return (
    <div className="flex flex-col items-center px-4 py-8">
      {/* Idle state */}
      {state === "idle" && (
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-16 w-16 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 10v2a7 7 0 0 1-14 0v-2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
              <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
            </svg>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold">Identifier un morceau</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Joue un morceau à proximité ou chante la mélodie. L'app l'identifiera en quelques secondes.
            </p>
          </div>

          <button
            onClick={handleListen}
            className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 hover:shadow-lg hover:shadow-primary/25"
          >
            Écouter
          </button>

          {recorder.error && (
            <p className="max-w-sm text-center text-sm text-red-400">{recorder.error}</p>
          )}
        </div>
      )}

      {/* Recording state */}
      {state === "recording" && recorder.isRecording && (
        <div className="flex flex-col items-center gap-6">
          <ListeningAnimation duration={recorder.duration} maxDuration={RECORDING_DURATION} />
          <button
            onClick={handleStopAndIdentify}
            className="rounded-full border border-border px-6 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Identifier maintenant
          </button>
        </div>
      )}

      {/* Identifying state */}
      {state === "identifying" && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Identification en cours...</p>
        </div>
      )}

      {/* Result state */}
      {state === "result" && result && (
        <IdentificationResult result={result} onRetry={handleRetry} />
      )}

      {/* No match state */}
      {state === "no-match" && (
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <svg className="h-10 w-10 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              <path d="M8 11h6" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Morceau non reconnu</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Essaie de te rapprocher de la source audio ou dans un environnement plus calme.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-10 w-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="font-semibold">Erreur</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {errorMessage || "Une erreur est survenue."}
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
