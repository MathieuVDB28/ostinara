"use client";

import { useState } from "react";
import { ChevronDown, Mic } from "lucide-react";
import { useTranslations } from "next-intl";
import { BASS_MIN_FREQUENCY, usePitchDetection } from "@/lib/hooks/use-pitch-detection";
import { BASS_TUNING_GROUPS, TUNING_GROUPS, pitchToFrequency, type TuningGroup } from "@/lib/tunings";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { InstrumentSwitch } from "@/components/instruments/instrument-switch";
import { TunerGauge } from "./tuner-gauge";
import type { TuningPreset } from "@/types";

/** Les deux instruments a cordes qu'on accorde. */
type TunedInstrument = "guitar" | "bass";

function presetsOf(groups: TuningGroup[]): TuningPreset[] {
  return groups.flatMap((group) =>
    group.tunings.map((t) => ({
      name: t.value,
      notes: t.pitches,
      frequencies: t.pitches.map(pitchToFrequency),
    }))
  );
}

const TUNINGS: Record<TunedInstrument, { groups: TuningGroup[]; presets: TuningPreset[] }> = {
  guitar: { groups: TUNING_GROUPS, presets: presetsOf(TUNING_GROUPS) },
  bass: { groups: BASS_TUNING_GROUPS, presets: presetsOf(BASS_TUNING_GROUPS) },
};

/** L'accordeur s'ouvre sur l'instrument principal s'il a des cordes. */
function defaultInstrument(primary: string, plays: (i: TunedInstrument) => boolean): TunedInstrument {
  if (primary === "bass") return "bass";
  if (primary === "guitar" || plays("guitar")) return "guitar";
  return plays("bass") ? "bass" : "guitar";
}

function getClosestString(
  frequency: number,
  preset: TuningPreset
): { index: number; note: string; targetFreq: number; cents: number } | null {
  let closestIndex = 0;
  let minCentsDiff = Infinity;

  for (let i = 0; i < preset.frequencies.length; i++) {
    const cents = 1200 * Math.log2(frequency / preset.frequencies[i]);
    if (Math.abs(cents) < Math.abs(minCentsDiff)) {
      minCentsDiff = cents;
      closestIndex = i;
    }
  }

  return {
    index: closestIndex,
    note: preset.notes[closestIndex],
    targetFreq: preset.frequencies[closestIndex],
    cents: Math.round(minCentsDiff),
  };
}

export function InstrumentTuner() {
  const t = useTranslations("audio.tuner");
  const tt = useTranslations("tunings");
  const myInstruments = useMyInstruments();
  const [instrument, setInstrument] = useState<TunedInstrument>(() =>
    defaultInstrument(myInstruments.primary, myInstruments.plays)
  );
  const [selectedPreset, setSelectedPreset] = useState(0);
  const { result, isActive, error, start, stop } = usePitchDetection(
    instrument === "bass" ? BASS_MIN_FREQUENCY : undefined
  );

  const { groups, presets } = TUNINGS[instrument];
  const preset = presets[selectedPreset] ?? presets[0];
  // Guitare et basse a la fois (ou ni l'une ni l'autre : on accorde celle d'un ami).
  const showSwitch = myInstruments.plays("guitar") === myInstruments.plays("bass");
  const closestString = result ? getClosestString(result.frequency, preset) : null;

  const absCents = closestString ? Math.abs(closestString.cents) : 50;
  let statusColor = "text-muted-foreground";
  let statusText = t("waiting");

  if (closestString) {
    if (absCents <= 5) {
      statusColor = "text-success";
      statusText = t("inTune");
    } else if (absCents <= 15) {
      statusColor = "text-primary";
      statusText = closestString.cents < 0 ? t("slightlyFlat") : t("slightlySharp");
    } else {
      statusColor = "text-destructive";
      statusText = closestString.cents < 0 ? t("tooFlat") : t("tooSharp");
    }
  }

  // Les cordes de la grave a l'aigue, numerotees comme on les nomme : 6e a 1re.
  const strings = preset.notes.map((note, i) => ({
    note,
    number: preset.notes.length - i,
    isHighlighted: closestString?.index === i,
  }));

  /*
   * Style Atelier (docs/refonte-ui.md) : la note jouee en tres grand, le
   * cadran a graduations, les six cordes en grille. L'ambre n'apparait que
   * sur le bouton qui active le micro.
   */
  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {showSwitch && (
        <InstrumentSwitch
          options={[{ instrument: "guitar" }, { instrument: "bass" }]}
          value={instrument}
          onChange={(next) => {
            setInstrument(next as TunedInstrument);
            setSelectedPreset(0);
          }}
          label={t("instrumentLabel")}
          className="justify-center"
        />
      )}

      <label className="relative">
        <span className="sr-only">{t("tuning")}</span>
        <select
          value={preset.name}
          onChange={(e) =>
            setSelectedPreset(presets.findIndex((p) => p.name === e.target.value))
          }
          className="h-9 appearance-none rounded-full border border-border bg-card pl-4 pr-9 font-mono text-xs font-semibold focus:border-primary focus:outline-none"
        >
          {groups.map((group) => (
            <optgroup key={group.label} label={group.labelKey ? tt(group.labelKey) : group.label}>
              {group.tunings.map((tuning) => (
                <option key={tuning.value} value={tuning.value}>
                  {tuning.labelKey ? tt(tuning.labelKey) : tuning.label} ({tuning.notes})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
      </label>

      {isActive ? (
        <>
          <TunerGauge cents={closestString?.cents ?? 0} />

          <div className="text-center" aria-live="polite">
            <p
              className={`font-display text-[96px] font-extrabold leading-[0.85] ${
                result ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {result ? (
                <>
                  {result.note}
                  <sub className="align-baseline text-[28px] text-muted-foreground">{result.octave}</sub>
                </>
              ) : (
                "—"
              )}
            </p>
            <p className={`mt-2 text-sm font-semibold ${statusColor}`}>
              {statusText}
              {result && <span className="tabular font-mono text-xs text-muted-foreground"> · {result.frequency} Hz</span>}
            </p>
          </div>
        </>
      ) : (
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          {t("hint")}
        </p>
      )}

      <div
        className="grid w-full gap-1.5"
        style={{ gridTemplateColumns: `repeat(${strings.length}, minmax(0, 1fr))` }}
      >
        {strings.map((string) => (
          <div
            key={`${preset.name}-${string.number}`}
            className={`flex h-14 flex-col items-center justify-center rounded-xl border transition-colors ${
              string.isHighlighted ? `border-primary shadow-[inset_0_0_0_1px_var(--primary)] ${statusColor}` : "border-border"
            }`}
          >
            <span className="font-display text-xl font-extrabold leading-none">{string.note}</span>
            <span className="font-mono text-[9.5px] text-muted-foreground">{t("stringNumber", { n: string.number })}</span>
          </div>
        ))}
      </div>

      {isActive ? (
        <button
          onClick={stop}
          className="min-h-[40px] rounded-full border border-border px-6 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {t("stop")}
        </button>
      ) : (
        <button
          onClick={start}
          className="flex min-h-[46px] items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Mic className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t("start")}
        </button>
      )}

      {error && <p className="max-w-sm text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
