"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { markBadgesSeen } from "@/lib/actions/badges";
import { badgeGoal, badgeLabel, type UserBadgeRow } from "@/lib/badges/catalog";
import { BadgeMedal } from "./badge-medal";

interface BadgeToasterProps {
  /** Les badges debloques pas encore montres, lus par le layout. */
  unseen: UserBadgeRow[];
}

const DURATION_MS = 7000;

/**
 * « Badge debloque », au-dessus de la pilule.
 *
 * Le layout lit les badges non vus a chaque rendu ; une action qui en
 * debloque un revalide le layout, et le toast arrive avec la reponse. Il
 * est marque vu des qu'il s'affiche : il ne revient pas a la page suivante.
 */
export function BadgeToaster({ unseen }: BadgeToasterProps) {
  const [visible, setVisible] = useState<UserBadgeRow[]>(unseen);
  const [previous, setPrevious] = useState(unseen);

  // Une nouvelle liste du layout s'ajoute a celles deja a l'ecran : un
  // re-rendu juste apres l'affichage ne doit pas effacer le toast.
  if (unseen !== previous) {
    setPrevious(unseen);
    const known = new Set(visible.map((row) => row.id));
    const added = unseen.filter((row) => !known.has(row.id));
    if (added.length > 0) setVisible([...visible, ...added]);
  }

  useEffect(() => {
    const ids = unseen.map((row) => row.id).filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;

    markBadgesSeen(ids).catch(console.error);

    const timer = setTimeout(() => {
      setVisible((current) => current.filter((row) => !ids.includes(row.id ?? "")));
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, [unseen]);

  if (visible.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-50 mx-auto flex max-w-sm flex-col gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
    >
      {visible.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg"
        >
          <BadgeMedal badgeId={row.badge_id} level={row.level} size="sm" />
          <Link href="/profil/badges" className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Badge débloqué
            </p>
            <p className="truncate font-display text-lg font-extrabold uppercase leading-tight">
              {badgeLabel(row.badge_id, row.level)}
            </p>
            <p className="truncate text-xs text-muted-foreground">{badgeGoal(row.badge_id, row.level)}</p>
          </Link>
          <button
            type="button"
            onClick={() => setVisible((current) => current.filter((item) => item.id !== row.id))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Fermer</span>
          </button>
        </div>
      ))}
    </div>
  );
}
