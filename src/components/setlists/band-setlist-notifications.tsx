"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/profile/notification-setting";
import { setBandSetlistNotifications } from "@/lib/actions/bands";

/**
 * Le reglage, pour soi, des notifications des setlists d'un groupe :
 * ecrit tout de suite, revient en arriere si l'enregistrement echoue.
 */
export function BandSetlistNotifications({
  bandId,
  initialOn,
}: {
  bandId: string;
  initialOn: boolean;
}) {
  const t = useTranslations("setlists.band");
  const [on, setOn] = useState(initialOn);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const result = await setBandSetlistNotifications(bandId, next);
      if (!result.success) {
        setOn(!next);
        setError(t("setlistNotifsFailed"));
      }
    });
  };

  const Icon = on ? Bell : BellOff;

  return (
    <div className="border-t border-border py-3">
      <div className="flex min-h-[44px] items-center gap-4">
        <Icon className="h-[20px] w-[20px] shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span id="band-setlist-notifs-label" className="block text-sm font-medium">
            {t("setlistNotifs")}
          </span>
          <span className="block text-xs text-muted-foreground">
            {on ? t("setlistNotifsOn") : t("setlistNotifsOff")}
          </span>
        </span>
        <Switch on={on} labelledBy="band-setlist-notifs-label" disabled={pending} onClick={toggle} />
      </div>
      {error && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
