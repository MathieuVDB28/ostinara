"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CoverCard } from "./cover-card";
import { CoverDetailModal } from "./cover-detail-modal";
import type { CoverWithSong, CoverVisibility } from "@/types";

interface CoversViewProps {
  initialCovers: CoverWithSong[];
  canUpload: boolean;
  coverLimit?: number;
  coverCount?: number;
}

const filters: { value: CoverVisibility | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "private", label: "Privés" },
  { value: "friends", label: "Amis" },
  { value: "public", label: "Publics" },
];

export function CoversView({ initialCovers, canUpload, coverLimit, coverCount }: CoversViewProps) {
  const router = useRouter();
  const [covers, setCovers] = useState(initialCovers);
  const [selectedCover, setSelectedCover] = useState<CoverWithSong | null>(null);
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
      </div>

      {covers.length > 0 ? (
        <>
          {/* Filtres */}
          <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1 w-fit">
            {filters.map((filter) => {
              const count = filter.value === "all" ? stats.total : stats[filter.value];
              return (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeFilter === filter.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter.label}
                  <span className="ml-1.5 text-xs opacity-60">({count})</span>
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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
              <p className="text-muted-foreground">Aucun cover avec ce filtre</p>
              <button
                onClick={() => setActiveFilter("all")}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Voir tous les covers
              </button>
            </div>
          )}
        </>
      ) : (
        /* État vide */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M10 9L15 12L10 15V9Z" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Aucun cover</h3>
          <p className="mb-6 max-w-sm text-center text-muted-foreground">
            Enregistre ton premier cover depuis ta bibliothèque de morceaux
          </p>
          <button
            onClick={() => router.push("/library")}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            Aller à la bibliothèque
          </button>
        </div>
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
