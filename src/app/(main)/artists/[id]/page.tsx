import { notFound } from "next/navigation";
import { getArtistDetails, getArtistAlbums } from "@/lib/services/deezer";
import { getAlbumsCommunityStats, getArtistLibraryContext } from "@/lib/actions/albums";
import { ArtistDetailView } from "@/components/albums/artist-detail-view";
import { ArtistEncyclopediaSection } from "@/components/albums/encyclopedia";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ArtistDetailPage({ params }: Props) {
  const { id } = await params;

  const artist = await getArtistDetails(id);
  if (!artist) notFound();

  const albums = await getArtistAlbums(id, artist);

  const catalogIds = albums.map((a) => a.id).filter(Boolean);
  const [communityStats, library] = await Promise.all([
    getAlbumsCommunityStats(catalogIds),
    // Ce qu'on joue et ecoute deja de l'artiste : la page part de la.
    getArtistLibraryContext(artist.name, catalogIds),
  ]);

  return (
    <ArtistDetailView
      artist={artist}
      albums={albums}
      communityStats={communityStats}
      library={library}
      encyclopedia={<ArtistEncyclopediaSection artist={artist} />}
    />
  );
}
