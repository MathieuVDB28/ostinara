import { Suspense } from "react";
import type { CatalogAlbumDetails, CatalogArtist } from "@/types";
import { getAlbumEncyclopedia, getArtistEncyclopedia } from "@/lib/services/wikipedia";
import { WikiPanel, WikiSkeleton } from "./wiki-panel";
import { BandLineup } from "./band-lineup";

/**
 * L'encyclopedie arrive en streaming : Wikipedia et Wikidata repondent
 * moins vite que Deezer, la page s'affiche sans les attendre.
 */
export function AlbumEncyclopediaSection({ album }: { album: CatalogAlbumDetails }) {
  return (
    <Suspense fallback={<WikiSkeleton variant="album" />}>
      <AlbumEncyclopediaContent album={album} />
    </Suspense>
  );
}

async function AlbumEncyclopediaContent({ album }: { album: CatalogAlbumDetails }) {
  const mainArtist = album.artists[0];
  const encyclopedia = await getAlbumEncyclopedia(album.id, {
    name: album.name,
    artistDeezerId: mainArtist?.id,
    artistName: mainArtist?.name ?? "",
  });
  if (!encyclopedia) return null;

  return (
    <WikiPanel
      variant="album"
      title="À propos de l'album"
      article={encyclopedia.article}
      facts={encyclopedia.facts}
      wikidataId={encyclopedia.wikidataId}
      previous={encyclopedia.previous}
      next={encyclopedia.next}
    />
  );
}

export function ArtistEncyclopediaSection({ artist }: { artist: CatalogArtist }) {
  return (
    <Suspense fallback={<WikiSkeleton variant="artist" />}>
      <ArtistEncyclopediaContent artist={artist} />
    </Suspense>
  );
}

async function ArtistEncyclopediaContent({ artist }: { artist: CatalogArtist }) {
  const encyclopedia = await getArtistEncyclopedia(artist.id, artist.name);
  if (!encyclopedia) return null;

  return (
    <>
      {encyclopedia.members.length > 0 && <BandLineup members={encyclopedia.members} />}
      {(encyclopedia.article || encyclopedia.facts.length > 0) && (
        <WikiPanel
          variant="artist"
          title="À propos"
          article={encyclopedia.article}
          facts={encyclopedia.facts}
          wikidataId={encyclopedia.wikidataId}
        />
      )}
    </>
  );
}
