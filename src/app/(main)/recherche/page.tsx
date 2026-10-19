import { Suspense } from "react";
import { SearchPageView } from "@/components/search/search-page-view";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("meta.search");
  return { title: t("title"), description: t("description") };
}

export default function RecherchePage() {
  // useSearchParams impose une frontiere de Suspense : sans elle, toute la
  // page bascule en rendu client.
  return (
    <Suspense fallback={null}>
      <SearchPageView />
    </Suspense>
  );
}
