import Link from "next/link";
import Image from "next/image";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center">
              <Image
                src="/logo.png"
                alt="Ostinara"
                width={36}
                height={36}
                className="rounded-lg"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold leading-tight">Ostinara</span>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Stay tuned
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Ostinara"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <span className="font-semibold">Ostinara</span>
                <span className="text-xs text-muted-foreground italic">
                  stay tuned
                </span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link
                href="/mentions-legales"
                className="transition-colors hover:text-foreground"
              >
                Mentions légales
              </Link>
              <Link
                href="/cgu"
                className="transition-colors hover:text-foreground"
              >
                CGU
              </Link>
              <Link
                href="/politique-confidentialite"
                className="transition-colors hover:text-foreground"
              >
                Confidentialité
              </Link>
              <Link
                href="mailto:contact@ostinara.app"
                className="transition-colors hover:text-foreground"
              >
                Contact
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 Ostinara. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
