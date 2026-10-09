"use client";

import { useEffect } from "react";
import { Play, Square } from "lucide-react";
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

  /*
   * Style Atelier (docs/refonte-ui.md) : plus de carte autour. Le tempo
   * en tres grand, lisible a un metre du pupitre ; les temps juste
   * dessous ; les reglages en grille a filets ; un seul gros bouton.
   */
  return (
    <div className={`flex flex-col items-center gap-5 ${className}`}>
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
        beats={
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
        }
        tap={
          <TapTempo
            onTap={metronome.tap}
            tapBpm={metronome.tapBpm}
            onReset={metronome.resetTapTempo}
          />
        }
      />

      {/* Le bouton : ambre pour lancer, encre pour arreter. */}
      <button
        onClick={handleToggle}
        aria-label={metronome.isPlaying ? "Arrêter le métronome" : "Lancer le métronome"}
        aria-pressed={metronome.isPlaying}
        className={`flex h-[76px] w-[76px] items-center justify-center rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          metronome.isPlaying
            ? "bg-foreground text-background"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {metronome.isPlaying ? (
          <Square className="h-6 w-6 fill-current" strokeWidth={0} aria-hidden="true" />
        ) : (
          <Play className="ml-1 h-7 w-7 fill-current" strokeWidth={0} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
