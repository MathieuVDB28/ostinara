"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SetlistCard } from "./setlist-card";
import { CreateSetlistModal } from "./create-setlist-modal";
import { CreateBandModal } from "./create-band-modal";
import { BandInvitationCard } from "./band-invitation-card";
import type {
  SetlistWithDetails,
  BandWithMembers,
  BandInvitationWithDetails,
  RehearsalWithDetails,
  UserPlan,
} from "@/types";

interface GroupsViewProps {
  setlists: SetlistWithDetails[];
  bands: BandWithMembers[];
  invitations: BandInvitationWithDetails[];
  upcomingRehearsals: RehearsalWithDetails[];
  userPlan: UserPlan;
}

function formatRehearsalDate(date: string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Index des groupes : on choisit un groupe, puis on entre dedans.
 *
 * Setlists + groupes + repets + tech rider + jam etaient trois onglets a
 * plat par-dessus la barre du bas. Le monde "groupe" est trop grand pour
 * un segment : il devient une pile — liste, puis detail.
 */
export function GroupsView({
  setlists,
  bands,
  invitations,
  upcomingRehearsals,
  userPlan,
}: GroupsViewProps) {
  const router = useRouter();
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  const [showCreateBand, setShowCreateBand] = useState(false);

  const handleRefresh = () => router.refresh();

  const hasBandPlan = userPlan === "band";
  const personalSetlists = setlists.filter((s) => s.is_personal);

  const nextRehearsalByBand = new Map<string, RehearsalWithDetails>();
  for (const rehearsal of upcomingRehearsals) {
    if (!nextRehearsalByBand.has(rehearsal.band.id)) {
      nextRehearsalByBand.set(rehearsal.band.id, rehearsal);
    }
  }

  return (
    <div className="space-y-8">
      {/* Invitations : une action en attente passe avant le reste */}
      {invitations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Invitations en attente
          </h2>
          {invitations.map((invitation) => (
            <BandInvitationCard
              key={invitation.id}
              invitation={invitation}
              onAction={handleRefresh}
            />
          ))}
        </section>
      )}

      {/* Groupes */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            Mes groupes
            {bands.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {bands.length}
              </span>
            )}
          </h2>
          {hasBandPlan && (
            <button
              onClick={() => setShowCreateBand(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Groupe
            </button>
          )}
        </div>

        {bands.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {bands.map((band) => {
              const nextRehearsal = nextRehearsalByBand.get(band.id);
              const bandSetlists = setlists.filter((s) => s.band_id === band.id);

              return (
                <Link
                  key={band.id}
                  href={`/commu/groupes/${band.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  {band.cover_url ? (
                    <Image
                      src={band.cover_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      width={56}
                      height={56}
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <span className="material-symbols-outlined text-primary">
                        groups
                      </span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{band.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">
                      {band.members.length} membre
                      {band.members.length > 1 ? "s" : ""}
                      {bandSetlists.length > 0 &&
                        ` • ${bandSetlists.length} setlist${bandSetlists.length > 1 ? "s" : ""}`}
                    </p>
                    {nextRehearsal && (
                      <p className="mt-1 truncate text-xs font-medium text-primary">
                        Répét. {formatRehearsalDate(nextRehearsal.date)}
                      </p>
                    )}
                  </div>

                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined shrink-0 text-muted-foreground"
                  >
                    chevron_right
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-medium text-muted-foreground">Aucun groupe</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasBandPlan
                ? "Crée un groupe pour partager setlists, répètes et fiches technique."
                : "Les espaces groupe sont inclus dans le plan Band."}
            </p>
            {!hasBandPlan && (
              <Link
                href="/pricing"
                className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Voir le plan Band
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Setlists perso : elles n'appartiennent a aucun groupe */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            Mes setlists
            {personalSetlists.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {personalSetlists.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowCreateSetlist(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Setlist
          </button>
        </div>

        {personalSetlists.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {personalSetlists.map((setlist) => (
              <SetlistCard
                key={setlist.id}
                setlist={setlist}
                onClick={() => router.push(`/setlists/${setlist.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-medium text-muted-foreground">Aucune setlist perso</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Une setlist te sert à préparer un set, seul ou avant une répète.
            </p>
          </div>
        )}
      </section>

      <CreateSetlistModal
        isOpen={showCreateSetlist}
        onClose={() => setShowCreateSetlist(false)}
        onSuccess={handleRefresh}
        bands={bands}
      />

      <CreateBandModal
        isOpen={showCreateBand}
        onClose={() => setShowCreateBand(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
