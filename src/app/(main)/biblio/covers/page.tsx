import { getCovers, canUploadCover } from "@/lib/actions/covers";
import { CoversView } from "@/components/covers/covers-view";

export default async function BiblioCoversPage({
  searchParams,
}: {
  searchParams: Promise<{ cover?: string }>;
}) {
  const { cover: initialCoverId } = await searchParams;

  const [covers, uploadStatus] = await Promise.all([
    getCovers(),
    canUploadCover(),
  ]);

  return (
    <CoversView
      initialCovers={covers}
      canUpload={uploadStatus.allowed}
      coverLimit={uploadStatus.limit}
      coverCount={uploadStatus.current}
      initialCoverId={initialCoverId}
    />
  );
}
