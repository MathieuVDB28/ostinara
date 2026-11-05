"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { inviteToBandSeat } from "@/lib/actions/band-seats";

/** Offre une place du plan Band a un membre du groupe, sans passer par Abonnement. */
export function OfferSeatButton({ memberId }: { memberId: string }) {
  const t = useTranslations("setlists.band");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const offer = () => {
    setError(null);
    startTransition(async () => {
      const result = await inviteToBandSeat(memberId);
      if (!result.success) {
        setError(result.error ?? t("offerSeatFailed"));
        return;
      }
      router.refresh();
    });
  };

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={offer}
        className="inline-flex min-h-[36px] items-center rounded-full border border-border px-3 text-xs font-semibold transition-colors hover:bg-accent disabled:opacity-50"
      >
        {t("offerSeat")}
      </button>
      {error && (
        <span role="status" className="max-w-[180px] text-right text-[11px] text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
