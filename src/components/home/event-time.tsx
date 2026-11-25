"use client";

import { useSyncExternalStore } from "react";
import { useIntlLocale } from "@/i18n/intl-locale";
import type { AgendaEvent } from "@/lib/agenda";
import { DEFAULT_TIME_ZONE, deviceTimeZone } from "@/lib/time-zone";

const noSubscribe = () => () => {};

/** Quand, a l'heure de l'appareil (celle de Paris le temps du rendu serveur). */
export function EventTime({ event }: { event: AgendaEvent }) {
  const intlLocale = useIntlLocale();
  const zone = useSyncExternalStore(noSubscribe, deviceTimeZone, () => DEFAULT_TIME_ZONE);
  const date: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
  const label = event.day
    ? new Intl.DateTimeFormat(intlLocale, { ...date, timeZone: "UTC" }).format(new Date(`${event.day}T00:00:00Z`))
    : new Intl.DateTimeFormat(intlLocale, { ...date, hour: "2-digit", minute: "2-digit", timeZone: zone }).format(
        new Date(event.starts_at)
      );
  return <>{label}</>;
}
