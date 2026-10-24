"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { FavoriteAlbum, FavoriteGear, ShowcaseFavoriteSong } from "@/types";
import { Icon } from "@/components/ui/icon";
import { Cover } from "@/components/ui/cover";

interface ProfileShowcaseProps {
  favoriteSongs: ShowcaseFavoriteSong[] | null;
  favoriteAlbums: FavoriteAlbum[] | null;
  favoriteGear: FavoriteGear[] | null;
  /**
   * Sa propre vitrine : titre « Ma vitrine », lien « Modifier », invitation
   * a la composer quand elle est vide, et affichage sur l'accueil du
   * profil seulement. Celle d'un ami se lit, et se tait quand elle est vide.
   */
  editable?: boolean;
}

type ShowcaseKind = "song" | "album" | "gear";

interface ShowcaseItem {
  key: string;
  kind: ShowcaseKind;
  title: string;
  subtitle: string;
  coverUrl?: string;
}

/** Le glyphe de repli, quand il n'y a pas de pochette ni de photo. */
const KIND_ICON: Record<ShowcaseKind, string> = {
  song: "music_note",
  album: "album",
  gear: "guitar",
};

/**
 * La vitrine : morceaux, albums et matos favoris.
 *
 * Elle occupait trois rangees empilees — environ 475 px — juste au-dessus
 * de la progression, qui est la raison d'ouvrir l'ecran. Elle a d'abord
 * ete reduite a un rail unique ou une pastille de type marquait chaque
 * vignette : trop discret, on ne distinguait plus un album d'un morceau.
 *
 * Elle retrouve donc un rang par type, avec son intitule ecrit — mais
 * seulement pour les types remplis, et sur des vignettes restees petites.
 * Le sens revient sans reprendre les 475 px. Sur grand ecran, les rangs
 * se posent cote a cote (et passent a la ligne s'il en reste un de trop) :
 * empiles, ils laissaient un grand vide a droite et repoussaient la
 * progression plus bas.
 */
export function ProfileShowcase({
  favoriteSongs,
  favoriteAlbums,
  favoriteGear,
  editable = false,
}: ProfileShowcaseProps) {
  const pathname = usePathname();
  const t = useTranslations("profile.showcase");
  const te = useTranslations("enums");

  // La vitrine appartient a l'accueil du profil : la trainer au-dessus
  // de Matos et Reglages obligerait a la depasser a chaque fois.
  if (editable && pathname !== "/profil") return null;

  const byPosition = <T extends { position: number }>(a: T, b: T) =>
    a.position - b.position;

  const songs: ShowcaseItem[] = [...(favoriteSongs ?? [])]
    .sort(byPosition)
    .filter((favorite) => favorite.song)
    .map((favorite) => ({
      key: favorite.id,
      kind: "song",
      title: favorite.song.title,
      subtitle: favorite.song.artist,
      coverUrl: favorite.song.cover_url,
    }));

  const albums: ShowcaseItem[] = [...(favoriteAlbums ?? [])]
    .sort(byPosition)
    .map((favorite) => ({
      key: favorite.id,
      kind: "album",
      title: favorite.album_name,
      subtitle: favorite.artist_name,
      coverUrl: favorite.cover_url,
    }));

  const gear: ShowcaseItem[] = [...(favoriteGear ?? [])]
    .sort(byPosition)
    .filter((favorite) => favorite.gear)
    .map((favorite) => ({
      key: favorite.id,
      kind: "gear",
      title: `${favorite.gear.brand} ${favorite.gear.model}`.trim(),
      subtitle: favorite.gear.type ? te(`gearType.${favorite.gear.type}`) : t("gear"),
      coverUrl: favorite.gear.image_url,
    }));

  /*
   * Un rang par type, les types vides passes sous silence : afficher
   * « Matos favori » a qui n'en a pas ajoute ne dit rien et coute une
   * ligne.
   */
  const groups = (
    [
      { kind: "song" as const, items: songs },
      { kind: "album" as const, items: albums },
      { kind: "gear" as const, items: gear },
    ] satisfies { kind: ShowcaseKind; items: ShowcaseItem[] }[]
  ).filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    if (!editable) return null;
    return (
      <Link
        href="/profile/edit?tab=favorites"
        className="mb-5 flex min-h-[44px] items-center gap-3 border-b border-border py-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon name="favorite" className="h-6 w-6 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{t("compose")}</span>
          <span className="block text-xs text-muted-foreground">
            {t("composeHint")}
          </span>
        </span>
        <Icon name="chevron_right" className="h-6 w-6 text-muted-foreground" />
      </Link>
    );
  }

  return (
    <section aria-labelledby="showcase-heading" className="mb-5">
      {/*
        « Modifier » se pose contre le titre, pas a l'autre bout de la
        ligne : rejete a droite, il flottait au-dessus du premier rang et
        semblait porter sur lui plutot que sur la vitrine entiere.
      */}
      <div className="mb-2.5 flex items-baseline gap-3">
        <h2
          id="showcase-heading"
          className="font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground"
        >
          {editable ? t("mine") : t("theirs")}
        </h2>
        {editable && (
          <Link
            href="/profile/edit?tab=favorites"
            className="text-xs font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("edit")}
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:gap-x-10">
        {groups.map((group) => {
          // Un rang d'un seul element ne s'annonce pas au pluriel.
          const label = t(`kinds.${group.kind}`, { count: group.items.length });
          const headingId = `showcase-${group.kind}`;

          return (
            <div key={group.kind}>
              {/*
                L'intitule ecrit, pas une pastille : c'est lui qui dit
                qu'on regarde des albums, et il le dit une fois pour le
                rang entier plutot que douze fois en 13 px.
              */}
              <h3
                id={headingId}
                className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                {label}
              </h3>

              <ul
                aria-labelledby={headingId}
                className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {group.items.map((item) => (
                  <li key={item.key} className="w-[88px] shrink-0">
                    {item.coverUrl ? (
                      <Cover src={item.coverUrl} className="h-[88px] w-[88px] rounded-[4px]" />
                    ) : (
                      <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[4px] bg-secondary">
                        <Icon name={KIND_ICON[group.kind]} className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}

                    <p className="mt-1.5 truncate text-xs font-semibold">
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.subtitle}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
