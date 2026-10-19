import { getLocale, getTranslations } from "next-intl/server";
import { PublicShell } from "@/components/layout/public-shell";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("legal");
  const locale = await getLocale();

  return (
    <PublicShell
      banner={
        // Les textes anglais sont des traductions : le francais reste le texte de reference.
        locale !== "fr" && (
          <p className="border-b border-border bg-secondary px-6 py-3 text-center text-sm text-muted-foreground">
            {t("binding")}
          </p>
        )
      }
    >
      {children}
    </PublicShell>
  );
}
