"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CatalogArtist, CatalogAlbum, AlbumCommunityStats } from "@/types";
import { Icon } from "@/components/ui/icon";
import { Cover } from "@/components/ui/cover";
import type { ArtistLibraryContext } from "@/lib/actions/albums";
import { ArtistLibrarySection, albumKey } from "./artist-library-section";

interface Props {
  artist: CatalogArtist;
  albums: CatalogAlbum[];
  communityStats: Record<string, AlbumCommunityStats>;
  library: ArtistLibraryContext;
  /** Line-up et article Wikipedia, rendus cote serveur en streaming. */
  encyclopedia?: React.ReactNode;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

export function ArtistDetailView({ artist, albums, communityStats, library, encyclopedia }: Props) {
  const router = useRouter();
  const artistImage = artist.images[0]?.url;

  // Combien de ses morceaux viennent de chaque album : la discographie dit
  // ou l'on a deja mis les doigts.
  const songsByAlbum = new Map<string, number>();
  for (const song of library.songs) {
    const key = albumKey(song.album);
    if (key) songsByAlbum.set(key, (songsByAlbum.get(key) ?? 0) + 1);
  }

  return (
    <div className="min-h-screen">
      {/* Hero header — negative margins to break out of the layout's p-4 lg:p-8 */}
      <div className="relative -mx-4 -mt-4 h-64 overflow-hidden sm:h-80 lg:-mx-8 lg:-mt-8">
        {artistImage ? (
          <img
            src={artistImage}
            alt={artist.name}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Icon name="person" className="h-16 w-16 text-muted-foreground" strokeWidth={1.25} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          aria-label="Retour"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          <Icon name="chevron_left" className="h-5 w-5" strokeWidth={2.25} />
        </button>

        {/* Artist info overlay */}
        <div className="absolute bottom-5 left-4 right-4">
          <h1 className="text-balance font-display text-5xl font-extrabold uppercase leading-[0.88] text-white sm:text-7xl">{artist.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {artist.fans > 0 && (
              <span className="flex items-center gap-1 text-sm text-white/80">
                <Icon name="person" className="h-[15px] w-[15px]" />
                {formatFollowers(artist.fans)} fans sur Deezer
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="py-5">
        <ArtistLibrarySection
          artistName={artist.name}
          albums={albums}
          communityStats={communityStats}
          library={library}
        />

        {/* Discography */}
        <h2 className="mb-3 border-b border-border pb-2 text-lg font-extrabold tracking-[-0.01em]">
          Discographie<span className="tabular font-bold text-muted-foreground"> · {albums.length}</span>
        </h2>

        {albums.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Icon name="library_music" className="h-9 w-9 mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun album disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {albums.map((album) => {
              const stats = communityStats[album.id];
              const myRating = library.reviewed[album.id];
              const saved = library.wishlisted.includes(album.id);
              const mySongs = songsByAlbum.get(albumKey(album.name)) ?? 0;

              return (
                <Link
                  key={album.id}
                  href={`/albums/${album.id}`}
                  className="group flex flex-col gap-2"
                >
                  <Cover src={album.images[0]?.url} alt="" className="aspect-square w-full rounded-md">

                    {/* Community rating badge */}
                    {stats && stats.review_count > 0 && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 font-display text-[13px] font-bold text-white">
                        <Icon name="star" className="h-3 w-3" filled />
                        {(stats.avg_rating / 2).toFixed(1).replace(".", ",")}
                      </span>
                    )}

                    {/* Le sien : ecoute (sa note) ou mis de cote */}
                    {myRating !== undefined ? (
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 font-display text-[12px] font-bold text-primary-foreground">
                        <Icon name="check" className="h-3 w-3" />
                        Écouté · {String(myRating / 2).replace(".", ",")}
                      </span>
                    ) : saved ? (
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 font-display text-[12px] font-bold text-white">
                        <Icon name="bookmark" className="h-3 w-3" />
                        À écouter
                      </span>
                    ) : null}
                  </Cover>

                  <div>
                    <p className="line-clamp-2 text-sm font-semibold leading-tight">{album.name}</p>
                    {/* Pas d'annee : Deezer date les reeditions, pas les albums. */}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {album.record_type === "ep" ? "EP" : "Album"}
                      {stats && stats.review_count > 0 && (
                        <> · {stats.review_count} avis</>
                      )}
                    </p>
                    {mySongs > 0 && (
                      <p className="mt-0.5 text-xs font-semibold text-primary">
                        {mySongs} de tes morceaux
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {encyclopedia}
      </div>
    </div>
  );
}
