"use client";

import { useTranslations } from "next-intl";
import type { Translator } from "@/i18n/types";
import type { Instrument, WikiBandMember } from "@/types";
import { Icon } from "@/components/ui/icon";
import { instrumentMeta } from "@/lib/instruments";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { HEADINGS } from "./wiki-panel";

/** « depuis 1983 », « 1982–1986 », « 1996 ». */
function period(member: WikiBandMember, t: Translator<"albums.wiki">): string {
  if (member.current) return member.since ? t("since", { year: member.since }) : "";
  if (member.since && member.until) return member.since === member.until ? member.since : `${member.since}–${member.until}`;
  return member.until ?? member.since ?? "";
}

/**
 * Qui joue quoi dans le groupe. Le musicien y retrouve son poste : le
 * batteur voit qui tient la batterie.
 */
export function BandLineup({ members }: { members: WikiBandMember[] }) {
  const t = useTranslations("albums.wiki");
  const { primary } = useMyInstruments();
  const current = members.filter((member) => member.current);
  const former = members.filter((member) => !member.current);

  // Un groupe separe n'a que des anciens membres : on les montre tous.
  const shown = current.length > 0 ? current : former;
  const folded = current.length > 0 ? former : [];

  return (
    <section className="mt-8">
      <h2 className={HEADINGS.artist}>
        {t("lineup")}<span className="tabular font-bold text-muted-foreground"> · {members.length}</span>
      </h2>

      <MemberList members={shown} primary={primary} />

      {folded.length > 0 && (
        <details className="group border-b border-border">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            {t("former")}
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="tabular font-mono text-xs">{folded.length}</span>
              <Icon name="expand_more" className="h-4 w-4 transition-transform group-open:rotate-180" strokeWidth={2.25} />
            </span>
          </summary>
          <MemberList members={folded} primary={primary} />
        </details>
      )}
    </section>
  );
}

function MemberList({ members, primary }: { members: WikiBandMember[]; primary: Instrument }) {
  const t = useTranslations("albums.wiki");
  return (
    <ul className="divide-y divide-border">
      {members.map((member) => {
        const mine = member.posts.includes(primary);
        const post = mine ? primary : member.posts[0];
        const shownInstruments = member.instruments.slice(0, 3);
        const more = member.instruments.length - shownInstruments.length;

        return (
          <li key={`${member.name}-${member.since ?? ""}`} className="flex min-h-[52px] items-center gap-3 py-2.5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                mine ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon name={post ? instrumentMeta(post).icon : "music_note"} className="h-[18px] w-[18px]" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="truncate">{member.name}</span>
                {mine && (
                  <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 font-display text-[11px] font-bold text-primary">
                    {t("yourPoste")}
                  </span>
                )}
              </p>
              {shownInstruments.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  {shownInstruments.join(", ")}
                  {more > 0 && ` +${more}`}
                </p>
              )}
            </div>

            <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">{period(member, t)}</span>
          </li>
        );
      })}
    </ul>
  );
}
