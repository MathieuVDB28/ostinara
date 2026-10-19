"use client";

import { Check, FileText, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { Cover } from "@/components/ui/cover";
import { Icon } from "@/components/ui/icon";
import { songTempoProgress } from "@/lib/song-progress";
import { instrumentMeta, sortInstruments } from "@/lib/instruments";
import type { Instrument, Song, SongDifficulty, SongStatus } from "@/types";

interface SongCardProps {
  song: Song;
  /** Meilleur tempo tenu en session — la seule mesure honnete de l'avancee. */
  bestBpm?: number | null;
  onClick: () => void;
}

const DIFFICULTY_LEVEL: Record<SongDifficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

/**
 * La difficulte en reperes de touche : un a quatre points, comme les
 * inlays d'un manche.
 *
 * Les badges precedents disaient "EASY" / "ADVANCED" en capitales
 * anglaises dans une app francaise, et leur sens tenait entierement dans
 * la teinte : text-success sur une carte blanche donne 1,7:1, et
 * text-chart-2 2,5:1 — sous le minimum de 4,5:1. Ici c'est le nombre de
 * points qui porte l'information, pas la couleur.
 */
function FretMarkers({ difficulty }: { difficulty: SongDifficulty }) {
  const level = DIFFICULTY_LEVEL[difficulty];
  const t = useTranslations("library");
  const te = useTranslations("enums");
  const label = te(`difficulty.${difficulty}`);

  return (
    <span className="inline-flex items-center gap-[3px]">
      <span className="sr-only">
        {t("difficultyLabel", { level: label })}
      </span>
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          aria-hidden="true"
          className={`h-[5px] w-[5px] rounded-full ${
            step <= level ? "bg-foreground/75" : "bg-foreground/15"
          }`}
        />
      ))}
      <span
        aria-hidden="true"
        className="ml-1.5 text-[11px] font-medium text-muted-foreground"
      >
        {label}
      </span>
    </span>
  );
}

/**
 * La lecture de l'avancee d'un morceau, partagee par la ligne et l'etagere.
 *
 * « 88/104 » se compare d'un morceau a l'autre, « 62 % » ne se compare a
 * rien : le pourcentage saisi a la main ne revient que pour les morceaux
 * sans tempo cible.
 */
export function songProgress(song: Song, bestBpm?: number | null) {
  const tempo = songTempoProgress(song, bestBpm);
  return {
    tempo,
    percent: tempo ? tempo.percent : song.progress_percent,
  };
}

/**
 * Une ligne de la bibliotheque (vue « Voir tout »).
 *
 * Plus de carte bordee par morceau ni de chevron (docs/refonte-ui.md,
 * style Etagere) : les lignes reposent sur le fond, separees par un filet,
 * et toute la ligne ouvre la fiche.
 */
export function SongCard({ song, bestBpm, onClick }: SongCardProps) {
  const t = useTranslations("library");
  const te = useTranslations("enums");
  const partLabel = (instrument: Instrument, status: SongStatus) =>
    `${te(`instrument.${instrument}`)} · ${te(`songStatus.${status}`).toLowerCase()}`;
  const isLearning = song.status === "learning";
  const isMastered = song.status === "mastered";
  const { tempo, percent } = songProgress(song, bestBpm);

  // Une seule ligne de metadonnees, dans l'ordre ou un musicien en a
  // besoin avant de jouer : accordage, tempo, capo. Le tempo affiche est
  // celui qu'on vise, pas celui de l'enregistrement original.
  const meta = [
    song.tuning,
    tempo ? `${tempo.target} BPM` : null,
    song.capo_position > 0 ? t("capo", { position: song.capo_position }) : null,
  ].filter(Boolean) as string[];

  const coversCount = song.covers_count ?? 0;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3.5 border-b border-border px-1 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Pochette. La progression vit dessus plutot que dans un badge de plus. */}
      <Cover src={song.cover_url} className="h-12 w-12 rounded-[4px]">
        {isLearning && (
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-foreground/20">
            <span className="block h-full bg-primary" style={{ width: `${percent}%` }} />
          </span>
        )}
      </Cover>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold">{song.title}</h3>
        <p className="truncate text-[13px] text-muted-foreground">{song.artist}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {song.difficulty && <FretMarkers difficulty={song.difficulty} />}

          {meta.length > 0 && (
            <span className="tabular truncate text-[11px] text-muted-foreground">
              {meta.join(" · ")}
            </span>
          )}

          {/* Travaille sur plusieurs instruments : ou en est chacun. */}
          {song.parts && song.parts.length > 1 && (
            <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              {sortInstruments(song.parts.map((part) => ({ ...part, is_primary: false }))).map((part) => (
                <span
                  key={part.instrument}
                  title={partLabel(part.instrument, part.status)}
                  className={`inline-flex items-center gap-0.5 ${part.status === "mastered" ? "text-success" : ""}`}
                >
                  <Icon name={instrumentMeta(part.instrument).icon} className="h-3.5 w-3.5" />
                  {part.status === "mastered" && <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
                  <span className="sr-only">
                    {partLabel(part.instrument, part.status)}
                  </span>
                </span>
              ))}
            </span>
          )}

          {/* Ce que le morceau possede deja : monochrome, l'ambre reste
              reserve a l'interactif et au tempo. */}
          {song.tabs_url && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <FileText className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              {t("tab")}
            </span>
          )}

          {coversCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Video className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              {coversCount}
              <span className="sr-only">{t("coversSr", { count: coversCount })}</span>
            </span>
          )}
        </div>
      </div>

      {isLearning && (
        <span className="tabular shrink-0 font-display text-lg font-bold leading-none">
          {tempo ? (
            <>
              {tempo.achieved}
              <span className="text-sm text-muted-foreground">/{tempo.target}</span>
              <span className="sr-only"> BPM</span>
            </>
          ) : (
            <>
              {percent}
              <span className="text-sm text-muted-foreground"> %</span>
            </>
          )}
        </span>
      )}
      {isMastered && (
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-success">
          <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          <span className="sr-only">{te("songStatus.mastered")}</span>
        </span>
      )}
    </button>
  );
}
