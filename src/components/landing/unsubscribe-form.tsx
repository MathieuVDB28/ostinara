"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { leaveWaitlist } from "@/lib/actions/waitlist";

interface Props {
  token: string;
}

export function UnsubscribeForm({ token }: Props) {
  const t = useTranslations("landing.unsubscribe");
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
        {t.rich("done", {
          link: (chunks) => (
            <Link href="/acces-anticipe" className="not-italic underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>
    );
  }

  if (status === "unknown") {
    return (
      <p role="status" className="mt-4 leading-relaxed text-muted-foreground">
        {t("unknown")}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p className="leading-relaxed text-muted-foreground">
        {t("warning")}
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="mt-6 inline-flex min-h-[48px] items-center rounded-xl border border-foreground px-6 text-sm font-bold transition-colors hover:bg-foreground hover:text-background disabled:opacity-60"
      >
        {isPending ? t("removing") : t("submit")}
      </button>
    </div>
  );
}
