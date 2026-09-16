"use client";

import { useCallback, useEffect, useRef } from "react";
import { GuitarTuner } from "./guitar-tuner";
import { SongIdentifier } from "./song-identifier";
import { ProUpsell } from "@/components/subscription/pro-upsell";

interface TunerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isPaid: boolean;
}

/**
 * L'accordeur en feuille modale plutot qu'en troisieme onglet.
 *
 * "Jouer" empilait trois niveaux de navigation : la barre du bas, puis
 * Morceau / Exercices / Accordeur, puis le selecteur de morceau. Or
 * accorder n'est pas une sous-section du fait de jouer, c'est une
 * fonction ponctuelle : on l'ouvre, on accorde, on revient. Deux
 * segments suffisent, et la feuille peut etre appelee a tout moment.
 *
 * Le contenu est monte a l'ouverture seulement : usePitchDetection
 * libere le micro a son demontage, l'onglet le gardait ouvert tant
 * qu'on n'avait pas change de segment.
 */
export function TunerSheet({ isOpen, onClose, isPaid }: TunerSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Le focus revient au bouton qui a ouvert la feuille, pas en haut de page.
  const openerRef = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    onClose();
    openerRef.current?.focus();
    openerRef.current = null;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tuner-sheet-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-border bg-card shadow-xl outline-none sm:max-w-lg sm:rounded-2xl"
      >
        {/* Poignee : elle annonce qu'on peut chasser la feuille vers le bas */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span
            aria-hidden="true"
            className="h-1 w-9 rounded-full bg-muted-foreground/40"
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
          <h2 id="tuner-sheet-title" className="text-lg font-bold">
            Accordeur
          </h2>
          <button
            onClick={handleClose}
            aria-label="Fermer l'accordeur"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        <div className="space-y-5 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-5">
          <div className="rounded-2xl border border-border">
            <GuitarTuner />
          </div>

          {/* L'identification de morceau reste une fonction payante */}
          {isPaid ? (
            <div className="rounded-2xl border border-border">
              <SongIdentifier />
            </div>
          ) : (
            <ProUpsell
              feature="Reconnaissance audio"
              description="Identifie n'importe quel morceau en quelques secondes. Disponible avec les plans Pro et Band."
            />
          )}
        </div>
      </div>
    </div>
  );
}
