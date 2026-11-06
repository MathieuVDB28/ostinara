import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { getUserBands } from "@/lib/actions/bands";
import { bandStatus } from "@/lib/band-access";

/** « Raconter une repete » depuis Jouer : le groupe concerne, sans demander s'il n'y en a qu'un. */
export default async function ChoisirGroupePage() {
  const t = await getTranslations("rehearsals.log");
  const bands = (await getUserBands()).filter((band) => bandStatus(band) !== "read_only");

  if (bands.length === 0) redirect("/commu/groupes");
  if (bands.length === 1) redirect(`/commu/groupes/${bands[0].id}/raconter`);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[40px] font-extrabold uppercase leading-[0.9]">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("whichBand")}</p>
      <ul className="mt-4 border-t border-border">
        {bands.map((band) => (
          <li key={band.id}>
            <Link
              href={`/commu/groupes/${band.id}/raconter`}
              className="flex min-h-[56px] items-center justify-between gap-3 border-b border-border py-2 font-display text-xl font-extrabold uppercase hover:bg-accent/50"
            >
              <span className="min-w-0 truncate">{band.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
