"use client";

import { usePathname } from "next/navigation";
import { SegmentedNav } from "./segmented-nav";
import { coversPath, type BadgeCounts, type NavTab } from "@/lib/navigation";

interface SectionHeaderProps {
  tab: NavTab;
  title: string;
  badges?: BadgeCounts;
}

/**
 * En-tete d'onglet, efface sur les vues de detail.
 *
 * Une vue poussee — le detail d'un groupe, par exemple — remplace le
 * contenu de la section : garder le titre et les segments au-dessus
 * empilerait deux niveaux de navigation sur un ecran qui n'en a qu'un.
 */
export function SectionHeader({ tab, title, badges }: SectionHeaderProps) {
  const pathname = usePathname();

  // Un chemin plus profond que le segment le plus specifique est une
  // vue de detail.
  const isDetailView = tab.segments.some(
    (segment) => pathname !== segment.href && coversPath(segment.href, pathname)
  );

  if (isDetailView) return null;

  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold lg:text-3xl">{title}</h1>
      <SegmentedNav tab={tab} badges={badges} />
    </>
  );
}
