"use client";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import type { CommonT } from "@/i18n/types";
import { Cover } from "@/components/ui/cover";
import { Frets } from "@/components/ui/frets";
import { songTempoProgress } from "@/lib/song-progress";
import { getSectionsLabels } from "@/components/progress/sections-selector";
import type { PracticeSessionWithSong, Song } from "@/types";

/**
 * « Reprendre Blackbird a 96 BPM ».
 *
 * L'onglet « Jouer » ouvrait sur un selecteur de morceau vide : choisir le
 * morceau, regler le tempo, lancer le chrono — trois gestes, a chaque
 * session, pour retrouver l'etat de la veille. La derniere session
 * enregistree connait deja les trois. Un bouton, zero saisie.
 */

interface ResumeCardProps {
  session: PracticeSessionWithSong;
  song: Song;
  /** Le tempo repris : celui atteint, a defaut la cible du morceau. */
  bpm: number | null;
  /** Meilleur tempo tous temps confondus, pour l'echelle. */
  bestBpm: number | null;
  targetBpm?: number;
  /** Masque pendant qu'une session tourne : on ne reprend pas deux fois. */
  disabled?: boolean;
  onResume: () => void;
}

function formatWhen(practicedAt: string, t: CommonT, intlLocale: string): string {
  const then = new Date(practicedAt);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);

  if (days <= 0) return t("relative.today");
  if (days === 1) return t("relative.yesterday");
  if (days < 7) return t("relative.daysAgo", { count: days });
  if (days < 14) return t("relative.lastWeek");
  return t("relative.onDate", { date: then.toLocaleDateString(intlLocale, { day: "numeric", month: "long" }) });
}

export function ResumeCard({
  session,
  song,
  bpm,
  bestBpm,
  targetBpm,
  disabled = false,
  onResume,
}: ResumeCardProps) {
  const t = useTranslations("play.resume");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
  const sections = getSectionsLabels(session.sections_worked, te);

  // Le rappel de la derniere session, dans l'ordre ou on se le raconte :
  // quand, a quel tempo, sur quoi.
  const recap = [
    t("lastSession", { when: formatWhen(session.practiced_at, tc, intlLocale) }),
    bpm ? `${bpm} BPM` : null,
    sections || null,
  ].filter(Boolean) as string[];

  const tempo = songTempoProgress(song, bestBpm);
  const percent = tempo ? tempo.percent : song.progress_percent;

  return (
    <section aria-labelledby="resume-title" className="border-t border-border pt-4">
      <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1">
        <Cover src={song.cover_url} className="row-span-2 h-14 w-14 rounded-[4px]" />
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {t("title")}
        </p>
        <span className="row-span-2 grid justify-items-end gap-1">
          <span className="tabular font-display text-xl font-bold leading-none">
            {tempo ? (
              <>
                {tempo.achieved}
                <span className="text-sm text-muted-foreground">/{tempo.target}</span>
              </>
            ) : (
              <>
                {percent}
                <span className="text-sm text-muted-foreground"> %</span>
              </>
            )}
          </span>
          <Frets value={percent} label={tempo ? t("bpmOf", { achieved: tempo.achieved, target: tempo.target }) : `${percent} %`} />
        </span>
        <h2 id="resume-title" className="min-w-0 truncate text-[15px] font-bold">
          {song.title}
          <span className="font-medium text-muted-foreground"> · {song.artist}</span>
        </h2>
      </div>

      <p className="tabular mt-2 text-[13px] text-muted-foreground">{recap.join(" · ")}</p>

      {/* Sans tempo cible, la progression n'est qu'un pourcentage saisi. */}
      {!targetBpm && (
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t("noTarget")}
        </p>
      )}

      {/*
        Le bouton porte la valeur qu'il applique. « Reprendre » seul
        obligerait a verifier le tempo apres coup — donc a ressaisir.
      */}
      <button
        type="button"
        onClick={onResume}
        disabled={disabled}
        className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Play className="h-4 w-4 fill-current" strokeWidth={0} aria-hidden="true" />
        {disabled
          ? t("inProgress")
          : bpm
            ? t("resumeAt", { bpm })
            : t("resumeSong")}
      </button>
    </section>
  );
}
