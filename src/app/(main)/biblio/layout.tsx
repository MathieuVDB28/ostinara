import { SegmentedNav } from "@/components/layout/segmented-nav";
import {
  BiblioSearchProvider,
  BiblioSearchInput,
} from "@/components/biblio/biblio-search";
import { NAV_TABS } from "@/lib/navigation";

const biblioTab = NAV_TABS.find((tab) => tab.href === "/biblio")!;

export default function BiblioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BiblioSearchProvider>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold lg:text-3xl">Bibliothèque</h1>
        <BiblioSearchInput />
      </div>

      <SegmentedNav tab={biblioTab} />

      {children}
    </BiblioSearchProvider>
  );
}
