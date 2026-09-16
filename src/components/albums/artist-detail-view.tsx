"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SpotifyArtist, SpotifyAlbum, AlbumCommunityStats } from "@/types";

interface Props {
  artist: SpotifyArtist;
  albums: SpotifyAlbum[];
  communityStats: Record<string, AlbumCommunityStats>;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
}

export function ArtistDetailView({ artist, albums, communityStats }: Props) {
  const router = useRouter();
  const artistImage = artist.images[0]?.url;

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
            <span className="material-symbols-outlined text-8xl text-muted-foreground">person</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        {/* Artist info overlay */}
        <div className="absolute bottom-5 left-4 right-4">
          <h1 className="text-3xl font-bold text-white drop-shadow-md sm:text-4xl">{artist.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {(artist.followers?.total ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-sm text-white/80">
                <span className="material-symbols-outlined text-[15px]">person</span>
                {formatFollowers(artist.followers!.total)} abonnés Spotify
              </span>
            )}
            {artist.popularity > 0 && (
              <span className="flex items-center gap-1 text-sm text-white/80">
                <span className="material-symbols-outlined text-[15px]">trending_up</span>
                Popularité {artist.popularity}/100
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5">
        {/* Genres */}
        {artist.genres && artist.genres.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {artist.genres.slice(0, 6).map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-accent px-3 py-1 text-xs font-medium capitalize"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Discography */}
        <h2 className="mb-4 text-lg font-semibold">Discographie</h2>

        {albums.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="material-symbols-outlined mb-2 text-4xl text-muted-foreground">
              library_music
            </span>
            <p className="text-sm text-muted-foreground">Aucun album disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {albums.map((album) => {
              const stats = communityStats[album.id];
              const year = album.release_date?.split("-")[0];

              return (
                <Link
                  key={album.id}
                  href={`/albums/${album.id}`}
                  className="group flex flex-col gap-2"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-muted shadow-sm transition-transform group-hover:scale-[1.02]">
                    {album.images[0] ? (
                      <img
                        src={album.images[0].url}
                        alt={album.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-muted-foreground">
                          album
                        </span>
                      </div>
                    )}

                    {/* Community rating badge */}
                    {stats && stats.review_count > 0 && (
                      <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[11px] text-primary">
                          star
                        </span>
                        {(stats.avg_rating / 2).toFixed(1)}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="line-clamp-2 text-sm font-medium leading-tight">{album.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {year}
                      {stats && stats.review_count > 0 && (
                        <> · {stats.review_count} avis</>
                      )}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
