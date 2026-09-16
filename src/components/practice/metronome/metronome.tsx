"use client";

import { useEffect } from "react";
import { useMetronome } from "@/lib/hooks/use-metronome";
import { MetronomeControls } from "./metronome-controls";
import { MetronomeVisualizer } from "./metronome-visualizer";
import { TapTempo } from "./tap-tempo";

interface MetronomeProps {
  initialBpm?: number;
  /**
   * Tempo impose de l'exterieur — « Reprendre a 96 BPM » regle le
   * metronome sans que personne ne touche au curseur.
   *
   * L'objet change d'identite a chaque demande, meme pour la meme valeur :
   * reprendre deux fois a 96 BPM doit recaler le metronome les deux fois,
   * y compris apres que l'utilisateur l'a bouge entre-temps.
   */
  bpmRequest?: { bpm: number; id: number } | null;
  onBpmChange?: (bpm: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  className?: string;
}

export function Metronome({
  initialBpm = 120,
  bpmRequest = null,
  onBpmChange,
  onPlayingChange,
  className = "",
}: MetronomeProps) {
  const metronome = useMetronome({
    initialBpm,
    onBeat: (beat, isAccent) => {
      // Callback optionnel pour synchroniser avec d'autres éléments
    },
  });

  const { setBpm } = metronome;

  useEffect(() => {
    if (!bpmRequest) return;
    setBpm(bpmRequest.bpm);
  }, [bpmRequest, setBpm]);

  // Notifier les changements
  const handleBpmChange = (bpm: number) => {
    metronome.setBpm(bpm);
    onBpmChange?.(bpm);
  };

  const handleBpmIncrement = (delta: number) => {
    metronome.incrementBpm(delta);
    onBpmChange?.(metronome.bpm + delta);
  };

  const handleToggle = () => {
    metronome.toggle();
    onPlayingChange?.(!metronome.isPlaying);
  };

  return (
    <div
      className={`flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Métronome</h2>
        {metronome.isPlaying && (
          <span className="flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            En cours
          </span>
        )}
      </div>

      {/* Visualizer */}
      <MetronomeVisualizer
        timeSignature={metronome.timeSignature}
        currentBeat={metronome.currentBeat}
        accentPattern={metronome.accentPattern}
        silentMode={metronome.silentMode}
        silentBeats={metronome.silentBeats}
        isPlaying={metronome.isPlaying}
        onToggleAccent={metronome.toggleAccent}
        onToggleSilent={metronome.toggleSilentBeat}
      />

      {/* Controls */}
      <MetronomeControls
        bpm={metronome.bpm}
        timeSignature={metronome.timeSignature}
        subdivision={metronome.subdivision}
        volume={metronome.volume}
        silentMode={metronome.silentMode}
        onBpmChange={handleBpmChange}
        onBpmIncrement={handleBpmIncrement}
        onTimeSignatureChange={metronome.setTimeSignature}
        onSubdivisionChange={metronome.setSubdivision}
        onVolumeChange={metronome.setVolume}
        onSilentModeChange={metronome.setSilentMode}
      />

      {/* Tap Tempo */}
      <TapTempo
        onTap={metronome.tap}
        tapBpm={metronome.tapBpm}
        onReset={metronome.resetTapTempo}
      />

      {/* Play/Stop Button */}
      <button
        onClick={handleToggle}
        className={`flex h-14 items-center justify-center gap-2 rounded-xl text-lg font-semibold transition-all ${
          metronome.isPlaying
            ? "bg-destructive text-destructive-foreground hover:opacity-90"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {metronome.isPlaying ? (
          <>
            <svg
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            <span>STOP</span>
          </>
        ) : (
          <>
            <svg
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>PLAY</span>
          </>
        )}
      </button>
    </div>
  );
}
