import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CguFr } from "./legal-fr";
import { CguEn } from "./legal-en";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.meta.terms");
  return { title: t("title"), description: t("description") };
}

/** Le texte francais fait foi ; l'anglais est une traduction (cf. le bandeau du layout). */
export default async function CGU() {
  return (await getLocale()) === "en" ? <CguEn /> : <CguFr />;
}
