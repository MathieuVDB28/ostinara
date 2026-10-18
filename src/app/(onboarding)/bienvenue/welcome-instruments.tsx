"use client";

import { useRouter } from "next/navigation";
import { InstrumentPicker } from "@/components/instruments/instrument-picker";

export function WelcomeInstruments({ limit }: { limit: number | null }) {
  const router = useRouter();

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Bienvenue sur Ostinara
        </p>
        <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-[0.9]">
          Tu joues de quoi&nbsp;?
        </h1>
        <p className="mt-3 font-serif text-lg italic leading-relaxed text-foreground/80">
          Coche tout ce que tu joues. Ton instrument principal décide des exercices et des outils
          qu&apos;on te propose ; tu pourras changer ça dans tes réglages.
        </p>
      </div>

      <InstrumentPicker
        initial={[]}
        limit={limit}
        submitLabel="C'est parti"
        onSaved={() => router.replace("/accueil")}
      />
    </div>
  );
}
