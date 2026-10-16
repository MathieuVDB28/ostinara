import type { Song, CatalogAlbumTrack } from "@/types";

/**
 * Les moments ou une feature passe la main a une autre.
 *
 * Ajouter un moment ici, puis sa vue dans next-step-sheet.tsx, et
 * appeler `useNextSteps().show()` la ou le geste se termine.
 */
export type NextStep =
  /** Morceau -> cover, setlist. */
  | { kind: "song_mastered"; song: Song }
  /** Cover postee -> setlist de la prochaine repete. */
  | { kind: "cover_posted"; song: Song; rehearsals: RehearsalTarget[] }
  /** Morceau repris d'ailleurs -> session, defi avec l'ami d'origine. */
  | { kind: "song_added"; song: Song; from?: { id: string; name: string } }
  /** Album ecoute -> titres a apprendre dans la biblio. */
  | {
      kind: "album_tracks";
      album: { name: string; artist: string; coverUrl?: string; deezerId: string };
      /** Absents : la feuille les charge depuis Deezer. */
      tracks?: CatalogAlbumTrack[];
      /** Les titres coches d'emblee — le prefere, en general. */
      preselected?: string[];
    };

/** Une repete a venir qui a une setlist ou ranger le morceau. */
export interface RehearsalTarget {
  rehearsalId: string;
  title: string;
  date: string;
  bandName: string;
  setlistId: string;
  setlistName: string;
}
