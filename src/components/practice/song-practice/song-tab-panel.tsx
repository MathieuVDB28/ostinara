"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isSongsterrUrl } from "@/lib/songsterr-url";
import type { PlayedSection, Song, UserPlan } from "@/types";

/**
 * La tab, le tempo et les sections, sans quitter l'ecran.
 *
 * Le pont Songsterr s'arretait a mi-chemin : on pouvait trouver une
 * tablature depuis la fiche d'un morceau, et c'est tout. Pour la jouer, il
 * fallait ouvrir un onglet, revenir regler le metronome, revenir a
 * l'onglet. Ici, ouvrir un morceau cale le metronome sur le tempo de la
 * partition et affiche sa structure ; la tab elle-meme s'ouvre a cote.
 *
 * Pourquoi une fenetre et pas une iframe : Songsterr refuse d'etre
 * encadre (X-Frame-Options). Une fenetre detachee est le seul moyen
 * honnete — et sur un second ecran, c'est meme le bon.
 */

interface SongTabPanelProps {
  song: Song;
  /** Le tempo courant du metronome, pour estimer la duree des sections. */
  currentBpm: number;
  /** Regler le metronome depuis le panneau. */
  onRequestBpm: (bpm: number) => void;
  userPlan: UserPlan;
  className?: string;
}

/** La duree d'une section au tempo courant, en secondes. */
function sectionSeconds(
  section: PlayedSection,
  bpm: number,
  beatsPerMeasure: number
): number {
  if (bpm <= 0) return 0;
  const measures = Math.max(1, section.endMeasure - section.startMeasure + 1);
  return (measures * beatsPerMeasure * 60) / bpm;
}

function formatSeconds(seconds: number): string {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${(total % 60).toString().padStart(2, "0")}`;
}

export function SongTabPanel({
  song,
  currentBpm,
  onRequestBpm,
  userPlan,
  className = "",
}: SongTabPanelProps) {
  const [tabWindowBlocked, setTabWindowBlocked] = useState(false);

  const beatsPerMeasure = song.tab_time_signature_beats ?? 4;

  // `song.tab_sections ?? []` fabrique un tableau neuf a chaque rendu :
  // le defaut doit vivre dans le memo, sinon il l'invalide en boucle.
  const timeline = useMemo(
    () =>
      (song.tab_sections ?? []).map((section) => ({
        ...section,
        seconds: sectionSeconds(section, currentBpm, beatsPerMeasure),
      })),
    [song.tab_sections, currentBpm, beatsPerMeasure]
  );

  const totalSeconds = timeline.reduce((sum, item) => sum + item.seconds, 0);

  const openTab = () => {
    if (!song.tabs_url) return;
    const opened = window.open(song.tabs_url, "ostinara-tab", "noopener");
    // Un bloqueur de fenetres ne leve pas d'erreur : il rend `null`.
    // Sans ce repli, le bouton ne ferait rien, sans rien dire.
    setTabWindowBlocked(opened === null);
  };

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Tablature</h3>

        {song.tabs_url ? (
          <button
            type="button"
            onClick={openTab}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[16px]"
            >
              open_in_new
            </span>
            Ouvrir la tab
          </button>
        ) : (
          <Link
            href={`/biblio?song=${song.id}`}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[16px]"
            >
              search
            </span>
            Chercher une tab
          </Link>
        )}
      </div>

      {tabWindowBlocked && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Le navigateur a bloqué la fenêtre.{" "}
          <a
            href={song.tabs_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Ouvrir la tablature directement
          </a>
          .
        </p>
      )}

      {/* Le tempo de la partition : une proposition en un geste. */}
      {song.tab_bpm && song.tab_bpm !== currentBpm && (
        <button
          type="button"
          onClick={() => onRequestBpm(song.tab_bpm!)}
          className="tabular mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[16px]"
          >
            speed
          </span>
          Caler le métronome sur la partition · {song.tab_bpm} BPM
        </button>
      )}

      {timeline.length > 0 ? (
        <div className="mt-3">
          <p className="tabular mb-2 text-xs text-muted-foreground">
            {timeline.length} section{timeline.length > 1 ? "s" : ""} ·{" "}
            {song.tab_total_measures ?? "?"} mesures · {formatSeconds(totalSeconds)}{" "}
            à {currentBpm} BPM
          </p>
          <ol className="flex flex-wrap gap-1.5">
            {timeline.map((section) => (
              <li
                key={`${section.name}-${section.startMeasure}`}
                className="tabular rounded-lg bg-accent px-2.5 py-1.5 text-xs"
              >
                <span className="font-medium">{section.name}</span>
                <span className="ml-1.5 text-muted-foreground">
                  {section.startMeasure}–{section.endMeasure} ·{" "}
                  {formatSeconds(section.seconds)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {song.tabs_url && isSongsterrUrl(song.tabs_url)
            ? "Analyse la tablature depuis la fiche du morceau pour récupérer le tempo et les sections."
            : "Lie une tablature Songsterr au morceau : le tempo, la mesure et les sections viendront avec."}
        </p>
      )}

      {/*
        L'original, pour l'oreille. Le lecteur Spotify est reserve aux
        plans payants comme partout ailleurs dans l'app.
      */}
      {song.spotify_id && userPlan !== "free" && (
        <div className="mt-4">
          <iframe
            title={`Écouter ${song.title} sur Spotify`}
            src={`https://open.spotify.com/embed/track/${song.spotify_id}?theme=0`}
            width="100%"
            height="80"
            allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl border-0"
          />
        </div>
      )}
    </div>
  );
}
