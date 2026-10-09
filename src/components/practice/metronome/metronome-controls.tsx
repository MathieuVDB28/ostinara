"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Volume2, VolumeX } from "lucide-react";
import { TIME_SIGNATURES, SUBDIVISION_LABELS } from "@/types";
import type { TimeSignature, Subdivision } from "@/types";

interface MetronomeControlsProps {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  volume: number;
  silentMode: boolean;
  onBpmChange: (bpm: number) => void;
  onBpmIncrement: (delta: number) => void;
  onTimeSignatureChange: (ts: TimeSignature) => void;
  onSubdivisionChange: (sub: Subdivision) => void;
  onVolumeChange: (vol: number) => void;
  onSilentModeChange: (enabled: boolean) => void;
  /** Les temps de la mesure, places juste sous le tempo. */
  beats?: ReactNode;
  /** Le tap tempo, sur la rangee des pas de -5 / +5. */
  tap?: ReactNode;
}

const SUBDIVISIONS: Subdivision[] = ["none", "eighth", "triplet", "sixteenth"];

/**
 * Les reglages du metronome, style Atelier (docs/refonte-ui.md).
 *
 * Le tempo d'abord, en tres grand : c'est le seul chiffre qu'on lit en
 * jouant. Le reste — mesure, subdivision, volume, silence — tient dans
 * une grille a filets qu'on regle une fois.
 */
export function MetronomeControls({
  bpm,
  timeSignature,
  subdivision,
  volume,
  silentMode,
  onBpmChange,
  onBpmIncrement,
  onTimeSignatureChange,
  onSubdivisionChange,
  onVolumeChange,
  onSilentModeChange,
  beats,
  tap,
}: MetronomeControlsProps) {
  const [open, setOpen] = useState<"signature" | "subdivision" | null>(null);

  const step =
    "flex h-9 min-w-[44px] items-center justify-center rounded-lg border border-border px-2.5 font-mono text-xs font-semibold transition-colors hover:bg-accent";

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {/* Tempo */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onBpmIncrement(-1)}
          aria-label="Moins 1 BPM"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-2xl transition-colors hover:bg-accent"
        >
          −
        </button>
        <label className="flex flex-col items-center">
          <span className="sr-only">Tempo en BPM</span>
          <input
            type="number"
            inputMode="numeric"
            value={bpm}
            onChange={(e) => onBpmChange(parseInt(e.target.value) || 120)}
            min={20}
            max={300}
            className="tabular w-[3.2ch] bg-transparent text-center font-display text-[112px] font-extrabold leading-[0.85] tracking-[-0.01em] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span aria-hidden="true" className="mt-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">
            BPM
          </span>
        </label>
        <button
          onClick={() => onBpmIncrement(1)}
          aria-label="Plus 1 BPM"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-2xl transition-colors hover:bg-accent"
        >
          +
        </button>
      </div>

      {beats}

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button onClick={() => onBpmIncrement(-5)} aria-label="Moins 5 BPM" className={step}>
          −5
        </button>
        <button onClick={() => onBpmIncrement(5)} aria-label="Plus 5 BPM" className={step}>
          +5
        </button>
        {tap}
      </div>

      <input
        type="range"
        min={20}
        max={300}
        value={bpm}
        onChange={(e) => onBpmChange(parseInt(e.target.value))}
        aria-label="Tempo"
        className="w-full max-w-sm accent-primary"
      />

      {/* Reglages : une grille a filets, chaque case un reglage */}
      <div className="grid w-full grid-cols-2 gap-px overflow-visible border-y border-border bg-border">
        <Setting label="Mesure">
          <Dropdown
            isOpen={open === "signature"}
            onToggle={() => setOpen(open === "signature" ? null : "signature")}
            value={`${timeSignature.beats}/${timeSignature.noteValue}`}
          >
            {TIME_SIGNATURES.map((ts) => {
              const isCurrent =
                ts.beats === timeSignature.beats && ts.noteValue === timeSignature.noteValue;
              return (
                <DropdownItem
                  key={`${ts.beats}/${ts.noteValue}`}
                  isCurrent={isCurrent}
                  onSelect={() => {
                    onTimeSignatureChange(ts);
                    setOpen(null);
                  }}
                >
                  {ts.beats}/{ts.noteValue}
                </DropdownItem>
              );
            })}
          </Dropdown>
        </Setting>

        <Setting label="Subdivision">
          <Dropdown
            isOpen={open === "subdivision"}
            onToggle={() => setOpen(open === "subdivision" ? null : "subdivision")}
            value={SUBDIVISION_LABELS[subdivision]}
          >
            {SUBDIVISIONS.map((sub) => (
              <DropdownItem
                key={sub}
                isCurrent={sub === subdivision}
                onSelect={() => {
                  onSubdivisionChange(sub);
                  setOpen(null);
                }}
              >
                {SUBDIVISION_LABELS[sub]}
              </DropdownItem>
            ))}
          </Dropdown>
        </Setting>

        <Setting label="Volume">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => onVolumeChange(parseInt(e.target.value) / 100)}
              aria-label="Volume"
              className="min-w-0 flex-1 accent-primary"
            />
            <span className="tabular w-9 text-right text-xs font-semibold">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </Setting>

        <Setting label="Silence">
          <button
            type="button"
            role="switch"
            aria-checked={silentMode}
            onClick={() => onSilentModeChange(!silentMode)}
            className="flex items-center gap-1.5 text-sm font-bold"
          >
            {silentMode ? (
              <VolumeX className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
            )}
            {silentMode ? "Temps muets" : "Désactivé"}
          </button>
        </Setting>
      </div>
    </div>
  );
}

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative flex flex-col gap-1 bg-background px-4 py-2.5">
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Dropdown({
  isOpen,
  onToggle,
  value,
  children,
}: {
  isOpen: boolean;
  onToggle: () => void;
  value: string;
  children: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex items-center justify-between gap-2 text-left text-sm font-bold"
      >
        {value}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div className="absolute left-2 right-2 top-full z-20 mt-1 rounded-xl border border-border bg-card p-1 shadow-md">
          {children}
        </div>
      )}
    </>
  );
}

function DropdownItem({
  isCurrent,
  onSelect,
  children,
}: {
  isCurrent: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
        isCurrent ? "font-bold text-foreground" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
