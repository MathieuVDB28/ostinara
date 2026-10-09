"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SetlistCard } from "./setlist-card";
import { CreateSetlistModal } from "./create-setlist-modal";
import { InviteMemberModal } from "./invite-member-modal";
import { StartJamModal } from "@/components/jam/start-jam-modal";
import { CreateRehearsalModal } from "@/components/rehearsals/create-rehearsal-modal";
import { RehearsalCard } from "@/components/rehearsals/rehearsal-card";
import { RehearsalCalendar } from "@/components/rehearsals/rehearsal-calendar";
import type {
  BandWithMembers,
  SetlistWithDetails,
  RehearsalWithDetails,
  JamSessionWithDetails,
} from "@/types";
import { Icon } from "@/components/ui/icon";

interface BandDetailViewProps {
  band: BandWithMembers;
  setlists: SetlistWithDetails[];
  rehearsals: RehearsalWithDetails[];
  activeJam: JamSessionWithDetails | null;
  currentUserId: string;
}

/**
 * Le detail d'un groupe : tout ce que le groupe possede, sur une pile
 * plutot que derriere une quatrieme barre d'onglets.
 */
const CHIP =
  "inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent";
const SECTION_TITLE =
  "font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

export function BandDetailView({
  band,
  setlists,
  rehearsals,
  activeJam,
  currentUserId,
}: BandDetailViewProps) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  const [showCreateRehearsal, setShowCreateRehearsal] = useState(false);
  const [showJam, setShowJam] = useState(false);
  const [rehearsalView, setRehearsalView] = useState<"list" | "calendar">("list");

  const handleRefresh = () => router.refresh();
  const isOwner = band.owner_id === currentUserId;

  const upcomingRehearsals = rehearsals.filter(
    (rehearsal) =>
      rehearsal.status === "scheduled" && new Date(rehearsal.date) >= new Date()
  );

  const initials = band.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

  /*
   * Le groupe, style Fanzine (docs/refonte-ui.md) : le nom en capitales
   * condensees comme sur une affiche, les actions en puces, les sections
   * et les membres en lignes a filets. Le jam en cours reste en tete : c'est
   * la seule chose urgente de l'ecran, et le seul bouton ambre.
   */
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link
          href="/commu/groupes"
          className="-ml-1 mb-3 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="chevron_left" className="h-4 w-4" strokeWidth={2.25} />
          Groupes
        </Link>

        <div className="flex items-end gap-4">
          {band.cover_url ? (
            <Image
              src={band.cover_url}
              alt=""
              className="h-[72px] w-[72px] shrink-0 rounded-[4px] object-cover"
              width={72}
              height={72}
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[4px] bg-secondary font-display text-3xl font-extrabold uppercase"
            >
              {initials}
            </span>
          )}
          <h1 className="min-w-0 flex-1 text-balance font-display text-[44px] font-extrabold uppercase leading-[0.88]">
            {band.name}
          </h1>
        </div>
        {band.description && (
          <p className="mt-2 font-serif text-[15px] italic text-muted-foreground">{band.description}</p>
        )}

        <div className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setShowJam(true)} className={CHIP}>
            <Icon name="music_note" className="h-4 w-4" />
            Lancer un jam
          </button>
          <button onClick={() => setShowCreateRehearsal(true)} className={CHIP}>
            <Icon name="event" className="h-4 w-4" />
            Planifier une répète
          </button>
          <Link href={`/setlists/tech-rider/${band.id}`} className={CHIP}>
            <Icon name="description" className="h-4 w-4" />
            Fiche technique
          </Link>
          {isOwner && (
            <button onClick={() => setShowInvite(true)} className={CHIP}>
              <Icon name="person_add" className="h-4 w-4" />
              Inviter
            </button>
          )}
        </div>
      </div>

      {activeJam && (
        <div className="flex items-center gap-3 border-y border-border py-3">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-extrabold uppercase leading-none">Jam en cours</p>
            <p className="truncate text-xs text-muted-foreground">Rejoins la session du groupe</p>
          </div>
          <Link
            href={`/jam/${activeJam.id}`}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Rejoindre
            <Icon name="chevron_right" className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        </div>
      )}

      <section>
        <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
          <h2 className={SECTION_TITLE}>
            Setlists{setlists.length > 0 && <span className="tabular"> · {setlists.length}</span>}
          </h2>
          <button
            onClick={() => setShowCreateSetlist(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
          >
            <Icon name="add" className="h-3.5 w-3.5" strokeWidth={2} />
            Setlist
          </button>
        </div>

        {setlists.length > 0 ? (
          <div>
            {setlists.map((setlist) => (
              <SetlistCard
                key={setlist.id}
                setlist={setlist}
                onClick={() => router.push(`/setlists/${setlist.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">Aucune setlist pour ce groupe.</p>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
          <h2 className={SECTION_TITLE}>
            Répètes à venir
            {upcomingRehearsals.length > 0 && <span className="tabular"> · {upcomingRehearsals.length}</span>}
          </h2>

          <div
            role="group"
            aria-label="Affichage des répètes"
            className="grid grid-cols-2 gap-0.5 rounded-xl border border-border bg-card p-[3px]"
          >
            {(["list", "calendar"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setRehearsalView(view)}
                aria-pressed={rehearsalView === view}
                className={`flex min-h-[32px] items-center justify-center gap-1.5 rounded-[9px] px-3 text-xs font-semibold transition-colors ${
                  rehearsalView === view
                    ? "bg-secondary text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon name={view === "list" ? "list" : "calendar_month"} className="h-3.5 w-3.5" />
                {view === "list" ? "Liste" : "Calendrier"}
              </button>
            ))}
          </div>
        </div>

        {rehearsalView === "calendar" ? (
          <div className="pt-3">
            <RehearsalCalendar
              rehearsals={rehearsals}
              currentUserId={currentUserId}
              onRehearsalClick={(rehearsal) => router.push(`/setlists/rehearsals/${rehearsal.id}`)}
            />
          </div>
        ) : upcomingRehearsals.length > 0 ? (
          <div>
            {upcomingRehearsals.map((rehearsal) => (
              <RehearsalCard
                key={rehearsal.id}
                rehearsal={rehearsal}
                currentUserId={currentUserId}
                onClick={() => router.push(`/setlists/rehearsals/${rehearsal.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">Aucune répète planifiée.</p>
        )}
      </section>

      <section>
        <h2 className={`border-b border-border pb-2 ${SECTION_TITLE}`}>
          Membres <span className="tabular">· {band.members.length}</span>
        </h2>
        <ul>
          {band.members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 border-b border-border py-3">
              {member.profile?.avatar_url ? (
                <Image
                  src={member.profile.avatar_url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                  width={40}
                  height={40}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-base font-extrabold text-muted-foreground"
                >
                  {(member.profile?.display_name || member.profile?.username || "?")[0]?.toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-extrabold uppercase leading-tight">
                  {member.profile?.display_name || member.profile?.username}
                </p>
                <p className="truncate text-xs capitalize text-muted-foreground">{member.role}</p>
              </div>
              {member.user_id === band.owner_id && (
                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Admin
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <CreateSetlistModal
        isOpen={showCreateSetlist}
        onClose={() => setShowCreateSetlist(false)}
        onSuccess={handleRefresh}
        bands={[band]}
      />

      <InviteMemberModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        onSuccess={handleRefresh}
        bandId={band.id}
        bandName={band.name}
      />

      <CreateRehearsalModal
        isOpen={showCreateRehearsal}
        onClose={() => setShowCreateRehearsal(false)}
        onSuccess={handleRefresh}
        band={band}
        setlists={setlists}
      />

      <StartJamModal
        isOpen={showJam}
        onClose={() => setShowJam(false)}
        band={band}
      />
    </div>
  );
}
