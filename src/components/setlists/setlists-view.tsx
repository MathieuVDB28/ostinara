"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SetlistCard } from "./setlist-card";
import { CreateSetlistModal } from "./create-setlist-modal";
import { CreateBandModal } from "./create-band-modal";
import { BandCard } from "./band-card";
import { BandInvitationCard } from "./band-invitation-card";
import type {
  SetlistWithDetails,
  BandWithMembers,
  BandInvitationWithDetails,
  UserPlan,
} from "@/types";

interface SetlistsViewProps {
  initialSetlists: SetlistWithDetails[];
  bands: BandWithMembers[];
  pendingInvitations: BandInvitationWithDetails[];
  userPlan: UserPlan;
  currentUserId: string;
}

type MainTab = "setlists" | "bands";
type SetlistFilter = "all" | "personal" | "band";

export function SetlistsView({
  initialSetlists,
  bands: initialBands,
  pendingInvitations: initialInvitations,
  userPlan,
  currentUserId,
}: SetlistsViewProps) {
  const router = useRouter();
  const [setlists, setSetlists] = useState(initialSetlists);
  const [bands, setBands] = useState(initialBands);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [mainTab, setMainTab] = useState<MainTab>("setlists");
  const [filter, setFilter] = useState<SetlistFilter>("all");
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  const [showCreateBand, setShowCreateBand] = useState(false);

  // Sync with server data
  useEffect(() => {
    setSetlists(initialSetlists);
  }, [initialSetlists]);

  useEffect(() => {
    setBands(initialBands);
  }, [initialBands]);

  useEffect(() => {
    setInvitations(initialInvitations);
  }, [initialInvitations]);

  const hasBandPlan = userPlan === "band";
  const hasBands = bands.length > 0;

  // Filter setlists
  const filteredSetlists = setlists.filter((s) => {
    if (filter === "personal") return s.is_personal;
    if (filter === "band") return !s.is_personal;
    return true;
  });

  // Stats
  const personalCount = setlists.filter((s) => s.is_personal).length;
  const bandCount = setlists.filter((s) => !s.is_personal).length;

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Setlists</h1>
          <p className="mt-1 text-muted-foreground">
            {setlists.length} setlist{setlists.length > 1 ? "s" : ""}
            {hasBands && ` • ${bands.length} groupe${bands.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          {hasBandPlan && (
            <button
              onClick={() => setShowCreateBand(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 font-medium transition-colors hover:bg-accent"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Nouveau groupe
            </button>
          )}
          <button
            onClick={() => setShowCreateSetlist(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nouvelle setlist
          </button>
        </div>
      </div>

      {/* Band invitations */}
      {invitations.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Invitations en attente
          </h2>
          {invitations.map((inv) => (
            <BandInvitationCard
              key={inv.id}
              invitation={inv}
              onAction={handleRefresh}
            />
          ))}
        </div>
      )}

      {/* Main tabs (only show if user has band plan) */}
      {hasBandPlan && (
        <div className="mb-6 flex gap-2 border-b border-border">
          <button
            onClick={() => setMainTab("setlists")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              mainTab === "setlists"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
              />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path strokeLinecap="round" d="M9 12h6M9 16h4" />
            </svg>
            Setlists
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                mainTab === "setlists"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {setlists.length}
            </span>
          </button>
          <button
            onClick={() => setMainTab("bands")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              mainTab === "bands"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Groupes
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                mainTab === "bands"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {bands.length}
            </span>
          </button>
        </div>
      )}

      {/* Content based on tab */}
      {mainTab === "setlists" ? (
        <>
          {/* Filter tabs for setlists */}
          {hasBands && (
            <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
              <button
                onClick={() => setFilter("all")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Toutes ({setlists.length})
              </button>
              <button
                onClick={() => setFilter("personal")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === "personal"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Personnelles ({personalCount})
              </button>
              <button
                onClick={() => setFilter("band")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === "band"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Groupe ({bandCount})
              </button>
            </div>
          )}

          {/* Setlists grid */}
          {filteredSetlists.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredSetlists.map((setlist) => (
                <SetlistCard
                  key={setlist.id}
                  setlist={setlist}
                  onClick={() => router.push(`/setlists/${setlist.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                  />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path strokeLinecap="round" d="M9 12h6M9 16h4" />
                </svg>
              </div>
              <p className="text-muted-foreground">Aucune setlist</p>
              <button
                onClick={() => setShowCreateSetlist(true)}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Creer ta premiere setlist
              </button>
            </div>
          )}
        </>
      ) : (
        /* Bands list */
        <div className="space-y-4">
          {bands.length > 0 ? (
            bands.map((band) => (
              <BandCard
                key={band.id}
                band={band}
                currentUserId={currentUserId}
                onUpdate={handleRefresh}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground">Aucun groupe</p>
              <button
                onClick={() => setShowCreateBand(true)}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Creer ton premier groupe
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
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
