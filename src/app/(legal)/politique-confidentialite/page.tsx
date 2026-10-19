import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PolitiqueConfidentialiteFr } from "./legal-fr";
import { PolitiqueConfidentialiteEn } from "./legal-en";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.meta.privacy");
  return { title: t("title"), description: t("description") };
}

/** Le texte francais fait foi ; l'anglais est une traduction (cf. le bandeau du layout). */
export default async function PolitiqueConfidentialite() {
  return (await getLocale()) === "en" ? <PolitiqueConfidentialiteEn /> : <PolitiqueConfidentialiteFr />;
}
