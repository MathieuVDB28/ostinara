"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { leaveWaitlist } from "@/lib/actions/waitlist";

interface Props {
  token: string;
}

export function UnsubscribeForm({ token }: Props) {
  const [status, setStatus] = useState<"idle" | "done" | "unknown">("idle");
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const { success } = await leaveWaitlist(token);
      setStatus(success ? "done" : "unknown");
    });
  };

  if (status === "done") {
    return (
      <p role="status" className="mt-4 font-serif text-lg italic leading-relaxed text-foreground/80">
        C&apos;est fait : ton adresse a été supprimée de la liste. Tu peux toujours{" "}
        <Link href="/acces-anticipe" className="not-italic underline underline-offset-2">
          te réinscrire
        </Link>{" "}
        si tu changes d&apos;avis.
      </p>
    );
  }

  if (status === "unknown") {
    return (
      <p role="status" className="mt-4 leading-relaxed text-muted-foreground">
        Cette adresse n&apos;est plus sur la liste : rien d&apos;autre à faire.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p className="leading-relaxed text-muted-foreground">
        Ton adresse sera supprimée de la liste d&apos;attente, et tu perdras ta place.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="mt-6 inline-flex min-h-[48px] items-center rounded-xl border border-foreground px-6 text-sm font-bold transition-colors hover:bg-foreground hover:text-background disabled:opacity-60"
      >
        {isPending ? "Suppression…" : "Me retirer de la liste"}
      </button>
    </div>
  );
}
