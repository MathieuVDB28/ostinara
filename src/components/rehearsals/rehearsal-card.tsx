"use client";

import type { RehearsalWithDetails } from "@/types";
import { RSVP_COLORS, RSVP_LABELS } from "@/types";
import { Icon } from "@/components/ui/icon";

interface RehearsalCardProps {
  rehearsal: RehearsalWithDetails;
  currentUserId: string;
  onClick: () => void;
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isTomorrow(dateString: string): boolean {
  const date = new Date(dateString);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
}

export function RehearsalCard({ rehearsal, currentUserId, onClick }: RehearsalCardProps) {
  const acceptedCount = rehearsal.participants.filter((p) => p.status === "accepted").length;
  const totalCount = rehearsal.participants.length;
  const myRsvp = rehearsal.participants.find((p) => p.user_id === currentUserId);
  const dateIsToday = isToday(rehearsal.date);
  const dateIsTomorrow = isTomorrow(rehearsal.date);

  const date = new Date(rehearsal.date);
  const tag = "rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em]";

  /*
   * Une repete en ligne, style Atelier (docs/refonte-ui.md) : la date en
   * tampon a gauche, le titre en condense, les etats en etiquettes. La
   * barre coloree sur le flanc de la carte a disparu.
   */
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3.5 border-b border-border py-3 text-left transition-colors hover:bg-accent/50 ${
        rehearsal.status === "cancelled" ? "opacity-60" : ""
      }`}
    >
      <span
        className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[4px] ${
          dateIsToday ? "bg-foreground text-background" : "bg-secondary"
        }`}
      >
        <span className="font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.06em] opacity-70">
          {date.toLocaleDateString("fr-FR", { weekday: "short" })}
        </span>
        <span className="tabular font-display text-2xl font-extrabold leading-none">{date.getDate()}</span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-display text-xl font-extrabold uppercase leading-tight">{rehearsal.title}</span>
          {dateIsToday && <span className={`${tag} border-foreground`}>Aujourd&apos;hui</span>}
          {dateIsTomorrow && <span className={`${tag} border-border`}>Demain</span>}
          {rehearsal.status === "cancelled" && <span className={`${tag} border-destructive text-destructive`}>Annulée</span>}
          {rehearsal.status === "completed" && <span className={`${tag} border-success text-success`}>Terminée</span>}
          {rehearsal.recurrence !== "none" && (
            <span title="Récurrente" className="inline-flex">
              <Icon name="repeat" className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="sr-only">Récurrente</span>
            </span>
          )}
        </span>

        <span className="tabular mt-0.5 block truncate text-xs text-muted-foreground">
          {[
            `${formatTime(rehearsal.date)}${rehearsal.end_date ? ` – ${formatTime(rehearsal.end_date)}` : ""}`,
            rehearsal.location,
            `${acceptedCount}/${totalCount} présents`,
            rehearsal.setlist?.name,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>

        {myRsvp && (
          <span className={`mt-1.5 inline-flex rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${RSVP_COLORS[myRsvp.status]}`}>
            {RSVP_LABELS[myRsvp.status]}
          </span>
        )}
      </span>

      <Icon name="chevron_right" className="mt-4 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
