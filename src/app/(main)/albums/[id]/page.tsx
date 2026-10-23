import { notFound, redirect } from "next/navigation";
import { getAlbumDetails } from "@/lib/services/deezer";
import {
  getAlbumCommunityStats,
  getFriendsAlbumReviews,
  getUserAlbumReviewByDeezerId,
  resolveLegacyAlbumId,
} from "@/lib/actions/albums";
import { getLibraryMatches } from "@/lib/actions/songs";
import { AlbumDetailView } from "@/components/albums/album-detail-view";
import { AlbumEncyclopediaSection } from "@/components/albums/encyclopedia";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AlbumDetailPage({ params }: Props) {
  const { id } = await params;

  // Un identifiant Deezer est numerique. Le reste vient du temps de
  // Spotify (liens partages, PWA installees) : on redirige vers l'album
  // Deezer correspondant plutot que de rendre une page vide.
  if (!/^\d+$/.test(id)) {
    const deezerId = await resolveLegacyAlbumId(id);
    if (!deezerId) notFound();
    redirect(`/albums/${deezerId}`);
  }

  const [album, stats, userReview, friendReviews] = await Promise.all([
    getAlbumDetails(id),
    getAlbumCommunityStats(id),
    getUserAlbumReviewByDeezerId(id),
    getFriendsAlbumReviews(id),
  ]);

  if (!album) notFound();

  const libraryTrackIds = await getLibraryMatches(
    (album.tracks?.items ?? []).map((track) => ({
      key: track.id,
      title: track.name,
      artist: album.artists[0].name,
      deezer_id: track.id,
    }))
  );

  return (
    <AlbumDetailView
      album={album}
      stats={stats}
      userReview={userReview}
      friendReviews={friendReviews}
      libraryTrackIds={libraryTrackIds}
      encyclopedia={<AlbumEncyclopediaSection album={album} />}
    />
  );
}
