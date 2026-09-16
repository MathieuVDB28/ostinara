"use client";

import Image from "next/image";
import { TempoLadder, ProgressBar } from "@/components/ui/tempo-ladder";
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

function formatWhen(practicedAt: string): string {
  const then = new Date(practicedAt);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);

  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 14) return "la semaine derniere";
  return `le ${then.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
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
  const sections = getSectionsLabels(session.sections_worked);

  // Le rappel de la derniere session, dans l'ordre ou on se le raconte :
  // quand, a quel tempo, sur quoi.
  const recap = [
    `Derniere session ${formatWhen(session.practiced_at)}`,
    bpm ? `${bpm} BPM` : null,
    sections || null,
  ].filter(Boolean) as string[];

  return (
    <section
      aria-labelledby="resume-title"
      className="rounded-2xl border border-primary/30 bg-card p-5"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">
        Reprendre
      </p>

      <div className="flex items-start gap-4">
        {song.cover_url ? (
          <Image
            src={song.cover_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
            width={64}
            height={64}
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-2xl text-primary"
            >
              music_note
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 id="resume-title" className="truncate text-lg font-bold">
            {song.title}
          </h2>
          <p className="truncate text-sm text-muted-foreground">{song.artist}</p>

          <p className="tabular mt-1 text-[13px] text-muted-foreground">
            {recap.join(" · ")}
          </p>

          <div className="mt-3">
            {targetBpm ? (
              <TempoLadder
                targetBpm={targetBpm}
                achievedBpm={bestBpm}
                showScale={false}
              />
            ) : (
              <ProgressBar percent={song.progress_percent} />
            )}
          </div>
        </div>
      </div>

      {/*
        Le bouton porte la valeur qu'il applique. « Reprendre » seul
        obligerait a verifier le tempo apres coup — donc a ressaisir.
      */}
      <button
        type="button"
        onClick={onResume}
        disabled={disabled}
        className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
          play_arrow
        </span>
        {disabled
          ? "Session en cours"
          : bpm
            ? `Reprendre à ${bpm} BPM`
            : "Reprendre ce morceau"}
      </button>
    </section>
  );
}
