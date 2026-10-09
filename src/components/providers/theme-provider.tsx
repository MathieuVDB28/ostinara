"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/*
 * Clair par defaut (docs/refonte-ui.md). Le reglage « Systeme » reste
 * disponible dans le selecteur d'apparence : enableSystem le garde.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
