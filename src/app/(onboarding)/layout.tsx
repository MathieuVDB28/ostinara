import Image from "next/image";

/**
 * L'accueil des nouveaux, hors du layout principal : celui-ci y renvoie
 * tant que le profil n'a pas d'instrument, il ne peut pas l'envelopper.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-center border-b border-border">
        <span className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
          <span className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.02em]">
            Ostinara
          </span>
        </span>
      </header>

      <main className="flex flex-1 justify-center p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:items-center">
        {children}
      </main>
    </div>
  );
}
