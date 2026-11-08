"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMetronome } from "@/lib/hooks/use-metronome";
import { MetronomeControls } from "./metronome-controls";
import { MetronomeVisualizer } from "./metronome-visualizer";
import { TapTempo } from "./tap-tempo";
import { TempoRampPanel, useRampSettings, useTempoRamp } from "./tempo-ramp";
import type { UserPlan } from "@/types";

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
  /** La montee de tempo automatique est reservee a Pro et Band. */
  userPlan?: UserPlan;
  className?: string;
}

export function Metronome({
  initialBpm = 120,
  bpmRequest = null,
  onBpmChange,
  onPlayingChange,
  userPlan,
  className = "",
}: MetronomeProps) {
  const t = useTranslations("metronome");
  const [rampEnabled, setRampEnabled] = useState(false);
  const ramp = useRampSettings(initialBpm);
  // La montee compte les premiers temps : le hook du metronome les signale.
  const downbeatRef = useRef<(() => void) | null>(null);
  const metronome = useMetronome({
    initialBpm,
    onBeat: (beat) => {
      if (beat === 1) downbeatRef.current?.();
    },
  });

  const { setBpm } = metronome;
  const rampSetBpm = (bpm: number) => {
    setBpm(bpm);
    onBpmChange?.(bpm);
  };
  const rampState = useTempoRamp({
    enabled: rampEnabled,
    settings: ramp.settings,
    isPlaying: metronome.isPlaying,
    bpm: metronome.bpm,
    setBpm: rampSetBpm,
  });
  const { onDownbeat } = rampState;
  useEffect(() => {
    downbeatRef.current = onDownbeat;
  }, [onDownbeat]);

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
    if (!metronome.isPlaying && rampEnabled) rampState.onStart();
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
        aria-label={metronome.isPlaying ? t("stop") : t("start")}
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

      {userPlan && (
        <TempoRampPanel
          isPro={userPlan !== "free"}
          enabled={rampEnabled}
          onEnabledChange={setRampEnabled}
          settings={ramp.settings}
          onSettingsChange={ramp.setSettings}
          isPlaying={metronome.isPlaying}
          remaining={rampState.remaining}
          atCeiling={rampState.atCeiling}
          currentBpm={metronome.bpm}
          onOpen={ramp.load}
        />
      )}
    </div>
  );
}
