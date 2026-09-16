"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GEAR_TYPE_LABELS } from "@/types";
import type { UserProfile } from "@/types";

interface ProfileShowcaseProps {
  profile: UserProfile;
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
  // Material Symbols n'a pas de « guitar » : le nom etait rendu tel quel,
  // en toutes lettres, dans la police d'icones.
  gear: "tune",
};

/** Singulier, pluriel — un rang d'un seul element ne s'annonce pas au pluriel. */
const KIND_LABEL: Record<ShowcaseKind, [one: string, many: string]> = {
  song: ["Morceau favori", "Morceaux favoris"],
  album: ["Album favori", "Albums favoris"],
  gear: ["Matos favori", "Matos favoris"],
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
 * Le sens revient sans reprendre les 475 px.
 */
export function ProfileShowcase({ profile }: ProfileShowcaseProps) {
  const pathname = usePathname();

  // La vitrine appartient a l'accueil du profil : la trainer au-dessus
  // de Matos et Reglages obligerait a la depasser a chaque fois.
  if (pathname !== "/profil") return null;

  const byPosition = <T extends { position: number }>(a: T, b: T) =>
    a.position - b.position;

  const songs: ShowcaseItem[] = [...profile.favorite_songs]
    .sort(byPosition)
    .map((favorite) => ({
      key: favorite.id,
      kind: "song",
      title: favorite.song.title,
      subtitle: favorite.song.artist,
      coverUrl: favorite.song.cover_url,
    }));

  const albums: ShowcaseItem[] = [...profile.favorite_albums]
    .sort(byPosition)
    .map((favorite) => ({
      key: favorite.id,
      kind: "album",
      title: favorite.album_name,
      subtitle: favorite.artist_name,
      coverUrl: favorite.cover_url,
    }));

  const gear: ShowcaseItem[] = [...(profile.favorite_gear ?? [])]
    .sort(byPosition)
    .filter((favorite) => favorite.gear)
    .map((favorite) => ({
      key: favorite.id,
      kind: "gear",
      title: `${favorite.gear.brand} ${favorite.gear.model}`.trim(),
      subtitle: GEAR_TYPE_LABELS[favorite.gear.type] ?? "Matos",
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
    return (
      <Link
        href="/profile/edit?tab=favorites"
        className="mb-5 flex min-h-[44px] items-center gap-3 rounded-2xl border border-dashed border-border p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-muted-foreground"
        >
          favorite
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Compose ta vitrine</span>
          <span className="block text-xs text-muted-foreground">
            Tes morceaux, albums et matos favoris — visibles sur ton profil
          </span>
        </span>
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-muted-foreground"
        >
          chevron_right
        </span>
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
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Ma vitrine
        </h2>
        <Link
          href="/profile/edit?tab=favorites"
          className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Modifier
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {groups.map((group) => {
          const [one, many] = KIND_LABEL[group.kind];
          const label = group.items.length > 1 ? many : one;
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
                className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.coverUrl}
                        alt=""
                        className="h-[88px] w-[88px] rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-[88px] w-[88px] items-center justify-center rounded-xl bg-accent">
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-muted-foreground"
                        >
                          {KIND_ICON[group.kind]}
                        </span>
                      </div>
                    )}

                    <p className="mt-1.5 truncate text-xs font-medium">
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
