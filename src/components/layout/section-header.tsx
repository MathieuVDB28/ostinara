"use client";

import { usePathname } from "next/navigation";
import { SegmentedNav, type SegmentedNavVariant } from "./segmented-nav";
import { activeSegment, type BadgeCounts, type NavTab } from "@/lib/navigation";

interface SectionHeaderProps {
  tab: NavTab;
  title: string;
  badges?: BadgeCounts;
  variant?: SegmentedNavVariant;
}

/*
 * Le titre suit le style du domaine : en Fanzine (pastilles), il passe en
 * capitales condensees comme un titre d'affiche ; ailleurs il reste dans
 * la police de texte.
 */
const TITLE: Record<SegmentedNavVariant, string> = {
  segmented: "text-2xl font-extrabold lg:text-3xl",
  underline: "font-display text-4xl font-extrabold uppercase leading-none tracking-[0.01em]",
  pills: "font-display text-3xl font-extrabold uppercase leading-none tracking-[0.02em] lg:text-4xl",
};

/**
 * En-tete d'onglet, efface sur les vues de detail.
 *
 * Une vue poussee — le detail d'un groupe, par exemple — remplace le
 * contenu de la section : garder le titre et les segments au-dessus
 * empilerait deux niveaux de navigation sur un ecran qui n'en a qu'un.
 */
export function SectionHeader({ tab, title, badges, variant = "segmented" }: SectionHeaderProps) {
  const pathname = usePathname();

  // Un chemin plus profond que le segment le plus specifique est une
  // vue de detail. Le plus specifique, pas n'importe lequel : « /commu »
  // couvre aussi « /commu/albums », qui est une section et non un detail —
  // l'en-tete disparaissait sur tous les segments sauf le premier.
  const current = activeSegment(tab, pathname);
  const isDetailView = current !== undefined && pathname !== current.href;

  if (isDetailView) return null;

  return (
    <>
      <h1 className={`mb-4 ${TITLE[variant]}`}>{title}</h1>
      <SegmentedNav tab={tab} badges={badges} variant={variant} className="mb-6" />
    </>
  );
}
