import type { Metadata } from "next";
import Link from "next/link";
import { UnsubscribeForm } from "@/components/landing/unsubscribe-form";

export const metadata: Metadata = {
  title: "Désinscription — Ostinara",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

/** Quitter la liste d'attente, depuis le lien en pied des emails. */
export default async function DesinscriptionPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16">
      <Link href="/acces-anticipe" className="font-display text-2xl font-extrabold uppercase tracking-[0.02em]">
        Ostinara
      </Link>
      <h1 className="mt-10 font-display text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
        Quitter la liste
      </h1>
      {token ? (
        <UnsubscribeForm token={token} />
      ) : (
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Ce lien est incomplet. Écris-nous à{" "}
          <a href="mailto:contact@ostinara.app" className="underline underline-offset-2">
            contact@ostinara.app
          </a>{" "}
          et on te retire de la liste.
        </p>
      )}
    </main>
  );
}
