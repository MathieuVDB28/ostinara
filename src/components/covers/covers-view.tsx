"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CoverCard } from "./cover-card";
import { CoverDetailModal } from "./cover-detail-modal";
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
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes covers</h1>
          <p className="mt-1 text-muted-foreground">
            {stats.total} cover{stats.total > 1 ? "s" : ""}
            {coverLimit && coverCount !== undefined && (
              <span className="text-xs ml-2">({coverCount}/{coverLimit} utilisés)</span>
            )}
          </p>
        </div>

        {/*
          Cet ecran est l'archive : il montre aussi les covers privees.
          Le feed est ailleurs, dans « Commu » — et il faut pouvoir y
          aller depuis ici, sinon les deux ecrans s'ignorent.
        */}
        <Link
          href="/commu/covers"
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            feed
          </span>
          Le feed des covers
        </Link>
      </div>

      {covers.length > 0 ? (
        <>
          {/* Filtres */}
          <div className="mb-6 flex gap-6 border-b border-border">
            {filters.map((filter) => {
              const count = filter.value === "all" ? stats.total : stats[filter.value];
              return (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                    activeFilter === filter.value
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter.label}
                  {count > 0 && (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      activeFilter === filter.value ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Grille des covers */}
          {filteredCovers.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
