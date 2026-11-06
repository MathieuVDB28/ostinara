"use client";

import { useTranslations } from "next-intl";
import { Cover } from "@/components/ui/cover";
import { formatDuration } from "@/components/progress/stats-summary";
import { bandPosteLabel } from "@/lib/instruments";
import { VERDICT_TEXT_CLASS } from "@/lib/rehearsal-log";
import { RehearsalTaskList } from "./rehearsal-task-list";
import type { RehearsalLogDetails } from "@/types";

const HEADING =
  "mb-1 border-b border-border pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

interface RehearsalReportProps {
  log: RehearsalLogDetails;
  durationMinutes: number | null;
  currentUserId: string;
  readOnly: boolean;
}

/** Ce que le groupe garde de la repete. */
export function RehearsalReport({ log, durationMinutes, currentUserId, readOnly }: RehearsalReportProps) {
  const t = useTranslations("rehearsals.report");
  const tv = useTranslations("rehearsals.verdict");
  const tc = useTranslations("common");
  const te = useTranslations("enums");

  const present = log.attendees.filter((attendee) => attendee.status !== "declined");

  return (
    <div className="space-y-6">
      {durationMinutes ? (
        <p className="tabular font-display text-3xl font-bold leading-none">
          {formatDuration(durationMinutes, tc)}
          <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">{t("together")}</span>
        </p>
      ) : null}

      <section>
        <h3 className={HEADING}>{t("attendees", { count: present.length })}</h3>
        <ul>
          {present.map((attendee) => {
            const poste = bandPosteLabel(attendee, te);
            return (
              <li key={attendee.user_id} className="flex min-h-[44px] items-center justify-between gap-3 border-b border-border py-2 text-sm">
                <span className="min-w-0 truncate font-medium">
                  {attendee.profile.display_name || attendee.profile.username}
                  {poste && <span className="font-normal text-muted-foreground"> · {poste}</span>}
                </span>
                {attendee.status === "pending" && (
                  <span className="shrink-0 text-xs text-muted-foreground">{t("waiting")}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {log.songs.length > 0 && (
        <section>
          <h3 className={HEADING}>{t("songs", { count: log.songs.length })}</h3>
          <ul>
            {log.songs.map((song) => (
              <li key={song.id} className="flex items-center gap-3 border-b border-border py-2">
                <Cover src={song.song_cover_url} className="h-10 w-10 shrink-0 rounded-[3px]" />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {song.song_title}
                  {song.song_artist && <span className="font-normal text-muted-foreground"> · {song.song_artist}</span>}
                </p>
                {song.verdict && (
                  <span className={`shrink-0 text-xs font-semibold ${VERDICT_TEXT_CLASS[song.verdict]}`}>
                    {tv(song.verdict)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {log.tasks.length > 0 && (
        <section>
          <h3 className={HEADING}>{t("tasks")}</h3>
          <RehearsalTaskList tasks={log.tasks} currentUserId={currentUserId} readOnly={readOnly} />
        </section>
      )}
    </div>
  );
}
