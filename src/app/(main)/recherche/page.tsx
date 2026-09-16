import { Suspense } from "react";
import { SearchPageView } from "@/components/search/search-page-view";

export const metadata = {
  title: "Recherche | Ostinara",
  description: "Chercher un morceau, un album, une cover, un exercice, du matos ou un ami",
};

export default function RecherchePage() {
  // useSearchParams impose une frontiere de Suspense : sans elle, toute la
  // page bascule en rendu client.
  return (
    <Suspense fallback={null}>
      <SearchPageView />
    </Suspense>
  );
}
