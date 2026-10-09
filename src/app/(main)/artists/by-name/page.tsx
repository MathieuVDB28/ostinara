import { redirect, notFound } from "next/navigation";
import { searchArtists } from "@/lib/services/spotify";
import { Icon } from "@/components/ui/icon";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function ArtistByNamePage({ searchParams }: Props) {
  const { q } = await searchParams;
  if (!q) notFound();

  const artists = await searchArtists(q, 1);
  if (artists.length > 0) {
    redirect(`/artists/${artists[0].id}`);
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <Icon name="person_search" className="h-12 w-12 mb-4 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Artiste introuvable</h1>
      <p className="mt-2 text-muted-foreground">Aucun artiste trouvé pour &ldquo;{q}&rdquo;</p>
    </div>
  );
}
