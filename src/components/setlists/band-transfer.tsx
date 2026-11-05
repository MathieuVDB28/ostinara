"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { transferBand } from "@/lib/actions/bands";
import type { BandMemberWithProfile } from "@/types";

interface BandTransferProps {
  bandId: string;
  candidates: BandMemberWithProfile[];
}

/** Le titulaire confie son groupe a un membre qui a le plan Band. */
export function BandTransfer({ bandId, candidates }: BandTransferProps) {
  const t = useTranslations("setlists.band");
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await transferBand(bandId, selected);
      if (!result.success) {
        setError(result.error ?? t("transferFailed"));
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  };

  return (
    <div className="border-b border-border py-3">
      <h3 className="text-sm font-semibold">{t("transferTitle")}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {candidates.length > 0 ? t("transferHint") : t("transferNobody")}
      </p>
      {candidates.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            aria-label={t("transferTitle")}
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setConfirming(false);
            }}
            className="min-h-[40px] min-w-0 flex-1 basis-48 rounded-xl border border-input bg-background px-3 text-sm focus:border-primary"
          >
            <option value="">{t("transferChoose")}</option>
            {candidates.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.profile?.display_name || member.profile?.username}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selected || pending}
            onClick={() => (confirming ? submit() : setConfirming(true))}
            className="inline-flex min-h-[40px] shrink-0 items-center rounded-xl border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
          >
            {confirming ? t("transferConfirm") : t("transferAction")}
          </button>
        </div>
      )}
      {error && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
