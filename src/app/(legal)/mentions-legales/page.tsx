import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { MentionsLegalesFr } from "./legal-fr";
import { MentionsLegalesEn } from "./legal-en";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.meta.notice");
  return { title: t("title"), description: t("description") };
}

/** Le texte francais fait foi ; l'anglais est une traduction (cf. le bandeau du layout). */
export default async function MentionsLegales() {
  return (await getLocale()) === "en" ? <MentionsLegalesEn /> : <MentionsLegalesFr />;
}
