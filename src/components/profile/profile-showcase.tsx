"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GEAR_TYPE_LABELS } from "@/types";
import type { UserProfile } from "@/types";

interface ProfileShowcaseProps {
  profile: UserProfile;
}

interface ShowcaseItem {
  key: string;
  title: string;
  subtitle: string;
  coverUrl?: string;
}

/**
 * La vitrine : morceaux, albums et matos favoris.
 *
 * Elle vivait dans UserProfileModal en grille 2 colonnes. En rangee
 * horizontale elle tient au-dessus des segments sans les repousser hors
 * de l'ecran, et elle reste ce qu'elle est — de l'identite, pas de la
 * progression.
 */
function ShowcaseRow({
  label,
  items,
  rounded,
}: {
  label: string;
  items: ShowcaseItem[];
  rounded: string;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.key} className="w-[104px] shrink-0">
            {item.coverUrl ? (
              <img
                src={item.coverUrl}
                alt=""
                className={`h-[104px] w-[104px] object-cover ${rounded}`}
              />
            ) : (
              <div
                className={`flex h-[104px] w-[104px] items-center justify-center bg-accent ${rounded}`}
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-muted-foreground"
                >
                  music_note
                </span>
              </div>
            )}
            <p className="mt-1.5 truncate text-xs font-medium">{item.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {item.subtitle}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
      title: favorite.song.title,
      subtitle: favorite.song.artist,
      coverUrl: favorite.song.cover_url,
    }));

  const albums: ShowcaseItem[] = [...profile.favorite_albums]
    .sort(byPosition)
    .map((favorite) => ({
      key: favorite.id,
      title: favorite.album_name,
      subtitle: favorite.artist_name,
      coverUrl: favorite.cover_url,
    }));

  const gear: ShowcaseItem[] = [...(profile.favorite_gear ?? [])]
    .sort(byPosition)
    .filter((favorite) => favorite.gear)
    .map((favorite) => ({
      key: favorite.id,
      title: `${favorite.gear.brand} ${favorite.gear.model}`.trim(),
      subtitle: GEAR_TYPE_LABELS[favorite.gear.type] ?? "Matos",
      coverUrl: favorite.gear.image_url,
    }));

  const isEmpty =
    songs.length === 0 && albums.length === 0 && gear.length === 0;

  if (isEmpty) {
    return (
      <Link
        href="/profile/edit?tab=favorites"
        className="mb-6 flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 transition-colors hover:bg-accent"
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
    <div className="mb-6 space-y-5">
      <ShowcaseRow label="Morceaux favoris" items={songs} rounded="rounded-xl" />
      <ShowcaseRow label="Albums favoris" items={albums} rounded="rounded-xl" />
      <ShowcaseRow label="Matos favori" items={gear} rounded="rounded-xl" />

      <Link
        href="/profile/edit?tab=favorites"
        className="inline-flex min-h-[36px] items-center text-sm font-medium text-primary hover:underline"
      >
        Modifier ma vitrine
      </Link>
    </div>
  );
}
