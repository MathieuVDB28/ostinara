import { SegmentedNav } from "@/components/layout/segmented-nav";
import {
  BiblioSearchProvider,
  BiblioSearchInput,
} from "@/components/biblio/biblio-search";
import { NAV_TABS } from "@/lib/navigation";

const biblioTab = NAV_TABS.find((tab) => tab.href === "/biblio")!;

/**
 * En-tete de la bibliotheque, style Etagere (docs/refonte-ui.md).
 *
 * Sur ordi, titre, sections et recherche tiennent sur une ligne ; sur
 * mobile, la recherche se replie en loupe a cote du titre et les sections
 * passent dessous. Deux rangees au lieu de quatre avant le contenu.
 */
export default function BiblioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BiblioSearchProvider>
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <h1 className="text-2xl font-extrabold tracking-[-0.01em] lg:text-3xl">Biblio</h1>
        <SegmentedNav
          tab={biblioTab}
          variant="segmented"
          className="order-last w-full lg:order-none lg:w-[360px]"
        />
        <BiblioSearchInput />
      </div>

      {children}
    </BiblioSearchProvider>
  );
}
