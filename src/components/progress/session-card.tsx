"use client";

import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { formatDuration as formatMinutesShared } from "./stats-summary";
import { instrumentLabel } from "@/lib/instruments";
import type { Instrument } from "@/types";
import { CircleCheck } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import type { PracticeSessionWithSong } from "@/types";
import { getMoodEmoji } from "./mood-selector";
import { getSectionsLabels } from "./sections-selector";

interface SessionCardProps {
  session: PracticeSessionWithSong;
  onClick: () => void;
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const t = useTranslations("progress.session");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
  const formatDuration = (minutes: number): string => formatMinutesShared(minutes, tc);

  const formatRelativeTime = (date: string): string => {
    const now = new Date();
    const sessionDate = new Date(date);
    const diffMs = now.getTime() - sessionDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return tc("relative.nowCap");
    if (diffMinutes < 60) return tc("relative.minutesAgoCap", { count: diffMinutes });
    if (diffHours < 24) return tc("relative.hoursAgoCap", { count: diffHours });
    if (diffDays === 1) return tc("relative.yesterdayCap");
    if (diffDays < 7) return tc("relative.daysAgoCap", { count: diffDays });
    return sessionDate.toLocaleDateString(intlLocale, { day: "numeric", month: "short" });
  };

  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString(intlLocale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sectionsLabel = getSectionsLabels(session.sections_worked, te);
  const moodEmoji = getMoodEmoji(session.mood);

  const instrument = useSessionInstrument(session.instrument);

  const meta = [
    formatRelativeTime(session.practiced_at),
    formatTime(session.practiced_at),
    instrument,
    session.bpm_achieved ? `${session.bpm_achieved} bpm` : null,
    sectionsLabel || null,
  ].filter(Boolean);

  /*
   * Une ligne du journal, style Atelier (docs/refonte-ui.md) : la duree
   * en condense a droite comme dans le Carnet, la note du guitariste en
   * serif sous le titre. Plus de carte ni d'ombre au survol.
   */
  return (
    <button
      onClick={onClick}
      className="grid w-full grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-3 border-b border-border py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Cover src={session.song?.cover_url} className="h-12 w-12 rounded-[3px]" />

      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">
          {session.song?.title || t("free")}
          {session.song?.artist && (
            <span className="font-normal text-muted-foreground"> · {session.song.artist}</span>
          )}
        </span>
        <span className="tabular block truncate text-xs text-muted-foreground">{meta.join(" · ")}</span>
        {session.notes && (
          <span className="mt-1 line-clamp-1 block font-serif text-[13.5px] italic text-foreground/80">
            {session.notes}
          </span>
        )}
        {session.goals_achieved && session.session_goals && (
          <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-success">
            <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {t("goalsAchieved")}
          </span>
        )}
      </span>

      <span className="flex flex-col items-end gap-1">
        <span className="tabular font-display text-xl font-bold leading-none">
          {formatDuration(session.duration_minutes)}
        </span>
        {moodEmoji && (
          <span className="text-base" title={session.mood || ""}>
            {moodEmoji}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * L'instrument d'une session, a afficher seulement pour qui en joue
 * plusieurs : un guitariste n'a pas besoin de lire « Guitare » partout.
 */
function useSessionInstrument(instrument: Instrument | null | undefined): string | null {
  const myInstruments = useMyInstruments();
  const te = useTranslations("enums");
  if (!myInstruments.isMulti || !instrument) return null;
  const entry = myInstruments.instruments.find((i) => i.instrument === instrument);
  return instrumentLabel(entry ?? { instrument }, te);
}

const STACK_OFFSETS = ["left-0 top-0", "left-1.5 top-1.5", "left-3 top-3"];


/**
 * Une session a plusieurs morceaux, en une entree du journal.
 *
 * En tete, ce qui vaut pour toute la session : l'heure, les pochettes
 * empilees, la duree totale, l'humeur et la note. Dessous, une sous-ligne
 * par morceau avec ses minutes et son tempo — c'est elle qu'on touche
 * pour modifier.
 */
export function GroupSessionCard({
  sessions,
  onSessionClick,
}: {
  sessions: PracticeSessionWithSong[];
  onSessionClick: (session: PracticeSessionWithSong) => void;
}) {
  const t = useTranslations("progress.session");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
  const formatMinutes = (minutes: number) => formatMinutesShared(minutes, tc);
  // Les champs communs sont recopies sur chaque ligne : la premiere suffit.
  const first = sessions[0];
  const total = sessions.reduce((sum, session) => sum + session.duration_minutes, 0);
  const songCount = sessions.filter((session) => session.song).length;
  const moodEmoji = getMoodEmoji(first.mood);
  const sectionsLabel = getSectionsLabels(first.sections_worked, te);

  const instrument = useSessionInstrument(first.instrument);

  const meta = [
    new Date(first.practiced_at).toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" }),
    instrument,
    sectionsLabel || null,
  ].filter(Boolean);

  return (
    <div className="border-b border-border py-3">
      <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-3">
        {/* Les pochettes empilees : on voit d'un coup que c'est plusieurs morceaux. */}
        <span className="relative h-12 w-12" aria-hidden="true">
          {/* Decalees en diagonale, la premiere au-dessus. */}
          {sessions.slice(0, 3).map((session, index) => (
            <span
              key={session.id}
              className={`absolute ${STACK_OFFSETS[index]} rounded-[3px] ring-2 ring-background`}
              style={{ zIndex: 3 - index }}
            >
              <Cover src={session.song?.cover_url} className="h-9 w-9 rounded-[3px]" />
            </span>
          ))}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {songCount > 1 ? t("songs", { count: songCount }) : t("session")}
          </span>
          <span className="tabular block truncate text-xs text-muted-foreground">{meta.join(" · ")}</span>
          {first.notes && (
            <span className="mt-1 line-clamp-1 block font-serif text-[13.5px] italic text-foreground/80">
              {first.notes}
            </span>
          )}
          {first.goals_achieved && first.session_goals && (
            <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-success">
              <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {t("goalsAchieved")}
            </span>
          )}
        </span>

        <span className="flex flex-col items-end gap-1">
          <span className="tabular font-display text-xl font-bold leading-none">{formatMinutes(total)}</span>
          {moodEmoji && (
            <span className="text-base" title={first.mood || ""}>
              {moodEmoji}
            </span>
          )}
        </span>
      </div>

      <ul className="ml-[60px] mt-2 border-l border-border">
        {sessions.map((session) => (
          <li key={session.id}>
            <button
              type="button"
              onClick={() => onSessionClick(session)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 py-1.5 pl-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 truncate text-[13px]">
                <span className="font-semibold">{session.song?.title || t("noSong")}</span>
                {session.bpm_achieved ? (
                  <span className="tabular text-muted-foreground"> · {session.bpm_achieved} bpm</span>
                ) : null}
              </span>
              <span className="tabular text-xs font-semibold text-muted-foreground">
                {formatMinutes(session.duration_minutes)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
