"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWeeklyGoal, regenerateWeeklyPlan } from "@/lib/actions/weekly-plan";
import {
  CalendarDays,
  Check,
  CirclePlay,
  CircleCheck,
  Gauge,
  Play,
  RefreshCw,
  Repeat,
  Timer,
  Trophy,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Frets } from "@/components/ui/frets";
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

/** Les icones du plan : une par nature d'objectif, jamais decoratives. */
const KIND_ICONS: Record<WeeklyGoalWithProgress["kind"], LucideIcon> = {
  tempo: Gauge,
  mastery: CircleCheck,
  minutes: Timer,
  days: CalendarDays,
  section: Repeat,
  cover: Video,
  song_start: CirclePlay,
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
    <section aria-labelledby="weekly-plan-title" className={className}>
      <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
        <div>
          <h2
            id="weekly-plan-title"
            className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            Ta semaine · {formatWeekRange(plan.weekStart, plan.weekEnd)}
          </h2>
          <p className="tabular mt-1 font-display text-3xl font-bold leading-none">
            {completed}
            <span className="text-lg text-muted-foreground">/{goals.length}</span>
          </p>
        </div>

        <div className="flex items-center gap-1">
          <p className="tabular font-mono text-[10.5px] text-muted-foreground">
            {remaining === 0
              ? "dernier jour"
              : `${remaining} jour${remaining > 1 ? "s" : ""}`}
          </p>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            aria-label="Régénérer le plan de la semaine"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw
              className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <ul>
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
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
          <Trophy className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
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

  const Icon = KIND_ICONS[goal.kind];

  return (
    <li className="border-b border-border py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={goal.checked}
          disabled={disabled}
          onClick={onToggle}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            goal.checked
              ? "border-foreground bg-foreground text-background"
              : "border-input hover:border-foreground"
          }`}
        >
          {goal.checked && <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />}
          <span className="sr-only">{goal.title}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
            <p
              className={`min-w-0 flex-1 text-sm font-semibold ${
                goal.done ? "text-muted-foreground line-through" : ""
              }`}
            >
              {goal.title}
            </p>
            {reading && (
              <span className="tabular shrink-0 font-display text-base font-bold leading-tight">
                {reading}
              </span>
            )}
          </div>

          {goal.detail && (
            <p className="mt-0.5 pl-6 text-xs text-muted-foreground">{goal.detail}</p>
          )}

          {/* La mesure n'apparait que quand elle mesure quelque chose :
              un objectif binaire a deja sa case a cocher. */}
          {target > 1 && (
            <Frets
              value={goal.percent}
              label={`Progression : ${goal.percent} %`}
              className="ml-6 mt-2"
            />
          )}

          {goal.song_id && onWorkOnSong && !goal.done && (
            <button
              type="button"
              onClick={() => onWorkOnSong(goal.song_id!)}
              className="ml-6 mt-2 inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Play className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden="true" />
              Travailler
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
