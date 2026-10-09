"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CoverCard } from "./cover-card";
import { CoverDetailModal } from "./cover-detail-modal";
import { ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { CoverWithSong, CoverVisibility } from "@/types";

interface CoversViewProps {
  initialCovers: CoverWithSong[];
  canUpload: boolean;
  coverLimit?: number;
  coverCount?: number;
  /** Cover a ouvrir a l'arrivee — lien profond de la recherche globale. */
  initialCoverId?: string;
}

const filters: { value: CoverVisibility | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "private", label: "Privés" },
  { value: "friends", label: "Amis" },
  { value: "public", label: "Publics" },
];

export function CoversView({
  initialCovers,
  canUpload,
  coverLimit,
  coverCount,
  initialCoverId,
}: CoversViewProps) {
  const router = useRouter();
  const [covers, setCovers] = useState(initialCovers);
  // Arrivee depuis la recherche globale : la cover demandee s'ouvre des le
  // premier rendu.
  const [selectedCover, setSelectedCover] = useState<CoverWithSong | null>(
    () => initialCovers.find((cover) => cover.id === initialCoverId) ?? null
  );
  const [activeFilter, setActiveFilter] = useState<CoverVisibility | "all">("all");

  useEffect(() => {
    setCovers(initialCovers);
  }, [initialCovers]);

  const filteredCovers = covers.filter((cover) => {
    return activeFilter === "all" || cover.visibility === activeFilter;
  });

  const handleRefresh = () => {
    router.refresh();
  };

  const stats = {
    total: covers.length,
    private: covers.filter(c => c.visibility === "private").length,
    friends: covers.filter(c => c.visibility === "friends").length,
    public: covers.filter(c => c.visibility === "public").length,
  };

  return (
    <div>
      {/*
        Filtres de visibilite et lien vers le feed sur une rangee. Le titre
        « Mes covers » repetait le segment juste au-dessus.
      */}
      <div className="flex items-center gap-1.5">
        <div
          role="group"
          aria-label="Filtrer par visibilité"
          className="-ml-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5 pl-4 [-ms-overflow-style:none] [scrollbar-width:none] lg:ml-0 lg:pl-0 [&::-webkit-scrollbar]:hidden"
        >
          {filters.map((filter) => {
            const count = filter.value === "all" ? stats.total : stats[filter.value];
            const isActive = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                aria-pressed={isActive}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter.label}
                {count > 0 && <span className="tabular opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        {/*
          Cet ecran est l'archive : il montre aussi les covers privees.
          Le feed est ailleurs, dans « Commu » — et il faut pouvoir y
          aller depuis ici, sinon les deux ecrans s'ignorent.
        */}
        <Link
          href="/commu/covers"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Le feed
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      <div aria-hidden="true" className="-mx-4 mb-5 mt-3 h-px bg-border lg:mx-0" />

      {coverLimit && coverCount !== undefined && (
        <p className="tabular mb-3 text-xs text-muted-foreground">
          {coverCount}/{coverLimit} covers utilisées avec ton plan
        </p>
      )}

      {covers.length > 0 ? (
        <>
          {/* Grille des covers */}
          {filteredCovers.length > 0 ? (
            <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCovers.map((cover) => (
                <CoverCard
                  key={cover.id}
                  cover={cover}
                  onClick={() => setSelectedCover(cover)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon="videocam"
              title="Aucun cover ici"
              description={`Tes ${stats.total} cover${stats.total > 1 ? "s" : ""} sont rangés sous un autre niveau de visibilité.`}
              actions={[
                {
                  label: "Voir tous les covers",
                  primary: true,
                  onClick: () => setActiveFilter("all"),
                },
              ]}
            />
          )}
        </>
      ) : (
        /*
          Un cover s'enregistre depuis la fiche d'un morceau, pas depuis
          cet ecran : l'etat vide doit dire ou aller, et ce qui se passe
          apres — sinon « Aller a la bibliotheque » ressemble a un renvoi.
        */
        <EmptyState
          icon="videocam"
          title="Aucun cover"
          description="Un cover, c'est ta version d'un morceau, filmée ou enregistrée. Il part de la fiche du morceau, dans ta bibliothèque."
          actions={[
            {
              label: "Choisir un morceau",
              icon: "music_note",
              primary: true,
              href: "/biblio",
            },
            { label: "Voir le feed des covers", icon: "feed", href: "/commu/covers" },
          ]}
          hint="Un cover est privé par défaut. Tu choisis ensuite s'il reste pour toi, pour tes amis, ou public."
        />
      )}

      {/* Modal de détail */}
      <CoverDetailModal
        cover={selectedCover}
        isOpen={!!selectedCover}
        onClose={() => setSelectedCover(null)}
        onUpdate={handleRefresh}
      />
    </div>
  );
}
