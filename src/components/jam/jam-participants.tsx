"use client";

import type { JamPresenceState } from "@/types";

interface JamParticipantsProps {
  participants: JamPresenceState[];
  hostId: string;
}

export function JamParticipants({ participants, hostId }: JamParticipantsProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <h3 className="font-semibold">
          Participants{" "}
          <span className="text-muted-foreground font-normal">
            ({participants.length})
          </span>
        </h3>
      </div>

      <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
        {participants.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            Connexion en cours...
          </p>
        ) : (
          participants.map((participant) => {
            const isHost = participant.user_id === hostId;
            return (
              <div
                key={participant.user_id}
                className="flex items-center gap-3 rounded-lg bg-accent/50 p-2"
              >
                {/* Avatar with online indicator */}
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary overflow-hidden">
                    {participant.avatar_url ? (
                      <img
                        src={participant.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (
                        participant.display_name?.[0] ||
                        participant.username[0]
                      ).toUpperCase()
                    )}
                  </div>
                  {/* Online indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {participant.display_name || participant.username}
                  </p>
                </div>

                {/* Host badge */}
                {isHost && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                    Host
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
