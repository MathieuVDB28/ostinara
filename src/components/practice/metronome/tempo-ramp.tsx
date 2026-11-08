"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { ProUpsell } from "@/components/subscription/pro-upsell";

/**
 * La montee de tempo automatique (Pro) : on part d'un tempo, on gagne
 * quelques BPM toutes les N mesures ou toutes les N secondes, jusqu'a un
 * plafond ou l'on reste.
 */

export type RampUnit = "bars" | "seconds";

export interface TempoRampSettings {
  startBpm: number;
  step: number;
  every: number;
  unit: RampUnit;
  ceilingBpm: number;
}

const STORAGE_KEY = "ostinara_tempo_ramp";
const MIN_BPM = 20;
const MAX_BPM = 300;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function sanitizeRamp(settings: TempoRampSettings): TempoRampSettings {
  const startBpm = clamp(settings.startBpm, MIN_BPM, MAX_BPM);
  return {
    startBpm,
    step: clamp(settings.step, 1, 30),
    every: clamp(settings.every, 1, settings.unit === "bars" ? 64 : 600),
    unit: settings.unit === "seconds" ? "seconds" : "bars",
    ceilingBpm: clamp(Math.max(settings.ceilingBpm, startBpm), MIN_BPM, MAX_BPM),
  };
}

/** Le tempo apres un palier : jamais au-dela du plafond. */
export function nextRampBpm(current: number, settings: TempoRampSettings): number {
  return Math.min(settings.ceilingBpm, current + settings.step);
}

function readStored(fallbackBpm: number): TempoRampSettings {
  const fallback: TempoRampSettings = {
    startBpm: fallbackBpm,
    step: 2,
    every: 4,
    unit: "bars",
    ceilingBpm: Math.min(MAX_BPM, fallbackBpm + 20),
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeRamp({ ...fallback, ...JSON.parse(raw) }) : fallback;
  } catch {
    return fallback;
  }
}

function store(settings: TempoRampSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // stockage indisponible : les reglages valent pour la seance
  }
}

/**
 * La logique : un compteur de mesures (premier temps) ou de secondes, et un
 * palier quand il atteint `every`. Le composant appelle `onDownbeat` a
 * chaque premier temps et `onStart` quand le metronome demarre.
 */
export function useTempoRamp({
  enabled,
  settings,
  isPlaying,
  bpm,
  setBpm,
}: {
  enabled: boolean;
  settings: TempoRampSettings;
  isPlaying: boolean;
  bpm: number;
  setBpm: (bpm: number) => void;
}) {
  const [remaining, setRemaining] = useState(settings.every);
  const countRef = useRef(0);
  // Le premier temps du depart n'est pas une mesure jouee.
  const skipFirstRef = useRef(true);
  const bpmRef = useRef(bpm);
  // Le metronome se re-rend a chaque temps : on garde la derniere fonction
  // sans relancer l'horloge des secondes a chaque rendu.
  const setBpmRef = useRef(setBpm);
  useEffect(() => {
    bpmRef.current = bpm;
    setBpmRef.current = setBpm;
  }, [bpm, setBpm]);

  const step = useCallback(() => {
    const next = nextRampBpm(bpmRef.current, settings);
    if (next !== bpmRef.current) setBpmRef.current(next);
  }, [settings]);

  /** Au lancement : on repart du tempo de depart. */
  const onStart = useCallback(() => {
    countRef.current = 0;
    skipFirstRef.current = true;
    setRemaining(settings.every);
    setBpmRef.current(settings.startBpm);
  }, [settings]);

  const onDownbeat = useCallback(() => {
    if (!enabled || settings.unit !== "bars") return;
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      return;
    }
    countRef.current += 1;
    if (countRef.current >= settings.every) {
      countRef.current = 0;
      step();
    }
    setRemaining(settings.every - countRef.current);
  }, [enabled, settings, step]);

  // En secondes : une horloge tant que ca joue.
  useEffect(() => {
    if (!enabled || !isPlaying || settings.unit !== "seconds") return;
    let left = settings.every;
    const timer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        left = settings.every;
        step();
      }
      setRemaining(left);
    }, 1000);
    return () => clearInterval(timer);
  }, [enabled, isPlaying, settings, step]);

  return { remaining, onStart, onDownbeat, atCeiling: bpm >= settings.ceilingBpm };
}

const FIELD =
  "tabular min-h-[40px] w-full rounded-lg border border-input bg-background px-2 text-sm focus:border-primary";

interface TempoRampPanelProps {
  isPro: boolean;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  settings: TempoRampSettings;
  onSettingsChange: (settings: TempoRampSettings) => void;
  isPlaying: boolean;
  remaining: number;
  atCeiling: boolean;
  currentBpm: number;
  /** A la premiere ouverture : relire les reglages memorises. */
  onOpen?: () => void;
}

/** Le reglage sous le metronome : replie par defaut, un interrupteur, quatre champs. */
export function TempoRampPanel({
  isPro,
  enabled,
  onEnabledChange,
  settings,
  onSettingsChange,
  isPlaying,
  remaining,
  atCeiling,
  currentBpm,
  onOpen,
}: TempoRampPanelProps) {
  const t = useTranslations("metronome.ramp");
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<TempoRampSettings>) => {
    const next = { ...settings, ...patch };
    onSettingsChange(next);
  };
  const commit = () => {
    const clean = sanitizeRamp(settings);
    onSettingsChange(clean);
    store(clean);
  };
  const num = (value: string) => (value === "" ? 0 : Number(value));

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-2 border-y border-border text-sm font-semibold"
      >
        <Icon name="trending_up" className="h-4 w-4" />
        {t("title")}
        {enabled && <span className="rounded bg-foreground px-1.5 py-0.5 text-[10px] uppercase text-background">{t("on")}</span>}
        <Icon name={open ? "expand_less" : "expand_more"} className="ml-auto h-4 w-4 text-muted-foreground" />
      </button>

      {open && !isPro && (
        <div className="pt-2">
          <ProUpsell compact feature={t("upsell")} description="" />
        </div>
      )}

      {open && isPro && (
        <div className="space-y-3 py-3">
          <label className="flex min-h-[40px] items-center justify-between gap-3 text-sm">
            <span>{t("enable")}</span>
            <input
              type="checkbox"
              role="switch"
              checked={enabled}
              onChange={(event) => {
                commit();
                onEnabledChange(event.target.checked);
              }}
              className="h-5 w-5"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ramp-start" className="mb-1 block text-xs font-semibold text-muted-foreground">{t("start")}</label>
              <input id="ramp-start" type="number" inputMode="numeric" min={MIN_BPM} max={MAX_BPM} value={settings.startBpm || ""} onChange={(event) => update({ startBpm: num(event.target.value) })} onBlur={commit} className={FIELD} />
            </div>
            <div>
              <label htmlFor="ramp-ceiling" className="mb-1 block text-xs font-semibold text-muted-foreground">{t("ceiling")}</label>
              <input id="ramp-ceiling" type="number" inputMode="numeric" min={MIN_BPM} max={MAX_BPM} value={settings.ceilingBpm || ""} onChange={(event) => update({ ceilingBpm: num(event.target.value) })} onBlur={commit} className={FIELD} />
            </div>
            <div>
              <label htmlFor="ramp-step" className="mb-1 block text-xs font-semibold text-muted-foreground">{t("step")}</label>
              <input id="ramp-step" type="number" inputMode="numeric" min={1} max={30} value={settings.step || ""} onChange={(event) => update({ step: num(event.target.value) })} onBlur={commit} className={FIELD} />
            </div>
            <div>
              <label htmlFor="ramp-every" className="mb-1 block text-xs font-semibold text-muted-foreground">{t("every")}</label>
              <div className="flex gap-1.5">
                <input id="ramp-every" type="number" inputMode="numeric" min={1} value={settings.every || ""} onChange={(event) => update({ every: num(event.target.value) })} onBlur={commit} className={`${FIELD} w-16 shrink-0`} />
                <select
                  aria-label={t("unit")}
                  value={settings.unit}
                  onChange={(event) => {
                    const clean = sanitizeRamp({ ...settings, unit: event.target.value as RampUnit });
                    onSettingsChange(clean);
                    store(clean);
                  }}
                  className={FIELD}
                >
                  <option value="bars">{t("bars")}</option>
                  <option value="seconds">{t("seconds")}</option>
                </select>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {!enabled
              ? t("hint", { start: settings.startBpm, step: settings.step, every: settings.every, unit: settings.unit, ceiling: settings.ceilingBpm })
              : !isPlaying
                ? t("ready", { start: settings.startBpm })
                : atCeiling
                  ? t("ceilingReached", { bpm: currentBpm })
                  : t("next", { count: remaining, unit: settings.unit, bpm: nextRampBpm(currentBpm, settings) })}
          </p>
        </div>
      )}
    </div>
  );
}

/** Les reglages, lus dans le navigateur a la premiere ouverture. */
export function useRampSettings(fallbackBpm: number) {
  const [settings, setSettings] = useState<TempoRampSettings>(() => ({
    startBpm: fallbackBpm,
    step: 2,
    every: 4,
    unit: "bars",
    ceilingBpm: Math.min(MAX_BPM, fallbackBpm + 20),
  }));
  const loadedRef = useRef(false);
  const load = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setSettings(readStored(fallbackBpm));
  }, [fallbackBpm]);
  return { settings, setSettings, load };
}
