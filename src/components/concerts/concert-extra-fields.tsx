"use client";

import { useTranslations } from "next-intl";
import { CONCERT_CITY_MAX, CONCERT_URL_MAX } from "@/lib/concerts";

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary";

export interface ConcertExtraValues {
  time: string;
  city: string;
  ticketUrl: string;
}

/** Heure, ville et billetterie d'un concert : sous la date et le lieu d'une setlist. */
export function ConcertExtraFields({
  values,
  onChange,
  idPrefix,
}: {
  values: ConcertExtraValues;
  onChange: (values: ConcertExtraValues) => void;
  idPrefix: string;
}) {
  const t = useTranslations("concerts.fields");
  const ticketInvalid = values.ticketUrl.trim() !== "" && !/^https?:\/\//i.test(values.ticketUrl.trim());

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-time`} className="mb-1 block text-sm font-medium">{t("time")}</label>
        <input
          id={`${idPrefix}-time`}
          type="time"
          value={values.time}
          onChange={(event) => onChange({ ...values, time: event.target.value })}
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-city`} className="mb-1 block text-sm font-medium">{t("city")}</label>
        <input
          id={`${idPrefix}-city`}
          type="text"
          value={values.city}
          maxLength={CONCERT_CITY_MAX}
          onChange={(event) => onChange({ ...values, city: event.target.value })}
          placeholder={t("cityPlaceholder")}
          className={INPUT}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-ticket`} className="mb-1 block text-sm font-medium">{t("ticket")}</label>
        <input
          id={`${idPrefix}-ticket`}
          type="url"
          inputMode="url"
          value={values.ticketUrl}
          maxLength={CONCERT_URL_MAX}
          onChange={(event) => onChange({ ...values, ticketUrl: event.target.value })}
          placeholder="https://"
          aria-invalid={ticketInvalid}
          className={INPUT}
        />
        {ticketInvalid && <p className="mt-1 text-xs text-destructive">{t("ticketInvalid")}</p>}
      </div>
    </div>
  );
}
