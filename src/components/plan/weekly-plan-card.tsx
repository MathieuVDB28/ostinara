"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWeeklyGoal, regenerateWeeklyPlan } from "@/lib/actions/weekly-plan";
import type { WeeklyGoalWithProgress, WeeklyPlan } from "@/types";

/**
 * Le plan de la semaine.
 *
 * L'app savait dire ce qui avait ete joue ; elle ne disait rien de la
 * semaine qui vient. Trois objectifs derives du journal, cochables — la
 * raison de rouvrir l'app un lundi matin.
 *
 * Chaque objectif porte sa mesure : « 88 / 96 BPM », « 2 / 4 jours ».
 * Une case cochee sans chiffre serait une liste de taches, pas un plan
 * de travail.
 */

interface WeeklyPlanCardProps {
  plan: WeeklyPlan;
  /** Deep-link vers l'ecran de travail d'un morceau. */
  onWorkOnSong?: (songId: string) => void;
  className?: string;
}

/**
 * Les icones du plan : une par nature d'objectif, jamais decoratives.
 *
 * Les noms sont ecrits sous la cle `icon` et non en valeurs nues :
 * `scripts/extract-icons.mjs` ne ramasse que cette forme, et une icone
 * absente du sous-ensemble de la police s'afficherait en texte brut.
 */
const KIND_ICONS: Record<WeeklyGoalWithProgress["kind"], { icon: string }> = {
  tempo: { icon: "speed" },
  mastery: { icon: "check_circle" },
  minutes: { icon: "timer" },
  days: { icon: "calendar_month" },
  section: { icon: "repeat" },
  cover: { icon: "videocam" },
  song_start: { icon: "play_circle" },
};

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(`${weekEnd}T12:00:00`);
  const day = (date: Date) => date.getDate();
  const month = (date: Date) =>
    date.toLocaleDateString("fr-FR", { month: "short" });

  return start.getMonth() === end.getMonth()
    ? `${day(start)} – ${day(end)} ${month(end)}`
    : `${day(start)} ${month(start)} – ${day(end)} ${month(end)}`;
}

/** Combien de jours il reste, dimanche soir compris. */
function daysLeft(weekEnd: string): number {
  const end = new Date(`${weekEnd}T23:59:59`);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

export function WeeklyPlanCard({
  plan,
  onWorkOnSong,
  className = "",
}: WeeklyPlanCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [regenerating, setRegenerating] = useState(false);

  // La coche doit repondre au doigt, pas au reseau : l'etat optimiste
  // bascule tout de suite, la Server Action suit.
  const [goals, toggleOptimistic] = useOptimistic(
    plan.goals,
    (current, goalId: string) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              checked: !goal.checked,
              done: !goal.checked || goal.current >= (goal.target_value ?? 1),
            }
          : goal
      )
  );

  const completed = goals.filter((goal) => goal.done).length;
  const remaining = daysLeft(plan.weekEnd);

  const handleToggle = (goalId: string) => {
    startTransition(async () => {
      toggleOptimistic(goalId);
      await toggleWeeklyGoal(goalId);
      router.refresh();
    });
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    await regenerateWeeklyPlan();
    router.refresh();
    setRegenerating(false);
  };

  if (goals.length === 0) return null;

  return (
    <section
      aria-labelledby="weekly-plan-title"
      className={`rounded-2xl border border-border bg-card p-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="weekly-plan-title"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Ta semaine
          </h2>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="tabular text-2xl font-extrabold">
              {completed}
              <span className="text-muted-foreground">/{goals.length}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              {formatWeekRange(plan.weekStart, plan.weekEnd)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <p className="tabular text-xs text-muted-foreground">
            {remaining === 0
              ? "Dernier jour"
              : `${remaining} jour${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`}
          </p>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            aria-label="Régénérer le plan de la semaine"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className={`material-symbols-outlined text-[20px] ${
                regenerating ? "animate-spin" : ""
              }`}
            >
              refresh
            </span>
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {goals.map((goal) => (
          <WeeklyGoalRow
            key={goal.id}
            goal={goal}
            disabled={isPending}
            onToggle={() => handleToggle(goal.id)}
            onWorkOnSong={onWorkOnSong}
          />
        ))}
      </ul>

      {completed === goals.length && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-medium text-success">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            emoji_events
          </span>
          Semaine bouclée. Le prochain plan arrive lundi.
        </p>
      )}
    </section>
  );
}

interface WeeklyGoalRowProps {
  goal: WeeklyGoalWithProgress;
  disabled: boolean;
  onToggle: () => void;
  onWorkOnSong?: (songId: string) => void;
}

function WeeklyGoalRow({
  goal,
  disabled,
  onToggle,
  onWorkOnSong,
}: WeeklyGoalRowProps) {
  const target = goal.target_value ?? 1;

  /*
   * La lecture chiffree : « 88 / 96 BPM ». Les objectifs binaires
   * (maitriser un morceau, enregistrer une cover) n'en ont pas — « 0 / 1 »
   * ne dit rien de plus que la case a cocher.
   */
  const reading =
    goal.unit && target > 1
      ? `${goal.current} / ${target} ${goal.unit}`
      : null;

  return (
    <li className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={goal.checked}
          disabled={disabled}
          onClick={onToggle}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            goal.checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input hover:border-primary"
          }`}
        >
          {goal.checked && (
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[16px]"
            >
              check
            </span>
          )}
          <span className="sr-only">{goal.title}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="material-symbols-outlined mt-px text-[18px] text-muted-foreground"
            >
              {KIND_ICONS[goal.kind].icon}
            </span>
            <p
              className={`min-w-0 flex-1 text-sm font-medium ${
                goal.done ? "text-muted-foreground line-through" : ""
              }`}
            >
              {goal.title}
            </p>
            {reading && (
              <span className="tabular shrink-0 text-xs font-semibold text-primary">
                {reading}
              </span>
            )}
          </div>

          {goal.detail && (
            <p className="mt-1 pl-6 text-xs text-muted-foreground">
              {goal.detail}
            </p>
          )}

          {/* La barre n'apparait que quand elle mesure quelque chose :
              un objectif binaire a deja sa case a cocher. */}
          {target > 1 && (
            <div
              className="mt-2 ml-6 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={goal.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progression : ${goal.percent} %`}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  goal.done ? "bg-success" : "bg-primary"
                }`}
                style={{ width: `${goal.percent}%` }}
              />
            </div>
          )}

          {goal.song_id && onWorkOnSong && !goal.done && (
            <button
              type="button"
              onClick={() => onWorkOnSong(goal.song_id!)}
              className="mt-2 ml-6 inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-input px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[16px]"
              >
                play_arrow
              </span>
              Travailler
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
