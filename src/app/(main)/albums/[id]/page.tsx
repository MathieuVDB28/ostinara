import { notFound, redirect } from "next/navigation";
import { getAlbumDetails } from "@/lib/services/deezer";
import {
  getAlbumCommunityStats,
  getUserAlbumReviewByDeezerId,
  resolveLegacyAlbumId,
} from "@/lib/actions/albums";
import { AlbumDetailView } from "@/components/albums/album-detail-view";

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

  const [album, stats, userReview] = await Promise.all([
    getAlbumDetails(id),
    getAlbumCommunityStats(id),
    getUserAlbumReviewByDeezerId(id),
  ]);

  if (!album) notFound();

  return <AlbumDetailView album={album} stats={stats} userReview={userReview} />;
}
