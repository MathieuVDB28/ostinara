"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { formatDuration } from "@/components/progress/stats-summary";
import { useIntlLocale } from "@/i18n/intl-locale";
import { RehearsalTaskList } from "./rehearsal-task-list";
import type { BandRehearsalJournal as Journal } from "@/types";

const SECTION_TITLE =
  "font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";
/** Au-dela, le bouton « voir tout » attendra : le groupe a rarement autant de retard. */
const VISIBLE_LOGS = 8;

interface BandRehearsalJournalProps {
  bandId: string;
  journal: Journal;
  currentUserId: string;
  readOnly: boolean;
}

/** La vie du groupe : ce qu'il a fait ensemble, et ce qu'il lui reste a bosser. */
export function BandRehearsalJournal({ bandId, journal, currentUserId, readOnly }: BandRehearsalJournalProps) {
  const t = useTranslations("rehearsals.journal");
  const tc = useTranslations("common");
  const intlLocale = useIntlLocale();
  const { stats, logs, unlogged, openTasks } = journal;

  const shortDate = (date: string) =>
    new Date(date).toLocaleDateString(intlLocale, { day: "numeric", month: "short" });

  return (
    <>
      {openTasks.length > 0 && (
        <section>
          <h2 className={`border-b border-border pb-2 ${SECTION_TITLE}`}>
            {t("openTasks")} <span className="tabular">· {openTasks.length}</span>
          </h2>
          <RehearsalTaskList tasks={openTasks} currentUserId={currentUserId} readOnly={readOnly} />
        </section>
      )}

      <section>
        <h2 className={`border-b border-border pb-2 ${SECTION_TITLE}`}>
          {t("title")}
          {logs.length > 0 && <span className="tabular"> · {logs.length}</span>}
        </h2>

        {!readOnly &&
          unlogged.map((rehearsal) => (
            <Link
              key={rehearsal.id}
              href={`/commu/groupes/${bandId}/raconter?repete=${rehearsal.id}`}
              className="flex min-h-[52px] items-center gap-3 border-b border-border py-2 text-sm hover:bg-accent/50"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{rehearsal.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("toTell", { date: shortDate(rehearsal.date) })}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}

        {stats.count > 0 && (
          <>
            <dl className="grid grid-cols-2 gap-4 border-b border-border py-4">
              <div>
                <dt className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("rehearsals")}
                </dt>
                <dd className="tabular font-display text-3xl font-bold leading-tight">{stats.count}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("together")}
                </dt>
                <dd className="tabular font-display text-3xl font-bold leading-tight">
                  {formatDuration(stats.minutes, tc)}
                </dd>
              </div>
            </dl>

            {stats.topSongs.length > 0 && (
              <div className="border-b border-border py-3">
                <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t("mostPlayed")}
                </h3>
                <ol className="mt-1.5 space-y-1">
                  {stats.topSongs.map((song) => (
                    <li key={`${song.title}|${song.artist}`} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium">
                        {song.title}
                        {song.artist && <span className="font-normal text-muted-foreground"> · {song.artist}</span>}
                      </span>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        {t("times", { count: song.count })}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <ul>
              {logs.slice(0, VISIBLE_LOGS).map((log) => (
                <li key={log.id}>
                  <Link
                    href={`/setlists/rehearsals/${log.id}`}
                    className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 hover:bg-accent/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{log.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t("logMeta", {
                          date: shortDate(log.date),
                          attendees: log.attendee_count,
                          songs: log.song_count,
                        })}
                      </span>
                    </span>
                    {log.duration_minutes ? (
                      <span className="tabular font-display text-xl font-bold leading-none">
                        {formatDuration(log.duration_minutes, tc)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {stats.count === 0 && unlogged.length === 0 && (
          <p className="py-6 text-sm text-muted-foreground">{t("empty")}</p>
        )}
      </section>
    </>
  );
}
