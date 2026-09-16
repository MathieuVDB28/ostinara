"use client";

import { songTempoProgress } from "@/lib/song-progress";
import type { Song, SongDifficulty } from "@/types";

interface SongCardProps {
  song: Song;
  /** Meilleur tempo tenu en session — la seule mesure honnete de l'avancee. */
  bestBpm?: number | null;
  onClick: () => void;
}

const DIFFICULTY_LABELS: Record<SongDifficulty, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

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

  return (
    <span className="inline-flex items-center gap-[3px]">
      <span className="sr-only">
        Difficulté : {DIFFICULTY_LABELS[difficulty]}
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
        {DIFFICULTY_LABELS[difficulty]}
      </span>
    </span>
  );
}

export function SongCard({ song, bestBpm, onClick }: SongCardProps) {
  const isLearning = song.status === "learning";
  const isMastered = song.status === "mastered";

  /*
   * La progression, en tempo.
   *
   * `progress_percent` etait saisi au curseur : un chiffre pose une fois,
   * jamais revu, et faux des la deuxieme semaine. Le tempo tenu en session
   * est mesure, compare a une cible qui existe deja. Quand aucune cible
   * n'est connue, on retombe sur l'ancienne valeur plutot que d'inventer.
   */
  const tempo = songTempoProgress(song, bestBpm);
  const percent = tempo ? tempo.percent : song.progress_percent;

  // Une seule ligne de metadonnees, dans l'ordre ou un guitariste en a
  // besoin avant de jouer : accordage, tempo, capo. Le tempo affiche est
  // celui qu'on vise, pas celui de l'enregistrement original.
  const meta = [
    song.tuning,
    tempo ? `${tempo.target} BPM` : null,
    song.capo_position > 0 ? `Capo ${song.capo_position}` : null,
  ].filter(Boolean) as string[];

  const coversCount = song.covers_count ?? 0;

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3.5 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Pochette. La progression vit dessus plutot que dans un badge de plus. */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {song.cover_url ? (
          <img
            src={song.cover_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="material-symbols-outlined flex h-full w-full items-center justify-center text-2xl text-muted-foreground"
          >
            music_note
          </span>
        )}

        {isLearning && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1.5 bg-foreground/20"
          >
            <span
              className="block h-full bg-primary"
              style={{ width: `${percent}%` }}
            />
          </span>
        )}

        {isMastered && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-success-foreground"
          >
            <span className="material-symbols-outlined text-[14px]">check</span>
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold">
            {song.title}
          </h3>
          {/*
            La lecture chiffree : « 88/104 » se compare d'une carte a
            l'autre, « 62 % » ne se compare a rien. Le pourcentage ne
            revient que pour les morceaux sans tempo cible.
          */}
          {isLearning && (
            <span className="tabular shrink-0 text-xs font-semibold text-primary">
              {tempo ? (
                <>
                  {tempo.achieved}
                  <span className="text-muted-foreground">/{tempo.target}</span>
                  <span className="sr-only"> BPM</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          )}
          {isMastered && (
            <span className="shrink-0 text-xs font-semibold text-success">
              Maîtrisé
            </span>
          )}
        </div>

        <p className="truncate text-[13px] text-muted-foreground">
          {song.artist}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {song.difficulty && <FretMarkers difficulty={song.difficulty} />}

          {meta.length > 0 && (
            <span className="tabular truncate text-[11px] text-muted-foreground">
              {meta.join(" · ")}
            </span>
          )}

          {/* Ce que le morceau possede deja : monochrome, l'ambre reste
              reserve a l'interactif et au tempo. */}
          {song.tabs_url && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[14px]"
              >
                description
              </span>
              Tab
            </span>
          )}

          {coversCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[14px]"
              >
                videocam
              </span>
              {coversCount}
              <span className="sr-only">
                cover{coversCount > 1 ? "s" : ""}
              </span>
            </span>
          )}
        </div>
      </div>

      {/*
        C'etait un more_vert revele au survol : invisible au doigt, et il
        promettait un menu alors que toute la carte ouvre la fiche.
      */}
      <span
        aria-hidden="true"
        className="material-symbols-outlined shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      >
        chevron_right
      </span>
    </button>
  );
}
