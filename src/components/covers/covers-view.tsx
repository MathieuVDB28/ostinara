"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CoverCard } from "./cover-card";
import { CoverDetailModal } from "./cover-detail-modal";
import { ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useMyProfileIsPrivate } from "@/components/providers/profile-privacy-provider";
import { effectiveVisibility } from "@/lib/visibility";
import type { CoverWithSong, CoverVisibility } from "@/types";

interface CoversViewProps {
  initialCovers: CoverWithSong[];
  coverLimit?: number;
  coverCount?: number;
  /** Cover a ouvrir a l'arrivee — lien profond de la recherche globale. */
  initialCoverId?: string;
}

const FILTERS: (CoverVisibility | "all")[] = ["all", "private", "friends", "public"];

export function CoversView({
  initialCovers,
  coverLimit,
  coverCount,
  initialCoverId,
}: CoversViewProps) {
  const t = useTranslations("covers.view");
  const filters = FILTERS.map((value) => ({ value, label: t(value) }));
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

  // Ce que la cover donne vraiment : « Public » reste entre amis sur un profil prive.
  const profileIsPrivate = useMyProfileIsPrivate();
  const visibilityOf = (cover: CoverWithSong) => effectiveVisibility(cover.visibility, profileIsPrivate);

  const filteredCovers = covers.filter((cover) => {
    return activeFilter === "all" || visibilityOf(cover) === activeFilter;
  });

  const handleRefresh = () => {
    router.refresh();
  };

  const stats = {
    total: covers.length,
    private: covers.filter(c => visibilityOf(c) === "private").length,
    friends: covers.filter(c => visibilityOf(c) === "friends").length,
    public: covers.filter(c => visibilityOf(c) === "public").length,
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
          aria-label={t("filterAria")}
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
          {t("feed")}
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      <div aria-hidden="true" className="-mx-4 mb-5 mt-3 h-px bg-border lg:mx-0" />

      {coverLimit && coverCount !== undefined && (
        <p className="tabular mb-3 text-xs text-muted-foreground">
          {t("usage", { count: coverCount, limit: coverLimit })}
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
              title={t("noneHere")}
              description={t("elsewhere", { count: stats.total })}
              actions={[
                {
                  label: t("seeAll"),
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
          title={t("none")}
          description={t("noneDescription")}
          actions={[
            {
              label: t("chooseSong"),
              icon: "music_note",
              primary: true,
              href: "/biblio",
            },
            { label: t("seeFeed"), icon: "feed", href: "/commu/covers" },
          ]}
          hint={t("noneHint")}
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
