import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
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
  // L'article dans la langue de l'app d'abord, l'autre en secours.
  const [locale, t] = await Promise.all([getLocale(), getTranslations("albums.wiki")]);
  const encyclopedia = await getAlbumEncyclopedia(album.id, {
    name: album.name,
    artistDeezerId: mainArtist?.id,
    artistName: mainArtist?.name ?? "",
  }, locale);
  if (!encyclopedia) return null;

  return (
    <WikiPanel
      variant="album"
      title={t("aboutAlbum")}
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
  const [locale, t] = await Promise.all([getLocale(), getTranslations("albums.wiki")]);
  const encyclopedia = await getArtistEncyclopedia(artist.id, artist.name, locale);
  if (!encyclopedia) return null;

  return (
    <>
      {(encyclopedia.article || encyclopedia.facts.length > 0) && (
        <WikiPanel
          variant="artist"
          title={t("about")}
          article={encyclopedia.article}
          facts={encyclopedia.facts}
          wikidataId={encyclopedia.wikidataId}
        />
      )}
      {encyclopedia.members.length > 0 && <BandLineup members={encyclopedia.members} />}
    </>
  );
}
