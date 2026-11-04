"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  getBandSeatCandidates,
  inviteToBandSeat,
  releaseBandSeat,
  respondToBandSeat,
} from "@/lib/actions/band-seats";
import { BAND_PLAN_SEATS, seatPersonName, type BandSeatPerson, type BandSeatsOverview } from "@/lib/band-seats";

const SECONDARY =
  "inline-flex min-h-[40px] shrink-0 items-center rounded-xl border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50";
const PRIMARY =
  "inline-flex min-h-[40px] shrink-0 items-center rounded-xl bg-primary px-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50";
const TITLE = "font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

function Person({ person, detail }: { person: BandSeatPerson; detail?: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-base font-extrabold text-muted-foreground"
      >
        {person.avatar_url ? (
          <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          seatPersonName(person)[0]?.toUpperCase()
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{seatPersonName(person)}</span>
        {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
    </div>
  );
}

interface BandSeatsSectionProps {
  seats: BandSeatsOverview;
  /** Le plan vient d'un abonnement Band du compte : il peut offrir ses places. */
  canShare: boolean;
  onChange: () => Promise<void> | void;
}

export function BandSeatsSection({ seats, canShare, onChange }: BandSeatsSectionProps) {
  const t = useTranslations("plans.seats");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<BandSeatPerson[] | null>(null);
  const [query, setQuery] = useState("");

  const run = (action: () => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? t("failed"));
        return;
      }
      setCandidates(null);
      setQuery("");
      await onChange();
    });
  };

  const openPicker = () => {
    setError(null);
    startTransition(async () => {
      setCandidates(await getBandSeatCandidates());
    });
  };

  const free = BAND_PLAN_SEATS - seats.owned.length;

  const filtered = useMemo(() => {
    const taken = new Set(seats.owned.map((seat) => seat.person.id));
    const needle = query.trim().toLowerCase();
    return (candidates ?? []).filter(
      (person) =>
        !taken.has(person.id) &&
        (!needle || seatPersonName(person).toLowerCase().includes(needle) || person.username.toLowerCase().includes(needle))
    );
  }, [candidates, query, seats.owned]);

  const errorLine = error && (
    <p role="status" className="mt-2 text-xs text-destructive">
      {error}
    </p>
  );

  return (
    <>
      {/* Une invitation recue passe avant tout le reste. */}
      {seats.invitations.map((seat) => (
        <section key={seat.id} className="mb-6 border-y border-border py-4">
          <h2 className={TITLE}>{t("invitationTitle")}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Person person={seat.person} detail={t("invitationBody")} />
            <button type="button" disabled={pending} onClick={() => run(() => respondToBandSeat(seat.id, true))} className={PRIMARY}>
              {t("accept")}
            </button>
            <button type="button" disabled={pending} onClick={() => run(() => respondToBandSeat(seat.id, false))} className={SECONDARY}>
              {t("decline")}
            </button>
          </div>
        </section>
      ))}

      {seats.mySeat && (
        <section className="mb-6 border-b border-border pb-4">
          <h2 className={TITLE}>{t("memberTitle")}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Person person={seats.mySeat.person} detail={t("memberBody")} />
            <button type="button" disabled={pending} onClick={() => run(() => releaseBandSeat(seats.mySeat!.id))} className={SECONDARY}>
              {t("leave")}
            </button>
          </div>
        </section>
      )}

      {canShare && (
        <section className="mb-10 border-b border-border pb-5">
          <h2 className={TITLE}>{t("ownerTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("ownerBody", { count: free })}</p>

          <ul className="mt-2 divide-y divide-border">
            {seats.owned.map((seat) => (
              <li key={seat.id} className="flex flex-wrap items-center gap-3 py-3">
                <Person person={seat.person} detail={seat.status === "pending" ? t("waiting") : t("activeSeat")} />
                <button type="button" disabled={pending} onClick={() => run(() => releaseBandSeat(seat.id))} className={SECONDARY}>
                  {seat.status === "pending" ? t("cancelInvite") : t("takeBack")}
                </button>
              </li>
            ))}
          </ul>

          {free > 0 && candidates === null && (
            <button type="button" disabled={pending} onClick={openPicker} className={`${PRIMARY} mt-3`}>
              {t("invite")}
            </button>
          )}

          {free > 0 && candidates !== null && (
            <div className="mt-3">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
                className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary"
              />
              {filtered.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">{t("noCandidate")}</p>
              ) : (
                <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto">
                  {filtered.map((person) => (
                    <li key={person.id} className="flex items-center gap-3 py-2.5">
                      <Person person={person} detail={person.plan === "free" ? undefined : t("hasPlan")} />
                      <button type="button" disabled={pending} onClick={() => run(() => inviteToBandSeat(person.id))} className={SECONDARY}>
                        {t("inviteOne")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => {
                  setCandidates(null);
                  setQuery("");
                }}
                className="mt-2 min-h-[40px] text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t("close")}
              </button>
            </div>
          )}
        </section>
      )}

      {errorLine}
    </>
  );
}
