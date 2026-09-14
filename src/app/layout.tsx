import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { MATERIAL_SYMBOLS_HREF } from "@/lib/material-symbols";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Ostinara - Track your guitar journey",
  description: "Track your progress, manage your repertoire, and share your covers with friends. The ultimate app for guitarists.",
  keywords: ["guitar", "music", "practice", "covers", "learning", "progress tracker"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ostinara",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="overflow-x-hidden" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/ios/180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          Police sous-ensemblee aux icones reellement utilisees : 8 Ko au lieu
          des 3,9 Mo de la police variable complete. Liste generee par
          scripts/extract-icons.mjs — relancer `npm run icons` apres ajout.
        */}
        <link rel="stylesheet" href={MATERIAL_SYMBOLS_HREF} />
      </head>
      <body
        className={`${plusJakarta.variable} font-sans antialiased bg-background text-foreground overflow-x-hidden`}
      >
        <ThemeProvider>
          <ServiceWorkerRegistration />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
