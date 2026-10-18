"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setMyInstruments } from "@/lib/actions/instruments";
import { INSTRUMENTS, SKILL_LEVELS, sortInstruments } from "@/lib/instruments";
import { Icon } from "@/components/ui/icon";
import type { Instrument, ProfileInstrument, SkillLevel } from "@/types";

interface Props {
  initial: ProfileInstrument[];
  submitLabel: string;
  /** Nombre d'instruments autorise par le plan ; null = illimite. */
  limit: number | null;
  /** Appele apres l'enregistrement : redirection ou message. */
  onSaved: () => void;
}

interface Draft {
  level: SkillLevel | null;
  customLabel: string;
}

/**
 * Le choix des instruments, partage par l'accueil des nouveaux (/bienvenue)
 * et les reglages du profil.
 *
 * Une liste plutot qu'une grille de tuiles : chaque instrument coche se
 * deplie sur place pour le niveau, sans deuxieme ecran. Le premier coche
 * devient le principal ; on change ensuite d'un geste.
 *
 * Plan Free : une fois la limite atteinte, les autres instruments se
 * grisent et un lien mene aux plans. Qui en a deja plus les garde.
 */
export function InstrumentPicker({ initial, submitLabel, limit, onSaved }: Props) {
  const [drafts, setDrafts] = useState<Partial<Record<Instrument, Draft>>>(() =>
    Object.fromEntries(
      initial.map((i) => [i.instrument, { level: i.level, customLabel: i.custom_label ?? "" }]),
    ),
  );
  const [primary, setPrimary] = useState<Instrument | null>(
    initial.find((i) => i.is_primary)?.instrument ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = INSTRUMENTS.filter((i) => drafts[i.value]).map((i) => i.value);
  const cap = limit === null ? Infinity : Math.max(limit, initial.length);
  const atCap = selected.length >= cap;

  const toggle = (value: Instrument) => {
    setError(null);
    const next = { ...drafts };
    if (next[value]) {
      delete next[value];
      if (primary === value) setPrimary(selected.find((v) => v !== value) ?? null);
    } else {
      if (atCap) return;
      next[value] = { level: null, customLabel: "" };
      if (!primary) setPrimary(value);
    }
    setDrafts(next);
  };

  const update = (value: Instrument, patch: Partial<Draft>) => {
    setError(null);
    setDrafts((current) => ({ ...current, [value]: { ...current[value]!, ...patch } }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selected.length === 0) return setError("Choisis au moins un instrument.");
    if (selected.some((v) => !drafts[v]?.level)) return setError("Indique ton niveau pour chaque instrument.");

    const payload: ProfileInstrument[] = sortInstruments(
      selected.map((value) => ({
        instrument: value,
        level: drafts[value]!.level!,
        is_primary: value === primary,
        custom_label: value === "other" ? drafts[value]!.customLabel : null,
      })),
    );

    startTransition(async () => {
      const result = await setMyInstruments(payload);
      if (result.success) onSaved();
      else setError(result.error ?? "Oups, ça n'est pas passé.");
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <ul className="divide-y divide-border border-y border-border">
        {INSTRUMENTS.map((instrument) => {
          const draft = drafts[instrument.value];
          const isPrimary = primary === instrument.value;
          const locked = !draft && atCap;
          return (
            <li key={instrument.value}>
              <label
                className={`flex min-h-[60px] items-center ${locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"} gap-3.5 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(draft)}
                  disabled={locked}
                  onChange={() => toggle(instrument.value)}
                  className="sr-only"
                />
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                    draft ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Icon name={instrument.icon} className="h-5 w-5" />
                </span>
                <span className="flex-1 font-display text-2xl font-extrabold uppercase leading-none">
                  {instrument.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                    draft ? "border-primary bg-primary text-primary-foreground" : "border-input"
                  }`}
                >
                  {draft && <Icon name="check" className="h-4 w-4" />}
                </span>
              </label>

              {draft && (
                <div className="space-y-3 pb-4 pl-[58px]">
                  {instrument.value === "other" && (
                    <input
                      type="text"
                      value={draft.customLabel}
                      onChange={(event) => update(instrument.value, { customLabel: event.target.value })}
                      maxLength={40}
                      placeholder="Lequel ? (ukulélé, violon…)"
                      aria-label="Quel instrument ?"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}

                  <fieldset>
                    <legend className="sr-only">Ton niveau à la {instrument.label.toLowerCase()}</legend>
                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-input bg-input sm:grid-cols-4">
                      {SKILL_LEVELS.map((level) => {
                        const active = draft.level === level.value;
                        return (
                          <label
                            key={level.value}
                            className={`flex min-h-[40px] cursor-pointer items-center justify-center px-2 text-center text-[13px] font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring ${
                              active ? "bg-foreground text-background" : "bg-card hover:bg-accent"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`level-${instrument.value}`}
                              value={level.value}
                              checked={active}
                              onChange={() => update(instrument.value, { level: level.value })}
                              className="sr-only"
                            />
                            {level.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {selected.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPrimary(instrument.value)}
                      aria-pressed={isPrimary}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                        isPrimary
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon name="star" className={`h-3.5 w-3.5 ${isPrimary ? "fill-primary text-primary" : ""}`} />
                      {isPrimary ? "Instrument principal" : "En faire mon principal"}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {limit !== null && atCap && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Icon name="lock" className="h-4 w-4" />
          Plan Free : {limit} instruments max.
          <Link href="/pricing" className="font-semibold text-foreground underline underline-offset-2">
            Passe Pro pour en jouer plus
          </Link>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 min-h-[48px] w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "Enregistrement…" : submitLabel}
      </button>
    </form>
  );
}
