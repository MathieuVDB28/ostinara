"use client";

import { useCallback } from "react";
import { SwipeRow, type SwipeAction, type SwipeActionTone } from "@/components/ui/swipe-row";
import { updateSongStatus } from "@/lib/actions/songs";
import type { Song, SongStatus } from "@/types";

/**
 * Le changement de statut, sans passer par la fiche.
 *
 * « Je viens de boucler ce morceau » etait l'action la plus frequente de
 * la bibliotheque et la plus chere : ouvrir EditSongModal, trouver le
 * selecteur, enregistrer, fermer. Ici, un glissement.
 */

const STATUS_ACTION: Record<
  SongStatus,
  { label: string; icon: string; tone: SwipeActionTone }
> = {
  learning: { label: "En cours", icon: "play_arrow", tone: "primary" },
  mastered: { label: "Maîtrisé", icon: "check", tone: "success" },
  want_to_learn: { label: "À apprendre", icon: "bookmark", tone: "neutral" },
};

/**
 * L'ordre des actions proposees, le plus probable d'abord. Le statut
 * courant est retire : proposer « En cours » sur un morceau en cours
 * remplirait le tiroir d'un bouton sans effet.
 */
const OFFER_ORDER: SongStatus[] = ["learning", "mastered", "want_to_learn"];

interface SongSwipeRowProps {
  song: Song;
  onStatusChange: (songId: string, status: SongStatus) => void;
  children: React.ReactNode;
}

export function SongSwipeRow({
  song,
  onStatusChange,
  children,
}: SongSwipeRowProps) {
  const apply = useCallback(
    async (status: SongStatus) => {
      // L'affichage bascule tout de suite : le resultat d'un glissement
      // doit etre visible avant l'aller-retour reseau.
      onStatusChange(song.id, status);
      const result = await updateSongStatus(song.id, status);
      // L'echec remet la carte dans son etat reel plutot que de mentir.
      if (!result.success) onStatusChange(song.id, song.status);
    },
    [onStatusChange, song.id, song.status]
  );

  const actions: SwipeAction[] = OFFER_ORDER.filter(
    (status) => status !== song.status
  ).map((status) => ({
    key: status,
    label: STATUS_ACTION[status].label,
    icon: STATUS_ACTION[status].icon,
    tone: STATUS_ACTION[status].tone,
    onAction: () => apply(status),
  }));

  return (
    <SwipeRow actions={actions} label={song.title}>
      {children}
    </SwipeRow>
  );
}
