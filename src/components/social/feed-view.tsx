"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActivityCard } from "./activity-card";
import type { ActivityWithDetails } from "@/types";

interface FeedViewProps {
  initialActivities: ActivityWithDetails[];
  currentUserId: string;
}

export function FeedView({ initialActivities, currentUserId }: FeedViewProps) {
  const router = useRouter();
  const [activities, setActivities] = useState(initialActivities);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  /*
   * Style Fanzine (docs/refonte-ui.md) : une colonne, pochettes bord a
   * bord sur mobile, comme un fil Instagram. Le titre « Feed » et son
   * sous-titre repetaient la pastille juste au-dessus.
   */
  return (
    <div className="-mx-4 sm:mx-auto sm:max-w-xl">
      {activities.length > 0 ? (
        <div>
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} currentUserId={currentUserId} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <p className="font-display text-4xl font-extrabold uppercase leading-[0.9]">
            Ton feed
            <br />
            est <span className="text-primary">vide</span>
          </p>
          <p className="mb-6 mt-3 max-w-xs font-serif text-[15px] italic text-muted-foreground">
            Ajoute des amis pour voir ce qu&apos;ils écoutent, apprennent et jouent.
          </p>
          <button
            onClick={() => router.push("/commu/amis")}
            className="min-h-[44px] rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Trouver des amis
          </button>
        </div>
      )}
    </div>
  );
}
