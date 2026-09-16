"use client";

import type { RehearsalWithDetails, RehearsalRsvpStatus } from "@/types";
import { RSVP_COLORS, RSVP_LABELS } from "@/types";

interface RehearsalCardProps {
  rehearsal: RehearsalWithDetails;
  currentUserId: string;
  onClick: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case "scheduled":
      return "border-l-blue-400";
    case "cancelled":
      return "border-l-red-400";
    case "completed":
      return "border-l-green-400";
    default:
      return "border-l-primary";
  }
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
  const isPast = new Date(rehearsal.date) < new Date();
  const dateIsToday = isToday(rehearsal.date);
  const dateIsTomorrow = isTomorrow(rehearsal.date);

  return (
    <button
      onClick={onClick}
      className={`group w-full overflow-hidden rounded-xl border-l-4 ${getStatusColor(rehearsal.status)} border border-border bg-card p-4 text-left transition-all hover:bg-primary/[0.02] hover:border-primary/40 ${
        rehearsal.status === "cancelled" ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Date block */}
        <div className={`flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg ${
          dateIsToday ? "bg-primary/20 text-primary" : "bg-accent text-foreground"
        }`}>
          <span className="text-xs font-medium uppercase leading-none">
            {new Date(rehearsal.date).toLocaleDateString("fr-FR", { weekday: "short" })}
          </span>
          <span className="text-lg font-bold leading-tight">
            {new Date(rehearsal.date).getDate()}
          </span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{rehearsal.title}</h3>
            {dateIsToday && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                Aujourd&apos;hui
              </span>
            )}
            {dateIsTomorrow && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                Demain
              </span>
            )}
            {rehearsal.status === "cancelled" && (
              <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-destructive">
                Annulee
              </span>
            )}
            {rehearsal.status === "completed" && (
              <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-success">
                Terminee
              </span>
            )}
            {rehearsal.recurrence !== "none" && (
              <span className="material-symbols-outlined text-[14px] text-muted-foreground" title="Recurrente">
                repeat
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              {formatTime(rehearsal.date)}
              {rehearsal.end_date && ` - ${formatTime(rehearsal.end_date)}`}
            </span>
            {rehearsal.location && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                {rehearsal.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">group</span>
              {acceptedCount}/{totalCount}
            </span>
            {rehearsal.setlist && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">queue_music</span>
                {rehearsal.setlist.name}
              </span>
            )}
          </div>

          {/* RSVP badges row */}
          {myRsvp && (
            <div className="mt-2">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RSVP_COLORS[myRsvp.status]}`}>
                {RSVP_LABELS[myRsvp.status]}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
